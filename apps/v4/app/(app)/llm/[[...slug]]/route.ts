import { notFound } from "next/navigation"
import { NextResponse, type NextRequest } from "next/server"

import { getDemoItem } from "@/lib/registry"
import { source } from "@/lib/source"

export const revalidate = false
export const dynamic = "force-static"
export const dynamicParams = true

const DEFAULT_STYLE = "radix-nova"

// Replace each <ComponentPreview name="..." /> with the demo's source so the
// markdown is useful on its own.
async function inlineComponentPreviews(content: string) {
  const regex = /<ComponentPreview[\s\S]*?\/>/g
  const matches = Array.from(content.matchAll(regex))

  const replacements = await Promise.all(
    matches.map(async ([match]) => {
      const name = match.match(/name="([^"]+)"/)?.[1]
      if (!name) {
        return match
      }

      const styleName = match.match(/styleName="([^"]+)"/)?.[1] ?? DEFAULT_STYLE
      const demo = await getDemoItem(name, styleName)
      const code = demo?.files[0]?.content
      if (!code) {
        return match
      }

      return `\`\`\`tsx\n${code.replaceAll("export default", "export")}\n\`\`\``
    })
  )

  let index = 0
  return content.replace(regex, () => replacements[index++])
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await params

  const page = source.getPage(slug)

  if (!page) {
    notFound()
  }

  const processedContent = await inlineComponentPreviews(
    await page.data.getText("raw")
  )

  return new NextResponse(processedContent, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
}

export function generateStaticParams() {
  return []
}
