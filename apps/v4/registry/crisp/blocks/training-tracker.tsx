"use client"

/**
 * Training tracker: who has done it, who needs a reminder, and the proof.
 *
 *   See      status-strip + data-table      who is up to date, and who to remind
 *   Decide   alert-rules (summary text)     who a reminder reaches, and what it says
 *   Act      confirm-send                   "Send to N people?", then the send
 *   Confirm  a sign-off with a reason       a manager marks someone up to date
 *   Record   audit-timeline                 every send, sign-off, refusal and failure
 *
 * Each step hands its result to the next: the selected rows set the count on
 * the send button, a send or a sign-off adds one entry to the record, and the
 * strip counts follow.
 *
 * THE SERVER IS A STAND-IN. With no `server` prop this uses
 * `createMemoryServer()` from `training-tracker-server.ts`: people, records and
 * audit log live in memory and no email is delivered. To go real, change one
 * place: pass `server={yourServer}`, an object with the three methods of
 * `TrainingTrackerServer` that call your API (your sign-in and your database),
 * and delete the demo file. Your server must check the user and role, write
 * the audit events and enforce quiet hours; this screen only shows and asks.
 * Hiding a button is not access control.
 *
 * Example data only. See /docs/components/training-tracker.
 */
import * as React from "react"
import { CircleAlert, CircleCheck, Clock, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { summarizeRule } from "@/registry/crisp/lib/alert-rules-lib"
import {
  buildReminderEmail,
  canManage,
  checkReminderSend,
  checkSignOff,
  countStatuses,
  daysUntil,
  describeSkipped,
  fullName,
  isCalendarDate,
  needsAttention,
  peopleCount,
  planReminder,
  ROLE_LABEL,
  statusLabel,
  todayIn,
  trainingStatus,
  type TrackerRow,
  type TrackerState,
  type TrackerUser,
  type TrainingTrackerServer,
} from "@/registry/crisp/lib/training-tracker-lib"
import {
  createDemoClock,
  createMemoryServer,
  DEMO_USERS,
} from "@/registry/crisp/lib/training-tracker-server"
import { AuditTimeline } from "@/registry/crisp/ui/audit-timeline"
import { ConfirmSend } from "@/registry/crisp/ui/confirm-send"
import {
  DataTable,
  type DataTableColumn,
  type DataTableView,
} from "@/registry/crisp/ui/data-table"
import { StatusStrip } from "@/registry/crisp/ui/status-strip"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Switch } from "@/registry/new-york-v4/ui/switch"

export interface TrainingTrackerProps extends React.ComponentProps<"div"> {
  /**
   * Your server. Omit it to use the in-memory demo server, which shows the
   * demo controls (view as, a failed send, the clock at 10pm).
   */
  server?: TrainingTrackerServer
  /** The signed-in person, from your session. Omit it in the demo to pick one. */
  currentUser?: TrackerUser
  /** The first state, if you already fetched it. Otherwise the screen loads it. */
  initialState?: TrackerState
  /**
   * IANA zone the record shows times in. Default: the tracker's own zone from
   * the server. The demo server also runs in it (default "Europe/London").
   */
  timeZone?: string
  /** BCP 47 locale for dates. Default "en-GB". */
  locale?: string
}

const message = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message.replace(/[.\s]+$/, "")
    : "Something went wrong"

const formatDate = (iso: string | undefined, locale: string) =>
  iso && isCalendarDate(iso)
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Unknown"

const formatMoment = (iso: string, locale: string, timeZone: string) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleString(locale, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone,
      })
}

// The status is an icon and words, so it still reads without colour.
function StatusCell({ row, today }: { row: TrackerRow; today: string }) {
  const status = trainingStatus(row.record, today)
  const label = statusLabel(row.record, today)
  if (status === "overdue") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        {label}
      </span>
    )
  }
  if (status === "due-soon") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-4 shrink-0" aria-hidden="true" />
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </span>
  )
}

/** One stage of the story: a heading, what it shows, and what it hands on. */
function Stage({
  stage,
  title,
  handsOn,
  children,
}: {
  stage: string
  title: string
  /** What this stage passes to the next one. */
  handsOn: string
  children: React.ReactNode
}) {
  const id = React.useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div>
        <h3 id={id} className="font-semibold">
          <span className="text-muted-foreground">{stage}.</span> {title}
        </h3>
        <p className="text-sm text-muted-foreground">{handsOn}</p>
      </div>
      {children}
    </section>
  )
}

const FIELD =
  "w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40"

/** The whole See, Decide, Act, Confirm, Record screen for a training list. */
function TrainingTracker({
  server,
  currentUser,
  initialState,
  timeZone,
  locale = "en-GB",
  className,
  ...props
}: TrainingTrackerProps) {
  // The demo server is always created (it is cheap) and used only when no
  // `server` is passed. Your own server replaces it here. It runs on a demo
  // clock that starts at 09:30 today, so the demo can send at any hour.
  const [demo] = React.useState(() => {
    const clock = createDemoClock(timeZone)
    return {
      clock,
      server: createMemoryServer({ now: () => clock.now(), timeZone }),
    }
  })
  const memory = demo.server
  const api: TrainingTrackerServer = server ?? memory
  const [state, setState] = React.useState<TrackerState | null>(
    () => initialState ?? (server ? null : memory.snapshot())
  )
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [viewerId, setViewerId] = React.useState(DEMO_USERS[0].id)
  const [failSend, setFailSend] = React.useState(false)
  const [evening, setEvening] = React.useState(false)
  const [direct, setDirect] = React.useState("")

  // With your own server the person must come from your session; the demo
  // people are only for the in-memory server.
  const user: TrackerUser | undefined =
    currentUser ??
    (server ? undefined : DEMO_USERS.find((u) => u.id === viewerId))

  const refresh = React.useCallback(async () => {
    try {
      setState(await api.load())
      setLoadError(null)
    } catch (error) {
      setLoadError(message(error))
    }
  }, [api])

  React.useEffect(() => {
    if (!state) void refresh()
    // Load once on mount when no first state was given.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Demo only: skip the screen and ask the server to remind everyone who needs
  // it, as the person viewed. The server checks again and records the answer.
  async function callServerDirectly() {
    if (!state || !user) return
    const today = todayIn(new Date(state.asOf), state.timeZone)
    const personIds = state.rows
      .filter((row) => needsAttention(row, today))
      .map((row) => row.person.id)
    setDirect("")
    try {
      const { sent } = await api.sendReminders({ userId: user.id, personIds })
      setDirect(`The server sent a reminder to ${peopleCount(sent)}.`)
    } catch (error) {
      setDirect(
        `The server refused: ${message(error)}. The refusal is in the record.`
      )
    } finally {
      await refresh()
    }
  }

  const isDemo = !server && !currentUser
  const zone = timeZone ?? state?.timeZone ?? "UTC"
  const demoTime = state
    ? new Date(state.asOf).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: state.timeZone,
      })
    : ""

  return (
    <div
      data-slot="training-tracker"
      className={cn("flex w-full flex-col gap-8", className)}
      {...props}
    >
      {!server && (
        <div
          role="group"
          aria-label="Demo controls"
          className="flex flex-col gap-3 rounded-lg border border-dashed p-3 text-sm"
        >
          <p className="text-muted-foreground">
            Demo controls. They are not part of the tracker, and the people are
            made up.
            {state && (
              <>
                {" "}
                The demo clock reads {demoTime} ({state.timeZone}).
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {isDemo && (
              <div
                role="group"
                aria-label="View as"
                className="flex flex-wrap items-center gap-2"
              >
                <span className="text-muted-foreground">View as</span>
                {DEMO_USERS.map((u) => (
                  <Button
                    key={u.id}
                    size="sm"
                    variant={viewerId === u.id ? "default" : "outline"}
                    aria-pressed={viewerId === u.id}
                    onClick={() => {
                      setViewerId(u.id)
                      setDirect("")
                    }}
                  >
                    {u.name}, {ROLE_LABEL[u.role]}
                  </Button>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-muted-foreground">
              <Switch
                checked={failSend}
                onCheckedChange={(next) => {
                  memory.failSend = next
                  setFailSend(next)
                }}
              />
              Make the next sends fail
            </label>
            <label className="flex items-center gap-2 text-muted-foreground">
              <Switch
                checked={evening}
                onCheckedChange={(next) => {
                  demo.clock.evening = next
                  setEvening(next)
                  void refresh()
                }}
              />
              Set the clock to 10pm
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={!state || !user}
              onClick={() => void callServerDirectly()}
            >
              Call the server directly
            </Button>
            <span className="text-muted-foreground">
              Asks the server to remind everyone who needs it, as{" "}
              {user?.name ?? "this person"}, without the screen&apos;s checks.
            </span>
          </div>
          <p role="status" className="font-medium">
            {direct}
          </p>
        </div>
      )}

      {loadError && (
        <p
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-destructive/50 px-3 py-2 text-sm"
        >
          <CircleAlert
            className="size-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <span>
            {state
              ? `Could not refresh: ${loadError}. What you see may be out of date.`
              : `Could not load the training list: ${loadError}.`}
          </span>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Try again
          </Button>
        </p>
      )}

      {state && user ? (
        <Tracker
          // A new viewer starts from a fresh screen, not someone else's messages.
          key={user.id}
          state={state}
          api={api}
          user={user}
          refresh={refresh}
          timeZone={zone}
          locale={locale}
          refreshFailed={loadError !== null}
          showAsOf={Boolean(server)}
        />
      ) : state ? (
        <p role="alert" className="text-sm text-destructive">
          Pass currentUser (id, name, role) from your session to use your own
          server.
        </p>
      ) : !loadError ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading the training list…
        </p>
      ) : null}
    </div>
  )
}

interface TrackerProps {
  state: TrackerState
  api: TrainingTrackerServer
  user: TrackerUser
  refresh: () => Promise<void>
  /** Where times in the record are shown. */
  timeZone: string
  locale: string
  refreshFailed: boolean
  /** Show "As of" on the table. Off for the demo, whose clock is not yours. */
  showAsOf: boolean
}

function Tracker({
  state,
  api,
  user,
  refresh,
  timeZone,
  locale,
  refreshFailed,
  showAsOf,
}: TrackerProps) {
  const { rows, requirement, rule, events } = state
  const at = new Date(state.asOf)
  const today = todayIn(at, state.timeZone)
  const manager = canManage(user.role)

  // Starts with everyone who needs a reminder, as the list opens on them.
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() =>
    rows.filter((row) => needsAttention(row, today)).map((r) => r.person.id)
  )
  const [sending, setSending] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)
  // Always mounted, so each result is announced when its text changes.
  const [sent, setSent] = React.useState("")
  const sentRef = React.useRef<HTMLParagraphElement>(null)

  // See -> Decide: the selected rows decide who a reminder reaches.
  const selected = rows.filter((row) => selectedIds.includes(row.person.id))
  const plan = planReminder(selected, today)
  const skippedText = describeSkipped(plan.skipped)
  const first = plan.recipients[0]
  const preview = first ? buildReminderEmail(first, requirement.name) : null

  // Decide -> Act: the role, the count and the clock open the send.
  const gate = checkReminderSend({
    role: user.role,
    count: plan.personIds.length,
    at,
    timeZone: state.timeZone,
  })

  const counts = countStatuses(rows, today)

  const views = React.useMemo<DataTableView<TrackerRow>[]>(
    () => [
      {
        key: "attention",
        label: "Needs attention",
        filter: (row) => needsAttention(row, today),
      },
      { key: "everyone", label: "Everyone", filter: () => true },
    ],
    [today]
  )

  const columns = React.useMemo<DataTableColumn<TrackerRow>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        rowHeader: true,
        sortValue: (row) => fullName(row.person),
        cell: (row) => (
          <span className="flex flex-col">
            <span>{fullName(row.person)}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {row.person.team}
            </span>
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        // Days left; a missing or unreadable date sorts first, as overdue.
        sortValue: (row) => {
          const days = row.record?.expiresOn
            ? daysUntil(row.record.expiresOn, today)
            : NaN
          return Number.isNaN(days) ? -Infinity : days
        },
        cell: (row) => <StatusCell row={row} today={today} />,
      },
      {
        key: "expires",
        header: "Runs out",
        sortValue: (row) => row.record?.expiresOn ?? "",
        cell: (row) => formatDate(row.record?.expiresOn, locale),
      },
      {
        key: "reminded",
        header: "Last reminder",
        sortValue: (row) => row.record?.remindedAt ?? "",
        cell: (row) =>
          row.record?.remindedAt ? (
            formatMoment(row.record.remindedAt, locale, timeZone)
          ) : (
            <span className="text-muted-foreground">Not yet</span>
          ),
      },
    ],
    [today, locale, timeZone]
  )

  // The send button goes quiet once the selection is cleared, so move focus to
  // the result rather than leaving it on nothing. Never steals focus the person
  // has already moved elsewhere.
  React.useEffect(() => {
    if (sent && document.activeElement === document.body) {
      sentRef.current?.focus()
    }
  }, [sent])

  async function sendReminders() {
    setSending(true)
    setSendError(null)
    setSent("")
    try {
      const result = await api.sendReminders({
        userId: user.id,
        personIds: plan.personIds,
      })
      setSelectedIds([])
      setSent(
        `Reminder sent to ${peopleCount(result.sent)}. One entry added to the record.`
      )
    } catch (error) {
      // The server has recorded the refusal or failure. Nothing was delivered,
      // and the same button tries again.
      setSendError(message(error))
    } finally {
      await refresh()
      setSending(false)
    }
  }

  return (
    <>
      <Stage
        stage="See"
        title="Who is up to date"
        handsOn="Selecting people hands them to Decide."
      >
        <StatusStrip
          headlineNoun="people up to date"
          segments={[
            {
              key: "up-to-date",
              label: "up to date",
              count: counts["up-to-date"],
              tone: "done",
            },
            {
              key: "due-soon",
              label: "due in 30 days",
              count: counts["due-soon"],
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
        <DataTable
          caption={`Everyone who must complete ${requirement.name}, and where they stand`}
          noun="person"
          nounPlural="people"
          rows={rows}
          columns={columns}
          views={views}
          defaultActiveView="attention"
          getRowId={(row) => row.person.id}
          rowLabel={(row) => fullName(row.person)}
          defaultSort={{ key: "status", direction: "asc" }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          asOf={showAsOf ? state.asOf : undefined}
          onRefresh={showAsOf ? () => void refresh() : undefined}
        />
      </Stage>

      <Stage
        stage="Decide"
        title="Who gets a reminder"
        handsOn="The people who can be reminded go to Act."
      >
        <div className="flex flex-col gap-2 text-sm">
          {plan.personIds.length === 0 ? (
            <p>No one chosen for a reminder yet. Select people above.</p>
          ) : (
            <p>
              <span className="font-medium">
                {peopleCount(plan.personIds.length)}
              </span>{" "}
              would get a reminder: one email each, so nobody sees who else got
              one.
            </p>
          )}
          {skippedText && (
            <p className="text-muted-foreground">{skippedText}</p>
          )}
          {preview && (
            <figure className="flex flex-col gap-1 rounded-md border bg-muted/40 p-3">
              <figcaption className="text-muted-foreground">
                What {first?.firstName || "they"} would get. Only the first name
                and the training name.
              </figcaption>
              <p className="font-medium">{preview.subject}</p>
              <p className="whitespace-pre-line">{preview.text}</p>
            </figure>
          )}
          <p>
            <span className="font-medium">{rule.label} rule.</span>{" "}
            {summarizeRule(rule, { includeTimeZone: true })}
          </p>
          <p className="text-muted-foreground">
            The reminder days and escalation are shown here, not run. The server
            refuses any send in quiet hours.
          </p>
        </div>
      </Stage>

      <Stage
        stage="Act"
        title="Send the reminder"
        handsOn="You see the count before anything goes. Each send adds one entry to Record."
      >
        <div className="flex flex-wrap items-center gap-3">
          <ConfirmSend
            count={plan.personIds.length}
            noun="person"
            nounPlural="people"
            label="Send reminder"
            blockedReason={gate.ok ? undefined : gate.reason}
            sending={sending}
            onSend={sendReminders}
          />
        </div>
        {/* ConfirmSend reads the reason to screen readers; this is the visible copy. */}
        {!gate.ok && !sending && (
          <p aria-hidden="true" className="text-sm text-muted-foreground">
            {gate.reason}.
          </p>
        )}
        {sendError && (
          <p
            role="alert"
            className="flex items-start gap-1.5 text-sm text-destructive"
          >
            <CircleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              The send did not go: {sendError}. Nothing was delivered, and this
              is in the record below.
            </span>
          </p>
        )}
        <p
          ref={sentRef}
          role="status"
          tabIndex={-1}
          className="flex items-center gap-1.5 text-sm font-medium outline-none"
        >
          {sent && <CircleCheck className="size-4" aria-hidden="true" />}
          {sent}
        </p>
      </Stage>

      <Stage
        stage="Confirm"
        title="Sign off who has done it"
        handsOn="A sign-off needs a written reason. It marks the person up to date and adds one entry to Record."
      >
        <SignOff
          key={user.id}
          state={state}
          api={api}
          user={user}
          today={today}
          manager={manager}
          refresh={refresh}
          locale={locale}
        />
      </Stage>

      <Stage
        stage="Record"
        title="Who did what"
        handsOn="The loop closes: the counts above already reflect it."
      >
        <AuditTimeline
          events={events}
          timeZone={timeZone}
          locale={locale}
          now={state.asOf}
          initialCount={6}
          headingLevel={4}
          emptyMessage="Nothing recorded yet. Each reminder, sign-off, refusal and failure will appear here."
          stale={
            refreshFailed
              ? "The last refresh failed, so newer activity may not be shown."
              : false
          }
        />
      </Stage>
    </>
  )
}

function SignOff({
  state,
  api,
  user,
  today,
  manager,
  refresh,
  locale,
}: {
  state: TrackerState
  api: TrainingTrackerServer
  user: TrackerUser
  today: string
  manager: boolean
  refresh: () => Promise<void>
  locale: string
}) {
  // Most overdue first: an unknown date, then the fewest days left, then by name.
  const daysLeft = (row: TrackerRow) => {
    const days = row.record?.expiresOn
      ? daysUntil(row.record.expiresOn, today)
      : NaN
    return Number.isNaN(days) ? -Infinity : days
  }
  const people = [...state.rows].sort(
    (a, b) =>
      daysLeft(a) - daysLeft(b) ||
      fullName(a.person).localeCompare(fullName(b.person))
  )
  const [personId, setPersonId] = React.useState(people[0]?.person.id ?? "")
  const [reason, setReason] = React.useState("")
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [failure, setFailure] = React.useState<string | null>(null)
  const [done, setDone] = React.useState("")
  const reasonRef = React.useRef<HTMLTextAreaElement>(null)
  // Stops a second submit while one is in flight (state updates are async).
  const inFlight = React.useRef(false)
  const ids = {
    person: React.useId(),
    reason: React.useId(),
    hint: React.useId(),
    error: React.useId(),
    blocked: React.useId(),
  }

  const row = state.rows.find((r) => r.person.id === personId)
  const name = row ? fullName(row.person) : "this person"

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || !row) return
    setFailure(null)
    setDone("")
    // The same check the server makes. Saves a round trip, and nothing more:
    // the server refuses a blank reason itself.
    const check = checkSignOff({ role: user.role, reason })
    if (!check.ok && check.code === "no-reason") {
      setFieldError(`${check.error}. A sign-off without one is refused`)
      reasonRef.current?.focus()
      return
    }
    inFlight.current = true
    setSubmitting(true)
    try {
      await api.signOff({ userId: user.id, personId, reason })
      setReason("")
      setFieldError(null)
      setDone(
        `${name} is signed off and up to date. One entry added to the record.`
      )
    } catch (error) {
      setFailure(message(error))
    } finally {
      await refresh()
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => void submit(e)}
      className="flex flex-col gap-4"
    >
      <fieldset disabled={!manager} className="flex flex-col gap-4">
        <legend className="sr-only">
          Sign someone off for {state.requirement.name}
        </legend>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.person} className="text-sm font-medium">
            Person
          </label>
          <select
            id={ids.person}
            value={personId}
            onChange={(e) => {
              setPersonId(e.target.value)
              setDone("")
            }}
            className={cn(FIELD, "h-9 sm:max-w-sm")}
          >
            {people.map((r) => (
              <option key={r.person.id} value={r.person.id}>
                {fullName(r.person)},{" "}
                {statusLabel(r.record, today).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.reason} className="text-sm font-medium">
            Reason (required)
          </label>
          <textarea
            ref={reasonRef}
            id={ids.reason}
            value={reason}
            rows={2}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={
              fieldError ? `${ids.error} ${ids.hint}` : ids.hint
            }
            onChange={(e) => {
              setReason(e.target.value)
              if (fieldError && e.target.value.trim()) setFieldError(null)
            }}
            className={cn(FIELD, "min-h-16 py-2")}
          />
          <p id={ids.hint} className="text-sm text-muted-foreground">
            Say what you checked, for example &ldquo;Certificate seen and
            attached&rdquo;. It goes in the record.
          </p>
          {fieldError && (
            <p id={ids.error} className="text-sm text-destructive">
              {fieldError}.
            </p>
          )}
        </div>
      </fieldset>
      <div className="flex flex-col items-start gap-2">
        <Button
          type="submit"
          // Not disabled while it runs, so focus stays here; inFlight stops a repeat.
          disabled={!manager || !row}
          aria-disabled={submitting || undefined}
          aria-describedby={manager ? undefined : ids.blocked}
        >
          {submitting ? "Signing off…" : `Sign off ${name}`}
        </Button>
        {!manager && (
          <p id={ids.blocked} className="text-sm text-muted-foreground">
            Only a manager or an admin can sign someone off. You are viewing as{" "}
            {user.name}, {ROLE_LABEL[user.role]}.
          </p>
        )}
        {row?.record?.signedOffAt && (
          <p className="text-sm text-muted-foreground">
            Last signed off by {row.record.signedOffBy ?? "someone"} on{" "}
            {formatDate(row.record.completedOn, locale)}.
          </p>
        )}
        {failure && (
          <p role="alert" className="text-sm text-destructive">
            The sign-off did not go through: {failure}. This is in the record
            below.
          </p>
        )}
        <p role="status" className="text-sm font-medium">
          {done}
        </p>
      </div>
    </form>
  )
}

export { TrainingTracker }
