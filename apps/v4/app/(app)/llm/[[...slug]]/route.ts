import { notFound } from "next/navigation"
import { NextResponse, type NextRequest } from "next/server"

import { getPageMarkdown } from "@/lib/docs-markdown"
import { source } from "@/lib/source"

// The Markdown twin of every docs page. next.config.mjs rewrites
// /docs/<page>.md here, and proxy.ts rewrites a docs URL requested with
// `Accept: text/markdown` here too.
export const revalidate = false
export const dynamic = "force-static"
export const dynamicParams = false

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await params

  const page = source.getPage(slug)

  if (!page) {
    notFound()
  }

  return new NextResponse(await getPageMarkdown(page), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
}

export function generateStaticParams() {
  return source.generateParams()
}
