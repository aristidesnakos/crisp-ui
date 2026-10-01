/**
 * Pure logic for the calibration-desk block: which gauges are due, which of a
 * selection can be recalled and who hears about it, and whether a send is
 * allowed yet. No React, no network and no clock (every date is passed in), so
 * it is safe to unit test and to run on a server.
 *
 * The same `checkRecallSend` is meant to run twice: in the browser, to explain
 * why the Send button is off, and on your server, which must decide for itself
 * from its own data. A rule that only the browser checks is not a rule.
 *
 * Example data only. The gauges, people and roles in the demo are made up.
 */
import {
  isEmailAddress,
  type AlertRule,
} from "@/registry/crisp/lib/alert-rules"
import {
  summarizeApproval,
  type ApprovalPolicy,
  type Approver,
} from "@/registry/crisp/lib/approval"
import type { AuditEvent } from "@/registry/crisp/lib/audit-event"
import { sameSelection } from "@/registry/crisp/lib/table-view"

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** One gauge. Dates are calendar dates, "YYYY-MM-DD". */
export interface Gauge {
  id: string
  name: string
  owner: string
  /** Where the recall notice goes. Email only: there is no phone field. */
  ownerEmail: string
  /** When calibration is next due. */
  due: string
  /** ISO 8601 date-time the recall notice was sent. Set by the server. */
  recalledAt?: string
}

export type CalibrationStatus = "overdue" | "due-soon" | "in-date" | "recalled"

/** The signed-in person. A real server reads this from the session. */
export interface DeskUser {
  id: string
  name: string
  /** "Quality", "Manufacturing", ... Shown in the record. */
  role: string
}

/** One request to recall a set of gauges, and who has signed it. */
export interface RecallRequest {
  /** "RR-1". */
  id: string
  /** The gauges this approval covers. Nothing else may be sent under it. */
  gaugeIds: string[]
  requestedBy: string
  approvers: Approver[]
  /** ISO 8601 date-time the notice went out. Set once, by the server. */
  sentAt?: string
  /** How many owners it went to. */
  sentTo?: number
}

/** Everything the screen shows, as the server last said it. */
export interface DeskState {
  /** When the server read this, ISO 8601. */
  asOf: string
  gauges: Gauge[]
  /** The latest request, or null before anyone has made one. */
  request: RecallRequest | null
  /** The reminder rule, read-only here. */
  rule: AlertRule
  /** Every decision, send and failure, as the server recorded it. */
  events: AuditEvent[]
}

/**
 * The four things the screen asks of a server. This is the only seam: the demo
 * implements it in memory (`calibration-desk-server.ts`); yours implements it
 * with `fetch`. Each method is an authenticated request, and the server takes
 * the user from the session, never from the request body (the demo passes a
 * `userId` only because it has no session).
 *
 * Every method must throw (reject) with a readable message when the server
 * refuses or fails, and must write an audit event for the refusal or failure.
 */
export interface CalibrationDeskServer {
  load(): Promise<DeskState>
  requestRecall(input: { userId: string; gaugeIds: string[] }): Promise<void>
  decide(input: {
    userId: string
    requestId: string
    outcome: "approved" | "rejected"
    reason?: string
  }): Promise<void>
  sendRecall(input: {
    userId: string
    requestId: string
    gaugeIds: string[]
  }): Promise<{ sent: number }>
}

/** Quality and Manufacturing must both sign. */
export const RECALL_POLICY: ApprovalPolicy = "all"
/** What each signature means. The server stamps these; the browser only displays them. */
export const RECALL_MEANING = "Approved for recall"
export const RECALL_REJECT_MEANING = "Recall not approved"

/** Gauges due within this many days count as "due soon". */
export const DUE_SOON_DAYS = 30

// ---------------------------------------------------------------------------
// Dates and status
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000

/** Days since the epoch for a "YYYY-MM-DD" date, or NaN when it is not a real date. */
function dayNumber(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Number.NaN
  const ms = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(ms)) return Number.NaN
  // Rejects "2026-02-30", which some engines roll over into March.
  return new Date(ms).toISOString().slice(0, 10) === date ? ms / DAY_MS : NaN
}

/** The calendar date of an instant in UTC, "YYYY-MM-DD". */
export function todayOf(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/** `date` moved by `days` (negative goes back). Throws on a date that is not real. */
export function addDays(date: string, days: number): string {
  const day = dayNumber(date)
  if (Number.isNaN(day)) throw new RangeError(`Not a date: "${date}"`)
  return new Date((day + days) * DAY_MS).toISOString().slice(0, 10)
}

/** Whole days from `today` to `due`. Negative when overdue. NaN if either is not a date. */
export function daysUntilDue(due: string, today: string): number {
  return dayNumber(due) - dayNumber(today)
}

/**
 * Where a gauge stands today.
 *
 * - `recalled`: the notice has gone out (it wins over the date).
 * - `overdue`: due before today. A due date that cannot be read counts as
 *   overdue, because nobody can vouch for a gauge whose date is unknown.
 * - `due-soon`: due today or within `DUE_SOON_DAYS` days.
 * - `in-date`: anything later.
 */
export function calibrationStatus(
  gauge: Gauge,
  today: string
): CalibrationStatus {
  if (gauge.recalledAt) return "recalled"
  const days = daysUntilDue(gauge.due, today)
  if (Number.isNaN(days) || days < 0) return "overdue"
  return days <= DUE_SOON_DAYS ? "due-soon" : "in-date"
}

/** How many gauges are in each status. Every status is present, even at 0. */
export function countStatuses(
  gauges: readonly Gauge[],
  today: string
): Record<CalibrationStatus, number> {
  const counts: Record<CalibrationStatus, number> = {
    overdue: 0,
    "due-soon": 0,
    "in-date": 0,
    recalled: 0,
  }
  for (const gauge of gauges) counts[calibrationStatus(gauge, today)] += 1
  return counts
}

// ---------------------------------------------------------------------------
// Decide: what a selection means
// ---------------------------------------------------------------------------

export type SkipReason = "in-date" | "already-recalled" | "no-owner-email"

export interface RecallPlan {
  /** The selected gauges that can be recalled, in the order given, once each. */
  gaugeIds: string[]
  /** Who is told: each owner's email once, trimmed and lower-cased. */
  owners: string[]
  /** Selected gauges that are left out, and why. */
  skipped: { id: string; reason: SkipReason }[]
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

/**
 * Turn selected rows into what would be recalled and who would hear.
 *
 * A gauge can be recalled when it is overdue or due within 30 days, has not
 * already been recalled, and its owner has a valid email address (one that
 * cannot be told is not recalled: a recall nobody hears is worse than none).
 * Everything else is listed in `skipped`, so the screen can say what it left
 * out instead of silently dropping it. A repeated id counts once.
 */
export function planRecall(
  selected: readonly Gauge[],
  today: string
): RecallPlan {
  const gaugeIds: string[] = []
  const owners: string[] = []
  const skipped: RecallPlan["skipped"] = []
  const seen = new Set<string>()
  for (const gauge of selected) {
    if (seen.has(gauge.id)) continue
    seen.add(gauge.id)
    const status = calibrationStatus(gauge, today)
    if (status === "recalled") {
      skipped.push({ id: gauge.id, reason: "already-recalled" })
    } else if (status === "in-date") {
      skipped.push({ id: gauge.id, reason: "in-date" })
    } else if (!isEmailAddress(normalizeEmail(gauge.ownerEmail))) {
      skipped.push({ id: gauge.id, reason: "no-owner-email" })
    } else {
      gaugeIds.push(gauge.id)
      const email = normalizeEmail(gauge.ownerEmail)
      if (!owners.includes(email)) owners.push(email)
    }
  }
  return { gaugeIds, owners, skipped }
}

const SKIP_LABEL: Record<SkipReason, string> = {
  "in-date": "in date",
  "already-recalled": "already recalled",
  "no-owner-email": "no valid owner email",
}

/**
 * One sentence about what a selection left out, or null when nothing was left
 * out: "2 selected gauges are left out: 1 in date, 1 already recalled."
 */
export function describeSkipped(skipped: RecallPlan["skipped"]): string | null {
  if (skipped.length === 0) return null
  const parts = (Object.keys(SKIP_LABEL) as SkipReason[])
    .map((reason) => ({
      reason,
      count: skipped.filter((s) => s.reason === reason).length,
    }))
    .filter((p) => p.count > 0)
    .map((p) => `${p.count} ${SKIP_LABEL[p.reason]}`)
  const many = skipped.length !== 1
  return `${skipped.length} selected ${many ? "gauges are" : "gauge is"} left out: ${parts.join(", ")}.`
}

/** "G-101, G-104, G-107, and 2 more": a short list for a title or a log line. */
export function summarizeIds(ids: readonly string[], max = 4): string {
  if (ids.length <= max) return ids.join(", ")
  return `${ids.slice(0, max).join(", ")}, and ${ids.length - max} more`
}

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`

/** "3 gauges", "1 owner". */
export const gaugeCount = (n: number) => plural(n, "gauge")
export const ownerCount = (n: number) => plural(n, "owner")

/** The line that names a request, for the approval step and the record. */
export function recallTitle(id: string, gaugeIds: readonly string[]): string {
  return `Recall request ${id}: ${gaugeCount(gaugeIds.length)} (${summarizeIds(gaugeIds)})`
}

// ---------------------------------------------------------------------------
// Act to Confirm: may the notice go out?
// ---------------------------------------------------------------------------

export type SendBlock =
  | "nothing-to-send"
  | "no-request"
  | "selection-changed"
  | "already-sent"
  | "rejected"
  | "waiting"

export type SendCheck =
  | { ok: true }
  | { ok: false; code: SendBlock; reason: string }

/**
 * May the recall notice go out for exactly these gauges under this request?
 * Checked in this order, so the first thing that is wrong is the one named:
 *
 * 1. nothing to send (no recallable gauge);
 * 2. no request, or the selection is not the one the request covers
 *    (approval is for a set of gauges, so a different set needs its own);
 * 3. already sent (a request can only be sent once);
 * 4. rejected, or still waiting for signatures.
 *
 * Run it in the browser for the message beside the button, and on the server
 * against the server's own copy of the request: the server's answer is the one
 * that counts.
 */
export function checkRecallSend(
  gaugeIds: readonly string[],
  request: RecallRequest | null | undefined,
  policy: ApprovalPolicy = RECALL_POLICY
): SendCheck {
  if (gaugeIds.length === 0) {
    return {
      ok: false,
      code: "nothing-to-send",
      reason: "Select at least one gauge that is overdue or due in 30 days",
    }
  }
  if (!request) {
    return {
      ok: false,
      code: "no-request",
      reason:
        "Request a recall first. It needs approval before anything is sent",
    }
  }
  if (!sameSelection(gaugeIds, request.gaugeIds)) {
    return {
      ok: false,
      code: "selection-changed",
      reason: `These gauges are not the ones in ${request.id}. Request a recall for them`,
    }
  }
  if (request.sentAt) {
    return {
      ok: false,
      code: "already-sent",
      reason: `${request.id} was already sent`,
    }
  }
  const summary = summarizeApproval(request.approvers, policy)
  if (summary.status === "rejected") {
    return {
      ok: false,
      code: "rejected",
      reason: `${request.id} was rejected. Request a new recall to try again`,
    }
  }
  if (summary.status === "pending") {
    return {
      ok: false,
      code: "waiting",
      reason: `Waiting for approval: ${summary.approved} of ${summary.needed} signed`,
    }
  }
  return { ok: true }
}
