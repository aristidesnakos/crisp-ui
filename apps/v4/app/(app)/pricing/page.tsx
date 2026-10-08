import { type Metadata } from "next"
import Link from "next/link"
import { cn } from "cn"
import { Check } from "lucide-react"

import { DevFeedback } from "@/components/dev/dev-feedback"
import { Eyebrow, Section } from "@/components/marketing/section"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/registry/new-york-v4/ui/accordion"
import { Button } from "@/registry/new-york-v4/ui/button"

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Try every tool free with sample data. Pay once to take a tool live in your own account, or have us set it up for you.",
}

const PLANS = [
  {
    name: "Free",
    price: "€0",
    note: "forever",
    blurb: "See every tool working and build with the open parts.",
    cta: { label: "Try the tracker", href: "/tools/training-tracker" },
    features: [
      "Every tool with sample data",
      "Instructions for your AI assistant",
      "All building blocks, open source (MIT)",
      "The calibration recall desk, complete",
    ],
  },
  {
    name: "Pro",
    price: "€149",
    note: "once, per tool",
    blurb: "Take one tool live in accounts you own.",
    cta: { label: "Go live", href: "/tools/training-tracker#plans" },
    featured: true,
    features: [
      "Sign-in with roles: staff, managers, admins",
      "Your own database, with access rules we have tested",
      "A record that writes itself and cannot be edited",
      "Automatic email reminders with quiet hours",
      "Certificate uploads and spreadsheet import",
      "One-click setup",
      "12 months of updates",
    ],
  },
  {
    name: "Done for you",
    price: "€900",
    note: "from, once",
    blurb: "We set it up and hand it over working.",
    cta: { label: "Chat with us", href: "https://cal.com/ari-nakos/chat" },
    features: [
      "Everything in Pro",
      "Your people and training loaded from your spreadsheet",
      "Email sent from your own address",
      "A walkthrough with your team",
      "30 days of help after launch",
    ],
  },
]

const COSTS = [
  ["While you try", "Free. The database pauses after a week without use."],
  ["Database, once live", "About $25 a month (Supabase Pro), paid to them."],
  ["Hosting", "Your host's plan. In Lovable, your Lovable plan covers it."],
  ["Email", "Free for small volumes with most email services."],
]

const FAQ = [
  [
    "Do I need to know how to code?",
    "No. You answer four questions and hand the result to an AI assistant such as Lovable or Claude. The instructions tell it to ask you rather than guess. Pro setup is one click.",
  ],
  [
    "Where do our records live?",
    "In accounts you own: your own database and your own hosting. Real Good Site never stores or sees your people's records.",
  ],
  [
    "Does this make us compliant?",
    "No tool can do that on its own. Real Good Site makes the careful way the easy way: a count before every send, a reason on every sign-off, and a record that writes itself. Access, retention and policy stay your decisions.",
  ],
  [
    "What is open source?",
    "Every building block, under the MIT licence, on GitHub. The finished Pro tools, their setup and their updates are what you pay for.",
  ],
  [
    "Can I set it up for my clients?",
    "Yes. Buy Pro once per client, or ask us about terms for agencies.",
  ],
]

export default function PricingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <DevFeedback name="Pricing.Hero">
        <header className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-4 pt-20 pb-14 text-center md:px-6 md:pt-24">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="font-display text-5xl leading-[0.98] tracking-tight text-balance md:text-7xl">
            Try free. Pay when it&apos;s real.
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            No subscription to us. Pay once per tool, and run it in accounts you
            own.
          </p>
        </header>
      </DevFeedback>

      <DevFeedback name="Pricing.Plans">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 md:px-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col gap-6 rounded-2xl border bg-card p-6 text-card-foreground md:p-8",
                plan.featured && "border-2 border-brand lg:-my-3 lg:py-11"
              )}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{plan.name}</h2>
                  {plan.featured ? (
                    <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-background">
                      Most teams
                    </span>
                  ) : null}
                </div>
                <p className="font-display text-6xl">
                  {plan.price}{" "}
                  <span className="font-sans text-sm text-muted-foreground">
                    {plan.note}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">{plan.blurb}</p>
              </div>
              <Button
                asChild
                size="lg"
                variant={plan.featured ? "default" : "outline"}
              >
                {plan.cta.href.startsWith("http") ? (
                  <a href={plan.cta.href} target="_blank" rel="noreferrer">
                    {plan.cta.label}
                  </a>
                ) : (
                  <Link href={plan.cta.href}>{plan.cta.label}</Link>
                )}
              </Button>
              <ul className="flex list-none flex-col gap-2.5 p-0 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        plan.featured ? "text-brand" : "text-muted-foreground"
                      )}
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DevFeedback>

      <DevFeedback name="Pricing.RunningCosts">
        <Section
          id="running-costs"
          eyebrow="No surprises"
          title="What it costs to run"
          lede="Your tool runs in accounts you own, so you pay those services directly, not us. Estimates; check each provider's current prices."
        >
          <dl className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {COSTS.map(([term, detail]) => (
              <div key={term} className="flex flex-col gap-1 bg-background p-6">
                <dt className="font-medium">{term}</dt>
                <dd className="text-sm text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </DevFeedback>

      <DevFeedback name="Pricing.Faq">
        <Section
          id="faq"
          tone="paper"
          eyebrow="Questions"
          title="Fair questions"
        >
          <Accordion type="single" collapsible className="max-w-3xl">
            {FAQ.map(([q, a]) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger className="text-base">{q}</AccordionTrigger>
                <AccordionContent className="text-pretty text-muted-foreground">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>
      </DevFeedback>
    </div>
  )
}
