import { describe, expect, it } from "vitest"

import {
  buildLlmsFullTxt,
  buildLlmsTxt,
  orderedUrls,
  sortPages,
  type LlmsPage,
} from "../lib/llms"

const pages: LlmsPage[] = [
  {
    title: "Introduction",
    description: "What crisp-ui is.",
    url: "/docs",
    path: "(root)/index.mdx",
  },
  {
    title: "Installation",
    description: "Set up\nthe registry.",
    url: "/docs/installation",
    path: "(root)/installation.mdx",
  },
  {
    title: "Patterns",
    url: "/docs/components",
    path: "components/index.mdx",
  },
  {
    title: "Status and notify",
    description: "A status headline and a roster.",
    url: "/docs/components/status-notify",
    path: "components/status-notify.mdx",
  },
]

describe("buildLlmsTxt", () => {
  const txt = buildLlmsTxt({
    origin: "https://regularui.com/",
    name: "crisp-ui",
    summary: "Patterns for dashboards.",
    pages,
  })

  it("opens with the name and summary", () => {
    expect(txt.split("\n").slice(0, 3)).toEqual([
      "# crisp-ui",
      "",
      "> Patterns for dashboards.",
    ])
  })

  it("tells an agent how to install, where the JSON is and that pages have .md twins", () => {
    expect(txt).toContain(
      "npx shadcn@latest add https://regularui.com/r/<item>.json"
    )
    expect(txt).toContain(
      "`https://regularui.com/r/<item>.json` is the machine-readable item"
    )
    expect(txt).toContain("add `.md` to its URL")
    expect(txt).toContain("Accept: text/markdown")
    expect(txt).toContain("https://regularui.com/llms-full.txt")
    expect(txt).toContain("do not enforce access control")
  })

  it("lists every page once, as an absolute .md link with its description", () => {
    for (const page of pages) {
      const href = `https://regularui.com${page.url}.md`
      expect(txt.split(`](${href})`)).toHaveLength(2)
    }

    expect(txt).toContain(
      "- [Status and notify](https://regularui.com/docs/components/status-notify.md): A status headline and a roster."
    )
    // Multi-line descriptions stay on one line; a missing one adds no colon.
    expect(txt).toContain(
      "- [Installation](https://regularui.com/docs/installation.md): Set up the registry."
    )
    expect(txt).toContain(
      "- [Patterns](https://regularui.com/docs/components.md)\n"
    )
  })

  it("groups pages by content folder", () => {
    const guides = txt.indexOf("## Guides")
    const patterns = txt.indexOf("## Patterns")
    expect(guides).toBeGreaterThan(-1)
    expect(patterns).toBeGreaterThan(guides)
    expect(txt.indexOf("installation.md")).toBeLessThan(patterns)
    expect(txt.indexOf("status-notify.md")).toBeGreaterThan(patterns)
  })

  it("has no relative links and no localhost", () => {
    expect(txt).not.toMatch(/\]\(\//)
    expect(txt).not.toContain("localhost")
  })
})

describe("buildLlmsFullTxt", () => {
  it("joins pages, each led by its source URL", () => {
    const txt = buildLlmsFullTxt({
      origin: "https://regularui.com",
      entries: [
        { url: "/docs", markdown: "# One\n\nA.\n" },
        { url: "/docs/two", markdown: "# Two\n\nB.\n" },
      ],
    })

    expect(txt).toBe(
      "Source: https://regularui.com/docs.md\n\n# One\n\nA.\n\n---\n\nSource: https://regularui.com/docs/two.md\n\n# Two\n\nB.\n"
    )
  })
})

describe("page order", () => {
  it("follows the page tree, with a folder's index page first", () => {
    const urls = orderedUrls({
      children: [
        { type: "page", url: "/docs" },
        { type: "page", url: "/docs/installation" },
        {
          type: "folder",
          index: { url: "/docs/components" },
          children: [
            { type: "page", url: "/docs/components/b" },
            { type: "separator" },
            { type: "page", url: "/docs/components/a" },
          ],
        },
      ],
    })

    expect(urls).toEqual([
      "/docs",
      "/docs/installation",
      "/docs/components",
      "/docs/components/b",
      "/docs/components/a",
    ])
  })

  it("sorts by that order and keeps unknown pages last", () => {
    const sorted = sortPages(
      [
        { title: "x", url: "/docs/x", path: "x.mdx" },
        { title: "b", url: "/docs/b", path: "b.mdx" },
        { title: "a", url: "/docs/a", path: "a.mdx" },
      ],
      ["/docs/a", "/docs/b"]
    )
    expect(sorted.map((page) => page.title)).toEqual(["a", "b", "x"])
  })
})
