// Grades one eval run with checks the harness runs itself, so the agent's own
// "all green" is never the evidence.
//
//   node scripts/eval/grade.mjs <projectDir> <baseDir> <transcript.jsonl> <promptFile>
//
// Prints one JSON object. Mechanical checks only: typecheck, lint, dependencies
// added, installed files present and read before the agent wrote its own code,
// plus cost and turns. Behaviour checks (keyboard, names, states) are done by
// hand in a browser and recorded in the results file.
import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

const [project, base, transcript, promptFile] = process.argv.slice(2)
const origin = process.env.EVAL_ORIGIN ?? "http://localhost:4000"
const registryDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../apps/v4/public/r"
)

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: project, encoding: "utf8" })
  return {
    ok: r.status === 0,
    tail: (r.stdout + r.stderr).trim().split("\n").slice(-6).join("\n"),
  }
}

const pkg = (dir) => {
  const j = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"))
  return { ...j.dependencies, ...j.devDependencies }
}
const before = pkg(base)
const after = pkg(project)
const addedDeps = Object.keys(after).filter((d) => !(d in before))

// Registry items the prompt tells the agent to install, and the files they own.
const prompt = readFileSync(promptFile, "utf8")
const items = [
  ...new Set(
    [...prompt.matchAll(new RegExp(`${origin}/r/([a-z-]+)\\.json`, "g"))].map(
      (m) => m[1]
    )
  ),
]
const installed = []
for (const name of items) {
  const f = path.join(registryDir, `${name}.json`)
  if (!existsSync(f)) continue
  for (const file of JSON.parse(readFileSync(f, "utf8")).files ?? []) {
    installed.push({ item: name, file: path.basename(file.path) })
  }
}

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(e)) continue
    const p = path.join(dir, e)
    statSync(p).isDirectory() ? walk(p, out) : out.push(p)
  }
  return out
}
const projectFiles = walk(project).map((p) => path.relative(project, p))
const missing = installed.filter(
  (i) => !projectFiles.some((p) => path.basename(p) === i.file)
)

// Transcript: order of Reads and writes, and the final result event.
const events = readFileSync(transcript, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => {
    try {
      return JSON.parse(l)
    } catch {
      return null
    }
  })
  .filter(Boolean)
const tools = []
let result = null
for (const e of events) {
  if (e.type === "result") result = e
  for (const c of e.message?.content ?? []) {
    if (c.type === "tool_use") tools.push({ name: c.name, input: c.input ?? {} })
  }
}
const target = (t) => t.input.file_path ?? t.input.path ?? ""
const isWrite = (t) => ["Write", "Edit", "MultiEdit"].includes(t.name)
const installedNames = new Set(installed.map((i) => i.file))
const firstOwnWrite = tools.findIndex(
  (t) => isWrite(t) && !installedNames.has(path.basename(target(t)))
)
const readBefore = (name) =>
  tools
    .slice(0, firstOwnWrite < 0 ? tools.length : firstOwnWrite)
    .some(
      (t) =>
        (t.name === "Read" && path.basename(target(t)) === name) ||
        (t.name === "Bash" && String(t.input.command ?? "").includes(name))
    )
const unread = installed.filter((i) => !readBefore(i.file)).map((i) => i.file)

const tsc = run("npx", ["tsc", "--noEmit"])
const lint = run("npx", ["eslint", "."])

console.log(
  JSON.stringify(
    {
      typecheck: tsc.ok,
      lint: lint.ok,
      addedDeps,
      installedMissing: missing.map((m) => m.file),
      installedUnreadBeforeOwnCode: unread,
      installedCount: installed.length,
      turns: result?.num_turns ?? null,
      costUsd: result?.total_cost_usd ?? null,
      durationMin: result
        ? Math.round((result.duration_ms / 60000) * 10) / 10
        : null,
      agentFinished: result ? !result.is_error : false,
      resultSubtype: result?.subtype ?? "no result event",
      tscTail: tsc.ok ? "" : tsc.tail,
      lintTail: lint.ok ? "" : lint.tail,
    },
    null,
    2
  )
)
