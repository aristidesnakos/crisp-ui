"use client"

import * as React from "react"

import {
  isRuleValid,
  normalizeRule,
  sameRules,
  validateRule,
  type AlertRule,
} from "@/registry/crisp/lib/alert-rules"
import { AlertRules } from "@/registry/crisp/ui/alert-rules"
import { SaveBar } from "@/registry/crisp/ui/save-bar"

const INITIAL: AlertRule[] = [
  {
    id: "calibration-due",
    label: "Gauge calibration due",
    enabled: true,
    cadenceDays: [30, 14, 7, 1],
    escalateAfterDays: 3,
    escalateTo: "supervisor@example.org",
    quietHours: { start: "21:00", end: "08:00", timeZone: "America/Chicago" },
  },
  {
    id: "out-of-tolerance",
    label: "Out-of-tolerance review",
    enabled: true,
    cadenceDays: [1],
  },
]

// Fictional data. Nothing here is saved anywhere.
export default function AlertRulesDemo() {
  const [saved, setSaved] = React.useState(INITIAL)
  const [rules, setRules] = React.useState(INITIAL)
  const [saving, setSaving] = React.useState(false)
  const [problem, setProblem] = React.useState("")

  return (
    <div className="w-full max-w-3xl overflow-hidden rounded-xl border">
      <div className="p-4 sm:p-6">
        <AlertRules
          rules={rules}
          timeZone="America/Chicago"
          disabled={saving}
          onChange={(next) => {
            setProblem("")
            setRules(next)
          }}
        />
        <p className="mt-5 text-sm text-muted-foreground">
          Saving stores the rule only. The server that sends the emails must
          apply quiet hours itself.
        </p>
      </div>
      {problem && (
        <p role="alert" className="px-4 pb-3 text-sm text-destructive sm:px-6">
          {problem}
        </p>
      )}
      <SaveBar
        dirty={!sameRules(rules, saved)}
        saving={saving}
        onDiscard={() => {
          setProblem("")
          setRules(saved)
        }}
        onSave={async () => {
          // Check again here, and on your server: the editor only shows errors.
          if (!rules.every((rule) => isRuleValid(validateRule(rule)))) {
            setProblem(
              "Fix the fields marked in the rules above before saving."
            )
            return
          }
          setSaving(true)
          await new Promise((resolve) => setTimeout(resolve, 400))
          const next = rules.map(normalizeRule)
          setSaved(next)
          setRules(next)
          setSaving(false)
        }}
      />
    </div>
  )
}
