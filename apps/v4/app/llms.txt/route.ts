import { siteConfig } from "@/lib/config"
import { getOrderedPages } from "@/lib/docs-pages"
import { buildLlmsTxt } from "@/lib/llms"
import { getSiteUrl } from "@/app/site-url"

export const revalidate = false
export const dynamic = "force-static"

export function GET() {
  const body = buildLlmsTxt({
    origin: getSiteUrl(),
    name: siteConfig.name,
    summary: siteConfig.description,
    pages: getOrderedPages(),
  })

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
