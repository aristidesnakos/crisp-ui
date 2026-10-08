// Sample data for the Real Good Site training tracker mockup. Every person and
// organisation here is made up. The clock is fixed so the server and the
// browser render the same thing and the story reads the same each time.
//
// The tracker is not for one industry. Visitors describe WHAT they track and
// WHO they track in their own words; the examples below only seed that.
import type { AuditEvent } from "@/registry/crisp/lib/audit-event"

export const DEMO_NOW = new Date("2026-10-06T09:30:00Z")

export type PersonStatus = "overdue" | "due" | "current"

export type TrackedPerson = {
  id: string
  name: string
  team: string
  status: PersonStatus
  /** Days past the due date when overdue, days until it otherwise. */
  days: number
}

/**
 * A starting point: what is tracked, and one kind of place that tracks it.
 * Many places, one list. These are examples of the job, not customers.
 */
export type TrackExample = {
  id: string
  /** What people must complete, as it reads in "Track ___ for staff". */
  training: string
  /** Who must complete it, plural. */
  people: string
  /** A kind of place, as in "Your ___". */
  where: string
  renewal: string
  approver: string
}

export const EXAMPLES: TrackExample[] = [
  {
    id: "school",
    training: "Safeguarding training",
    people: "staff",
    where: "school",
    renewal: "every year",
    approver: "Safeguarding lead",
  },
  {
    id: "site",
    training: "Site inductions",
    people: "contractors",
    where: "building site",
    renewal: "before their first day on site",
    approver: "Site manager",
  },
  {
    id: "course",
    training: "Course completion",
    people: "learners",
    where: "training academy",
    renewal: "by the end of the course",
    approver: "Course lead",
  },
  {
    id: "clinic",
    training: "Fire safety training",
    people: "staff",
    where: "dental practice",
    renewal: "every year",
    approver: "Practice manager",
  },
  {
    id: "club",
    training: "Background checks",
    people: "volunteers",
    where: "football club",
    renewal: "every 3 years",
    approver: "Volunteer coordinator",
  },
  {
    id: "kitchen",
    training: "Food hygiene certificates",
    people: "kitchen staff",
    where: "restaurant",
    renewal: "every 3 years",
    approver: "Head chef",
  },
  {
    id: "warehouse",
    training: "Forklift licences",
    people: "operators",
    where: "warehouse",
    renewal: "every 3 years",
    approver: "Warehouse manager",
  },
]

/** Where the same list lives. Kinds of workplace, not customers. */
export const EVERYWHERE: { where: string; lists: string[] }[] = [
  {
    where: "Schools",
    lists: ["Safeguarding training", "First aid", "Staff checks"],
  },
  {
    where: "Building sites",
    lists: ["Site inductions", "Working at height", "Plant tickets"],
  },
  {
    where: "Training providers",
    lists: ["Course completion", "Certificates", "Renewals"],
  },
  {
    where: "Clinics and care",
    lists: ["Fire safety", "Staff licences", "Life support"],
  },
  {
    where: "Restaurants",
    lists: ["Food hygiene", "Allergen training", "Fire drills"],
  },
  {
    where: "Warehouses and fleets",
    lists: ["Forklift licences", "Driving licence checks", "Manual handling"],
  },
  {
    where: "Clubs and charities",
    lists: ["Background checks", "Volunteer inductions", "Coaching badges"],
  },
  {
    where: "Offices",
    lists: ["Data protection", "Policy sign-offs", "Security training"],
  },
]

export const ORG = {
  name: "Your team",
  host: "tracker.your-team.example",
  sender: { name: "Joy Okafor", role: "Office manager" },
}

const DAY = 24 * 60 * 60 * 1000

function at(daysAgo: number, time: string) {
  const day = new Date(DEMO_NOW.getTime() - daysAgo * DAY)
  return `${day.toISOString().slice(0, 10)}T${time}:00Z`
}

function roster(
  overdue: [string, string, number][],
  due: [string, string, number][],
  current: [string, string][]
): TrackedPerson[] {
  let n = 0
  const id = () => `p-${++n}`
  return [
    ...overdue.map(([name, team, days]) => ({
      id: id(),
      name,
      team,
      status: "overdue" as const,
      days,
    })),
    ...due.map(([name, team, days]) => ({
      id: id(),
      name,
      team,
      status: "due" as const,
      days,
    })),
    ...current.map(([name, team], i) => ({
      id: id(),
      name,
      team,
      status: "current" as const,
      days: 60 + i * 23,
    })),
  ]
}

export const ROSTER: TrackedPerson[] = roster(
  [
    ["Tom Reyes", "Warehouse", 40],
    ["Dan Whitlock", "Field team", 12],
    ["Priya Shah", "Front desk", 3],
  ],
  [
    ["Grace Liu", "Office", 6],
    ["Sam Osei", "Operations", 11],
    ["Mia Novak", "Finance", 19],
    ["Ben Carter", "Kitchen", 27],
  ],
  [
    ["Hannah Price", "Manager"],
    ["Omar Haddad", "Operations"],
    ["Ruth Adeyemi", "Office"],
    ["Leo Fischer", "Warehouse"],
    ["Isla Grant", "Front desk"],
    ["Kwame Boateng", "Field team"],
    ["Sofia Rossi", "Kitchen"],
    ["Arjun Mehta", "IT"],
    ["Ella Brooks", "Finance"],
    ["Noah Kim", "Operations"],
    ["Zara Ali", "Warehouse"],
  ]
)

/** What the record already holds, in the visitor's own words. */
export function historyFor(training: string, people: string): AuditEvent[] {
  return [
    {
      id: "h1",
      at: at(1, "15:10"),
      actor: { name: "Hannah Price", role: "Manager" },
      action: "confirmed",
      target: "Isla Grant is up to date",
      reason: "Evidence checked and attached",
      outcome: "succeeded",
      detail: training,
    },
    {
      id: "h2",
      at: at(1, "08:00"),
      actor: ORG.sender,
      action: "sent a message to",
      target: `2 ${people}`,
      outcome: "succeeded",
      detail: `${training}. First name and what is due, nothing else.`,
    },
    {
      id: "h3",
      at: at(3, "16:45"),
      actor: ORG.sender,
      action: "added",
      target: `2 new ${people}`,
      reason: "Started on Monday",
      detail: training,
    },
  ]
}

/** The people who need attention: everyone not up to date. */
export function needsAttention(people: TrackedPerson[]) {
  return people.filter((p) => p.status !== "current")
}

const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

export function statusText(person: TrackedPerson) {
  const d = person.days
  const days = `${d} ${d === 1 ? "day" : "days"}`
  if (person.status === "overdue") return `Overdue by ${days}`
  if (person.status === "due") return `Due in ${days}`
  return `Up to date until ${MONTH_YEAR.format(new Date(DEMO_NOW.getTime() + d * DAY))}`
}
