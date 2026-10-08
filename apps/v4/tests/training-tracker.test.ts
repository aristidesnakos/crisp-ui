import { describe, expect, it } from "vitest"

import {
  addDays,
  addMonths,
  buildReminderEmail,
  checkReminderSend,
  checkSignOff,
  countStatuses,
  daysUntil,
  describeSkipped,
  fullName,
  inQuietHours,
  needsAttention,
  peopleCount,
  planReminder,
  statusLabel,
  summarizeNames,
  todayIn,
  trainingStatus,
  type Person,
  type TrackerRow,
  type TrainingRecord,
} from "../registry/crisp/lib/training-tracker-lib"
import {
  createDemoClock,
  createMemoryServer,
} from "../registry/crisp/lib/training-tracker-server"

const TODAY = "2026-10-06"
const LONDON = "Europe/London"

const row = (
  id: string,
  expiresOn: string | undefined,
  extra: Partial<Person> = {},
  record: Partial<TrainingRecord> = {}
): TrackerRow => ({
  person: {
    id,
    firstName: "Grace",
    lastName: "Liu",
    team: "Office",
    email: `${id}@example.org`,
    ...extra,
  },
  record: { personId: id, expiresOn, ...record },
})

describe("dates", () => {
  it("counts whole days, negative when past", () => {
    expect(daysUntil("2026-11-05", TODAY)).toBe(30)
    expect(daysUntil(TODAY, TODAY)).toBe(0)
    expect(daysUntil("2026-10-05", TODAY)).toBe(-1)
    expect(daysUntil("soon", TODAY)).toBeNaN()
    expect(daysUntil("2026-02-30", TODAY)).toBeNaN()
  })

  it("moves by days and by months, keeping to the end of a short month", () => {
    expect(addDays(TODAY, -40)).toBe("2026-08-27")
    expect(addMonths(TODAY, 12)).toBe("2027-10-06")
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28")
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29")
    expect(addMonths("2026-03-15", -3)).toBe("2025-12-15")
    expect(() => addMonths("nope", 1)).toThrow(RangeError)
  })

  it("reads today on the tracker's wall clock, not in UTC", () => {
    // 23:30 in London on 6 October is 22:30 UTC: still the 6th.
    expect(todayIn(new Date("2026-10-06T22:30:00Z"), LONDON)).toBe(TODAY)
    // 00:30 in London on the 7th is 23:30 UTC on the 6th.
    expect(todayIn(new Date("2026-10-06T23:30:00Z"), LONDON)).toBe("2026-10-07")
    expect(todayIn(new Date("2026-10-06T23:30:00Z"), "UTC")).toBe(TODAY)
  })
})

describe("trainingStatus", () => {
  it("is overdue the day after it runs out, and due soon on the day", () => {
    expect(trainingStatus(row("a", "2026-10-05").record, TODAY)).toBe("overdue")
    expect(trainingStatus(row("a", TODAY).record, TODAY)).toBe("due-soon")
  })

  it("keeps the 30 day edge: day 30 is due soon, day 31 is up to date", () => {
    expect(trainingStatus(row("a", "2026-11-05").record, TODAY)).toBe(
      "due-soon"
    )
    expect(trainingStatus(row("a", "2026-11-06").record, TODAY)).toBe(
      "up-to-date"
    )
  })

  it("treats a missing or unreadable date, or no record, as overdue", () => {
    expect(trainingStatus(row("a", undefined).record, TODAY)).toBe("overdue")
    expect(trainingStatus(row("a", "13/45/2026").record, TODAY)).toBe("overdue")
    expect(trainingStatus(null, TODAY)).toBe("overdue")
  })

  it("says where someone stands in words", () => {
    expect(statusLabel(row("a", "2026-08-27").record, TODAY)).toBe(
      "Overdue by 40 days"
    )
    expect(statusLabel(row("a", "2026-10-07").record, TODAY)).toBe(
      "Due in 1 day"
    )
    expect(statusLabel(row("a", TODAY).record, TODAY)).toBe("Due today")
    expect(statusLabel(row("a", "2027-06-01").record, TODAY)).toBe("Up to date")
    expect(statusLabel(null, TODAY)).toBe("Not done yet")
    expect(statusLabel(row("a", "soon").record, TODAY)).toBe("Date unknown")
  })

  it("counts every status, including the empty ones", () => {
    expect(
      countStatuses(
        [row("a", "2026-09-01"), row("b", "2026-09-02"), row("c", TODAY)],
        TODAY
      )
    ).toEqual({ overdue: 2, "due-soon": 1, "up-to-date": 0 })
    expect(needsAttention(row("a", "2027-06-01"), TODAY)).toBe(false)
  })
})

describe("planReminder", () => {
  const overdue = (id: string, extra: Partial<Person> = {}) =>
    row(id, "2026-09-01", extra)

  it("takes overdue and due-soon people, in the order given", () => {
    const plan = planReminder(
      [overdue("b"), row("a", "2026-10-10"), overdue("c")],
      TODAY
    )
    expect(plan.personIds).toEqual(["b", "a", "c"])
    expect(plan.recipients.map((r) => r.email)).toEqual([
      "b@example.org",
      "a@example.org",
      "c@example.org",
    ])
    expect(plan.skipped).toEqual([])
  })

  it("leaves out who is up to date, has no email, or is a duplicate, and says why", () => {
    const plan = planReminder(
      [
        overdue("a"),
        row("b", "2027-06-01"),
        overdue("c", { email: "" }),
        overdue("d", { email: "+44 7700 900123" }),
        overdue("a"),
        overdue("e", { email: " A@Example.org " }),
      ],
      TODAY
    )
    expect(plan.personIds).toEqual(["a"])
    expect(plan.skipped).toEqual([
      { id: "b", reason: "up-to-date" },
      { id: "c", reason: "no-email" },
      { id: "d", reason: "no-email" },
      { id: "a", reason: "duplicate" },
      { id: "e", reason: "duplicate" },
    ])
    expect(describeSkipped(plan.skipped)).toBe(
      "5 selected people are left out: 1 up to date, 2 with no email address, 2 duplicate."
    )
  })

  it("plans nothing for an empty selection, and says nothing was left out", () => {
    expect(planReminder([], TODAY)).toEqual({
      personIds: [],
      recipients: [],
      skipped: [],
    })
    expect(describeSkipped([])).toBeNull()
    expect(describeSkipped([{ id: "a", reason: "up-to-date" }])).toBe(
      "1 selected person is left out: 1 up to date."
    )
  })
})

describe("buildReminderEmail", () => {
  const TEMPLATE = {
    subject: "Reminder: {training}",
    text: "Hi {first},\n\nThis is a reminder about your {training}. Please get this done soon.\n\nIf you already have, you can ignore this email.",
  }
  const blank = (value: string, first: string, training: string) =>
    value.replaceAll(first, "{first}").replaceAll(training, "{training}")

  it("contains the first name and the training name, and nothing else personal", () => {
    // Pass the whole person: the email must use only the first name.
    const people: Person[] = [
      {
        id: "p-1",
        firstName: "Grace",
        lastName: "Liu",
        team: "Office",
        email: "grace@example.org",
      },
      {
        id: "p-2",
        firstName: "Tom",
        lastName: "Reyes",
        team: "Warehouse",
        email: "Tom.Reyes@Example.org",
      },
    ]
    for (const [person, training] of [
      [people[0], "Safeguarding training"],
      [people[1], "Forklift licences"],
    ] as const) {
      const email = buildReminderEmail(person, training)
      expect(email.to).toBe(person.email.toLowerCase())
      // With the first name and the training blanked out, every email is the
      // same fixed text: nothing else about the person can be in it.
      expect(blank(email.subject, person.firstName, training)).toBe(
        TEMPLATE.subject
      )
      expect(blank(email.text, person.firstName, training)).toBe(TEMPLATE.text)
      const body = `${email.subject}\n${email.text}`
      for (const other of [person.lastName, person.team, person.id, "@"]) {
        expect(body).not.toContain(other)
      }
      expect(body).not.toMatch(/\d/)
    }
  })

  it("keeps each name on one line, and greets someone with no first name", () => {
    const email = buildReminderEmail(
      { firstName: "Grace\r\nBcc: x@example.org", email: "g@example.org" },
      "Fire\nsafety"
    )
    expect(email.subject).toBe("Reminder: Fire safety")
    expect(email.text.split("\n")[0]).toBe("Hi Grace Bcc: x@example.org,")
    expect(
      buildReminderEmail({ firstName: "  ", email: "g@example.org" }, "X").text
    ).toMatch(/^Hi there,/)
  })
})

describe("checks", () => {
  // 09:00 and 22:00 in London on 6 October 2026 (BST, UTC+1).
  const NINE = new Date("2026-10-06T08:00:00Z")
  const TEN_PM = new Date("2026-10-06T21:00:00Z")

  it("quiet hours run from 21:00 to 08:00 on the tracker's clock", () => {
    expect(inQuietHours(TEN_PM, LONDON)).toBe(true)
    expect(inQuietHours(NINE, LONDON)).toBe(false)
    expect(inQuietHours(new Date("2026-10-06T20:00:00Z"), LONDON)).toBe(true)
    expect(inQuietHours(new Date("2026-10-06T07:00:00Z"), LONDON)).toBe(false)
    // The same instant is daytime in New York.
    expect(inQuietHours(TEN_PM, "America/New_York")).toBe(false)
  })

  it("only lets a manager or an admin send, to someone, outside quiet hours", () => {
    const send = (role: "staff" | "manager" | "admin", count = 3, at = NINE) =>
      checkReminderSend({ role, count, at, timeZone: LONDON })
    expect(send("manager")).toEqual({ ok: true })
    expect(send("admin")).toEqual({ ok: true })
    expect(send("staff")).toMatchObject({ ok: false, code: "not-allowed" })
    // The role is named first, even at night with nobody selected.
    expect(send("staff", 0, TEN_PM)).toMatchObject({ code: "not-allowed" })
    expect(send("manager", 0)).toMatchObject({ code: "nothing-to-send" })
    const quiet = send("manager", 3, TEN_PM)
    expect(quiet).toMatchObject({ ok: false, code: "quiet-hours" })
    expect(!quiet.ok && quiet.reason).toBe(
      "No reminders between 9:00 pm and 8:00 am (Europe/London). Try again after 8:00 am"
    )
  })

  it("needs a manager or an admin, and a reason, to sign off", () => {
    expect(checkSignOff({ role: "manager", reason: "  Seen  " })).toEqual({
      ok: true,
      reason: "Seen",
    })
    expect(checkSignOff({ role: "staff", reason: "Seen" })).toMatchObject({
      code: "not-allowed",
    })
    expect(checkSignOff({ role: "admin", reason: " \n " })).toMatchObject({
      code: "no-reason",
    })
    expect(checkSignOff({ role: "admin", reason: undefined })).toMatchObject({
      code: "no-reason",
    })
  })

  it("has words for counts and names", () => {
    expect(peopleCount(1)).toBe("1 person")
    expect(peopleCount(7)).toBe("7 people")
    expect(fullName({ firstName: " Tom ", lastName: "" })).toBe("Tom")
    expect(summarizeNames(["a", "b", "c", "d", "e", "f"], 4)).toBe(
      "a, b, c, d, and 2 more"
    )
  })
})

// The in-memory server is the demo's stand-in for yours. These tests pin the
// rules it follows, which your server has to follow as well. They include the
// four checks the "Make it yours" instructions ask an assistant to run.
describe("memory server", () => {
  // 09:00 in London, one minute later on every read.
  const clock = (start = "2026-10-06T08:00:00Z") => {
    let t = Date.parse(start)
    return () => new Date((t += 60_000))
  }
  const make = (start?: string) =>
    createMemoryServer({ now: clock(start), delayMs: 0, timeZone: LONDON })
  const attentionIds = (server: ReturnType<typeof make>) => {
    const state = server.snapshot()
    const today = todayIn(new Date(state.asOf), state.timeZone)
    return state.rows
      .filter((r) => needsAttention(r, today))
      .map((r) => r.person.id)
  }

  it("starts with 18 people: 11 up to date, 4 due in 30 days, 3 overdue, and an empty record", () => {
    const state = make().snapshot()
    expect(state.rows).toHaveLength(18)
    expect(
      countStatuses(state.rows, todayIn(new Date(state.asOf), state.timeZone))
    ).toEqual({ "up-to-date": 11, "due-soon": 4, overdue: 3 })
    expect(state.events).toEqual([])
    expect(state.timeZone).toBe(LONDON)
    expect(state.rule.quietHours).toEqual({
      start: "21:00",
      end: "08:00",
      timeZone: LONDON,
    })
  })

  it("check 1: reminding 7 people adds exactly one entry to the record", async () => {
    const server = make()
    const ids = attentionIds(server)
    expect(ids).toHaveLength(7)
    const result = await server.sendReminders({ userId: "joy", personIds: ids })
    expect(result).toEqual({ sent: 7, personIds: ids, skipped: [] })

    const state = await server.load()
    expect(state.events).toHaveLength(1)
    expect(state.events[0]).toMatchObject({
      actor: { name: "Joy Okafor", role: "Manager" },
      action: "sent a reminder to",
      target: "7 people",
      outcome: "succeeded",
    })
    // One email per person, never one To line.
    expect(server.outbox).toHaveLength(7)
    expect(new Set(server.outbox.map((e) => e.to)).size).toBe(7)
    expect(state.rows.filter((r) => r.record?.remindedAt)).toHaveLength(7)
  })

  it("sends emails with only the first name and the training name", async () => {
    const server = make()
    await server.sendReminders({ userId: "joy", personIds: ["p-1"] })
    const [email] = server.outbox
    expect(email).toEqual({
      to: "tom@example.org",
      subject: "Reminder: Safeguarding training",
      text: "Hi Tom,\n\nThis is a reminder about your Safeguarding training. Please get this done soon.\n\nIf you already have, you can ignore this email.",
    })
    expect(`${email.subject} ${email.text}`).not.toMatch(/Reyes|Warehouse/)
  })

  it("reports who it skipped, and still writes one entry", async () => {
    const server = make()
    // p-8 is up to date; p-1 is asked for twice; "nobody" is not on the list.
    const result = await server.sendReminders({
      userId: "hannah",
      personIds: ["p-1", "p-8", "p-1", "nobody", "p-2"],
    })
    expect(result).toEqual({
      sent: 2,
      personIds: ["p-1", "p-2"],
      skipped: [
        { id: "p-8", reason: "up-to-date" },
        { id: "p-1", reason: "duplicate" },
      ],
    })
    const { events } = await server.load()
    expect(events).toHaveLength(1)
    expect(events[0].detail).toContain("2 selected people are left out")
  })

  it("check 3: a non-manager cannot send reminders, even by calling the server directly", async () => {
    const server = make()
    await expect(
      server.sendReminders({ userId: "sam", personIds: attentionIds(server) })
    ).rejects.toThrow("Only a manager or an admin can send reminders")
    const state = await server.load()
    expect(server.outbox).toHaveLength(0)
    expect(state.rows.some((r) => r.record?.remindedAt)).toBe(false)
    // The refusal is one entry in the record.
    expect(state.events).toHaveLength(1)
    expect(state.events[0]).toMatchObject({
      actor: { name: "Sam Osei", role: "Staff" },
      action: "tried to send a reminder to",
      outcome: "blocked",
      reason: "Only a manager or an admin can send reminders",
    })
  })

  it("refuses a send at 22:00 and allows it at 09:00, by the server's own clock", async () => {
    const night = make("2026-10-06T21:00:00Z") // 22:01 in London
    await expect(
      night.sendReminders({ userId: "joy", personIds: ["p-1"] })
    ).rejects.toThrow("No reminders between 9:00 pm and 8:00 am")
    const state = await night.load()
    expect(night.outbox).toHaveLength(0)
    expect(state.events.map((e) => e.outcome)).toEqual(["blocked"])

    const morning = make("2026-10-06T08:00:00Z") // 09:01 in London
    await expect(
      morning.sendReminders({ userId: "joy", personIds: ["p-1"] })
    ).resolves.toMatchObject({ sent: 1 })
  })

  it("refuses a send to nobody, and records the refusal", async () => {
    const server = make()
    await expect(
      server.sendReminders({ userId: "joy", personIds: ["p-8"] })
    ).rejects.toThrow("Select at least one person")
    expect((await server.load()).events).toHaveLength(1)
  })

  it("records a failed send as one entry, changes nothing, and lets it retry", async () => {
    const server = make()
    server.failSend = true
    await expect(
      server.sendReminders({ userId: "joy", personIds: ["p-1", "p-2"] })
    ).rejects.toThrow("The mail service did not answer")
    let state = await server.load()
    expect(state.events).toHaveLength(1)
    expect(state.events[0]).toMatchObject({ outcome: "failed" })
    expect(server.outbox).toHaveLength(0)
    expect(state.rows.some((r) => r.record?.remindedAt)).toBe(false)

    server.failSend = false
    await server.sendReminders({ userId: "joy", personIds: ["p-1", "p-2"] })
    state = await server.load()
    expect(state.events.map((e) => e.outcome)).toEqual(["failed", "succeeded"])
  })

  it("check 2: a sign-off without a reason is refused", async () => {
    const server = make()
    for (const reason of ["", "   ", "\n\t"]) {
      await expect(
        server.signOff({ userId: "joy", personId: "p-1", reason })
      ).rejects.toThrow("Add a reason for the sign-off")
    }
    const state = await server.load()
    // Still overdue, and each refusal is one entry.
    expect(trainingStatus(state.rows[0].record, TODAY)).toBe("overdue")
    expect(state.events.map((e) => e.outcome)).toEqual([
      "blocked",
      "blocked",
      "blocked",
    ])
  })

  it("signs off with a reason: one entry, and the person is up to date", async () => {
    const server = make()
    await server.signOff({
      userId: "hannah",
      personId: "p-1",
      reason: "  Certificate seen and attached ",
    })
    const state = await server.load()
    const tom = state.rows.find((r) => r.person.id === "p-1")!
    expect(tom.record).toMatchObject({
      completedOn: TODAY,
      expiresOn: "2027-10-06",
      signedOffBy: "Hannah Price",
    })
    expect(trainingStatus(tom.record, TODAY)).toBe("up-to-date")
    expect(state.events).toHaveLength(1)
    expect(state.events[0]).toMatchObject({
      actor: { name: "Hannah Price", role: "Admin" },
      action: "signed off",
      target: "Tom Reyes",
      reason: "Certificate seen and attached",
      outcome: "succeeded",
    })
    expect(
      countStatuses(state.rows, todayIn(new Date(state.asOf), state.timeZone))
    ).toEqual({ "up-to-date": 12, "due-soon": 4, overdue: 2 })
  })

  it("does not let staff sign off, even with a reason", async () => {
    const server = make()
    await expect(
      server.signOff({ userId: "sam", personId: "p-5", reason: "I did it" })
    ).rejects.toThrow("Only a manager or an admin can sign someone off")
    const state = await server.load()
    expect(state.rows[4].record?.signedOffBy).toBeUndefined()
    expect(state.events[0]).toMatchObject({ outcome: "blocked" })
  })

  it("refuses a sign-off for someone not on the list", async () => {
    const server = make()
    await expect(
      server.signOff({ userId: "joy", personId: "nobody", reason: "x" })
    ).rejects.toThrow("not on the list")
    expect((await server.load()).events).toHaveLength(1)
  })

  it("rejects an unknown user without writing a record under no name", async () => {
    const server = make()
    await expect(
      server.sendReminders({ userId: "nobody", personIds: ["p-1"] })
    ).rejects.toThrow("Unknown user")
    await expect(
      server.signOff({ userId: "nobody", personId: "p-1", reason: "x" })
    ).rejects.toThrow("Unknown user")
    expect((await server.load()).events).toEqual([])
  })

  it("gives every entry the server's time and a unique id", async () => {
    const server = make()
    await server.sendReminders({ userId: "joy", personIds: ["p-1"] })
    await server.signOff({ userId: "joy", personId: "p-2", reason: "Seen" })
    const { events } = await server.load()
    expect(new Set(events.map((e) => e.id)).size).toBe(2)
    expect(events.every((e) => Date.parse(e.at) > 0)).toBe(true)
    // The record names nobody's email address.
    expect(JSON.stringify(events)).not.toMatch(/@/)
  })
})

describe("demo clock", () => {
  it("reads 09:30 today in the zone, at any real hour, and 22:00 in the evening", () => {
    for (const real of [
      "2026-10-06T02:10:00Z", // 03:10 in London
      "2026-10-06T21:45:00Z", // 22:45 in London
    ]) {
      let t = Date.parse(real)
      const clock = createDemoClock(LONDON, () => t)
      const now = clock.now()
      expect(todayIn(now, LONDON)).toBe(TODAY)
      expect(inQuietHours(now, LONDON)).toBe(false)
      expect(
        now.toLocaleTimeString("en-GB", {
          timeZone: LONDON,
          hour: "2-digit",
          minute: "2-digit",
        })
      ).toBe("09:30")
      t += 5 * 60_000
      expect(clock.now().getTime() - now.getTime()).toBe(5 * 60_000)
      clock.evening = true
      expect(inQuietHours(clock.now(), LONDON)).toBe(true)
    }
  })
})
