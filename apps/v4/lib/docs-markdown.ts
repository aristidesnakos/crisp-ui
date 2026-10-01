import { formatCode } from "@/lib/format-code"
import { renderPage, type MarkdownResolvers } from "@/lib/mdx-to-markdown"
import { readFileFromRoot } from "@/lib/read-file"
import { getDemoItem } from "@/lib/registry"
import { source } from "@/lib/source"
import { getSiteUrl } from "@/app/site-url"

export type DocsPage = NonNullable<ReturnType<typeof source.getPage>>

// The same code the docs page shows, with the consumer's import aliases.
const resolvers: MarkdownResolvers = {
  readSource: async (src) => formatCode(await readFileFromRoot(src)),
  readDemo: async (name, styleName) => {
    const code = (await getDemoItem(name, styleName))?.files[0]?.content
    return code ? formatCode(code) : undefined
  },
}

/** The page as plain markdown, with demo and source code inlined. */
export async function getPageMarkdown(page: DocsPage) {
  return renderPage(
    {
      title: page.data.title ?? page.url,
      description: page.data.description,
      mdx: await page.data.getText("raw"),
    },
    resolvers,
    { origin: getSiteUrl() }
  )
}
