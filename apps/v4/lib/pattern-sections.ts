/**
 * Pure helpers to read the shared structure of a pattern docs page (see
 * content/docs/components/*.mdx). No React, no file access: pass the MDX text.
 *
 * Every pattern page has the same `##` sections: Installation, Usage, What it
 * does not do, Agent prompt, Examples by sector, Next. The "Copy prompt" button
 * and the content test read them through these functions.
 */

export const SECTORS = [
  "education",
  "manufacturing",
  "engineering",
  "health",
] as const

export type Sector = (typeof SECTORS)[number]

export type SectorExamples = Record<Sector, string>

export interface Section {
  /** The heading text, without the `##`. */
  name: string
  /** Everything under the heading up to the next `##`, without the heading line. */
  body: string
}

export interface NextLinks {
  /** Slugs of the pages this one comes after, in the order written. */
  after: string[]
  /** Slugs of the pages this one leads to, in the order written. */
  leadsTo: string[]
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/
const HEADING = /^## +(\S.*?)\s*#*\s*$/

/**
 * A line that opens a fence returns its marker; a line that closes the open
 * fence returns null and clears it. CommonMark rule: the closing fence uses the
 * same character, at least as many of them, and nothing after them.
 */
function nextFence(line: string, open: string | null): string | null {
  const match = FENCE.exec(line)
  if (!open) return match ? match[1] : null
  if (!match) return open
  const marker = match[1]
  const closes =
    marker[0] === open[0] &&
    marker.length >= open.length &&
    line.trim() === marker
  return closes ? null : open
}

/**
 * Split a page into its `##` sections, in order. A `##` line inside a fenced
 * code block is not a heading. `###` and deeper headings stay in the body of
 * their section. Text before the first `##` (front matter, the intro) is not a
 * section and is left out.
 */
export function splitSections(mdx: string): Section[] {
  const sections: Section[] = []
  let fence: string | null = null
  let current: { name: string; lines: string[] } | null = null

  const close = () => {
    if (current) {
      sections.push({
        name: current.name,
        body: current.lines.join("\n").trim(),
      })
    }
  }

  for (const line of mdx.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = fence === null ? HEADING.exec(line) : null
    if (heading) {
      close()
      current = { name: heading[1], lines: [] }
      continue
    }
    fence = nextFence(line, fence)
    current?.lines.push(line)
  }
  close()
  return sections
}

/** The body of the section called `name` (case-insensitive), or null. */
export function getSection(mdx: string, name: string): string | null {
  const wanted = name.trim().toLowerCase()
  const found = splitSections(mdx).find((s) => s.name.toLowerCase() === wanted)
  return found ? found.body : null
}

/**
 * The text inside the first fenced code block of the "Agent prompt" section,
 * without the fence lines. Null when the section or the block is missing.
 */
export function getAgentPrompt(mdx: string): string | null {
  const body = getSection(mdx, "Agent prompt")
  if (body === null) return null

  let fence: string | null = null
  const inner: string[] = []
  for (const line of body.split("\n")) {
    if (fence === null) {
      const match = FENCE.exec(line)
      if (match) fence = match[1]
      continue
    }
    const after = nextFence(line, fence)
    if (after === null) return inner.join("\n").trim()
    inner.push(line)
  }
  // An unclosed fence still counts: take what was written.
  return fence === null ? null : inner.join("\n").trim()
}

/**
 * Top-level list items of a section body, up to its first `###` heading. Lines
 * inside fenced code are skipped. Indented lines continue the current item.
 */
function bullets(body: string): string[] {
  const items: string[][] = []
  let fence: string | null = null
  let blanks = 0
  let current: string[] | null = null

  for (const line of body.split("\n")) {
    const wasInFence = fence !== null
    fence = nextFence(line, fence)
    if (wasInFence || fence !== null) continue // inside, opening or closing fence line

    if (/^###/.test(line)) break
    const bullet = /^[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      current = [bullet[1]]
      items.push(current)
      blanks = 0
    } else if (!line.trim()) {
      blanks += 1
    } else if (current && /^\s+\S/.test(line)) {
      for (; blanks > 0; blanks -= 1) current.push("")
      current.push(line.trim())
    } else {
      current = null // unindented text ends the item
      blanks = 0
    }
  }
  return items.map((lines) => lines.join("\n").trim()).filter(Boolean)
}

const SECTOR_START = new RegExp(
  `^[*_]*(${SECTORS.join("|")})\\b[\\s*_.:\\u2013\\u2014-]*`,
  "i"
)

/**
 * The example text for each sector from the bullets of "Examples by sector".
 * A bullet counts for a sector when its first word is that sector, with or
 * without bold: `- **Health.** Licences...`. The sector word and the
 * punctuation after it are removed. A missing sector is an empty string. The
 * first bullet for a sector wins.
 */
export function getSectorExamples(mdx: string): SectorExamples {
  const result: SectorExamples = {
    education: "",
    manufacturing: "",
    engineering: "",
    health: "",
  }
  const body = getSection(mdx, "Examples by sector")
  if (body === null) return result

  for (const item of bullets(body)) {
    const match = SECTOR_START.exec(item)
    if (!match) continue
    const sector = match[1].toLowerCase() as Sector
    if (result[sector]) continue
    result[sector] = item.slice(match[0].length).trim()
  }
  return result
}

const PAGE_LINK = /\[[^\]]*\]\(\/docs\/components\/([a-z0-9-]+)\)/g

function slugsIn(text: string): string[] {
  return Array.from(text.matchAll(PAGE_LINK), (m) => m[1])
}

/**
 * The story links of the "Next" section: `Comes after: [A](...). Leads to:
 * [B](...).` Links before "Leads to:" are `after`, links after it are
 * `leadsTo`. "Comes after: none" gives an empty `after`. No section gives two
 * empty lists.
 */
export function getNext(mdx: string): NextLinks {
  const body = getSection(mdx, "Next")
  if (body === null) return { after: [], leadsTo: [] }

  const marker = /leads to:/i.exec(body)
  if (!marker) return { after: slugsIn(body), leadsTo: [] }
  return {
    after: slugsIn(body.slice(0, marker.index)),
    leadsTo: slugsIn(body.slice(marker.index + marker[0].length)),
  }
}
