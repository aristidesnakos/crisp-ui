# crisp-ui for AI-assisted internal-tool builders: plan

Status: **proposal, nothing built.** Written 2026-10-01 from three cited research files in [`docs/research/`](research/). Every number below is traceable to those files; anything the research could not verify is marked **UNVERIFIED** and is not relied on.

## 1. The goal in one sentence

Someone who builds internal tools with an AI coding agent (education, manufacturing, engineering, health) can paste one prompt from crisp-ui, and the agent installs the right patterns, wires them to the builder's own data, and finishes with checks that pass, without a human fixing props, imports or missing states.

## 2. Corrections to what we thought we knew

| Belief at handoff | What the code and research show |
| --- | --- |
| "No per-page markdown" | It exists. `next.config.mjs` rewrites `/docs/<path>.md` to the inherited `app/(app)/llm/[[...slug]]/route.ts`, which inlines demo source. **Its served output has not been run**; first task checks it. |
| "Registry can be installed from GitHub" (floated in research) | Not today. There is no root `registry.json`; the source is `apps/v4/registry-crisp.template.json`. Do not advertise `owner/repo/item` until one exists. |
| Install snippets work | They show `<your-domain>`, so an agent cannot copy a working command. The domain (or an interim hosted URL) blocks agent-readiness, not just deploy. |
| Roster is generic | `recipient-roster` and `status-notify` are **email-only** (`emails: string[]`, `validateEmail`). Attendance texts and appointment reminders (education and health) need phone numbers. |

## 3. Who it is for (personas)

Composites built from job descriptions in the research, not interview subjects. Prompts are written as a non-specialist would, which is why the patterns must carry compliance defaults themselves.

1. **Maya, school operations lead (education).** "Build me a dashboard from our attendance export that shows how many students are absent today, lets me pick which families to text, and sends them a message."
2. **Dev, plant quality/MES engineer (manufacturing).** "Make a shift handover page for line 3 with open downtime events and work orders, a sign-off for the incoming supervisor, and email alerts when a gauge calibration is overdue."
3. **Sam, project engineer at a small firm (engineering).** "Create an engineering change request tool where I list affected drawings, route it to quality and manufacturing for approval, and notify everyone once it is approved."
4. **Priya, clinic operations manager (health).** "Build an internal page that texts patients appointment reminders and also shows which staff licences expire in the next 60 days with a reminder to each person."
5. **Jordan, solo builder with an agent (any sector).** "Take this CSV of people and statuses and build a status page with a progress bar, a send-reminder button, and a list where each person can have email or SMS turned on or off."

Design rule that follows: **patterns stay generic; sectors appear as example data and wording, not as sector-specific components.**

## 4. The story that orders the components

Proposed spine (my synthesis from GOV.UK, Primer, Carbon, Linear, Stripe and PagerDuty precedents; **not an established convention**): **See → Decide → Act → Confirm → Record**, loop closing back to See. Verb-first names follow GOV.UK's task-name rule. Operations vocabulary (Monitor, Triage, Notify, Approve, Audit) can appear as sector sub-labels.

| Stage | User question | Today | Missing, by demand in 24 coded workflows |
| --- | --- | --- | --- |
| **See** | What is happening? | `status-strip` | **data table with saved filters and selection (20/24)**, expiry badge (7/24) |
| **Decide** | What needs me, and who hears? | `recipient-roster` | alert rules: reminder cadence, escalation, quiet hours (12/24; 15 with expiry) |
| **Act** | Do it safely | `confirm-send`, `save-bar` | **approval / sign-off with reason and meaning (9/24, none in education)**, role gate (8/24) |
| **Confirm** | Did it work, who knows? | `notify-envelope` (lib); `status-notify` spans See to Confirm | per-recipient delivery log (3/24) |
| **Record** | Can I prove who did what? | nothing | **audit-log timeline (14/24)** |

Reading the matrix: the four covered behaviours appear in 20 of 24 workflows, but 22 of 24 also need a table, an audit trail or an approval. So `status-notify` is not niche, and it is almost never enough alone. The Record stage is empty today and has the densest compliance cues (FERPA 99.32, HIPAA audit controls, 21 CFR Part 11, ISO 9001 7.5.3, OWASP A09), so it is the biggest hole in the story.

Caveat on the counts: they are the research agent's own coding of vendor, blog and secondary pages. Education and engineering rest mostly on search summaries. Read them as directional, and small counts (acknowledgement 2, bulk bar 1, handoff 1, CSV 2) as "not shown", not "not needed".

**Recommended new patterns, in order** (each its own branch, only after approval): `data-table` (exception list with selection feeding `confirm-send`), `audit-timeline`, `alert-rules` (cadence, escalation, quiet hours 9pm to 8am per the IES attendance-texting toolkit), `approval-step`. Small parts such as `expiry-badge` and a contact-agnostic roster ride along where a pattern needs them.

**Built-in defaults every notify recipe should state**, each traceable in `research-sectors.md`: confirm with recipient count; generic or first-name-only message preview; quiet-hours guard; per-recipient opt-out state; no sensitive details in message bodies; an audit entry on every send.

**Scope honesty on the site:** crisp-ui is UI only. Access control, encryption, retention and consent logic belong to the builder's backend, and the site must say crisp-ui does not make anything compliant. This is backed by the verified failure modes of AI-built tools (CVE-2025-48757 missing row-level security, Escape.tech's scan of about 5,600 vibe-coded apps, Veracode's 45% failing security tests, Retool surveys). Not verified: that agents over-notify or skip bulk-send confirmation; do not claim it.

## 5. What an agent sees: the agent-facing UX

### 5.1 Per-pattern recipe (single source of truth)

One markdown file per pattern, `recipes/<slug>.md`, rendered into the docs page, the copy-prompt, the `.md` twin and (later) a skill. Frontmatter carries `stage`, `comes_after`, `leads_to`, install command, registry dependencies, and requirements (Tailwind v4, React 19, new-york style, client component). Body sections, in order: intent; when and when not; install; props contract (TypeScript copied from source); state machine; handler contract; wiring map; failure states; a11y; do and don't; example data for three sectors; acceptance checks; test checklist; next in the story. Where a section can be derived from source (props), derive it rather than hand-write it. This overlaps the older `docs-derive` roadmap item and should absorb it.

### 5.2 The copy prompt

A "Copy prompt" button per pattern, plus a sector selector that swaps example data and the "who decides what" sentence. The prompt is a short spine (aim at 3,000 characters or fewer): goal and user; the exact install command and "read the installed files first"; the props and handler contract; wiring; constraints and out-of-scope; states to cover; acceptance checks; a verify command and "show the output"; one anti-overengineering and anti-hallucination clause; sector example data. It links to the recipe URL for depth rather than pasting it. The "give the agent a check it can run" rule ranked first across Anthropic, Cursor and Codex guidance.

Hand-off buttons only for **verified** targets: Claude Code `claude-cli://open?q=` (5,000-char cap, prefill only), Claude Desktop `claude://claude.ai/new?q=`, Cursor `cursor.com/link/prompt?text=` (10,000-char URL cap), Codex `codex://new?prompt=`, Lovable `lovable.dev/#prompt=` (hash form; the old `autosubmit` is ignored). **Not shipped until verified:** claude.ai https links, Bolt, ChatGPT, any v0 text link. "Open in v0" only for items that survive its limits (public registry, no `cssVars`, `css` or `envVars`).

### 5.3 The whole-arc prompt

One meta-prompt that installs the smallest pattern from each stage and wires them into a single workflow screen against an example dataset. This is the most valuable single artifact, and it needs shared types across stages (an `Item`, an `Action`, an `AuditEvent`), which the recipes must define before the new patterns are built.

### 5.4 Discoverability checklist

Ranked by agent value over effort, from `research-ai-readability.md`.

- [ ] Registry items self-describing: precise `description`, `categories`, `meta` (stage, recipe URL), a 3 to 8 line `docs` pointer, correct dependencies, real `homepage` (currently `http://localhost:4000`). **S**
- [ ] `/llms.txt` via the installed Fumadocs `llms().index()` with an agent preamble (install, `/r/*.json`, `.md` pages). **S.** Evidence that crawlers read it is weak and Google says it ignores it, so this is cheap insurance, not a growth lever. Every peer checked (Vercel, Stripe, Anthropic, Cloudflare, Next.js, Supabase, shadcn) publishes one.
- [ ] Clean `.md` twin per page: verify the inherited route's real output, strip leftover MDX tags, put install and props in plain markdown. **S/M**
- [ ] `Accept: text/markdown` negotiation (installed `fumadocs-core/negotiation`) and `<link rel="alternate" type="text/markdown">`. All six non-shadcn peers checked negotiate; shadcn does not. **S/M**
- [ ] Skill (`skills/crisp-ui/SKILL.md`, under 500 lines, one reference per recipe, generated from the recipes) plus a short AGENTS.md snippet on a "Use with AI agents" page. Skill discovery layout is **UNVERIFIED**, so check before documenting. **S**
- [ ] Page actions (installed `MarkdownCopyButton`, `ViewOptionsPopover`) for people pasting into a chat. **S**
- [ ] JSON-LD `TechArticle` plus `BreadcrumbList`. Peers ship it; no evidence LLM crawlers use it. Optional. **S**
- [ ] robots: keep allow-all (already there). Optional Content-Signal line, **UNVERIFIED** that the Next metadata API can emit it.
- [ ] Defer: docs MCP endpoint (shadcn MCP already covers install flows), `.well-known` files, shadcn directory listing (unknown whether a registry under `/r/` is accepted).
- [ ] Root `registry.json` so `owner/repo/item` installs without hosting. Decide whether to add it; until then do not mention that path.

## 6. End state (what "done" means)

1. **Findable:** an agent given only the site root can reach `/llms.txt`, find every pattern, fetch its recipe as markdown, and read the registry JSON, all at absolute working URLs.
2. **Installable:** every item installs with the documented command into a fresh Next.js plus shadcn project, and `shadcn view` shows accurate metadata. Already partly guarded by the CI install smoke test.
3. **One-shottable:** for each pattern and for the whole-arc prompt, a pasted prompt in a fresh repo produces a build that passes the recipe's acceptance checks. **Target to agree on:** at least 4 of 5 runs per prompt on Claude Code, and at least 3 of 5 on one non-Claude agent (Cursor or v0 or Lovable). Numbers are a proposal, not research.
4. **Coherent:** the site's navigation reads See, Decide, Act, Confirm, Record; every pattern states what comes before and after; each stage has at least one pattern, including Record.
5. **Honest:** every page states what crisp-ui does not do (backend enforcement, compliance), and only verified claims about other sites and regulations appear.

## 7. Roadmap: one branch, one PR per task

Order is chosen so cheap, unblocked agent plumbing lands first, and the recipe format is validated by an eval **before** it is multiplied across four new patterns.

| # | Branch | What | Acceptance test (automated unless noted) | Needs |
| --- | --- | --- | --- | --- |
| 0 | (no branch) | Merge PRs #3 to #5 | CI `check` green on main | Ari says "merge" |
| 1 | `crisp/deploy` | Host the site and registry at a stable origin | `curl <origin>/r/status-notify.json` returns 200 and its `registryDependencies` URLs resolve; no `localhost` string in any `public/r/*.json` | **Domain, or approval of an interim `*.vercel.app` URL** |
| 2 | `crisp/agent-surface` | `/llms.txt`, verify and clean `.md` twins, `Accept` negotiation, `rel=alternate`, copy-markdown action | `/llms.txt` lists every docs page; each `/docs/components/<x>.md` is `text/markdown`, contains the install command and props, and contains no `<ComponentPreview`; `Accept: text/markdown` on the HTML URL returns markdown | built and served locally, checked in the browser |
| 3 | `crisp/registry-metadata` | `categories`, `meta`, `docs` pointer, real `homepage`; AGENTS.md snippet and skill | extend the smoke test: `shadcn add <url> --dry-run` and `shadcn view` pass for every item; metadata present on all items | none |
| 4 | `crisp/recipes` | Recipe format, one recipe each for the five existing items, build script to render the docs from them (absorbs `docs-derive`) | recipe frontmatter validates; props block matches exported TypeScript types (test fails on drift); docs page builds from the recipe | design sign-off on the format |
| 5 | `crisp/copy-prompt` | Copy-prompt button, sector selector, verified deeplinks | prompt under 3,000 characters for every pattern and sector; deeplink URLs under their documented caps; keyboard-operable with an accessible name (browser check) | none |
| 6 | `crisp/evals-v1` | Minimal eval harness and written protocol: fresh repo, paste prompt, run acceptance checks, record pass rate, on the five existing patterns | a results file per agent, committed; failures turned into recipe edits | Ari runs or approves non-Claude agent runs |
| 7 | `crisp/story-ia` | Arc landing page, stage-grouped nav, comes-after and leads-to links, A to Z index kept as secondary | every item has a `stage`; all story links resolve (test); nav order matches the arc; a11y re-check | decision on arc naming |
| 8 | `crisp/contact-agnostic-roster` | Roster and `status-notify` support phone numbers and a custom validator, not email only | existing vitest still green; new tests for non-email contacts; docs and recipe updated | decision on API shape |
| 9 to 12 | `crisp/data-table`, `crisp/audit-timeline`, `crisp/alert-rules`, `crisp/approval-step` | New patterns, each with recipe, docs page, tests, smoke-install entry, sector example data | per pattern: unit tests, install smoke test, a11y check, an eval run of its copy prompt | approval of each pattern before building |
| 13 | `crisp/whole-arc-prompt` | The meta-prompt plus shared `Item`, `Action`, `AuditEvent` types | eval: pasted into an empty project, produces a working See to Record screen that passes the acceptance checks | patterns 9 to 12 |
| 14 | `crisp/structured-data` | JSON-LD, optional robots Content-Signal, compatibility matrix on each page | rendered JSON-LD validates; no new claims | none (low value, last) |

Older roadmap items still open: `component-tests` (fold per-pattern tests into tasks 9 to 12), `deps-prune`, `ci-hardening` (add the markdown and registry checks from tasks 2 and 3 to CI). `brand-identity` stays with its own session.

## 8. Risks

- **The arc is my synthesis.** Present it as a recommended path with a flat index beside it, not as a standard.
- **Evals may show the recipe format does not help.** That is why task 6 comes before the new patterns.
- **Each new pattern widens scope**, and this Mac cannot run the upstream site. Keep the lean branch and the install smoke test (about 1 GB of temp space) as the gate.
- **Deeplink and paste limits vary and change**; only the verified ones are used, and the button falls back to copy.
- **Sector claims drift.** Compliance wording is a UI cue with a not-compliance disclaimer; HHS pages and NVD would not load during research, so HIPAA minimum-necessary content comes from the CFR text.

## 9. Decisions (Ari, 2026-10-01)

1. **Domain: regularui.com.** Used as the registry origin in docs and builds. Hosting and DNS are Ari's to set up; the product is still named crisp-ui in code and docs (see open questions).
2. **Arc approved:** See, Decide, Act, Confirm, Record.
3. **All four new patterns approved:** `data-table`, `audit-timeline`, `alert-rules`, `approval-step`.
4. **Roster stays email.** Task 8 (contact-agnostic roster) is dropped. Sector examples that need texting are out of scope for the roster; recipes must say so rather than imply SMS.
5. **Evals:** open. A second non-Claude agent target is only needed at task 6; not blocking.
6. **Dev feedback (new):** port the right-click feedback loop from `swimmingrhodes-gr` (`DevFeedback` wrapper, dev-only `/api/dev-feedback` route, `iterate` skill) so Ari can leave visual notes on the site while it runs locally. Added as task 0b below.
7. **Merge PRs #3 to #5:** still waiting on an explicit "merge".

### Roadmap changes from these decisions

- **Add** `crisp/dev-feedback` (task 0b, first): `<DevFeedback name="Docs.<slug>.<Section>">` around the docs page body, preview, install and props sections and the landing demo; `/api/dev-feedback` hard-gated to non-production; `.claude/skills/iterate/SKILL.md` adapted so `Docs.<slug>.*` names map to `content/docs/components/<slug>.mdx` and `registry/crisp/`. Acceptance: in a production build the route returns 404 and no wrapper element or feedback JS is rendered; in dev, a submitted note appears in `.claude/dev-feedback.json` with a screenshot; the log files are git-ignored.
- **Drop** task 8.
- **Task 1** uses `https://regularui.com` as `CRISP_REGISTRY_ORIGIN`; acceptance unchanged.
