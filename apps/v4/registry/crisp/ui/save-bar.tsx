import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/new-york-v4/ui/button"

interface SaveBarProps extends React.ComponentProps<"div"> {
  /** The bar renders nothing until there is something to save. */
  dirty: boolean
  saving?: boolean
  onSave: () => void
  onDiscard: () => void
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
      role="status"
      data-slot="save-bar"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t bg-muted/60 px-4 py-3 sm:px-6",
        className
      )}
      {...props}
    >
      <span className="text-sm">Unsaved changes</span>
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
