import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// skills/crisp-ui/SKILL.md and public/agents-snippet.md are generated from
// registry-crisp.template.json by scripts/build-agent-files.mjs. These tests
// fail when the committed files list an item the template does not have, miss
// one it does have, or fall out of date for any other reason.

const appRoot = path.resolve(import.meta.dirname, "..")
const repoRoot = path.resolve(appRoot, "../..")
const read = (...parts: string[]) => readFileSync(path.join(...parts), "utf8")

const template = JSON.parse(read(appRoot, "registry-crisp.template.json")) as {
  items: { name: string }[]
}
const templateNames = template.items.map((i) => i.name)
const skill = read(repoRoot, "skills/crisp-ui/SKILL.md")
const snippet = read(appRoot, "public/agents-snippet.md")

// Names in the first column of the skill's "## Items" table.
function skillItemNames(text: string) {
  const section = text.split(/^## Items$/m)[1]?.split(/^## /m)[0] ?? ""
  return [...section.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((m) => m[1])
}

function compare(listed: string[], declared: string[]) {
  return {
    notInTemplate: listed.filter((n) => !declared.includes(n)),
    notInSkill: declared.filter((n) => !listed.includes(n)),
  }
}

describe("generated skill vs template", () => {
  it("lists exactly the items in the template", () => {
    expect(compare(skillItemNames(skill), templateNames)).toEqual({
      notInTemplate: [],
      notInSkill: [],
    })
  })

  it("detects an item that is not in the template, and the reverse", () => {
    const extra = skill.replace(
      "| `status-strip` |",
      "| `ghost-item` | see | x | x | x |\n| `status-strip` |"
    )
    expect(compare(skillItemNames(extra), templateNames).notInTemplate).toEqual(
      ["ghost-item"]
    )
    const fewer = skillItemNames(skill).slice(1)
    expect(compare(fewer, templateNames).notInSkill).toHaveLength(1)
  })

  it("only reads rows from the Items table", () => {
    expect(
      skillItemNames("## Items\n\n| `a` | x |\n\n## Rules\n| `b` | x |")
    ).toEqual(["a"])
  })

  it("is not stale: regenerating from the template changes nothing", () => {
    // `--check` exits 1 and names the stale files when they differ.
    expect(() =>
      execFileSync(
        "node",
        [path.join(appRoot, "scripts/build-agent-files.mjs"), "--check"],
        { stdio: "pipe" }
      )
    ).not.toThrow()
  })
})

describe("skill format (agentskills.io specification)", () => {
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? ""

  it("has a name equal to its directory", () => {
    expect(frontmatter).toMatch(/^name: crisp-ui$/m)
    expect("crisp-ui").toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect("crisp-ui".length).toBeLessThanOrEqual(64)
  })

  it("has a description under 1,024 characters that says what and when", () => {
    const raw = frontmatter.match(/^description: (.*)$/m)?.[1] ?? ""
    const description = JSON.parse(raw) as string
    expect(description.length).toBeGreaterThan(0)
    expect(description.length).toBeLessThan(1024)
    expect(description).toMatch(/Use when/)
  })

  it("stays under 500 lines and points at llms.txt", () => {
    expect(skill.split("\n").length).toBeLessThan(500)
    expect(skill).toContain("https://regularui.com/llms.txt")
  })

  it("carries the rules an agent must follow", () => {
    expect(skill).toMatch(/Read the installed file before using it/)
    expect(skill).toMatch(/UI only/)
    expect(skill).toMatch(/Email-only contacts/)
    expect(skill).toMatch(/Never claim compliance/)
  })
})

describe("agents snippet", () => {
  it("is at most 40 lines and fenced for pasting", () => {
    expect(snippet.trimEnd().split("\n").length).toBeLessThanOrEqual(40)
    expect(snippet).toMatch(/^<!-- crisp-ui:start/)
    expect(snippet.trimEnd()).toMatch(/<!-- crisp-ui:end -->$/)
  })

  it("mentions every item in the template", () => {
    for (const name of templateNames) expect(snippet).toContain(`\`${name}\``)
  })
})

describe("template metadata", () => {
  const items = JSON.parse(read(appRoot, "registry-crisp.template.json"))
    .items as {
    name: string
    categories?: string[]
    docs?: string
    meta?: { stage?: string; recipe?: string }
  }[]

  it.each(items.map((i) => [i.name, i] as const))(
    "%s is self-describing",
    (name, item) => {
      expect(item.categories?.length).toBeGreaterThan(0)
      expect(["see", "decide", "act", "confirm", "record"]).toContain(
        item.meta?.stage
      )
      // Usually the item's own page; a helper library may point at the page
      // of the item it belongs to. Either way the page must exist.
      const page = item.meta?.recipe?.match(
        /^__REGISTRY_ORIGIN__\/docs\/components\/([a-z-]+)\.md$/
      )?.[1]
      expect(page, `${name}: meta.recipe`).toBeTruthy()
      expect(
        existsSync(path.join(appRoot, `content/docs/components/${page}.mdx`)),
        `${name}: no docs page ${page}.mdx`
      ).toBe(true)
      const lines = (item.docs ?? "").split("\n").filter(Boolean)
      expect(lines.length).toBeGreaterThanOrEqual(3)
      expect(lines.length).toBeLessThanOrEqual(8)
      expect(item.docs).toMatch(/Read the installed file before using it/)
      expect(item.docs).toContain(item.meta?.recipe)
      expect(item.docs).toMatch(/run your typechecker/)
    }
  )
})
