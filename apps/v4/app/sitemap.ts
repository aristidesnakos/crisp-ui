import type { MetadataRoute } from "next"

import { source } from "@/lib/source"
import { TOOLS } from "@/lib/tools"
import { getSiteUrl } from "@/app/site-url"

export default function sitemap(): MetadataRoute.Sitemap {
  const urls = [
    "/",
    "/tools",
    // A tool page is listed as soon as the catalogue links to it.
    ...TOOLS.flatMap((tool) => (tool.href ? [tool.href] : [])),
    "/pricing",
    ...source.getPages().map((page) => page.url),
  ]

  return [...new Set(urls)].map((path) => ({
    url: new URL(path, getSiteUrl()).toString(),
  }))
}
