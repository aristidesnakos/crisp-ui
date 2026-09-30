import { type Metadata } from "next"
import Link from "next/link"
import StatusNotifyDemo from "@/examples/radix/status-notify-demo"

import { siteConfig } from "@/lib/config"
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
    url: siteConfig.url,
    title: metadataTitle,
    description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: metadataTitle,
    description,
  },
}

export default function IndexPage() {
  return (
    <div className="flex flex-1 flex-col">
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
      <div className="container-wrapper flex-1 p-0">
        <div className="container flex justify-center px-4 pb-16 md:px-6">
          <StatusNotifyDemo />
        </div>
      </div>
    </div>
  )
}
