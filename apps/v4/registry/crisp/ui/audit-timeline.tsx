"use client"

import * as React from "react"
import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  LoaderCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  actorName,
  actorRole,
  distinctActions,
  distinctActors,
  filterAuditEvents,
  formatEventTime,
  formatRelativeTime,
  groupByDay,
  type AuditDay,
  type AuditEvent,
  type AuditOutcome,
} from "@/registry/crisp/lib/audit-event"
import { Button } from "@/registry/new-york-v4/ui/button"

const OUTCOME: Record<
  AuditOutcome,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  succeeded: { label: "Succeeded", icon: CircleCheck },
  failed: { label: "Failed", icon: CircleX },
  blocked: { label: "Blocked", icon: Ban },
}

const SELECT =
  "h-9 w-full min-w-40 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"

// Once a minute is enough for "5 minutes ago". The server snapshot is null, so
// the relative time is left out of the server render and the first client
// render, and never causes a hydration mismatch.
const subscribeToMinute = (notify: () => void) => {
  const timer = setInterval(notify, 30_000)
  return () => clearInterval(timer)
}
const currentMinute = () => Math.floor(Date.now() / 60_000) * 60_000
const noMinuteOnServer = () => null

export interface AuditTimelineProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** The recorded events, in any order. They are shown newest first. Written by your SERVER, never by this component. */
  events: AuditEvent[]
  /** IANA zone the days and times are shown in, e.g. "America/New_York". Required: an audit time with no zone is ambiguous. */
  timeZone: string
  /** How many entries show before "Show N more". Also how many each press adds. Default 10. */
  initialCount?: number
  /** Fetch older events from your server. Called when everything loaded is showing and `hasMore` is not false. */
  onLoadMore?: () => void | Promise<void>
  /** Whether your server has older events. Defaults to true when `onLoadMore` is set. */
  hasMore?: boolean
  /** Shown when there are no events. Default "No activity recorded yet". */
  emptyMessage?: string
  /** Show Person and Action filters above the list. Default false. */
  filterable?: boolean
  /** The events are still being fetched. Says so instead of claiming there is no activity. */
  loading?: boolean
  /** The events could not be fetched. Says so instead of claiming there is no activity. */
  error?: string
  /** Shown as a Retry button beside `error`. */
  onRetry?: () => void
  /** The list may be behind. `true` uses a default message, a string replaces it. */
  stale?: boolean | string
  /** Pin "now" for the relative times, e.g. in a demo or a test. Defaults to the real clock. */
  now?: Date | string | number
  /** BCP 47 locale for the labels. Default "en-US". */
  locale?: string
  /** Level of each day's heading, so the list fits your page outline. Default 3. */
  headingLevel?: 2 | 3 | 4
}

/**
 * "Who did what, when, and why." Shows events your server has already
 * recorded, grouped by day. It never creates, edits or deletes one, and a log
 * is only as trustworthy as the server that wrote it.
 */
function AuditTimeline({
  events,
  timeZone,
  initialCount = 10,
  onLoadMore,
  hasMore,
  emptyMessage = "No activity recorded yet",
  filterable = false,
  loading = false,
  error,
  onRetry,
  stale = false,
  now,
  locale = "en-US",
  headingLevel = 3,
  className,
  ...props
}: AuditTimelineProps) {
  const pageSize = Math.max(1, Math.floor(initialCount) || 1)
  const [count, setCount] = React.useState(pageSize)
  const [actor, setActor] = React.useState("")
  const [action, setAction] = React.useState("")
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [loadFailed, setLoadFailed] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement>(null)
  // Flat index of the first entry a press added, so focus can follow it.
  const focusIndex = React.useRef<number | null>(null)
  const baseId = React.useId()
  const Heading = `h${headingLevel}` as "h3"

  const tick = React.useSyncExternalStore(
    subscribeToMinute,
    currentMinute,
    noMinuteOnServer
  )
  const pinned = now === undefined ? Number.NaN : new Date(now).getTime()
  const relativeNow = Number.isNaN(pinned) ? tick : pinned

  const filtered = React.useMemo(
    () => filterAuditEvents(events, { actor, action }),
    [events, actor, action]
  )
  const days = React.useMemo(
    () => groupByDay(filtered, timeZone, { locale }),
    [filtered, timeZone, locale]
  )
  const actors = React.useMemo(() => distinctActors(events), [events])
  const actions = React.useMemo(() => distinctActions(events), [events])

  // Newest first, cut to `count` entries (a day may be cut part way).
  const shown = Math.min(count, filtered.length)
  const visibleDays = React.useMemo(() => {
    let budget = count
    const result: AuditDay[] = []
    for (const day of days) {
      if (budget <= 0) break
      result.push({ ...day, events: day.events.slice(0, budget) })
      budget -= day.events.length
    }
    return result
  }, [days, count])

  React.useEffect(() => {
    const index = focusIndex.current
    if (index === null) return
    focusIndex.current = null
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.focus()
  }, [count])

  const hidden = filtered.length - shown
  const filtering = Boolean(actor || action)
  const canLoadMore = Boolean(onLoadMore) && hasMore !== false
  const hasEvents = events.length > 0

  const showMore = () => {
    // The button goes away when this reveals the last entry, so move focus to
    // the first new one rather than losing it.
    if (hidden <= pageSize && !canLoadMore) focusIndex.current = shown
    setCount(shown + pageSize)
  }
  const loadMore = async () => {
    if (!onLoadMore || loadingMore) return
    setLoadingMore(true)
    setLoadFailed(false)
    try {
      await onLoadMore()
      setCount(shown + pageSize)
    } catch {
      setLoadFailed(true)
    } finally {
      setLoadingMore(false)
    }
  }
  const resetCount = () => setCount(pageSize)

  let index = 0
  return (
    <div
      data-slot="audit-timeline"
      className={cn("space-y-4", className)}
      {...props}
    >
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-destructive/50 px-3 py-2 text-sm"
        >
          <CircleAlert
            aria-hidden="true"
            className="size-4 shrink-0 text-destructive"
          />
          <span className="min-w-0 flex-1">
            <span className="font-medium">Activity could not be loaded.</span>{" "}
            {error}
          </span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      ) : null}
      {stale ? (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Clock aria-hidden="true" className="size-4 shrink-0" />
          {typeof stale === "string"
            ? stale
            : "This list may be out of date. Newer activity may not be shown yet."}
        </p>
      ) : null}

      {filterable && hasEvents ? (
        <div
          role="group"
          aria-label="Filter activity"
          className="flex flex-wrap items-end gap-3"
        >
          <div className="space-y-1.5">
            <label htmlFor={`${baseId}-actor`} className="text-sm font-medium">
              Person
            </label>
            <select
              id={`${baseId}-actor`}
              className={SELECT}
              value={actor}
              onChange={(event) => {
                setActor(event.target.value)
                resetCount()
              }}
            >
              <option value="">Everyone</option>
              {actors.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${baseId}-action`} className="text-sm font-medium">
              Action
            </label>
            <select
              id={`${baseId}-action`}
              className={SELECT}
              value={action}
              onChange={(event) => {
                setAction(event.target.value)
                resetCount()
              }}
            >
              <option value="">Any action</option>
              {actions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          {filtering && (
            <Button
              variant="ghost"
              onClick={() => {
                setActor("")
                setAction("")
                resetCount()
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : null}

      {loading ? (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          Loading activity…
        </p>
      ) : null}

      {!hasEvents && !loading && !error ? (
        <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : null}

      {hasEvents && filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No events match these filters.
        </p>
      ) : null}

      <div ref={listRef} className="space-y-6">
        {visibleDays.map((day) => {
          const headingId = `${baseId}-${day.day}`
          return (
            <section key={day.day} aria-labelledby={headingId}>
              <Heading
                id={headingId}
                className="mb-1 text-sm font-semibold text-foreground"
              >
                {day.label}
              </Heading>
              <ol role="list" className="divide-y border-y">
                {day.events.map((event) => {
                  const time = formatEventTime(event.at, timeZone, {
                    locale,
                    timeOnly: day.day !== "unknown",
                  })
                  const relative =
                    relativeNow === null
                      ? null
                      : formatRelativeTime(event.at, relativeNow, locale)
                  const outcome = event.outcome ? OUTCOME[event.outcome] : null
                  const role = actorRole(event.actor)
                  return (
                    <li
                      key={event.id}
                      data-index={index++}
                      tabIndex={-1}
                      className="grid gap-x-4 gap-y-1 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:grid-cols-[11rem_1fr]"
                    >
                      <div className="text-sm tabular-nums">
                        {time.iso ? (
                          <time dateTime={time.iso} className="font-medium">
                            {time.label}
                          </time>
                        ) : (
                          <span className="font-medium">{time.label}</span>
                        )}
                        {relative ? (
                          <span className="block text-xs text-muted-foreground">
                            {relative}
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0 space-y-1 text-sm">
                        <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                          <span>
                            <span className="font-semibold">
                              {actorName(event.actor)}
                            </span>
                            {role ? (
                              <span className="text-muted-foreground">
                                {" "}
                                ({role})
                              </span>
                            ) : null}{" "}
                            {event.action}
                            {event.target ? (
                              <>
                                {" "}
                                <span className="font-semibold">
                                  {event.target}
                                </span>
                              </>
                            ) : null}
                          </span>
                          {outcome ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-medium",
                                event.outcome === "failed" &&
                                  "border-destructive/50 text-destructive"
                              )}
                            >
                              <outcome.icon
                                aria-hidden="true"
                                className="size-3.5"
                              />
                              {outcome.label}
                            </span>
                          ) : null}
                        </p>
                        {event.reason ? (
                          <p>
                            <span className="text-muted-foreground">
                              Reason:
                            </span>{" "}
                            {event.reason}
                          </p>
                        ) : null}
                        {event.detail ? (
                          <p className="text-muted-foreground">
                            {event.detail}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}
      </div>

      {hasEvents && filtered.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          {hidden > 0 ? (
            <Button variant="outline" onClick={showMore}>
              Show {Math.min(pageSize, hidden)} more
            </Button>
          ) : canLoadMore ? (
            <Button
              variant="outline"
              // aria-disabled, not disabled, so keyboard focus stays on the button.
              aria-disabled={loadingMore}
              className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
              onClick={loadMore}
            >
              {loadingMore
                ? "Loading…"
                : loadFailed
                  ? "Try again"
                  : "Load older activity"}
            </Button>
          ) : null}
          <p role="status" className="text-sm text-muted-foreground">
            Showing {shown} of {filtered.length}{" "}
            {filtered.length === 1 ? "event" : "events"}
            {filtering ? " that match" : ""}
            {filtering && canLoadMore
              ? ". Filters apply only to events already loaded"
              : ""}
            .
          </p>
        </div>
      ) : null}
      {loadFailed ? (
        <p role="alert" className="flex items-center gap-2 text-sm">
          <CircleAlert
            aria-hidden="true"
            className="size-4 shrink-0 text-destructive"
          />
          Older activity could not be loaded.
        </p>
      ) : null}
    </div>
  )
}

export { AuditTimeline }
