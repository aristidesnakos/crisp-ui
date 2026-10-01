"use client"

import * as React from "react"

import { buildEnvelope } from "@/registry/crisp/lib/notify-envelope"
import { Input } from "@/registry/new-york-v4/ui/input"

const split = (value: string) =>
  value
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)

// Fictional addresses. Nothing here is sent anywhere.
export default function NotifyEnvelopeDemo() {
  const [recipients, setRecipients] = React.useState(
    "mara@example.org, jules@example.org, Mara@Example.org"
  )
  const [copied, setCopied] = React.useState(
    "admin@example.org, jules@example.org"
  )
  const envelope = buildEnvelope(split(recipients), split(copied))

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="envelope-demo-to" className="text-sm font-medium">
          Recipients
        </label>
        <Input
          id="envelope-demo-to"
          value={recipients}
          onChange={(event) => setRecipients(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="envelope-demo-copied" className="text-sm font-medium">
          Copied
        </label>
        <Input
          id="envelope-demo-copied"
          value={copied}
          onChange={(event) => setCopied(event.target.value)}
        />
      </div>
      <pre
        aria-live="polite"
        className="overflow-x-auto rounded-lg bg-muted p-4 text-sm"
      >
        {JSON.stringify(envelope, null, 2)}
      </pre>
    </div>
  )
}
