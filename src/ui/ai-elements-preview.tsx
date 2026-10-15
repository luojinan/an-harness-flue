"use client"

import type { FlueConversationMessage } from "@flue/react"
import { AgentMessageRow } from "@/ui/components/ai-elements/agent-message"
import { TooltipProvider } from "@/ui/components/ui/tooltip"

// A deterministic transcript that exercises every AI Elements pattern without a
// model. Mounted at `/?preview` for local verification.
const messages: FlueConversationMessage[] = [
  {
    id: "u1",
    role: "user",
    purpose: "user",
    display: "visible",
    parts: [{ type: "text", text: "帮我规划并执行 Base UI 迁移", state: "done" }],
  },
  {
    id: "a1",
    role: "assistant",
    purpose: "assistant",
    display: "visible",
    parts: [
      { type: "reasoning", text: "先读现有组件，再决定迁移顺序。", state: "done" },
      {
        type: "data-plan",
        data: {
          title: "迁移到 Base UI",
          steps: [
            { title: "替换 Radix 导入", status: "done" },
            { title: "asChild 改 render", status: "running" },
            { title: "跑类型检查", status: "pending" },
          ],
        },
      },
      {
        type: "dynamic-tool",
        toolName: "bash",
        toolCallId: "t1",
        state: "output-available",
        input: { command: "pnpm build" },
        output: "\u001b[32m✓\u001b[0m 2272 modules transformed.\n\u001b[2mdist/client/\u001b[0mindex.html  0.59 kB",
        durationMs: 4200,
      },
      {
        type: "data-queue",
        data: {
          todo: [{ title: "更新 registry 快照", description: "registry-index" }],
          done: [{ title: "添加 changeset" }],
        },
      },
      {
        type: "data-sources",
        data: {
          sources: [
            { url: "https://base-ui.com/react/components/accordion", title: "Base UI Accordion" },
            { url: "https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default" },
          ],
        },
      },
      { type: "text", text: "迁移计划已就绪：先替换导入，再把 asChild 改成 render。", state: "done" },
    ],
  },
  {
    id: "a2",
    role: "assistant",
    purpose: "assistant",
    display: "visible",
    parts: [
      {
        type: "dynamic-tool",
        toolName: "run_tests",
        toolCallId: "t2",
        state: "output-error",
        input: { suite: "unit" },
        errorText:
          "Error: 2 tests failed\n    at runSuite (/app/test/runner.ts:12:5)\n    at main (/app/test/index.ts:3:1)",
      },
    ],
  },
]

export function AiElementsPreview() {
  return (
    <TooltipProvider>
      <div className="h-dvh overflow-y-auto bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-6 py-10">
          <h1 className="text-lg font-semibold">AI Elements preview</h1>
          {messages.map((message) => (
            <AgentMessageRow key={message.id} message={message} />
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
