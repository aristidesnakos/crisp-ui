import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  findLeftoverJsx,
  mdxToMarkdown,
  renderPage,
  twinPath,
  type MarkdownResolvers,
} from "../lib/mdx-to-markdown"

// Strings below are copied from content/docs/components/status-notify.mdx and
// confirm-send.mdx, so a change to how those pages are written shows up here.

const sources: Record<string, string> = {
  "registry/crisp/blocks/status-notify.tsx":
    'import * as React from "react"\n\nexport function StatusNotify() {\n  return <Card />\n}\n',
  "registry/crisp/ui/confirm-send.tsx":
    "export function ConfirmSend() {\n  return <Button>`ok`</Button>\n}\n",
}

const resolvers: MarkdownResolvers = {
  readSource: async (src) => sources[src],
  readDemo: async (name) =>
    name === "status-notify-demo"
      ? "export default function Demo() {}\n"
      : undefined,
}

const INSTALL = `## Installation

<CodeTabs>

<TabsList>
  <TabsTrigger value="cli">Command</TabsTrigger>
  <TabsTrigger value="manual">Manual</TabsTrigger>
</TabsList>
<TabsContent value="cli">

\`\`\`bash
npx shadcn@latest add https://<your-domain>/r/status-notify.json
\`\`\`

This also adds the five smaller items it is built from, and the shadcn \`card\`, \`button\`, \`input\` and \`switch\` they use.

</TabsContent>

<TabsContent value="manual">

<Steps className="mb-0 pt-2">

<Step>Copy and paste the following code into your project.</Step>

<ComponentSource
  src="registry/crisp/blocks/status-notify.tsx"
  title="components/status-notify.tsx"
/>

<Step>
  Add the parts it imports: [\`status-strip\`](/docs/components/status-strip),
  [\`recipient-roster\`](/docs/components/recipient-roster). Update the import paths
  to match your project setup.
</Step>

</Steps>

</TabsContent>

</CodeTabs>
`

describe("mdxToMarkdown", () => {
  it("turns the install tabs into labelled sections that keep the command", async () => {
    const md = await mdxToMarkdown(INSTALL, resolvers)

    expect(md).toContain("**Command**")
    expect(md).toContain("**Manual**")
    expect(md).toContain(
      "npx shadcn@latest add https://<your-domain>/r/status-notify.json"
    )
    expect(md).toContain("**Step 1.** Copy and paste the following code")
    expect(md).toContain("**Step 2.** Add the parts it imports:")
    expect(findLeftoverJsx(md)).toEqual([])
    expect(md).not.toMatch(
      /<(CodeTabs|TabsList|TabsContent|TabsTrigger|Steps?)\b/
    )
  })

  it("inlines ComponentSource as the real file text, titled and fenced", async () => {
    const md = await mdxToMarkdown(INSTALL, resolvers)

    expect(md).toContain(
      '```tsx title="components/status-notify.tsx"\nimport * as React from "react"\n\nexport function StatusNotify() {\n  return <Card />\n}\n```'
    )
    expect(md).not.toContain("<ComponentSource")
  })

  it("does not rewrite JSX inside inlined or authored code", async () => {
    const md = await mdxToMarkdown(
      '<ComponentSource src="registry/crisp/ui/confirm-send.tsx" title="components/ui/confirm-send.tsx" />\n\n```tsx\n<StatusNotify\n  headlineNoun="staff trained"\n/>\n```\n',
      resolvers
    )

    expect(md).toContain("<StatusNotify\n  headlineNoun")
    expect(md).toContain("<Button>`ok`</Button>")
    // The source contains a backtick run, so its fence is longer than three.
    expect(md).toContain("```tsx title=")
  })

  it("replaces ComponentPreview with the demo source, or drops it when unknown", async () => {
    const known = await mdxToMarkdown(
      '<ComponentPreview styleName="radix-nova" name="status-notify-demo" />\n\nIntro.\n',
      resolvers
    )
    expect(known).toBe(
      "```tsx\nexport default function Demo() {}\n```\n\nIntro.\n"
    )

    const unknown = await mdxToMarkdown(
      '<ComponentPreview name="missing-demo" />\n\nIntro.\n',
      resolvers
    )
    expect(unknown).toBe("Intro.\n")
  })

  it("turns Callout into a blockquote, keeping inline code", async () => {
    const md = await mdxToMarkdown(
      `<Callout>
  Your \`onSave\` must update \`saved\` (state, refetch or cache) once the write
  succeeds. Until it does, the "Unsaved changes" bar stays.
</Callout>

Requires Tailwind 3.4 or newer.
`,
      resolvers
    )

    expect(md).toBe(
      '> Your `onSave` must update `saved` (state, refetch or cache) once the write\n> succeeds. Until it does, the "Unsaved changes" bar stays.\n\nRequires Tailwind 3.4 or newer.\n'
    )
  })

  it("puts a Callout title in bold", async () => {
    const md = await mdxToMarkdown(
      '<Callout title="Heads up">Body.</Callout>',
      resolvers
    )
    expect(md).toBe("> **Heads up**\n>\n> Body.\n")
  })

  it("keeps tables, usage code and headings as they are", async () => {
    const mdx = `---
title: Confirm send
description: Click, confirm, send.
---

## Props

| Prop    | Type                  | Description         |
| ------- | --------------------- | ------------------- |
| \`count\` | \`number\`              | Recipients.         |
| \`onSend\` | \`() => Promise<void>\` | Runs on confirm.    |

\`\`\`tsx
const [sending, setSending] = React.useState(false)

<ConfirmSend
  count={saved.length}
  onSend={async () => {}}
/>
\`\`\`
`
    const md = await mdxToMarkdown(mdx, resolvers)

    expect(md.startsWith("## Props")).toBe(true)
    expect(md).toContain(
      "| `onSend` | `() => Promise<void>` | Runs on confirm.    |"
    )
    expect(md).toContain("<ConfirmSend\n  count={saved.length}")
    expect(findLeftoverJsx(md)).toEqual([])
  })

  it("makes docs links absolute links to the .md twin when given an origin", async () => {
    const md = await mdxToMarkdown(
      "See [`status-strip`](/docs/components/status-strip), the [setup](/docs/installation#manual) and [docs](/docs). [Other](https://example.com/docs/x).",
      resolvers,
      { origin: "https://regularui.com/" }
    )

    expect(md).toContain(
      "[`status-strip`](https://regularui.com/docs/components/status-strip.md)"
    )
    expect(md).toContain(
      "[setup](https://regularui.com/docs/installation.md#manual)"
    )
    expect(md).toContain("[docs](https://regularui.com/docs.md)")
    expect(md).toContain("[Other](https://example.com/docs/x)")
  })

  it("replaces the <your-domain> placeholder in install commands with the origin", async () => {
    const mdx =
      "```bash\nnpx shadcn@latest add https://<your-domain>/r/confirm-send.json\n```\n"

    expect(
      await mdxToMarkdown(mdx, resolvers, { origin: "https://regularui.com/" })
    ).toBe(
      "```bash\nnpx shadcn@latest add https://regularui.com/r/confirm-send.json\n```\n"
    )
    // Without an origin the text is left as written.
    expect(await mdxToMarkdown(mdx, resolvers)).toBe(mdx)
  })

  it("leaves blank lines inside code exactly as they are", async () => {
    const code = "```ts\nconst a = 1\n\n\n\nconst b = 2\n```\n"
    expect(await mdxToMarkdown(code, resolvers)).toBe(code)
  })

  it("drops unknown component wrapper tags and keeps their children", async () => {
    const md = await mdxToMarkdown(
      "<Gallery cols={2}>\n\nText inside.\n\n</Gallery>\n",
      resolvers
    )
    expect(md).toBe("Text inside.\n")
  })

  it("strips MDX comments", async () => {
    expect(await mdxToMarkdown("A {/* note */}\n\nB\n", resolvers)).toBe(
      "A \n\nB\n"
    )
  })
})

describe("renderPage", () => {
  it("opens with the title and description", async () => {
    const md = await renderPage(
      { title: "Confirm send", description: "Click, confirm.", mdx: "Body.\n" },
      resolvers
    )
    expect(md).toBe("# Confirm send\n\n> Click, confirm.\n\nBody.\n")
  })
})

describe("twinPath", () => {
  it("adds .md to a page URL", () => {
    expect(twinPath("/docs/components/status-notify")).toBe(
      "/docs/components/status-notify.md"
    )
    expect(twinPath("/docs")).toBe("/docs.md")
    expect(twinPath("/docs/components/")).toBe("/docs/components.md")
  })
})

describe("every docs page", () => {
  const docsRoot = path.resolve(import.meta.dirname, "../content/docs")
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(dir, entry.name))
        : entry.name.endsWith(".mdx")
          ? [path.join(dir, entry.name)]
          : []
    )

  it.each(files(docsRoot).map((file) => path.relative(docsRoot, file)))(
    "%s converts to plain markdown",
    async (relative) => {
      const md = await mdxToMarkdown(
        readFileSync(path.join(docsRoot, relative), "utf8"),
        {
          readSource: async () => "// source\n",
          readDemo: async () => "// demo\n",
        }
      )

      // A tag here is a component the converter does not know about yet:
      // teach it in lib/mdx-to-markdown.ts.
      expect(findLeftoverJsx(md)).toEqual([])
      expect(md.trim().length).toBeGreaterThan(0)
    }
  )
})
