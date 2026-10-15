"use client"

import { CircleAlertIcon, CircleCheckIcon, WrenchIcon } from "lucide-react"
import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/ui/components/ui/trace"
import { formatDuration, ValueCode } from "./value-code"

export type ToolState = "input-available" | "output-available" | "output-error"

/**
 * AI Elements "Tool" pattern.
 *
 * A tool call, built on `Trace`. While it runs it is a plain `TraceLine`; once
 * its output (or error) arrives it becomes a `TraceCollapsible` that shows the
 * input and the output. A tool left at `input-available` after the chat stops is
 * treated as failed rather than stuck running.
 *
 * @see https://ui.shadcn.com/docs/ai-elements/base/tool
 */
export function Tool({
  name,
  state,
  input,
  output,
  errorText,
  durationMs,
  streaming,
}: {
  name: string
  state: ToolState
  input: unknown
  output: unknown
  errorText?: string
  durationMs?: number
  streaming: boolean
}) {
  if (state === "input-available") {
    // The chat stopped before the tool produced anything.
    const failed = !streaming
    return (
      <TraceLine status={failed ? "error" : "running"}>
        <TraceIcon>{failed ? <CircleAlertIcon /> : <WrenchIcon />}</TraceIcon>
        <TraceTitle>
          {failed ? "运行失败" : "正在运行"} {name}
        </TraceTitle>
      </TraceLine>
    )
  }

  const failed = state === "output-error"

  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>
        <TraceLine status={failed ? "error" : undefined}>
          <TraceIcon>{failed ? <CircleAlertIcon /> : <CircleCheckIcon />}</TraceIcon>
          <TraceTitle>
            {failed ? "运行失败" : "已运行"} {name}
          </TraceTitle>
          {durationMs !== undefined && <TraceDescription>{formatDuration(durationMs)}</TraceDescription>}
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <div className="flex flex-col gap-2">
          <ValueCode title="输入" value={input} />
          <ValueCode
            title={failed ? "错误" : "输出"}
            value={failed ? (errorText ?? "未知错误") : output}
            variant={failed ? "destructive" : "default"}
          />
        </div>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}
