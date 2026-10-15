"use client"

import { CircleCheckIcon, CircleIcon, ListChecksIcon, ListTodoIcon } from "lucide-react"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/ui/components/ui/trace"

export interface QueueItem {
  title: string
  description?: string
}

function QueueSection({
  title,
  items,
  done,
  defaultOpen,
}: {
  title: string
  items: QueueItem[]
  done: boolean
  defaultOpen?: boolean
}) {
  if (items.length === 0) return null

  return (
    <TraceCollapsible defaultOpen={defaultOpen}>
      <TraceCollapsibleTrigger>
        <TraceLine>
          <TraceIcon>{done ? <ListChecksIcon /> : <ListTodoIcon />}</TraceIcon>
          <TraceTitle>{title}</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <Trace>
          {items.map((item, index) => (
            <TraceLine key={index}>
              <TraceIcon>{done ? <CircleCheckIcon /> : <CircleIcon />}</TraceIcon>
              <TraceTitle>{item.title}</TraceTitle>
              {item.description && <TraceTitle className="text-muted-foreground/70">{item.description}</TraceTitle>}
            </TraceLine>
          ))}
        </Trace>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

/**
 * AI Elements "Queue" pattern.
 *
 * The agent's todo list, split into what is left and what is done.
 *
 * @see https://ui.shadcn.com/docs/ai-elements/base/queue
 */
export function Queue({ todo = [], done = [] }: { todo?: QueueItem[]; done?: QueueItem[] }) {
  if (todo.length === 0 && done.length === 0) return null

  return (
    <Trace>
      <QueueSection title={`${todo.length} 项待办`} items={todo} done={false} defaultOpen />
      <QueueSection title={`${done.length} 项已完成`} items={done} done />
    </Trace>
  )
}
