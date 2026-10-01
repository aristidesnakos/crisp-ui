"use client"

/**
 * Calibration desk: the whole story on one screen.
 *
 *   See      status-strip + data-table      what is due, and which rows to act on
 *   Decide   alert-rules (summary text)     what would go out, to whom, on what rule
 *   Act      approval-step                  Quality and Manufacturing sign the recall
 *   Confirm  confirm-send                   "Send to N owners?", then the send
 *   Record   audit-timeline                 every decision, send and failure
 *
 * Each step hands its result to the next: the selected rows set the owner count
 * on the send button, an approval enables the send, a send adds an event to the
 * record and moves the gauges to "recalled", and the strip counts follow.
 *
 * THE SERVER IS A STAND-IN. With no `server` prop this uses
 * `createMemoryServer()` from `calibration-desk-server.ts`: gauges, request and
 * audit log live in memory and nothing is sent. To go real, change one place:
 * pass `server={yourServer}`, an object with the four methods of
 * `CalibrationDeskServer` that call your API, and delete the demo file. Your
 * server must verify the user and role, write the audit events and enforce
 * quiet hours; this screen only shows and asks. Hiding a button is not access
 * control.
 *
 * Example data only. See /docs/components/calibration-desk.
 */
import * as React from "react"
import {
  CircleAlert,
  CircleCheck,
  Clock,
  TriangleAlert,
  Undo2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { summarizeRule } from "@/registry/crisp/lib/alert-rules"
import { summarizeApproval } from "@/registry/crisp/lib/approval"
import {
  calibrationStatus,
  checkRecallSend,
  countStatuses,
  daysUntilDue,
  describeSkipped,
  gaugeCount,
  ownerCount,
  planRecall,
  RECALL_MEANING,
  RECALL_POLICY,
  RECALL_REJECT_MEANING,
  recallTitle,
  summarizeIds,
  todayOf,
  type CalibrationDeskServer,
  type CalibrationStatus,
  type DeskState,
  type DeskUser,
  type Gauge,
} from "@/registry/crisp/lib/calibration-desk"
import {
  createMemoryServer,
  DEMO_USERS,
} from "@/registry/crisp/lib/calibration-desk-server"
import { selectedRows } from "@/registry/crisp/lib/table-view"
import { ApprovalStep } from "@/registry/crisp/ui/approval-step"
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

export interface CalibrationDeskProps extends React.ComponentProps<"div"> {
  /**
   * Your server. Omit it to use the in-memory demo server, which shows the
   * demo controls (view as, simulate a failure).
   */
  server?: CalibrationDeskServer
  /** The signed-in person, from your session. Omit it in the demo to pick one. */
  currentUser?: DeskUser
  /** The first state, if you already fetched it. Otherwise the screen loads it. */
  initialState?: DeskState
  /** IANA zone the record shows times in. Default "UTC". */
  timeZone?: string
}

const message = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message.replace(/[.\s]+$/, "")
    : "Something went wrong"

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`

const RANK: Record<CalibrationStatus, number> = {
  overdue: 0,
  "due-soon": 1,
  recalled: 2,
  "in-date": 3,
}

// The status is an icon and words, so it still reads without colour.
function StatusCell({ gauge, today }: { gauge: Gauge; today: string }) {
  const status = calibrationStatus(gauge, today)
  const days = daysUntilDue(gauge.due, today)
  if (status === "overdue") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
        <TriangleAlert className="size-4" aria-hidden="true" />
        {Number.isNaN(days)
          ? "Date unknown"
          : `Overdue by ${plural(-days, "day")}`}
      </span>
    )
  }
  if (status === "due-soon") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-4" aria-hidden="true" />
        {days === 0 ? "Due today" : `Due in ${plural(days, "day")}`}
      </span>
    )
  }
  if (status === "recalled") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium">
        <Undo2 className="size-4" aria-hidden="true" />
        Recalled
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <CircleCheck className="size-4" aria-hidden="true" />
      In date
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

/** The whole See, Decide, Act, Confirm, Record screen for recalling gauges. */
function CalibrationDesk({
  server,
  currentUser,
  initialState,
  timeZone = "UTC",
  className,
  ...props
}: CalibrationDeskProps) {
  // The demo server is always created (it is cheap) and used only when no
  // `server` is passed. Your own server replaces it here.
  const [memory] = React.useState(() => createMemoryServer())
  const api: CalibrationDeskServer = server ?? memory
  const [state, setState] = React.useState<DeskState | null>(
    () => initialState ?? (server ? null : memory.snapshot())
  )
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [viewerId, setViewerId] = React.useState(DEMO_USERS[0].id)
  const [failSend, setFailSend] = React.useState(false)

  // With your own server the person must come from your session; the demo
  // people are only for the in-memory server.
  const user: DeskUser | undefined =
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

  const demo = !server && !currentUser

  return (
    <div
      data-slot="calibration-desk"
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
            Demo controls. They are not part of the pattern, and the data is
            made up.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {demo && (
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
                    onClick={() => setViewerId(u.id)}
                  >
                    {u.name}, {u.role}
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
          </div>
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
              : `Could not load the calibration list: ${loadError}.`}
          </span>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Try again
          </Button>
        </p>
      )}

      {state && user ? (
        <Desk
          state={state}
          api={api}
          user={user}
          refresh={refresh}
          timeZone={timeZone}
          refreshFailed={loadError !== null}
        />
      ) : state ? (
        <p role="alert" className="text-sm text-destructive">
          Pass currentUser (id, name, role) from your session to use your own
          server.
        </p>
      ) : !loadError ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading the calibration list…
        </p>
      ) : null}
    </div>
  )
}

interface DeskProps {
  state: DeskState
  api: CalibrationDeskServer
  user: DeskUser
  refresh: () => Promise<void>
  timeZone: string
  refreshFailed: boolean
}

function Desk({
  state,
  api,
  user,
  refresh,
  timeZone,
  refreshFailed,
}: DeskProps) {
  const { gauges, request, rule, events } = state
  const today = todayOf(new Date(state.asOf))

  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [requesting, setRequesting] = React.useState(false)
  const [requestError, setRequestError] = React.useState<string | null>(null)
  const [sending, setSending] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)
  // Always mounted, so each result is announced when its text changes.
  const [done, setDone] = React.useState("")
  const requestWhyId = React.useId()
  const approvalRef = React.useRef<HTMLElement>(null)
  const doneRef = React.useRef<HTMLParagraphElement>(null)
  // Set when a new request was just made, so focus can follow it to Act.
  const focusApproval = React.useRef(false)

  // See -> Decide: the selected rows decide what a recall would cover.
  const selected = selectedRows(gauges, selectedIds, (g) => g.id)
  const plan = planRecall(selected, today)
  const skippedText = describeSkipped(plan.skipped)

  // Decide -> Act: a request covers exactly the gauges it was made for.
  const covers =
    request !== null &&
    plan.gaugeIds.length === request.gaugeIds.length &&
    plan.gaugeIds.every((id) => request.gaugeIds.includes(id))
  const requestOpen =
    covers &&
    !request?.sentAt &&
    summarizeApproval(request?.approvers ?? [], RECALL_POLICY).status !==
      "rejected"

  // Act -> Confirm: approval for exactly this selection opens the send.
  const gate = checkRecallSend(plan.gaugeIds, request, RECALL_POLICY)

  const counts = countStatuses(gauges, today)

  const views = React.useMemo<DataTableView<Gauge>[]>(
    () => [
      { key: "all", label: "All", filter: () => true },
      {
        key: "overdue",
        label: "Overdue",
        filter: (g) => calibrationStatus(g, today) === "overdue",
      },
      {
        key: "due-soon",
        label: "Due in 30 days",
        filter: (g) => calibrationStatus(g, today) === "due-soon",
      },
    ],
    [today]
  )

  const columns = React.useMemo<DataTableColumn<Gauge>[]>(
    () => [
      {
        key: "gauge",
        header: "Gauge",
        rowHeader: true,
        sortValue: (g) => g.id,
        cell: (g) => (
          <span className="flex flex-col">
            <span>{g.id}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {g.name}
            </span>
          </span>
        ),
      },
      {
        key: "owner",
        header: "Owner",
        sortValue: (g) => g.owner,
        cell: (g) => g.owner,
      },
      {
        key: "due",
        header: "Due date",
        sortValue: (g) => g.due,
        cell: (g) => formatDate(g.due),
      },
      {
        key: "status",
        header: "Status",
        sortValue: (g) => RANK[calibrationStatus(g, today)],
        cell: (g) => <StatusCell gauge={g} today={today} />,
      },
    ],
    [today]
  )

  const requestId = request?.id
  React.useEffect(() => {
    if (focusApproval.current && requestId) {
      focusApproval.current = false
      approvalRef.current?.focus()
    }
  }, [requestId])

  // The send button goes quiet once the gauges are recalled, so move focus to
  // the result rather than leaving it on nothing. Never steals focus the person
  // has already moved elsewhere.
  React.useEffect(() => {
    if (done && document.activeElement === document.body) {
      doneRef.current?.focus()
    }
  }, [done])

  async function requestRecall() {
    setRequesting(true)
    setRequestError(null)
    setSendError(null)
    setDone("")
    try {
      await api.requestRecall({ userId: user.id, gaugeIds: plan.gaugeIds })
      focusApproval.current = true
    } catch (error) {
      setRequestError(message(error))
    } finally {
      // Refetch either way: a refusal is in the record too.
      await refresh()
      setRequesting(false)
    }
  }

  async function sendRecall() {
    if (!request) return
    setSending(true)
    setSendError(null)
    setDone("")
    try {
      const { sent } = await api.sendRecall({
        userId: user.id,
        requestId: request.id,
        gaugeIds: plan.gaugeIds,
      })
      setSelectedIds([])
      setDone(
        `${request.id} sent to ${ownerCount(sent)}. ${gaugeCount(plan.gaugeIds.length)} recalled.`
      )
    } catch (error) {
      // The server has recorded the failure. Nothing was delivered, and the
      // same button tries again.
      setSendError(message(error))
    } finally {
      await refresh()
      setSending(false)
    }
  }

  const requestBlocked = requesting
    ? "Requesting…"
    : plan.gaugeIds.length === 0
      ? "Select at least one gauge that is overdue or due in 30 days"
      : requestOpen
        ? `${request?.id} already covers these gauges. Sign it below`
        : undefined

  return (
    <>
      <Stage
        stage="See"
        title="What is due"
        handsOn="Selecting rows hands them to Decide."
      >
        <StatusStrip
          headlineNoun="gauges in date or recalled"
          segments={[
            {
              key: "in-date",
              label: "in date",
              count: counts["in-date"],
              tone: "done",
            },
            {
              key: "recalled",
              label: "recalled",
              count: counts.recalled,
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
          caption="Gauges and when each is next due for calibration"
          noun="gauge"
          rows={gauges}
          columns={columns}
          views={views}
          defaultActiveView="overdue"
          getRowId={(g) => g.id}
          rowLabel={(g) => `${g.id}, ${g.name}`}
          defaultSort={{ key: "due", direction: "asc" }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          asOf={state.asOf}
          onRefresh={() => void refresh()}
        />
      </Stage>

      <Stage
        stage="Decide"
        title="What would go out"
        handsOn="The recallable gauges go to Act as a request for sign-off."
      >
        <div className="flex flex-col gap-2 text-sm">
          {plan.gaugeIds.length === 0 ? (
            <p>No gauges chosen for recall yet. Select rows above.</p>
          ) : (
            <p>
              <span className="font-medium">
                {gaugeCount(plan.gaugeIds.length)}
              </span>{" "}
              would be recalled and{" "}
              <span className="font-medium">
                {ownerCount(plan.owners.length)}
              </span>{" "}
              told ({summarizeIds(plan.owners, 4)}).
            </p>
          )}
          {skippedText && (
            <p className="text-muted-foreground">{skippedText}</p>
          )}
          <p>
            <span className="font-medium">{rule.label} rule.</span>{" "}
            {summarizeRule(rule, { includeTimeZone: true })}
          </p>
          <p className="text-muted-foreground">
            The rule is shown here, not applied. The server that sends must
            check quiet hours itself.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2">
          <Button
            disabled={Boolean(requestBlocked)}
            aria-describedby={requestBlocked ? requestWhyId : undefined}
            onClick={() => void requestRecall()}
          >
            {plan.gaugeIds.length === 0
              ? "Request approval to recall"
              : `Request approval to recall ${gaugeCount(plan.gaugeIds.length)}`}
          </Button>
          {requestBlocked && (
            <p id={requestWhyId} className="text-sm text-muted-foreground">
              {requestBlocked}
            </p>
          )}
          {requestError && (
            <p role="alert" className="text-sm text-destructive">
              {requestError}.
            </p>
          )}
        </div>
      </Stage>

      <Stage
        stage="Act"
        title="Sign off the recall"
        handsOn="Once Quality and Manufacturing both approve, Confirm unlocks."
      >
        {request ? (
          <ApprovalStep
            key={request.id}
            ref={approvalRef}
            tabIndex={-1}
            className="outline-none"
            title={recallTitle(request.id, request.gaugeIds)}
            approvers={request.approvers}
            policy={RECALL_POLICY}
            currentUserId={user.id}
            meaning={RECALL_MEANING}
            rejectMeaning={RECALL_REJECT_MEANING}
            requireReason
            onDecide={async ({ outcome, reason }) => {
              try {
                await api.decide({
                  userId: user.id,
                  requestId: request.id,
                  outcome,
                  reason,
                })
              } finally {
                // On success the new decision comes back in `approvers`; on a
                // refusal the "blocked" event does. Refetch either way.
                await refresh()
              }
            }}
          />
        ) : (
          <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No recall request yet. Choose gauges, then request approval.
          </p>
        )}
      </Stage>

      <Stage
        stage="Confirm"
        title="Tell the owners"
        handsOn="Every send, and every failure, goes to Record."
      >
        <div className="flex flex-wrap items-center gap-3">
          <ConfirmSend
            count={plan.owners.length}
            noun="owner"
            label="Send recall notice"
            blockedReason={gate.ok ? undefined : gate.reason}
            sending={sending}
            onSend={sendRecall}
          />
        </div>
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
              The send failed: {sendError}. Nothing was delivered, and the
              failure is in the record below. Press Send again to retry.
            </span>
          </p>
        )}
        <p
          ref={doneRef}
          role="status"
          tabIndex={-1}
          className="flex items-center gap-1.5 text-sm font-medium outline-none"
        >
          {done && <CircleCheck className="size-4" aria-hidden="true" />}
          {done}
        </p>
      </Stage>

      <Stage
        stage="Record"
        title="Who did what"
        handsOn="The loop closes: the counts above already reflect it."
      >
        <AuditTimeline
          events={events}
          timeZone={timeZone}
          initialCount={6}
          headingLevel={4}
          emptyMessage="No recall activity yet. Each request, decision, send and failure will appear here."
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

export { CalibrationDesk }
