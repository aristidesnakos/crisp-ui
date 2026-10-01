import { describe, expect, it } from "vitest"

import {
  AuditEventError,
  buildAuditEvent,
  distinctActions,
  distinctActors,
  filterAuditEvents,
  formatEventTime,
  formatRelativeTime,
  groupByDay,
  type AuditEvent,
} from "../registry/crisp/lib/audit-event"

const event = (id: string, at: string, extra: Partial<AuditEvent> = {}) =>
  ({ id, at, actor: "Mara Lopez", action: "saved", ...extra }) as AuditEvent

const ids = (events: AuditEvent[]) => events.map((e) => e.id)
// Newer ICU puts a narrow no-break space before AM/PM. Compare with a plain one.
const plain = (text: string) => text.replace(/[  ]/g, " ")

describe("buildAuditEvent", () => {
  const fixed = {
    now: () => new Date("2026-10-02T14:05:09.000Z"),
    newId: () => "evt_1",
  }

  it("uses the injected clock and id", () => {
    expect(
      buildAuditEvent(
        {
          actor: { name: "Sam Okafor", role: "Project engineer" },
          action: "approved",
          target: "ECO-2041",
          reason: "Rev C fixes the tolerance stack-up",
          outcome: "succeeded",
        },
        fixed
      )
    ).toEqual({
      id: "evt_1",
      at: "2026-10-02T14:05:09.000Z",
      actor: { name: "Sam Okafor", role: "Project engineer" },
      action: "approved",
      target: "ECO-2041",
      reason: "Rev C fixes the tolerance stack-up",
      outcome: "succeeded",
    })
  })

  it("calls the clock and id source once per event", () => {
    let ticks = 0
    let ids = 0
    const options = {
      now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, ticks++)),
      newId: () => `evt_${++ids}`,
    }
    const first = buildAuditEvent({ actor: "A", action: "saved" }, options)
    const second = buildAuditEvent({ actor: "A", action: "saved" }, options)
    expect([first.id, second.id]).toEqual(["evt_1", "evt_2"])
    expect([first.at, second.at]).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:01.000Z",
    ])
  })

  it("throws a clear error when a reason is required and missing", () => {
    const build = () =>
      buildAuditEvent(
        { actor: "Sam Okafor", action: "approved" },
        { ...fixed, requireReason: true }
      )
    expect(build).toThrow(AuditEventError)
    expect(build).toThrow('An audit event for "approved" needs a reason')
  })

  it("treats a blank reason as missing when a reason is required", () => {
    expect(() =>
      buildAuditEvent(
        { actor: "Sam Okafor", action: "approved", reason: "   " },
        { ...fixed, requireReason: true }
      )
    ).toThrow(AuditEventError)
  })

  it("accepts a reason when one is required, and trims it", () => {
    const built = buildAuditEvent(
      { actor: "Sam Okafor", action: "approved", reason: "  Rev C  " },
      { ...fixed, requireReason: true }
    )
    expect(built.reason).toBe("Rev C")
  })

  it("does not need a reason unless asked to", () => {
    const built = buildAuditEvent({ actor: "Mara", action: "saved" }, fixed)
    expect(built).not.toHaveProperty("reason")
  })

  it("drops blank optional fields instead of storing empty strings", () => {
    const built = buildAuditEvent(
      { actor: "Mara", action: "saved", target: " ", detail: "", reason: "" },
      fixed
    )
    expect(Object.keys(built).sort()).toEqual(["action", "actor", "at", "id"])
  })

  it("keeps a plain-string actor plain and an object actor an object", () => {
    expect(
      buildAuditEvent({ actor: " Mara ", action: "saved" }, fixed).actor
    ).toBe("Mara")
    expect(
      buildAuditEvent({ actor: { name: "Mara" }, action: "saved" }, fixed).actor
    ).toEqual({ name: "Mara" })
  })

  it("requires an actor and an action", () => {
    expect(() =>
      buildAuditEvent({ actor: " ", action: "saved" }, fixed)
    ).toThrow("needs an actor")
    expect(() =>
      buildAuditEvent({ actor: { name: "" }, action: "saved" }, fixed)
    ).toThrow("needs an actor")
    expect(() => buildAuditEvent({ actor: "Mara", action: "" }, fixed)).toThrow(
      "needs an action"
    )
  })

  it("refuses an invalid clock rather than writing a bad time", () => {
    expect(() =>
      buildAuditEvent(
        { actor: "Mara", action: "saved" },
        { ...fixed, now: () => new Date("nope") }
      )
    ).toThrow("valid date")
  })

  it("falls back to the real clock and a generated id", () => {
    const before = Date.now()
    const built = buildAuditEvent({ actor: "Mara", action: "saved" })
    expect(Date.parse(built.at)).toBeGreaterThanOrEqual(before)
    expect(built.id.length).toBeGreaterThan(8)
  })
})

describe("groupByDay", () => {
  const events = [
    event("a", "2026-06-15T03:30:00Z"),
    event("b", "2026-06-15T05:30:00Z"),
    event("c", "2026-06-15T23:30:00Z"),
  ]

  it("returns nothing for an empty list", () => {
    expect(groupByDay([], "UTC")).toEqual([])
  })

  it("splits at local midnight in New York (UTC-4 in June)", () => {
    const days = groupByDay(events, "America/New_York")
    expect(days.map((d) => d.day)).toEqual(["2026-06-15", "2026-06-14"])
    expect(days.map((d) => ids(d.events))).toEqual([["c", "b"], ["a"]])
  })

  it("splits at local midnight in Tokyo (UTC+9), giving different days", () => {
    const days = groupByDay(events, "Asia/Tokyo")
    expect(days.map((d) => d.day)).toEqual(["2026-06-16", "2026-06-15"])
    expect(days.map((d) => ids(d.events))).toEqual([["c"], ["b", "a"]])
  })

  it("keeps all three in one day in UTC, newest first", () => {
    const days = groupByDay(events, "UTC")
    expect(days).toHaveLength(1)
    expect(ids(days[0].events)).toEqual(["c", "b", "a"])
  })

  it("writes a readable heading in the requested zone", () => {
    const [day] = groupByDay([event("x", "2026-03-08T12:00:00Z")], "UTC")
    expect(day.label).toBe("Sunday, March 8, 2026")
  })

  it("keeps the 23-hour spring-forward day as one group", () => {
    // New York, 8 March 2026: clocks jump 02:00 -> 03:00 at 07:00Z.
    const days = groupByDay(
      [
        event("before", "2026-03-08T04:59:00Z"), // 23:59 on 7 March (EST)
        event("start", "2026-03-08T05:00:00Z"), // 00:00 on 8 March (EST)
        event("end", "2026-03-09T03:59:00Z"), // 23:59 on 8 March (EDT)
        event("after", "2026-03-09T04:00:00Z"), // 00:00 on 9 March (EDT)
      ],
      "America/New_York"
    )
    expect(days.map((d) => d.day)).toEqual([
      "2026-03-09",
      "2026-03-08",
      "2026-03-07",
    ])
    expect(days.map((d) => ids(d.events))).toEqual([
      ["after"],
      ["end", "start"],
      ["before"],
    ])
  })

  it("keeps the 25-hour fall-back day as one group", () => {
    // New York, 1 November 2026: 02:00 EDT -> 01:00 EST at 06:00Z, so 01:30 happens twice.
    const days = groupByDay(
      [
        event("midnight", "2026-11-01T04:00:00Z"), // 00:00 EDT
        event("first-0130", "2026-11-01T05:30:00Z"), // 01:30 EDT
        event("second-0130", "2026-11-01T06:30:00Z"), // 01:30 EST
        event("last", "2026-11-02T04:59:00Z"), // 23:59 EST
        event("next", "2026-11-02T05:00:00Z"), // 00:00 on 2 November
      ],
      "America/New_York"
    )
    expect(days.map((d) => d.day)).toEqual(["2026-11-02", "2026-11-01"])
    expect(ids(days[1].events)).toEqual([
      "last",
      "second-0130",
      "first-0130",
      "midnight",
    ])
  })

  it("is stable for equal timestamps, however the instant is written", () => {
    const days = groupByDay(
      [
        event("one", "2026-06-15T10:00:00Z"),
        event("newer", "2026-06-15T11:00:00Z"),
        event("two", "2026-06-15T10:00:00.000Z"),
        event("three", "2026-06-15T10:00:00+00:00"),
      ],
      "UTC"
    )
    expect(ids(days[0].events)).toEqual(["newer", "one", "two", "three"])
  })

  it("does not change the order of the list it is given", () => {
    const input = [
      event("a", "2026-06-15T01:00:00Z"),
      event("b", "2026-06-16T01:00:00Z"),
    ]
    groupByDay(input, "UTC")
    expect(ids(input)).toEqual(["a", "b"])
  })

  it("collects a malformed date in one trailing group without crashing", () => {
    const days = groupByDay(
      [
        event("bad", "not a date"),
        event("ok", "2026-06-15T10:00:00Z"),
        event("empty", ""),
        event("missing", undefined as unknown as string),
      ],
      "UTC"
    )
    expect(days.map((d) => d.day)).toEqual(["2026-06-15", "unknown"])
    expect(days[1].label).toBe("Date unknown")
    expect(ids(days[1].events)).toEqual(["bad", "empty", "missing"])
  })

  it("handles a list where every date is malformed", () => {
    const days = groupByDay([event("bad", "???")], "UTC")
    expect(days).toEqual([
      { day: "unknown", label: "Date unknown", events: [event("bad", "???")] },
    ])
  })

  it("says so plainly when the time zone is unknown", () => {
    expect(() => groupByDay(events, "Mars/Olympus")).toThrow(
      /Unknown time zone "Mars\/Olympus"/
    )
    expect(() => groupByDay([], "Mars/Olympus")).toThrow(RangeError)
  })
})

describe("formatEventTime", () => {
  it("gives an absolute label with the zone, and the ISO string", () => {
    const { label, iso } = formatEventTime(
      "2026-03-08T05:00:00Z",
      "America/New_York"
    )
    expect(plain(label)).toBe("Mar 8, 2026, 12:00:00 AM EST")
    expect(iso).toBe("2026-03-08T05:00:00.000Z")
  })

  it("can leave out the date for use under a day heading", () => {
    const { label } = formatEventTime("2026-06-15T23:30:00Z", "Asia/Tokyo", {
      timeOnly: true,
    })
    expect(plain(label)).toBe("8:30:00 AM GMT+9")
  })

  it("normalises the ISO string whatever offset it came with", () => {
    expect(formatEventTime("2026-06-15T10:00:00+02:00", "UTC").iso).toBe(
      "2026-06-15T08:00:00.000Z"
    )
  })

  it("returns an honest label and no ISO string for a malformed date", () => {
    expect(formatEventTime("garbage", "UTC")).toEqual({
      label: "Time unknown",
      iso: null,
    })
    expect(formatEventTime("", "UTC").iso).toBeNull()
  })
})

describe("formatRelativeTime", () => {
  const now = new Date("2026-10-02T12:00:00Z")

  it("describes the past in the largest whole unit", () => {
    expect(formatRelativeTime("2026-10-02T11:55:00Z", now)).toBe(
      "5 minutes ago"
    )
    expect(formatRelativeTime("2026-10-02T09:00:00Z", now)).toBe("3 hours ago")
    expect(formatRelativeTime("2026-09-30T12:00:00Z", now)).toBe("2 days ago")
  })

  it("says now inside the first minute", () => {
    expect(formatRelativeTime("2026-10-02T11:59:30Z", now)).toBe("now")
  })

  it("returns null for a malformed date", () => {
    expect(formatRelativeTime("garbage", now)).toBeNull()
  })
})

describe("filterAuditEvents", () => {
  const list = [
    event("1", "2026-06-15T10:00:00Z", { actor: "Mara Lopez", action: "sent" }),
    event("2", "2026-06-15T11:00:00Z", {
      actor: { name: "Sam Okafor", role: "Engineer" },
      action: "approved",
    }),
    event("3", "2026-06-15T12:00:00Z", {
      actor: "Mara Lopez",
      action: "saved",
    }),
  ]

  it("filters by actor name, for plain and object actors", () => {
    expect(ids(filterAuditEvents(list, { actor: "Mara Lopez" }))).toEqual([
      "1",
      "3",
    ])
    expect(ids(filterAuditEvents(list, { actor: "Sam Okafor" }))).toEqual(["2"])
  })

  it("combines actor and action, and keeps everything for an empty filter", () => {
    expect(
      ids(filterAuditEvents(list, { actor: "Mara Lopez", action: "saved" }))
    ).toEqual(["3"])
    expect(filterAuditEvents(list, {})).toHaveLength(3)
  })

  it("lists the distinct actors and actions, sorted", () => {
    expect(distinctActors(list)).toEqual(["Mara Lopez", "Sam Okafor"])
    expect(distinctActions(list)).toEqual(["approved", "saved", "sent"])
  })
})
