---
name: iterate
description: Read open dev feedback from .claude/dev-feedback.json, fix each item in the docs site or registry code, and mark entries resolved. Use when the user says "address my feedback", "check the feedback log", or after a local review session.
argument-hint: [optional filter, e.g. a section name]
---

# Address dev feedback

Run `pnpm --filter=v4 dev`, right-click any section of the site, choose "Dev feedback…" and type a note. A screenshot of that element is attached. Notes land in `.claude/dev-feedback.json` at the repo root, which is git-ignored. This skill turns them into code changes. The capture only exists in development: a production build renders no wrapper and the route returns 404.

## Process

### 1. Read the log

Read `.claude/dev-feedback.json`. Each entry:

```json
{
  "comment": "The install tab is too tall on mobile",
  "id": "…",
  "resolved": false,
  "screenshotFile": ".claude/dev-feedback/shot-….png",
  "timestamp": "2026-10-01T14:32:00.000Z",
  "viewName": "Docs.status-notify.Body"
}
```

When `screenshotFile` is set, read the image first. It is a capture of that exact element when the note was made. Act only on entries with `"resolved": false`. If the file is missing or has no open entries, say so and remind the user it only runs under `pnpm --filter=v4 dev`. If an argument was passed, act only on entries whose `viewName` or `comment` matches it.

### 2. Map each viewName to files

Names follow the section that was wrapped:

| viewName | Where it lives |
| --- | --- |
| `Docs.<slug>.Header` | page title block in `apps/v4/app/(app)/docs/[[...slug]]/page.tsx`, text from `apps/v4/content/docs/<slug>.mdx` |
| `Docs.<slug>.Body` | `apps/v4/content/docs/<slug>.mdx` (for example `components/status-notify`) |
| `Preview.<demo-name>` | the demo `apps/v4/examples/radix/<demo-name>.tsx`, which renders the component in `apps/v4/registry/crisp/` |
| `Landing.<Section>` (Hero, Demo, WhyNow, HowItWorks, Moments, Audit, Tools, Agents, Pricing, FinalCta) | `apps/v4/app/(app)/(root)/page.tsx`; the demo is `apps/v4/components/marketing/training-tracker-demo.tsx` with data in `tracker-data.ts`; tool cards and moments copy in `apps/v4/lib/tools.ts` |
| `Tools.<Section>` | `apps/v4/app/(app)/tools/page.tsx`, cards from `apps/v4/lib/tools.ts` |
| `Tool.TrainingTracker.<Section>` | `apps/v4/app/(app)/tools/training-tracker/page.tsx`; `MakeItYours` is `apps/v4/components/marketing/make-it-yours.tsx` |
| `Pricing.<Section>` | `apps/v4/app/(app)/pricing/page.tsx` |
| `Footer` | `apps/v4/components/site-footer.tsx` |

Confirm a wrapper exists with `grep -rn 'DevFeedback' apps/v4/app apps/v4/components`. A note on a `Preview.*` is usually about the component itself, so edit `registry/crisp/` and then check the docs props table and demo still match.

### 3. Fix, grouped by file

Edit each file once. Treat comments as design intent, not literal instructions. If a comment is ambiguous or implies a large behaviour change, list it for the user instead of guessing. Keep to the repo rules: registry items stay UI only and email-only for contacts, and the docs never claim compliance.

### 4. Check, then mark resolved

Run `pnpm --filter=v4 typecheck`, `pnpm --filter=v4 lint` and `pnpm --filter=v4 test` after code changes. For a visual change, look at it in the running dev server rather than assuming. Then set `"resolved": true` on each entry you addressed, edit the JSON directly, and delete its screenshot file. Leave skipped entries unresolved and say why.

### 5. Summarize

For each entry: the comment, the files changed, what was done. List skipped entries with reasons.

## Adding capture to more sections

Wrap any server or client component in `<DevFeedback name="Area.Section">` from `apps/v4/components/dev/dev-feedback.tsx`. Name it after where it lives so this skill can map it back to a file. It renders only its children outside development.
