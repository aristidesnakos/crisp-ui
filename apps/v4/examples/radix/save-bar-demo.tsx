"use client"

import * as React from "react"

import { SaveBar } from "@/registry/crisp/ui/save-bar"
import { Input } from "@/registry/new-york-v4/ui/input"

// Fictional data. Nothing here is saved anywhere.
export default function SaveBarDemo() {
  const [saved, setSaved] = React.useState("Weekly staff training")
  const [name, setName] = React.useState(saved)
  const [saving, setSaving] = React.useState(false)

  return (
    <div className="w-full max-w-xl overflow-hidden rounded-xl border">
      <div className="flex flex-col gap-2 p-4 sm:p-6">
        <label htmlFor="save-bar-demo-name" className="text-sm font-medium">
          Report name
        </label>
        <Input
          id="save-bar-demo-name"
          value={name}
          disabled={saving}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <SaveBar
        dirty={name !== saved}
        saving={saving}
        onDiscard={() => setName(saved)}
        onSave={async () => {
          setSaving(true)
          await new Promise((r) => setTimeout(r, 400))
          setSaved(name)
          setSaving(false)
        }}
      />
    </div>
  )
}
