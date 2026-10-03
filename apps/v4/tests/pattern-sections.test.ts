import { describe, expect, it } from "vitest"

import {
  getAgentPrompt,
  getNext,
  getSection,
  getSectorExamples,
  splitSections,
} from "../lib/pattern-sections"

const page = `---
title: Demo
description: A fixture.
---

Intro text.

## Installation

Run it.

\`\`\`bash
## not a heading, it is a shell comment
npx shadcn@latest add https://realgood.site/r/demo.json
\`\`\`

### A subsection

Stays inside Installation.

## Agent prompt

Paste this into your coding agent.

\`\`\`text
Goal: do the thing.
## Contract
## Wiring rule
Read the installed files before writing any code.
\`\`\`

\`\`\`text
A second block that must be ignored.
\`\`\`

## Examples by sector

- **Education.** Training completion for staff.
- Manufacturing: calibrations in date, with a long
  second line.
- **Engineering** - ECOs reviewed.
- health: licences current.

### Rows

\`\`\`ts
- Education: not a bullet, it is code
\`\`\`

## Next

Comes after: [\`confirm-send\`](/docs/components/confirm-send), [\`approval-step\`](/docs/components/approval-step). Leads to: [\`audit-timeline\`](/docs/components/audit-timeline).
`

describe("splitSections", () => {
  it("splits on ## headings and keeps ### inside the section", () => {
    const names = splitSections(page).map((s) => s.name)
    expect(names).toEqual([
      "Installation",
      "Agent prompt",
      "Examples by sector",
      "Next",
    ])
    const installation = splitSections(page)[0].body
    expect(installation).toContain("### A subsection")
    expect(installation).toContain("Stays inside Installation.")
  })

  it("ignores ## lines inside fenced code", () => {
    const [installation, prompt] = splitSections(page)
    expect(installation.body).toContain("## not a heading")
    expect(prompt.body).toContain("## Contract")
    expect(prompt.body).toContain("## Wiring rule")
  })

  it("leaves out the front matter and the intro", () => {
    const all = splitSections(page)
      .map((s) => s.body)
      .join("\n")
    expect(all).not.toContain("Intro text.")
    expect(all).not.toContain("title: Demo")
  })

  it("handles longer fences that contain a shorter one", () => {
    const mdx = "## One\n\n````md\n```text\n## Two\n```\n````\n\n## Three\n"
    expect(splitSections(mdx).map((s) => s.name)).toEqual(["One", "Three"])
  })

  it("handles ~~~ fences and windows line endings", () => {
    const mdx = "## One\r\n~~~\r\n## Two\r\n~~~\r\n## Three\r\n"
    expect(splitSections(mdx).map((s) => s.name)).toEqual(["One", "Three"])
  })

  it("does not take #, ### or an indented ## for a section", () => {
    const mdx = "# Title\n## Real\n### Sub\n    ## indented\n#### Deep\n"
    expect(splitSections(mdx).map((s) => s.name)).toEqual(["Real"])
  })

  it("returns an empty list when there are no sections", () => {
    expect(splitSections("just text")).toEqual([])
    expect(splitSections("")).toEqual([])
  })
})

describe("getSection", () => {
  it("returns the trimmed body, matching the name without case", () => {
    expect(getSection(page, "next")).toMatch(/^Comes after:/)
    expect(getSection(page, "Installation")).toMatch(/^Run it\./)
  })

  it("returns null for a missing section", () => {
    expect(getSection(page, "Props")).toBeNull()
  })
})

describe("getAgentPrompt", () => {
  it("returns the first fenced block without the fence", () => {
    const prompt = getAgentPrompt(page)
    expect(prompt).toBe(
      [
        "Goal: do the thing.",
        "## Contract",
        "## Wiring rule",
        "Read the installed files before writing any code.",
      ].join("\n")
    )
  })

  it("is null when there is no section or no block", () => {
    expect(getAgentPrompt("## Usage\n\nHello\n")).toBeNull()
    expect(getAgentPrompt("## Agent prompt\n\nNo block here.\n")).toBeNull()
  })

  it("is empty for an empty block", () => {
    expect(getAgentPrompt("## Agent prompt\n\n```text\n```\n")).toBe("")
  })
})

describe("getSectorExamples", () => {
  it("matches the sector word at the start of each bullet", () => {
    expect(getSectorExamples(page)).toEqual({
      education: "Training completion for staff.",
      manufacturing: "calibrations in date, with a long\nsecond line.",
      engineering: "ECOs reviewed.",
      health: "licences current.",
    })
  })

  it("gives an empty string for a sector that has no bullet", () => {
    const mdx = "## Examples by sector\n\n- Health: one.\n"
    expect(getSectorExamples(mdx)).toEqual({
      education: "",
      manufacturing: "",
      engineering: "",
      health: "one.",
    })
    expect(getSectorExamples("## Usage\n")).toEqual({
      education: "",
      manufacturing: "",
      engineering: "",
      health: "",
    })
  })

  it("ignores bullets that do not start with a sector, and the first wins", () => {
    const mdx = [
      "## Examples by sector",
      "",
      "- Healthcare is not a sector word here.",
      "- Education: first.",
      "- Education: second.",
      "- Note: Engineering appears later in the line.",
    ].join("\n")
    const result = getSectorExamples(mdx)
    expect(result.education).toBe("first.")
    expect(result.health).toBe("")
    expect(result.engineering).toBe("")
  })
})

describe("getNext", () => {
  it("reads the links before and after Leads to", () => {
    expect(getNext(page)).toEqual({
      after: ["confirm-send", "approval-step"],
      leadsTo: ["audit-timeline"],
    })
  })

  it("reads none as an empty list", () => {
    const mdx =
      "## Next\n\nComes after: none, this is where a screen starts. Leads to: [`data-table`](/docs/components/data-table), [`recipient-roster`](/docs/components/recipient-roster).\n"
    expect(getNext(mdx)).toEqual({
      after: [],
      leadsTo: ["data-table", "recipient-roster"],
    })
  })

  it("gives two empty lists when there is no Next section", () => {
    expect(getNext("## Usage\n")).toEqual({ after: [], leadsTo: [] })
  })

  it("ignores links that are not component pages", () => {
    const mdx =
      "## Next\n\nComes after: [x](/docs/installation). Leads to: [y](https://example.com/docs/components/y).\n"
    expect(getNext(mdx)).toEqual({ after: [], leadsTo: [] })
  })
})
