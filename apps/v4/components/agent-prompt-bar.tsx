"use client"

import * as React from "react"
import { IconCheck, IconChevronDown, IconCopy } from "@tabler/icons-react"

import type { Sector } from "@/lib/pattern-sections"
import { buildPrompt, handoffLinks, SECTOR_LABELS } from "@/lib/prompt-links"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { Button } from "@/registry/new-york-v4/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/registry/new-york-v4/ui/dropdown-menu"

const SECTORS = Object.keys(SECTOR_LABELS) as Sector[]

/**
 * "Build this with your agent": the page's agent prompt, optionally with one
 * sector's example data added, to copy or to open in a tool that accepts a
 * prefilled prompt. Nothing is sent anywhere; the person reviews and submits.
 */
export function AgentPromptBar({
  prompt,
  examples,
}: {
  prompt: string
  examples: Partial<Record<Sector, string>>
}) {
  const { copyToClipboard, isCopied } = useCopyToClipboard()
  const [sector, setSector] = React.useState<Sector | null>(null)
  const selectId = React.useId()

  const text = React.useMemo(
    () => buildPrompt(prompt, sector, examples),
    [prompt, sector, examples]
  )
  const links = React.useMemo(() => handoffLinks(text), [text])

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 text-card-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">Build this with your agent</p>
        <p className="text-sm text-muted-foreground">
          Copy a ready prompt for Claude Code, Cursor or any coding agent.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={selectId}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          Example data
          <select
            id={selectId}
            value={sector ?? ""}
            onChange={(e) =>
              setSector(e.target.value ? (e.target.value as Sector) : null)
            }
            className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
          >
            <option value="">Generic</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {SECTOR_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" onClick={() => copyToClipboard(text)}>
          {isCopied ? <IconCheck /> : <IconCopy />}
          Copy prompt
          <span className="sr-only" role="status">
            {isCopied ? "Prompt copied" : ""}
          </span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="secondary">
              Open in…
              <IconChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              Opens the tool with this prompt filled in. You review it before
              sending.
            </DropdownMenuLabel>
            {links.map((link) =>
              link.href ? (
                <DropdownMenuItem key={link.id} asChild>
                  <a href={link.href}>{link.label}</a>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={link.id} disabled title={link.reason}>
                  {link.label} (too long, use Copy)
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
