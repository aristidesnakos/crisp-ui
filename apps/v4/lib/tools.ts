// The Real Good Site tool catalogue (mockup). A tool is a finished screen for
// one job; the building blocks under /docs/components are what it is made of.

export type ToolStatus = "available" | "free" | "next"

export type Tool = {
  slug: string
  name: string
  job: string
  industries: string[]
  status: ToolStatus
  href?: string
}

export const TOOLS: Tool[] = [
  {
    slug: "training-tracker",
    name: "Training tracker",
    job: "Know who's trained, chase who isn't, and prove it later.",
    industries: ["Schools", "Construction", "Training providers"],
    status: "available",
    href: "/tools/training-tracker",
  },
  {
    slug: "calibration-desk",
    name: "Calibration recall desk",
    job: "Recall overdue gauges with a two-person sign-off and a full record.",
    industries: ["Manufacturing"],
    status: "free",
    href: "/docs/components/calibration-desk",
  },
  {
    slug: "attendance-follow-up",
    name: "Attendance follow-up",
    job: "See who is absent today and email the right families, with a record of every message.",
    industries: ["Schools"],
    status: "next",
  },
  {
    slug: "site-inductions",
    name: "Site inductions",
    job: "Check every operative is inducted and in date before they start work.",
    industries: ["Construction"],
    status: "next",
  },
  {
    slug: "submittal-log",
    name: "Submittals and RFIs",
    job: "Track what is waiting on whom, route approvals, and keep every revision.",
    industries: ["Construction"],
    status: "next",
  },
  {
    slug: "compliance-report",
    name: "Monthly compliance report",
    job: "One page for the board: who is in date, what changed, what is overdue.",
    industries: ["Any team"],
    status: "next",
  },
]

export const STATUS_LABEL: Record<ToolStatus, string> = {
  available: "Ready",
  free: "Free example",
  next: "Coming next",
}

export type MomentItem = { stage: string; quote: string; text: string }

export const TRACKER_MOMENTS: MomentItem[] = [
  {
    stage: "See",
    quote: "11 of 18 staff up to date",
    text: "Who is done, who is due and who is overdue, at a glance.",
  },
  {
    stage: "Decide",
    quote: "Remind at 30 and 7 days",
    text: "Rules you can read as a sentence, with quiet hours so nobody gets a 2am email.",
  },
  {
    stage: "Act",
    quote: "Send to 7 people?",
    text: "Every send shows the count first. Every sign-off asks for a reason.",
  },
  {
    stage: "Confirm",
    quote: "Sent to 7",
    text: "You see what happened, including what failed and how to try again.",
  },
  {
    stage: "Record",
    quote: "Who did what, when and why",
    text: "Written by the server every time, ready when someone asks you to prove it.",
  },
]
