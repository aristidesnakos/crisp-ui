import { describe, expect, it } from "vitest"

import {
  buildDocsJsonLd,
  docsCrumbs,
  serializeJsonLd,
} from "../lib/structured-data"

const origin = "https://realgood.site"
const names: Record<string, string> = {
  "/docs": "Docs",
  "/docs/components": "Patterns",
}
const nameFor = (url: string) => names[url]

describe("docsCrumbs", () => {
  it("lists each ancestor then the page, outermost first", () => {
    expect(
      docsCrumbs("/docs/components/data-table", "Data table", nameFor)
    ).toEqual([
      { name: "Docs", url: "/docs" },
      { name: "Patterns", url: "/docs/components" },
      { name: "Data table", url: "/docs/components/data-table" },
    ])
  })

  it("handles a page directly under /docs", () => {
    expect(docsCrumbs("/docs/story", "The story", nameFor)).toEqual([
      { name: "Docs", url: "/docs" },
      { name: "The story", url: "/docs/story" },
    ])
  })

  it("falls back to the path segment for an unknown ancestor", () => {
    expect(docsCrumbs("/docs/a/b", "B", () => undefined)[1]).toEqual({
      name: "a",
      url: "/docs/a",
    })
  })
})

describe("buildDocsJsonLd", () => {
  const page = {
    title: "Data table",
    description: "A table with row actions.",
    url: "/docs/components/data-table",
  }
  const ld = buildDocsJsonLd(
    page,
    docsCrumbs(page.url, page.title, nameFor),
    origin,
    "crisp-ui"
  )

  it("has one TechArticle with absolute URLs and no invented fields", () => {
    const article = ld["@graph"][0] as Record<string, unknown>
    expect(ld["@context"]).toBe("https://schema.org")
    expect(article["@type"]).toBe("TechArticle")
    expect(article.url).toBe(`${origin}/docs/components/data-table`)
    expect(article.headline).toBe("Data table")
    for (const invented of ["author", "datePublished", "dateModified"]) {
      expect(article).not.toHaveProperty(invented)
    }
  })

  it("numbers breadcrumb items from 1 with absolute URLs", () => {
    const list = ld["@graph"][1] as {
      itemListElement: { position: number; item: string }[]
    }
    expect(list.itemListElement.map((i) => i.position)).toEqual([1, 2, 3])
    expect(list.itemListElement.every((i) => i.item.startsWith(origin))).toBe(
      true
    )
  })
})

describe("serializeJsonLd", () => {
  it("escapes < so a script tag cannot be closed from inside the data", () => {
    const out = serializeJsonLd({ a: "</script><b>" })
    expect(out).not.toContain("<")
    expect(JSON.parse(out).a).toBe("</script><b>")
  })
})
