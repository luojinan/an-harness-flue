"use client"

import { ArrowUpRightIcon, GlobeIcon } from "lucide-react"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/ui/components/ui/trace"

export interface SourceLink {
  url: string
  title?: string
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/**
 * AI Elements "Sources" pattern.
 *
 * The links the agent used for a reply.
 *
 * @see https://ui.shadcn.com/docs/ai-elements/base/sources
 */
export function Sources({ sources }: { sources: SourceLink[] }) {
  if (sources.length === 0) return null

  return (
    <Trace>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon>
              <GlobeIcon />
            </TraceIcon>
            <TraceTitle>使用了 {sources.length} 个来源</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace>
            {sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                <TraceLine>
                  <TraceIcon>
                    <GlobeIcon />
                  </TraceIcon>
                  <TraceTitle>
                    {source.title ?? hostname(source.url)}
                    <span className="sr-only">（在新标签页打开）</span>
                  </TraceTitle>
                  <TraceIcon>
                    <ArrowUpRightIcon />
                  </TraceIcon>
                </TraceLine>
              </a>
            ))}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  )
}
