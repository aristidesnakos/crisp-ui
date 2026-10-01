"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/new-york-v4/ui/button"

export interface SaveBarProps extends React.ComponentProps<"div"> {
  /** The bar renders nothing until there is something to save. */
  dirty: boolean
  /** Disables both buttons and shows "Saving…". */
  saving?: boolean
  /** Called when Save is pressed. */
  onSave: () => void
  /** Called when Discard is pressed. */
  onDiscard: () => void
}

/**
 * A live region only announces changes made after it is in the page, so the
 * message is filled in one render after the bar mounts.
 */
function Announce({ children }: { children: string }) {
  const [message, setMessage] = React.useState("")
  React.useEffect(() => setMessage(children), [children])
  return (
    <span role="status" className="sr-only">
      {message}
    </span>
  )
}

function SaveBar({
  dirty,
  saving = false,
  onSave,
  onDiscard,
  className,
  ...props
}: SaveBarProps) {
  if (!dirty) return null
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      data-slot="save-bar"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t bg-muted/60 px-4 py-3 sm:px-6",
        className
      )}
      {...props}
    >
      <span className="text-sm" aria-hidden="true">
        Unsaved changes
      </span>
      <Announce>{saving ? "Saving changes…" : "Unsaved changes"}</Announce>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onDiscard} disabled={saving}>
          Discard
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}

export { SaveBar }
