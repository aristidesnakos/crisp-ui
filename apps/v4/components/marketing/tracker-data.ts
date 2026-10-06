// Sample data for the Real Good Site training tracker mockup. Every person,
// organisation and address here is made up. The clock is fixed so the server
// and the browser render the same thing and the story reads the same each time.
import type { AuditEvent } from "@/registry/crisp/lib/audit-event"

export const DEMO_NOW = new Date("2026-10-06T09:30:00Z")

export type IndustryId = "school" | "construction" | "training"

export type PersonStatus = "overdue" | "due" | "current"

export type TrackedPerson = {
  id: string
  name: string
  role: string
  status: PersonStatus
  /** Days past expiry when overdue, days until expiry otherwise. */
  days: number
}

export type Industry = {
  id: IndustryId
  /** Picker label. */
  label: string
  /** Picker label on narrow screens. */
  shortLabel: string
  /** Who the picker is for, in their own words. */
  audience: string
  org: string
  host: string
  training: string
  renewal: string
  /** Plural noun for the people tracked. */
  people: string
  person: string
  headlineNoun: string
  sender: { name: string; role: string }
  approver: string
  cc: string
  roster: TrackedPerson[]
  history: AuditEvent[]
}

const DAY = 24 * 60 * 60 * 1000

function at(daysAgo: number, time: string) {
  const day = new Date(DEMO_NOW.getTime() - daysAgo * DAY)
  return `${day.toISOString().slice(0, 10)}T${time}:00Z`
}

function roster(
  prefix: string,
  overdue: [string, string, number][],
  due: [string, string, number][],
  current: [string, string][]
): TrackedPerson[] {
  let n = 0
  const id = () => `${prefix}-${++n}`
  return [
    ...overdue.map(([name, role, days]) => ({
      id: id(),
      name,
      role,
      status: "overdue" as const,
      days,
    })),
    ...due.map(([name, role, days]) => ({
      id: id(),
      name,
      role,
      status: "due" as const,
      days,
    })),
    ...current.map(([name, role], i) => ({
      id: id(),
      name,
      role,
      status: "current" as const,
      days: 60 + i * 23,
    })),
  ]
}

export const INDUSTRIES: Record<IndustryId, Industry> = {
  school: {
    id: "school",
    label: "School",
    shortLabel: "School",
    audience: "School and trust staff",
    org: "Oakfield Primary",
    host: "training.oakfield-primary.example",
    training: "Safeguarding refresher",
    renewal: "every year",
    people: "staff",
    person: "staff member",
    headlineNoun: "staff up to date",
    sender: { name: "Joy Okafor", role: "School business manager" },
    approver: "Designated safeguarding lead",
    cc: "their line manager",
    roster: roster(
      "sch",
      [
        ["Tom Reyes", "Site caretaker", 40],
        ["Dan Whitlock", "Teaching assistant", 12],
        ["Priya Shah", "Year 4 teacher", 3],
      ],
      [
        ["Grace Liu", "Office manager", 6],
        ["Sam Osei", "PE teacher", 11],
        ["Mia Novak", "SENCo", 19],
        ["Ben Carter", "Year 2 teacher", 27],
      ],
      [
        ["Hannah Price", "Headteacher"],
        ["Omar Haddad", "Year 6 teacher"],
        ["Ruth Adeyemi", "Deputy head"],
        ["Leo Fischer", "Year 1 teacher"],
        ["Isla Grant", "Teaching assistant"],
        ["Kwame Boateng", "Year 5 teacher"],
        ["Sofia Rossi", "Reception teacher"],
        ["Arjun Mehta", "IT technician"],
        ["Ella Brooks", "Lunchtime supervisor"],
        ["Noah Kim", "Year 3 teacher"],
        ["Zara Ali", "Teaching assistant"],
      ]
    ),
    history: [
      {
        id: "sch-h1",
        at: at(1, "15:10"),
        actor: { name: "Hannah Price", role: "Designated safeguarding lead" },
        action: "signed off the refresher for",
        target: "Isla Grant",
        reason: "Certificate checked against the course record",
        outcome: "succeeded",
      },
      {
        id: "sch-h2",
        at: at(1, "08:00"),
        actor: "Reminder rule",
        action: "sent a 30-day reminder to",
        target: "2 staff",
        outcome: "succeeded",
        detail: "First name and training name only",
      },
      {
        id: "sch-h3",
        at: at(3, "16:45"),
        actor: { name: "Joy Okafor", role: "School business manager" },
        action: "changed the reminder rule",
        reason: "Agreed at the staff meeting",
        detail: "Copy line managers after 2 reminders",
      },
    ],
  },
  construction: {
    id: "construction",
    label: "Construction",
    shortLabel: "Construction",
    audience: "Site and safety managers",
    org: "Harbour Street build",
    host: "site.harbour-street.example",
    training: "Site induction and working at height",
    renewal: "every 3 years",
    people: "operatives",
    person: "operative",
    headlineNoun: "operatives cleared to work",
    sender: { name: "Marcus Hale", role: "Site manager" },
    approver: "Site manager",
    cc: "their subcontractor's supervisor",
    roster: roster(
      "con",
      [
        ["Kofi Mensah", "Groundworker", 15],
        ["Liam Byrne", "Scaffolder, Northline", 9],
        ["Ewa Kowalski", "Electrician, Brightwire", 2],
      ],
      [
        ["Jack Turner", "Site carpenter", 5],
        ["Aisha Rahman", "Plant operator", 14],
        ["Rory Doyle", "Bricklayer", 21],
        ["Nina Petrova", "Steel fixer", 28],
      ],
      [
        ["Dev Patel", "Banksman"],
        ["Sean Murphy", "Bricklayer"],
        ["Lena Vogel", "Site engineer"],
        ["Chris Obi", "Labourer"],
        ["Tomasz Nowak", "Plasterer"],
        ["Ian Clarke", "Roofer, Skyline"],
        ["Fatima Noor", "Health and safety advisor"],
        ["Ollie Wright", "Apprentice joiner"],
        ["Gabriel Costa", "Plumber, Flowfix"],
        ["Ryan Hughes", "Dumper driver"],
        ["Megan Shaw", "Site administrator"],
      ]
    ),
    history: [
      {
        id: "con-h1",
        at: at(1, "07:20"),
        actor: { name: "Marcus Hale", role: "Site manager" },
        action: "cleared to work",
        target: "Dev Patel",
        reason: "Induction done on site, card seen",
        outcome: "succeeded",
      },
      {
        id: "con-h2",
        at: at(1, "06:00"),
        actor: "Reminder rule",
        action: "sent a 30-day reminder to",
        target: "3 operatives",
        outcome: "succeeded",
        detail: "First name and training name only",
      },
      {
        id: "con-h3",
        at: at(2, "13:05"),
        actor: { name: "Fatima Noor", role: "Health and safety advisor" },
        action: "refused clearance for",
        target: "Kofi Mensah",
        reason: "Working at height certificate not provided",
        outcome: "blocked",
      },
    ],
  },
  training: {
    id: "training",
    label: "Training provider",
    shortLabel: "Training",
    audience: "Course leads and training coordinators",
    org: "Northgate Skills",
    host: "learn.northgate-skills.example",
    training: "First aid at work certificate",
    renewal: "every 3 years",
    people: "learners",
    person: "learner",
    headlineNoun: "learners certified",
    sender: { name: "Rosa Díaz", role: "Training coordinator" },
    approver: "Course lead",
    cc: "their employer contact",
    roster: roster(
      "trn",
      [
        ["Chloe Martin", "Care home, cohort B", 21],
        ["Josh Evans", "Warehouse, cohort A", 8],
        ["Amara Okoye", "Care home, cohort B", 1],
      ],
      [
        ["Freya Lund", "Retail, cohort C", 4],
        ["Mohammed Aziz", "Warehouse, cohort A", 10],
        ["Holly Jenkins", "Retail, cohort C", 17],
        ["Pete Lawson", "Care home, cohort B", 25],
      ],
      [
        ["Yuki Tanaka", "Retail, cohort C"],
        ["Ben Adler", "Warehouse, cohort A"],
        ["Precious Moyo", "Care home, cohort B"],
        ["Luca Bianchi", "Retail, cohort C"],
        ["Sara Lindqvist", "Warehouse, cohort A"],
        ["Kemi Adebayo", "Care home, cohort B"],
        ["Owen Price", "Retail, cohort C"],
        ["Ines Duarte", "Warehouse, cohort A"],
        ["Ravi Kumar", "Care home, cohort B"],
        ["Abby Collins", "Retail, cohort C"],
        ["Hugo Martin", "Warehouse, cohort A"],
      ]
    ),
    history: [
      {
        id: "trn-h1",
        at: at(1, "14:30"),
        actor: { name: "Dr. Alan Reid", role: "Course lead" },
        action: "issued the certificate to",
        target: "Kemi Adebayo",
        reason: "Practical assessment passed",
        outcome: "succeeded",
      },
      {
        id: "trn-h2",
        at: at(1, "09:00"),
        actor: "Reminder rule",
        action: "sent a 30-day reminder to",
        target: "4 learners",
        outcome: "succeeded",
        detail: "First name and course name only",
      },
      {
        id: "trn-h3",
        at: at(4, "11:15"),
        actor: "Email service",
        action: "could not deliver a reminder to",
        target: "1 learner",
        outcome: "failed",
        detail: "Address bounced. Flagged for the coordinator.",
      },
    ],
  },
}

export const INDUSTRY_ORDER: IndustryId[] = ["school", "construction", "training"]

/** The people a reminder would go to: everyone not up to date. */
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
