import { getPageMarkdown } from "@/lib/docs-markdown"
import { getOrderedPages } from "@/lib/docs-pages"
import { buildLlmsFullTxt } from "@/lib/llms"
import { getSiteUrl } from "@/app/site-url"

export const revalidate = false
export const dynamic = "force-static"

export async function GET() {
  const entries = await Promise.all(
    getOrderedPages().map(async ({ page, url }) => ({
      url,
      markdown: await getPageMarkdown(page),
    }))
  )

  return new Response(buildLlmsFullTxt({ origin: getSiteUrl(), entries }), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
