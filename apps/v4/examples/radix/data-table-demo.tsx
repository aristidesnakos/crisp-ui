"use client"

import * as React from "react"
import { CircleCheck, Clock, TriangleAlert } from "lucide-react"

import { ConfirmSend } from "@/registry/crisp/ui/confirm-send"
import {
  DataTable,
  type DataTableColumn,
  type DataTableView,
} from "@/registry/crisp/ui/data-table"
import { StatusStrip } from "@/registry/crisp/ui/status-strip"
import { Switch } from "@/registry/new-york-v4/ui/switch"

interface Gauge {
  id: string
  name: string
  owner: string
  /** Where the reminder would go. Email only. */
  ownerEmail: string
  /** Calibration due date, YYYY-MM-DD. */
  due: string
}

type Calibration = "overdue" | "due-soon" | "in-date"

// Fictional data. A fixed "today" keeps the demo the same whenever it is
// opened. Nothing here is saved or sent anywhere.
const TODAY = "2026-10-01"
const DAY = 86_400_000
const daysUntil = (due: string) =>
  Math.round((Date.parse(due) - Date.parse(TODAY)) / DAY)
const calibration = (gauge: Gauge): Calibration => {
  const days = daysUntil(gauge.due)
  return days < 0 ? "overdue" : days <= 30 ? "due-soon" : "in-date"
}
const RANK: Record<Calibration, number> = {
  overdue: 0,
  "due-soon": 1,
  "in-date": 2,
}

const OWNERS = {
  mara: { owner: "Mara Okafor", ownerEmail: "mara@example.org" },
  jules: { owner: "Jules Bernard", ownerEmail: "jules@example.org" },
  ines: { owner: "Ines Varga", ownerEmail: "ines@example.org" },
  tomas: { owner: "Tomas Lindqvist", ownerEmail: "tomas@example.org" },
}

const GAUGES: Gauge[] = [
  {
    id: "G-101",
    name: "Micrometer 0-25 mm",
    ...OWNERS.mara,
    due: "2026-09-02",
  },
  {
    id: "G-104",
    name: "Dial caliper 150 mm",
    ...OWNERS.mara,
    due: "2026-09-18",
  },
  {
    id: "G-107",
    name: "Torque wrench 20-100 Nm",
    ...OWNERS.jules,
    due: "2026-08-21",
  },
  {
    id: "G-112",
    name: "Pressure gauge 0-10 bar",
    ...OWNERS.tomas,
    due: "2026-09-27",
  },
  {
    id: "G-115",
    name: "Height gauge 300 mm",
    ...OWNERS.ines,
    due: "2026-07-30",
  },
  { id: "G-118", name: "Thread plug M8", ...OWNERS.jules, due: "2026-09-09" },
  {
    id: "G-121",
    name: "Bore gauge 18-35 mm",
    ...OWNERS.ines,
    due: "2026-09-29",
  },
  {
    id: "G-124",
    name: "Surface plate 400 mm",
    ...OWNERS.tomas,
    due: "2026-10-09",
  },
  {
    id: "G-127",
    name: "Dial indicator 0.01 mm",
    ...OWNERS.mara,
    due: "2026-10-14",
  },
  {
    id: "G-130",
    name: "Torque screwdriver 1-6 Nm",
    ...OWNERS.jules,
    due: "2026-10-22",
  },
  {
    id: "G-133",
    name: "Digital caliper 200 mm",
    ...OWNERS.ines,
    due: "2026-10-27",
  },
  { id: "G-136", name: "Feeler gauge set", ...OWNERS.tomas, due: "2026-10-30" },
  {
    id: "G-139",
    name: "Micrometer 25-50 mm",
    ...OWNERS.mara,
    due: "2026-12-04",
  },
  {
    id: "G-142",
    name: "Pin gauge set 1-10 mm",
    ...OWNERS.jules,
    due: "2026-12-18",
  },
  { id: "G-145", name: "Gauge block set", ...OWNERS.ines, due: "2027-01-12" },
  {
    id: "G-148",
    name: "Pressure gauge 0-6 bar",
    ...OWNERS.tomas,
    due: "2027-02-03",
  },
  { id: "G-151", name: "Thermometer probe", ...OWNERS.mara, due: "2027-02-25" },
  {
    id: "G-154",
    name: "Torque wrench 5-25 Nm",
    ...OWNERS.jules,
    due: "2027-03-16",
  },
]

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`

// The status is an icon and words, so it still reads without colour.
function StatusCell({ gauge }: { gauge: Gauge }) {
  const days = daysUntil(gauge.due)
  const status = calibration(gauge)
  if (status === "overdue") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
        <TriangleAlert className="size-4" aria-hidden="true" />
        Overdue by {plural(-days, "day")}
      </span>
    )
  }
  if (status === "due-soon") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-4" aria-hidden="true" />
        Due in {plural(days, "day")}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <CircleCheck className="size-4" aria-hidden="true" />
      In date
    </span>
  )
}

const columns: DataTableColumn<Gauge>[] = [
  {
    key: "gauge",
    header: "Gauge",
    rowHeader: true,
    sortValue: (g) => g.id,
    cell: (g) => (
      <span className="flex flex-col">
        <span>{g.id}</span>
        <span className="text-xs font-normal text-muted-foreground">
          {g.name}
        </span>
      </span>
    ),
  },
  {
    key: "owner",
    header: "Owner",
    sortValue: (g) => g.owner,
    cell: (g) => g.owner,
  },
  {
    key: "due",
    header: "Due date",
    sortValue: (g) => g.due,
    cell: (g) => formatDate(g.due),
  },
  {
    key: "status",
    header: "Status",
    sortValue: (g) => RANK[calibration(g)],
    cell: (g) => <StatusCell gauge={g} />,
  },
]

const views: DataTableView<Gauge>[] = [
  { key: "all", label: "All", filter: () => true },
  {
    key: "overdue",
    label: "Overdue",
    filter: (g) => calibration(g) === "overdue",
  },
  {
    key: "due-soon",
    label: "Due in 30 days",
    filter: (g) => calibration(g) === "due-soon",
  },
]

export default function DataTableDemo() {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [sending, setSending] = React.useState(false)
  const [sentCount, setSentCount] = React.useState<number | null>(null)
  const [oldData, setOldData] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const [noRows, setNoRows] = React.useState(false)
  // Captured once, so the "As of" time is the moment the demo opened.
  const [openedAt] = React.useState(() => Date.now())

  const rows = noRows ? [] : GAUGES
  const count = (status: Calibration) =>
    rows.filter((g) => calibration(g) === status).length

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <StatusStrip
        headlineNoun="gauges in calibration"
        segments={[
          {
            key: "in-date",
            label: "in date",
            count: count("in-date"),
            tone: "done",
          },
          {
            key: "due-soon",
            label: "due in 30 days",
            count: count("due-soon"),
            tone: "active",
          },
          {
            key: "overdue",
            label: "overdue",
            count: count("overdue"),
            tone: "pending",
          },
        ]}
      />
      <DataTable
        caption="Gauges and when each is next due for calibration"
        noun="gauge"
        rows={rows}
        columns={columns}
        views={views}
        defaultActiveView="overdue"
        getRowId={(g) => g.id}
        rowLabel={(g) => `${g.id}, ${g.name}`}
        defaultSort={{ key: "due", direction: "asc" }}
        selectedIds={selectedIds}
        onSelectionChange={(ids) => {
          setSelectedIds(ids)
          setSentCount(null)
        }}
        asOf={openedAt - (oldData ? 3 * 60 * 60_000 : 5 * 60_000)}
        onRefresh={() => setOldData(false)}
        error={failed}
        onRetry={() => setFailed(false)}
        actions={(selected) => {
          const owners = new Set(selected.map((g) => g.ownerEmail))
          return (
            <ConfirmSend
              count={owners.size}
              noun="owner"
              label="Email a reminder"
              emptyReason="Select at least one gauge first"
              blockedReason={
                oldData ? "Refresh the list before sending" : undefined
              }
              sending={sending}
              sentCount={sentCount}
              onSend={async () => {
                setSending(true)
                await new Promise((r) => setTimeout(r, 600))
                setSending(false)
                setSentCount(owners.size)
              }}
            />
          )
        }}
      />
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <label className="flex items-center gap-2">
          <Switch checked={oldData} onCheckedChange={setOldData} />
          Pretend the list is 3 hours old
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={failed} onCheckedChange={setFailed} />
          Pretend the list failed to load
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={noRows} onCheckedChange={setNoRows} />
          Pretend there are no gauges
        </label>
      </div>
    </div>
  )
}
