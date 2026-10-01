"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2, Clock, Lock, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  canDecide,
  describePolicy,
  summarizeApproval,
  uniqueApprovers,
  validateDecision,
  type ApprovalOutcome,
  type ApprovalPolicy,
  type Approver,
} from "@/registry/crisp/lib/approval"
import { Button } from "@/registry/new-york-v4/ui/button"

export interface ApprovalStepDecision {
  outcome: ApprovalOutcome
  /** Trimmed. Absent when empty. */
  reason?: string
  /** The meaning of the signature the person confirmed, e.g. "Approved for release". */
  meaning: string
}

export interface ApprovalStepProps
  extends Omit<React.ComponentProps<"section">, "title" | "children"> {
  /** What is being approved, e.g. "ECR-1042: Replace bracket 14-220 with rev C". */
  title: string
  /** Everyone who signs, with their recorded decision if they have made one. From your server. */
  approvers: Approver[]
  /** How many approvals settle the request. Default "all". */
  policy?: ApprovalPolicy
  /** The signed-in user's id, from your session. Compared with `approvers[].id`. */
  currentUserId?: string
  /** What an approval means, e.g. "Approved for release". Default "Approved". */
  meaning?: string
  /** What a rejection means. Default "Rejected". */
  rejectMeaning?: string
  /** Also ask for a reason when approving. A reason is always asked for when rejecting. */
  requireReason?: boolean
  /** Blocks the actions and says why, e.g. "Waiting for Quality to sign first". */
  blockedReason?: string
  /** Replaces "Only Quality can sign off" for a viewer who is not an approver. */
  readOnlyReason?: string
  /** Formats a decision time. Default: "12 Mar 2026, 14:05 UTC". */
  formatTime?: (iso: string) => string
  /**
   * Called after the person confirms. Throw (or reject) to fail; the person can
   * retry. On success, update `approvers` from your server's response.
   */
  onDecide: (decision: ApprovalStepDecision) => void | Promise<void>
}

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

// A fixed zone so the server and browser render the same text.
function defaultFormatTime(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : `${timeFormat.format(date)} UTC`
}

const textareaClass =
  "flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40"

const STATE_ICON = {
  approved: CheckCircle2,
  rejected: XCircle,
  pending: Clock,
}

function joinWords(words: string[], conjunction: string) {
  if (words.length <= 1) return words.join("")
  return `${words.slice(0, -1).join(", ")} ${conjunction} ${words.at(-1)}`
}

/**
 * A sign-off with a stated reason and meaning: who must sign, who has, and, for
 * the one person who can still decide, Approve and Reject behind a confirm.
 *
 * This only shows and collects. Hiding a button is not access control: your
 * server must verify the user, the role and the order, and record the decision.
 */
function ApprovalStep({
  title,
  approvers,
  policy = "all",
  currentUserId,
  meaning = "Approved",
  rejectMeaning = "Rejected",
  requireReason = false,
  blockedReason,
  readOnlyReason,
  formatTime = defaultFormatTime,
  onDecide,
  className,
  ...props
}: ApprovalStepProps) {
  const [outcome, setOutcome] = React.useState<ApprovalOutcome | null>(null)
  const [reason, setReason] = React.useState("")
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [failure, setFailure] = React.useState<string | null>(null)
  const [lastRecorded, setRecorded] = React.useState<{
    meaning: string
    key: string
    user?: string
  } | null>(null)

  const ids = {
    title: React.useId(),
    question: React.useId(),
    reason: React.useId(),
    fieldError: React.useId(),
    blocked: React.useId(),
  }
  const confirmRef = React.useRef<HTMLDivElement>(null)
  const questionRef = React.useRef<HTMLParagraphElement>(null)
  const reasonRef = React.useRef<HTMLTextAreaElement>(null)
  const approveRef = React.useRef<HTMLButtonElement>(null)
  const rejectRef = React.useRef<HTMLButtonElement>(null)
  const recordedRef = React.useRef<HTMLParagraphElement>(null)
  // Stops a second click while a decision is in flight (state updates are async).
  const inFlight = React.useRef(false)
  // Set when the person leaves the confirm, so focus can return to its button.
  const restoreFocusTo = React.useRef<ApprovalOutcome | null>(null)
  // Set when the confirm closes with focus inside it, so focus can follow to the result.
  const focusRecorded = React.useRef(false)

  const list = React.useMemo(() => uniqueApprovers(approvers), [approvers])
  const summary = React.useMemo(
    () => summarizeApproval(approvers, policy),
    [approvers, policy]
  )
  const me = currentUserId
    ? list.find((a) => a.id === currentUserId)
    : undefined
  const mayDecide = me ? canDecide(me, currentUserId, summary) : false
  // Changes whenever a decision on the list changes.
  const key = list
    .map((a) => `${a.id}:${a.decision?.outcome ?? ""}:${a.decision?.at ?? ""}`)
    .join("|")
  // Only the viewer who signed sees the result of signing.
  const recorded =
    lastRecorded && lastRecorded.user === currentUserId ? lastRecorded : null
  // Our decision went through but the list has not caught up yet.
  const awaitingList = recorded !== null && recorded.key === key
  const showActions = mayDecide && !awaitingList
  const confirming = outcome !== null && showActions && !blockedReason
  const reasonShown = outcome === "rejected" || requireReason

  // The list or the situation changed under an open confirm (someone else settled
  // it, the viewer changed, an order block appeared): what it says no longer
  // holds, so drop back. Not while a decision is in flight.
  React.useEffect(() => {
    if (!confirming && outcome !== null && !inFlight.current) {
      setOutcome(null)
      setFailure(null)
      setFieldError(null)
    }
  }, [confirming, outcome])

  // Focus follows the swap between the buttons and the confirm. It never steals
  // focus the person has already moved elsewhere.
  React.useEffect(() => {
    if (confirming) {
      questionRef.current?.focus()
    } else if (restoreFocusTo.current) {
      const button =
        restoreFocusTo.current === "approved"
          ? approveRef.current
          : rejectRef.current
      restoreFocusTo.current = null
      if (button && document.activeElement === document.body) button.focus()
    }
  }, [confirming])

  React.useEffect(() => {
    if (recorded && focusRecorded.current) {
      focusRecorded.current = false
      recordedRef.current?.focus()
    }
  }, [recorded])

  function open(next: ApprovalOutcome) {
    setReason("")
    setFailure(null)
    setFieldError(null)
    setOutcome(next)
  }

  function cancel() {
    if (inFlight.current || !outcome) return
    restoreFocusTo.current = outcome
    setOutcome(null)
    setFailure(null)
    setFieldError(null)
  }

  async function confirm() {
    if (inFlight.current || !outcome) return
    const check = validateDecision(
      { outcome, reason: reasonShown ? reason : "" },
      { requireReasonOnApprove: requireReason }
    )
    if (!check.valid) {
      setFieldError(check.error)
      reasonRef.current?.focus()
      return
    }
    const decidedMeaning = outcome === "approved" ? meaning : rejectMeaning
    inFlight.current = true
    setSubmitting(true)
    setFailure(null)
    setFieldError(null)
    setRecorded(null)
    try {
      await onDecide({ outcome, reason: check.reason, meaning: decidedMeaning })
      focusRecorded.current =
        document.activeElement === document.body ||
        Boolean(confirmRef.current?.contains(document.activeElement))
      setRecorded({ meaning: decidedMeaning, key, user: currentUserId })
      setOutcome(null)
    } catch (error) {
      const detail =
        error instanceof Error ? error.message.replace(/[.\s]+$/, "") : ""
      setFailure(detail)
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  const StatusIcon = STATE_ICON[summary.status]
  const statusText =
    summary.status === "pending"
      ? summary.needed > 0
        ? `Pending, ${summary.approved} of ${summary.needed} approved`
        : "Pending"
      : summary.status === "approved"
        ? "Approved"
        : "Rejected"

  function readOnlyText() {
    if (summary.status === "approved")
      return "This request is approved. No more sign-offs are needed."
    if (summary.status === "rejected")
      return "This request is rejected. No more sign-offs are accepted."
    if (me?.decision) {
      return `You ${me.decision.outcome === "approved" ? "approved" : "rejected"} this request on ${formatTime(me.decision.at)}.`
    }
    if (readOnlyReason) return readOnlyReason
    const waiting = list.filter((a) => !a.decision)
    if (waiting.length === 0) return "No approvers are set for this request."
    const roles = [...new Set(waiting.flatMap((a) => (a.role ? [a.role] : [])))]
    const who = roles.length > 0 ? roles : waiting.map((a) => a.name)
    return `Only ${joinWords(who, policy === "all" ? "and" : "or")} can sign off.`
  }

  const liveMessage = submitting
    ? "Recording your decision…"
    : recorded
      ? `Recorded: ${recorded.meaning}`
      : ""

  const actionName = outcome === "approved" ? "approval" : "rejection"

  return (
    <section
      aria-labelledby={ids.title}
      data-slot="approval-step"
      className={cn(
        "flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground sm:p-5",
        className
      )}
      {...props}
    >
      <span role="status" className="sr-only">
        {liveMessage}
      </span>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p id={ids.title} className="font-medium">
            {title}
          </p>
          <p className="text-sm text-muted-foreground">
            {describePolicy(list, policy)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          <StatusIcon aria-hidden="true" className="size-4" />
          {statusText}
        </span>
      </div>

      <ul className="divide-y rounded-md border">
        {list.map((approver) => {
          const decision = approver.decision
          const state = decision ? decision.outcome : "pending"
          const Icon = STATE_ICON[state]
          return (
            <li
              key={approver.id}
              className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <p className="text-sm">
                <span className="font-medium">{approver.name}</span>
                {approver.id === currentUserId && (
                  <span className="text-muted-foreground"> (you)</span>
                )}
                {approver.role && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {approver.role}
                  </span>
                )}
              </p>
              <div className="flex flex-col gap-0.5 text-sm sm:items-end sm:text-right">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Icon aria-hidden="true" className="size-4" />
                  {decision
                    ? decision.outcome === "approved"
                      ? "Approved"
                      : "Rejected"
                    : "Waiting"}
                </span>
                {decision && (
                  <>
                    <time
                      dateTime={decision.at}
                      className="text-muted-foreground"
                    >
                      {formatTime(decision.at)}
                    </time>
                    {decision.meaning && (
                      <span className="text-muted-foreground">
                        Meaning: {decision.meaning}
                      </span>
                    )}
                    {decision.reason && (
                      <span className="text-muted-foreground">
                        Reason: {decision.reason}
                      </span>
                    )}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {confirming && outcome ? (
        <div
          ref={confirmRef}
          role="group"
          aria-labelledby={ids.question}
          onKeyDown={(event) => {
            if (event.key === "Escape") cancel()
          }}
          className="flex flex-col gap-3 rounded-md border bg-muted/40 p-3"
        >
          {/* tabIndex -1: focusable by script so the question is read out, but not a tab stop. */}
          <p
            id={ids.question}
            ref={questionRef}
            tabIndex={-1}
            className="text-sm font-medium outline-none"
          >
            {`${outcome === "approved" ? "Approve" : "Reject"} with the meaning “${outcome === "approved" ? meaning : rejectMeaning}”? ${
              reasonShown
                ? "Your name, the time and your reason will be recorded."
                : "Your name and the time will be recorded."
            }`}
          </p>
          {reasonShown && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.reason} className="text-sm font-medium">
                Reason{" "}
                <span className="font-normal text-muted-foreground">
                  (required)
                </span>
              </label>
              <textarea
                id={ids.reason}
                ref={reasonRef}
                data-slot="textarea"
                rows={3}
                value={reason}
                readOnly={submitting}
                aria-required="true"
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? ids.fieldError : undefined}
                className={textareaClass}
                onChange={(event) => {
                  setReason(event.target.value)
                  setFieldError(null)
                }}
              />
              {fieldError && (
                <p
                  id={ids.fieldError}
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {fieldError}
                </p>
              )}
            </div>
          )}
          {failure !== null && (
            <p
              role="alert"
              className="flex items-start gap-1.5 text-sm text-destructive"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <span>
                Could not record your decision{failure ? `: ${failure}` : ""}.
                Try again, or cancel and check the list.
              </span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {/* aria-disabled, not disabled, while recording: the button keeps focus. */}
            <Button
              aria-disabled={submitting}
              className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
              onClick={confirm}
            >
              {submitting
                ? "Recording…"
                : failure !== null
                  ? "Try again"
                  : `Confirm ${actionName}`}
            </Button>
            <Button
              variant="outline"
              aria-disabled={submitting}
              className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
              onClick={cancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : showActions ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              ref={approveRef}
              aria-label={`Approve: ${title}`}
              disabled={Boolean(blockedReason)}
              aria-describedby={blockedReason ? ids.blocked : undefined}
              onClick={() => open("approved")}
            >
              Approve
            </Button>
            <Button
              ref={rejectRef}
              variant="outline"
              aria-label={`Reject: ${title}`}
              disabled={Boolean(blockedReason)}
              aria-describedby={blockedReason ? ids.blocked : undefined}
              onClick={() => open("rejected")}
            >
              Reject
            </Button>
          </div>
          {blockedReason && (
            <p
              id={ids.blocked}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {blockedReason}
            </p>
          )}
        </div>
      ) : recorded ? (
        <p
          ref={recordedRef}
          tabIndex={-1}
          className="flex items-start gap-2 text-sm font-medium outline-none"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Recorded: {recorded.meaning}
        </p>
      ) : (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {readOnlyText()}
        </p>
      )}
    </section>
  )
}

export { ApprovalStep }
