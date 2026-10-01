/**
 * Pure helpers for the approval-step pattern. No network, no React, so they are
 * safe to unit test and to reuse on a server.
 *
 * These decide what a SCREEN shows and offers. They are not an authority: your
 * server must re-check the user, the role and the order, and record the
 * decision, using its own copy of the data.
 */

export type ApprovalOutcome = "approved" | "rejected"

export interface ApprovalDecision {
  outcome: ApprovalOutcome
  /** ISO 8601 date-time, as recorded by your server. */
  at: string
  /** Why. Required on rejection by default (see `validateDecision`). */
  reason?: string
  /** What the signature meant, e.g. "Approved for release", as recorded. */
  meaning?: string
}

export interface Approver {
  /** Stable id. Compared with the signed-in user's id. */
  id: string
  name: string
  /** The role this person signs for, e.g. "Quality". */
  role?: string
  /** Absent until this person has decided. */
  decision?: ApprovalDecision
}

/**
 * How many approvals settle the request:
 * - `"all"`: every approver must approve.
 * - `"any"`: one approval is enough.
 * - `{ min: n }`: n approvals are enough.
 */
export type ApprovalPolicy = "all" | "any" | { min: number }

export type ApprovalStatus = "pending" | "approved" | "rejected"

export interface ApprovalSummary {
  status: ApprovalStatus
  /** Approvals so far. */
  approved: number
  /** Rejections so far. */
  rejected: number
  /** Approvers who have not decided. */
  waiting: number
  /** Approvals required, after the clamping rules below. */
  needed: number
  /** Ids of the approvers who rejected. Only set when `status` is "rejected". */
  blockedBy?: string[]
}

/**
 * Settle a request from its approvers' decisions.
 *
 * One rule covers every policy. `needed` is the approvals required:
 * "all" is every approver, "any" is 1, `{ min }` is `min` rounded down and
 * clamped to between 1 and the number of approvers.
 *
 * - `approved`: approvals >= needed.
 * - `rejected`: approvals plus approvers still waiting < needed, meaning the
 *   requirement can no longer be reached. So under "all" a single rejection
 *   rejects, under "any" it takes everyone rejecting, and `{ min: 2 }` of 3
 *   rejects on the second rejection. A rejection never undoes approvals that
 *   already met the requirement: approval is checked first.
 * - `pending`: anything else.
 *
 * Edge cases, all failing safe:
 * - No approvers: `pending` with `needed: 0`. An empty list never approves
 *   itself; treat it as a set-up error.
 * - Duplicate ids: the first entry for an id counts, later ones are ignored.
 * - `min` greater than the approvers: clamped to the approvers, so it behaves
 *   like "all". A request is never impossible to settle.
 */
export function summarizeApproval(
  approvers: Approver[],
  policy: ApprovalPolicy
): ApprovalSummary {
  const unique = uniqueApprovers(approvers)
  const total = unique.length
  const approved = unique.filter((a) => a.decision?.outcome === "approved")
  const rejected = unique.filter((a) => a.decision?.outcome === "rejected")
  const waiting = total - approved.length - rejected.length
  const needed = approvalsNeeded(total, policy)

  let status: ApprovalStatus = "pending"
  if (total > 0) {
    if (approved.length >= needed) status = "approved"
    else if (approved.length + waiting < needed) status = "rejected"
  }

  return {
    status,
    approved: approved.length,
    rejected: rejected.length,
    waiting,
    needed,
    ...(status === "rejected" ? { blockedBy: rejected.map((a) => a.id) } : {}),
  }
}

/**
 * Can this approver decide right now? Only the signed-in user's own row, only
 * once, and only while the request is still pending.
 *
 * Note: "pending" can include approvers who are not allowed yet (an order
 * your server enforces). Pass `blockedReason` to the component for that; this
 * function only knows about decisions.
 */
export function canDecide(
  approver: Approver,
  currentUserId: string | null | undefined,
  summary: ApprovalSummary
): boolean {
  return (
    Boolean(currentUserId) &&
    approver.id === currentUserId &&
    !approver.decision &&
    summary.status === "pending"
  )
}

export type DecisionCheck =
  | { valid: true; reason?: string }
  | { valid: false; error: string }

export interface DecisionRules {
  /** A rejection needs a reason. Default `true`. */
  requireReasonOnReject?: boolean
  /** An approval needs a reason. Default `false`. */
  requireReasonOnApprove?: boolean
}

/**
 * Check a decision before it is sent. A reason of only whitespace counts as no
 * reason. On success the reason comes back trimmed, or absent if empty.
 */
export function validateDecision(
  decision: { outcome: ApprovalOutcome; reason?: string },
  {
    requireReasonOnReject = true,
    requireReasonOnApprove = false,
  }: DecisionRules = {}
): DecisionCheck {
  if (decision.outcome !== "approved" && decision.outcome !== "rejected") {
    return { valid: false, error: "Choose approve or reject" }
  }
  const reason = decision.reason?.trim() ?? ""
  if (!reason) {
    if (decision.outcome === "rejected" && requireReasonOnReject) {
      return { valid: false, error: "Add a reason for rejecting" }
    }
    if (decision.outcome === "approved" && requireReasonOnApprove) {
      return { valid: false, error: "Add a reason for approving" }
    }
    return { valid: true }
  }
  return { valid: true, reason }
}

/**
 * The policy as a sentence: "All 3 must approve", "Any 1 of 3 can approve",
 * "2 of 3 must approve". Uses the clamped number, so it matches `needed`.
 */
export function describePolicy(
  approvers: Approver[],
  policy: ApprovalPolicy
): string {
  const total = uniqueApprovers(approvers).length
  if (total === 0) return "No approvers are set"
  const needed = approvalsNeeded(total, policy)
  if (total === 1) return "1 approval is needed"
  if (policy === "any") return `Any 1 of ${total} can approve`
  if (needed === total) return `All ${total} must approve`
  return `${needed} of ${total} must approve`
}

function approvalsNeeded(total: number, policy: ApprovalPolicy): number {
  if (total === 0) return 0
  if (policy === "all") return total
  if (policy === "any") return 1
  const min = Math.floor(policy.min)
  if (!Number.isFinite(min)) return total
  return Math.min(Math.max(min, 1), total)
}

/** The approvers, with later entries for an already-seen id dropped. */
export function uniqueApprovers(approvers: Approver[]): Approver[] {
  const seen = new Set<string>()
  return approvers.filter((a) => {
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })
}
