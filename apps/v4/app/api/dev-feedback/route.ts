import { NextResponse } from "next/server"

import {
  MAX_COMMENT,
  MAX_NAME,
  MAX_SCREENSHOT_CHARS,
  saveFeedback,
} from "@/lib/dev-feedback"

export const runtime = "nodejs"

// Dev-only capture endpoint for components/dev/dev-feedback.tsx. It writes to
// the local filesystem, so it answers 404 in a production build. NODE_ENV is
// read per request so the gate cannot be captured at import time.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "disabled_in_production" },
      { status: 404 }
    )
  }

  // Refuse writes triggered by another site's page while the dev server is up.
  const origin = req.headers.get("origin")
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return NextResponse.json({ error: "cross_origin" }, { status: 403 })
  }

  let body: { name?: unknown; comment?: unknown; screenshot?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const viewName = typeof body.name === "string" ? body.name.trim() : ""
  const comment = typeof body.comment === "string" ? body.comment.trim() : ""
  const screenshot =
    typeof body.screenshot === "string" ? body.screenshot : undefined

  if (!viewName || !comment) {
    return NextResponse.json(
      { error: "missing_name_or_comment" },
      { status: 400 }
    )
  }
  if (
    viewName.length > MAX_NAME ||
    comment.length > MAX_COMMENT ||
    (screenshot && screenshot.length > MAX_SCREENSHOT_CHARS)
  ) {
    return NextResponse.json({ error: "too_large" }, { status: 413 })
  }

  const entry = await saveFeedback({
    viewName,
    comment,
    screenshotDataUrl: screenshot,
  })
  return NextResponse.json({ ok: true, id: entry.id })
}
