/**
 * schema.org JSON-LD for docs pages. Only facts the page already states are
 * emitted (title, description, URL, position in the site); there is no author,
 * date or rating, because the content carries none.
 */

export type Crumb = { name: string; url: string }

type Page = { title: string; description: string; url: string }

export function buildBreadcrumbList(crumbs: Crumb[], origin: string) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${origin}${crumb.url}`,
    })),
  }
}

export function buildTechArticle(page: Page, origin: string, siteName: string) {
  return {
    "@type": "TechArticle",
    headline: page.title,
    description: page.description,
    url: `${origin}${page.url}`,
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", name: siteName, url: origin },
  }
}

/** One JSON-LD document holding the article and its breadcrumb trail. */
export function buildDocsJsonLd(
  page: Page,
  crumbs: Crumb[],
  origin: string,
  siteName: string
) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildTechArticle(page, origin, siteName),
      buildBreadcrumbList(crumbs, origin),
    ],
  }
}

/**
 * The trail for a docs URL: each ancestor under /docs, then the page itself.
 * `nameFor` resolves an ancestor's display name; the page uses its own title.
 */
export function docsCrumbs(
  pageUrl: string,
  pageTitle: string,
  nameFor: (url: string) => string | undefined
): Crumb[] {
  const segments = pageUrl.split("/").filter(Boolean)
  const crumbs: Crumb[] = []
  for (let i = 1; i < segments.length; i++) {
    const url = `/${segments.slice(0, i).join("/")}`
    crumbs.push({ name: nameFor(url) ?? segments[i - 1], url })
  }
  crumbs.push({ name: pageTitle, url: pageUrl })
  return crumbs
}

/**
 * Serialised for a <script type="application/ld+json"> tag. "<" is escaped so
 * text containing "</script>" cannot end the tag early.
 */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
