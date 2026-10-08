// Relative, not "@/lib/...": vitest in this app has no path alias.
import { twinPath } from "./mdx-to-markdown"

/**
 * The /llms.txt index. Fumadocs' own `llms().index()` lists relative HTML
 * URLs, but an agent that fetches this file from the site root wants absolute
 * links to the Markdown twins, so the index is built here from the page list.
 */

export type LlmsPage = {
  title: string
  description?: string
  /** The page's HTML URL, e.g. "/docs/components/status-notify". */
  url: string
  /** Virtual file path in the content folder, used for grouping. */
  path: string
}

export type PageTreeNodeLike = {
  type: string
  url?: string
  index?: { url: string }
  children?: PageTreeNodeLike[]
}

const GROUP_TITLES: Record<string, string> = {
  docs: "Guides",
  components: "Patterns",
}

/** Page URLs in the order the sidebar shows them. */
export function orderedUrls(root: { children: PageTreeNodeLike[] }) {
  const urls: string[] = []

  const visit = (nodes: PageTreeNodeLike[]) => {
    for (const node of nodes) {
      if (node.type === "page" && node.url) {
        urls.push(node.url)
      } else if (node.type === "folder") {
        if (node.index) {
          urls.push(node.index.url)
        }
        visit(node.children ?? [])
      }
    }
  }

  visit(root.children)
  return [...new Set(urls)]
}

export function sortPages<T extends LlmsPage>(pages: T[], order: string[]) {
  const rank = (page: T) => {
    const index = order.indexOf(page.url)
    return index === -1 ? order.length : index
  }
  return [...pages].sort((a, b) => rank(a) - rank(b))
}

function groupOf(page: LlmsPage) {
  // "components/status-notify.mdx" is in the "components" folder; a file at
  // the top of the content folder (or inside a "(root)" route group) is not.
  const folder = page.path
    .split("/")
    .slice(0, -1)
    .find((segment) => !/^\(.*\)$/.test(segment))
  const key = folder ?? "docs"
  const title = GROUP_TITLES[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
  return title
}

function oneLine(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

export function buildLlmsTxt({
  origin,
  name,
  summary,
  pages,
}: {
  origin: string
  name: string
  summary: string
  /** Already in the order they should appear. */
  pages: LlmsPage[]
}) {
  const base = origin.replace(/\/+$/, "")

  const groups = new Map<string, LlmsPage[]>()
  for (const page of pages) {
    const title = groupOf(page)
    groups.set(title, [...(groups.get(title) ?? []), page])
  }

  const lines = [
    `# ${name}`,
    "",
    `> ${oneLine(summary)}`,
    "",
    `${name} makes finished tools for whoever keeps the spreadsheet, such as a training tracker. These docs cover its building blocks, the UI parts those tools are made of, such as a status headline, who gets notified, confirm-then-send, and an unsaved-changes bar. They are a shadcn registry: the source is installed into your project and you own it. There is no package to depend on.`,
    "",
    "## For coding agents",
    "",
    `- Install an item with \`npx shadcn@latest add ${base}/r/<item>.json\`, for example \`status-notify\`. Items that depend on other items install those too.`,
    `- \`${base}/r/<item>.json\` is the machine-readable item: its files, npm dependencies and registry dependencies. Read it, or the installed files, before writing code against an item.`,
    `- Every docs page has a Markdown twin: add \`.md\` to its URL, or request the page with \`Accept: text/markdown\`. The links below are the twins.`,
    `- ${base}/llms-full.txt is every page below in one file.`,
    "- The patterns are UI only. They do not enforce access control, permissions or compliance; the handlers you pass in and your backend must do that.",
  ]

  for (const [title, group] of groups) {
    lines.push("", `## ${title}`, "")
    for (const page of group) {
      const description = page.description
        ? `: ${oneLine(page.description)}`
        : ""
      lines.push(
        `- [${page.title}](${base}${twinPath(page.url)})${description}`
      )
    }
  }

  return `${lines.join("\n")}\n`
}

/** Every page's markdown in one document, each introduced by its source URL. */
export function buildLlmsFullTxt({
  origin,
  entries,
}: {
  origin: string
  entries: { url: string; markdown: string }[]
}) {
  const base = origin.replace(/\/+$/, "")
  return (
    entries
      .map(
        (entry) =>
          `Source: ${base}${twinPath(entry.url)}\n\n${entry.markdown.trim()}`
      )
      .join("\n\n---\n\n") + "\n"
  )
}
