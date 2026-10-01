"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  applySavedChannel,
  listForChannel,
  peopleFromLists,
  sameList,
} from "@/registry/crisp/lib/notify-envelope"
import { ConfirmSend } from "@/registry/crisp/ui/confirm-send"
import {
  RecipientRoster,
  type RosterChannel,
} from "@/registry/crisp/ui/recipient-roster"
import { SaveBar } from "@/registry/crisp/ui/save-bar"
import {
  StatusStrip,
  type StatusSegment,
} from "@/registry/crisp/ui/status-strip"
import { Card } from "@/registry/new-york-v4/ui/card"

/** The two channels the block manages. */
export type NotifyChannelName = "automatic" | "onDemand"

/** Column heading, cadence hint, optional limit and per-person switch label. */
export type NotifyChannelConfig = Omit<RosterChannel, "key">

export interface StatusNotifyProps
  extends Omit<React.ComponentProps<typeof Card>, "title" | "onError"> {
  /** Stages of one whole, e.g. completed / in progress / not started. */
  segments: StatusSegment[]
  /** Completes the headline: "11 of 18 <noun>". Defaults to "done". */
  headlineNoun?: string
  /** Emailed as things happen. */
  automatic: NotifyChannelConfig
  /** Sent only when someone presses the button. */
  onDemand: NotifyChannelConfig
  /**
   * The SAVED lists. Your `onSave` must update these (state, refetch, cache) or
   * the bar stays dirty. When a channel's saved list changes, that channel's
   * switches follow it; the other channel's unsaved edits are kept.
   */
  saved: { automatic: string[]; onDemand: string[] }
  /** Persist one channel's list. Called only for lists that changed. Throw to fail. */
  onSave: (channel: NotifyChannelName, emails: string[]) => Promise<void>
  /**
   * Send the on-demand summary to the SAVED list. Return how many were actually
   * sent if your API tells you; otherwise the saved list length is shown.
   */
  onSend: () => Promise<number | void>
  /** Called when a save or send throws, so you can toast or log it. */
  onError?: (
    error: unknown,
    context: { action: "save" | "send"; channel?: NotifyChannelName }
  ) => void
  /** What happens when the automatic list is empty. */
  automaticFallback?: React.ReactNode
  /** Match your backend's rule exactly. Defaults to a close-to-server email check. */
  validateEmail?: (email: string) => boolean
  /** Label for the send button. Defaults to "Email this summary". */
  sendLabel?: string
  /** One recipient, and its plural. Default "person" / "people". */
  recipientNoun?: string
  recipientNounPlural?: string
  /** Heading above the roster. */
  title?: string
  /** One-line help under the heading. */
  description?: string
}

/** Status headline → action → who hears about it. See /docs/components/status-notify. */
function StatusNotify({
  segments,
  headlineNoun,
  automatic,
  onDemand,
  saved,
  onSave,
  onSend,
  onError,
  automaticFallback,
  validateEmail,
  sendLabel = "Email this summary",
  recipientNoun,
  recipientNounPlural,
  title = "Who hears about it",
  description = "One list. Each person can get an email as things happen, the overview, both, or neither.",
  className,
  ...props
}: StatusNotifyProps) {
  const channelKeys = React.useMemo(() => ["automatic", "onDemand"], [])
  const [people, setPeople] = React.useState(() =>
    peopleFromLists(saved, channelKeys)
  )
  const [saving, setSaving] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [sentCount, setSentCount] = React.useState<number | null>(null)

  // Follow a channel's SAVED list when it changes underneath us (a save landed,
  // the school changed, a refetch normalised it). Per channel, so a partial
  // failure keeps the failed channel's edits.
  const savedAuto = saved.automatic.join("\n")
  const savedDemand = saved.onDemand.join("\n")
  const firstRun = React.useRef(true)
  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    setPeople((current) =>
      applySavedChannel(current, "automatic", saved.automatic, channelKeys)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAuto])
  const firstRunDemand = React.useRef(true)
  React.useEffect(() => {
    if (firstRunDemand.current) {
      firstRunDemand.current = false
      return
    }
    setPeople((current) =>
      applySavedChannel(current, "onDemand", saved.onDemand, channelKeys)
    )
    setSentCount(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedDemand])

  const autoList = listForChannel(people, "automatic")
  const demandList = listForChannel(people, "onDemand")
  const autoChanged = !sameList(autoList, saved.automatic)
  const demandChanged = !sameList(demandList, saved.onDemand)

  const channels: RosterChannel[] = [
    { key: "automatic", ...automatic },
    { key: "onDemand", ...onDemand },
  ]

  async function save() {
    setSaving(true)
    // Independent full-list writes: one failing must not discard the other.
    const jobs: Array<{ channel: NotifyChannelName; run: Promise<void> }> = []
    if (autoChanged)
      jobs.push({ channel: "automatic", run: onSave("automatic", autoList) })
    if (demandChanged)
      jobs.push({ channel: "onDemand", run: onSave("onDemand", demandList) })
    const results = await Promise.allSettled(jobs.map((job) => job.run))
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        onError?.(result.reason, { action: "save", channel: jobs[i].channel })
      }
    })
    if (results.every((r) => r.status === "fulfilled")) {
      // Someone with both switches off has no saved trace, so stop listing them.
      setPeople((current) =>
        current.filter((p) => p.channels.automatic || p.channels.onDemand)
      )
    }
    setSaving(false)
  }

  async function send() {
    setSending(true)
    setSentCount(null)
    try {
      const sent = await onSend()
      setSentCount(typeof sent === "number" ? sent : saved.onDemand.length)
    } catch (error) {
      onError?.(error, { action: "send" })
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)} {...props}>
      <div className="space-y-4 p-4 sm:p-6">
        <StatusStrip
          segments={segments}
          headlineNoun={headlineNoun}
          action={
            <ConfirmSend
              count={saved.onDemand.length}
              label={sendLabel}
              noun={recipientNoun}
              nounPlural={recipientNounPlural}
              sending={sending}
              sentCount={sentCount}
              blockedReason={
                demandChanged
                  ? "Save your changes first — the summary goes to the saved list"
                  : undefined
              }
              emptyReason={`Turn on ${onDemand.label} for at least one person first`}
              onSend={send}
            />
          }
        />
      </div>
      <div className="border-t p-4 sm:p-6">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-0.5 mb-4 max-w-xl text-sm text-muted-foreground">
          {description}
        </p>
        <RecipientRoster
          people={people}
          channels={channels}
          disabled={saving}
          validate={validateEmail}
          onChange={(next) => {
            setPeople(next)
            setSentCount(null)
          }}
          footnote={
            saved.automatic.length === 0 ? automaticFallback : undefined
          }
        />
      </div>
      <SaveBar
        dirty={autoChanged || demandChanged}
        saving={saving}
        onSave={save}
        onDiscard={() => setPeople(peopleFromLists(saved, channelKeys))}
      />
    </Card>
  )
}

export { StatusNotify }
