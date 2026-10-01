/**
 * DEMO STAND-IN. REPLACE THIS FILE'S `createMemoryServer()` WITH REAL CALLS.
 *
 * `CalibrationDesk` talks to a `CalibrationDeskServer` (see
 * `calibration-desk-lib.ts`) and to nothing else. This file is the fake one: it
 * keeps the gauges, the recall request and the audit log in memory, answers
 * after a short delay, and can be told to fail a send. Nothing here is saved,
 * and nothing is ever sent anywhere.
 *
 * To make it real, change ONE place: pass your own object to
 * `<CalibrationDesk server={...} />`, with the same four methods, each a
 * request to your backend. Then delete this file. The rules this fake follows
 * are the rules your server must follow:
 *
 * - It takes the user from the session. Here a `userId` is passed in only
 *   because there is no session, and it looks the person up in its own table.
 * - It re-checks everything itself (`checkRecallSend`, who may decide, once
 *   only, a reason on every approval) and does not trust what the browser says
 *   it checked.
 * - It stamps times and ids with its own clock, and stamps what each signature
 *   means. The browser never makes those up.
 * - It writes an audit event for every decision, every send, every refusal and
 *   every failure, in the same step that does the thing, so the record exists
 *   even if the page is closed.
 * - It would enforce quiet hours before sending. This fake does not, so the
 *   demo works at any hour. Yours must (see `isQuietTime` in `alert-rules`).
 *
 * Example data only.
 */
import type { AlertRule } from "@/registry/crisp/lib/alert-rules-lib"
import {
  summarizeApproval,
  validateDecision,
} from "@/registry/crisp/lib/approval"
import {
  buildAuditEvent,
  type AuditEvent,
  type AuditEventInput,
} from "@/registry/crisp/lib/audit-event"
import {
  addDays,
  checkRecallSend,
  gaugeCount,
  ownerCount,
  planRecall,
  RECALL_MEANING,
  RECALL_POLICY,
  RECALL_REJECT_MEANING,
  summarizeIds,
  todayOf,
  type CalibrationDeskServer,
  type DeskState,
  type DeskUser,
  type Gauge,
  type RecallRequest,
} from "@/registry/crisp/lib/calibration-desk-lib"

/** The people the demo can be viewed as. Dana and Marcus are the two approvers. */
export const DEMO_USERS: DeskUser[] = [
  { id: "dana", name: "Dana Whitfield", role: "Quality" },
  { id: "marcus", name: "Marcus Webb", role: "Manufacturing" },
  { id: "sam", name: "Sam Reyes", role: "Metrology technician" },
]

/** Who must sign a recall. Role names are what "Only Quality and Manufacturing can sign off" reads. */
const APPROVER_IDS = ["dana", "marcus"]

/** Example rule, shown read-only on the screen. */
export const DEMO_RULE: AlertRule = {
  id: "calibration-due",
  label: "Calibration due",
  enabled: true,
  cadenceDays: [30, 14, 7, 1],
  escalateAfterDays: 3,
  escalateTo: "quality@example.org",
  quietHours: { start: "21:00", end: "08:00", timeZone: "America/Chicago" },
}

const OWNERS = {
  mara: { owner: "Mara Okafor", ownerEmail: "mara@example.org" },
  jules: { owner: "Jules Bernard", ownerEmail: "jules@example.org" },
  ines: { owner: "Ines Varga", ownerEmail: "ines@example.org" },
  tomas: { owner: "Tomas Lindqvist", ownerEmail: "tomas@example.org" },
}

// Days from today until calibration is due. Relative to the clock, so the demo
// always has the same 7 overdue, 5 due soon and 6 in date, whenever it is opened.
const SEED: [
  id: string,
  name: string,
  owner: keyof typeof OWNERS,
  due: number,
][] = [
  ["G-101", "Micrometer 0-25 mm", "mara", -29],
  ["G-104", "Dial caliper 150 mm", "mara", -13],
  ["G-107", "Torque wrench 20-100 Nm", "jules", -41],
  ["G-112", "Pressure gauge 0-10 bar", "tomas", -4],
  ["G-115", "Height gauge 300 mm", "ines", -63],
  ["G-118", "Thread plug M8", "jules", -22],
  ["G-121", "Bore gauge 18-35 mm", "ines", -2],
  ["G-124", "Surface plate 400 mm", "tomas", 8],
  ["G-127", "Dial indicator 0.01 mm", "mara", 13],
  ["G-130", "Torque screwdriver 1-6 Nm", "jules", 21],
  ["G-133", "Digital caliper 200 mm", "ines", 26],
  ["G-136", "Feeler gauge set", "tomas", 29],
  ["G-139", "Micrometer 25-50 mm", "mara", 64],
  ["G-142", "Pin gauge set 1-10 mm", "jules", 78],
  ["G-145", "Gauge block set", "ines", 103],
  ["G-148", "Pressure gauge 0-6 bar", "tomas", 125],
  ["G-151", "Thermometer probe", "mara", 147],
  ["G-154", "Torque wrench 5-25 Nm", "jules", 166],
]

/** The demo's gauges, due dates counted from `today` ("YYYY-MM-DD"). */
export function seedGauges(today: string): Gauge[] {
  return SEED.map(([id, name, owner, due]) => ({
    id,
    name,
    ...OWNERS[owner],
    due: addDays(today, due),
  }))
}

export interface MemoryServerOptions {
  /** The server's clock. Defaults to the real one. Inject a fixed one in tests. */
  now?: () => Date
  /** How long each call takes, in milliseconds. Default 350. Use 0 in tests. */
  delayMs?: number
}

/** The in-memory server, plus the switch the demo uses to make a send fail. */
export interface MemoryServer extends CalibrationDeskServer {
  /** While true, `sendRecall` fails after recording a "failed" event. */
  failSend: boolean
  /** The same answer as `load()`, without the delay. Used for the first paint. */
  snapshot(): DeskState
}

export function createMemoryServer(
  options: MemoryServerOptions = {}
): MemoryServer {
  const now = options.now ?? (() => new Date())
  const delayMs = options.delayMs ?? 350
  const wait = () =>
    delayMs > 0
      ? new Promise<void>((resolve) => setTimeout(resolve, delayMs))
      : Promise.resolve()

  const gauges = seedGauges(todayOf(now()))
  const events: AuditEvent[] = []
  let request: RecallRequest | null = null
  let eventCount = 0
  let requestCount = 0

  function record(input: AuditEventInput, requireReason = false) {
    events.push(
      buildAuditEvent(input, {
        now,
        newId: () => `evt_${++eventCount}`,
        requireReason,
      })
    )
  }

  const actorOf = (user: DeskUser) => ({ name: user.name, role: user.role })

  function userOf(userId: string): DeskUser {
    const user = DEMO_USERS.find((u) => u.id === userId)
    if (!user) throw new Error("Unknown user. Sign in again.")
    return user
  }

  /** Writes a "blocked" event, then throws: a refusal is part of the record. */
  function refuse(
    user: DeskUser,
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

  function snapshot(): DeskState {
    return {
      asOf: now().toISOString(),
      gauges: gauges.map((g) => ({ ...g })),
      request: request && {
        ...request,
        gaugeIds: [...request.gaugeIds],
        approvers: request.approvers.map((a) => ({
          ...a,
          decision: a.decision && { ...a.decision },
        })),
      },
      rule: DEMO_RULE,
      events: [...events],
    }
  }

  const server: MemoryServer = {
    failSend: false,
    snapshot,

    async load() {
      await wait()
      return snapshot()
    },

    async requestRecall({ userId, gaugeIds }) {
      await wait()
      const user = userOf(userId)
      // The server works out what is recallable from its own gauges.
      const plan = planRecall(
        gauges.filter((g) => gaugeIds.includes(g.id)),
        todayOf(now())
      )
      if (plan.gaugeIds.length === 0) {
        refuse(
          user,
          "tried to request approval to recall",
          gaugeCount(0),
          "None of those gauges can be recalled."
        )
      }
      const previous = request
      requestCount += 1
      const id = `RR-${requestCount}`
      if (previous && !previous.sentAt) {
        const status = summarizeApproval(previous.approvers, RECALL_POLICY)
        if (status.status !== "rejected") {
          record({
            actor: actorOf(user),
            action: "withdrew",
            target: `recall request ${previous.id}`,
            outcome: "succeeded",
            detail: `Replaced by ${id}.`,
          })
        }
      }
      request = {
        id,
        gaugeIds: plan.gaugeIds,
        requestedBy: user.name,
        approvers: APPROVER_IDS.map((approverId) => {
          const approver = DEMO_USERS.find((u) => u.id === approverId)!
          return { id: approver.id, name: approver.name, role: approver.role }
        }),
      }
      record({
        actor: actorOf(user),
        action: "requested approval to recall",
        target: gaugeCount(plan.gaugeIds.length),
        outcome: "succeeded",
        detail: `${id}: ${summarizeIds(plan.gaugeIds, 6)}. Needs Quality and Manufacturing.`,
      })
    },

    async decide({ userId, requestId, outcome, reason }) {
      await wait()
      const user = userOf(userId)
      const verb = outcome === "approved" ? "approve" : "reject"
      const refusedAction = `tried to ${verb}`
      const target = `recall request ${requestId}`
      if (!request || request.id !== requestId) {
        refuse(user, refusedAction, target, "That request is no longer open.")
      }
      const before = summarizeApproval(request.approvers, RECALL_POLICY)
      if (request.sentAt || before.status !== "pending") {
        refuse(user, refusedAction, target, "That request is already settled.")
      }
      const approver = request.approvers.find((a) => a.id === user.id)
      if (!approver) {
        refuse(
          user,
          refusedAction,
          target,
          "Only Quality and Manufacturing can sign off."
        )
      }
      if (approver.decision) {
        refuse(
          user,
          refusedAction,
          target,
          "You already decided on this request."
        )
      }
      const check = validateDecision(
        { outcome, reason },
        { requireReasonOnApprove: true }
      )
      if (!check.valid) refuse(user, refusedAction, target, check.error)

      const meaning =
        outcome === "approved" ? RECALL_MEANING : RECALL_REJECT_MEANING
      approver.decision = {
        outcome,
        at: now().toISOString(),
        reason: check.reason,
        meaning,
      }
      const after = summarizeApproval(request.approvers, RECALL_POLICY)
      const settled =
        after.status === "pending" ? "" : ` The request is now ${after.status}.`
      record(
        {
          actor: actorOf(user),
          action: outcome,
          target,
          reason: check.reason,
          outcome: "succeeded",
          detail: `Signature meaning: ${meaning}.${settled}`,
        },
        true
      )
    },

    async sendRecall({ userId, requestId, gaugeIds }) {
      await wait()
      const user = userOf(userId)
      const at = now()
      const plan = planRecall(
        gauges.filter((g) => gaugeIds.includes(g.id)),
        todayOf(at)
      )
      const target = ownerCount(plan.owners.length)
      const action = "tried to send the recall notice to"
      const check = checkRecallSend(
        plan.gaugeIds,
        request?.id === requestId ? request : null
      )
      if (!check.ok) refuse(user, action, target, check.reason)
      // `request` is the one the check just passed, so it exists.
      const approved = request as RecallRequest

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

      for (const gauge of gauges) {
        if (plan.gaugeIds.includes(gauge.id))
          gauge.recalledAt = at.toISOString()
      }
      approved.sentAt = at.toISOString()
      approved.sentTo = plan.owners.length
      record({
        actor: actorOf(user),
        action: "sent the recall notice to",
        target,
        reason: `${approved.id} was approved by Quality and Manufacturing`,
        outcome: "succeeded",
        detail: `${gaugeCount(plan.gaugeIds.length)} recalled: ${summarizeIds(plan.gaugeIds, 6)}.`,
      })
      return { sent: plan.owners.length }
    },
  }
  return server
}
