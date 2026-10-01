import Link from "next/link"
import { notFound } from "next/navigation"
import { mdxComponents } from "@/mdx-components"
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react"
import { findNeighbour } from "fumadocs-core/page-tree"

import { siteConfig } from "@/lib/config"
import { getPageMarkdown } from "@/lib/docs-markdown"
import { twinPath } from "@/lib/mdx-to-markdown"
import { getAgentPrompt, getSectorExamples } from "@/lib/pattern-sections"
import { source } from "@/lib/source"
import { absoluteUrl } from "@/lib/utils"
import { AgentPromptBar } from "@/components/agent-prompt-bar"
import { DevFeedback } from "@/components/dev/dev-feedback"
import { DocsCopyPage } from "@/components/docs-copy-page"
import { DocsTableOfContents } from "@/components/docs-toc"
import { Button } from "@/registry/new-york-v4/ui/button"

export const revalidate = false
export const dynamic = "force-static"
export const dynamicParams = false

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>
}) {
  const params = await props.params
  const page = source.getPage(params.slug)

  if (!page) {
    notFound()
  }

  const doc = page.data

  if (!doc.title || !doc.description) {
    notFound()
  }

  return {
    title: doc.title,
    description: doc.description,
    alternates: {
      canonical: page.url,
      // <link rel="alternate" type="text/markdown"> for agents and crawlers.
      types: { "text/markdown": twinPath(page.url) },
    },
    openGraph: {
      title: doc.title,
      description: doc.description,
      type: "article",
      url: absoluteUrl(page.url),
      // A page's openGraph replaces the layout's rather than merging, so the
      // shared image is repeated here.
      images: [{ url: "/og.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: doc.title,
      description: doc.description,
      images: ["/og.png"],
    },
  }
}

export default async function Page(props: {
  params: Promise<{ slug: string[] }>
}) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) {
    notFound()
  }

  const doc = page.data
  const MDX = doc.body
  const neighbours = findNeighbour(source.pageTree, page.url)
  const slug = page.slugs.join("/") || "index"
  // The same plain markdown the page's .md twin serves, so "Copy Page" gives
  // an agent code and tables rather than MDX component tags.
  const markdown = await getPageMarkdown(page)
  // Pattern pages carry an "Agent prompt" section; others do not get the bar.
  const rawMdx = await doc.getText("raw")
  const agentPrompt = getAgentPrompt(rawMdx)
  const sectorExamples = getSectorExamples(rawMdx)

  return (
    <div
      data-slot="docs"
      className="flex scroll-mt-24 items-stretch pb-8 text-[1.05rem] sm:text-[15px] xl:w-full"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-(--top-spacing) shrink-0" />
        <div className="mx-auto flex w-full max-w-160 min-w-0 flex-1 flex-col gap-6 px-4 py-6 text-foreground md:px-0 lg:py-8 dark:text-foreground">
          <DevFeedback name={`Docs.${slug}.Header`}>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between md:items-start">
                  <h1 className="scroll-m-24 text-3xl font-semibold tracking-tight sm:text-3xl">
                    {doc.title}
                  </h1>
                  <div className="docs-nav flex items-center gap-2">
                    <div className="hidden sm:block">
                      <DocsCopyPage
                        page={markdown}
                        url={absoluteUrl(page.url)}
                      />
                    </div>
                    <div className="ml-auto flex gap-2">
                      {neighbours.previous && (
                        <Button
                          variant="secondary"
                          size="icon"
                          className="extend-touch-target size-8 shadow-none md:size-7"
                          asChild
                        >
                          <Link href={neighbours.previous.url}>
                            <IconArrowLeft />
                            <span className="sr-only">
                              Previous page: {neighbours.previous.name}
                            </span>
                          </Link>
                        </Button>
                      )}
                      {neighbours.next && (
                        <Button
                          variant="secondary"
                          size="icon"
                          className="extend-touch-target size-8 shadow-none md:size-7"
                          asChild
                        >
                          <Link href={neighbours.next.url}>
                            <span className="sr-only">
                              Next page: {neighbours.next.name}
                            </span>
                            <IconArrowRight />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {doc.description && (
                  <p className="text-[1.05rem] text-muted-foreground sm:text-base sm:text-balance md:max-w-[80%]">
                    {doc.description}
                  </p>
                )}
              </div>
            </div>
          </DevFeedback>
          {agentPrompt && (
            <DevFeedback name={`Docs.${slug}.PromptBar`}>
              <AgentPromptBar prompt={agentPrompt} examples={sectorExamples} />
            </DevFeedback>
          )}
          <DevFeedback name={`Docs.${slug}.Body`}>
            <div className="typeset w-full flex-1 pb-16 *:data-[slot=alert]:first:mt-0 sm:pb-0">
              <MDX components={mdxComponents} />
            </div>
          </DevFeedback>
          <nav
            aria-label="Pagination"
            className="hidden h-16 w-full items-center gap-2 px-4 sm:flex sm:px-0"
          >
            {neighbours.previous && (
              <Button
                variant="secondary"
                size="sm"
                asChild
                className="shadow-none"
              >
                <Link href={neighbours.previous.url}>
                  <IconArrowLeft /> {neighbours.previous.name}
                </Link>
              </Button>
            )}
            {neighbours.next && (
              <Button
                variant="secondary"
                size="sm"
                className="ml-auto shadow-none"
                asChild
              >
                <Link href={neighbours.next.url}>
                  {neighbours.next.name} <IconArrowRight />
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
      <div className="sticky top-[calc(var(--header-height)+1px)] z-30 ml-auto hidden h-[90svh] w-(--sidebar-width) flex-col gap-4 overflow-hidden overscroll-none pb-8 xl:flex">
        <div className="h-(--top-spacing) shrink-0"></div>
        {doc.toc?.length ? (
          <div className="flex scroll-fade scrollbar-none flex-col gap-8 overflow-y-auto px-8">
            <DocsTableOfContents toc={doc.toc} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
