"use client"

import * as React from "react"

import {
  buildAuditEvent,
  type AuditEvent,
} from "@/registry/crisp/lib/audit-event"
import { AuditTimeline } from "@/registry/crisp/ui/audit-timeline"
import { ConfirmSend } from "@/registry/crisp/ui/confirm-send"
import { Switch } from "@/registry/new-york-v4/ui/switch"

const TIME_ZONE = "America/New_York"
// Fixed so the demo reads the same every time. A real clock is the server's.
const START = Date.parse("2026-10-02T14:30:00Z")

// Fictional people and data. Nothing here is saved or sent anywhere.
const SEED: AuditEvent[] = [
  {
    id: "evt_6",
    at: "2026-10-02T14:12:00Z",
    actor: { name: "Mara Lopez", role: "Registrar" },
    action: "sent the attendance summary to",
    target: "3 guardians",
    reason: "Weekly summary",
    outcome: "succeeded",
    detail: "First names only. Sent to the saved list of 3.",
  },
  {
    id: "evt_5",
    at: "2026-10-02T13:58:00Z",
    actor: { name: "Mara Lopez", role: "Registrar" },
    action: "saved the guardian list",
    outcome: "failed",
    detail: "The server rejected the save, so the list is unchanged.",
  },
  {
    id: "evt_4",
    at: "2026-10-01T20:20:00Z",
    actor: { name: "Sam Okafor", role: "Project engineer" },
    action: "approved",
    target: "ECO-2041",
    reason: "Rev C fixes the tolerance stack-up",
    outcome: "succeeded",
    detail: "Signature meaning: approval.",
  },
  {
    id: "evt_3",
    at: "2026-10-01T13:05:00Z",
    actor: { name: "Priya Nair", role: "Clinic manager" },
    action: "tried to send reminders to",
    target: "12 patients",
    reason: "Quiet hours: no sends between 9 pm and 8 am",
    outcome: "blocked",
    detail: "Nothing was sent.",
  },
  {
    id: "evt_2",
    at: "2026-09-30T19:41:00Z",
    actor: { name: "Dev Patel", role: "Quality engineer" },
    action: "recalled",
    target: "Gauge G-114",
    reason: "Last calibration was 14 months ago",
    outcome: "succeeded",
  },
  {
    id: "evt_1",
    at: "2026-09-30T19:40:00Z",
    actor: { name: "Dev Patel", role: "Quality engineer" },
    action: "marked calibration overdue on",
    target: "Gauge G-114",
    outcome: "succeeded",
  },
]

export default function AuditTimelineDemo() {
  const [events, setEvents] = React.useState(SEED)
  const [sending, setSending] = React.useState(false)
  const [sentCount, setSentCount] = React.useState<number | null>(null)
  const [offline, setOffline] = React.useState(false)
  const sends = events.length - SEED.length

  // Pretend server. In your app this runs on YOUR server, in the same handler
  // that sends the message, so the record exists even if this page is closed.
  const sendSummaryOnServer = () =>
    buildAuditEvent(
      {
        actor: { name: "Mara Lopez", role: "Registrar" },
        action: "sent the attendance summary to",
        target: "3 guardians",
        reason: "Weekly summary",
        outcome: "succeeded",
        detail: "First names only. Sent to the saved list of 3.",
      },
      {
        now: () => new Date(START + (sends + 1) * 60_000),
        newId: () => `evt_sent_${sends + 1}`,
        requireReason: true,
      }
    )

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <ConfirmSend
          count={3}
          noun="guardian"
          label="Email this summary"
          sending={sending}
          sentCount={sentCount}
          onSend={async () => {
            setSending(true)
            await new Promise((resolve) => setTimeout(resolve, 600))
            // The UI shows the record. It never makes it.
            setEvents((current) => [sendSummaryOnServer(), ...current])
            setSending(false)
            setSentCount(3)
          }}
        />
      </div>
      <AuditTimeline
        events={events}
        timeZone={TIME_ZONE}
        initialCount={4}
        filterable
        now={START + (sends + 2) * 60_000}
        error={
          offline
            ? "The server did not answer. Showing what loaded earlier."
            : undefined
        }
        onRetry={() => setOffline(false)}
        stale={offline}
      />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Switch checked={offline} onCheckedChange={setOffline} />
        Pretend the last refresh failed
      </label>
    </div>
  )
}
