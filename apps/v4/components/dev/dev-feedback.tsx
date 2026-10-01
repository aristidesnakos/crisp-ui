"use client"

// Dev-only visual feedback capture, ported from swimmingrhodes-gr. Right-click
// any wrapped section to leave a note; a screenshot of that element is attached.
// Entries land in `.claude/dev-feedback.json` for the `iterate` skill
// (.claude/skills/iterate/SKILL.md). Outside development this renders its
// children with no wrapper and the capture code is dropped from the bundle.
import * as React from "react"
import { createPortal } from "react-dom"

const isDev = process.env.NODE_ENV !== "production"

type Point = { x: number; y: number } | null
type SaveState = "idle" | "capturing" | "saving" | "saved" | "error"

const MENU_WIDTH = 190
const COMPOSER_WIDTH = 336

function DevFeedbackInner({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const composerRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [menu, setMenu] = React.useState<Point>(null)
  const [composer, setComposer] = React.useState<Point>(null)
  const [comment, setComment] = React.useState("")
  const [saveState, setSaveState] = React.useState<SaveState>("idle")

  const closeAll = React.useCallback(() => {
    setMenu(null)
    setComposer(null)
    setComment("")
    setSaveState("idle")
  }, [])

  const onContextMenu = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    // The innermost wrapper wins, so nested names stay specific.
    e.stopPropagation()
    setMenu({
      x: Math.min(e.clientX, window.innerWidth - MENU_WIDTH),
      y: Math.min(e.clientY, window.innerHeight - 70),
    })
  }, [])

  React.useEffect(() => {
    if (!menu && !composer) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll()
    }
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target)) return
      if (composerRef.current?.contains(target)) return
      closeAll()
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("mousedown", onPointerDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("mousedown", onPointerDown)
    }
  }, [menu, composer, closeAll])

  React.useEffect(() => {
    if (composer) textareaRef.current?.focus()
  }, [composer])

  const submit = React.useCallback(async () => {
    const trimmed = comment.trim()
    if (!trimmed || !wrapperRef.current) return

    setSaveState("capturing")
    let screenshot: string | undefined
    try {
      const { toPng } = await import("html-to-image")
      // The wrapper is `display: contents`, so it has no box. Capture its one
      // rendered child instead, or the capture would measure 0x0.
      const { children: kids } = wrapperRef.current
      const target =
        kids.length === 1 ? (kids[0] as HTMLElement) : wrapperRef.current
      screenshot = await toPng(target, {
        pixelRatio: 1.5,
        cacheBust: true,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
      })
    } catch (error) {
      console.warn(
        "[dev-feedback] screenshot failed, saving without one",
        error
      )
    }

    setSaveState("saving")
    try {
      const res = await fetch("/api/dev-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, comment: trimmed, screenshot }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setSaveState("saved")
      setTimeout(closeAll, 900)
    } catch (error) {
      console.error("[dev-feedback] failed to save", error)
      setSaveState("error")
    }
  }, [comment, name, closeAll])

  const busy = saveState === "capturing" || saveState === "saving"

  return (
    <div
      ref={wrapperRef}
      onContextMenu={onContextMenu}
      style={{ display: "contents" }}
    >
      {children}
      {menu &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Dev feedback"
            className="fixed z-[9999] rounded-md border bg-popover py-1 text-sm text-popover-foreground shadow-lg"
            style={{ top: menu.y, left: menu.x, minWidth: MENU_WIDTH - 10 }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setComposer(menu)
                setMenu(null)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent"
            >
              Dev feedback…
            </button>
            <div className="border-t px-3 py-1 text-xs text-muted-foreground">
              {name}
            </div>
          </div>,
          document.body
        )}
      {composer &&
        createPortal(
          <div
            ref={composerRef}
            role="dialog"
            aria-label={`Dev feedback for ${name}`}
            className="fixed z-[9999] w-80 rounded-lg border bg-popover p-3 text-popover-foreground shadow-xl"
            style={{
              top: Math.min(composer.y, window.innerHeight - 220),
              left: Math.min(composer.x, window.innerWidth - COMPOSER_WIDTH),
            }}
          >
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Dev feedback · <span className="text-foreground">{name}</span>
            </div>
            <textarea
              ref={textareaRef}
              aria-label="What needs to change?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="What needs to change?"
              rows={4}
              disabled={busy}
              className="w-full resize-none rounded border bg-background p-2 text-sm outline-none focus:border-ring"
            />
            <div className="mt-2 flex items-center justify-between">
              <span role="status" className="text-xs text-muted-foreground">
                {saveState === "capturing" && "Capturing screenshot…"}
                {saveState === "saving" && "Saving…"}
                {saveState === "saved" && "Saved"}
                {saveState === "error" && "Failed to save"}
                {saveState === "idle" && "⌘⏎ to save"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeAll}
                  className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!comment.trim() || busy}
                  className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

/**
 * Wrap a section so it can be right-clicked for feedback. Name it after what
 * the section is and where it lives, e.g. "Docs.status-notify.Preview", so the
 * `iterate` skill can map an entry to a file. In production it renders only
 * its children.
 */
export function DevFeedback({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  if (!isDev) return <>{children}</>
  return <DevFeedbackInner name={name}>{children}</DevFeedbackInner>
}
