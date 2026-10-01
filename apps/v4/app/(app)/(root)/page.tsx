import { type Metadata } from "next"
import Link from "next/link"
import StatusNotifyDemo from "@/examples/radix/status-notify-demo"

import { siteConfig } from "@/lib/config"
import { getStoryGroups, STAGES } from "@/lib/story"
import { DevFeedback } from "@/components/dev/dev-feedback"
import {
  PageActions,
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/page-header"
import { Button } from "@/registry/new-york-v4/ui/button"

const title = "Dashboards that keep people in the loop"
const metadataTitle = `${siteConfig.name} - ${title}`
const description = siteConfig.description

export const dynamic = "force-static"
export const revalidate = false

export const metadata: Metadata = {
  title: {
    absolute: metadataTitle,
  },
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: metadataTitle,
    description,
    siteName: siteConfig.name,
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: metadataTitle,
    description,
    images: ["/og.png"],
  },
}

// The five stages of the story, each with the first page of its group. The
// pages come from the registry template, so a new pattern needs no edit here.
function storyStages() {
  const groups = getStoryGroups()
  return STAGES.map((stage, index) => {
    const first = groups.find((group) => group.id === stage.id)?.pages[0]
    return { ...stage, number: index + 1, first }
  })
}

export default function IndexPage() {
  const stages = storyStages()
  return (
    <div className="flex flex-1 flex-col">
      <DevFeedback name="Landing.Hero">
        <PageHeader className="md:**:[.container]:pb-8 lg:**:[.container]:pb-12">
          <PageHeaderHeading className="max-w-4xl">{title}</PageHeaderHeading>
          <PageHeaderDescription>{description}</PageHeaderDescription>
          <PageActions>
            <Button asChild className="h-[35px]">
              <Link href="/docs/installation">Get Started</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/docs/components">View patterns</Link>
            </Button>
          </PageActions>
        </PageHeader>
      </DevFeedback>
      <div className="container-wrapper flex-1 p-0">
        <div className="container flex justify-center px-4 pb-16 md:px-6">
          <DevFeedback name="Landing.Demo">
            <StatusNotifyDemo />
          </DevFeedback>
        </div>
        <div className="container px-4 pb-16 md:px-6">
          <DevFeedback name="Landing.Story">
            <section
              aria-labelledby="story-heading"
              className="mx-auto flex max-w-5xl flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <h2
                  id="story-heading"
                  className="text-2xl font-semibold tracking-tight"
                >
                  The story
                </h2>
                <p className="max-w-2xl text-muted-foreground">
                  A recommended order for a workflow screen: see it, decide who
                  hears, act, confirm it worked, and record it. A path, not a
                  standard; use the stages you need.{" "}
                  <Link
                    href="/docs/story"
                    className="text-foreground underline underline-offset-4"
                  >
                    Read the story
                  </Link>
                  .
                </p>
              </div>
              <ol className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-5">
                {stages.map((stage) => (
                  <li
                    key={stage.id}
                    className="flex flex-col gap-2 rounded-lg border p-4"
                  >
                    <span className="text-sm text-muted-foreground">
                      {stage.number}
                    </span>
                    <h3 className="font-medium">{stage.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {stage.question}
                    </p>
                    {stage.first ? (
                      <Link
                        href={stage.first.href}
                        className="mt-auto text-sm underline underline-offset-4"
                      >
                        {stage.first.title}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          </DevFeedback>
        </div>
      </div>
    </div>
  )
}
