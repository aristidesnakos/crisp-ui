"use client"

import * as React from "react"

import { ConfirmSend } from "@/registry/crisp/ui/confirm-send"
import { Switch } from "@/registry/new-york-v4/ui/switch"

// Fictional data. Nothing is sent anywhere.
export default function ConfirmSendDemo() {
  const [sending, setSending] = React.useState(false)
  const [sentCount, setSentCount] = React.useState<number | null>(null)
  const [unsaved, setUnsaved] = React.useState(false)
  const count = 3

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <ConfirmSend
          count={count}
          label="Email this summary"
          sending={sending}
          sentCount={sentCount}
          blockedReason={
            unsaved ? "Save your changes before sending" : undefined
          }
          onSend={async () => {
            setSending(true)
            await new Promise((r) => setTimeout(r, 600))
            setSending(false)
            setSentCount(count)
          }}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Switch checked={unsaved} onCheckedChange={setUnsaved} />
        Pretend there are unsaved edits
      </label>
    </div>
  )
}
