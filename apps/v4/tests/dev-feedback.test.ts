import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "../app/api/dev-feedback/route"
import { saveFeedback } from "../lib/dev-feedback"

// 1x1 transparent PNG.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "crisp-feedback-"))
  vi.stubEnv("CRISP_FEEDBACK_DIR", dir)
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await rm(dir, { recursive: true, force: true })
})

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost:4000/api/dev-feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host: "localhost:4000",
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  )
}

describe("saveFeedback", () => {
  it("appends entries in order, even when submitted at once", async () => {
    await Promise.all(
      ["one", "two", "three"].map((comment) =>
        saveFeedback({ viewName: "Docs.x.Body", comment })
      )
    )
    const entries = JSON.parse(
      await readFile(path.join(dir, "dev-feedback.json"), "utf8")
    )
    expect(entries.map((e: { comment: string }) => e.comment)).toEqual([
      "one",
      "two",
      "three",
    ])
    expect(
      entries.every((e: { resolved: boolean }) => e.resolved === false)
    ).toBe(true)
  })

  it("stores a PNG screenshot and links it", async () => {
    const entry = await saveFeedback({
      viewName: "Preview.status-notify-demo",
      comment: "spacing",
      screenshotDataUrl: PNG,
    })
    expect(entry.screenshotFile).toMatch(
      /^\.claude\/dev-feedback\/shot-.*\.png$/
    )
    expect(await readdir(path.join(dir, "dev-feedback"))).toHaveLength(1)
  })

  it("ignores a screenshot that is not a PNG data URL", async () => {
    const entry = await saveFeedback({
      viewName: "x",
      comment: "y",
      screenshotDataUrl: "data:text/html;base64,PHNjcmlwdD4=",
    })
    expect(entry.screenshotFile).toBeUndefined()
  })
})

describe("POST /api/dev-feedback", () => {
  it("saves a valid note", async () => {
    const res = await post({ name: "Landing.Hero", comment: "  bigger  " })
    expect(res.status).toBe(200)
    const entries = JSON.parse(
      await readFile(path.join(dir, "dev-feedback.json"), "utf8")
    )
    expect(entries[0]).toMatchObject({
      viewName: "Landing.Hero",
      comment: "bigger",
    })
  })

  it("is disabled in production and writes nothing", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = await post({ name: "Landing.Hero", comment: "x" })
    expect(res.status).toBe(404)
    await expect(
      readFile(path.join(dir, "dev-feedback.json"), "utf8")
    ).rejects.toThrow()
  })

  it("rejects a cross-origin request", async () => {
    const res = await post(
      { name: "a", comment: "b" },
      { origin: "https://evil.example" }
    )
    expect(res.status).toBe(403)
  })

  it("rejects bad json, missing fields and oversized notes", async () => {
    expect((await post("{nope")).status).toBe(400)
    expect((await post({ name: "a" })).status).toBe(400)
    expect((await post({ name: "a", comment: "x".repeat(5001) })).status).toBe(
      413
    )
  })
})
