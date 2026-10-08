"use client"

import * as React from "react"
import { Check, Copy, ExternalLink } from "lucide-react"

import { handoffLinks } from "@/lib/prompt-links"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import {
  EXAMPLES,
  type TrackExample,
} from "@/components/marketing/tracker-data"
import { ExamplePicker } from "@/components/marketing/training-tracker-demo"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Input } from "@/registry/new-york-v4/ui/input"

type Answers = {
  who: string
  what: string
  signsOff: string
  alsoHears: string
}

const QUESTIONS: { key: keyof Answers; label: string; hint: string }[] = [
  {
    key: "who",
    label: "Who are you tracking?",
    hint: "Roughly how many, in your own words.",
  },
  {
    key: "what",
    label: "What must they complete, and how often?",
    hint: "The training or certificate, and when it runs out.",
  },
  {
    key: "signsOff",
    label: "Who signs it off?",
    hint: "The role, not a name.",
  },
  {
    key: "alsoHears",
    label: "Who else hears when someone falls behind?",
    hint: "For example their line manager.",
  },
]

function answersFor(example: TrackExample): Answers {
  return {
    who: `About 18 ${example.people} at our ${example.where}`,
    what: `${example.training}, ${example.renewal}`,
    signsOff: example.approver,
    alsoHears: "Their line manager",
  }
}

function buildInstructions(a: Answers) {
  return `Build me a training tracker using the Real Good Site training tracker. Start from the finished tool; do not start from scratch.

About us
- Who we track: ${a.who}
- What they must complete: ${a.what}
- Who signs it off: ${a.signsOff}
- Who else hears: ${a.alsoHears}

Steps
1. Install the finished tool, then read every installed file before changing anything:
   npx shadcn@latest add https://realgood.site/r/training-tracker.json
2. Replace the sample people and training with ours. Keep the layout.
3. Connect sign-in and the database with the Real Good Site setup file. Do not write your own access rules.

Rules that must stay true
- Show the number of people before any message goes out.
- A sign-off needs a written reason.
- Every message, sign-off and failure adds one entry to the record, written by the server.
- Emails contain the person's first name and the training name, nothing else personal.

Before you say you are done, run these checks and show me the results
1. Messaging 7 people adds exactly one entry to the record.
2. A sign-off without a reason is refused.
3. Someone who is not a manager cannot send messages, even by calling the server directly.
4. Everything can be done with the keyboard alone.

If anything is unclear, ask me instead of guessing.`
}

export function MakeItYours() {
  const [exampleId, setExampleId] = React.useState<string | undefined>(
    EXAMPLES[0].id
  )
  const [answers, setAnswers] = React.useState<Answers>(() =>
    answersFor(EXAMPLES[0])
  )
  const { copyToClipboard, isCopied } = useCopyToClipboard()
  const formId = React.useId()

  const instructions = buildInstructions(answers)
  const links = handoffLinks(instructions)
  const lovable = links.find((l) => l.id === "lovable")
  const claude = links.find((l) => l.id === "claude-desktop")
  const others = links.filter(
    (l) => l.id !== "lovable" && l.id !== "claude-desktop" && l.href
  )

  function pick(example: TrackExample) {
    setExampleId(example.id)
    setAnswers(answersFor(example))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Start from an example, then change anything.
          </p>
          <div className="[&>div]:justify-start">
            <ExamplePicker
              activeId={exampleId}
              onPick={pick}
              label="Start from an example"
            />
          </div>
        </div>
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => e.preventDefault()}
        >
          {QUESTIONS.map((q, i) => (
            <div key={q.key} className="flex flex-col gap-1.5">
              <label
                htmlFor={`${formId}-${q.key}`}
                className="flex items-baseline gap-2 font-medium"
              >
                <span className="font-display text-xl text-brand">{i + 1}</span>
                {q.label}
              </label>
              <Input
                id={`${formId}-${q.key}`}
                value={answers[q.key]}
                aria-describedby={`${formId}-${q.key}-hint`}
                onChange={(e) => {
                  setExampleId(undefined)
                  setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                }}
              />
              <p
                id={`${formId}-${q.key}-hint`}
                className="text-xs text-muted-foreground"
              >
                {q.hint}
              </p>
            </div>
          ))}
        </form>
      </div>

      <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-foreground text-background">
        <div className="flex items-center justify-between gap-3 border-b border-background/15 px-5 py-3">
          <p className="text-sm font-medium">Instructions for your assistant</p>
          <p className="text-xs text-background/60">Updates as you type</p>
        </div>
        <pre className="max-h-[380px] flex-1 overflow-auto px-5 py-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-background/85">
          {instructions}
        </pre>
        <div className="flex flex-col gap-3 border-t border-background/15 p-5">
          <div className="flex flex-wrap gap-2">
            {lovable?.href ? (
              <Button
                asChild
                className="bg-background text-foreground hover:bg-background/90"
              >
                <a href={lovable.href} target="_blank" rel="noreferrer">
                  Open in Lovable
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            ) : null}
            {claude?.href ? (
              <Button
                asChild
                variant="outline"
                className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
              >
                <a href={claude.href}>Open in Claude</a>
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
              onClick={() => copyToClipboard(instructions)}
            >
              {isCopied ? (
                <Check aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
              {isCopied ? "Copied" : "Copy instructions"}
              <span className="sr-only" role="status">
                {isCopied ? "Instructions copied" : ""}
              </span>
            </Button>
          </div>
          <p className="text-xs text-background/60">
            Nothing is sent until you press send in your assistant. Also opens
            in{" "}
            {others.map((l, i) => (
              <React.Fragment key={l.id}>
                {i > 0 ? (i === others.length - 1 ? " and " : ", ") : null}
                <a
                  href={l.href ?? undefined}
                  className="underline underline-offset-2 hover:text-background"
                >
                  {l.label}
                </a>
              </React.Fragment>
            ))}
            .
          </p>
        </div>
      </div>
    </div>
  )
}
