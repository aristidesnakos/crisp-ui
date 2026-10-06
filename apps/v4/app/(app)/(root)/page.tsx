import { type Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check, X } from "lucide-react"

import { siteConfig } from "@/lib/config"
import { TOOLS, TRACKER_MOMENTS } from "@/lib/tools"
import { DevFeedback } from "@/components/dev/dev-feedback"
import { Moments, ToolCard } from "@/components/marketing/moments"
import { Eyebrow, Section } from "@/components/marketing/section"
import { TrainingTrackerDemo } from "@/components/marketing/training-tracker-demo"
import { Button } from "@/registry/new-york-v4/ui/button"

const title = "You know the job. Now you can build the tool."
const metadataTitle = `${siteConfig.name} - ${title}`
const description = siteConfig.description

export const dynamic = "force-static"
export const revalidate = false

export const metadata: Metadata = {
  title: { absolute: metadataTitle },
  description,
  alternates: { canonical: "/" },
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

const OLD_WAYS = [
  {
    name: "A spreadsheet",
    text: "Free and familiar. It never reminds anyone, and it can't show who changed what.",
  },
  {
    name: "Off-the-shelf software",
    text: "Built around someone else's process, priced per seat, and slow to buy.",
  },
  {
    name: "A developer",
    text: "Exactly what you want, if you have the budget and a few spare months.",
  },
]

const STEPS = [
  {
    title: "Try it with sample data",
    text: "Click through the real tool before you sign up for anything. Switch between a school, a building site and a training provider.",
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
  ["The count before every send", "Nobody emails the whole school by accident."],
  ["A reason on every sign-off", "Decisions still explain themselves months later."],
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

const PLANS = [
  {
    name: "Free",
    price: "€0",
    text: "Every tool with sample data, and instructions for your AI assistant.",
  },
  {
    name: "Pro",
    price: "€149",
    text: "One tool, live: sign-in, your own database, reminders and the record. One-time.",
  },
  {
    name: "Done for you",
    price: "from €900",
    text: "We set it up with your people and your email, and hand it over working.",
  },
]

export default function IndexPage() {
  return (
    <div className="flex flex-1 flex-col">
      <DevFeedback name="Landing.Hero">
        <section className="px-4">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-7 pt-20 pb-12 text-center md:pt-28">
            <Eyebrow>For schools, building sites and training teams</Eyebrow>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-balance sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              You know the job.{" "}
              <em className="text-brand">Now you can build the tool.</em>
            </h1>
            <p className="max-w-2xl text-lg text-pretty text-muted-foreground md:text-xl">
              Start from a finished training tracker. Describe your team in
              plain words and your AI assistant makes it yours. Reminders,
              sign-offs and the record an inspector asks for come built in.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/tools/training-tracker">
                  Try the training tracker
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>
            <ul className="flex list-none flex-wrap justify-center gap-x-6 gap-y-2 p-0 text-sm text-muted-foreground">
              {[
                "Free to try with sample data",
                "Your records stay in your own account",
                "Works with Lovable, Claude and Cursor",
              ].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-brand" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </DevFeedback>

      <DevFeedback name="Landing.Demo">
        <section aria-label="The training tracker, live" className="px-4 pb-24">
          <div className="mx-auto max-w-6xl">
            <TrainingTrackerDemo />
          </div>
        </section>
      </DevFeedback>

      <DevFeedback name="Landing.WhyNow">
        <Section
          id="why-now"
          tone="paper"
          eyebrow="Why now"
          title="Until now, there were three ways to get this tool. None of them fit."
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {OLD_WAYS.map((way) => (
              <div
                key={way.name}
                className="flex flex-col gap-3 rounded-2xl border bg-background/60 p-6"
              >
                <X
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-medium">{way.name}</h3>
                <p className="text-sm text-pretty text-muted-foreground">
                  {way.text}
                </p>
              </div>
            ))}
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-brand bg-background p-6">
              <Check className="size-5 text-brand" aria-hidden="true" />
              <h3 className="text-lg font-medium">
                Now: a finished tool you shape in plain words
              </h3>
              <p className="text-sm text-pretty text-muted-foreground">
                AI assistants can write software for anyone. We hand yours a
                tested starting point, so you get a working tool, not an
                experiment.
              </p>
            </div>
          </div>
        </Section>
      </DevFeedback>

      <DevFeedback name="Landing.HowItWorks">
        <Section
          id="how-it-works"
          eyebrow="How it works"
          title="From sample to yours in three steps"
        >
          <ol className="grid list-none gap-10 p-0 md:grid-cols-3">
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
            className="mt-12 inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
          >
            Answer the four questions now
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Section>
      </DevFeedback>

      <DevFeedback name="Landing.Moments">
        <Section
          id="moments"
          tone="paper"
          eyebrow="Inside every tool"
          title="Five moments, in the order careful teams already work"
          lede="See what is happening, decide who hears, act safely, confirm it worked, and keep the record. Every Real Good Site tool follows the same path, so the next one already feels familiar."
        >
          <Moments items={TRACKER_MOMENTS} />
        </Section>
      </DevFeedback>

      <DevFeedback name="Landing.Audit">
        <Section
          id="built-for-the-audit"
          eyebrow="Built for the audit, not the demo"
          title="Ready for the day someone asks you to prove it"
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <ul className="grid list-none gap-x-8 gap-y-6 p-0 sm:grid-cols-2">
              {BUILT_IN.map(([name, text]) => (
                <li key={name} className="flex gap-3">
                  <Check
                    className="mt-1 size-4 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-1">
                    <h3 className="font-medium">{name}</h3>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-6">
              <h3 className="font-display text-2xl">Still yours to decide</h3>
              <p className="text-sm text-pretty text-muted-foreground">
                Who gets access, how long you keep records, and what your
                policies require. Real Good Site makes your rules easy to follow.
                It does not make you compliant on its own, and we will never
                claim it does.
              </p>
              <p className="text-sm text-pretty text-muted-foreground">
                Your people&apos;s records live in accounts you own. We never
                store them.
              </p>
            </div>
          </div>
        </Section>
      </DevFeedback>

      <DevFeedback name="Landing.Tools">
        <Section
          id="tools"
          tone="paper"
          eyebrow="Tools"
          title="Start with the tracker. More tools are on the way."
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
          <Link
            href="/tools"
            className="mt-8 inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
          >
            All tools
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Section>
      </DevFeedback>

      <DevFeedback name="Landing.Agents">
        <Section id="for-ai-assistants">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <Eyebrow>For AI assistants</Eyebrow>
              <h2
                id="for-ai-assistants-title"
                className="font-display text-4xl leading-[1.05] tracking-tight text-balance md:text-5xl"
              >
                Your assistant gets instructions, not guesses
              </h2>
              <p className="text-lg text-pretty text-muted-foreground">
                Every tool ships with step-by-step instructions written for AI
                assistants, plus checks it must run and show you before it
                calls the job done. Developers and assistants can read every
                page as plain text.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
                <Link href="/docs/ai" className="underline underline-offset-4">
                  How assistants use it
                </Link>
                <Link
                  href="/docs/components"
                  className="underline underline-offset-4"
                >
                  Building blocks
                </Link>
                <a href="/llms.txt" className="underline underline-offset-4">
                  llms.txt
                </a>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-foreground text-background">
              <p className="border-b border-background/15 px-5 py-3 text-sm font-medium">
                From the training tracker&apos;s instructions
              </p>
              <pre className="overflow-auto px-5 py-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-background/85">
                {`Before you say you are done, run these
checks and show me the results
1. Reminding 7 people adds exactly one
   entry to the record.
2. A sign-off without a reason is refused.
3. Someone who is not a manager cannot send
   reminders, even by calling the server.
4. Everything works with the keyboard alone.

If anything is unclear, ask me instead
of guessing.`}
              </pre>
            </div>
          </div>
        </Section>
      </DevFeedback>

      <DevFeedback name="Landing.Pricing">
        <Section
          id="pricing"
          tone="paper"
          eyebrow="Pricing"
          title="Try free. Pay when it's real."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="flex flex-col gap-2 rounded-2xl border bg-background p-6"
              >
                <h3 className="font-medium">{plan.name}</h3>
                <p className="font-display text-4xl">{plan.price}</p>
                <p className="text-sm text-pretty text-muted-foreground">
                  {plan.text}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/pricing"
            className="mt-8 inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
          >
            Compare plans
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Section>
      </DevFeedback>

      <DevFeedback name="Landing.FinalCta">
        <section className="px-4 py-24 md:py-32">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-7 text-center">
            <h2 className="font-display text-5xl leading-[1] tracking-tight text-balance md:text-6xl">
              The tool your team needs is{" "}
              <em className="text-brand">closer than you think.</em>
            </h2>
            <Button size="lg" asChild>
              <Link href="/tools/training-tracker">
                Try the training tracker
              </Link>
            </Button>
          </div>
        </section>
      </DevFeedback>
    </div>
  )
}
