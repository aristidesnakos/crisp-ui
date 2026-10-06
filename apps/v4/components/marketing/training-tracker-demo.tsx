"use client"

import * as React from "react"
import { cn } from "cn"
import { BellRing, CircleAlert, CircleCheck, Clock, Lock } from "lucide-react"

import {
  DEMO_NOW,
  EXAMPLES,
  historyFor,
  needsAttention,
  ORG,
  ROSTER,
  statusText,
  type TrackedPerson,
  type TrackExample,
} from "@/components/marketing/tracker-data"
import type { AuditEvent } from "@/registry/crisp/lib/audit-event"
import { AuditTimeline } from "@/registry/crisp/ui/audit-timeline"
import { ConfirmSend } from "@/registry/crisp/ui/confirm-send"
import { StatusStrip } from "@/registry/crisp/ui/status-strip"
import { Checkbox } from "@/registry/new-york-v4/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/new-york-v4/ui/table"

const MINUTE = 60 * 1000
const FIRST = EXAMPLES[0]

/** Starting points: what is tracked, and one kind of place that tracks it. */
export function ExamplePicker({
  activeId,
  onPick,
  label = "Examples",
}: {
  activeId?: string
  onPick: (example: TrackExample) => void
  label?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap justify-center gap-2"
    >
      {EXAMPLES.map((example) => (
        <button
          key={example.id}
          type="button"
          aria-pressed={activeId === example.id}
          onClick={() => onPick(example)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            activeId === example.id
              ? "border-foreground bg-foreground text-background"
              : "bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          )}
        >
          {example.training}
          <span
            className={cn(
              "ml-1.5",
              activeId === example.id
                ? "text-background/70"
                : "text-muted-foreground/90"
            )}
          >
            · {example.where}
          </span>
        </button>
      ))}
    </div>
  )
}

/** An inline, fill-in-the-blank input that grows with its text. */
function WordInput({
  label,
  value,
  placeholder,
  maxLength,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  maxLength: number
  onChange: (value: string) => void
}) {
  const id = React.useId()
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        spellCheck={false}
        autoComplete="off"
        size={Math.max(value.length, placeholder.length, 3)}
        onChange={(e) => onChange(e.target.value)}
        className="[field-sizing:content] max-w-full min-w-[3ch] border-b-2 border-dashed border-brand/50 bg-transparent px-1 text-center text-brand italic outline-none placeholder:text-muted-foreground/50 hover:border-brand focus:border-solid focus:border-brand"
      />
    </>
  )
}

function Moment({
  n,
  label,
  children,
  className,
}: {
  n: number | string
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="text-[11px] font-medium tracking-[0.14em] text-brand uppercase">
        {n} · {label}
      </p>
      {children}
    </div>
  )
}

function StatusCell({ person }: { person: TrackedPerson }) {
  const Icon =
    person.status === "overdue"
      ? CircleAlert
      : person.status === "due"
        ? Clock
        : CircleCheck
  return (
    <span
      className={cn(
        "inline-flex items-start gap-1.5 text-sm sm:items-center sm:whitespace-nowrap",
        person.status === "overdue" && "font-medium text-destructive",
        person.status === "due" && "text-foreground",
        person.status === "current" && "text-muted-foreground"
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden="true" />
      {statusText(person)}
    </span>
  )
}

/**
 * The Real Good Site training tracker, live, on made-up people. The visitor
 * types what they track and who they track, and the whole screen speaks their
 * words. Built from the open building blocks (status strip, confirm send,
 * audit timeline). Nothing is sent or saved; the record is local state.
 */
export function TrainingTrackerDemo({ className }: { className?: string }) {
  const [training, setTraining] = React.useState(FIRST.training)
  const [people, setPeople] = React.useState(FIRST.people)
  const [where, setWhere] = React.useState(FIRST.where)
  const what = training.trim() || "Your training"
  const who = people.trim() || "people"
  const activeId = EXAMPLES.find(
    (e) => e.training === training && e.people === people
  )?.id

  const attention = needsAttention(ROSTER)
  const [view, setView] = React.useState<"attention" | "everyone">("attention")
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(needsAttention(ROSTER).map((p) => p.id))
  )
  const [sent, setSent] = React.useState<AuditEvent[]>([])
  const [sending, setSending] = React.useState(false)
  const [sentCount, setSentCount] = React.useState<number | null>(null)
  const [reminded, setReminded] = React.useState<Set<string>>(new Set())

  function pick(example: TrackExample) {
    setTraining(example.training)
    setPeople(example.people)
    setWhere(example.where)
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSentCount(null)
  }

  function toggleAll() {
    const all = selected.size === attention.length
    setSelected(all ? new Set() : new Set(attention.map((p) => p.id)))
    setSentCount(null)
  }

  async function send() {
    const n = selected.size
    const recipients = new Set(selected)
    setSending(true)
    await new Promise((resolve) => setTimeout(resolve, 900))
    const count = sent.length + 1
    const event: AuditEvent = {
      id: `send-${count}`,
      at: new Date(DEMO_NOW.getTime() + count * 2 * MINUTE).toISOString(),
      actor: ORG.sender,
      action: "sent a reminder to",
      target: `${n} ${n === 1 ? "person" : who}`,
      outcome: "succeeded",
      detail: `${what}. First name and what is due, nothing else.`,
    }
    setSent((prev) => [event, ...prev])
    setReminded((prev) => new Set([...prev, ...recipients]))
    setSentCount(n)
    setSending(false)
  }

  const counts = {
    current: ROSTER.filter((p) => p.status === "current").length,
    due: ROSTER.filter((p) => p.status === "due").length,
    overdue: ROSTER.filter((p) => p.status === "overdue").length,
  }
  const rows = view === "attention" ? attention : ROSTER
  const allSelected = selected.size === attention.length
  const someSelected = selected.size > 0 && !allSelected
  const events = [...sent, ...historyFor(what, who)]

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <div className="flex w-full flex-col items-center gap-4">
        <p className="text-[11px] font-medium tracking-[0.14em] text-brand uppercase">
          Try it with your own words
        </p>
        <div className="flex max-w-full flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-center font-display text-3xl leading-tight md:text-4xl">
          <span>Track</span>
          <WordInput
            label="What you track"
            value={training}
            placeholder="what"
            maxLength={48}
            onChange={setTraining}
          />
          <span>for</span>
          <WordInput
            label="Who you track"
            value={people}
            placeholder="who"
            maxLength={24}
            onChange={setPeople}
          />
        </div>
        <ExamplePicker
          activeId={activeId}
          onPick={pick}
          label="Or start from one of these"
        />
      </div>

      <div className="w-full overflow-hidden rounded-2xl border bg-card text-left text-card-foreground shadow-[0_30px_80px_-40px_rgb(0_0_0/0.45)]">
        <div className="flex items-center gap-3 border-b bg-muted/50 px-4 py-2.5">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-muted-foreground/25" />
            <span className="size-2.5 rounded-full bg-muted-foreground/25" />
            <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          </div>
          <div className="mx-auto flex min-w-0 items-center gap-1.5 rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
            <Lock className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{ORG.host}</span>
          </div>
          <div className="w-[42px]" aria-hidden="true" />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 border-b px-5 py-4 md:px-6">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Your {where}</p>
            <p className="font-medium break-words">{what}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Signed in as{" "}
            <span className="text-foreground">{ORG.sender.name}</span>,{" "}
            {ORG.sender.role}
          </p>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-7 p-5 md:p-6">
            <Moment n={1} label="See">
              <StatusStrip
                headlineNoun={`${who} up to date`}
                segments={[
                  {
                    key: "current",
                    label: "up to date",
                    count: counts.current,
                    tone: "done",
                  },
                  {
                    key: "due",
                    label: "due in 30 days",
                    count: counts.due,
                    tone: "active",
                  },
                  {
                    key: "overdue",
                    label: "overdue",
                    count: counts.overdue,
                    tone: "pending",
                  },
                ]}
              />
            </Moment>

            <div className="flex flex-col gap-3">
              <div
                role="group"
                aria-label="Which people to list"
                className="flex gap-1"
              >
                {(
                  [
                    ["attention", "Needs attention", attention.length],
                    ["everyone", "Everyone", ROSTER.length],
                  ] as const
                ).map(([id, label, n]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    onClick={() => setView(id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      view === id
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {n}
                    </span>
                  </button>
                ))}
              </div>
              <div className="max-h-[316px] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          aria-label="Select everyone who needs a reminder"
                          checked={
                            allSelected
                              ? true
                              : someSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        <span className="sr-only">Reminded</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((person) => {
                      const selectable = person.status !== "current"
                      return (
                        <TableRow
                          key={person.id}
                          data-state={
                            selected.has(person.id) ? "selected" : undefined
                          }
                        >
                          <TableCell>
                            {selectable ? (
                              <Checkbox
                                aria-label={`Select ${person.name}`}
                                checked={selected.has(person.id)}
                                onCheckedChange={() => toggle(person.id)}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            <div className="flex flex-col">
                              <span className="font-medium">{person.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {person.team}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            <StatusCell person={person} />
                          </TableCell>
                          <TableCell className="hidden text-right sm:table-cell">
                            {reminded.has(person.id) ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                <BellRing
                                  className="size-3"
                                  aria-hidden="true"
                                />
                                Reminded today
                              </span>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Moment n={2} label="Decide">
              <p className="flex gap-2.5 text-sm">
                <BellRing
                  className="mt-0.5 size-4 shrink-0 text-brand"
                  aria-hidden="true"
                />
                <span>
                  Reminders go 30 and 7 days before it is due, then weekly.
                  After two, {ORG.cc} is copied. Never between 9pm and 8am.
                </span>
              </p>
            </Moment>

            <Moment n="3–4" label="Act, then confirm">
              <div className="flex flex-wrap items-center gap-3">
                <ConfirmSend
                  count={selected.size}
                  noun="person"
                  nounPlural={who}
                  label="Send reminder"
                  emptyReason="Select who to remind first"
                  sending={sending}
                  sentCount={sentCount}
                  onSend={send}
                />
              </div>
            </Moment>
          </div>

          <aside
            aria-label="Record"
            className="min-w-0 border-t bg-muted/25 p-5 md:p-6 lg:border-t-0 lg:border-l"
          >
            <Moment n={5} label="Record">
              <AuditTimeline
                events={events}
                timeZone="UTC"
                locale="en-GB"
                now={
                  new Date(DEMO_NOW.getTime() + (sent.length + 1) * 2 * MINUTE)
                }
                initialCount={5}
                headingLevel={4}
              />
            </Moment>
          </aside>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Made-up people. Type what you track, pick who to remind, and send.
        Nothing is sent or saved.
      </p>
    </div>
  )
}
