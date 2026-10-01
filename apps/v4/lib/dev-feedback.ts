import { randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

// Storage for components/dev/dev-feedback.tsx. Entries go to
// `<workspace root>/.claude/dev-feedback.json` so a Claude Code session started
// at the repo root can read them (see .claude/skills/iterate/SKILL.md).

export type DevFeedbackEntry = {
  comment: string
  id: string
  resolved: boolean
  screenshotFile?: string
  timestamp: string
  viewName: string
}

export const MAX_NAME = 200
export const MAX_COMMENT = 5000
// A 1.5x capture of one element is far below this; it only stops a runaway body.
export const MAX_SCREENSHOT_CHARS = 12_000_000

// The workspace root is where pnpm-workspace.yaml lives; `next dev` runs from
// apps/v4, but the skill and the Claude session work from the root.
function workspaceRoot() {
  let dir = process.cwd()
  for (;;) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      return process.cwd()
    }
    dir = parent
  }
}

// CRISP_FEEDBACK_DIR exists so tests never write into the real repo.
function claudeDir() {
  return process.env.CRISP_FEEDBACK_DIR ?? path.join(workspaceRoot(), ".claude")
}

async function loadEntries(file: string): Promise<DevFeedbackEntry[]> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Two quick submissions would both read the file before either wrote it, and
// the second write would drop the first entry. Chain appends so they run in
// order.
let writeQueue: Promise<unknown> = Promise.resolve()

export function saveFeedback(input: {
  viewName: string
  comment: string
  screenshotDataUrl?: string
}): Promise<DevFeedbackEntry> {
  const task = writeQueue.then(async () => {
    const dir = claudeDir()
    const shotsDir = path.join(dir, "dev-feedback")
    const entriesFile = path.join(dir, "dev-feedback.json")
    await mkdir(shotsDir, { recursive: true })

    let screenshotFile: string | undefined
    const match = input.screenshotDataUrl?.match(
      /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/
    )
    if (match) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-")
      const filename = `shot-${stamp}-${randomUUID().slice(0, 8)}.png`
      const tmp = path.join(shotsDir, `${filename}.tmp`)
      await writeFile(tmp, Buffer.from(match[1], "base64"))
      await rename(tmp, path.join(shotsDir, filename))
      screenshotFile = `.claude/dev-feedback/${filename}`
    }

    const entry: DevFeedbackEntry = {
      comment: input.comment,
      id: randomUUID(),
      resolved: false,
      ...(screenshotFile ? { screenshotFile } : {}),
      timestamp: new Date().toISOString(),
      viewName: input.viewName,
    }
    const entries = await loadEntries(entriesFile)
    entries.push(entry)
    const tmp = `${entriesFile}.tmp`
    await writeFile(tmp, JSON.stringify(entries, null, 2) + "\n", "utf8")
    await rename(tmp, entriesFile)
    return entry
  })
  // One failed append must not wedge the queue for the next one.
  writeQueue = task.catch(() => {})
  return task
}
