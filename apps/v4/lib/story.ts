// The story that orders the patterns: See, Decide, Act, Confirm, Record, and
// back to See. A recommended path for a workflow screen, not a standard.
//
// The stage ids, names and questions mirror the STAGES list in
// scripts/build-agent-files.mjs (tests/story.test.ts fails on drift; that
// script is plain Node and is not imported here so this file stays safe to
// bundle for the browser). Which page belongs to which stage is read from
// registry-crisp.template.json, so a new item appears in the navigation
// without editing this file. Only the "comes after / leads to" links are
// written out below.
import template from "@/registry-crisp.template.json"

export const STAGES = [
  { id: "see", name: "See", question: "What is happening?" },
  { id: "decide", name: "Decide", question: "What needs me, and who hears?" },
  { id: "act", name: "Act", question: "Do it safely." },
  { id: "confirm", name: "Confirm", question: "Did it work, who knows?" },
  { id: "record", name: "Record", question: "Can I prove who did what?" },
] as const

export type StageId = (typeof STAGES)[number]["id"]

// Composites are items that span several stages (`meta.stageEnd` is set).
// They are listed together, after the five stages.
export const WHOLE_SCREENS = {
  id: "whole-screens",
  name: "Whole screens",
  question: "Several stages already wired together.",
} as const

export type StoryLinks = {
  stage: StageId
  /** Pages that usually come before this one. */
  after: string[]
  /** Pages that usually come next. */
  leadsTo: string[]
}

// Keyed by docs page slug (content/docs/components/<slug>.mdx). The key order
// is the order of the pages inside a stage and in the sidebar.
export const STORY_MAP: Record<string, StoryLinks> = {
  "status-strip": {
    stage: "see",
    after: [],
    leadsTo: ["data-table", "recipient-roster"],
  },
  "data-table": {
    stage: "see",
    after: ["status-strip"],
    leadsTo: ["approval-step", "confirm-send"],
  },
  "recipient-roster": {
    stage: "decide",
    after: ["status-strip", "data-table"],
    leadsTo: ["alert-rules", "confirm-send"],
  },
  "alert-rules": {
    stage: "decide",
    after: ["recipient-roster"],
    leadsTo: ["confirm-send"],
  },
  "save-bar": {
    stage: "act",
    after: ["recipient-roster", "alert-rules"],
    leadsTo: ["confirm-send"],
  },
  "approval-step": {
    stage: "act",
    after: ["data-table"],
    leadsTo: ["confirm-send", "audit-timeline"],
  },
  "confirm-send": {
    stage: "act",
    after: ["data-table", "approval-step", "save-bar"],
    leadsTo: ["audit-timeline"],
  },
  "notify-envelope": {
    stage: "confirm",
    after: ["confirm-send"],
    leadsTo: ["audit-timeline"],
  },
  quiz: {
    stage: "confirm",
    after: ["confirm-send", "notify-envelope"],
    leadsTo: ["audit-timeline"],
  },
  "audit-timeline": {
    stage: "record",
    after: ["confirm-send", "approval-step"],
    leadsTo: ["status-strip"],
  },
  "status-notify": {
    stage: "see",
    after: [],
    leadsTo: ["audit-timeline"],
  },
}

// The part of a registry item this file reads.
export type TemplateItem = {
  name: string
  title?: string
  description?: string
  meta?: { stage?: string; stageEnd?: string; recipe?: string }
}

export type StoryPage = {
  /** The docs page slug, content/docs/components/<slug>.mdx. */
  slug: string
  title: string
  description: string
  href: string
  stage: StageId
  /** Set on composites: the last stage the page spans. */
  stageEnd?: StageId
  composite: boolean
}

export type StoryGroup = {
  id: string
  name: string
  question: string
  pages: StoryPage[]
}

const RECIPE_SLUG = /\/docs\/components\/([a-z0-9-]+)\.md$/

/** The page slug in an item's `meta.recipe`, or undefined if it has none. */
export function pageSlug(item: TemplateItem): string | undefined {
  return item.meta?.recipe?.match(RECIPE_SLUG)?.[1]
}

const isStage = (id: unknown): id is StageId =>
  STAGES.some((stage) => stage.id === id)

/**
 * The docs pages behind a list of registry items, one per page. Several items
 * can share a page (a lib and the ui part it supports); the item named like the
 * page speaks for it. Items with no `meta.recipe` have no page and are skipped.
 * Pages follow STORY_MAP order; a page the map does not know yet comes after
 * the mapped ones, in template order.
 */
export function getStoryPages(
  items: TemplateItem[] = template.items as TemplateItem[]
): StoryPage[] {
  const bySlug = new Map<string, TemplateItem[]>()
  for (const item of items) {
    const slug = pageSlug(item)
    if (!slug) continue
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), item])
  }

  const pages: StoryPage[] = []
  for (const [slug, group] of bySlug) {
    const lead = group.find((item) => item.name === slug) ?? group[0]
    const stage = lead.meta?.stage
    if (!isStage(stage)) {
      throw new Error(`${lead.name}: meta.stage is not a known stage`)
    }
    const stageEnd = lead.meta?.stageEnd
    if (stageEnd !== undefined && !isStage(stageEnd)) {
      throw new Error(`${lead.name}: meta.stageEnd is not a known stage`)
    }
    pages.push({
      slug,
      title: lead.title ?? lead.name,
      description: lead.description ?? "",
      href: `/docs/components/${slug}`,
      stage,
      stageEnd,
      composite: stageEnd !== undefined,
    })
  }

  const order = (slug: string) => {
    const at = Object.keys(STORY_MAP).indexOf(slug)
    return at === -1 ? Number.MAX_SAFE_INTEGER : at
  }
  // Array.prototype.sort is stable, so unmapped pages keep template order.
  return pages.sort((a, b) => order(a.slug) - order(b.slug))
}

/**
 * Pages grouped by stage, then composites in "Whole screens". A stage with no
 * page yet has an empty list (the tests fail on that; the nav leaves it out).
 */
export function getStoryGroups(
  pages: StoryPage[] = getStoryPages()
): StoryGroup[] {
  const groups: StoryGroup[] = STAGES.map((stage) => ({
    ...stage,
    pages: pages.filter((page) => !page.composite && page.stage === stage.id),
  }))
  groups.push({
    ...WHOLE_SCREENS,
    pages: pages.filter((page) => page.composite),
  })
  return groups
}

/** Page slugs in story order: the order of the sidebar and of prev/next. */
export function getStoryOrder(groups: StoryGroup[] = getStoryGroups()) {
  return groups.flatMap((group) => group.pages.map((page) => page.slug))
}
