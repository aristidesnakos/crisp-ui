"use client"

import { StatusStrip } from "@/registry/crisp/ui/status-strip"
import { Button } from "@/registry/new-york-v4/ui/button"

// Fictional data. Nothing here is saved anywhere.
export default function StatusStripDemo() {
  return (
    <StatusStrip
      className="w-full max-w-xl"
      headlineNoun="staff trained"
      segments={[
        { key: "done", label: "completed", count: 11, tone: "done" },
        {
          key: "active",
          label: "signed in, not trained",
          count: 4,
          tone: "active",
        },
        {
          key: "pending",
          label: "not signed in yet",
          count: 3,
          tone: "pending",
        },
      ]}
      action={<Button variant="outline">Email this summary</Button>}
    />
  )
}
