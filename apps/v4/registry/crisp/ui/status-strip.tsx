import * as React from "react"

import { cn } from "@/lib/utils"

export type StatusTone = "done" | "active" | "pending"

export interface StatusSegment {
  key: string
  label: string
  count: number
  /** done = solid, active = tinted, pending = hatched (not started or unreachable). */
  tone: StatusTone
}

const TONE_BAR: Record<StatusTone, string> = {
  done: "bg-primary",
  active: "bg-primary/45",
  pending:
    "bg-[repeating-linear-gradient(135deg,currentColor_0_3px,transparent_3px_6px)] text-muted-foreground/60 ring-1 ring-inset ring-muted-foreground/30",
}

const TONE_DOT: Record<StatusTone, string> = {
  done: "bg-primary",
  active: "bg-primary/45",
  pending: "ring-1 ring-muted-foreground/50",
}

interface StatusStripProps extends React.ComponentProps<"div"> {
  /** Stages of ONE whole. They must not overlap, and their counts sum to the total. */
  segments: StatusSegment[]
  /** Completes the headline sentence: "11 of 18 <noun>". Segments with tone "done" are counted. */
  headlineNoun?: string
  /** Rendered on the right of the headline: the action that acts on this status. */
  action?: React.ReactNode
}

function StatusStrip({
  segments,
  headlineNoun = "done",
  action,
  className,
  ...props
}: StatusStripProps) {
  const total = segments.reduce((sum, s) => sum + s.count, 0)
  const done = segments
    .filter((s) => s.tone === "done")
    .reduce((sum, s) => sum + s.count, 0)

  return (
    <div
      data-slot="status-strip"
      className={cn("space-y-4", className)}
      {...props}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <p className="text-3xl leading-none font-semibold tracking-tight text-foreground tabular-nums">
          {done}
          <span className="ml-2 text-sm font-normal tracking-normal text-muted-foreground">
            of {total} {headlineNoun}
          </span>
        </p>
        {action ? (
          <div className="flex flex-wrap items-center gap-3">{action}</div>
        ) : null}
      </div>
      {total > 0 && (
        <div
          role="img"
          aria-label={segments.map((s) => `${s.count} ${s.label}`).join(", ")}
          className="flex h-2.5 gap-[3px]"
        >
          {segments
            .filter((s) => s.count > 0)
            .map((s) => (
              <span
                key={s.key}
                className={cn("rounded-[3px]", TONE_BAR[s.tone])}
                style={{ flex: s.count }}
              />
            ))}
        </div>
      )}
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground tabular-nums">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-[2px]", TONE_DOT[s.tone])}
              aria-hidden="true"
            />
            <dd className="font-semibold text-foreground">{s.count}</dd>
            <dt>{s.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  )
}

export { StatusStrip }
