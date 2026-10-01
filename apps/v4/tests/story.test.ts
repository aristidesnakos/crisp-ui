import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { buildDocsNav, DOCS_NAV, GET_STARTED } from "../lib/page-tree"
import {
  getStoryGroups,
  getStoryOrder,
  getStoryPages,
  pageSlug,
  STAGES,
  STORY_MAP,
  type TemplateItem,
} from "../lib/story"

// The story (lib/story.ts) orders the docs: the sidebar, the prev/next buttons
// (content/docs/components/meta.json) and the story page. These tests keep the
// map, the registry template and the docs content in step.

const appRoot = path.resolve(import.meta.dirname, "..")
const read = (...parts: string[]) =>
  readFileSync(path.join(appRoot, ...parts), "utf8")
const docsPage = (slug: string) =>
  path.join(appRoot, "content/docs/components", `${slug}.mdx`)

const template = JSON.parse(read("registry-crisp.template.json")) as {
  items: TemplateItem[]
}
const pages = getStoryPages()
const groups = getStoryGroups()
const slugs = pages.map((p) => p.slug)

describe("stages", () => {
  it("match the wording in scripts/build-agent-files.mjs", async () => {
    // The script is plain Node and is not imported by the site, so the list is
    // mirrored in lib/story.ts. This fails when the two drift.
    const script = (await import("../scripts/build-agent-files.mjs")) as {
      STAGES: { id: string; name: string; question: string }[]
    }
    expect(STAGES.map((s) => ({ ...s }))).toEqual(script.STAGES)
  })

  it("run See, Decide, Act, Confirm, Record", () => {
    expect(STAGES.map((s) => s.name)).toEqual([
      "See",
      "Decide",
      "Act",
      "Confirm",
      "Record",
    ])
  })
})

describe("template items and docs pages", () => {
  it("every item's page slug exists as content/docs/components/<slug>.mdx", () => {
    const missing = template.items
      .filter((item) => item.meta?.recipe)
      .map((item) => ({ item: item.name, slug: pageSlug(item) }))
      .filter(({ slug }) => !slug || !existsSync(docsPage(slug)))
    expect(missing).toEqual([])
  })

  it("items that share a page agree on its stage", () => {
    const stages = new Map<string, Set<string | undefined>>()
    for (const item of template.items) {
      const slug = pageSlug(item)
      if (!slug) continue
      const seen = stages.get(slug) ?? new Set()
      seen.add(item.meta?.stage)
      stages.set(slug, seen)
    }
    const disagree = [...stages].filter(([, s]) => s.size > 1).map(([k]) => k)
    expect(disagree).toEqual([])
  })

  it("has one page per slug", () => {
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("skips an item with no page of its own", () => {
    const derived = getStoryPages([
      {
        name: "helper",
        meta: { stage: "see" },
      },
      {
        name: "part",
        title: "Part",
        meta: { stage: "act", recipe: "x/docs/components/part.md" },
      },
    ])
    expect(derived.map((p) => p.slug)).toEqual(["part"])
  })

  it("lets the item named like the page speak for it", () => {
    const derived = getStoryPages([
      {
        name: "part-lib",
        title: "Part lib",
        meta: { stage: "act", recipe: "x/docs/components/part.md" },
      },
      {
        name: "part",
        title: "Part",
        meta: { stage: "act", recipe: "x/docs/components/part.md" },
      },
    ])
    expect(derived).toHaveLength(1)
    expect(derived[0].title).toBe("Part")
  })
})

describe("the story map", () => {
  it("has a stage that matches the template for every page in it", () => {
    const mismatched = Object.entries(STORY_MAP)
      .map(([slug, links]) => ({
        slug,
        mapped: links.stage,
        template: pages.find((p) => p.slug === slug)?.stage,
      }))
      .filter((row) => row.mapped !== row.template)
    expect(mismatched).toEqual([])
  })

  it("only links to pages that exist", () => {
    const known = new Set([...slugs, ...Object.keys(STORY_MAP)])
    const broken = Object.entries(STORY_MAP).flatMap(([slug, links]) =>
      [...links.after, ...links.leadsTo]
        .filter((target) => !known.has(target) || !existsSync(docsPage(target)))
        .map((target) => `${slug} -> ${target}`)
    )
    expect(broken).toEqual([])
  })

  it("closes the loop: audit-timeline leads to status-strip", () => {
    expect(STORY_MAP["audit-timeline"].leadsTo).toContain("status-strip")
  })

  it("only goes forward except for the closing link", () => {
    const rank = (stage: string) => STAGES.findIndex((s) => s.id === stage)
    const backwards = Object.entries(STORY_MAP).flatMap(([slug, links]) =>
      links.leadsTo
        .filter((t) => rank(STORY_MAP[t].stage) < rank(links.stage))
        .map((t) => `${slug} -> ${t}`)
    )
    expect(backwards).toEqual(["audit-timeline -> status-strip"])
  })
})

describe("story groups", () => {
  it("leave no stage empty", () => {
    const empty = groups
      .filter((g) => g.id !== "whole-screens" && g.pages.length === 0)
      .map((g) => g.id)
    expect(empty).toEqual([])
  })

  it("keep composites out of the stages and in Whole screens", () => {
    const composites = pages.filter((p) => p.composite).map((p) => p.slug)
    expect(composites).toContain("status-notify")
    const whole = groups.find((g) => g.id === "whole-screens")
    expect(whole?.pages.map((p) => p.slug)).toEqual(composites)
    for (const g of groups.filter((g) => g.id !== "whole-screens")) {
      expect(g.pages.filter((p) => p.composite)).toEqual([])
    }
    expect(groups.at(-1)?.id).toBe("whole-screens")
  })

  it("put every page in exactly one group", () => {
    expect([...getStoryOrder(groups)].sort()).toEqual([...slugs].sort())
  })

  it("list the pages of a stage in map order", () => {
    const mapOrder = Object.keys(STORY_MAP)
    for (const g of groups) {
      const mapped = g.pages
        .map((p) => p.slug)
        .filter((s) => mapOrder.includes(s))
      expect(mapped).toEqual(
        [...mapped].sort((a, b) => mapOrder.indexOf(a) - mapOrder.indexOf(b))
      )
    }
  })

  it("add a page that the map does not know yet, after the mapped ones", () => {
    const derived = getStoryGroups(
      getStoryPages([
        ...template.items,
        {
          name: "new-thing",
          title: "New thing",
          meta: {
            stage: "see",
            recipe: "x/docs/components/new-thing.md",
          },
        },
      ])
    )
    const see = derived.find((g) => g.id === "see")?.pages.map((p) => p.slug)
    expect(see?.at(-1)).toBe("new-thing")
  })
})

describe("navigation", () => {
  const nav = buildDocsNav()
  const patternGroups = nav.filter((g) => g !== GET_STARTED)

  it("starts with Get Started and keeps its hrefs", () => {
    expect(nav[0].name).toBe("Get Started")
    expect(nav[0].items.map((i) => i.href)).toEqual([
      "/docs",
      "/docs/installation",
      "/docs/story",
      "/docs/build-the-arc",
      "/docs/ai",
      "/docs/components",
    ])
  })

  it("has one group per stage, then Whole screens", () => {
    expect(patternGroups.map((g) => g.name)).toEqual([
      ...STAGES.map((s) => s.name),
      "Whole screens",
    ])
  })

  it("is what the module exports", () => {
    expect(DOCS_NAV).toEqual(nav)
  })

  it("lists the pages in story order", () => {
    const navSlugs = patternGroups.flatMap((g) =>
      g.items.map((i) => i.href.replace("/docs/components/", ""))
    )
    expect(navSlugs).toEqual(getStoryOrder())
  })

  it("matches the order of content/docs/components/meta.json, so prev/next follows the story", () => {
    const meta = JSON.parse(read("content/docs/components/meta.json")) as {
      pages: string[]
    }
    expect(meta.pages).toEqual(["index", ...getStoryOrder()])
  })

  it("links only to pages that exist", () => {
    for (const item of nav.flatMap((g) => g.items)) {
      const rel = item.href.replace(/^\/docs\/?/, "")
      const candidates = [
        `content/docs/${rel}.mdx`,
        `content/docs/(root)/${rel || "index"}.mdx`,
        `content/docs/${rel}/index.mdx`,
      ]
      expect(
        candidates.some((c) => existsSync(path.join(appRoot, c))),
        item.href
      ).toBe(true)
    }
  })

  it("lists story in the docs root meta, before the AI page", () => {
    const meta = JSON.parse(read("content/docs/meta.json")) as {
      pages: string[]
    }
    expect(meta.pages.indexOf("story")).toBeGreaterThan(-1)
    expect(meta.pages.indexOf("story")).toBeLessThan(meta.pages.indexOf("ai"))
  })
})

describe("story and index pages", () => {
  const story = read("content/docs/story.mdx")
  const index = read("content/docs/components/index.mdx")

  it("link every pattern page", () => {
    for (const slug of slugs) {
      expect(story, `story.mdx -> ${slug}`).toContain(
        `(/docs/components/${slug})`
      )
      expect(index, `index.mdx -> ${slug}`).toContain(
        `(/docs/components/${slug})`
      )
    }
  })

  it("state the limits", () => {
    expect(story).toMatch(/not a standard/i)
    expect(story).toMatch(/does not make anything compliant/i)
    expect(story).toMatch(/email only/i)
  })

  it("index is organised by stage", () => {
    for (const heading of [...STAGES.map((s) => s.name), "Whole screens"]) {
      expect(index).toContain(`## ${heading}`)
    }
  })
})
