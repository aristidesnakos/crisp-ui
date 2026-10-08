import { type Metadata, type ResolvingMetadata } from "next"

import { siteConfig } from "@/lib/config"
import { TOOLS } from "@/lib/tools"
import { DevFeedback } from "@/components/dev/dev-feedback"
import { ToolCard } from "@/components/marketing/moments"
import { Eyebrow } from "@/components/marketing/section"

const title = "Tools"
const description =
  "Finished tools for jobs that need a paper trail: training, sign-offs, approvals, inspections and incidents."

export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // This openGraph replaces the layout's whole object, so carry over the
  // layout's card. Twitter falls back to it.
  const { openGraph } = await parent
  const socialTitle = `${title} - ${siteConfig.name}`

  return {
    title,
    description,
    alternates: { canonical: "/tools" },
    openGraph: {
      type: "website",
      url: "/tools",
      title: socialTitle,
      description,
      siteName: siteConfig.name,
      images: openGraph?.images,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
  }
}

export default function ToolsPage() {
  const [featured, ...rest] = TOOLS
  return (
    <div className="flex flex-1 flex-col pb-24">
      <DevFeedback name="Tools.Hero">
        <header className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-20 pb-12 md:px-6 md:pt-24">
          <Eyebrow>Tools</Eyebrow>
          <h1 className="max-w-3xl font-display text-5xl leading-[0.98] tracking-tight text-balance md:text-6xl">
            Finished tools for jobs that need a paper trail
          </h1>
          <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
            Each one works the moment you open it, with sample data. Make it
            yours in plain words, then take it live in your own account.
          </p>
        </header>
      </DevFeedback>
      <DevFeedback name="Tools.Grid">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 md:grid-cols-2 md:px-6 lg:grid-cols-3">
          <div className="md:col-span-2 lg:col-span-2 lg:row-span-2 [&>article]:h-full">
            <ToolCard tool={featured} featured />
          </div>
          {rest.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </DevFeedback>
      <DevFeedback name="Tools.Request">
        <div className="mx-auto mt-16 w-full max-w-6xl px-4 md:px-6">
          <div className="flex flex-col gap-2 rounded-2xl border border-dashed p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl">Need a different tool?</h2>
              <p className="text-sm text-muted-foreground">
                Tell us the job. The most requested tool gets built next.
              </p>
            </div>
            <a
              href="https://github.com/aristidesnakos/crisp-ui/issues/new?title=Tool%20request%3A%20"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-brand underline-offset-4 hover:underline"
            >
              Request a tool
            </a>
          </div>
        </div>
      </DevFeedback>
    </div>
  )
}
