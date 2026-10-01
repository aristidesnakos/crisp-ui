import type { source } from "@/lib/source"

export type PageTreeNode = (typeof source.pageTree)["children"][number]
export type PageTreeFolder = Extract<PageTreeNode, { type: "folder" }>
export type PageTreePage = Extract<PageTreeNode, { type: "page" }>

// The docs navigation. The site is small enough that this is written out
// rather than derived from the page tree.
export const DOCS_NAV = [
  {
    name: "Get Started",
    items: [
      { name: "Introduction", href: "/docs" },
      { name: "Installation", href: "/docs/installation" },
    ],
  },
  {
    name: "Patterns",
    items: [
      { name: "Components", href: "/docs/components" },
      { name: "Status and notify", href: "/docs/components/status-notify" },
      { name: "Status strip", href: "/docs/components/status-strip" },
      { name: "Recipient roster", href: "/docs/components/recipient-roster" },
      { name: "Confirm send", href: "/docs/components/confirm-send" },
      { name: "Save bar", href: "/docs/components/save-bar" },
      { name: "Notify envelope", href: "/docs/components/notify-envelope" },
      { name: "Audit timeline", href: "/docs/components/audit-timeline" },
    ],
  },
]

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
