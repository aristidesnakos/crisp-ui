"use client"

import * as React from "react"
import { CheckCircle2 } from "lucide-react"

import { Button } from "@/registry/new-york-v4/ui/button"

interface ConfirmSendProps {
  /** How many recipients the SAVED list reaches. */
  count: number
  /** One recipient, e.g. "person". */
  noun?: string
  /** Plural of `noun`, e.g. "people". Defaults to `noun + "s"`. */
  nounPlural?: string
  /** Blocks the send and explains why (e.g. unsaved edits). Cancels an open confirmation. */
  blockedReason?: string
  /** Shown as the reason when `count` is 0. */
  emptyReason?: string
  sending?: boolean
  /** Set after a successful send to show "Sent to N". */
  sentCount?: number | null
  /** Label for the idle button. Defaults to "Send now". */
  label?: string
  onSend: () => void | Promise<void>
}

/** Click, confirm with the count, send, then a status line. Never one click to send. */
function ConfirmSend({
  count,
  noun = "person",
  nounPlural,
  blockedReason,
  emptyReason = "Add at least one recipient first",
  sending = false,
  sentCount = null,
  label = "Send now",
  onSend,
}: ConfirmSendProps) {
  const [confirming, setConfirming] = React.useState(false)
  const reasonId = React.useId()
  const plural = nounPlural ?? (noun === "person" ? "people" : `${noun}s`)
  const phrase = (n: number) => `${n} ${n === 1 ? noun : plural}`
  const reason = blockedReason ?? (count === 0 ? emptyReason : undefined)

  // The list changed under an open prompt (an edit, a save): what it says is no
  // longer what would be sent, so drop back to the idle button.
  React.useEffect(() => {
    if (reason) setConfirming(false)
  }, [reason, count])

  if (confirming && !reason) {
    return (
      <>
        <span className="text-sm text-muted-foreground">
          Send to {phrase(count)}?
        </span>
        <Button
          disabled={sending}
          onClick={async () => {
            setConfirming(false)
            await onSend()
          }}
        >
          {sending ? "Sending…" : "Send"}
        </Button>
        <Button variant="outline" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </>
    )
  }

  const justSent = sentCount !== null && !reason
  return (
    <>
      {justSent && (
        <span
          role="status"
          className="inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Sent to {phrase(sentCount)}
        </span>
      )}
      <Button
        variant={justSent ? "outline" : "default"}
        disabled={Boolean(reason) || sending}
        title={reason}
        aria-describedby={reason ? reasonId : undefined}
        onClick={() => setConfirming(true)}
      >
        {count === 0 ? label : `${label} to ${phrase(count)}`}
      </Button>
      {reason && (
        <span id={reasonId} className="sr-only">
          {reason}
        </span>
      )}
    </>
  )
}

export { ConfirmSend }
