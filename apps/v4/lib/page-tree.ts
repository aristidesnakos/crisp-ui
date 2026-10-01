import type { source } from "@/lib/source"
import { getStoryGroups, type StoryGroup } from "@/lib/story"

export type PageTreeNode = (typeof source.pageTree)["children"][number]
export type PageTreeFolder = Extract<PageTreeNode, { type: "folder" }>
export type PageTreePage = Extract<PageTreeNode, { type: "page" }>

export type NavGroup = {
  name: string
  items: { name: string; href: string }[]
}

// Pages that are not patterns. The hrefs are fixed.
export const GET_STARTED: NavGroup = {
  name: "Get Started",
  items: [
    { name: "Introduction", href: "/docs" },
    { name: "Installation", href: "/docs/installation" },
    { name: "The story", href: "/docs/story" },
    { name: "Build the whole arc", href: "/docs/build-the-arc" },
    { name: "Use with AI agents", href: "/docs/ai" },
    { name: "All patterns", href: "/docs/components" },
  ],
}

// The docs navigation, derived from the story (lib/story.ts) and the registry
// template: one group per stage in story order, then composites under "Whole
// screens". A new item in the template shows up here without editing this file.
export function buildDocsNav(groups: StoryGroup[] = getStoryGroups()) {
  return [
    GET_STARTED,
    ...groups
      .filter((group) => group.pages.length > 0)
      .map((group) => ({
        name: group.name,
        items: group.pages.map((page) => ({
          name: page.title,
          href: page.href,
        })),
      })),
  ]
}

export const DOCS_NAV = buildDocsNav()

// Recursively find all pages in a folder tree.
export function getAllPagesFromFolder(folder: PageTreeFolder): PageTreePage[] {
  const pages: PageTreePage[] = []

  for (const child of folder.children) {
    if (child.type === "page") {
      pages.push(child)
    } else if (child.type === "folder") {
      pages.push(...getAllPagesFromFolder(child))
    }
  }

  return pages
}

// Get the pages from a folder. The components folder is flattened, without
// its own index page.
export function getPagesFromFolder(folder: PageTreeFolder): PageTreePage[] {
  if (folder.$id === "components" || folder.name === "Components") {
    return getAllPagesFromFolder(folder).filter(
      (page) => !page.url.endsWith("/components")
    )
  }

  // For other folders, return direct page children.
  return folder.children.filter(
    (child): child is PageTreePage => child.type === "page"
  )
}
