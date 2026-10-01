"use client"

import * as React from "react"

import type { Approver } from "@/registry/crisp/lib/approval"
import { ApprovalStep } from "@/registry/crisp/ui/approval-step"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Switch } from "@/registry/new-york-v4/ui/switch"

const MEANING = "Approved for release"

// Fictional data. Nothing is sent anywhere. In a real tool `approvers` comes
// from your server and `onDecide` is a request that the server checks and records.
const START: Approver[] = [
  {
    id: "tomas",
    name: "Tomas Berg",
    role: "Manufacturing",
    decision: {
      outcome: "approved",
      at: "2026-03-11T09:30:00Z",
      meaning: MEANING,
      reason: "Fixture for rev C is ready",
    },
  },
  { id: "priya", name: "Priya Raman", role: "Quality" },
]

const VIEWERS = [
  { id: "priya", label: "Priya, Quality (can sign)" },
  { id: "sam", label: "Sam, requester (cannot sign)" },
]

export default function ApprovalStepDemo() {
  const [approvers, setApprovers] = React.useState(START)
  const [viewer, setViewer] = React.useState("priya")
  const [failNext, setFailNext] = React.useState(false)

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <div role="group" aria-label="View as" className="flex flex-wrap gap-2">
        {VIEWERS.map((v) => (
          <Button
            key={v.id}
            size="sm"
            variant={viewer === v.id ? "default" : "outline"}
            aria-pressed={viewer === v.id}
            onClick={() => setViewer(v.id)}
          >
            {v.label}
          </Button>
        ))}
      </div>

      <ApprovalStep
        title="ECR-1042: Replace bracket 14-220 with rev C"
        approvers={approvers}
        policy="all"
        currentUserId={viewer}
        meaning={MEANING}
        rejectMeaning="Not approved for release"
        onDecide={async ({ outcome, reason, meaning }) => {
          await new Promise((r) => setTimeout(r, 700))
          if (failNext) {
            setFailNext(false)
            throw new Error("The server did not respond")
          }
          // The server decides who is allowed and stamps the time. Here we
          // just play that part.
          setApprovers((list) =>
            list.map((a) =>
              a.id === viewer
                ? {
                    ...a,
                    decision: {
                      outcome,
                      reason,
                      meaning,
                      at: new Date().toISOString(),
                    },
                  }
                : a
            )
          )
        }}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <label className="flex items-center gap-2">
          <Switch checked={failNext} onCheckedChange={setFailNext} />
          Make the next sign-off fail
        </label>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setApprovers(START)
            setFailNext(false)
          }}
        >
          Reset demo
        </Button>
      </div>
    </div>
  )
}
