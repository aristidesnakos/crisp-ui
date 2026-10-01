// Turns a pattern page's agent prompt into something a person can hand to a
// coding agent: the prompt text (optionally with one sector's example data) and
// links that open it in tools whose deep-link formats are documented.
//
// Verified formats and limits (fetched 2026-10-01; see docs/research/research-prompt-ux.md):
//   Claude Code     claude-cli://open?q=...         q up to 5,000 chars, prefilled not sent
//   Claude Desktop  claude://claude.ai/new?q=...    q up to ~14,000 chars, prefilled not sent
//   Cursor          https://cursor.com/link/prompt?text=...   whole URL up to 10,000 chars
//   Codex app       codex://new?prompt=...
//   Lovable         https://lovable.dev/#prompt=... up to 50,000 chars
// Not offered because the format is unverified: v0 text links, Bolt, ChatGPT.
// Every link only prefills; the person reviews and sends. Copy works everywhere.

import type { Sector } from "@/lib/pattern-sections"

export const SECTOR_LABELS: Record<Sector, string> = {
  education: "Education",
  manufacturing: "Manufacturing",
  engineering: "Engineering",
  health: "Health",
}

/** The prompt, plus one sector's example data when a sector is chosen. */
export function buildPrompt(
  base: string,
  sector: Sector | null,
  examples: Partial<Record<Sector, string>>
) {
  const example = sector ? examples[sector]?.trim() : ""
  if (!sector || !example) return base.trim()
  return `${base.trim()}\n\nExample data to render against (${SECTOR_LABELS[sector].toLowerCase()}; replace it with my real data): ${example}`
}

export type Handoff = {
  id: "claude-code" | "claude-desktop" | "cursor" | "codex" | "lovable"
  label: string
  /** Where the prompt goes; null when it would exceed the target's documented limit. */
  href: string | null
  /** Why href is null. */
  reason?: string
}

type Target = {
  id: Handoff["id"]
  label: string
  build: (encoded: string) => string
  /** Longest encoded prompt the target documents. */
  maxEncoded?: number
  /** Longest whole URL the target documents. */
  maxUrl?: number
}

const TARGETS: Target[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    build: (q) => `claude-cli://open?q=${q}`,
    maxEncoded: 5000,
  },
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    build: (q) => `claude://claude.ai/new?q=${q}`,
    maxEncoded: 14000,
  },
  {
    id: "cursor",
    label: "Cursor",
    build: (q) => `https://cursor.com/link/prompt?text=${q}`,
    maxUrl: 10000,
  },
  {
    id: "codex",
    label: "Codex",
    build: (q) => `codex://new?prompt=${q}`,
  },
  {
    id: "lovable",
    label: "Lovable",
    build: (q) => `https://lovable.dev/#prompt=${q}`,
    maxEncoded: 50000,
  },
]

export function handoffLinks(prompt: string): Handoff[] {
  const encoded = encodeURIComponent(prompt)
  return TARGETS.map((t) => {
    const href = t.build(encoded)
    const tooLong =
      (t.maxEncoded !== undefined && encoded.length > t.maxEncoded) ||
      (t.maxUrl !== undefined && href.length > t.maxUrl)
    return tooLong
      ? {
          id: t.id,
          label: t.label,
          href: null,
          reason: `Too long for ${t.label}'s link. Use Copy prompt.`,
        }
      : { id: t.id, label: t.label, href }
  })
}
