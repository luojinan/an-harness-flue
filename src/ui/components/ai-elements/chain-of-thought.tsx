"use client"

import { CircleCheckIcon } from "lucide-react"
import type { ReactNode } from "react"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/ui/components/ui/trace"

/**
 * AI Elements "Chain of Thought" pattern.
 *
 * A summary line that expands into the steps the agent took.
 *
 * @see https://ui.shadcn.com/docs/ai-elements/base/chain-of-thought
 */
export function ChainOfThought({
  summary,
  children,
  defaultOpen = true,
}: {
  summary: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <Trace>
      <TraceCollapsible defaultOpen={defaultOpen}>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon>
              <CircleCheckIcon />
            </TraceIcon>
            <TraceTitle>{summary}</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent keepMounted>
          <Trace>{children}</Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  )
}
