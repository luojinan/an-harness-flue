"use client"

import { CircleCheckIcon, CircleDotIcon, CircleIcon, RouteIcon } from "lucide-react"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/ui/components/ui/trace"

export type PlanStepStatus = "done" | "running" | "pending"

export interface PlanStep {
  title: string
  status?: PlanStepStatus
  description?: string
}

function StepIcon({ status }: { status: PlanStepStatus }) {
  if (status === "done") return <CircleCheckIcon />
  if (status === "running") return <CircleDotIcon />
  return <CircleIcon />
}

/**
 * AI Elements "Plan" pattern.
 *
 * The steps the agent plans to take, and how far it has got.
 *
 * @see https://ui.shadcn.com/docs/ai-elements/base/plan
 */
export function Plan({ title = "计划", steps }: { title?: string; steps: PlanStep[] }) {
  if (steps.length === 0) return null

  const done = steps.filter((step) => step.status === "done").length
  const running = steps.some((step) => (step.status ?? "pending") !== "done")

  return (
    <Trace>
      <TraceCollapsible defaultOpen>
        <TraceCollapsibleTrigger>
          <TraceLine status={running ? "running" : undefined}>
            <TraceIcon>
              <RouteIcon />
            </TraceIcon>
            <TraceTitle>{title}</TraceTitle>
            <TraceDescription>
              {done} / {steps.length} 完成
            </TraceDescription>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace>
            {steps.map((step, index) => {
              const status = step.status ?? "pending"
              return (
                <TraceLine key={index} status={status === "pending" ? "pending" : undefined}>
                  <TraceIcon>
                    <StepIcon status={status} />
                  </TraceIcon>
                  <TraceTitle>{step.title}</TraceTitle>
                  {step.description && <TraceDescription>{step.description}</TraceDescription>}
                </TraceLine>
              )
            })}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  )
}
