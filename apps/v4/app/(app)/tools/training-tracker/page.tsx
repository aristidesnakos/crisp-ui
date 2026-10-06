import { type Metadata } from "next"
import Link from "next/link"
import { Check, ChevronRight } from "lucide-react"

import { TRACKER_MOMENTS } from "@/lib/tools"
import { DevFeedback } from "@/components/dev/dev-feedback"
import { MakeItYours } from "@/components/marketing/make-it-yours"
import { Moments } from "@/components/marketing/moments"
import { Eyebrow, Section } from "@/components/marketing/section"
import { TrainingTrackerDemo } from "@/components/marketing/training-tracker-demo"
import { Button } from "@/registry/new-york-v4/ui/button"

export const metadata: Metadata = {
  title: "Training tracker",
  description:
    "Know who's trained, chase who isn't, and prove it later. A finished training tracker for schools, building sites and training providers.",
}

const FREE = [
  "The whole tool with sample data",
  "Instructions for your AI assistant",
  "The open building blocks it is made from",
]

const PRO = [
  "Sign-in with roles: staff, managers, admins",
  "Your own database, with access rules we have tested",
  "A record that writes itself and cannot be edited",
  "Automatic email reminders with quiet hours",
  "Certificate uploads and spreadsheet import",
  "One-click setup in accounts you own",
  "12 months of updates",
]

const BLOCKS = [
  ["Status strip", "/docs/components/status-strip"],
  ["Data table", "/docs/components/data-table"],
  ["Alert rules", "/docs/components/alert-rules"],
  ["Approval step", "/docs/components/approval-step"],
  ["Confirm send", "/docs/components/confirm-send"],
  ["Audit timeline", "/docs/components/audit-timeline"],
] as const

export default function TrainingTrackerPage() {
  return (
    <div className="flex flex-1 flex-col">
      <DevFeedback name="Tool.TrainingTracker.Hero">
        <header className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-14 pb-12 md:px-6 md:pt-20">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-sm text-muted-foreground"
          >
            <Link href="/tools" className="hover:text-foreground">
              Tools
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span aria-current="page" className="text-foreground">
              Training tracker
            </span>
          </nav>
          <Eyebrow>Schools · Construction · Training providers</Eyebrow>
          <h1 className="font-display text-6xl leading-[0.95] tracking-tight md:text-8xl">
            Training tracker
          </h1>
          <p className="max-w-2xl text-xl text-pretty text-muted-foreground">
            Know who&apos;s trained, chase who isn&apos;t, and prove it later.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="#make-it-yours">Make it yours</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/pricing">Go live with Pro</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Free with sample data · Pro is €149, once
            </p>
          </div>
        </header>
      </DevFeedback>

      <DevFeedback name="Tool.TrainingTracker.Demo">
        <section aria-label="The training tracker, live" className="px-4 pb-20">
          <div className="mx-auto max-w-6xl">
            <TrainingTrackerDemo />
          </div>
        </section>
      </DevFeedback>

      <DevFeedback name="Tool.TrainingTracker.MakeItYours">
        <Section
          id="make-it-yours"
          tone="paper"
          eyebrow="Make it yours"
          title="Four questions, then hand it to your AI assistant"
          lede="Your answers become instructions your assistant follows, including the checks it must pass before it calls the job done. No code to write."
        >
          <MakeItYours />
        </Section>
      </DevFeedback>

      <DevFeedback name="Tool.TrainingTracker.Moments">
        <Section
          id="moments"
          eyebrow="What it does"
          title="Five moments, from “who's behind?” to “here's the proof”"
        >
          <Moments items={TRACKER_MOMENTS} />
        </Section>
      </DevFeedback>

      <DevFeedback name="Tool.TrainingTracker.Plans">
        <Section
          id="plans"
          tone="paper"
          eyebrow="Free and Pro"
          title="Try everything free. Pay once to go live."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-5 rounded-2xl border bg-background p-6 md:p-8">
              <div>
                <h3 className="font-medium">Free</h3>
                <p className="font-display text-5xl">€0</p>
              </div>
              <ul className="flex list-none flex-col gap-2.5 p-0 text-sm">
                {FREE.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-5 rounded-2xl border-2 border-brand bg-background p-6 md:p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">Pro</h3>
                  <p className="font-display text-5xl">
                    €149{" "}
                    <span className="font-sans text-base text-muted-foreground">
                      once
                    </span>
                  </p>
                </div>
                <Button asChild>
                  <Link href="/pricing">Go live</Link>
                </Button>
              </div>
              <ul className="flex list-none flex-col gap-2.5 p-0 text-sm">
                {PRO.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-brand"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      </DevFeedback>

      <DevFeedback name="Tool.TrainingTracker.Yours">
        <Section
          id="what-stays-yours"
          eyebrow="Honest limits"
          title="What stays yours"
        >
          <div className="grid gap-8 md:grid-cols-3">
            {[
              [
                "Your rules",
                "Who gets access, how long you keep records, and what your policies require. The tracker makes them easy to follow; it does not make you compliant on its own.",
              ],
              [
                "Your data",
                "Your people's records live in accounts you own. We never store or see them.",
              ],
              [
                "Your final check",
                "Your assistant runs the checks and shows you the results. Read them before you invite your team.",
              ],
            ].map(([name, text]) => (
              <div key={name} className="flex flex-col gap-2">
                <h3 className="font-display text-2xl">{name}</h3>
                <p className="text-pretty text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </Section>
      </DevFeedback>

      <DevFeedback name="Tool.TrainingTracker.BuiltFrom">
        <section className="border-t px-4 py-12">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-medium">For developers</h2>
              <p className="text-sm text-muted-foreground">
                Built from open building blocks you can install on their own.
              </p>
            </div>
            <ul className="flex list-none flex-wrap gap-2 p-0">
              {BLOCKS.map(([name, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex rounded-full border px-3 py-1 text-sm hover:bg-muted"
                  >
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </DevFeedback>
    </div>
  )
}
