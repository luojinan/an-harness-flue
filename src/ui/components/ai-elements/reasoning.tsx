"use client"

import { CircleCheckIcon } from "lucide-react"
import * as React from "react"
import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/ui/components/ui/trace"
import { formatDuration } from "./value-code"

/**
 * AI Elements "Reasoning" pattern.
 *
 * A single reasoning step, built on `Trace`. It reads "思考中..." while the model
 * thinks and "思考完成" with the elapsed time when it finishes.
 *
 * Collapsed by default and never auto-opens: streaming reasoning that expanded
 * and then collapsed again read as a flash and jumped the layout. The reader
 * expands it when they want to see the thinking.
 *
 * @see https://ui.shadcn.com/docs/ai-elements/base/reasoning
 */
export function Reasoning({
  text,
  running,
  defaultOpen = false,
  durationMs: durationMsProp,
}: {
  text: string
  running: boolean
  defaultOpen?: boolean
  durationMs?: number
}) {
  const startedAt = React.useRef<number | undefined>(undefined)
  const [durationMs, setDurationMs] = React.useState<number | undefined>(undefined)

  React.useEffect(() => {
    if (running) {
      startedAt.current ??= Date.now()
      setDurationMs(undefined)
      return
    }
    if (startedAt.current !== undefined) {
      setDurationMs(Date.now() - startedAt.current)
    }
  }, [running])

  const shownDuration = durationMsProp ?? durationMs

  const line = (
    <TraceLine status={running ? "running" : undefined}>
      {!running && (
        <TraceIcon>
          <CircleCheckIcon />
        </TraceIcon>
      )}
      <TraceTitle>{running ? "思考中..." : "思考完成"}</TraceTitle>
      {!running && shownDuration !== undefined && <TraceDescription>{formatDuration(shownDuration)}</TraceDescription>}
    </TraceLine>
  )

  // Nothing has streamed in yet: a plain line, with nothing to open.
  if (text.length === 0) {
    return line
  }

  return (
    <TraceCollapsible defaultOpen={defaultOpen}>
      <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="whitespace-pre-wrap">{text}</TraceCollapsibleContent>
    </TraceCollapsible>
  )
}
