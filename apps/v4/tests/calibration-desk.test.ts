import { describe, expect, it } from "vitest"

import {
  addDays,
  calibrationStatus,
  checkRecallSend,
  countStatuses,
  daysUntilDue,
  describeSkipped,
  planRecall,
  recallTitle,
  summarizeIds,
  todayOf,
  type Gauge,
  type RecallRequest,
} from "../registry/crisp/lib/calibration-desk-lib"
import { createMemoryServer } from "../registry/crisp/lib/calibration-desk-server"

const TODAY = "2026-10-01"

const gauge = (id: string, due: string, extra: Partial<Gauge> = {}): Gauge => ({
  id,
  name: `Gauge ${id}`,
  owner: "Mara Okafor",
  ownerEmail: "mara@example.org",
  due,
  ...extra,
})

describe("dates", () => {
  it("counts whole days, negative when past", () => {
    expect(daysUntilDue("2026-10-31", TODAY)).toBe(30)
    expect(daysUntilDue("2026-10-01", TODAY)).toBe(0)
    expect(daysUntilDue("2026-09-30", TODAY)).toBe(-1)
  })

  it("is NaN for anything that is not a real date", () => {
    expect(daysUntilDue("soon", TODAY)).toBeNaN()
    expect(daysUntilDue("2026-02-30", TODAY)).toBeNaN()
    expect(daysUntilDue("2026-10-01T00:00:00Z", TODAY)).toBeNaN()
  })

  it("moves a date across a month and a leap day", () => {
    expect(addDays("2026-10-01", 30)).toBe("2026-10-31")
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30")
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29")
    expect(() => addDays("nope", 1)).toThrow(RangeError)
  })

  it("reads today in UTC", () => {
    expect(todayOf(new Date("2026-10-01T23:59:59Z"))).toBe("2026-10-01")
    expect(todayOf(new Date("2026-10-02T00:00:00Z"))).toBe("2026-10-02")
  })
})

describe("calibrationStatus", () => {
  it("is overdue the day after, and due soon on the day itself", () => {
    expect(calibrationStatus(gauge("a", "2026-09-30"), TODAY)).toBe("overdue")
    expect(calibrationStatus(gauge("a", "2026-10-01"), TODAY)).toBe("due-soon")
  })

  it("keeps the 30 day edge: day 30 is due soon, day 31 is in date", () => {
    expect(calibrationStatus(gauge("a", "2026-10-31"), TODAY)).toBe("due-soon")
    expect(calibrationStatus(gauge("a", "2026-11-01"), TODAY)).toBe("in-date")
  })

  it("treats a date it cannot read as overdue, so nobody trusts it", () => {
    expect(calibrationStatus(gauge("a", ""), TODAY)).toBe("overdue")
    expect(calibrationStatus(gauge("a", "13/45/2026"), TODAY)).toBe("overdue")
  })

  it("lets a recall win over the date", () => {
    const recalled = gauge("a", "2026-01-01", {
      recalledAt: "2026-10-01T14:00:00Z",
    })
    expect(calibrationStatus(recalled, TODAY)).toBe("recalled")
  })

  it("counts every status, including the empty ones", () => {
    expect(
      countStatuses(
        [
          gauge("a", "2026-09-01"),
          gauge("b", "2026-09-02"),
          gauge("c", "2026-10-10"),
        ],
        TODAY
      )
    ).toEqual({ overdue: 2, "due-soon": 1, "in-date": 0, recalled: 0 })
  })
})

describe("planRecall", () => {
  const overdue = (id: string, extra: Partial<Gauge> = {}) =>
    gauge(id, "2026-09-01", extra)

  it("takes overdue and due-soon gauges, in the order given", () => {
    const plan = planRecall(
      [overdue("b"), gauge("a", "2026-10-10"), overdue("c")],
      TODAY
    )
    expect(plan.gaugeIds).toEqual(["b", "a", "c"])
    expect(plan.skipped).toEqual([])
  })

  it("leaves out in-date and already recalled gauges and says why", () => {
    const plan = planRecall(
      [
        overdue("a"),
        gauge("b", "2027-01-01"),
        overdue("c", { recalledAt: "2026-09-20T10:00:00Z" }),
      ],
      TODAY
    )
    expect(plan.gaugeIds).toEqual(["a"])
    expect(plan.skipped).toEqual([
      { id: "b", reason: "in-date" },
      { id: "c", reason: "already-recalled" },
    ])
  })

  it("lists each owner's email once, trimmed and lower-cased", () => {
    const plan = planRecall(
      [
        overdue("a", { ownerEmail: " Mara@Example.org " }),
        overdue("b", { ownerEmail: "mara@example.org" }),
        overdue("c", { ownerEmail: "jules@example.org" }),
      ],
      TODAY
    )
    expect(plan.owners).toEqual(["mara@example.org", "jules@example.org"])
  })

  it("does not recall a gauge whose owner cannot be emailed", () => {
    const plan = planRecall(
      [
        overdue("a", { ownerEmail: "" }),
        overdue("b", { ownerEmail: "+1 555 0100" }),
        overdue("c", { ownerEmail: "not-an-email" }),
        overdue("d"),
      ],
      TODAY
    )
    expect(plan.gaugeIds).toEqual(["d"])
    expect(plan.skipped.map((s) => s.reason)).toEqual([
      "no-owner-email",
      "no-owner-email",
      "no-owner-email",
    ])
  })

  it("counts a repeated id once", () => {
    const plan = planRecall([overdue("a"), overdue("a")], TODAY)
    expect(plan.gaugeIds).toEqual(["a"])
    expect(plan.owners).toHaveLength(1)
  })

  it("plans nothing for an empty selection", () => {
    expect(planRecall([], TODAY)).toEqual({
      gaugeIds: [],
      owners: [],
      skipped: [],
    })
  })
})

describe("describeSkipped and summarizeIds", () => {
  it("says nothing when nothing was left out", () => {
    expect(describeSkipped([])).toBeNull()
  })

  it("names the reasons and agrees in number", () => {
    expect(describeSkipped([{ id: "a", reason: "in-date" }])).toBe(
      "1 selected gauge is left out: 1 in date."
    )
    expect(
      describeSkipped([
        { id: "a", reason: "in-date" },
        { id: "b", reason: "already-recalled" },
        { id: "c", reason: "in-date" },
      ])
    ).toBe("3 selected gauges are left out: 2 in date, 1 already recalled.")
  })

  it("shortens a long list and titles a request", () => {
    expect(summarizeIds(["a", "b"])).toBe("a, b")
    expect(summarizeIds(["a", "b", "c", "d", "e", "f"], 4)).toBe(
      "a, b, c, d, and 2 more"
    )
    expect(recallTitle("RR-1", ["G-101"])).toBe(
      "Recall request RR-1: 1 gauge (G-101)"
    )
  })
})

describe("checkRecallSend", () => {
  const decision = (
    outcome: "approved" | "rejected"
  ): NonNullable<RecallRequest["approvers"][number]["decision"]> => ({
    outcome,
    at: "2026-10-01T14:00:00Z",
    reason: "Out of tolerance",
  })
  const request = (
    quality?: "approved" | "rejected",
    manufacturing?: "approved" | "rejected",
    extra: Partial<RecallRequest> = {}
  ): RecallRequest => ({
    id: "RR-1",
    gaugeIds: ["a", "b"],
    requestedBy: "Sam Reyes",
    approvers: [
      {
        id: "dana",
        name: "Dana",
        role: "Quality",
        decision: quality && decision(quality),
      },
      {
        id: "marcus",
        name: "Marcus",
        role: "Manufacturing",
        decision: manufacturing && decision(manufacturing),
      },
    ],
    ...extra,
  })

  it("is blocked until Quality and Manufacturing have both approved", () => {
    const none = checkRecallSend(["a", "b"], request())
    expect(none).toMatchObject({ ok: false, code: "waiting" })
    expect(!none.ok && none.reason).toBe("Waiting for approval: 0 of 2 signed")
    const half = checkRecallSend(["a", "b"], request("approved"))
    expect(!half.ok && half.reason).toBe("Waiting for approval: 1 of 2 signed")
    expect(
      checkRecallSend(["a", "b"], request("approved", "approved"))
    ).toEqual({ ok: true })
  })

  it("is blocked by one rejection", () => {
    expect(
      checkRecallSend(["a", "b"], request("approved", "rejected"))
    ).toMatchObject({ ok: false, code: "rejected" })
  })

  it("names an empty selection before anything else", () => {
    expect(checkRecallSend([], null)).toMatchObject({
      code: "nothing-to-send",
    })
    expect(checkRecallSend([], request("approved", "approved"))).toMatchObject({
      code: "nothing-to-send",
    })
  })

  it("needs a request, and one for exactly these gauges", () => {
    expect(checkRecallSend(["a"], null)).toMatchObject({ code: "no-request" })
    const approved = request("approved", "approved")
    expect(checkRecallSend(["a"], approved)).toMatchObject({
      code: "selection-changed",
    })
    expect(checkRecallSend(["a", "b", "c"], approved)).toMatchObject({
      code: "selection-changed",
    })
    // Order does not matter.
    expect(checkRecallSend(["b", "a"], approved)).toEqual({ ok: true })
  })

  it("refuses a second send of the same request", () => {
    const sent = request("approved", "approved", {
      sentAt: "2026-10-01T15:00:00Z",
    })
    expect(checkRecallSend(["a", "b"], sent)).toMatchObject({
      code: "already-sent",
    })
  })
})

// The in-memory server is the demo's stand-in for yours. These tests pin the
// rules it follows, which your server has to follow as well.
describe("memory server", () => {
  const clock = () => {
    let t = Date.parse("2026-10-01T14:00:00Z")
    return () => new Date((t += 60_000))
  }
  const make = () => createMemoryServer({ now: clock(), delayMs: 0 })
  const OVERDUE = ["G-101", "G-104", "G-107"] // Mara, Mara, Jules

  async function approved() {
    const server = make()
    await server.requestRecall({ userId: "sam", gaugeIds: OVERDUE })
    const { request } = await server.load()
    await server.decide({
      userId: "dana",
      requestId: request!.id,
      outcome: "approved",
      reason: "Out of tolerance",
    })
    await server.decide({
      userId: "marcus",
      requestId: request!.id,
      outcome: "approved",
      reason: "Line can run without them",
    })
    return { server, id: request!.id }
  }

  it("starts with 7 overdue, 5 due soon, 6 in date and an empty record", () => {
    const state = make().snapshot()
    expect(state.gauges).toHaveLength(18)
    expect(countStatuses(state.gauges, todayOf(new Date(state.asOf)))).toEqual({
      overdue: 7,
      "due-soon": 5,
      "in-date": 6,
      recalled: 0,
    })
    expect(state.events).toEqual([])
    expect(state.request).toBeNull()
  })

  it("runs the whole arc: request, two approvals, send, record, counts", async () => {
    const { server, id } = await approved()
    expect(
      await server.sendRecall({
        userId: "sam",
        requestId: id,
        gaugeIds: OVERDUE,
      })
    ).toEqual({ sent: 2 })

    const state = await server.load()
    const today = todayOf(new Date(state.asOf))
    expect(countStatuses(state.gauges, today)).toEqual({
      overdue: 4,
      "due-soon": 5,
      "in-date": 6,
      recalled: 3,
    })
    expect(state.request?.sentAt).toBeTruthy()
    expect(state.request?.sentTo).toBe(2)

    // One event per thing that happened, oldest first, each with the actor.
    expect(
      state.events.map((e) => [
        typeof e.actor === "string" ? e.actor : e.actor.name,
        e.action,
        e.outcome,
      ])
    ).toEqual([
      ["Sam Reyes", "requested approval to recall", "succeeded"],
      ["Dana Whitfield", "approved", "succeeded"],
      ["Marcus Webb", "approved", "succeeded"],
      ["Sam Reyes", "sent the recall notice to", "succeeded"],
    ])
    // Every event has the server's time and a unique id.
    expect(new Set(state.events.map((e) => e.id)).size).toBe(4)
    expect(state.events.every((e) => Date.parse(e.at) > 0)).toBe(true)
    // Approvals carry their reason; the notice names no email address.
    expect(state.events[1].reason).toBe("Out of tolerance")
    expect(JSON.stringify(state.events)).not.toMatch(/@/)
  })

  it("records a failed send, changes nothing, and lets the same send retry", async () => {
    const { server, id } = await approved()
    server.failSend = true
    await expect(
      server.sendRecall({ userId: "sam", requestId: id, gaugeIds: OVERDUE })
    ).rejects.toThrow("The mail service did not answer")

    let state = await server.load()
    expect(state.events.at(-1)).toMatchObject({
      action: "tried to send the recall notice to",
      outcome: "failed",
    })
    expect(state.gauges.some((g) => g.recalledAt)).toBe(false)
    expect(state.request?.sentAt).toBeUndefined()

    server.failSend = false
    await server.sendRecall({ userId: "sam", requestId: id, gaugeIds: OVERDUE })
    state = await server.load()
    expect(state.gauges.filter((g) => g.recalledAt)).toHaveLength(3)
    expect(state.events.map((e) => e.outcome).slice(-2)).toEqual([
      "failed",
      "succeeded",
    ])
  })

  it("refuses to send before approval, and records the refusal", async () => {
    const server = make()
    await server.requestRecall({ userId: "sam", gaugeIds: OVERDUE })
    const { request } = await server.load()
    await expect(
      server.sendRecall({
        userId: "sam",
        requestId: request!.id,
        gaugeIds: OVERDUE,
      })
    ).rejects.toThrow("Waiting for approval: 0 of 2 signed")
    const state = await server.load()
    expect(state.events.at(-1)).toMatchObject({ outcome: "blocked" })
    expect(state.gauges.some((g) => g.recalledAt)).toBe(false)
  })

  it("refuses to send gauges the approval does not cover", async () => {
    const { server, id } = await approved()
    await expect(
      server.sendRecall({
        userId: "sam",
        requestId: id,
        gaugeIds: [...OVERDUE, "G-112"],
      })
    ).rejects.toThrow("not the ones in RR-1")
  })

  it("refuses a second send of the same request", async () => {
    const { server, id } = await approved()
    await server.sendRecall({ userId: "sam", requestId: id, gaugeIds: OVERDUE })
    await expect(
      server.sendRecall({ userId: "sam", requestId: id, gaugeIds: OVERDUE })
    ).rejects.toThrow()
    const state = await server.load()
    expect(
      state.events.filter((e) => e.action === "sent the recall notice to")
    ).toHaveLength(1)
  })

  it("only lets an approver decide, once, and always with a reason", async () => {
    const server = make()
    await server.requestRecall({ userId: "sam", gaugeIds: OVERDUE })
    const { request } = await server.load()
    const requestId = request!.id

    await expect(
      server.decide({
        userId: "sam",
        requestId,
        outcome: "approved",
        reason: "x",
      })
    ).rejects.toThrow("Only Quality and Manufacturing can sign off")
    await expect(
      server.decide({ userId: "dana", requestId, outcome: "approved" })
    ).rejects.toThrow("Add a reason for approving")
    await expect(
      server.decide({
        userId: "dana",
        requestId,
        outcome: "approved",
        reason: "  ",
      })
    ).rejects.toThrow("Add a reason for approving")
    await server.decide({
      userId: "dana",
      requestId,
      outcome: "approved",
      reason: "Out of tolerance",
    })
    await expect(
      server.decide({
        userId: "dana",
        requestId,
        outcome: "rejected",
        reason: "Changed my mind",
      })
    ).rejects.toThrow("You already decided")

    const { events } = await server.load()
    // 1 request, 1 decision, and 3 refusals; each refusal is recorded.
    expect(events.map((e) => e.outcome)).toEqual([
      "succeeded",
      "blocked",
      "blocked",
      "blocked",
      "succeeded",
      "blocked",
    ])
  })

  it("stamps what the signature means, whatever the browser says", async () => {
    const { server } = await approved()
    const { request } = await server.load()
    expect(request?.approvers.map((a) => a.decision?.meaning)).toEqual([
      "Approved for recall",
      "Approved for recall",
    ])
  })

  it("settles a rejection and keeps the gauges as they were", async () => {
    const server = make()
    await server.requestRecall({ userId: "sam", gaugeIds: OVERDUE })
    const { request } = await server.load()
    await server.decide({
      userId: "marcus",
      requestId: request!.id,
      outcome: "rejected",
      reason: "Line needs them this week",
    })
    await expect(
      server.decide({
        userId: "dana",
        requestId: request!.id,
        outcome: "approved",
        reason: "Too late",
      })
    ).rejects.toThrow("already settled")
    const state = await server.load()
    expect(state.gauges.some((g) => g.recalledAt)).toBe(false)
    expect(state.events[1]).toMatchObject({
      action: "rejected",
      reason: "Line needs them this week",
    })
  })

  it("withdraws an open request when a new one replaces it", async () => {
    const server = make()
    await server.requestRecall({ userId: "sam", gaugeIds: ["G-101"] })
    await server.requestRecall({ userId: "sam", gaugeIds: ["G-104"] })
    const state = await server.load()
    expect(state.request?.id).toBe("RR-2")
    expect(state.events.map((e) => e.action)).toEqual([
      "requested approval to recall",
      "withdrew",
      "requested approval to recall",
    ])
  })

  it("does not request a recall for gauges that cannot be recalled", async () => {
    const server = make()
    // G-145 is in date.
    await expect(
      server.requestRecall({ userId: "sam", gaugeIds: ["G-145"] })
    ).rejects.toThrow("None of those gauges can be recalled")
    const state = await server.load()
    expect(state.request).toBeNull()
    expect(state.events).toHaveLength(1)
    expect(state.events[0].outcome).toBe("blocked")
  })

  it("rejects an unknown user without writing a record under no name", async () => {
    const server = make()
    await expect(
      server.requestRecall({ userId: "nobody", gaugeIds: OVERDUE })
    ).rejects.toThrow("Unknown user")
    expect((await server.load()).events).toEqual([])
  })
})
