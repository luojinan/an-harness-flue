"use client"

import { cn } from "cn"
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

export function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

/** Pick a grammar for arbitrary tool/data payloads; falls back to plain text. */
export function detectLanguage(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed)
      return "json"
    } catch {
      return "text"
    }
  }
  return "text"
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.max(1, Math.round(ms / 100) / 10)}s`
  }
  return `${Math.round(ms / 1000)}s`
}

/**
 * A `CodeBlock` for an arbitrary value: highlights JSON when it can, copies the
 * raw text, and scrolls long output.
 */
export function ValueCode({
  title,
  value,
  variant = "default",
  className,
}: {
  title: string
  value: unknown
  variant?: "default" | "destructive"
  className?: string
}) {
  const text = stringifyValue(value)
  const lines = useHighlightedCode(text, detectLanguage(text))

  return (
    <CodeBlock size="sm" variant={variant} className={cn(className)}>
      <CodeBlockHeader>
        <CodeBlockTitle>{title}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={text} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent wrap className="max-h-64">
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}
