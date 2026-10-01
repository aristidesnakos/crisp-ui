import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  formatTimeOfDay,
  isEmailAddress,
  isQuietTime,
  isRuleValid,
  isValidTimeZone,
  nextAllowedSendTime,
  normalizeRule,
  remindersDue,
  sameRules,
  summarizeRule,
  validateRule,
  type AlertRule,
  type QuietHours,
} from "../registry/crisp/lib/alert-rules"

// America/New_York in 2026: clocks go forward 02:00 -> 03:00 EST->EDT at
// 2026-03-08T07:00Z and back 02:00 -> 01:00 EDT->EST at 2026-11-01T06:00Z.
const NIGHT_NY: QuietHours = {
  start: "21:00",
  end: "08:00",
  timeZone: "America/New_York",
}
const NIGHT_IST: QuietHours = {
  start: "21:00",
  end: "08:00",
  timeZone: "Asia/Kolkata",
}
const at = (iso: string) => new Date(iso)
const quiet = (iso: string, q: QuietHours) => isQuietTime(at(iso), q)

const rule = (overrides: Partial<AlertRule> = {}): AlertRule => ({
  id: "calibration",
  label: "Calibration due",
  enabled: true,
  cadenceDays: [30, 14, 7, 1],
  ...overrides,
})

describe("isQuietTime", () => {
  it("handles a window that crosses midnight, start inclusive, end exclusive", () => {
    // January: New York is on EST, UTC-5.
    expect(quiet("2026-01-16T01:59:00Z", NIGHT_NY)).toBe(false) // 20:59
    expect(quiet("2026-01-16T02:00:00Z", NIGHT_NY)).toBe(true) // 21:00
    expect(quiet("2026-01-16T05:00:00Z", NIGHT_NY)).toBe(true) // 00:00
    expect(quiet("2026-01-16T12:59:59Z", NIGHT_NY)).toBe(true) // 07:59:59
    expect(quiet("2026-01-16T13:00:00Z", NIGHT_NY)).toBe(false) // 08:00
    expect(quiet("2026-01-16T17:00:00Z", NIGHT_NY)).toBe(false) // noon
  })

  it("handles a window inside one day", () => {
    const lunch: QuietHours = {
      start: "12:00",
      end: "13:30",
      timeZone: "UTC",
    }
    expect(quiet("2026-01-16T11:59:00Z", lunch)).toBe(false)
    expect(quiet("2026-01-16T12:00:00Z", lunch)).toBe(true)
    expect(quiet("2026-01-16T13:29:00Z", lunch)).toBe(true)
    expect(quiet("2026-01-16T13:30:00Z", lunch)).toBe(false)
  })

  it("treats null and undefined as no quiet hours", () => {
    expect(isQuietTime(at("2026-01-16T05:00:00Z"), null)).toBe(false)
    expect(isQuietTime(at("2026-01-16T05:00:00Z"), undefined)).toBe(false)
  })

  it("refuses a window whose end equals its start instead of guessing", () => {
    const same: QuietHours = { start: "21:00", end: "21:00", timeZone: "UTC" }
    expect(() => isQuietTime(at("2026-01-16T05:00:00Z"), same)).toThrow(
      RangeError
    )
    expect(() => nextAllowedSendTime(at("2026-01-16T05:00:00Z"), same)).toThrow(
      RangeError
    )
    expect(
      validateRule(rule({ quietHours: same }))["quietHours.end"]?.code
    ).toBe("quiet-same")
  })

  it("throws on an invalid zone, a malformed time and an invalid instant", () => {
    const now = at("2026-01-16T05:00:00Z")
    expect(() =>
      isQuietTime(now, {
        start: "21:00",
        end: "08:00",
        timeZone: "Mars/Phobos",
      })
    ).toThrow(RangeError)
    expect(() =>
      isQuietTime(now, { start: "9pm", end: "08:00", timeZone: "UTC" })
    ).toThrow(RangeError)
    expect(() =>
      isQuietTime(now, { start: "21:00", end: "24:00", timeZone: "UTC" })
    ).toThrow(RangeError)
    expect(() => isQuietTime(new Date(NaN), NIGHT_NY)).toThrow(RangeError)
  })

  describe("America/New_York, spring forward (2026-03-08)", () => {
    it("follows the wall clock across the change, not a fixed offset", () => {
      expect(quiet("2026-03-08T01:59:00Z", NIGHT_NY)).toBe(false) // 20:59 EST Mar 7
      expect(quiet("2026-03-08T02:00:00Z", NIGHT_NY)).toBe(true) // 21:00 EST
      expect(quiet("2026-03-08T06:59:00Z", NIGHT_NY)).toBe(true) // 01:59 EST
      expect(quiet("2026-03-08T07:00:00Z", NIGHT_NY)).toBe(true) // 03:00 EDT
      expect(quiet("2026-03-08T11:59:00Z", NIGHT_NY)).toBe(true) // 07:59 EDT
      expect(quiet("2026-03-08T12:00:00Z", NIGHT_NY)).toBe(false) // 08:00 EDT
      // The next evening is on EDT: 21:00 is 01:00Z, not 02:00Z.
      expect(quiet("2026-03-09T00:59:00Z", NIGHT_NY)).toBe(false) // 20:59 EDT
      expect(quiet("2026-03-09T01:00:00Z", NIGHT_NY)).toBe(true) // 21:00 EDT
    })

    it("never matches a window inside the skipped hour", () => {
      const skipped: QuietHours = {
        start: "02:00",
        end: "03:00",
        timeZone: "America/New_York",
      }
      const from = at("2026-03-08T05:00:00Z").getTime()
      const to = at("2026-03-08T09:00:00Z").getTime()
      for (let ms = from; ms < to; ms += 60_000) {
        expect(isQuietTime(new Date(ms), skipped)).toBe(false)
      }
    })

    it("matches 01:00 to 02:00 only before the change", () => {
      const hour: QuietHours = {
        start: "01:00",
        end: "02:00",
        timeZone: "America/New_York",
      }
      expect(quiet("2026-03-08T05:59:00Z", hour)).toBe(false) // 00:59 EST
      expect(quiet("2026-03-08T06:00:00Z", hour)).toBe(true) // 01:00 EST
      expect(quiet("2026-03-08T06:59:00Z", hour)).toBe(true) // 01:59 EST
      expect(quiet("2026-03-08T07:00:00Z", hour)).toBe(false) // 03:00 EDT
    })
  })

  describe("America/New_York, fall back (2026-11-01)", () => {
    it("follows the wall clock across the change, not a fixed offset", () => {
      expect(quiet("2026-11-01T02:00:00Z", NIGHT_NY)).toBe(true) // 22:00 EDT Oct 31
      expect(quiet("2026-11-01T05:59:00Z", NIGHT_NY)).toBe(true) // 01:59 EDT
      expect(quiet("2026-11-01T06:00:00Z", NIGHT_NY)).toBe(true) // 01:00 EST again
      expect(quiet("2026-11-01T12:00:00Z", NIGHT_NY)).toBe(true) // 07:00 EST
      expect(quiet("2026-11-01T12:59:00Z", NIGHT_NY)).toBe(true) // 07:59 EST
      expect(quiet("2026-11-01T13:00:00Z", NIGHT_NY)).toBe(false) // 08:00 EST
      expect(quiet("2026-11-02T01:59:00Z", NIGHT_NY)).toBe(false) // 20:59 EST
      expect(quiet("2026-11-02T02:00:00Z", NIGHT_NY)).toBe(true) // 21:00 EST
    })

    it("matches the repeated hour both times round", () => {
      const hour: QuietHours = {
        start: "01:00",
        end: "02:00",
        timeZone: "America/New_York",
      }
      expect(quiet("2026-11-01T04:59:00Z", hour)).toBe(false) // 00:59 EDT
      expect(quiet("2026-11-01T05:30:00Z", hour)).toBe(true) // 01:30 EDT
      expect(quiet("2026-11-01T06:30:00Z", hour)).toBe(true) // 01:30 EST
      expect(quiet("2026-11-01T06:59:00Z", hour)).toBe(true) // 01:59 EST
      expect(quiet("2026-11-01T07:00:00Z", hour)).toBe(false) // 02:00 EST
    })
  })

  it("works in a zone with a half-hour offset (Asia/Kolkata, UTC+5:30)", () => {
    expect(quiet("2026-01-15T15:29:00Z", NIGHT_IST)).toBe(false) // 20:59
    expect(quiet("2026-01-15T15:30:00Z", NIGHT_IST)).toBe(true) // 21:00
    expect(quiet("2026-01-16T02:29:00Z", NIGHT_IST)).toBe(true) // 07:59
    expect(quiet("2026-01-16T02:30:00Z", NIGHT_IST)).toBe(false) // 08:00
    // The same instant is quiet in one zone and not in another.
    expect(quiet("2026-01-16T02:30:00Z", NIGHT_NY)).toBe(true) // 21:30 EST Jan 15
  })
})

describe("nextAllowedSendTime", () => {
  it("returns a copy of the instant when it is not quiet or there are no quiet hours", () => {
    const noon = at("2026-01-16T17:00:00.123Z")
    const same = nextAllowedSendTime(noon, NIGHT_NY)
    expect(same.toISOString()).toBe("2026-01-16T17:00:00.123Z")
    expect(same).not.toBe(noon)
    expect(nextAllowedSendTime(noon, null).getTime()).toBe(noon.getTime())
    expect(nextAllowedSendTime(noon, undefined).getTime()).toBe(noon.getTime())
  })

  it("moves a quiet instant to the end of the window, before and after midnight", () => {
    // 22:30 EST Jan 15, 05:00 EST Jan 16, and the start minute itself.
    expect(
      nextAllowedSendTime(at("2026-01-16T03:30:20Z"), NIGHT_NY).toISOString()
    ).toBe("2026-01-16T13:00:00.000Z")
    expect(
      nextAllowedSendTime(at("2026-01-16T10:00:00Z"), NIGHT_NY).toISOString()
    ).toBe("2026-01-16T13:00:00.000Z")
    expect(
      nextAllowedSendTime(at("2026-01-16T02:00:00Z"), NIGHT_NY).toISOString()
    ).toBe("2026-01-16T13:00:00.000Z")
    // One millisecond before the window ends.
    expect(
      nextAllowedSendTime(
        at("2026-01-16T12:59:59.999Z"),
        NIGHT_NY
      ).toISOString()
    ).toBe("2026-01-16T13:00:00.000Z")
  })

  it("handles a half-hour offset zone", () => {
    expect(
      nextAllowedSendTime(at("2026-01-15T16:10:45Z"), NIGHT_IST).toISOString()
    ).toBe("2026-01-16T02:30:00.000Z") // 21:40 IST -> 08:00 IST
  })

  it("lands on 08:00 wall time across spring forward (a 10-hour night)", () => {
    // 22:00 EST Mar 7 -> 08:00 EDT Mar 8. A fixed 10 hours would give 09:00.
    expect(
      nextAllowedSendTime(at("2026-03-08T03:00:00Z"), NIGHT_NY).toISOString()
    ).toBe("2026-03-08T12:00:00.000Z")
  })

  it("lands on 08:00 wall time across fall back (a 12-hour night)", () => {
    // 22:00 EDT Oct 31 -> 08:00 EST Nov 1. A fixed 10 hours would give 07:00.
    expect(
      nextAllowedSendTime(at("2026-11-01T02:00:00Z"), NIGHT_NY).toISOString()
    ).toBe("2026-11-01T13:00:00.000Z")
  })

  it("lands on the first instant after a skipped end time", () => {
    const toHalfPastTwo: QuietHours = {
      start: "21:00",
      end: "02:30",
      timeZone: "America/New_York",
    }
    // 02:30 does not exist on 2026-03-08; the first allowed minute is 03:00 EDT.
    expect(
      nextAllowedSendTime(
        at("2026-03-08T03:00:00Z"),
        toHalfPastTwo
      ).toISOString()
    ).toBe("2026-03-08T07:00:00.000Z")
  })

  it("always returns an allowed minute that follows a quiet one, around both clock changes", () => {
    const sweeps = [
      ["2026-03-06T00:00:00Z", "2026-03-11T00:00:00Z"],
      ["2026-10-30T00:00:00Z", "2026-11-04T00:00:00Z"],
    ]
    for (const [from, to] of sweeps) {
      for (
        let ms = at(from).getTime();
        ms < at(to).getTime();
        ms += 37 * 60_000
      ) {
        const instant = new Date(ms)
        const next = nextAllowedSendTime(instant, NIGHT_NY)
        expect(isQuietTime(next, NIGHT_NY)).toBe(false)
        if (isQuietTime(instant, NIGHT_NY)) {
          expect(next.getTime()).toBeGreaterThan(ms)
          expect(isQuietTime(new Date(next.getTime() - 60_000), NIGHT_NY)).toBe(
            true
          )
        } else {
          expect(next.getTime()).toBe(ms)
        }
      }
    }
  })
})

describe("validateRule", () => {
  it("accepts a complete rule", () => {
    const errors = validateRule(
      rule({
        escalateAfterDays: 3,
        escalateTo: "ops@example.org",
        quietHours: NIGHT_NY,
      })
    )
    expect(errors).toEqual({})
    expect(isRuleValid(errors)).toBe(true)
  })

  it("flags duplicate cadence days", () => {
    const error = validateRule(rule({ cadenceDays: [7, 14, 7] })).cadenceDays
    expect(error?.code).toBe("cadence-duplicate")
    expect(error?.message).toContain("7")
  })

  it("flags zero, negative, fractional and non-finite cadence days", () => {
    for (const bad of [0, -3, 2.5, NaN, Infinity]) {
      const error = validateRule(rule({ cadenceDays: [14, bad] })).cadenceDays
      expect(error?.code, String(bad)).toBe("cadence-invalid")
    }
  })

  it("flags cadence days above the maximum", () => {
    expect(validateRule(rule({ cadenceDays: [3651] })).cadenceDays?.code).toBe(
      "cadence-too-large"
    )
  })

  it("flags an empty cadence on an enabled rule but not on a disabled one", () => {
    expect(validateRule(rule({ cadenceDays: [] })).cadenceDays?.code).toBe(
      "cadence-empty"
    )
    expect(validateRule(rule({ cadenceDays: [], enabled: false }))).toEqual({})
  })

  it("requires a target when there is an escalation delay", () => {
    const errors = validateRule(rule({ escalateAfterDays: 3 }))
    expect(errors.escalateTo?.code).toBe("escalation-target-missing")
    const blank = validateRule(rule({ escalateAfterDays: 3, escalateTo: "  " }))
    expect(blank.escalateTo?.code).toBe("escalation-target-missing")
  })

  it("requires a delay when there is an escalation target", () => {
    const errors = validateRule(rule({ escalateTo: "ops@example.org" }))
    expect(errors.escalateAfterDays?.code).toBe("escalation-days-missing")
    expect(errors.escalateTo).toBeUndefined()
  })

  it("requires the escalation delay to be a whole number of days, 1 or more", () => {
    for (const bad of [0, -1, 1.5, NaN]) {
      const errors = validateRule(
        rule({ escalateAfterDays: bad, escalateTo: "ops@example.org" })
      )
      expect(errors.escalateAfterDays?.code, String(bad)).toBe(
        "escalation-days-invalid"
      )
    }
  })

  it("checks the target with validateEmail", () => {
    const base = rule({ escalateAfterDays: 3, escalateTo: "ops@example.org" })
    expect(
      validateRule({ ...base, escalateTo: "not-an-email" }).escalateTo?.code
    ).toBe("escalation-target-invalid")
    // A stricter backend rule is honoured, and receives the lowercased address.
    const seen: string[] = []
    const errors = validateRule(
      { ...base, escalateTo: " Ops@Example.org " },
      {
        validateEmail: (email) => {
          seen.push(email)
          return email.endsWith("@school.org")
        },
      }
    )
    expect(errors.escalateTo?.code).toBe("escalation-target-invalid")
    expect(seen).toEqual(["ops@example.org"])
  })

  it("does not call a missing escalation an error", () => {
    expect(validateRule(rule({ escalateTo: undefined }))).toEqual({})
  })

  it("flags malformed times and a start equal to the end", () => {
    const bad = (start: string, end: string) =>
      validateRule(rule({ quietHours: { start, end, timeZone: "UTC" } }))
    expect(bad("9pm", "08:00")["quietHours.start"]?.code).toBe("time-invalid")
    expect(bad("21:00", "")["quietHours.end"]?.code).toBe("time-invalid")
    expect(bad("24:00", "08:00")["quietHours.start"]?.code).toBe("time-invalid")
    expect(bad("21:60", "08:00")["quietHours.start"]?.code).toBe("time-invalid")
    expect(bad("08:00", "08:00")["quietHours.end"]?.code).toBe("quiet-same")
    expect(bad("21:00", "08:00")).toEqual({})
  })

  it("flags an unknown or non-IANA time zone", () => {
    const zone = (timeZone: string) =>
      validateRule(
        rule({ quietHours: { start: "21:00", end: "08:00", timeZone } })
      )["quietHours.timeZone"]?.code
    expect(zone("Mars/Phobos")).toBe("zone-invalid")
    expect(zone("")).toBe("zone-invalid")
    expect(zone("+05:30")).toBe("zone-invalid")
    expect(zone(" America/New_York")).toBe("zone-invalid")
    expect(zone("Asia/Kolkata")).toBeUndefined()
    expect(zone("UTC")).toBeUndefined()
  })

  it("does not check quiet hours that are null", () => {
    expect(validateRule(rule({ quietHours: null }))).toEqual({})
  })
})

describe("isValidTimeZone and isEmailAddress", () => {
  it("knows real zones", () => {
    expect(isValidTimeZone("Europe/London")).toBe(true)
    expect(isValidTimeZone("Nope/Zone")).toBe(false)
  })
  it("uses the same default shape check as the roster", () => {
    expect(isEmailAddress("a.b@example.org")).toBe(true)
    expect(isEmailAddress("a..b@example.org")).toBe(false)
    expect(isEmailAddress("a@b")).toBe(false)
  })
})

describe("normalizeRule and sameRules", () => {
  it("sorts cadence largest first, removes repeats, tidies the address", () => {
    const input = rule({
      cadenceDays: [1, 30, 7, 14, 7],
      escalateAfterDays: 3,
      escalateTo: "  Ops@Example.org ",
      quietHours: { start: " 21:00", end: "08:00 ", timeZone: " UTC " },
    })
    const copy = JSON.parse(JSON.stringify(input))
    expect(normalizeRule(input)).toEqual({
      id: "calibration",
      label: "Calibration due",
      enabled: true,
      cadenceDays: [30, 14, 7, 1],
      escalateAfterDays: 3,
      escalateTo: "ops@example.org",
      quietHours: { start: "21:00", end: "08:00", timeZone: "UTC" },
    })
    expect(input).toEqual(copy) // not mutated
  })

  it("drops an empty address but keeps everything else the person typed", () => {
    const out = normalizeRule(
      rule({ cadenceDays: [0, 3], escalateTo: " ", quietHours: null })
    )
    expect(out.escalateTo).toBeUndefined()
    expect(out.cadenceDays).toEqual([3, 0])
    expect(out.quietHours).toBeNull()
  })

  it("treats a reordered cadence or a capitalised address as no change", () => {
    const a = [rule({ escalateAfterDays: 3, escalateTo: "ops@example.org" })]
    const b = [
      rule({
        cadenceDays: [1, 7, 14, 30],
        escalateAfterDays: 3,
        escalateTo: "OPS@example.org",
      }),
    ]
    expect(sameRules(a, b)).toBe(true)
  })

  it("sees a real change and a different length", () => {
    const base = [rule()]
    expect(sameRules(base, [rule({ cadenceDays: [30, 7, 1] })])).toBe(false)
    expect(sameRules(base, [rule({ enabled: false })])).toBe(false)
    expect(sameRules(base, [rule({ quietHours: NIGHT_NY })])).toBe(false)
    expect(sameRules(base, [rule(), rule({ id: "b" })])).toBe(false)
    expect(sameRules([], [])).toBe(true)
  })
})

describe("remindersDue", () => {
  const due = at("2026-04-30T12:00:00Z")

  it("splits the cadence into steps that have passed and the next one", () => {
    const result = remindersDue(due, at("2026-04-20T12:00:00Z"), [1, 7, 14, 30])
    expect(result.passed.map((s) => s.days)).toEqual([30, 14])
    expect(result.next?.days).toBe(7)
    expect(result.next?.at.toISOString()).toBe("2026-04-23T12:00:00.000Z")
    expect(result.pastDue).toBe(false)
  })

  it("counts a step as passed at its exact instant", () => {
    const result = remindersDue(due, at("2026-04-23T12:00:00Z"), [30, 14, 7, 1])
    expect(result.passed.map((s) => s.days)).toEqual([30, 14, 7])
    expect(result.next?.days).toBe(1)
  })

  it("has nothing passed before the first step", () => {
    const result = remindersDue(due, at("2026-01-01T00:00:00Z"), [30, 14])
    expect(result.passed).toEqual([])
    expect(result.next?.days).toBe(30)
  })

  it("has no next step once the last one has passed", () => {
    const result = remindersDue(due, at("2026-04-29T13:00:00Z"), [30, 1])
    expect(result.passed.map((s) => s.days)).toEqual([30, 1])
    expect(result.next).toBeNull()
    expect(result.pastDue).toBe(false)
  })

  it("passes every step and reports past due when the due date is in the past", () => {
    const result = remindersDue(due, at("2026-06-01T00:00:00Z"), [30, 14, 7, 1])
    expect(result.passed.map((s) => s.days)).toEqual([30, 14, 7, 1])
    expect(result.next).toBeNull()
    expect(result.pastDue).toBe(true)
  })

  it("returns nothing for an empty cadence", () => {
    const result = remindersDue(due, at("2026-04-20T00:00:00Z"), [])
    expect(result).toEqual({ passed: [], next: null, pastDue: false })
  })

  it("ignores invalid values and counts a repeat once", () => {
    const result = remindersDue(due, at("2026-04-01T00:00:00Z"), [
      7,
      7,
      0,
      -1,
      2.5,
      NaN,
    ])
    expect(result.passed).toEqual([])
    expect(result.next?.days).toBe(7)
  })

  it("throws on an invalid date", () => {
    expect(() => remindersDue(new Date(NaN), due, [1])).toThrow(RangeError)
    expect(() => remindersDue(due, new Date(NaN), [1])).toThrow(RangeError)
  })
})

describe("summarizeRule", () => {
  it("writes the full sentence", () => {
    expect(
      summarizeRule(
        rule({
          escalateAfterDays: 3,
          escalateTo: "ops@example.org",
          quietHours: { start: "21:00", end: "08:00", timeZone: "UTC" },
        })
      )
    ).toBe(
      "Reminds 30, 14, 7 and 1 days before. Escalates to ops@example.org after 3 days. Never sends between 9:00 pm and 8:00 am."
    )
  })

  it("names what the rule does not do", () => {
    expect(summarizeRule(rule({ cadenceDays: [7] }))).toBe(
      "Reminds 7 days before. Does not escalate. Can send at any hour."
    )
  })

  it("uses the singular for one day and the right joiner for two", () => {
    expect(
      summarizeRule(
        rule({ cadenceDays: [1], escalateAfterDays: 1, escalateTo: "a@b.co" })
      )
    ).toContain("Reminds 1 day before. Escalates to a@b.co after 1 day.")
    expect(summarizeRule(rule({ cadenceDays: [1, 7] }))).toContain(
      "Reminds 7 and 1 days before."
    )
  })

  it("sorts the cadence and can add the time zone", () => {
    expect(
      summarizeRule(
        rule({
          cadenceDays: [1, 30, 7],
          quietHours: {
            start: "00:00",
            end: "12:30",
            timeZone: "Asia/Kolkata",
          },
        }),
        { includeTimeZone: true }
      )
    ).toBe(
      "Reminds 30, 7 and 1 days before. Does not escalate. Never sends between 12:00 am and 12:30 pm (Asia/Kolkata)."
    )
  })

  it("formats times of day", () => {
    expect(formatTimeOfDay("00:00")).toBe("12:00 am")
    expect(formatTimeOfDay("12:00")).toBe("12:00 pm")
    expect(formatTimeOfDay("13:05")).toBe("1:05 pm")
    expect(formatTimeOfDay("23:59")).toBe("11:59 pm")
    expect(formatTimeOfDay("nope")).toBe("nope")
  })

  it("says so when the rule is off", () => {
    expect(summarizeRule(rule({ enabled: false, cadenceDays: [7] }))).toBe(
      "This rule is off, so nothing is sent. If turned on: reminds 7 days before. Does not escalate. Can send at any hour."
    )
  })

  it("names unfinished parts instead of hiding them", () => {
    const text = summarizeRule(
      rule({
        cadenceDays: [],
        escalateAfterDays: 3,
        quietHours: { start: "08:00", end: "08:00", timeZone: "UTC" },
      })
    )
    expect(text).toBe(
      "Sends no reminders yet. Escalation is not finished. Quiet hours are not finished."
    )
  })
})

describe("alert-rules docs page", () => {
  const page = readFileSync(
    new URL("../content/docs/components/alert-rules.mdx", import.meta.url),
    "utf8"
  )
  const section = page.split(/^## Agent prompt$/m)[1] ?? ""
  const prompt = /```text\n([\s\S]*?)\n```/.exec(section)?.[1] ?? ""

  it("has an agent prompt of at most 2,500 characters", () => {
    expect(prompt.length).toBeGreaterThan(500)
    expect(prompt.length).toBeLessThanOrEqual(2500)
  })

  it("gives the exact install command and tells the agent to read the files", () => {
    expect(prompt).toContain(
      "npx shadcn@latest add https://regularui.com/r/alert-rules.json"
    )
    expect(prompt.toLowerCase()).toContain("read the installed files")
  })

  it("says the UI does not enforce quiet hours and that nothing is made compliant", () => {
    expect(prompt.toLowerCase()).toContain("server")
    expect(page).toContain("does not make anything compliant")
  })
})
