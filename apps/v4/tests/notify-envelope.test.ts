import { describe, expect, it } from "vitest"

import {
  applySavedChannel,
  buildEnvelope,
  listForChannel,
  peopleFromLists,
  sameList,
} from "../registry/crisp/lib/notify-envelope"

const CHANNELS = ["email", "sms"]

describe("peopleFromLists", () => {
  it("merges one address across channels into a single person", () => {
    const people = peopleFromLists(
      { email: ["mara@example.org"], sms: ["mara@example.org"] },
      CHANNELS
    )
    expect(people).toEqual([
      { email: "mara@example.org", channels: { email: true, sms: true } },
    ])
  })

  it("normalizes case and whitespace and skips blanks", () => {
    const people = peopleFromLists(
      { email: ["  Mara@Example.org ", "", "   "], sms: [] },
      CHANNELS
    )
    expect(people).toEqual([
      { email: "mara@example.org", channels: { email: true, sms: false } },
    ])
  })

  it("keeps first-seen order and tolerates a missing channel list", () => {
    const people = peopleFromLists({ sms: ["b@x.io"], email: ["a@x.io"] }, [
      "email",
      "sms",
      "push",
    ])
    expect(people.map((p) => p.email)).toEqual(["a@x.io", "b@x.io"])
    expect(people[0].channels).toEqual({ email: true, sms: false, push: false })
  })
})

describe("listForChannel", () => {
  it("returns the switched-on addresses in roster order", () => {
    const people = peopleFromLists(
      { email: ["a@x.io", "b@x.io"], sms: ["b@x.io"] },
      CHANNELS
    )
    expect(listForChannel(people, "email")).toEqual(["a@x.io", "b@x.io"])
    expect(listForChannel(people, "sms")).toEqual(["b@x.io"])
    expect(listForChannel(people, "unknown")).toEqual([])
  })
})

describe("sameList", () => {
  it("ignores order, case, whitespace and duplicates", () => {
    expect(
      sameList(["B@x.io", "a@x.io"], ["a@x.io ", "b@x.io", "A@x.io"])
    ).toBe(true)
  })

  it("treats two empty lists as the same", () => {
    expect(sameList([], ["", "  "])).toBe(true)
  })

  it("detects an added or removed address", () => {
    expect(sameList(["a@x.io"], ["a@x.io", "b@x.io"])).toBe(false)
    expect(sameList(["a@x.io", "b@x.io"], ["a@x.io"])).toBe(false)
  })
})

describe("applySavedChannel", () => {
  const start = peopleFromLists(
    { email: ["a@x.io", "b@x.io"], sms: ["a@x.io"] },
    CHANNELS
  )

  it("replaces only the saved channel and leaves the others alone", () => {
    const next = applySavedChannel(start, "email", ["b@x.io"], CHANNELS)
    expect(listForChannel(next, "email")).toEqual(["b@x.io"])
    expect(listForChannel(next, "sms")).toEqual(["a@x.io"])
  })

  it("adds people who are saved but not on the roster yet", () => {
    const next = applySavedChannel(
      start,
      "sms",
      ["a@x.io", "New@X.io"],
      CHANNELS
    )
    expect(next.at(-1)).toEqual({
      email: "new@x.io",
      channels: { email: false, sms: true },
    })
  })

  it("does not mutate its input", () => {
    const snapshot = structuredClone(start)
    applySavedChannel(start, "email", [], CHANNELS)
    expect(start).toEqual(snapshot)
  })
})

describe("buildEnvelope", () => {
  it("puts recipients on to and copied parties on cc and replyTo", () => {
    expect(buildEnvelope(["a@x.io", "b@x.io"], ["boss@x.io"])).toEqual({
      to: ["a@x.io", "b@x.io"],
      cc: ["boss@x.io"],
      replyTo: ["boss@x.io"],
    })
  })

  it("never lists an address on both to and cc, ignoring case", () => {
    const { to, cc, replyTo } = buildEnvelope(
      ["a@x.io", "B@x.io"],
      ["b@x.io", "boss@x.io"]
    )
    expect(to).toEqual(["a@x.io", "B@x.io"])
    expect(cc).toEqual(["boss@x.io"])
    // replyTo keeps every copied party, so replies still reach them.
    expect(replyTo).toEqual(["b@x.io", "boss@x.io"])
  })

  it("dedupes and trims the to list, keeping the first spelling", () => {
    expect(buildEnvelope([" a@x.io", "A@X.io", "", "b@x.io"], []).to).toEqual([
      "a@x.io",
      "b@x.io",
    ])
  })

  it("returns empty lists for empty input", () => {
    expect(buildEnvelope([], [])).toEqual({ to: [], cc: [], replyTo: [] })
  })
})
