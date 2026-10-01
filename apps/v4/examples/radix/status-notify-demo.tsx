"use client"

import * as React from "react"

import { StatusNotify } from "@/registry/crisp/blocks/status-notify"

// Fictional data. Nothing here is saved anywhere.
export default function StatusNotifyDemo() {
  const [saved, setSaved] = React.useState({
    automatic: [] as string[],
    onDemand: ["mara@example.org", "jules@example.org"],
  })

  return (
    <div className="w-full max-w-3xl">
      <StatusNotify
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
        automatic={{
          label: "Each finish",
          hint: "as staff complete",
          limit: 5,
        }}
        onDemand={{ label: "Digest", hint: "only when sent", limit: 5 }}
        saved={saved}
        onSave={async (channel, emails) => {
          await new Promise((r) => setTimeout(r, 400))
          setSaved((s) => ({ ...s, [channel]: emails }))
        }}
        onSend={async () => {
          await new Promise((r) => setTimeout(r, 600))
          return saved.onDemand.length
        }}
        onError={(error, ctx) => console.error(ctx.action, error)}
        automaticFallback="No one is set to hear as staff finish, so those notices go to the admin team instead."
      />
    </div>
  )
}
