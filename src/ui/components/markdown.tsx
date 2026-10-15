"use client"

import { cn } from "cn"
import type { ReactNode } from "react"
import { Streamdown, useIsCodeFenceIncomplete, type ExtraProps } from "streamdown"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/ui/components/ui/code-block"
import { useHighlightedCode } from "@/ui/hooks/use-highlighted-code"

function MarkdownCodeBlock({ code, language }: { code: string; language: string }) {
  // True while the closing fence has not arrived yet.
  const incomplete = useIsCodeFenceIncomplete()
  const lines = useHighlightedCode(code, language)

  return (
    <CodeBlock size="sm">
      <CodeBlockHeader>
        <CodeBlockTitle>{language || "text"}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} disabled={incomplete} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent wrap className="max-h-96">
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}

function MarkdownCode({ node: _node, className, children, ...props }: React.ComponentProps<"code"> & ExtraProps) {
  // Streamdown marks fenced code with `data-block`; everything else is inline.
  if (!("data-block" in props)) {
    return (
      <code className={cn("rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.9em]", className)} {...props}>
        {children}
      </code>
    )
  }

  return (
    <MarkdownCodeBlock
      code={typeof children === "string" ? children : ""}
      language={/language-(\S+)/.exec(className ?? "")?.[1] ?? ""}
    />
  )
}

const components = { code: MarkdownCode }

/**
 * Assistant output: streaming markdown via Streamdown, with fenced code routed
 * to shadcn Code Block and typography from shadcn/typeset.
 *
 * @see https://ui.shadcn.com/docs/components/base/code-block#markdown
 * @see https://ui.shadcn.com/docs/typeset
 */
export function Markdown({
  children,
  isAnimating,
  className,
}: {
  children: string
  isAnimating?: boolean
  className?: string
}) {
  return (
    <div className={cn("typeset typeset-chat", className)}>
      <Streamdown controls={false} components={components} isAnimating={isAnimating}>
        {children}
      </Streamdown>
    </div>
  )
}
