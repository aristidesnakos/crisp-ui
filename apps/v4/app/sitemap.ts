import type { MetadataRoute } from "next"

import { source } from "@/lib/source"
import { getSiteUrl } from "@/app/site-url"

export default function sitemap(): MetadataRoute.Sitemap {
  const urls = ["/", ...source.getPages().map((page) => page.url)]

  return [...new Set(urls)].map((path) => ({
    url: new URL(path, getSiteUrl()).toString(),
  }))
}
