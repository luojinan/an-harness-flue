"use client"

import { CircleXIcon } from "lucide-react"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/ui/components/ui/trace"

/** A tool error looks like a stack when it has several non-empty lines. */
export function isStackTrace(errorText: string | undefined): boolean {
  if (!errorText) return false
  const lines = errorText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  return lines.length >= 3
}

/**
 * AI Elements "Stack Trace" pattern.
 *
 * A failed tool call and its stack frames.
 *
 * @see https://ui.shadcn.com/docs/ai-elements/base/stack-trace
 */
export function StackTrace({ stack }: { stack: string }) {
  const [error, ...frames] = stack
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <Trace>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine status="error">
            <TraceIcon>
              <CircleXIcon />
            </TraceIcon>
            <TraceTitle>失败：{error}</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <div className="flex flex-col gap-2 rounded-md bg-muted p-3 font-mono text-xs">
            <p className="text-destructive">{error}</p>
            {frames.map((frame, index) => (
              <p key={index} className="text-muted-foreground">
                {frame}
              </p>
            ))}
          </div>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  )
}
