"use client"

import * as React from "react"

import { peopleFromLists } from "@/registry/crisp/lib/notify-envelope"
import {
  RecipientRoster,
  type RosterChannel,
  type RosterPerson,
} from "@/registry/crisp/ui/recipient-roster"

const channels: RosterChannel[] = [
  {
    key: "automatic",
    label: "Each finish",
    hint: "as staff complete",
    limit: 3,
  },
  { key: "onDemand", label: "Digest", hint: "only when sent", limit: 3 },
]

// Fictional data. Nothing here is saved anywhere.
export default function RecipientRosterDemo() {
  const [people, setPeople] = React.useState<RosterPerson[]>(() =>
    peopleFromLists(
      {
        automatic: ["mara@example.org"],
        onDemand: ["mara@example.org", "jules@example.org"],
      },
      channels.map((channel) => channel.key)
    )
  )

  return (
    <RecipientRoster
      className="w-full max-w-xl"
      people={people}
      channels={channels}
      onChange={setPeople}
      footnote="No one is set to hear as staff finish, so those notices go to the admin team instead."
    />
  )
}
