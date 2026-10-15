"use client"

import { CircleAlertIcon, CircleCheckIcon, LoaderCircleIcon, TerminalIcon } from "lucide-react"
import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockActions,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/ui/components/ui/code-block"
import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/ui/components/ui/trace"
import { useHighlightedCode } from "@/ui/hooks/use-highlighted-code"
import { detectLanguage, formatDuration, stringifyValue } from "./value-code"

/**
 * AI Elements "Terminal" pattern.
 *
 * A command the agent runs, with its output as it streams. ANSI escape codes are
 * highlighted with shiki's `ansi` grammar; anything else falls back to text/JSON.
 *
 * @see https://ui.shadcn.com/docs/ai-elements/base/terminal
 */
export function Terminal({
  command,
  output,
  running,
  failed,
  durationMs,
}: {
  command: string
  output?: unknown
  running: boolean
  failed?: boolean
  durationMs?: number
}) {
  const text = output === undefined ? "" : stringifyValue(output)
  const language = /\u001b\[[0-9;]*m/.test(text) ? "ansi" : detectLanguage(text)
  const lines = useHighlightedCode(text, language)

  const line = (
    <TraceLine status={running ? "running" : failed ? "error" : undefined}>
      <TraceIcon>
        {running ? <LoaderCircleIcon className="animate-spin" /> : failed ? <CircleAlertIcon /> : <TerminalIcon />}
      </TraceIcon>
      <TraceTitle>
        {running ? "正在运行" : failed ? "运行失败" : "已运行"} <span className="font-mono">{command}</span>
      </TraceTitle>
      {!running && durationMs !== undefined && <TraceDescription>{formatDuration(durationMs)}</TraceDescription>}
    </TraceLine>
  )

  if (running || text.length === 0) {
    return line
  }

  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <CodeBlock size="sm" variant={failed ? "destructive" : "default"}>
          <CodeBlockHeader>
            <CodeBlockTitle>输出</CodeBlockTitle>
            <CodeBlockActions>
              <CodeBlockCopyButton value={text} />
            </CodeBlockActions>
          </CodeBlockHeader>
          <CodeBlockContent wrap className="max-h-64">
            {lines.map((value, index) => (
              <CodeBlockLine key={index}>{value}</CodeBlockLine>
            ))}
          </CodeBlockContent>
        </CodeBlock>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}
