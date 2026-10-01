/**
 * The shared shape of an audit entry, plus pure helpers to build, group, filter
 * and format them. No React, no network, so it is safe on a server (where the
 * record must be written) and to unit test.
 *
 * Nothing here stores or protects a record. An audit log is only as trustworthy
 * as the server that writes it.
 */

export type AuditOutcome = "succeeded" | "failed" | "blocked"

/** A person, optionally with the role they acted in. A plain string is just a name. */
export type AuditActor = string | { name: string; role?: string }

/** One line of "who did what, when, and why". */
export interface AuditEvent {
  /** Unique and stable. Used as the React key and to de-duplicate. */
  id: string
  /** When it happened, as an ISO 8601 string. Set by the SERVER's clock. */
  at: string
  /** Who did it. */
  actor: AuditActor
  /** A short verb phrase that reads between actor and target: "approved", "sent the summary to". */
  action: string
  /** What it acted on: "ECO-2041", "3 guardians". */
  target?: string
  /** Why. Required by your policy for some actions, e.g. approvals and overrides. */
  reason?: string
  /** How it ended. Leave out when the action has no pass/fail result. */
  outcome?: AuditOutcome
  /** Anything else worth reading: counts, ids, the meaning of a signature. No sensitive details. */
  detail?: string
}

/** What a caller supplies. The id and the time come from `buildAuditEvent`. */
export type AuditEventInput = Omit<AuditEvent, "id" | "at">

export interface BuildAuditEventOptions {
  /** The clock. Defaults to `new Date()`. Inject a fixed one in tests. */
  now?: () => Date
  /** The id source. Defaults to `crypto.randomUUID()`. Inject a counter in tests. */
  newId?: () => string
  /** Throw unless `input.reason` is a non-blank string. */
  requireReason?: boolean
}

/** Thrown by `buildAuditEvent` when the input cannot make a valid entry. */
export class AuditEventError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuditEventError"
  }
}

const clean = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Build one entry on the server, with the server's clock and a fresh id.
 * Throws an `AuditEventError` if there is no actor or action, or if
 * `requireReason` is set and the reason is missing or blank. Blank optional
 * fields are dropped, so a stored entry never carries empty strings.
 */
export function buildAuditEvent(
  input: AuditEventInput,
  options: BuildAuditEventOptions = {}
): AuditEvent {
  const now = options.now ?? (() => new Date())
  const newId = options.newId ?? (() => crypto.randomUUID())

  const name = clean(
    typeof input.actor === "string" ? input.actor : input.actor?.name
  )
  if (!name) {
    throw new AuditEventError("An audit event needs an actor: who did this?")
  }
  const role =
    typeof input.actor === "string" ? undefined : clean(input.actor.role)
  const actor: AuditActor =
    typeof input.actor === "string" ? name : role ? { name, role } : { name }
  const action = clean(input.action)
  if (!action) {
    throw new AuditEventError("An audit event needs an action: what was done?")
  }
  const reason = clean(input.reason)
  if (options.requireReason && !reason) {
    throw new AuditEventError(
      `An audit event for "${action}" needs a reason, and none was given.`
    )
  }
  const at = now()
  if (!(at instanceof Date) || Number.isNaN(at.getTime())) {
    throw new AuditEventError("The clock did not return a valid date.")
  }

  const target = clean(input.target)
  const detail = clean(input.detail)
  return {
    id: newId(),
    at: at.toISOString(),
    actor,
    action,
    ...(target ? { target } : {}),
    ...(reason ? { reason } : {}),
    ...(input.outcome ? { outcome: input.outcome } : {}),
    ...(detail ? { detail } : {}),
  }
}

/** The actor's display name. */
export function actorName(actor: AuditActor): string {
  return typeof actor === "string" ? actor : actor.name
}

/** The actor's role, if one was given. */
export function actorRole(actor: AuditActor): string | undefined {
  return typeof actor === "string" ? undefined : actor.role
}

const DEFAULT_LOCALE = "en-US"

const formatters = new Map<string, Intl.DateTimeFormat>()
function formatter(
  key: string,
  locale: string,
  options: Intl.DateTimeFormatOptions
) {
  const cacheKey = `${key}|${locale}|${options.timeZone}`
  let format = formatters.get(cacheKey)
  if (!format) {
    try {
      format = new Intl.DateTimeFormat(locale, options)
    } catch {
      throw new RangeError(
        `Unknown time zone "${options.timeZone}". Use an IANA name such as "America/New_York" or "UTC".`
      )
    }
    formatters.set(cacheKey, format)
  }
  return format
}

/** Milliseconds since the epoch for an ISO string, or `null` when it does not parse. */
function parseAt(at: string): number | null {
  const ms = typeof at === "string" ? Date.parse(at) : Number.NaN
  return Number.isNaN(ms) ? null : ms
}

/** The calendar date of an instant in a time zone, as "YYYY-MM-DD". */
function dayKey(ms: number, timeZone: string): string {
  const parts = formatter("day", "en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ms)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")}`
}

export interface AuditDay {
  /** "YYYY-MM-DD" in the requested time zone, or "unknown" for entries whose date does not parse. */
  day: string
  /** A readable heading: "Friday, October 2, 2026", or "Date unknown". */
  label: string
  /** Newest first. Entries with the same instant keep the order they were given in. */
  events: AuditEvent[]
}

export interface GroupOptions {
  /** BCP 47 locale for the day heading. Defaults to "en-US". */
  locale?: string
}

/**
 * Group entries into calendar days in `timeZone`, newest day first and newest
 * entry first within a day. Entries with the same instant keep their input
 * order. A day is a day in that zone, so a 23-hour or 25-hour day on a clock
 * change is still one group. Entries whose `at` does not parse are collected in
 * one "Date unknown" group at the end rather than dropped or thrown on.
 * Throws a `RangeError` for an unknown `timeZone`.
 */
export function groupByDay(
  events: AuditEvent[],
  timeZone: string,
  { locale = DEFAULT_LOCALE }: GroupOptions = {}
): AuditDay[] {
  const dated: { event: AuditEvent; ms: number; index: number }[] = []
  const unknown: AuditEvent[] = []
  events.forEach((event, index) => {
    const ms = parseAt(event.at)
    if (ms === null) unknown.push(event)
    else dated.push({ event, ms, index })
  })
  // Validates the time zone even when every entry is undated.
  dayKey(0, timeZone)

  dated.sort((a, b) => b.ms - a.ms || a.index - b.index)

  const days: AuditDay[] = []
  const headingFormat = formatter("heading", locale, {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  for (const { event, ms } of dated) {
    const key = dayKey(ms, timeZone)
    const last = days[days.length - 1]
    if (last && last.day === key) {
      last.events.push(event)
    } else {
      days.push({ day: key, label: headingFormat.format(ms), events: [event] })
    }
  }
  if (unknown.length > 0) {
    days.push({ day: "unknown", label: "Date unknown", events: unknown })
  }
  return days
}

export interface FormatEventTimeOptions {
  /** BCP 47 locale. Defaults to "en-US". */
  locale?: string
  /** Leave out the date: "2:05:09 PM EDT". Use under a day heading. */
  timeOnly?: boolean
}

export interface FormattedEventTime {
  /** The absolute time, with the zone: "Oct 2, 2026, 2:05:09 PM EDT". "Time unknown" when `at` does not parse. */
  label: string
  /** The instant as a normalised ISO string for `<time dateTime>`, or `null` when `at` does not parse. */
  iso: string | null
}

/** An absolute label (to the second, with the zone) and the ISO string for `<time dateTime>`. */
export function formatEventTime(
  at: string,
  timeZone: string,
  { locale = DEFAULT_LOCALE, timeOnly = false }: FormatEventTimeOptions = {}
): FormattedEventTime {
  const ms = parseAt(at)
  const format = formatter(timeOnly ? "time" : "datetime", locale, {
    timeZone,
    ...(timeOnly ? {} : { year: "numeric", month: "short", day: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  })
  if (ms === null) return { label: "Time unknown", iso: null }
  return { label: format.format(ms), iso: new Date(ms).toISOString() }
}

/**
 * "5 minutes ago". Secondary to the absolute time; never the only time shown.
 * Returns `null` when `at` does not parse.
 */
export function formatRelativeTime(
  at: string,
  now: Date | number,
  locale: string = DEFAULT_LOCALE
): string | null {
  const ms = parseAt(at)
  if (ms === null) return null
  const diff = ms - (typeof now === "number" ? now : now.getTime())
  const abs = Math.abs(diff)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ]
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (abs < 60_000) return format.format(0, "second")
  for (const [unit, size] of units) {
    if (abs >= size) return format.format(Math.trunc(diff / size), unit)
  }
  return null
}

export interface AuditFilter {
  /** Match this actor's name exactly. */
  actor?: string
  /** Match this action exactly. */
  action?: string
}

/** Keep the entries that match every filter given. An empty filter keeps everything. */
export function filterAuditEvents(
  events: AuditEvent[],
  { actor, action }: AuditFilter
): AuditEvent[] {
  return events.filter(
    (event) =>
      (!actor || actorName(event.actor) === actor) &&
      (!action || event.action === action)
  )
}

/** The distinct actor names, sorted, for a filter control. */
export function distinctActors(events: AuditEvent[]): string[] {
  return [...new Set(events.map((e) => actorName(e.actor)))].sort((a, b) =>
    a.localeCompare(b)
  )
}

/** The distinct actions, sorted, for a filter control. */
export function distinctActions(events: AuditEvent[]): string[] {
  return [...new Set(events.map((e) => e.action))].sort((a, b) =>
    a.localeCompare(b)
  )
}
