import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  getAgentPrompt,
  getNext,
  getSection,
  getSectorExamples,
  SECTORS,
  splitSections,
} from "../lib/pattern-sections"

const appRoot = path.resolve(import.meta.dirname, "..")
const docsDir = path.join(appRoot, "content/docs/components")
const readText = (file: string) => readFileSync(file, "utf8")

const REQUIRED_HEADINGS = [
  "Installation",
  "Usage",
  "What it does not do",
  "Agent prompt",
  "Examples by sector",
  "Next",
]

const MAX_PROMPT_LENGTH = 2500
const REGISTRY_URL = "https://regularui.com/r/"

/** The story order: where each pattern sits, as "comes after" and "leads to". */
const STORY: Record<string, { after: string[]; leadsTo: string[] }> = {
  "status-strip": {
    after: [],
    leadsTo: ["data-table", "recipient-roster"],
  },
  "data-table": {
    after: ["status-strip"],
    leadsTo: ["approval-step", "confirm-send"],
  },
  "recipient-roster": {
    after: ["status-strip", "data-table"],
    leadsTo: ["alert-rules", "confirm-send"],
  },
  "alert-rules": {
    after: ["recipient-roster"],
    leadsTo: ["confirm-send"],
  },
  "save-bar": {
    after: ["recipient-roster", "alert-rules"],
    leadsTo: ["confirm-send"],
  },
  "approval-step": {
    after: ["data-table"],
    leadsTo: ["confirm-send", "audit-timeline"],
  },
  "confirm-send": {
    after: ["data-table", "approval-step", "save-bar"],
    leadsTo: ["audit-timeline"],
  },
  "notify-envelope": {
    after: ["confirm-send"],
    leadsTo: ["audit-timeline"],
  },
  quiz: {
    after: ["confirm-send", "notify-envelope"],
    leadsTo: ["audit-timeline"],
  },
  "audit-timeline": {
    after: ["confirm-send", "approval-step"],
    leadsTo: ["status-strip"],
  },
  "status-notify": {
    after: [],
    leadsTo: ["audit-timeline"],
  },
  // A whole screen that wires all five stages; it closes the loop itself.
  "calibration-desk": {
    after: ["status-strip"],
    leadsTo: [],
  },
}

const meta = JSON.parse(readText(path.join(docsDir, "meta.json"))) as {
  pages: string[]
}
const pages = meta.pages.filter((page) => page !== "index")

const registry = JSON.parse(
  readText(path.join(appRoot, "registry-crisp.template.json"))
) as { items: { name: string }[] }
const registryItems = new Set(registry.items.map((item) => item.name))

describe("pattern docs: the list of pages", () => {
  it("covers every pattern and nothing else", () => {
    expect([...pages].sort()).toEqual(Object.keys(STORY).sort())
  })

  it("has a file for every page", () => {
    for (const page of pages) {
      expect(existsSync(path.join(docsDir, `${page}.mdx`)), page).toBe(true)
    }
  })
})

describe.each(pages)("pattern docs: %s", (page) => {
  const mdx = readText(path.join(docsDir, `${page}.mdx`))
  const names = splitSections(mdx).map((section) => section.name)

  it("has every required heading, once", () => {
    for (const heading of REQUIRED_HEADINGS) {
      expect(
        names.filter((name) => name === heading),
        `${page} needs one "## ${heading}"`
      ).toHaveLength(1)
    }
  })

  it("has a non-empty body under each required heading", () => {
    for (const heading of REQUIRED_HEADINGS) {
      expect(getSection(mdx, heading)?.trim(), heading).toBeTruthy()
    }
  })

  describe("agent prompt", () => {
    const prompt = getAgentPrompt(mdx) ?? ""

    it("is present and at most 2,500 characters", () => {
      expect(prompt.length).toBeGreaterThan(0)
      expect(prompt.length).toBeLessThanOrEqual(MAX_PROMPT_LENGTH)
    })

    it("installs this page's item from the registry, and only items that exist", () => {
      expect(prompt).toContain(`${REGISTRY_URL}${page}.json`)
      const urls = [...prompt.matchAll(/https:\/\/regularui\.com\/r\/(\S+)/g)]
      expect(urls.length).toBeGreaterThan(0)
      for (const [, rest] of urls) {
        const item = rest.replace(/\.json$/, "")
        expect(rest, `${rest} should end in .json`).toMatch(/\.json$/)
        expect(registryItems.has(item), `${item} is not a registry item`).toBe(
          true
        )
      }
    })

    it("tells the agent to read the installed files first", () => {
      expect(prompt).toContain("Read the installed files")
    })
  })

  it("has an example for each of the four sectors", () => {
    const examples = getSectorExamples(mdx)
    for (const sector of SECTORS) {
      expect(examples[sector].length, `${page}: ${sector}`).toBeGreaterThan(0)
    }
  })

  describe("next", () => {
    const next = getNext(mdx)
    const expected = STORY[page]

    it("is one line in the canonical form", () => {
      const body = getSection(mdx, "Next") ?? ""
      expect(body).toMatch(/^Comes after: .+\. Leads to: .+\.$/)
    })

    it("links to pages that exist", () => {
      for (const slug of [...next.after, ...next.leadsTo]) {
        expect(pages, `${page} links to ${slug}`).toContain(slug)
        expect(existsSync(path.join(docsDir, `${slug}.mdx`)), slug).toBe(true)
      }
    })

    it("matches the canonical story map", () => {
      expect(next).toEqual(expected)
    })

    it('says "none" when nothing comes before it', () => {
      if (expected.after.length > 0) return
      expect(getSection(mdx, "Next")).toMatch(
        /^Comes after: none, this is where a screen starts\. Leads to:/
      )
    })
  })
})
