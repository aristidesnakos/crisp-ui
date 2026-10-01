/**
 * Turn a docs page's MDX into plain markdown that an agent can read on its
 * own: the site's JSX components become markdown, and the two that point at
 * source code (`ComponentPreview`, `ComponentSource`) are replaced by the code
 * itself. Fenced code blocks are never touched.
 *
 * Pure apart from the two injected readers, so it is unit tested without the
 * Next.js runtime.
 */

export type MarkdownResolvers = {
  /** Text of a file under the app root, e.g. "registry/crisp/ui/save-bar.tsx". */
  readSource: (src: string) => Promise<string | undefined>
  /** Source of a demo by name, e.g. "status-notify-demo". */
  readDemo: (name: string, styleName: string) => Promise<string | undefined>
}

export type MarkdownOptions = {
  /**
   * When set, site-relative `/docs/...` links become absolute links to the
   * page's `.md` twin, so they resolve from wherever the markdown ends up.
   */
  origin?: string
}

const DEFAULT_STYLE = "radix-nova"
const PLACEHOLDER = /\u0000CODE(\d+)\u0000/g

type Chunk = { code: boolean; text: string }

/** Split into prose and fenced code blocks, keeping the fences verbatim. */
function splitFences(md: string): Chunk[] {
  const chunks: Chunk[] = []
  let open: { char: string; length: number } | null = null
  let buffer: string[] = []

  const flush = (code: boolean) => {
    if (buffer.length) {
      chunks.push({ code, text: buffer.join("\n") })
    }
    buffer = []
  }

  for (const line of md.split("\n")) {
    if (!open) {
      const start = line.match(/^\s*(`{3,}|~{3,})/)
      if (start) {
        flush(false)
        open = { char: start[1][0], length: start[1].length }
      }
      buffer.push(line)
      continue
    }

    buffer.push(line)
    const close = line.match(/^\s*(`{3,}|~{3,})\s*$/)
    if (close && close[1][0] === open.char && close[1].length >= open.length) {
      flush(true)
      open = null
    }
  }

  // An unterminated fence runs to the end of the file, as markdown does.
  flush(open !== null)
  return chunks
}

function attr(tag: string, name: string) {
  return tag
    .match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`))
    ?.slice(1)
    .find(Boolean)
}

function dedent(text: string) {
  const lines = text.replace(/^\n+|\s+$/g, "").split("\n")
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => line.match(/^\s*/)?.[0].length ?? 0)
  const strip = indents.length ? Math.min(...indents) : 0
  return lines.map((line) => line.slice(strip).trimEnd()).join("\n")
}

/** A fenced block long enough that the code inside cannot close it. */
export function fenceCode(code: string, language = "", title?: string) {
  const body = code.replace(/\s+$/, "")
  const longest = Math.max(
    2,
    ...(body.match(/`+/g) ?? []).map((run) => run.length)
  )
  const fence = "`".repeat(longest + 1)
  const info = [language, title ? `title="${title}"` : ""]
    .filter(Boolean)
    .join(" ")
  return `${fence}${info}\n${body}\n${fence}`
}

function languageFor(title?: string, language?: string) {
  return language ?? title?.split(".").pop() ?? "tsx"
}

export function twinPath(pageUrl: string) {
  return `${pageUrl.replace(/\/+$/, "")}.md`
}

function rewriteLinks(md: string, origin: string) {
  const base = origin.replace(/\/+$/, "")
  return md.replace(
    /\]\((\/docs(?:\/[^)#\s]*)?)(#[^)\s]*)?\)/g,
    (_match, path: string, hash = "") => `](${base}${twinPath(path)}${hash})`
  )
}

async function convertProse(
  text: string,
  resolvers: MarkdownResolvers,
  options: MarkdownOptions,
  tabLabels: Map<string, string>
) {
  const blocks: Promise<string>[] = []
  const hold = (block: Promise<string>) => {
    blocks.push(block)
    return `\n\n\u0000CODE${blocks.length - 1}\u0000\n\n`
  }

  let out = text.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")

  // Code that lives in another file is inlined. The result is held back behind
  // a placeholder so the tag rules below never rewrite the code itself.
  out = out.replace(/<ComponentPreview\b[\s\S]*?\/>/g, (tag) => {
    const name = attr(tag, "name")
    const styleName = attr(tag, "styleName") ?? DEFAULT_STYLE
    return hold(
      (async () => {
        const code = name
          ? await resolvers.readDemo(name, styleName)
          : undefined
        return code ? fenceCode(code, "tsx") : ""
      })()
    )
  })

  out = out.replace(/<ComponentSource\b[\s\S]*?\/>/g, (tag) => {
    const src = attr(tag, "src")
    const title = attr(tag, "title")
    const language = attr(tag, "language")
    return hold(
      (async () => {
        const code = src ? await resolvers.readSource(src) : undefined
        return code ? fenceCode(code, languageFor(title, language), title) : ""
      })()
    )
  })

  // <Steps><Step>...</Step></Steps> becomes a numbered run of paragraphs.
  out = out.replace(
    /<Steps\b[^>]*>([\s\S]*?)<\/Steps>/g,
    (_m, inner: string) => {
      let n = 0
      return inner.replace(
        /<Step\b[^>]*>([\s\S]*?)<\/Step>/g,
        (_step, body: string) => `\n\n**Step ${++n}.** ${dedent(body)}\n\n`
      )
    }
  )

  // <Callout title="..."> becomes a blockquote.
  out = out.replace(
    /<Callout\b([^>]*)>([\s\S]*?)<\/Callout>/g,
    (_m, attrs: string, body: string) => {
      const title = attr(attrs, "title")
      const lines = dedent(body).split("\n")
      const quoted = (title ? [`**${title}**`, "", ...lines] : lines).map(
        (line) => (line ? `> ${line}` : ">")
      )
      return `\n\n${quoted.join("\n")}\n\n`
    }
  )

  // Tab triggers only label the panels, so remember the labels and drop the
  // list. Each panel then opens with its label in bold.
  out = out.replace(
    /<TabsList\b[^>]*>([\s\S]*?)<\/TabsList>/g,
    (_m, inner: string) => {
      for (const trigger of inner.matchAll(
        /<TabsTrigger\b([^>]*)>([\s\S]*?)<\/TabsTrigger>/g
      )) {
        const value = attr(trigger[1], "value")
        if (value) {
          tabLabels.set(value, trigger[2].trim())
        }
      }
      return ""
    }
  )
  out = out.replace(/<TabsContent\b([^>]*)>/g, (_m, attrs: string) => {
    const value = attr(attrs, "value")
    const label = value ? (tabLabels.get(value) ?? value) : ""
    return label ? `\n\n**${label}**\n\n` : "\n\n"
  })

  // Anything else that is a bare component tag on its own line (wrappers like
  // <CodeTabs>, or a component added later) is dropped, keeping its children.
  out = out.replace(/^[ \t]*<\/?[A-Z][\w.]*(?:\s[^>]*)?\/?>[ \t]*$/gm, "")

  if (options.origin) {
    out = rewriteLinks(out, options.origin)
  }

  // A reference that could not be resolved leaves nothing behind.
  const resolved = await Promise.all(blocks)
  out = out.replace(PLACEHOLDER, (match, index: string) =>
    resolved[Number(index)] ? match : ""
  )
  out = out.replace(/\n{3,}/g, "\n\n").trim()

  return out.replace(
    PLACEHOLDER,
    (_m, index: string) => resolved[Number(index)]
  )
}

export function stripFrontmatter(raw: string) {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
}

/** MDX in, plain markdown out. Frontmatter is dropped; use `renderPage` to add a heading. */
export async function mdxToMarkdown(
  mdx: string,
  resolvers: MarkdownResolvers,
  options: MarkdownOptions = {}
) {
  const tabLabels = new Map<string, string>()
  const parts: string[] = []

  for (const chunk of splitFences(
    stripFrontmatter(mdx).replace(/\r\n/g, "\n")
  )) {
    const text = chunk.code
      ? chunk.text
      : await convertProse(chunk.text, resolvers, options, tabLabels)
    if (text) {
      parts.push(text)
    }
  }

  const md = `${parts.join("\n\n")}\n`

  // The docs write install commands against a placeholder host. An agent
  // cannot run that, so the twin names the real one.
  return options.origin
    ? md.replaceAll("https://<your-domain>", options.origin.replace(/\/+$/, ""))
    : md
}

/** A whole page: title, description, then the converted body. */
export async function renderPage(
  page: { title: string; description?: string; mdx: string },
  resolvers: MarkdownResolvers,
  options: MarkdownOptions = {}
) {
  const body = await mdxToMarkdown(page.mdx, resolvers, options)
  const head = [`# ${page.title}`]
  if (page.description) {
    head.push(`> ${page.description}`)
  }
  return `${head.join("\n\n")}\n\n${body}`
}

/**
 * JSX component tags still present outside code, which means a component the
 * converter does not know about. Used by tests to keep the twins clean.
 */
export function findLeftoverJsx(md: string) {
  return splitFences(md)
    .filter((chunk) => !chunk.code)
    .flatMap(
      (chunk) =>
        chunk.text
          .replace(/`[^`\n]*`/g, "")
          .match(/<\/?[A-Z][\w.]*(?=[\s/>])/g) ?? []
    )
}
