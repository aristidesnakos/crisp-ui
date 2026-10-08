/**
 * DEMO STAND-IN. REPLACE THIS FILE'S `createMemoryServer()` WITH REAL CALLS.
 *
 * `TrainingTracker` talks to a `TrainingTrackerServer` (see
 * `training-tracker-lib.ts`) and to nothing else. This file is the fake one: it
 * keeps the people, their records and the audit log in memory, answers after a
 * short delay, and can be told to fail a send. Nothing here is saved, and no
 * email is ever delivered: the emails it builds wait in `outbox`.
 *
 * To make it real, change ONE place: pass your own object to
 * `<TrainingTracker server={...} />`, with the same three methods, each a
 * request to your backend (your sign-in and your database). Then delete this
 * file. The rules this fake follows are the rules your server must follow:
 *
 * - It takes the user from the session. Here a `userId` is passed in only
 *   because there is no session, and it looks the person up in its own table.
 * - Only a manager or an admin may send reminders or sign someone off. It
 *   checks the role itself (`checkReminderSend`, `checkSignOff`), even when the
 *   browser already hid the button. A staff member calling it directly is
 *   refused.
 * - A sign-off needs a written reason. A blank one is refused.
 * - No reminders between 21:00 and 08:00 in the tracker's time zone, by the
 *   server's own clock.
 * - Each email has the person's first name and the training name, nothing else
 *   personal (`buildReminderEmail`), and goes to one person only.
 * - It writes exactly one audit event per send (however many people it
 *   reaches), per sign-off, per refusal and per failure, in the same step that
 *   does the thing, so the record exists even if the page is closed.
 * - It stamps times and ids with its own clock. The browser never makes those up.
 *
 * THE DEMO CLOCK. The block runs this fake on `createDemoClock()`: today, from
 * 09:30 in the tracker's time zone, so the demo can send at any hour. A real
 * server must use the real clock (`() => new Date()`, the default here), and
 * then a send at 22:00 is refused.
 *
 * Example data only.
 */
import {
  parseTimeOfDay,
  type AlertRule,
} from "@/registry/crisp/lib/alert-rules-lib"
import {
  buildAuditEvent,
  type AuditEvent,
  type AuditEventInput,
} from "@/registry/crisp/lib/audit-event"
import {
  addDays,
  addMonths,
  buildReminderEmail,
  checkReminderSend,
  checkSignOff,
  describeSkipped,
  fullName,
  peopleCount,
  planReminder,
  quietHoursIn,
  ROLE_LABEL,
  summarizeNames,
  todayIn,
  type ReminderEmail,
  type Requirement,
  type TrackerRow,
  type TrackerState,
  type TrackerUser,
  type TrainingTrackerServer,
} from "@/registry/crisp/lib/training-tracker-lib"

/** The people the demo can be viewed as. Joy and Hannah can act; Sam can only look. */
export const DEMO_USERS: TrackerUser[] = [
  { id: "joy", name: "Joy Okafor", role: "manager" },
  { id: "hannah", name: "Hannah Price", role: "admin" },
  { id: "sam", name: "Sam Osei", role: "staff" },
]

/** What everyone in the demo must complete. */
export const DEMO_REQUIREMENT: Requirement = {
  id: "safeguarding",
  name: "Safeguarding training",
  renewalMonths: 12,
}

/** Where the demo tracker runs. Quiet hours are counted on this clock. */
export const DEMO_TIME_ZONE = "Europe/London"

/** Example rule, shown read-only on the screen. Quiet hours match what the server enforces. */
export function demoRule(timeZone: string = DEMO_TIME_ZONE): AlertRule {
  return {
    id: "training-due",
    label: "Training due",
    enabled: true,
    cadenceDays: [30, 7],
    escalateAfterDays: 7,
    escalateTo: "managers@example.org",
    quietHours: quietHoursIn(timeZone),
  }
}

// Days from today until each person's training runs out. Relative to the
// clock, so the demo always has the same 3 overdue, 4 due within 30 days and
// 11 up to date, whenever it is opened.
const SEED: [first: string, last: string, team: string, expires: number][] = [
  ["Tom", "Reyes", "Warehouse", -40],
  ["Dan", "Whitlock", "Field team", -12],
  ["Priya", "Shah", "Front desk", -3],
  ["Grace", "Liu", "Office", 6],
  ["Sam", "Osei", "Operations", 11],
  ["Mia", "Novak", "Finance", 19],
  ["Ben", "Carter", "Kitchen", 27],
  ["Hannah", "Price", "Management", 60],
  ["Omar", "Haddad", "Operations", 83],
  ["Ruth", "Adeyemi", "Office", 106],
  ["Leo", "Fischer", "Warehouse", 129],
  ["Isla", "Grant", "Front desk", 152],
  ["Kwame", "Boateng", "Field team", 175],
  ["Sofia", "Rossi", "Kitchen", 198],
  ["Arjun", "Mehta", "IT", 221],
  ["Ella", "Brooks", "Finance", 244],
  ["Noah", "Kim", "Operations", 267],
  ["Zara", "Ali", "Warehouse", 290],
]

/** The demo's people and records, expiry dates counted from `today` ("YYYY-MM-DD"). */
export function seedRows(
  today: string,
  requirement: Requirement = DEMO_REQUIREMENT
): TrackerRow[] {
  return SEED.map(([firstName, lastName, team, expires], i) => {
    const id = `p-${i + 1}`
    const expiresOn = addDays(today, expires)
    return {
      person: {
        id,
        firstName,
        lastName,
        team,
        email: `${firstName.toLowerCase()}@example.org`,
      },
      record: {
        personId: id,
        completedOn: addMonths(expiresOn, -requirement.renewalMonths),
        expiresOn,
      },
    }
  })
}

const MINUTE = 60_000
const wallClockFormats = new Map<string, Intl.DateTimeFormat>()

/** Minutes after midnight on the wall clock of `timeZone` at `ms`. */
function wallClockMinutes(ms: number, timeZone: string): number {
  let format = wallClockFormats.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      hour: "numeric",
      minute: "numeric",
    })
    wallClockFormats.set(timeZone, format)
  }
  let hour = 0
  let minute = 0
  for (const part of format.formatToParts(ms)) {
    if (part.type === "hour") hour = Number(part.value) % 24
    else if (part.type === "minute") minute = Number(part.value)
  }
  return hour * 60 + minute
}

/** A clock for the demo only. A real server uses the real one. */
export interface DemoClock {
  /** The demo's time: today from 09:30 in the zone, moving with real time. */
  now: () => Date
  /** While true, the clock reads from 22:00 instead, inside quiet hours. */
  evening: boolean
}

/**
 * The demo's clock: today in `timeZone`, from 09:30 on the wall clock, moving
 * forward with real time from there. It lets the demo send at any real hour;
 * set `evening` to see quiet hours refuse a send. Never use it for real sends.
 */
export function createDemoClock(
  timeZone: string = DEMO_TIME_ZONE,
  realNow: () => number = Date.now
): DemoClock {
  const created = realNow()
  const minutes = wallClockMinutes(created, timeZone)
  const shiftTo = (time: string) =>
    ((parseTimeOfDay(time) ?? minutes) - minutes) * MINUTE
  const day = shiftTo("09:30")
  const night = shiftTo("22:00")
  const clock: DemoClock = {
    evening: false,
    now: () => new Date(realNow() + (clock.evening ? night : day)),
  }
  return clock
}

export interface MemoryServerOptions {
  /** The server's clock. Defaults to the real one. Inject a fixed one in tests. */
  now?: () => Date
  /** How long each call takes, in milliseconds. Default 350. Use 0 in tests. */
  delayMs?: number
  /** The tracker's IANA time zone. Default "Europe/London". */
  timeZone?: string
}

/** The in-memory server, plus what the demo and the tests look at. */
export interface MemoryServer extends TrainingTrackerServer {
  /** While true, `sendReminders` fails after recording a "failed" event. */
  failSend: boolean
  /** The same answer as `load()`, without the delay. Used for the first paint. */
  snapshot(): TrackerState
  /** Every email it built, oldest first. Nothing is delivered. */
  readonly outbox: readonly ReminderEmail[]
}

export function createMemoryServer(
  options: MemoryServerOptions = {}
): MemoryServer {
  const now = options.now ?? (() => new Date())
  const delayMs = options.delayMs ?? 350
  const timeZone = options.timeZone ?? DEMO_TIME_ZONE
  const wait = () =>
    delayMs > 0
      ? new Promise<void>((resolve) => setTimeout(resolve, delayMs))
      : Promise.resolve()

  const requirement = DEMO_REQUIREMENT
  const rule = demoRule(timeZone)
  const rows = seedRows(todayIn(now(), timeZone), requirement)
  const events: AuditEvent[] = []
  const outbox: ReminderEmail[] = []
  let eventCount = 0

  function record(input: AuditEventInput, requireReason = false) {
    events.push(
      buildAuditEvent(input, {
        now,
        newId: () => `evt_${++eventCount}`,
        requireReason,
      })
    )
  }

  const actorOf = (user: TrackerUser) => ({
    name: user.name,
    role: ROLE_LABEL[user.role],
  })

  function userOf(userId: string): TrackerUser {
    const user = DEMO_USERS.find((u) => u.id === userId)
    if (!user) throw new Error("Unknown user. Sign in again.")
    return user
  }

  /** Writes one "blocked" event, then throws: a refusal is part of the record. */
  function refuse(
    user: TrackerUser,
    action: string,
    target: string,
    why: string
  ): never {
    record({
      actor: actorOf(user),
      action,
      target,
      reason: why,
      outcome: "blocked",
      detail: "Nothing was changed.",
    })
    throw new Error(why)
  }

  function snapshot(): TrackerState {
    return {
      asOf: now().toISOString(),
      timeZone,
      requirement: { ...requirement },
      rows: rows.map((row) => ({
        person: { ...row.person },
        record: row.record && { ...row.record },
      })),
      rule: { ...rule, cadenceDays: [...rule.cadenceDays] },
      events: [...events],
    }
  }

  const server: MemoryServer = {
    failSend: false,
    snapshot,
    outbox,

    async load() {
      await wait()
      return snapshot()
    },

    async sendReminders({ userId, personIds }) {
      await wait()
      const user = userOf(userId)
      const at = now()
      // The server works out who can be reminded from its own rows. Ids it
      // does not know are ignored.
      const selected = personIds.flatMap((id) =>
        rows.filter((row) => row.person.id === id)
      )
      const plan = planReminder(selected, todayIn(at, timeZone))
      const target = peopleCount(plan.personIds.length)
      const action = "tried to send a reminder to"
      const check = checkReminderSend({
        role: user.role,
        count: plan.personIds.length,
        at,
        timeZone,
      })
      if (!check.ok) refuse(user, action, target, check.reason)

      if (server.failSend) {
        record({
          actor: actorOf(user),
          action,
          target,
          outcome: "failed",
          detail:
            "Nothing was delivered: the mail service did not answer. It is safe to try again.",
        })
        throw new Error("The mail service did not answer")
      }

      // One email per person, built from their first name and the training
      // name only. A real server hands these to its mail service here.
      const names: string[] = []
      for (const recipient of plan.recipients) {
        outbox.push(buildReminderEmail(recipient, requirement.name))
        const row = rows.find((r) => r.person.id === recipient.personId)
        if (!row) continue
        names.push(fullName(row.person))
        row.record = {
          ...(row.record ?? { personId: row.person.id }),
          remindedAt: at.toISOString(),
        }
      }
      const skipped = describeSkipped(plan.skipped)
      // ONE entry for the whole send, however many people it reached.
      record({
        actor: actorOf(user),
        action: "sent a reminder to",
        target,
        outcome: "succeeded",
        detail: `${requirement.name}. One email each, with their first name and the training name only. To: ${summarizeNames(names, 10)}.${skipped ? ` ${skipped}` : ""}`,
      })
      return {
        sent: plan.personIds.length,
        personIds: plan.personIds,
        skipped: plan.skipped,
      }
    },

    async signOff({ userId, personId, reason }) {
      await wait()
      const user = userOf(userId)
      const row = rows.find((r) => r.person.id === personId)
      const target = row ? fullName(row.person) : "someone not on the list"
      const action = "tried to sign off"
      const check = checkSignOff({ role: user.role, reason })
      if (!check.ok) refuse(user, action, target, check.error)
      if (!row) refuse(user, action, target, "That person is not on the list.")

      const at = now()
      const completedOn = todayIn(at, timeZone)
      const expiresOn = addMonths(completedOn, requirement.renewalMonths)
      row.record = {
        ...(row.record ?? { personId }),
        personId,
        completedOn,
        expiresOn,
        signedOffBy: user.name,
        signedOffAt: at.toISOString(),
      }
      record(
        {
          actor: actorOf(user),
          action: "signed off",
          target,
          reason: check.reason,
          outcome: "succeeded",
          detail: `${requirement.name}: up to date until ${expiresOn}.`,
        },
        true
      )
    },
  }
  return server
}
