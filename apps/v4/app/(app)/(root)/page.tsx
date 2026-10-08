import { type Metadata, type ResolvingMetadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { heroCopy, siteConfig } from "@/lib/config"
import { SHOWCASE } from "@/lib/tools"
import { DevFeedback } from "@/components/dev/dev-feedback"
import { Eyebrow, Section } from "@/components/marketing/section"
import { ShowcaseGrid } from "@/components/marketing/showcase-grid"
import { Button } from "@/registry/new-york-v4/ui/button"

const title = `${heroCopy.lead} ${heroCopy.emphasis}`
const metadataTitle = `${siteConfig.name} - ${title}`
const description = siteConfig.description

export const dynamic = "force-static"
export const revalidate = false

export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // This openGraph replaces the layout's whole object, so carry over the card
  // app/opengraph-image.tsx put there. Twitter falls back to it.
  const { openGraph } = await parent

  return {
    title: { absolute: metadataTitle },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      title: metadataTitle,
      description,
      siteName: siteConfig.name,
      images: openGraph?.images,
    },
    twitter: {
      card: "summary_large_image",
      title: metadataTitle,
      description,
    },
  }
}

const STEPS = [
  {
    title: "Try it with sample data",
    text: "Click through the real tool before you sign up for anything. Type what you track and watch it change to match.",
  },
  {
    title: "Describe your team",
    text: "Answer four questions: who you track, what they must complete, who signs off and who else hears. We turn your answers into instructions your AI assistant follows.",
  },
  {
    title: "Go live in your own account",
    text: "One click sets up sign-in, your database and email reminders in accounts you own. Your people's records never pass through us.",
  },
]

const BUILT_IN = [
  [
    "The count before every send",
    "Nobody emails the whole company by accident.",
  ],
  [
    "A reason on every sign-off",
    "Decisions still explain themselves months later.",
  ],
  [
    "A record that writes itself",
    "Every reminder, sign-off and failure, saved by the server, not the browser.",
  ],
  ["Quiet hours", "Reminders wait until morning."],
  [
    "No personal details in emails",
    "First name and training name. Nothing else.",
  ],
  [
    "Usable by everyone",
    "Works with a keyboard and a screen reader, with text that meets WCAG AA contrast.",
  ],
] as const

function LandingHero() {
  return (
    <DevFeedback name="Landing.Hero">
      <section className="px-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 pt-28 pb-20 text-center md:pt-40 md:pb-28">
          <Eyebrow>{heroCopy.eyebrow}</Eyebrow>
          <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-balance sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            {heroCopy.lead} <em className="text-brand">{heroCopy.emphasis}</em>
          </h1>
          <p className="max-w-2xl text-lg text-pretty text-muted-foreground md:text-xl">
            Start from a finished tracker for training, certificates and
            sign-offs. Describe it in plain words and your AI assistant makes it
            yours. Reminders, sign-offs and a record you can show anyone who
            asks come built in.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/tools/training-tracker">
                Try the training tracker
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
        </div>
      </section>
    </DevFeedback>
  )
}

function LandingShowcase() {
  return (
    <DevFeedback name="Landing.Showcase">
      <Section
        id="built-with"
        space="roomy"
        align="center"
        className="pt-8 md:pt-12"
        eyebrow="Built with Real Good Site"
        title="Real sites, built from these parts"
      >
        <ShowcaseGrid items={SHOWCASE} />
      </Section>
    </DevFeedback>
  )
}

function LandingHowItWorks() {
  return (
    <DevFeedback name="Landing.HowItWorks">
      <Section
        id="how-it-works"
        space="roomy"
        tone="paper"
        eyebrow="How it works"
        title="From sample to yours in three steps"
        lede="A spreadsheet never reminds anyone, off-the-shelf software fits someone else's process, and a developer takes months. Now you start from a finished tool and shape it in plain words."
      >
        <ol className="grid list-none gap-12 p-0 md:grid-cols-3 md:gap-14">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3">
              <span className="font-display text-6xl leading-none text-brand">
                {i + 1}
              </span>
              <h3 className="text-xl font-medium">{step.title}</h3>
              <p className="text-pretty text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
        <Link
          href="/tools/training-tracker#make-it-yours"
          className="mt-14 inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
        >
          Answer the four questions now
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Section>
    </DevFeedback>
  )
}

function LandingAudit() {
  return (
    <DevFeedback name="Landing.Audit">
      <Section
        id="built-for-the-audit"
        space="roomy"
        eyebrow="Built for the audit, not the demo"
        title="Ready for the day someone asks you to prove it"
        lede="Your people's records live in accounts you own. We never store them."
      >
        <dl className="grid max-w-4xl gap-x-16 gap-y-10 sm:grid-cols-2">
          {BUILT_IN.map(([name, text]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <dt className="font-display text-2xl leading-tight">{name}</dt>
              <dd className="text-pretty text-muted-foreground">{text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-14 max-w-2xl text-sm text-pretty text-muted-foreground">
          Who gets access, how long you keep records and what your policies
          require stay yours to decide. Real Good Site makes your rules easy to
          follow. It does not make you compliant on its own, and we will never
          claim it does.
        </p>
      </Section>
    </DevFeedback>
  )
}

function LandingFinalCta() {
  return (
    <DevFeedback name="Landing.FinalCta">
      <section className="bg-paper px-4 py-28 md:py-40">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
          <h2 className="font-display text-5xl leading-[1] tracking-tight text-balance md:text-6xl">
            The tool your team needs is{" "}
            <em className="text-brand">closer than you think.</em>
          </h2>
          <p className="text-lg text-pretty text-muted-foreground">
            Free to try with sample data. Pay once when it goes live.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Button size="lg" asChild>
              <Link href="/tools/training-tracker">
                Try the training tracker
              </Link>
            </Button>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
            >
              See pricing
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </DevFeedback>
  )
}

export default function IndexPage() {
  return (
    <div className="flex flex-1 flex-col">
      <LandingHero />
      <LandingShowcase />
      <LandingHowItWorks />
      <LandingAudit />
      <LandingFinalCta />
    </div>
  )
}
