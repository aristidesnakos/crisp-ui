"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  MAX_CADENCE_DAYS,
  summarizeRule,
  validateRule,
  type AlertRule,
  type RuleError,
} from "@/registry/crisp/lib/alert-rules"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Input } from "@/registry/new-york-v4/ui/input"
import { Switch } from "@/registry/new-york-v4/ui/switch"

export interface AlertRulesProps
  extends Omit<React.ComponentProps<"div">, "onChange"> {
  /** The current rules, including unsaved edits. One row per rule. */
  rules: AlertRule[]
  /** Called with the full next list after any edit. */
  onChange: (rules: AlertRule[]) => void
  /** Return true if the address is acceptable. Defaults to a simple shape check. */
  validateEmail?: (email: string) => boolean
  /** Zone given to quiet hours when someone turns them on. Defaults to the browser's. */
  timeZone?: string
  /** Disables every control, e.g. while saving. */
  disabled?: boolean
}

const dayWord = (n: number) => (n === 1 ? "day" : "days")

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

function FieldError({ id, error }: { id: string; error?: RuleError | string }) {
  if (!error) return null
  return (
    <p id={id} className="text-sm text-destructive">
      {typeof error === "string" ? error : error.message}
    </p>
  )
}

/** Space-separated ids of the elements that exist, or undefined. */
const describedBy = (...ids: Array<string | false | undefined>) =>
  ids.filter(Boolean).join(" ") || undefined

interface RuleRowProps {
  rule: AlertRule
  onChange: (rule: AlertRule) => void
  validateEmail?: (email: string) => boolean
  timeZone?: string
  zoneListId: string
  disabled: boolean
}

function RuleRow({
  rule,
  onChange,
  validateEmail,
  timeZone,
  zoneListId,
  disabled,
}: RuleRowProps) {
  const uid = React.useId()
  const id = (name: string) => `${uid}-${name}`
  const errors = validateRule(rule, { validateEmail })
  const [draft, setDraft] = React.useState("")
  const [addError, setAddError] = React.useState("")
  // Polite announcement for changes that are otherwise only visible.
  const [status, setStatus] = React.useState("")
  const rootRef = React.useRef<HTMLDivElement>(null)
  const addRef = React.useRef<HTMLInputElement>(null)
  // Index of a chip just removed, so focus is not lost with it.
  const removedAt = React.useRef<number | null>(null)

  React.useEffect(() => {
    const index = removedAt.current
    if (index === null) return
    removedAt.current = null
    const buttons =
      rootRef.current?.querySelectorAll<HTMLButtonElement>(
        "[data-chip-remove]:not(:disabled)"
      ) ?? []
    const next = buttons[Math.min(index, buttons.length - 1)]
    ;(next ?? addRef.current)?.focus()
  }, [rule.cadenceDays])

  const set = (patch: Partial<AlertRule>) => onChange({ ...rule, ...patch })
  const quiet = rule.quietHours ?? null
  const setQuiet = (patch: Partial<NonNullable<AlertRule["quietHours"]>>) =>
    quiet && set({ quietHours: { ...quiet, ...patch } })

  function addDay() {
    const text = draft.trim()
    if (!text) return
    const days = Number(text)
    if (!Number.isInteger(days) || days < 1) {
      setAddError("Enter a whole number of days, 1 or more.")
      return
    }
    if (days > MAX_CADENCE_DAYS) {
      setAddError(`Enter ${MAX_CADENCE_DAYS} days or fewer.`)
      return
    }
    if (rule.cadenceDays.includes(days)) {
      setAddError(`${days} ${dayWord(days)} before is already in the list.`)
      return
    }
    setAddError("")
    setStatus(`Added ${days} ${dayWord(days)} before.`)
    set({ cadenceDays: [...rule.cadenceDays, days].sort((a, b) => b - a) })
    setDraft("")
  }

  const cadenceError = errors.cadenceDays
  const afterDays = rule.escalateAfterDays
  const quietZoneError = errors["quietHours.timeZone"]

  return (
    <div
      ref={rootRef}
      role="group"
      aria-labelledby={id("title")}
      className="grid gap-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id={id("title")} className="text-base font-medium">
          {rule.label}
        </h3>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden="true" className="w-6 text-right">
            {rule.enabled ? "On" : "Off"}
          </span>
          <Switch
            aria-label="Rule enabled"
            aria-describedby={id("summary")}
            className="relative after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']"
            checked={rule.enabled}
            disabled={disabled}
            onCheckedChange={(enabled) => set({ enabled })}
          />
        </span>
      </div>

      {/* Reminder days */}
      <div className="grid gap-2">
        <span id={id("cadence")} className="text-sm font-medium">
          Remind this many days before it is due
        </span>
        {rule.cadenceDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reminder days yet.</p>
        ) : (
          <ul aria-labelledby={id("cadence")} className="flex flex-wrap gap-2">
            {rule.cadenceDays.map((days, index) => (
              <li
                key={`${days}-${index}`}
                className="inline-flex items-center gap-0.5 rounded-full border bg-muted/50 py-0.5 pr-0.5 pl-3 text-sm tabular-nums"
              >
                <span>
                  {days} {dayWord(days)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-chip-remove=""
                  aria-label={`Remove ${days} ${dayWord(days)} before`}
                  disabled={disabled}
                  className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    removedAt.current = index
                    setStatus(`Removed ${days} ${dayWord(days)} before.`)
                    set({
                      cadenceDays: rule.cadenceDays.filter(
                        (_, i) => i !== index
                      ),
                    })
                  }}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2">
          <Input
            ref={addRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Add a reminder, days before it is due"
            aria-invalid={addError || cadenceError ? true : undefined}
            aria-describedby={describedBy(
              addError && id("add-error"),
              cadenceError && id("cadence-error")
            )}
            placeholder="Days, e.g. 14"
            value={draft}
            disabled={disabled}
            className="w-36"
            onChange={(event) => {
              setDraft(event.target.value)
              setAddError("")
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                addDay()
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => {
              addDay()
              addRef.current?.focus()
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add
            <span className="sr-only"> reminder day</span>
          </Button>
        </div>
        {addError && (
          <p
            id={id("add-error")}
            role="alert"
            className="text-sm text-destructive"
          >
            {addError}
          </p>
        )}
        <FieldError id={id("cadence-error")} error={cadenceError} />
        <p role="status" className="sr-only">
          {status}
        </p>
      </div>

      {/* Escalation */}
      <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
        <div className="grid content-start gap-1.5">
          <label htmlFor={id("after")} className="text-sm font-medium">
            Escalate after (days)
          </label>
          <Input
            id={id("after")}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            autoComplete="off"
            aria-invalid={errors.escalateAfterDays ? true : undefined}
            aria-describedby={describedBy(
              id("after-hint"),
              errors.escalateAfterDays && id("after-error")
            )}
            value={
              typeof afterDays === "number" && !Number.isNaN(afterDays)
                ? afterDays
                : ""
            }
            disabled={disabled}
            onChange={(event) =>
              set({
                escalateAfterDays:
                  event.target.value === ""
                    ? undefined
                    : Number(event.target.value),
              })
            }
          />
          <p id={id("after-hint")} className="text-xs text-muted-foreground">
            After the due date, if still open.
          </p>
          <FieldError id={id("after-error")} error={errors.escalateAfterDays} />
        </div>
        <div className="grid content-start gap-1.5">
          <label htmlFor={id("to")} className="text-sm font-medium">
            Escalate to (email)
          </label>
          <Input
            id={id("to")}
            type="email"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            placeholder="supervisor@example.org"
            aria-invalid={errors.escalateTo ? true : undefined}
            aria-describedby={describedBy(errors.escalateTo && id("to-error"))}
            value={rule.escalateTo ?? ""}
            disabled={disabled}
            onChange={(event) =>
              set({ escalateTo: event.target.value || undefined })
            }
            // Tidy the address once, when the person is done with it.
            onBlur={() => {
              if (rule.escalateTo === undefined) return
              const tidy = rule.escalateTo.trim().toLowerCase()
              if (tidy !== rule.escalateTo)
                set({ escalateTo: tidy || undefined })
            }}
          />
          <FieldError id={id("to-error")} error={errors.escalateTo} />
        </div>
      </div>

      {/* Quiet hours */}
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={id("quiet")} className="text-sm font-medium">
            Quiet hours
            <span className="block text-xs font-normal text-muted-foreground">
              Nothing is sent in this window.
            </span>
          </label>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <span aria-hidden="true" className="w-6 text-right">
              {quiet ? "On" : "Off"}
            </span>
            <Switch
              id={id("quiet")}
              className="relative after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']"
              checked={quiet !== null}
              disabled={disabled}
              onCheckedChange={(on) =>
                set({
                  quietHours: on
                    ? {
                        start: "21:00",
                        end: "08:00",
                        timeZone: timeZone ?? browserTimeZone(),
                      }
                    : null,
                })
              }
            />
          </span>
        </div>
        {quiet && (
          <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,8rem))_minmax(0,1fr)]">
            <div className="grid content-start gap-1.5">
              <label htmlFor={id("start")} className="text-sm font-medium">
                From
              </label>
              <Input
                id={id("start")}
                type="time"
                aria-invalid={errors["quietHours.start"] ? true : undefined}
                aria-describedby={describedBy(
                  errors["quietHours.start"] && id("start-error")
                )}
                value={quiet.start}
                disabled={disabled}
                onChange={(event) => setQuiet({ start: event.target.value })}
              />
              <FieldError
                id={id("start-error")}
                error={errors["quietHours.start"]}
              />
            </div>
            <div className="grid content-start gap-1.5">
              <label htmlFor={id("end")} className="text-sm font-medium">
                Until
              </label>
              <Input
                id={id("end")}
                type="time"
                aria-invalid={errors["quietHours.end"] ? true : undefined}
                aria-describedby={describedBy(
                  errors["quietHours.end"] && id("end-error")
                )}
                value={quiet.end}
                disabled={disabled}
                onChange={(event) => setQuiet({ end: event.target.value })}
              />
              <FieldError
                id={id("end-error")}
                error={errors["quietHours.end"]}
              />
            </div>
            <div className="grid content-start gap-1.5">
              <label htmlFor={id("zone")} className="text-sm font-medium">
                Time zone
              </label>
              <Input
                id={id("zone")}
                list={zoneListId}
                autoComplete="off"
                spellCheck={false}
                placeholder="America/New_York"
                aria-invalid={quietZoneError ? true : undefined}
                aria-describedby={describedBy(
                  quietZoneError && id("zone-error")
                )}
                value={quiet.timeZone}
                disabled={disabled}
                onChange={(event) => setQuiet({ timeZone: event.target.value })}
              />
              <FieldError id={id("zone-error")} error={quietZoneError} />
            </div>
          </div>
        )}
      </div>

      <p
        id={id("summary")}
        className="rounded-md bg-muted/60 px-3 py-2 text-sm"
      >
        <span className="sr-only">Summary: </span>
        {summarizeRule(rule, { includeTimeZone: true })}
      </p>
    </div>
  )
}

/**
 * An editor for when and to whom a reminder goes: which days before the due
 * date, who hears if it is still open afterwards, and the hours nothing is
 * sent. It is controlled and never saves; pair it with `save-bar`. It edits a
 * saved rule, it does not send or schedule anything, and your server must
 * enforce quiet hours and escalation itself.
 */
function AlertRules({
  rules,
  onChange,
  validateEmail,
  timeZone,
  disabled = false,
  className,
  ...props
}: AlertRulesProps) {
  const zoneListId = React.useId()
  // Filled in after mount: the runtime's list can differ between server and client.
  const [zones, setZones] = React.useState<string[]>([])
  React.useEffect(() => {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf
    try {
      const list = supported ? supported("timeZone") : []
      setZones(list.includes("UTC") ? list : [...list, "UTC"])
    } catch {
      setZones([])
    }
  }, [])

  return (
    <div data-slot="alert-rules" className={cn(className)} {...props}>
      <ul className="divide-y">
        {rules.map((rule, index) => (
          <li key={rule.id} className="py-5 first:pt-0 last:pb-0">
            <RuleRow
              rule={rule}
              validateEmail={validateEmail}
              timeZone={timeZone}
              zoneListId={zoneListId}
              disabled={disabled}
              onChange={(next) =>
                onChange(rules.map((r, i) => (i === index ? next : r)))
              }
            />
          </li>
        ))}
      </ul>
      <datalist id={zoneListId}>
        {zones.map((zone) => (
          <option key={zone} value={zone} />
        ))}
      </datalist>
    </div>
  )
}

export { AlertRules }
