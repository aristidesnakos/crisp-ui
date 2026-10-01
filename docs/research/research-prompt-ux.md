# Research: prompt UX and story-ordering for crisp-ui

Fetch date for every source below: 2026-10-01. Method: WebFetch/WebSearch only. Nothing installed, repo at /Users/ari/Documents/crisp-ui not touched.
Convention: "(F)" = page was fetched directly; "(S)" = only seen in a WebSearch result snippet (weaker); "UNVERIFIED" = not confirmed from an official page. All quotes paraphrased unless in quotation marks (max one short quote per source).

---

## 1. One-shot prompt checklist (cited)

Distilled from the vendors' own guidance. Each item lists who says it.

| # | Checklist item | Evidence |
|---|---|---|
| 1 | **Give the agent a check it can run** (tests, build exit code, typecheck, screenshot diff) and tell it to run it and iterate. Anthropic calls this the single biggest lever: without a check, "looks done" is the only stop signal. Ask for evidence (output, command + result), not assertions. | Claude Code best practices (F) https://code.claude.com/docs/en/best-practices ; Cursor agent best practices "verifiable goals" (F) https://cursor.com/blog/agent-best-practices ; Codex prompting lists "verification method" (F) https://learn.chatgpt.com/docs/prompting |
| 2 | **Explore, then plan, then implement.** Separate reading the codebase from writing. Skip planning only when the diff is describable in one sentence. | Claude Code best practices (F); Cursor Plan Mode (F) cursor.com/blog/agent-best-practices ; v0 text-prompting says plan first for complex apps (F) https://v0.app/docs/text-prompting |
| 3 | **Name files, existing patterns and constraints.** Point at a canonical example file to copy the pattern from; say "use only libraries already in the codebase". | Claude Code best practices "reference existing patterns" (F); Codex: point to files, state constraints such as not changing the API shape (F) |
| 4 | **Scope the task and state what is out of scope.** The most useful specs are self-contained, name files and interfaces, state out-of-scope, and end with an end-to-end verification step. | Claude Code best practices, "Let Claude interview you" section (F) |
| 5 | **Explain why a constraint exists**, not just "NEVER x". The model generalises from the reason. | Anthropic prompting best practices, "Add context" (F) https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices |
| 6 | **Sequential numbered steps** when order or completeness matters; be explicit about desired output. Golden rule: hand the prompt to a colleague with no context; if they would be confused, so will the model. | Anthropic prompting best practices, "Be clear and direct" (F) |
| 7 | **Examples: 3-5, relevant, diverse, wrapped in `<example>` tags**; XML-style tags separate instructions, context, examples, inputs. | Anthropic prompting best practices (F) |
| 8 | **Anti-overengineering clause.** Recent Claude models tend to add extra files, abstractions, defensive code. Say: only what is requested, no helpers for one-off ops, validate only at boundaries. | Anthropic prompting best practices, "Overeagerness" (F) |
| 9 | **Anti-test-gaming clause.** Ask for a general solution, not hard-coding to the tests; say "tell me if a test is wrong rather than working around it". | Anthropic prompting best practices (F) |
| 10 | **Ground before answering** ("read the file before making claims"; do not guess APIs). This is the anti-hallucination clause. | Anthropic prompting best practices, "Minimizing hallucinations in agentic coding" (F) |
| 11 | **Real content, not lorem ipsum; component-sized, not page-sized requests.** | Lovable prompting (F) https://docs.lovable.dev/prompting/prompting-one ; v0 text-prompting "component-first" (F) |
| 12 | **Product surface + context of use + constraints/taste.** v0's blog framing: list actual data, actions, sections (not "a dashboard"); say who uses it, when, to decide what; give platform, tone, layout, a11y constraints. A template exists: Build X, used by Y, in moment Z, to decide W, Constraints: ... | Vercel blog (F) https://vercel.com/blog/how-to-prompt-v0 |
| 13 | **End with "ask me clarifying questions"** (Lovable) or let the agent interview you and write a spec (Anthropic). Good for ambiguous user context; poor for a one-shot, so make it conditional ("only ask if X is missing"). | Lovable (F); Claude Code best practices (F) |
| 14 | **Keep persistent rules short and reference files instead of pasting them.** Cursor: rules under 500 lines, composable, point to canonical files. Claude Code: bloated CLAUDE.md causes rules to be ignored; domain knowledge that applies only sometimes belongs in a skill. | Cursor rules docs (F) https://cursor.com/docs/context/rules ; Claude Code best practices (F) |
| 15 | **Long pasted prompts are a risk in themselves.** Claude Code deep links show a warning for prompts over 1,000 chars because long prompts can push instructions off screen. Stuff the long material in a file/skill and let the prompt name it. | Claude Code deep links doc (F) https://code.claude.com/docs/en/deep-links |
| 16 | **Context window is the scarce resource**; after two failed corrections, start fresh with a better prompt. Implication for a docs site: the first prompt must be right; re-prompting is expensive. | Claude Code best practices (F) |

**Checklist as applied to a crisp-ui copy-prompt (the "10-line spine"):**
1. Goal and user (one sentence: who is deciding what, with what data).
2. Install step (exact CLI command) and "inspect the installed files before writing code".
3. Props/handler contract in a compact block (no guessing).
4. Wiring instruction: which of the user's own data/API to connect, with the mapping spelled out.
5. Constraints/out of scope (no new deps, no rewriting the component internals, keep the existing design tokens).
6. States to cover (loading, empty, error, partial, permission denied).
7. Acceptance criteria as observable checks (typecheck passes, named test cases, a screenshot of each state).
8. Verification command(s) and "show output as evidence".
9. Anti-overengineering and anti-hallucination clause (1-2 lines).
10. Example data (sector-specific) to render against.

---

## 2. How pattern/component sites hand off to agents today

### 2a. Site practices (what is actually shipped)

| Site | What I verified | Source |
|---|---|---|
| shadcn/ui registry | Items are JSON at `/r/<name>.json`; install via `npx shadcn@latest add <url \| name \| @ns/name \| local path>`. CLI has `view`, `search`, `docs`, `info`, `--dry-run`, `--diff`, `--view`. Registry item schema has `docs` (markdown string, shown by the CLI), `meta` (free key-values), `categories`, `registryDependencies` (names, @ns, GitHub addresses, URLs), `dependencies`, `devDependencies`, `cssVars`, `css`, `envVars`. | (F) https://ui.shadcn.com/docs/registry/getting-started , /docs/cli , /docs/registry/registry-item-json , schema https://ui.shadcn.com/schema/registry-item.json |
| shadcn MCP server | Lets agents browse/search/install from public, private and namespaced registries via natural language; reads registry config from `components.json`. | (F) https://ui.shadcn.com/docs/mcp |
| shadcn skills | `pnpm dlx skills add shadcn/ui` installs a skill that reads `components.json` (framework, aliases, installed components, icon library), documents the CLI, theming, and registry authoring/MCP; agent loads it automatically. | (F) https://ui.shadcn.com/docs/skills |
| Open in v0 (shadcn) | Registry must be public; `https://v0.dev/chat/api/open?url=<registry item json url>`; unsupported: `cssVars`, `css`, `envVars`, namespaced registries; auth only via `?token=` query param. | (F) https://ui.shadcn.com/docs/registry/open-in-v0 |
| 21st.dev | Per-component "Copy prompt" (paste into Cursor, Claude Code, v0, Lovable and the agent rebuilds it in the codebase), exact install command per component, and an MCP/CLI path for agents. A community-posted example prompt for 21st components (not official) is structured: stack check, component placement path, dependency analysis, a small clarifying-questions block, integration steps with asset substitution. | (F) https://21st.dev , https://21st.dev/mcp.md ; community prompt (F) https://prompts.chat/prompts/cmq58sz480004i9046hdc9zkr_21stdev-component-prompt |
| Magic UI | CLI-only on the install page, `shadcn add @magicui/<name>` (namespaced registry); MCP page exists but I did not open it. No copy-prompt or Open in v0 mentioned on the install page. | (F) https://magicui.design/docs/installation |
| Aceternity UI | Three install paths: `shadcn add <registry URL .json>`, namespaced `@aceternity/<name>`, and MCP; shows `search`/`view`. No v0/prompt feature mentioned. | (F) https://ui.aceternity.com/docs/cli |
| shadcnblocks | CLI install with dependency resolution, shadcn MCP, an IDE extension (VS Code/Cursor/Windsurf), a browser explorer, and a drag-and-drop page builder. | (F) https://www.shadcnblocks.com |
| Origin UI | Domain now 301-redirects to coss.com/ui (I did not fetch the destination). | (F redirect only) |
| Tailark | Fetched two hosts; the pages did not state delivery mechanisms. Nothing to claim. | (F, inconclusive) |
| Vercel templates | The index page does not show hand-off options in the fetched text. Nothing to claim. | (F, inconclusive) |
| Stripe docs (non-UI precedent) | Pages begin with a "Start here" block aimed at agents (skills + plugins + `stripe agent setup`); every docs URL has a `.md` variant; MCP server; skills catalogue at a `/.well-known/skills/index.json`; the checkout page itself embeds agent-directed instructions ("do not use X unless the user asks"). | (F) https://docs.stripe.com/building-with-llms , https://docs.stripe.com/payments/quickstart |
| llms.txt convention | `/llms.txt` markdown index at site root; clean `.md` variant of pages. | (F) https://llmstxt.org/ |
| Radix / React Aria docs | Radix Dialog page: Features, Anatomy, API Reference tables, Examples, Accessibility (keyboard table + ARIA). React Aria Button: example in two styling approaches, events, pending state with a11y note, props table. Neither advertised an LLM/markdown export in the fetched text. | (F) https://www.radix-ui.com/primitives/docs/components/dialog , https://react-aria.adobe.com/Button |

Takeaway: the market has converged on three hand-off layers: (1) CLI/URL install, (2) a copyable prompt, (3) MCP/skills. Almost nobody (verified) pairs a prompt with a machine-readable acceptance checklist or state-machine spec. That is the gap for crisp-ui.

### 2b. Deeplink / prefill formats

| Target | Format | Limits / behaviour | Status |
|---|---|---|---|
| **Claude Code (terminal, local)** | `claude-cli://open?q=<urlencoded>&repo=owner/name` or `&cwd=/abs/path` | `q` max 5,000 chars; line breaks as `%0A`; prompt is filled, NOT sent; warning banner shown for prompts over 1,000 chars; requires the user to have run Claude Code once (handler registers on first interactive prompt); GitHub-rendered markdown strips the scheme, so publish it as an `<a>` on your own site or in a code block. | VERIFIED (F) https://code.claude.com/docs/en/deep-links |
| **Claude Desktop** | `claude://claude.ai/new?q=...`; `claude://code/new?q=...&folder=/path`; `claude://cowork/new?q=...&folder=...&file=...` | `q` truncated at roughly 14,000 chars; fills but does not auto-send; `folder` needs user confirmation; values URL-encoded. | VERIFIED (F) https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link |
| **claude.ai web chat** | `https://claude.ai/new?q=<urlencoded>` | Search snippets attributed to the same support article say "q" prefills the prompt for review and sending; I only fetched the `claude://` form. Third-party tools claim auto-submit, which contradicts the official "review and send" wording. Treat as prefill-only. | PARTIAL (S). https-form not confirmed on an official page. |
| **Claude Code on the web** | `https://claude.ai/code?prompt=<enc>&repositories=owner/repo` (aliases `q`, `repo`; also `prompt_url`, `environment`) | Prefills, user must press send; needs a paid plan with GitHub connected; `prompt_url` must be CORS-readable. | Source is a third-party blog only (F) https://wmedia.es/en/tips/claude-code-web-url-parameters-prefill ; the official cloud doc I fetched did not document these params. UNVERIFIED officially. |
| **Cursor** | Web: `https://cursor.com/link/prompt?text=<enc>`; app: `cursor://anysphere.cursor-deeplink/prompt?text=<enc>`. Same pattern for `command` (`name`,`text`) and `rule` (`name`,`text`). | Max 10,000 characters for the whole URL; user must review and confirm, never auto-executes. | VERIFIED (F) https://cursor.com/docs/integrations/deeplinks |
| **OpenAI Codex app** | `codex://new?prompt=<enc>&path=<abs path>&originUrl=<git remote>`; `codex://threads/new` | Needs at least one of prompt/path/originUrl; values must be encoded; local desktop app (ChatGPT desktop keeps this scheme). | VERIFIED (F) https://learn.chatgpt.com/docs/reference/commands |
| **v0 (registry item)** | `https://v0.dev/chat/api/open?url=<public registry item JSON URL>` (+ `&token=` for auth) | Registry item must be public; no cssVars/css/envVars/namespaced registries. Because crisp-ui items likely carry cssVars or tokens, check each item. | VERIFIED (F) https://ui.shadcn.com/docs/registry/open-in-v0 |
| **v0 (plain text prompt link)** | Unknown. v0 docs describe text prompting but I found no documented `?q=` URL; the v0 platform API can create chats programmatically. | n/a | UNVERIFIED. Do not ship a v0 text deeplink; use the registry-item URL form or copy-to-clipboard. |
| **Lovable** | `https://lovable.dev/#prompt=<enc>` (hash, not query), optional `&images=<url>` and `&html=<page url>` | `prompt` required, up to 50,000 chars; max 10 references; images JPEG/PNG/WebP, 20 MB each; `autosubmit=true` from older links is now ignored (user must confirm). The old form `?autosubmit=true#prompt=` in the brief is outdated. | VERIFIED (F) https://docs.lovable.dev/integrations/build-with-url |
| **Bolt (bolt.new)** | `https://bolt.new/?prompt=<enc>` | Existence confirmed only by a GitHub issue on a fork saying the original product has `?prompt=`; no official docs found; no length limit known. | UNVERIFIED (S + issue text). https://github.com/stackblitz-labs/bolt.diy/issues/627 |
| **ChatGPT** | `https://chatgpt.com/?q=<enc>`; extras reported: `hints=search`, `temporary-chat=true`, `model=` | Community-discovered, not official; behaviour (auto-submit, model param honoured) reported inconsistent; no length limit documented. | UNVERIFIED as official. (F) https://community.openai.com/t/query-parameters-in-chatgpt/1027747 |

Practical size ceiling: if a copy-prompt must travel through a deeplink to the strictest target, keep the encoded URL under 10,000 characters (Cursor) and the raw prompt under 5,000 characters (Claude Code). A prompt that is URL-encoded roughly triples non-alphanumerics, so target about 2,500-3,000 raw characters for a "universal" deeplink prompt. Everything longer should be delivered as "copy" (clipboard) or by pointing the prompt at a URL the agent can fetch.

---

## 3. Precedents for story-ordering

### What the precedents say (all fetched)

- **GOV.UK** separates *styles*, *components*, *patterns*. Patterns are "best practice design solutions for specific user-focused tasks and page types" that use one or more components and explain how to adapt them. Its pattern index is grouped by user intent: "Ask users for...", "Help users to...", "Pages", not alphabetically. The task-list pattern is itself an ordered-journey pattern: verb-led task names, a minimal status vocabulary (Completed/Incomplete, extended only when research supports), grouping into phases. (F) https://design-system.service.gov.uk/patterns/ and /patterns/complete-multiple-tasks/
- **Primer (GitHub)**: UI Patterns are "design guidelines covering common user workflows", task-oriented, distinct from components. Ten patterns include data visualization, degraded experiences, empty states, loading, notification messaging, saving; a separate "scenario patterns" set covers verbs like copy/create/delete/search. (F) https://primer.style/product/ui-patterns/
- **Carbon (IBM)**: components are ready to import; patterns are best-practice solutions made from "reusable combinations of components, templates, flows, and sequences" with multiple valid ways to meet a need, so full code examples are not always feasible. Pattern list (common actions, empty states, filtering, loading, notifications, status indicators, read-only states, search...) is function-named. (F) https://carbondesignsystem.com/patterns/overview/
- **Atlassian**: top-level nav is Foundations / Components / ...; no separate Patterns section found in the fetched page, so it is a counter-example of component-only IA. (F) https://atlassian.design/foundations/content/
- **Polaris**: fetch failed (socket closed). No claim made.
- **Diataxis**: four needs (tutorial = learning-by-doing, how-to = solving a task, reference = information, explanation = understanding) on two axes (practical-theoretical, learning-working). Use: don't mix. A recipe/prompt is a how-to + reference; the story arc is the tutorial/explanation layer. (F) https://diataxis.fr/
- **Alexander / Tidwell**: *A Pattern Language* orders patterns from largest to smallest scale, with numbered cross-references so patterns form a network rather than a flat list, and each pattern states a problem then a solution in general terms so it can be adapted. (F) https://en.wikipedia.org/wiki/A_Pattern_Language . Tidwell's *Designing Interfaces* inherits the idea; its pattern sections per search snippet are what / use when / why / how / examples / related. (S) https://www.designsystems.com/jenifer-tidwell-creator-of-a-pattern-language-for-ui-design/ and book-listing snippets. I could not fetch Tidwell's site, so the section names are search-level evidence.
- **Linear docs**: opens with a "Popular" starter block, then "Linear basics" organized by the working loop (workflows, triage, notifications...). (F) https://linear.app/docs
- **Stripe docs**: use-case-first quickstarts with a "Start here" block rather than API-object alphabetical order. (F) https://docs.stripe.com/payments/quickstart
- **PagerDuty incident response**: lifecycle before / during / after; roles during; postmortem after. A precedent that operations work has a natural temporal arc ending in a record/learning step. (F) https://response.pagerduty.com/before/different_roles/

### What this supports

1. Order by **user intent / task sequence**, not by component name (GOV.UK, Primer, Linear, Stripe).
2. Show the **arc as a first-class page** (Alexander's large-to-small ordering; Carbon's "sequences and flows"), with each pattern cross-linking to its neighbours (Alexander's numbered references).
3. Keep **pattern pages and recipe pages separate** from the story page (Diataxis: explanation vs how-to vs reference).
4. Ending the arc on a **record/audit** step has an operational precedent (PagerDuty's after-incident phase) and a UI-pattern precedent (Primer's "saving", "degraded experiences").

### Proposed story arc for dashboard/internal tooling

Candidate A, "See -> Decide -> Act -> Confirm -> Record" (recommended), phrased as verbs per the GOV.UK task-name rule:

| Stage | User question | What crisp-ui supplies (pattern families, generic names) | Hand-off to next stage |
|---|---|---|---|
| **1. See** | "What is happening right now?" | KPI/summary strip, status board/queue, freshness + degraded-data indicators, empty/loading/error | A selectable row or alert |
| **2. Decide** | "What needs me, and why?" | Filter/sort/triage queue, detail drawer with evidence, severity/priority, comparison | A chosen item plus a proposed action |
| **3. Act** | "Do the thing safely." | Single and bulk actions, approval request/approve-reject, destructive-action confirmation, assignment/escalation | An action in flight (optimistic or pending) |
| **4. Confirm** | "Did it work? Does everyone who needs to know, know?" | Toasts/inline status, status transitions (pending/succeeded/failed/rolled back), notification routing and delivery state, undo window | A settled state |
| **5. Record** | "Can I prove who did what, and learn from it?" | Audit log/timeline, activity feed, export, retention view, reason capture | Feeds back into See (the loop closes) |

Candidate B, "Monitor -> Triage -> Notify -> Approve -> Audit": the same arc in operations vocabulary; it fits incident/ops tools but breaks for non-ops dashboards (finance review, content moderation, logistics) because "Monitor" and "Notify" are narrower than "See" and "Confirm". Recommend A as the site-level spine and use B's words as sub-labels per sector.

Why A beats B: (i) "Decide" explicitly includes the human judgment step that internal tools exist for, (ii) "Confirm" captures notify + status feedback in one stage, so a separate Notify stage is not needed, (iii) five one-word verbs are scannable like GOV.UK's "Ask users for... / Help users to...". Caveat: this arc is my synthesis; no source states it. UNVERIFIED as an established convention.

Alexander-style linking: each pattern page ends with "comes after: X; leads to: Y; commonly combined with: Z", so the site is a network with a recommended path, not a rigid sequence. Also provide a "build the whole arc" meta-prompt (a thin spine prompt that installs and wires the minimum viable pattern from each stage) so the story is also one-shot-able. That meta-prompt is the highest-value artifact.

---

## 4. Recipe anatomy proposal (machine-readable, per pattern)

### Evidence on structure of reusable instructions

- **shadcn registry item** has `docs` (markdown string shown by the CLI at install), `meta` (arbitrary key-values for your own tools), `categories`, `registryDependencies`, `dependencies`, `cssVars`/`css`, `envVars`. (F) registry-item-json page and schema URL above. The examples page documents `meta` but showed no `docs` example. The CLI `view` command prints items from the registry before install. So the registry is the natural carrier of *what to install*, and `docs`/`meta` can carry small hints, but they are not a structured place for contracts.
- **Radix / React Aria**: stable page anatomy of Features, Anatomy, API tables, Examples, Accessibility with keyboard table. (F) above. These are human reference; they tell us which sections agents need (props table, keyboard/ARIA).
- **Agent Skills (SKILL.md)**, official spec (F) https://agentskills.io/specification and Anthropic docs (F) https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview , best-practices page (F) .../agent-skills/best-practices :
  - Required frontmatter `name` (<=64 chars, lowercase/digits/hyphens, must match directory) and `description` (<=1024 chars, say what it does and when to use it). Optional `license`, `compatibility`, `metadata`, `allowed-tools`.
  - Three-level progressive disclosure: metadata (~100 tokens always loaded), SKILL.md body (<5k tokens recommended, <500 lines), resources loaded on demand (`references/`, `assets/`, `scripts/`), references kept one level deep.
  - Anthropic's own name rule forbids "claude"/"anthropic" in a skill name (Anthropic docs); the open spec does not mention that.
  - Skill descriptions in Claude Code are listed under a combined ~1,536-char budget (F) https://code.claude.com/docs/en/skills ; many skills means truncated descriptions.
  - Skills are filesystem-based: `.claude/skills/<name>/SKILL.md` (project), plugins, or personal. They do not sync to claude.ai or API. Cursor and Codex have their own rule formats (`.cursor/rules/*.mdc` with `description`/`globs`/`alwaysApply`; `AGENTS.md`). (F) cursor rules docs.
  - Best-practice guidance that maps directly to recipes: concise ("assume the model is smart"), match freedom to fragility (exact commands for fragile steps), workflows as checklists, validate-then-proceed feedback loops, consistent terminology, examples as input/output pairs, build evaluations before docs.

### Proposed recipe (one file per pattern; the same text feeds the page, the copy-prompt, and a skill reference)

Recommended storage: a plain markdown file with YAML frontmatter, `recipes/<pattern>.md`, structured so it is valid as a skill `references/` file. Sections, in this order (each short; target 1-2 screens):

```
---
pattern: <slug>                # matches registry item name
stage: see|decide|act|confirm|record
comes_after: [<slug>]          # story links
leads_to: [<slug>]
registry: https://<site>/r/<slug>.json
install: npx shadcn@latest add <url-or-@ns/slug>
depends_on_registry: [<slug>, button, dialog]   # mirrors registryDependencies
npm_deps: [ ... ]
requires: { tailwind: "v4", react: ">=19", rsc: "client component" }
---
1. Intent        - 2 sentences: user, decision, outcome.
2. When / not    - use when; do NOT use when (and which pattern instead).
3. Install       - exact command + "then read the installed file(s) at <alias path> before editing".
4. Props contract- TypeScript block, copied from source, every prop with type, default, required.
5. State machine - states, events, transitions (table). e.g. idle -> pending -> succeeded|failed -> idle.
6. Handler contract - signature of each callback, who owns state (controlled/uncontrolled), idempotency, what a rejected promise must do.
7. Wiring recipe - mapping table from "your data" fields to props; where to put fetch/mutation; example for one adapter.
8. Failure states- empty, loading, partial data, stale, permission denied, network error, conflict; required UI for each.
9. A11y          - roles, keyboard table, focus management, live-region behaviour, reduced motion.
10. Do / Don't   - 4-6 bullets each, concrete (e.g. "don't invent a `loading` prop; use `state='pending'`").
11. Example data - 3 sectors (e.g. ops/support, finance, logistics) as JSON fixtures.
12. Acceptance checks - checkbox list the agent can run or screenshot (see below).
13. Test checklist - named test cases (Testing Library/Playwright) for the state machine + a11y.
14. Next in the story - link + one-line prompt to continue to the next pattern.
```

Why these sections (evidence mapping): props/handler contracts = "reference reality, don't guess" (Anthropic hallucination clause; shadcn skills read project files); state machine + failure states = what v0/Lovable guidance says to specify ("what states it handles"); a11y keyboard table = Radix/React Aria precedent; do/don't + examples = Anthropic's examples guidance; acceptance + test checklist = "give a check it can run" (Claude Code best practices); example data = Lovable "real content".

### Where does it live? registry `docs` vs skill file

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Registry item `docs` field | Travels with the install; shown in CLI output at `add`; available at the same `/r/<name>.json` URL an agent already fetches; works with MCP/CLI discovery. | Single markdown string; shown in the terminal (keep it short); no progressive disclosure; Open in v0 flow only reads the item JSON and ignores much metadata, so don't rely on it for v0; I did not verify how `docs` renders in every client (shadcn MCP, v0). | Use for a **short install-time note** (3-8 lines: "read recipe at <URL>; wire handlers; run checks"). |
| Registry item `meta` | Free-form, tool-readable (e.g. `meta.stage`, `meta.recipe`, `meta.checks`). Documented as "custom data your tools or scripts can use". | No consumer today except your own site/scripts; agents won't read it unless told. | Use for **site metadata + a recipe URL pointer**, not for prose. |
| A separate `recipes/<slug>.md` file served by the site (and `.md` twin of each docs page, `/llms.txt` index) | Full content, any length, fetched on demand by URL; mirrors Stripe's "append .md" approach and the llms.txt convention; usable by any agent that can fetch a URL. | Needs the agent to be told the URL; no auto-discovery. | **Canonical home.** The copy-prompt includes the URL. |
| A single crisp-ui **Agent Skill** (SKILL.md + `references/<slug>.md`, installable by the user) | Progressive disclosure matches 14 recipes exactly: tiny metadata always loaded, recipes loaded only when a matching task appears; works in Claude Code and other skills-aware agents; shadcn itself ships a skill, so users already know the install flow (`skills add`). | Skills do not sync across surfaces (Claude Code vs claude.ai vs API); users in v0/Lovable/Bolt/Cursor-without-skills cannot use it; installing a skill is a trust decision (Anthropic warns to use only trusted sources) so it needs clear provenance. | **Second layer.** Generate it from the same recipe files; do not hand-maintain a second copy. |

Conclusion: the right home is a **site-served recipe file (canonical) + a short `docs`/`meta` pointer in each registry item + an optional generated skill**, not `docs` alone. Make `docs` a pointer because the CLI prints it to a terminal and Open in v0 clients may ignore it. UNVERIFIED: whether current shadcn MCP tools surface `docs` to the agent; test it before relying on it.

---

## 5. Pitfalls and limits

### Prompt length
- Deeplink ceilings (verified above): Claude Code 5,000 chars; Cursor 10,000 chars total URL; Claude Desktop ~14,000 chars; Lovable 50,000 chars. No limit found for Bolt/ChatGPT/v0.
- Claude Code shows a long-prompt warning above 1,000 chars. (F deep-links doc)
- Clipboard paste has no documented limit in the sources I fetched; the real limit is attention/context: Anthropic and Cursor both warn that long, noisy context degrades instruction following. UNVERIFIED: exact paste limits in Claude Code/Cursor/v0 chat boxes. Do not assert a number.
- Strategy: a short spine prompt (~1,500-3,000 chars) + "fetch and read <recipe URL>" + inline only the contract block. That also keeps deeplinks viable.

### What agents do with a registry URL
- `npx shadcn@latest add <url>` fetches the item JSON, writes files to the aliases in `components.json`, installs `dependencies`, resolves `registryDependencies`, flags: `--dry-run`, `--diff`, `--view`, `--overwrite`, `-y`. (F cli docs, registry docs). Agents with a shell run this; agents without one (v0, Lovable, Bolt) cannot run the CLI.
- v0 reads the item JSON directly via `chat/api/open?url=` but ignores `cssVars`, `css`, `envVars` and does not support namespaced registries. (F) So an item that needs tokens in CSS silently loses them in v0.
- An agent can also just `curl` the `/r/<name>.json` and read file contents inline (works everywhere with network access; this is the same payload the CLI uses). `shadcn view <item>` does it from the CLI. (F cli docs for `view`.)
- MCP server and skill reduce guessing by letting the agent search and read real items. (F)

### Common failure modes (evidence level)
| Pitfall | Evidence | Mitigation in recipe |
|---|---|---|
| Hallucinated props (e.g. inventing `loading` on Button) and made-up Tailwind classes/tokens | Practitioner reports (S) https://dev.to/vola-trebla/your-ai-agent-hallucinates-tailwind-classes-heres-the-fix-mk2 and https://blog.logrocket.com/ai-shadcn-components/ ; Anthropic's own "read the file before answering" clause (F) | Include the TypeScript props block verbatim; say "read the installed file; use only these props"; list tokens that exist |
| Wrong import paths/aliases | Aliases come from `components.json` (`components`, `ui`, `lib`, `hooks`, `utils`) (F) | Tell the agent to run `shadcn info` / read `components.json` and not hard-code `@/components/...`; recipes use "<ui alias>" placeholders |
| Missing deps | CLI installs `dependencies` and `registryDependencies` for you (F); manual copy/paste or v0 paths can miss them | Put the install command first and list `depends_on_registry` + `npm_deps` explicitly |
| Tailwind v4 vs v3 | shadcn v4 default for new projects: `@theme`/`@theme inline`, OKLCH colors, `data-slot` on primitives, `forwardRef` removed, `size-*` utility, `tailwind.config` left blank in `components.json`; existing v3/React 18 projects unaffected (F) https://ui.shadcn.com/docs/tailwind-v4 , https://ui.shadcn.com/docs/components-json | Frontmatter `requires.tailwind`; a "v3 notes" block; do not ship `tailwind.config`-based tokens (the `tailwind` registry field is deprecated, F) |
| Style/base differences | `components.json` `style`: "new-york" is current, "default" deprecated (F); registry item types include `registry:base` and `registry:style` (F) | Build against new-york only; say so in recipe |
| RSC / `"use client"` | `rsc: true` makes the CLI add `"use client"` to client components (F). Interactive patterns (state machines, dialogs) need it | Recipe states "client component; parent page may be a server component; keep data fetching in the parent and pass props" |
| Over-engineering / test gaming | Anthropic prompting guide (F) | Standard two-line clause in every spine prompt |
| Deeplink rendering | GitHub markdown strips `claude-cli://` (F deep-links doc) | Host buttons on your own site; use code block fallback in README |
| Open in v0 requires public registry and drops css/cssVars/envVars (F) | | Test each item with v0 before showing the button; hide it where it would degrade |
| Fabricated ordering-claim risk | My arc is a synthesis (above) | Present as "recommended path", not "standard" |

---

## 6. What this means for crisp-ui (ranked recommendations)

1. **Write one spine prompt template and ship a "Copy prompt" button per pattern (Effort S).** Fill the 10-line spine from section 1 using the recipe fields (install, contract, wiring, states, acceptance, verify). Keep the raw prompt under ~3,000 chars so it fits every deeplink; point at the recipe URL for depth. Default action is copy-to-clipboard; this works for every agent including those with no verified deeplink (v0 text, Bolt, ChatGPT).
2. **Add a sector-example selector to the prompt (Effort S).** One toggle (e.g. support ops / finance / logistics) swaps the example fixture and the "who decides what" sentence. This addresses the "real content, not lorem ipsum" and "context of use" guidance (Lovable, v0) at nearly zero cost.
3. **Define the recipe format (14 sections above) and make it the single source of truth (Effort M).** Author per pattern as `recipes/<slug>.md` with frontmatter; render the docs page, the copy-prompt, and the registry `docs`/`meta` pointer from it with a build script. Include acceptance checks as a runnable list (typecheck, named test cases, a screenshot of each state). This is the main differentiator versus 21st.dev/shadcnblocks, who I verified ship copy-prompt or CLI but not an acceptance contract.
4. **Re-order the site as the See -> Decide -> Act -> Confirm -> Record arc (Effort M).** A story landing page, patterns grouped by stage, each pattern page with "comes after / leads to" links (Alexander cross-references, GOV.UK task-grouping, Primer/Carbon task-named patterns). Keep a flat A-Z index as secondary nav (Diataxis: reference vs explanation). Use verb-first stage names (GOV.UK task-name rule).
5. **Ship a "build the whole arc" meta-prompt (Effort M).** It installs the minimal pattern from each stage and wires them into one workflow screen against an example dataset. Likely the highest-value single artifact for a one-shot demo. Needs the five stages to have coherent shared types (a common `Item`/`Action`/`AuditEvent` shape) - plan that in the recipes.
6. **Publish `.md` twins of every docs/recipe page plus `/llms.txt` (Effort S-M).** Matches the Stripe and llmstxt.org conventions I verified; lets an agent fetch the recipe by URL. Check the site is a static export so adding routes is cheap.
7. **Add deeplink buttons only where verified (Effort S).** Claude Code (`claude-cli://open?q=...`), Claude Desktop (`claude://claude.ai/new?q=`), Cursor (`cursor.com/link/prompt?text=`), Codex (`codex://new?prompt=`), Lovable (`lovable.dev/#prompt=`). Cap the prompt used by deeplinks at ~2,500 chars; render the deeplink buttons as site links, not in GitHub markdown. Do not ship v0-text, Bolt or ChatGPT links until verified; offer "Open in v0" only for items that pass the v0 limits (no cssVars/css/envVars; public registry).
8. **Registry hygiene for agents (Effort S).** Per item: accurate `registryDependencies` and `dependencies`, a 3-8 line `docs` pointer (recipe URL, "read installed file first", verification command), `meta` with stage/recipe/checks, and avoid `tailwind` config fields. Test `shadcn add <url> --dry-run` and `shadcn view` for every item.
9. **Generate an optional crisp-ui Agent Skill from the recipes (Effort M).** SKILL.md (<500 lines, `name: crisp-ui-patterns`-style, description saying what + when) with `references/<slug>.md` per recipe; publish for Claude Code users and as a Cursor rule/AGENTS.md snippet. Treat as phase 2; users of v0/Lovable/Bolt still need the copy-prompt path.
10. **Measure one-shot success before polishing copy (Effort M-L).** Build 3 evals per pattern (fresh repo, paste prompt, run acceptance checks) with Claude Code, Cursor, v0 and Lovable, per Anthropic's "build evaluations first" guidance. Record pass rates and fix the recipe where agents fail. Without this, all prompt wording is unvalidated.
11. **Compatibility matrix on each pattern page (Effort S).** Tailwind v4 / React 19 tested; v3 notes; style new-york only; client component; v0 compatible yes/no. Cheap, directly addresses the documented pitfalls.

---

## 7. Unverified / not established

- The See -> Decide -> Act -> Confirm -> Record arc itself, and the claim it beats Monitor -> Triage -> Notify -> Approve -> Audit: my synthesis from verified precedents, not an established convention. OODA, SRE incident lifecycle and Material pattern guidance were NOT fetched, so I cite none of them.
- Polaris and Atlassian pattern definitions: fetch failed / no patterns section in fetched page. No claims.
- Tidwell's exact pattern template sections: only seen in search snippets (S); his own site fetch failed (SSL error).
- `https://claude.ai/new?q=`: only the `claude://` forms were fetched from an official page. Whether it auto-submits on web is contradicted between sources (official wording says review-and-send; third parties claim auto-submit).
- `https://claude.ai/code?prompt=...&repositories=...`: documented only by a third-party blog; not found on the official cloud docs page I fetched.
- Bolt `?prompt=`: search + fork issue only; no official docs found.
- ChatGPT `?q=` and `hints`/`model` params: community-discovered, unofficial; no length limits documented.
- v0 plain-text prompt link: no documented format found.
- Exact paste limits (characters/tokens) for Claude Code, Cursor, v0, Lovable, Bolt chat inputs: not found. Only deeplink limits are verified (see table).
- How `docs` is rendered by the shadcn CLI for non-terminal consumers, and whether the shadcn MCP server surfaces `docs`/`meta` to agents: the schema and registry docs say `docs` is "custom documentation or installation instructions displayed via CLI" (F) but I did not test it, and the examples page had no `docs` example.
- Per-site details for Origin UI (redirected to coss.com/ui, destination not fetched), Tailark and Vercel templates (pages gave no hand-off info), and Magic UI's MCP page.
- Whether Anthropic model-specific advice (e.g. the Opus 4.5/4.6 overeagerness note) applies equally to the model that will run a user's prompt: the docs target specific Claude models; other agents (v0, Cursor model choices, Codex) may differ.
- The 21st.dev "Copy prompt" contents: the official prompt text was not seen; the structure summarised is from a community-contributed prompt on prompts.chat.

## Source list (all fetched 2026-10-01)

- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/deep-links
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/claude-code-on-the-web
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- https://agentskills.io/specification
- https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link
- https://v0.app/docs/text-prompting ; https://vercel.com/blog/how-to-prompt-v0
- https://cursor.com/docs/context/rules ; https://cursor.com/docs/integrations/deeplinks ; https://cursor.com/blog/agent-best-practices
- https://docs.lovable.dev/prompting/prompting-one ; https://docs.lovable.dev/integrations/build-with-url
- https://learn.chatgpt.com/docs/reference/commands ; https://learn.chatgpt.com/docs/prompting
- https://community.openai.com/t/query-parameters-in-chatgpt/1027747
- https://github.com/stackblitz-labs/bolt.diy/issues/627
- https://wmedia.es/en/tips/claude-code-web-url-parameters-prefill
- https://ui.shadcn.com/docs/registry (+ /getting-started, /registry-item-json, /open-in-v0, /examples, /faq), /docs/cli, /docs/mcp, /docs/skills, /docs/tailwind-v4, /docs/components-json, https://ui.shadcn.com/schema/registry-item.json
- https://magicui.design/docs/installation ; https://ui.aceternity.com/docs/cli ; https://21st.dev ; https://21st.dev/mcp.md ; https://www.shadcnblocks.com ; https://prompts.chat/prompts/cmq58sz480004i9046hdc9zkr_21stdev-component-prompt
- https://docs.stripe.com/building-with-llms ; https://docs.stripe.com/payments/quickstart ; https://llmstxt.org/
- https://design-system.service.gov.uk/patterns/ ; .../patterns/complete-multiple-tasks/ ; .../get-started/
- https://primer.style/product/ui-patterns/ ; https://carbondesignsystem.com/patterns/overview/ ; https://atlassian.design/foundations/content/
- https://diataxis.fr/ ; https://en.wikipedia.org/wiki/A_Pattern_Language ; https://www.designsystems.com/jenifer-tidwell-creator-of-a-pattern-language-for-ui-design/
- https://linear.app/docs ; https://response.pagerduty.com/before/different_roles/
- https://www.radix-ui.com/primitives/docs/components/dialog ; https://react-aria.adobe.com/Button
