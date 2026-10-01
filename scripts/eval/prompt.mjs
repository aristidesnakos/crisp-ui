// Prints the prompt a person would paste into an agent for one docs page, with
// one sector's example data appended (the same text the Copy prompt bar builds).
//
//   node --experimental-strip-types scripts/eval/prompt.mjs <slug> [sector]
//
// <slug> is a pattern (data-table) or "build-the-arc". EVAL_ORIGIN, when set,
// replaces https://regularui.com so the install commands hit a local registry.
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { getSectorExamples, SECTORS } from "../../apps/v4/lib/pattern-sections.ts"
import { buildPrompt } from "../../apps/v4/lib/prompt-links.ts"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const [slug, sector = "manufacturing"] = process.argv.slice(2)
if (!slug || !SECTORS.includes(sector)) {
  console.error(`usage: prompt.mjs <slug> [${SECTORS.join("|")}]`)
  process.exit(2)
}

const file =
  slug === "build-the-arc"
    ? "apps/v4/content/docs/build-the-arc.mdx"
    : `apps/v4/content/docs/components/${slug}.mdx`
const mdx = readFileSync(path.join(root, file), "utf8")

// The first ```text block under the page's prompt heading.
const heading = slug === "build-the-arc" ? "## The prompt" : "## Agent prompt"
const from = mdx.indexOf(`\n${heading}\n`)
const open = mdx.indexOf("```text\n", from)
const close = mdx.indexOf("\n```", open + 8)
if (from < 0 || open < 0 || close < 0) {
  console.error(`no prompt block under "${heading}" in ${file}`)
  process.exit(1)
}
const base = mdx.slice(open + 8, close)

// build-the-arc has no sector section: its prompt carries its own sector lines.
const examples = slug === "build-the-arc" ? {} : getSectorExamples(mdx)
let prompt = buildPrompt(base, slug === "build-the-arc" ? null : sector, examples)
if (process.env.EVAL_ORIGIN) {
  prompt = prompt.replaceAll("https://regularui.com", process.env.EVAL_ORIGIN)
}
process.stdout.write(prompt + "\n")
