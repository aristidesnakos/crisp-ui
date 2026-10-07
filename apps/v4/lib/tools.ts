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
    examples: [
      "safety training",
      "certificates",
      "licences",
      "background checks",
    ],
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

export type ShowcaseItem = {
  name: string
  href: string
  /** Shown small and uppercase under the name. */
  sector: string
  /** A 1280×800 WebP in public/showcase. */
  image: string
  alt: string
  /** "built" is a real site made with the parts; "start" is our own tool. */
  kind: "built" | "start"
}

/**
 * The landing's showcase grid. The first four are sites Ari built with Real Good Site
 * parts (confirmed by Ari, 2026-10-06), so the label is "Built with", never
 * "Trusted by". List only a site that really uses the parts. The last tile is
 * the training tracker, shown as the place to start, not as a customer.
 */
export const SHOWCASE: ShowcaseItem[] = [
  {
    name: "Setian",
    href: "https://setian.ai",
    sector: "Education",
    image: "/showcase/setian-hero.webp",
    alt: "Setian home page hero: one clear calendar per child",
    kind: "built",
  },
  {
    name: "MichiKanji",
    href: "https://michikanji.com/kanji/n5/quiz",
    sector: "Education",
    image: "/showcase/michikanji-quiz.webp",
    alt: "MichiKanji JLPT N5 kanji quiz, question 1 of 10",
    kind: "built",
  },
  {
    name: "RapidSafeSystems",
    href: "https://rapidsafesystems.au/#pricing",
    sector: "Construction",
    image: "/showcase/rapidsafesystems-pricing.webp",
    alt: "RapidSafeSystems pricing: SWMS credits and an Enterprise plan",
    kind: "built",
  },
  {
    name: "Outbreak Files",
    href: "https://outbreakfiles.com",
    sector: "Health",
    image: "/showcase/outbreak-files.webp",
    alt: "Outbreak Files home page",
    kind: "built",
  },
  {
    name: "Training tracker",
    href: "/tools/training-tracker",
    sector: "Yours next",
    image: "/showcase/training-tracker.webp",
    alt: "The training tracker with sample data",
    kind: "start",
  },
]
