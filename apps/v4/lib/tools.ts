// The Real Good Site tool catalogue (mockup). A tool is a finished screen for
// one job; the building blocks under /docs/components are what it is made of.

export type ToolStatus = "available" | "free" | "next"

export type Tool = {
  slug: string
  /** Named by the job, never by an industry. */
  name: string
  job: string
  /** What people use it for, in their words. Industries only appear here. */
  examples: string[]
  status: ToolStatus
  href?: string
}

export const TOOLS: Tool[] = [
  {
    slug: "training-tracker",
    name: "Training tracker",
    job: "Know who's done it, chase who hasn't, and prove it later.",
    examples: ["safety training", "certificates", "licences", "background checks"],
    status: "available",
    href: "/tools/training-tracker",
  },
  {
    slug: "policy-sign-offs",
    name: "Policy sign-offs",
    job: "Get everyone to read and accept a new policy by a date, and show who did.",
    examples: ["handbook updates", "data protection", "codes of conduct"],
    status: "next",
  },
  {
    slug: "approvals",
    name: "Approvals",
    job: "Requests that need a yes from the right person, with the reason kept.",
    examples: ["purchases", "time off", "changes to a plan"],
    status: "next",
  },
  {
    slug: "inspections",
    name: "Inspections and checks",
    job: "Recurring checks: who checked what, when, and what failed.",
    examples: ["fire doors", "vehicles", "equipment"],
    status: "next",
  },
  {
    slug: "calibration-desk",
    name: "Calibration recall desk",
    job: "A complete worked example: recall overdue gauges with a two-person sign-off.",
    examples: ["inspections", "recalls", "two-person approval"],
    status: "free",
    href: "/docs/components/calibration-desk",
  },
  {
    slug: "incident-log",
    name: "Incident log",
    job: "Report it, review it, follow it up and close it, with every step on record.",
    examples: ["accidents", "near misses", "complaints"],
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

/**
 * Sites Ari built with Real Good Site parts (confirmed by Ari, 2026-10-06), so
 * the label is "Built with", not "Trusted by". List only a site that really
 * uses the parts. Shown as wordmarks; swap in each brand's logo file later.
 */
export const IN_USE: { name: string; href: string; sector: string }[] = [
  { name: "Setian", href: "https://setian.ai", sector: "Education" },
  { name: "MichiKanji", href: "https://michikanji.com", sector: "Education" },
  {
    name: "RapidSafeSystems",
    href: "https://rapidsafesystems.au",
    sector: "Construction",
  },
  { name: "Outbreak Files", href: "https://outbreakfiles.com", sector: "Health" },
]
