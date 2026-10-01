import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { getAgentPrompt, getSectorExamples } from "../lib/pattern-sections"
import { buildPrompt, handoffLinks } from "../lib/prompt-links"

const componentsDir = path.resolve(
  import.meta.dirname,
  "../content/docs/components"
)
const slugs: string[] = JSON.parse(
  readFileSync(path.join(componentsDir, "meta.json"), "utf8")
).pages.filter((p: string) => p !== "index")

const sectors = ["education", "manufacturing", "engineering", "health"] as const

describe("buildPrompt", () => {
  const examples = { education: "absent today", health: "" }

  it("is the prompt unchanged without a sector", () => {
    expect(buildPrompt("  base  ", null, examples)).toBe("base")
  })

  it("adds the chosen sector's example data and says to replace it", () => {
    const out = buildPrompt("base", "education", examples)
    expect(out.startsWith("base\n\n")).toBe(true)
    expect(out).toContain("education")
    expect(out).toContain("absent today")
    expect(out).toContain("replace it with my real data")
  })

  it("adds nothing for a sector with no example", () => {
    expect(buildPrompt("base", "health", examples)).toBe("base")
    expect(buildPrompt("base", "engineering", examples)).toBe("base")
  })
})

describe("handoffLinks", () => {
  const prompt =
    'Goal: add a table.\nInstall: npx shadcn@latest add "x" & more?'

  it("offers the five documented targets in a stable order", () => {
    expect(handoffLinks(prompt).map((l) => l.id)).toEqual([
      "claude-code",
      "claude-desktop",
      "cursor",
      "codex",
      "lovable",
    ])
  })

  it("uses each target's documented link shape", () => {
    const by = Object.fromEntries(
      handoffLinks(prompt).map((l) => [l.id, l.href])
    )
    expect(by["claude-code"]).toMatch(/^claude-cli:\/\/open\?q=/)
    expect(by["claude-desktop"]).toMatch(/^claude:\/\/claude\.ai\/new\?q=/)
    expect(by.cursor).toMatch(/^https:\/\/cursor\.com\/link\/prompt\?text=/)
    expect(by.codex).toMatch(/^codex:\/\/new\?prompt=/)
    expect(by.lovable).toMatch(/^https:\/\/lovable\.dev\/#prompt=/)
  })

  it("round-trips the prompt exactly, newlines and symbols included", () => {
    for (const link of handoffLinks(prompt)) {
      const encoded = link.href!.split(/[?#](?:q|text|prompt)=/)[1]
      expect(decodeURIComponent(encoded)).toBe(prompt)
    }
  })

  it("never offers unverified targets", () => {
    const hrefs = handoffLinks(prompt).map((l) => l.href)
    expect(hrefs.some((h) => /v0\.|bolt\.new|chatgpt\.com/.test(h ?? ""))).toBe(
      false
    )
  })

  it("disables a link that would pass its documented limit and says why", () => {
    const long = "a".repeat(5001)
    const links = Object.fromEntries(handoffLinks(long).map((l) => [l.id, l]))
    expect(links["claude-code"].href).toBeNull()
    expect(links["claude-code"].reason).toMatch(/Copy prompt/)
    expect(links["claude-desktop"].href).not.toBeNull()
    expect(links.lovable.href).not.toBeNull()
    // Cursor caps the whole URL at 10,000 characters.
    const huge = handoffLinks("a".repeat(9990)).find((l) => l.id === "cursor")!
    expect(huge.href).toBeNull()
  })

  it("counts the encoded length, since symbols grow when encoded", () => {
    // 1,700 newlines encode to 5,100 characters: over Claude Code's 5,000.
    const links = handoffLinks("\n".repeat(1700))
    expect(links.find((l) => l.id === "claude-code")!.href).toBeNull()
  })
})

describe("every pattern page, every sector", () => {
  for (const slug of slugs) {
    const mdx = readFileSync(path.join(componentsDir, `${slug}.mdx`), "utf8")
    const base = getAgentPrompt(mdx)

    it(`${slug}: has a prompt`, () => {
      expect(base).toBeTruthy()
    })

    for (const sector of sectors) {
      it(`${slug} + ${sector}: fits every handoff with room to spare`, () => {
        const text = buildPrompt(base!, sector, getSectorExamples(mdx))
        expect(text.length).toBeLessThanOrEqual(3000)
        expect(encodeURIComponent(text).length).toBeLessThanOrEqual(4500)
        expect(handoffLinks(text).every((l) => l.href !== null)).toBe(true)
      })
    }
  }
})
