/**
 * Pure logic for the training-tracker block: where each person stands, who a
 * reminder would reach and who it leaves out, what the email says, and whether
 * a send or a sign-off is allowed. No React, no network and no clock (every
 * instant is passed in), so it is safe to unit test and to run on a server.
 *
 * The same `checkReminderSend` and `checkSignOff` are meant to run twice: in
 * the browser, to explain why a button is off, and on your server, which must
 * decide for itself from its own data and its own clock. A rule that only the
 * browser checks is not a rule.
 *
 * Example data only. The people, teams and training in the demo are made up.
 */
import {
  formatTimeOfDay,
  isEmailAddress,
  isQuietTime,
  type AlertRule,
  type QuietHours,
} from "@/registry/crisp/lib/alert-rules-lib"
import type { AuditEvent } from "@/registry/crisp/lib/audit-event"

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** One person on the list. */
export interface Person {
  id: string
  /** The only part of their name a reminder email may use. */
  firstName: string
  lastName: string
  /** Their team, or where they work: "Warehouse", "Front desk". */
  team: string
  /** Where reminders go. Email only: there is no phone field. May be empty. */
  email: string
}

/** What everyone on the list must complete. One per tracker. */
export interface Requirement {
  id: string
  /** "Safeguarding training". The only thing about it a reminder names. */
  name: string
  /** How long a completion lasts, in months. 12 is "every year". */
  renewalMonths: number
}

/** One person's record for the requirement. Dates are calendar dates, "YYYY-MM-DD". */
export interface TrainingRecord {
  personId: string
  /** When they last completed it. Missing if never. */
  completedOn?: string
  /** When it runs out. Missing, or a date that cannot be read, counts as overdue. */
  expiresOn?: string
  /** ISO 8601 date-time of the last reminder. Set by the server. */
  remindedAt?: string
  /** Who signed off the last completion. Set by the server. */
  signedOffBy?: string
  /** ISO 8601 date-time of that sign-off. Set by the server. */
  signedOffAt?: string
}

/** A row on the screen: a person and their record (null before any record). */
export interface TrackerRow {
  person: Person
  record: TrainingRecord | null
}

export type TrainingStatus = "overdue" | "due-soon" | "up-to-date"

/** Staff can look. Managers and admins can send reminders and sign people off. */
export type TrackerRole = "staff" | "manager" | "admin"

/** The signed-in person. A real server reads this from the session. */
export interface TrackerUser {
  id: string
  name: string
  role: TrackerRole
}

/** Everything the screen shows, as the server last said it. */
export interface TrackerState {
  /** When the server read this, ISO 8601, by the server's clock. */
  asOf: string
  /** The IANA zone the tracker runs in. Quiet hours and "today" are counted here. */
  timeZone: string
  requirement: Requirement
  rows: TrackerRow[]
  /** The reminder rule, read-only here. */
  rule: AlertRule
  /** Every send, sign-off, refusal and failure, as the server recorded it. */
  events: AuditEvent[]
}

export type SkipReason = "up-to-date" | "no-email" | "duplicate"

export interface Skipped {
  id: string
  reason: SkipReason
}

/** What a send did, as the server reports it. */
export interface ReminderResult {
  /** How many reminders went out: one email per person. */
  sent: number
  /** Who got one, in the order asked. */
  personIds: string[]
  /** Who was left out, and why. */
  skipped: Skipped[]
}

/**
 * The three things the screen asks of a server. This is the only seam: the
 * demo implements it in memory (`training-tracker-server.ts`); yours implements
 * it with `fetch`. Each method is an authenticated request, and the server
 * takes the user from the session, never from the request body (the demo
 * passes a `userId` only because it has no session).
 *
 * Every method must throw (reject) with a readable message when the server
 * refuses or fails, and must write an audit event for the refusal or failure.
 */
export interface TrainingTrackerServer {
  load(): Promise<TrackerState>
  sendReminders(input: {
    userId: string
    personIds: string[]
  }): Promise<ReminderResult>
  signOff(input: {
    userId: string
    personId: string
    reason: string
  }): Promise<void>
}

/** Training that runs out within this many days counts as "due soon". */
export const DUE_SOON_DAYS = 30
/** No reminders from this time... */
export const QUIET_START = "21:00"
/** ...until this time, on the wall clock of the tracker's time zone. */
export const QUIET_END = "08:00"

// ---------------------------------------------------------------------------
// Dates and status
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000

/** Days since the epoch for a "YYYY-MM-DD" date, or NaN when it is not a real date. */
function dayNumber(date: string): number {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Number.NaN
  }
  const ms = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(ms)) return Number.NaN
  // Rejects "2026-02-30", which some engines roll over into March.
  return new Date(ms).toISOString().slice(0, 10) === date ? ms / DAY_MS : NaN
}

/** True for a real calendar date written "YYYY-MM-DD". */
export function isCalendarDate(date: string): boolean {
  return !Number.isNaN(dayNumber(date))
}

const dayFormats = new Map<string, Intl.DateTimeFormat>()

/**
 * The calendar date of an instant on the wall clock of `timeZone`,
 * "YYYY-MM-DD". At 23:30 in London on 6 October it is "2026-10-06", even
 * though it is already 7 October somewhere else. Throws a `RangeError` for an
 * unknown zone or an invalid instant.
 */
export function todayIn(instant: Date, timeZone: string): string {
  let format = dayFormats.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    dayFormats.set(timeZone, format)
  }
  const parts = format.formatToParts(instant)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")}`
}

/** `date` moved by `days` (negative goes back). Throws on a date that is not real. */
export function addDays(date: string, days: number): string {
  const day = dayNumber(date)
  if (Number.isNaN(day)) throw new RangeError(`Not a date: "${date}"`)
  return new Date((day + days) * DAY_MS).toISOString().slice(0, 10)
}

/**
 * `date` moved by whole `months` (negative goes back). A day that the new month
 * does not have becomes its last day: 31 January plus one month is 28 or 29
 * February. Throws on a date that is not real.
 */
export function addMonths(date: string, months: number): string {
  if (Number.isNaN(dayNumber(date))) {
    throw new RangeError(`Not a date: "${date}"`)
  }
  const [year, month, day] = date.split("-").map(Number)
  const index = year * 12 + (month - 1) + Math.trunc(months)
  const nextYear = Math.floor(index / 12)
  const nextMonth = index - nextYear * 12
  const lastDay = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate()
  const pad = (n: number, width = 2) => String(n).padStart(width, "0")
  return `${pad(nextYear, 4)}-${pad(nextMonth + 1)}-${pad(Math.min(day, lastDay))}`
}

/** Whole days from `today` to `date`. Negative when it has passed. NaN if either is not a date. */
export function daysUntil(date: string, today: string): number {
  return dayNumber(date) - dayNumber(today)
}

/**
 * Where a person stands today.
 *
 * - `overdue`: the training ran out before today. No record, no expiry date or
 *   a date that cannot be read also counts as overdue, because nobody can
 *   vouch for training whose date is unknown.
 * - `due-soon`: it runs out today or within `DUE_SOON_DAYS` days.
 * - `up-to-date`: anything later.
 */
export function trainingStatus(
  record: TrainingRecord | null | undefined,
  today: string
): TrainingStatus {
  const days = record?.expiresOn ? daysUntil(record.expiresOn, today) : NaN
  if (Number.isNaN(days) || days < 0) return "overdue"
  return days <= DUE_SOON_DAYS ? "due-soon" : "up-to-date"
}

/** True for someone who is overdue or due within 30 days. */
export function needsAttention(row: TrackerRow, today: string): boolean {
  return trainingStatus(row.record, today) !== "up-to-date"
}

/** How many people are in each status. Every status is present, even at 0. */
export function countStatuses(
  rows: readonly TrackerRow[],
  today: string
): Record<TrainingStatus, number> {
  const counts: Record<TrainingStatus, number> = {
    overdue: 0,
    "due-soon": 0,
    "up-to-date": 0,
  }
  for (const row of rows) counts[trainingStatus(row.record, today)] += 1
  return counts
}

/** "Overdue by 40 days", "Due in 6 days", "Due today", "Up to date", "Not done yet". */
export function statusLabel(
  record: TrainingRecord | null | undefined,
  today: string
): string {
  if (!record?.expiresOn) return "Not done yet"
  const days = daysUntil(record.expiresOn, today)
  if (Number.isNaN(days)) return "Date unknown"
  const status = trainingStatus(record, today)
  if (status === "overdue") return `Overdue by ${dayCount(-days)}`
  if (status === "due-soon") {
    return days === 0 ? "Due today" : `Due in ${dayCount(days)}`
  }
  return "Up to date"
}

// ---------------------------------------------------------------------------
// Decide: who a reminder reaches
// ---------------------------------------------------------------------------

/** One person a reminder goes to. */
export interface Recipient {
  personId: string
  firstName: string
  /** Trimmed and lower-cased. */
  email: string
}

export interface ReminderPlan {
  /** The selected people who get a reminder, in the order given, once each. */
  personIds: string[]
  /** One per person in `personIds`: who the email is to and the name it uses. */
  recipients: Recipient[]
  /** Selected people who are left out, and why. */
  skipped: Skipped[]
}

const normalizeEmail = (email: string) =>
  typeof email === "string" ? email.trim().toLowerCase() : ""

/**
 * Turn selected rows into who would get a reminder.
 *
 * A person gets one when they are overdue or due within 30 days and have a
 * valid email address. Everyone else is listed in `skipped`, so the screen can
 * say what it left out instead of silently dropping it:
 *
 * - `up-to-date`: nothing to remind them about;
 * - `no-email`: no valid address, so they cannot be told;
 * - `duplicate`: the same person twice, or an address already in this send
 *   (one email per inbox, and nobody is told about someone else).
 */
export function planReminder(
  selected: readonly TrackerRow[],
  today: string
): ReminderPlan {
  const personIds: string[] = []
  const recipients: Recipient[] = []
  const skipped: Skipped[] = []
  const seenIds = new Set<string>()
  const seenEmails = new Set<string>()
  for (const { person, record } of selected) {
    if (seenIds.has(person.id)) {
      skipped.push({ id: person.id, reason: "duplicate" })
      continue
    }
    seenIds.add(person.id)
    const email = normalizeEmail(person.email)
    if (trainingStatus(record, today) === "up-to-date") {
      skipped.push({ id: person.id, reason: "up-to-date" })
    } else if (!isEmailAddress(email)) {
      skipped.push({ id: person.id, reason: "no-email" })
    } else if (seenEmails.has(email)) {
      skipped.push({ id: person.id, reason: "duplicate" })
    } else {
      seenEmails.add(email)
      personIds.push(person.id)
      recipients.push({
        personId: person.id,
        firstName: person.firstName.trim(),
        email,
      })
    }
  }
  return { personIds, recipients, skipped }
}

const SKIP_LABEL: Record<SkipReason, string> = {
  "up-to-date": "up to date",
  "no-email": "with no email address",
  duplicate: "duplicate",
}

/**
 * One sentence about what a selection left out, or null when nothing was left
 * out: "2 selected people are left out: 1 up to date, 1 with no email address."
 */
export function describeSkipped(skipped: readonly Skipped[]): string | null {
  if (skipped.length === 0) return null
  const parts = (Object.keys(SKIP_LABEL) as SkipReason[])
    .map((reason) => ({
      reason,
      count: skipped.filter((s) => s.reason === reason).length,
    }))
    .filter((p) => p.count > 0)
    .map((p) => `${p.count} ${SKIP_LABEL[p.reason]}`)
  const many = skipped.length !== 1
  return `${skipped.length} selected ${many ? "people are" : "person is"} left out: ${parts.join(", ")}.`
}

// ---------------------------------------------------------------------------
// The email
// ---------------------------------------------------------------------------

export interface ReminderEmail {
  to: string
  subject: string
  text: string
}

// Keeps a name on one line, so it cannot add a header or a paragraph.
const oneLine = (value: string) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()

/**
 * The reminder for one person. It names their first name and the training,
 * and nothing else personal: no surname, team, dates, status, or anyone else.
 * Build one per person, so nobody sees who else was reminded.
 */
export function buildReminderEmail(
  recipient: Pick<Recipient, "firstName" | "email">,
  trainingName: string
): ReminderEmail {
  const first = oneLine(recipient.firstName) || "there"
  const training = oneLine(trainingName)
  return {
    to: normalizeEmail(recipient.email),
    subject: `Reminder: ${training}`,
    text: `Hi ${first},\n\nThis is a reminder about your ${training}. Please get this done soon.\n\nIf you already have, you can ignore this email.`,
  }
}

// ---------------------------------------------------------------------------
// Act and Confirm: may this person do it, now?
// ---------------------------------------------------------------------------

/** The quiet hours, 21:00 to 08:00, in the tracker's time zone. */
export function quietHoursIn(timeZone: string): QuietHours {
  return { start: QUIET_START, end: QUIET_END, timeZone }
}

/**
 * Is `instant` between 21:00 and 08:00 on the wall clock of `timeZone`? 21:00
 * is quiet and 08:00 is not. Uses `isQuietTime` from `alert-rules`, so it
 * follows daylight saving. Throws a `RangeError` for an unknown zone.
 */
export function inQuietHours(instant: Date, timeZone: string): boolean {
  return isQuietTime(instant, quietHoursIn(timeZone))
}

/** Managers and admins can send reminders and sign people off. Staff cannot. */
export function canManage(role: TrackerRole | null | undefined): boolean {
  return role === "manager" || role === "admin"
}

export const ROLE_LABEL: Record<TrackerRole, string> = {
  staff: "Staff",
  manager: "Manager",
  admin: "Admin",
}

export type SendBlock = "not-allowed" | "nothing-to-send" | "quiet-hours"

export type SendCheck =
  | { ok: true }
  | { ok: false; code: SendBlock; reason: string }

/**
 * May this person send a reminder to `count` people at `at`? Checked in this
 * order, so the first thing that is wrong is the one named:
 *
 * 1. the role (only a manager or an admin);
 * 2. nobody to remind;
 * 3. quiet hours, 21:00 to 08:00 in `timeZone`.
 *
 * Run it in the browser for the message beside the button, and on the server
 * with the role from the session and the server's own clock: the server's
 * answer is the one that counts.
 */
export function checkReminderSend({
  role,
  count,
  at,
  timeZone,
}: {
  role: TrackerRole | null | undefined
  count: number
  at: Date
  timeZone: string
}): SendCheck {
  if (!canManage(role)) {
    return {
      ok: false,
      code: "not-allowed",
      reason: "Only a manager or an admin can send reminders",
    }
  }
  if (count <= 0) {
    return {
      ok: false,
      code: "nothing-to-send",
      reason: "Select at least one person who is overdue or due in 30 days",
    }
  }
  if (inQuietHours(at, timeZone)) {
    return {
      ok: false,
      code: "quiet-hours",
      reason: `No reminders between ${formatTimeOfDay(QUIET_START)} and ${formatTimeOfDay(QUIET_END)} (${timeZone}). Try again after ${formatTimeOfDay(QUIET_END)}`,
    }
  }
  return { ok: true }
}

export type SignOffBlock = "not-allowed" | "no-reason"

export type SignOffCheck =
  | { ok: true; reason: string }
  | { ok: false; code: SignOffBlock; error: string }

/**
 * May this person sign someone off with this reason? The role comes first,
 * then the reason: one of only spaces counts as none. On success the reason
 * comes back trimmed, ready to record.
 */
export function checkSignOff({
  role,
  reason,
}: {
  role: TrackerRole | null | undefined
  reason: string | null | undefined
}): SignOffCheck {
  if (!canManage(role)) {
    return {
      ok: false,
      code: "not-allowed",
      error: "Only a manager or an admin can sign someone off",
    }
  }
  const trimmed = typeof reason === "string" ? reason.trim() : ""
  if (!trimmed) {
    return {
      ok: false,
      code: "no-reason",
      error: "Add a reason for the sign-off",
    }
  }
  return { ok: true, reason: trimmed }
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

/** "1 person", "7 people". */
export const peopleCount = (n: number) => plural(n, "person", "people")
/** "1 day", "40 days". */
export const dayCount = (n: number) => plural(n, "day", "days")

/** "Tom Reyes". Leaves out a part that is empty. */
export function fullName(person: Pick<Person, "firstName" | "lastName">) {
  return [person.firstName, person.lastName]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ")
}

/** "Tom Reyes, Dan Whitlock, and 5 more": a short list for a log line. */
export function summarizeNames(names: readonly string[], max = 4): string {
  if (names.length <= max) return names.join(", ")
  return `${names.slice(0, max).join(", ")}, and ${names.length - max} more`
}
