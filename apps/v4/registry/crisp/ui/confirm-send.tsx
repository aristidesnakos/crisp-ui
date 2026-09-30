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
  const promptRef = React.useRef<HTMLSpanElement>(null)
  const idleRef = React.useRef<HTMLButtonElement>(null)
  // Set when the user leaves the confirmation, so focus can go back to the button.
  const restoreFocus = React.useRef(false)
  const plural = nounPlural ?? (noun === "person" ? "people" : `${noun}s`)
  const phrase = (n: number) => `${n} ${n === 1 ? noun : plural}`
  const reason = blockedReason ?? (count === 0 ? emptyReason : undefined)

  // The list changed under an open prompt (an edit, a save): what it says is no
  // longer what would be sent, so drop back to the idle button.
  React.useEffect(() => {
    if (reason) setConfirming(false)
  }, [reason, count])

  // The button that had focus is replaced by the prompt (and back), so move
  // focus with it. Waits while the idle button is disabled (sending) and never
  // steals focus the user has already moved elsewhere.
  React.useEffect(() => {
    if (confirming) {
      promptRef.current?.focus()
    } else if (restoreFocus.current && idleRef.current && !sending) {
      restoreFocus.current = false
      if (document.activeElement === document.body) idleRef.current.focus()
    }
  }, [confirming, sending])

  const justSent = sentCount !== null && !reason
  // One live region that stays mounted across both states, so each send is
  // announced; it is emptied while a send is in flight so a repeat is announced.
  const liveMessage =
    confirming || !justSent || sending
      ? sending
        ? "Sending…"
        : ""
      : `Sent to ${phrase(sentCount)}`

  return (
    <>
      <span role="status" className="sr-only">
        {liveMessage}
      </span>
      {confirming && !reason ? (
        <>
          {/* tabIndex -1: focusable by script so the question is read out, but not a tab stop. */}
          <span
            ref={promptRef}
            tabIndex={-1}
            className="text-sm text-muted-foreground outline-none"
          >
            Send to {phrase(count)}?
          </span>
          <Button
            disabled={sending}
            onClick={async () => {
              restoreFocus.current = true
              setConfirming(false)
              await onSend()
            }}
          >
            {sending ? "Sending…" : "Send"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              restoreFocus.current = true
              setConfirming(false)
            }}
          >
            Cancel
          </Button>
        </>
      ) : (
        <>
          {justSent && (
            <span
              aria-hidden="true"
              className="inline-flex items-center gap-1.5 text-sm font-medium"
            >
              <CheckCircle2 className="size-4" />
              Sent to {phrase(sentCount)}
            </span>
          )}
          <Button
            ref={idleRef}
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
      )}
    </>
  )
}

export { ConfirmSend }
