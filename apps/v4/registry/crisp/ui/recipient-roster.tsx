"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Input } from "@/registry/new-york-v4/ui/input"
import { Switch } from "@/registry/new-york-v4/ui/switch"

export interface RosterChannel {
  key: string
  /** Column heading, e.g. "Each finish". */
  label: string
  /** Cadence, e.g. "as staff complete" or "only when sent". Hidden on narrow screens. */
  hint?: string
  /** Maximum people on this channel. Switches lock at the limit. */
  limit?: number
  /** Accessible name for a switch; receives the person's address. */
  switchLabel?: (email: string) => string
}

export interface RosterPerson {
  email: string
  channels: Record<string, boolean>
}

// Deliberately close to what servers accept (e.g. zod's .email()): no empty or
// dotted-edge local parts, no doubled dots, a real domain and a 2+ letter TLD.
// Pass `validate` to match your own backend exactly.
const EMAIL =
  /^(?!\.)(?!.*\.\.)[^\s@,;]+(?<!\.)@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i

interface RecipientRosterProps {
  people: RosterPerson[]
  channels: RosterChannel[]
  onChange: (people: RosterPerson[]) => void
  disabled?: boolean
  /** Return true if the address is acceptable. Defaults to a simple shape check. */
  validate?: (email: string) => boolean
  emptyMessage?: React.ReactNode
  /** One line under the list, e.g. what happens when nobody is set. */
  footnote?: React.ReactNode
  className?: string
}

/**
 * One list of people, one switch per channel. People appear once, however many
 * channels they are on; the storage behind it can stay one list per channel.
 */
function RecipientRoster({
  people,
  channels,
  onChange,
  disabled = false,
  validate = (email) => EMAIL.test(email),
  emptyMessage = "Add an address below, then choose what each person receives.",
  footnote,
  className,
}: RecipientRosterProps) {
  const [draft, setDraft] = React.useState("")
  const [error, setError] = React.useState("")

  const count = (key: string) => people.filter((p) => p.channels[key]).length

  function addEmails(raw: string) {
    const candidates = [
      ...new Set(
        raw
          .split(/[\s,;]+/)
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean)
      ),
    ]
    if (candidates.length === 0) return
    const bad = candidates.find((item) => !validate(item))
    if (bad) {
      setError(`“${bad}” doesn’t look like an email address.`)
      return
    }
    setError("")
    onChange([
      ...people,
      ...candidates
        .filter((email) => !people.some((p) => p.email === email))
        .map((email) => ({
          email,
          channels: Object.fromEntries(channels.map((c) => [c.key, false])),
        })),
    ])
    setDraft("")
  }

  function toggle(email: string, key: string, on: boolean) {
    setError("")
    onChange(
      people.map((p) =>
        p.email === email ? { ...p, channels: { ...p.channels, [key]: on } } : p
      )
    )
  }

  return (
    <div
      data-slot="recipient-roster"
      className={cn(
        "[--roster-col:3.5rem] sm:[--roster-col:6.75rem]",
        className
      )}
    >
      <div
        role="group"
        aria-label="Recipients"
        className="grid items-center"
        style={{
          gridTemplateColumns: `minmax(0,1fr) repeat(${channels.length}, var(--roster-col)) 2rem`,
        }}
      >
        <div aria-hidden="true" />
        {channels.map((c) => (
          <div
            key={c.key}
            className="pb-2 text-center text-xs tracking-wide text-muted-foreground/70 uppercase"
          >
            {c.label}
            <span className="block tracking-normal normal-case tabular-nums">
              {count(c.key)}
              {c.limit ? ` / ${c.limit}` : ""}
            </span>
            {c.hint && (
              <span className="hidden tracking-normal normal-case sm:block">
                {c.hint}
              </span>
            )}
          </div>
        ))}
        <div aria-hidden="true" />

        {people.length === 0 && (
          <p className="col-span-full border-t py-3.5 text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        )}

        {people.map((person) => (
          <div key={person.email} className="group contents">
            <div className="flex min-h-12 min-w-0 items-center gap-2.5 border-t py-2">
              <span
                className="grid size-7 flex-none place-items-center rounded-full bg-muted text-xs font-semibold uppercase"
                aria-hidden="true"
              >
                {person.email[0]}
              </span>
              <span className="truncate text-sm" title={person.email}>
                {person.email}
              </span>
            </div>
            {channels.map((c) => {
              const on = Boolean(person.channels[c.key])
              const full =
                Boolean(c.limit) && !on && count(c.key) >= (c.limit as number)
              return (
                <div
                  key={c.key}
                  className="flex min-h-12 items-center justify-center border-t"
                >
                  <Switch
                    aria-label={
                      c.switchLabel?.(person.email) ??
                      `${c.label}: ${person.email}`
                    }
                    checked={on}
                    disabled={disabled || full}
                    onCheckedChange={(checked) =>
                      toggle(person.email, c.key, checked)
                    }
                  />
                </div>
              )
            })}
            <div className="flex min-h-12 items-center justify-center border-t">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${person.email}`}
                disabled={disabled}
                onClick={() =>
                  onChange(people.filter((p) => p.email !== person.email))
                }
                className="size-8 text-muted-foreground hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <form
        noValidate
        className="flex items-center gap-2.5 border-t pt-2"
        onSubmit={(event) => {
          event.preventDefault()
          addEmails(draft)
        }}
      >
        <span
          className="grid size-7 flex-none place-items-center rounded-full border border-dashed text-muted-foreground"
          aria-hidden="true"
        >
          <Plus className="size-3.5" />
        </span>
        <Input
          type="email"
          inputMode="email"
          autoComplete="off"
          aria-label="Add an email address"
          placeholder="Add an email address and press Enter"
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          // Typing an address and going straight for Save must not lose it.
          onBlur={() => addEmails(draft)}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text")
            if (/[\s,;]/.test(text.trim())) {
              event.preventDefault()
              addEmails(text)
            }
          }}
          className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </form>
      {error && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
      {footnote && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="size-1.5 flex-none rounded-full bg-muted-foreground/50"
            aria-hidden="true"
          />
          {footnote}
        </p>
      )}
    </div>
  )
}

export { RecipientRoster }
