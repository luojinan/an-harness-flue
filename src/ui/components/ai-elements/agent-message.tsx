"use client"

import type { FlueConversationMessage, FlueConversationPart } from "@flue/react"
import { CircleCheckIcon, PaperclipIcon } from "lucide-react"
import { useRef, type ReactNode } from "react"
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/ui/components/ui/attachment"
import { Bubble, BubbleContent } from "@/ui/components/ui/bubble"
import { Message, MessageContent } from "@/ui/components/ui/message"
import { Markdown } from "@/ui/components/markdown"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/ui/components/ui/trace"
import { ChainOfThought } from "./chain-of-thought"
import { Plan, type PlanStep } from "./plan"
import { Queue, type QueueItem } from "./queue"
import { Reasoning } from "./reasoning"
import { Sources, type SourceLink } from "./sources"
import { isStackTrace, StackTrace } from "./stack-trace"
import { Terminal } from "./terminal"
import { Tool } from "./tool"
import { ValueCode } from "./value-code"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getPartKey(part: FlueConversationPart): string {
  return part.type === "dynamic-tool" ? part.toolCallId : part.type
}

function commandOf(part: Extract<FlueConversationPart, { type: "dynamic-tool" }>): string | undefined {
  const input = part.input
  if (input && typeof input === "object" && "command" in input) {
    const command = (input as { command?: unknown }).command
    if (typeof command === "string" && command.trim().length > 0) return command
  }
  return undefined
}

const SHELL_TOOL = /(^|[_\-. ])(bash|shell|sh|zsh|terminal|exec|execute|command)([_\-. ]|$)/i

function FilePart({ part }: { part: Extract<FlueConversationPart, { type: "file" }> }) {
  const name = part.filename ?? part.id ?? part.mediaType
  const isImage = part.mediaType.startsWith("image/")
  return (
    <Attachment state="done">
      <AttachmentMedia variant={isImage ? "image" : "icon"}>
        {isImage && part.url ? <img src={part.url} alt={name} /> : <PaperclipIcon />}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{name}</AttachmentTitle>
        <AttachmentDescription>
          {part.mediaType}
          {part.size ? ` · ${formatBytes(part.size)}` : ""}
        </AttachmentDescription>
      </AttachmentContent>
      {part.url && (
        <AttachmentTrigger render={<a href={part.url} target="_blank" rel="noreferrer" aria-label={name} />} />
      )}
    </Attachment>
  )
}

function UserPart({ part }: { part: FlueConversationPart }) {
  if (part.type === "text") {
    return (
      <Bubble align="end" variant="muted">
        <BubbleContent className="whitespace-pre-wrap">{part.text}</BubbleContent>
      </Bubble>
    )
  }
  if (part.type === "file") {
    return <FilePart part={part} />
  }
  return null
}

function UnknownTrace({ name, value }: { name: string; value: unknown }) {
  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>
        <TraceLine>
          <TraceIcon>
            <CircleCheckIcon />
          </TraceIcon>
          <TraceTitle>{name}</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <ValueCode title="数据" value={value} />
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

function DataPart({ part }: { part: Extract<FlueConversationPart, { type: `data-${string}` }> }) {
  const name = part.type.replace(/^data-/, "")
  const payload = part.data as Record<string, unknown> | undefined

  if (name === "plan" && payload && Array.isArray(payload.steps)) {
    return <Plan title={typeof payload.title === "string" ? payload.title : undefined} steps={payload.steps as PlanStep[]} />
  }
  if (name === "queue" && payload) {
    return <Queue todo={payload.todo as QueueItem[] | undefined} done={payload.done as QueueItem[] | undefined} />
  }
  if (name === "sources" && payload && Array.isArray(payload.sources)) {
    return <Sources sources={payload.sources as SourceLink[]} />
  }
  return <UnknownTrace name={name} value={part.data} />
}

function TraceRow({
  part,
  streaming,
  durationMs,
}: {
  part: FlueConversationPart
  streaming: boolean
  durationMs?: number
}) {
  if (part.type === "reasoning") {
    return (
      <Reasoning
        text={part.text}
        running={streaming && part.state === "streaming"}
        durationMs={durationMs}
      />
    )
  }

  if (part.type === "dynamic-tool") {
    const command = commandOf(part)
    const failed = part.state === "output-error"
    const done = part.state !== "input-available"

    if (command || SHELL_TOOL.test(part.toolName)) {
      return (
        <Terminal
          command={command ?? part.toolName}
          output={failed ? part.errorText : part.state === "output-available" ? part.output : undefined}
          running={streaming && part.state === "input-available"}
          failed={failed}
          durationMs={done ? part.durationMs : undefined}
        />
      )
    }

    if (failed && isStackTrace(part.errorText)) {
      return <StackTrace stack={part.errorText} />
    }

    return (
      <Tool
        name={part.toolName}
        state={part.state}
        input={part.input}
        output={part.state === "output-available" ? part.output : undefined}
        errorText={failed ? part.errorText : undefined}
        durationMs={done ? part.durationMs : undefined}
        streaming={streaming}
      />
    )
  }

  if (part.type.startsWith("data-")) {
    return <DataPart part={part as Extract<FlueConversationPart, { type: `data-${string}` }>} />
  }

  return null
}

function AssistantParts({ message, streaming }: { message: FlueConversationMessage; streaming: boolean }) {
  // Measure reasoning durations here so a wrapper change below never resets
  // them (the parent does not remount while the message streams).
  const startedAt = useRef<Map<number, number>>(new Map())
  const durations = useRef<Map<number, number>>(new Map())

  message.parts.forEach((part, index) => {
    if (part.type !== "reasoning") return
    const running = streaming && part.state === "streaming"
    if (running) {
      if (!startedAt.current.has(index)) startedAt.current.set(index, Date.now())
      durations.current.delete(index)
    } else if (startedAt.current.has(index) && !durations.current.has(index)) {
      durations.current.set(index, Date.now() - startedAt.current.get(index)!)
    }
  })

  const nodes: ReactNode[] = []
  let group: { part: FlueConversationPart; index: number }[] = []

  const flush = () => {
    if (group.length === 0) return
    const parts = group
    group = []
    const rows = parts.map(({ part, index }) => (
      <TraceRow
        key={`${index}-${getPartKey(part)}`}
        part={part}
        streaming={streaming}
        durationMs={durations.current.get(index)}
      />
    ))
    const first = parts[0]

    // Multi-step work reads as a Chain of Thought summary; a single reasoning
    // part stays a plain Trace so it is not summarized twice.
    if (parts.some(({ part }) => part.type === "dynamic-tool")) {
      nodes.push(
        <ChainOfThought key={`cot-${first.index}`} summary={`执行了 ${parts.length} 个步骤`}>
          {rows}
        </ChainOfThought>,
      )
    } else {
      nodes.push(
        <Trace key={`trace-${first.index}-${getPartKey(first.part)}`}>{rows}</Trace>,
      )
    }
  }

  message.parts.forEach((part, index) => {
    if (part.type === "text") {
      flush()
      nodes.push(
        <Markdown key={`text-${index}`} isAnimating={streaming}>
          {part.text}
        </Markdown>,
      )
    } else if (part.type === "file") {
      flush()
      nodes.push(<FilePart key={`file-${index}`} part={part} />)
    } else {
      group.push({ part, index })
    }
  })
  flush()

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5">
      {nodes}
    </div>
  )
}

export function AgentMessageRow({
  message,
  streaming = false,
}: {
  message: FlueConversationMessage
  streaming?: boolean
}) {
  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          {message.parts.map((part, index) => (
            <UserPart key={`${index}-${getPartKey(part)}`} part={part} />
          ))}
        </MessageContent>
      </Message>
    )
  }

  return (
    <Message>
      <MessageContent>
        <AssistantParts message={message} streaming={streaming} />
      </MessageContent>
    </Message>
  )
}
