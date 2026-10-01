import { type DocsPage } from "@/lib/docs-markdown"
import { orderedUrls, sortPages, type LlmsPage } from "@/lib/llms"
import { source } from "@/lib/source"

/** Every docs page in sidebar order. */
export function getOrderedPages() {
  const pages: (LlmsPage & { page: DocsPage })[] = source
    .getPages()
    .map((page) => ({
      page,
      title: page.data.title ?? page.url,
      description: page.data.description,
      url: page.url,
      path: page.path,
    }))

  return sortPages(pages, orderedUrls(source.pageTree))
}
