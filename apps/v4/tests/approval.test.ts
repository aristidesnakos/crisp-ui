import { describe, expect, it } from "vitest"

import {
  canDecide,
  describePolicy,
  summarizeApproval,
  validateDecision,
  type Approver,
} from "../registry/crisp/lib/approval"

const at = "2026-03-12T14:05:00Z"
const yes = { outcome: "approved", at } as const
const no = { outcome: "rejected", at, reason: "Wrong revision" } as const

const person = (id: string, decision?: Approver["decision"]): Approver => ({
  id,
  name: id.toUpperCase(),
  decision,
})

describe("summarizeApproval: all", () => {
  it("is pending until everyone has approved", () => {
    expect(summarizeApproval([person("a", yes), person("b")], "all")).toEqual({
      status: "pending",
      approved: 1,
      rejected: 0,
      waiting: 1,
      needed: 2,
    })
  })

  it("is approved when everyone has approved", () => {
    const summary = summarizeApproval(
      [person("a", yes), person("b", yes)],
      "all"
    )
    expect(summary.status).toBe("approved")
    expect(summary.blockedBy).toBeUndefined()
  })

  it("rejects on any single rejection, and names who", () => {
    const summary = summarizeApproval([person("a"), person("b", no)], "all")
    expect(summary.status).toBe("rejected")
    expect(summary.blockedBy).toEqual(["b"])
    expect(summary.waiting).toBe(1)
  })

  it("rejects on a rejection that comes after approvals", () => {
    const summary = summarizeApproval(
      [person("a", yes), person("b", yes), person("c", no)],
      "all"
    )
    expect(summary).toMatchObject({
      status: "rejected",
      approved: 2,
      rejected: 1,
    })
  })
})

describe("summarizeApproval: any", () => {
  it("approves on the first approval and does not wait for the rest", () => {
    const summary = summarizeApproval(
      [person("a", yes), person("b"), person("c")],
      "any"
    )
    expect(summary).toMatchObject({ status: "approved", needed: 1, waiting: 2 })
  })

  it("is not vetoed by one rejection while others can still approve", () => {
    const summary = summarizeApproval(
      [person("a", no), person("b"), person("c")],
      "any"
    )
    expect(summary.status).toBe("pending")
  })

  it("keeps an approval that came before a rejection", () => {
    const summary = summarizeApproval(
      [person("a", yes), person("b", no), person("c")],
      "any"
    )
    expect(summary.status).toBe("approved")
  })

  it("rejects only when everyone has rejected", () => {
    const summary = summarizeApproval([person("a", no), person("b", no)], "any")
    expect(summary).toMatchObject({ status: "rejected", blockedBy: ["a", "b"] })
  })
})

describe("summarizeApproval: min", () => {
  const three = (
    a?: Approver["decision"],
    b?: Approver["decision"],
    c?: Approver["decision"]
  ) => [person("a", a), person("b", b), person("c", c)]

  it("approves at the threshold", () => {
    expect(summarizeApproval(three(yes, yes), { min: 2 }).status).toBe(
      "approved"
    )
  })

  it("stays pending while the threshold is still reachable", () => {
    expect(summarizeApproval(three(yes, no), { min: 2 }).status).toBe("pending")
    expect(summarizeApproval(three(no), { min: 2 }).status).toBe("pending")
  })

  it("rejects once the threshold can no longer be reached", () => {
    const summary = summarizeApproval(three(no, no), { min: 2 })
    expect(summary).toMatchObject({ status: "rejected", blockedBy: ["a", "b"] })
  })

  it("clamps a min greater than the approvers down to all of them", () => {
    const two = [person("a", yes), person("b")]
    expect(summarizeApproval(two, { min: 5 })).toMatchObject({
      status: "pending",
      needed: 2,
    })
    expect(
      summarizeApproval([person("a", yes), person("b", yes)], { min: 5 }).status
    ).toBe("approved")
  })

  it("treats a min below 1, fractional or not a number safely", () => {
    const two = [person("a"), person("b")]
    expect(summarizeApproval(two, { min: 0 }).needed).toBe(1)
    expect(summarizeApproval(two, { min: -3 }).needed).toBe(1)
    expect(summarizeApproval(two, { min: 1.9 }).needed).toBe(1)
    expect(summarizeApproval(two, { min: Number.NaN }).needed).toBe(2)
  })
})

describe("summarizeApproval: edge cases", () => {
  it("never approves a request with no approvers", () => {
    for (const policy of ["all", "any", { min: 1 }] as const) {
      expect(summarizeApproval([], policy)).toEqual({
        status: "pending",
        approved: 0,
        rejected: 0,
        waiting: 0,
        needed: 0,
      })
    }
  })

  it("counts a duplicated id once, keeping the first entry", () => {
    const summary = summarizeApproval(
      [person("a", yes), person("a", no), person("b")],
      "all"
    )
    expect(summary).toMatchObject({
      approved: 1,
      rejected: 0,
      waiting: 1,
      needed: 2,
    })
    expect(summary.status).toBe("pending")
  })

  it("cannot be approved by one person listed twice", () => {
    const summary = summarizeApproval([person("a", yes), person("a", yes)], {
      min: 2,
    })
    expect(summary).toMatchObject({
      status: "approved",
      approved: 1,
      needed: 1,
    })
  })
})

describe("canDecide", () => {
  const approvers = [person("a"), person("b", yes), person("c")]
  const pending = summarizeApproval(approvers, "all")

  it("lets a waiting approver decide on a pending request", () => {
    expect(canDecide(approvers[0], "a", pending)).toBe(true)
  })

  it("does not let an approver decide twice", () => {
    expect(canDecide(approvers[1], "b", pending)).toBe(false)
  })

  it("is only about the signed-in user's own row", () => {
    expect(canDecide(approvers[0], "c", pending)).toBe(false)
    expect(canDecide(approvers[0], undefined, pending)).toBe(false)
    expect(canDecide(approvers[0], null, pending)).toBe(false)
    expect(canDecide(approvers[0], "", pending)).toBe(false)
  })

  it("lets nobody decide once the request is settled", () => {
    const rejected = [person("a"), person("b", no)]
    expect(
      canDecide(rejected[0], "a", summarizeApproval(rejected, "all"))
    ).toBe(false)
    const approved = [person("a"), person("b", yes)]
    expect(
      canDecide(approved[0], "a", summarizeApproval(approved, "any"))
    ).toBe(false)
  })
})

describe("validateDecision", () => {
  it("requires a reason on reject by default", () => {
    expect(validateDecision({ outcome: "rejected" }, {})).toEqual({
      valid: false,
      error: "Add a reason for rejecting",
    })
    expect(validateDecision({ outcome: "rejected", reason: "" })).toMatchObject(
      {
        valid: false,
      }
    )
  })

  it("treats a whitespace-only reason as no reason", () => {
    expect(
      validateDecision(
        { outcome: "rejected", reason: " \n\t  " },
        { requireReasonOnReject: true }
      )
    ).toMatchObject({ valid: false })
    expect(
      validateDecision(
        { outcome: "approved", reason: "   " },
        { requireReasonOnApprove: true }
      )
    ).toMatchObject({ valid: false })
  })

  it("returns the reason trimmed", () => {
    expect(
      validateDecision({ outcome: "rejected", reason: "  Wrong revision \n" })
    ).toEqual({ valid: true, reason: "Wrong revision" })
  })

  it("lets a reject through without a reason when the rule is off", () => {
    expect(
      validateDecision(
        { outcome: "rejected" },
        { requireReasonOnReject: false }
      )
    ).toEqual({ valid: true })
  })

  it("does not need a reason to approve unless asked", () => {
    expect(validateDecision({ outcome: "approved" })).toEqual({ valid: true })
    expect(
      validateDecision(
        { outcome: "approved" },
        { requireReasonOnApprove: true }
      )
    ).toEqual({ valid: false, error: "Add a reason for approving" })
  })

  it("rejects an unknown outcome", () => {
    expect(
      validateDecision({ outcome: "maybe" as "approved", reason: "x" })
    ).toMatchObject({ valid: false })
  })
})

describe("describePolicy", () => {
  const four = ["a", "b", "c", "d"].map((id) => person(id))

  it("words each policy", () => {
    expect(describePolicy(four.slice(0, 3), { min: 2 })).toBe(
      "2 of 3 must approve"
    )
    expect(describePolicy(four, "all")).toBe("All 4 must approve")
    expect(describePolicy(four, "any")).toBe("Any 1 of 4 can approve")
  })

  it("uses the clamped number and handles one or none", () => {
    expect(describePolicy(four.slice(0, 2), { min: 9 })).toBe(
      "All 2 must approve"
    )
    expect(describePolicy(four.slice(0, 1), "any")).toBe("1 approval is needed")
    expect(describePolicy([], "all")).toBe("No approvers are set")
  })
})
