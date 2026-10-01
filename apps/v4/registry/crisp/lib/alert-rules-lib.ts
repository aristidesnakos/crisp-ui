/**
 * Pure helpers for the alert-rules pattern: validate and describe a reminder
 * rule, and answer "is this a quiet time?" for a time zone. No React, no
 * network, no clock (every instant is passed in), so it is safe to unit test
 * and to run on a server.
 *
 * This is the rule, not the scheduler. Nothing here sends or schedules
 * anything, and a setting in a UI is not enforcement: the server that sends
 * must call `isQuietTime` / `nextAllowedSendTime` itself.
 */

/** A daily window in which nothing is sent. Wall-clock times in `timeZone`. */
export interface QuietHours {
  /** "HH:MM", 24-hour. The window includes this minute. */
  start: string
  /** "HH:MM", 24-hour. The window ends just before this minute. */
  end: string
  /** An IANA zone name such as "America/New_York". */
  timeZone: string
}

export interface AlertRule {
  id: string
  /** What the rule is for, e.g. "Calibration due". */
  label: string
  enabled: boolean
  /** Days BEFORE the due date to remind, e.g. [30, 14, 7, 1]. */
  cadenceDays: number[]
  /** Escalate when the item is still open this many days after the due date. */
  escalateAfterDays?: number
  /** Who hears about an escalation. An email address. */
  escalateTo?: string
  /** Hours when nothing is sent. `null` or missing means any hour. */
  quietHours?: QuietHours | null
}

/** The largest cadence step accepted, to keep date maths sane. */
export const MAX_CADENCE_DAYS = 3650

export type RuleField =
  | "cadenceDays"
  | "escalateAfterDays"
  | "escalateTo"
  | "quietHours.start"
  | "quietHours.end"
  | "quietHours.timeZone"

export type RuleErrorCode =
  | "cadence-empty"
  | "cadence-invalid"
  | "cadence-too-large"
  | "cadence-duplicate"
  | "escalation-days-invalid"
  | "escalation-days-missing"
  | "escalation-target-missing"
  | "escalation-target-invalid"
  | "time-invalid"
  | "quiet-same"
  | "zone-invalid"

export interface RuleError {
  /** Stable, for tests and for translating the message. */
  code: RuleErrorCode
  /** A calm sentence a person can act on. */
  message: string
}

/** At most one error per field. An empty object means the rule is valid. */
export type RuleErrors = Partial<Record<RuleField, RuleError>>

// Deliberately close to what servers accept (e.g. zod's .email()): no empty or
// dotted-edge local parts, no doubled dots, a real domain and a 2+ letter TLD.
// Same check as `recipient-roster`. Pass `validateEmail` to match your backend.
const EMAIL =
  /^(?!\.)(?!.*\.\.)[^\s@,;]+(?<!\.)@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i

/** The default email check used when no `validateEmail` is passed. */
export function isEmailAddress(email: string): boolean {
  return EMAIL.test(email)
}

const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)$/
const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/** "HH:MM" to minutes after midnight, or null if it is not a valid 24-hour time. */
export function parseTimeOfDay(value: string): number | null {
  const match = typeof value === "string" ? TIME_OF_DAY.exec(value) : null
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/**
 * True for a region name the runtime knows ("America/New_York", "Asia/Kolkata",
 * "UTC"). Fixed offsets such as "+05:30" are refused: they cannot follow
 * daylight saving, which is the point of naming a zone.
 */
export function isValidTimeZone(timeZone: string): boolean {
  if (typeof timeZone !== "string") return false
  if (timeZone === "" || timeZone !== timeZone.trim()) return false
  if (/^[+-]/.test(timeZone)) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    return true
  } catch {
    return false
  }
}

const isWholeDays = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0

/**
 * Check one rule. Returns an object keyed by field, empty when valid:
 *
 * - cadence: whole numbers of 1 or more, no duplicates, at most 3650, and not
 *   empty while the rule is enabled (a disabled draft may be empty);
 * - escalation: days and an address go together, days are a whole number of 1
 *   or more, and the address passes `validateEmail`;
 * - quiet hours (when set): both times are "HH:MM", they differ, and the zone
 *   is a real IANA name.
 *
 * Run it on the server before saving as well. It does not check `id` or `label`.
 */
export function validateRule(
  rule: AlertRule,
  {
    validateEmail = isEmailAddress,
  }: { validateEmail?: (email: string) => boolean } = {}
): RuleErrors {
  const errors: RuleErrors = {}

  // Cadence.
  const days = Array.isArray(rule.cadenceDays) ? rule.cadenceDays : []
  const bad = days.filter((d) => !isWholeDays(d))
  const tooBig = days.filter((d) => isWholeDays(d) && d > MAX_CADENCE_DAYS)
  const repeated = [
    ...new Set(days.filter((d, i) => days.indexOf(d) !== i && isWholeDays(d))),
  ]
  if (bad.length > 0) {
    errors.cadenceDays = {
      code: "cadence-invalid",
      message: `Days must be whole numbers of 1 or more. Check ${bad.map(String).join(", ")}.`,
    }
  } else if (tooBig.length > 0) {
    errors.cadenceDays = {
      code: "cadence-too-large",
      message: `Days can be at most ${MAX_CADENCE_DAYS}. Check ${tooBig.join(", ")}.`,
    }
  } else if (repeated.length > 0) {
    errors.cadenceDays = {
      code: "cadence-duplicate",
      message: `${repeated.join(", ")} ${repeated.length === 1 ? "appears" : "appear"} more than once.`,
    }
  } else if (days.length === 0 && rule.enabled) {
    errors.cadenceDays = {
      code: "cadence-empty",
      message: "Add at least one reminder day, or turn the rule off.",
    }
  }

  // Escalation: days and a target go together.
  const afterDays = rule.escalateAfterDays
  const hasDays = afterDays !== undefined && afterDays !== null
  const target =
    typeof rule.escalateTo === "string" ? rule.escalateTo.trim() : ""
  if (hasDays && !isWholeDays(afterDays)) {
    errors.escalateAfterDays = {
      code: "escalation-days-invalid",
      message: "Use a whole number of days, 1 or more.",
    }
  } else if (!hasDays && target) {
    errors.escalateAfterDays = {
      code: "escalation-days-missing",
      message: "Say how many days after the due date, or clear the address.",
    }
  }
  if (hasDays && !target) {
    errors.escalateTo = {
      code: "escalation-target-missing",
      message: "Add who to escalate to, or clear the days.",
    }
  } else if (target && !validateEmail(target.toLowerCase())) {
    errors.escalateTo = {
      code: "escalation-target-invalid",
      message: `“${target}” doesn’t look like an email address.`,
    }
  }

  // Quiet hours.
  const quiet = rule.quietHours
  if (quiet) {
    const start = parseTimeOfDay(quiet.start)
    const end = parseTimeOfDay(quiet.end)
    if (start === null) {
      errors["quietHours.start"] = {
        code: "time-invalid",
        message: "Enter a start time such as 21:00.",
      }
    }
    if (end === null) {
      errors["quietHours.end"] = {
        code: "time-invalid",
        message: "Enter an end time such as 08:00.",
      }
    }
    if (start !== null && end !== null && start === end) {
      errors["quietHours.end"] = {
        code: "quiet-same",
        message: "The end time must differ from the start time.",
      }
    }
    if (!isValidTimeZone(quiet.timeZone)) {
      errors["quietHours.timeZone"] = {
        code: "zone-invalid",
        message: quiet.timeZone
          ? `“${quiet.timeZone}” is not a time zone name. Use one like America/New_York.`
          : "Choose a time zone, such as America/New_York.",
      }
    }
  }

  return errors
}

/** True when `validateRule` found nothing wrong. */
export function isRuleValid(errors: RuleErrors): boolean {
  return Object.keys(errors).length === 0
}

/**
 * The canonical form to save: cadence unique and sorted largest first, the
 * escalation address trimmed and lowercased (an empty one is dropped), the
 * quiet-hours strings trimmed. It does not drop invalid values, so
 * `validateRule` still sees what was typed.
 */
export function normalizeRule(rule: AlertRule): AlertRule {
  const out: AlertRule = {
    id: rule.id,
    label: rule.label,
    enabled: rule.enabled,
    cadenceDays: [...new Set(rule.cadenceDays)].sort((a, b) => b - a),
  }
  if (rule.escalateAfterDays !== undefined && rule.escalateAfterDays !== null) {
    out.escalateAfterDays = rule.escalateAfterDays
  }
  const target = rule.escalateTo?.trim().toLowerCase()
  if (target) out.escalateTo = target
  if (rule.quietHours === null) {
    out.quietHours = null
  } else if (rule.quietHours) {
    out.quietHours = {
      start: rule.quietHours.start.trim(),
      end: rule.quietHours.end.trim(),
      timeZone: rule.quietHours.timeZone.trim(),
    }
  }
  return out
}

const ruleKey = (rule: AlertRule) => {
  const r = normalizeRule(rule)
  return JSON.stringify([
    r.id,
    r.label,
    r.enabled,
    r.cadenceDays,
    r.escalateAfterDays ?? null,
    r.escalateTo ?? null,
    r.quietHours
      ? [r.quietHours.start, r.quietHours.end, r.quietHours.timeZone]
      : null,
  ])
}

/**
 * Same rules in the same order, compared in normalized form, so reordering a
 * rule's cadence or retyping an address in capitals is not a change worth
 * saving. Use it to decide `dirty` for `save-bar`.
 */
export function sameRules(a: AlertRule[], b: AlertRule[]): boolean {
  return (
    a.length === b.length &&
    a.every((rule, i) => ruleKey(rule) === ruleKey(b[i]))
  )
}

// ---------------------------------------------------------------------------
// Quiet hours
// ---------------------------------------------------------------------------

interface Window {
  start: number
  end: number
  timeZone: string
}

/** Validates and parses; throws so a bad rule can never silently mean "send". */
function toWindow(quiet: QuietHours | null | undefined): Window | null {
  if (!quiet) return null
  const start = parseTimeOfDay(quiet.start)
  const end = parseTimeOfDay(quiet.end)
  if (start === null)
    throw new RangeError(`Invalid quiet-hours start: "${quiet.start}"`)
  if (end === null)
    throw new RangeError(`Invalid quiet-hours end: "${quiet.end}"`)
  if (start === end) {
    throw new RangeError("Quiet-hours start and end must differ")
  }
  if (!isValidTimeZone(quiet.timeZone)) {
    throw new RangeError(`Invalid time zone: "${quiet.timeZone}"`)
  }
  return { start, end, timeZone: quiet.timeZone }
}

function assertInstant(instant: Date, name: string): void {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new RangeError(`${name} must be a valid Date`)
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>()

/** Minutes after midnight on the wall clock of `timeZone` at `ms`. */
function minutesOfDay(ms: number, timeZone: string): number {
  let format = formatters.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      hour: "numeric",
      minute: "numeric",
    })
    formatters.set(timeZone, format)
  }
  let hour = NaN
  let minute = NaN
  for (const part of format.formatToParts(ms)) {
    if (part.type === "hour") hour = Number(part.value)
    else if (part.type === "minute") minute = Number(part.value)
  }
  return (hour % 24) * 60 + minute
}

/** Start is inside the window, end is outside. Handles windows that cross midnight. */
function isQuietMinute(minute: number, { start, end }: Window): boolean {
  return start < end
    ? minute >= start && minute < end
    : minute >= start || minute < end
}

const isQuietAt = (ms: number, win: Window) =>
  isQuietMinute(minutesOfDay(ms, win.timeZone), win)

/**
 * Is `instant` inside the quiet window, by the wall clock in the window's time
 * zone? The window includes its start minute and excludes its end minute, so
 * "21:00 to 08:00" is quiet at 21:00 and sends are allowed from 08:00. It may
 * cross midnight.
 *
 * Wall-clock semantics: on a clock-change day the window follows the clock, so
 * the 21:00 to 08:00 night that spans a spring-forward is 10 real hours and the
 * one that spans a fall-back is 12. A window inside the skipped hour never
 * matches; one inside the repeated hour matches both times round.
 *
 * `null` or `undefined` means no quiet hours, so it is never quiet. A window
 * that is not valid (bad time, equal start and end, unknown zone) throws a
 * `RangeError` instead of guessing; run `validateRule` first. Throws on an
 * invalid `instant` too.
 */
export function isQuietTime(
  instant: Date,
  quietHours: QuietHours | null | undefined
): boolean {
  const win = toWindow(quietHours)
  assertInstant(instant, "instant")
  if (!win) return false
  return isQuietAt(instant.getTime(), win)
}

/**
 * The earliest instant at or after `instant` when sending is allowed, to the
 * minute. It is `instant` itself (a copy) when that is not a quiet time, so it
 * is safe to call on every send. Otherwise it is the first minute the quiet
 * window is over, which is the end time on the wall clock, or the first
 * instant after the clock skipped it. Same errors as `isQuietTime`.
 */
export function nextAllowedSendTime(
  instant: Date,
  quietHours: QuietHours | null | undefined
): Date {
  const win = toWindow(quietHours)
  assertInstant(instant, "instant")
  const at = instant.getTime()
  if (!win || !isQuietAt(at, win)) return new Date(at)

  // Jump to the next time the wall clock reads the end time. A clock change in
  // between makes the jump land early (fall back: still quiet, so jump again)
  // or late (spring forward: walk back below).
  let t = Math.floor(at / MINUTE) * MINUTE
  for (let attempt = 0; attempt < 4 && isQuietAt(t, win); attempt++) {
    const minute = minutesOfDay(t, win.timeZone)
    t += ((win.end - minute + 24 * 60) % (24 * 60)) * MINUTE
  }
  if (isQuietAt(t, win)) {
    throw new Error("Could not find the end of the quiet window")
  }
  // Walk back to the first minute of the allowed stretch that follows `at`.
  while (t - MINUTE > at && !isQuietAt(t - MINUTE, win)) t -= MINUTE
  return new Date(t)
}

// ---------------------------------------------------------------------------
// Cadence
// ---------------------------------------------------------------------------

export interface ReminderStep {
  /** How many days before the due date this step falls. */
  days: number
  /** The instant: exactly `days` x 24 hours before the due date. */
  at: Date
}

export interface RemindersDue {
  /** Steps whose time has come (at or before `now`), earliest first. */
  passed: ReminderStep[]
  /** The next step still ahead, or null if there is none. */
  next: ReminderStep | null
  /** True when the due date itself is at or before `now`. */
  pastDue: boolean
}

/**
 * Which cadence steps have passed as of `now`, and which is next. A step is
 * the due date minus `days` whole 24-hour days (not calendar days, so across a
 * clock change it can sit an hour off local wall time). Values that are not
 * whole numbers of 1 or more are ignored and repeats count once, so run
 * `validateRule` first. It does not know what you have already sent: keep that
 * record yourself and send only what is missing. Throws on an invalid date.
 */
export function remindersDue(
  dueDate: Date,
  now: Date,
  cadenceDays: number[]
): RemindersDue {
  assertInstant(dueDate, "dueDate")
  assertInstant(now, "now")
  const steps: ReminderStep[] = [...new Set(cadenceDays)]
    .filter(isWholeDays)
    .sort((a, b) => b - a)
    .map((days) => ({ days, at: new Date(dueDate.getTime() - days * DAY) }))
  return {
    passed: steps.filter((step) => step.at.getTime() <= now.getTime()),
    next: steps.find((step) => step.at.getTime() > now.getTime()) ?? null,
    pastDue: dueDate.getTime() <= now.getTime(),
  }
}

// ---------------------------------------------------------------------------
// Plain language
// ---------------------------------------------------------------------------

/** "21:00" to "9:00 pm". Returns the input unchanged if it is not a valid time. */
export function formatTimeOfDay(value: string): string {
  const minutes = parseTimeOfDay(value)
  if (minutes === null) return value
  const hour = Math.floor(minutes / 60)
  const minute = String(minutes % 60).padStart(2, "0")
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "pm" : "am"}`
}

const unit = (n: number) => (n === 1 ? "day" : "days")

function joinNumbers(list: number[]): string {
  if (list.length <= 1) return list.join("")
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`
}

/**
 * The sentence a person reads to check a rule, for example "Reminds 30, 14, 7
 * and 1 days before. Escalates to ops@example.org after 3 days. Never sends
 * between 9:00 pm and 8:00 am." It says out loud what the rule does not do
 * ("Does not escalate.", "Can send at any hour."). Safe to call on a rule that
 * is half edited; unfinished parts are named as unfinished. A disabled rule
 * says it is off first.
 *
 * Pass `includeTimeZone` to add the zone after the quiet hours.
 */
export function summarizeRule(
  rule: AlertRule,
  { includeTimeZone = false }: { includeTimeZone?: boolean } = {}
): string {
  const parts: string[] = []

  const days = [...new Set(rule.cadenceDays)]
    .filter(isWholeDays)
    .sort((a, b) => b - a)
  parts.push(
    days.length === 0
      ? "Sends no reminders yet."
      : `Reminds ${joinNumbers(days)} ${days.length === 1 ? unit(days[0]) : "days"} before.`
  )

  const after = rule.escalateAfterDays
  const target = rule.escalateTo?.trim().toLowerCase() ?? ""
  if (isWholeDays(after) && target) {
    parts.push(`Escalates to ${target} after ${after} ${unit(after)}.`)
  } else if ((after !== undefined && after !== null) || target) {
    parts.push("Escalation is not finished.")
  } else {
    parts.push("Does not escalate.")
  }

  const quiet = rule.quietHours
  if (!quiet) {
    parts.push("Can send at any hour.")
  } else {
    const start = parseTimeOfDay(quiet.start)
    const end = parseTimeOfDay(quiet.end)
    if (start === null || end === null || start === end) {
      parts.push("Quiet hours are not finished.")
    } else {
      const zone =
        includeTimeZone && quiet.timeZone ? ` (${quiet.timeZone})` : ""
      parts.push(
        `Never sends between ${formatTimeOfDay(quiet.start)} and ${formatTimeOfDay(quiet.end)}${zone}.`
      )
    }
  }

  const text = parts.join(" ")
  return rule.enabled
    ? text
    : `This rule is off, so nothing is sent. If turned on: ${text.charAt(0).toLowerCase()}${text.slice(1)}`
}
