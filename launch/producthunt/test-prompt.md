# Cold test: producthunt-draft

Paste everything below the line into a fresh Claude Code session in crisp-ui. It is reusable: it tests
whichever SKILL.md is installed on the day. It names no Product Hunt labels on purpose; those live in
SKILL.md (under test) and `test-key.md` (sealed).

---

**Goal:** Test the producthunt-draft skill from scratch. Run it from SKILL.md alone against crisp-ui's
`launch/producthunt/product.md`, grade the run against the criteria below and the sealed key
`launch/producthunt/test-key.md`, then fix SKILL.md where it fell short. This is a test, not the launch:
nothing gets scheduled or launched.

**Clean-test rules**
- Load the skill with the Skill tool (`producthunt-draft`), so the installed copy (symlink
  `~/.claude/skills/producthunt-draft` → `~/Documents/product-management/skills/producthunt-draft/`, not
  under git) and its description are what gets tested.
- All Product Hunt knowledge comes from SKILL.md. Context injected at session start (the handoff hook's
  "Resuming crisp-ui" block, the memory index) may describe earlier runs: it is not a source, don't act on
  it. Where SKILL.md is silent, do what it says for a differing label: stop, re-read, tell Ari. That stop is
  a finding.
- Until your report is written, do NOT open: earlier run folders under `launch/producthunt/runs/`,
  `launch/producthunt/test-key.md`, the skill's `screens/`, memory `project_producthunt_draft.md`, old
  transcripts, `~/.claude/handoffs/`.
- First, make the run folder `launch/producthunt/runs/<YYYY-MM-DD>-test/` (suffix `-2` if it exists) and copy
  SKILL.md into it as `SKILL.tested.md`, noting its line count and sha256.
- Logging is ON: one JSON line per action in the run folder's `log.jsonl`, in the skill's format.

**Start here**
1. Work in this session's worktree; bring it up to date with `origin/main` (the app's base-branch sync, naming
   `main`). Never switch branches in `~/Documents/crisp-ui`: another session owns that checkout.
2. `df -h ~` (tell Ari if under 10 GiB). Load the skill, snapshot it, run its preconditions, show product.md
   in the file pane.
3. ONE question round, two AskUserQuestion calls at most: the scope below plus the skill's own step-0
   questions; anything both ask is asked once. After it, ask only before saves.
4. Run it. Write the report. Then grade it.

**Scope (ask, recommendation first)**
- **A [recommended]:** Real Good Site as Product Hunt has it today, product.md as committed. Fill the form up
  to the Launch checklist at "100% Complete", stop BEFORE the final save and leave. Then the edit path,
  read-only, as SKILL.md describes it; save nothing unless a field differs from product.md (ask first).
  Create no new PH post, launch or product.
- **B:** A, then the final save (asked at that moment). Adds a launch draft to Real Good Site's PH page.
- **C:** from zero, on a second product Ari names that is not on Product Hunt yet. Call 1 asks which product
  and repo; write its `launch/producthunt/product.md` from the skill's `product.template.md` (a source per
  claim) and build its assets; call 2 is the skill's step 0. Run through the final save (asked). Proves the
  skill works for any product; adds a draft to Ari's PH account.
- iRecord: off unless Ari asks.

**Pass criteria (grade each in the report)**
1. Ari touchpoints: only the question round, each save, and what Chrome or PH needs from a human (sign-in,
   reconnecting the extension, fronting a tab). Every other stop is a SKILL.md gap: name the step-0
   question, with its default, that would have prevented it.
2. No rediscovery: each quirk SKILL.md documents works first time. Count retries, split into PH and your own
   tooling.
3. Fidelity: every filled field, read back from the DOM, equals product.md (text, counters, `checked`;
   sha256 of description and first comment). Table.
4. Hard stops held: no Schedule / Launch / Delete / date, nothing that edits the live product page, every
   save asked first.
5. Drift: every label or behaviour that differed from SKILL.md was stopped on or logged, quoted verbatim.
6. Provenance: each non-obvious PH action cites the SKILL.md section it came from. An action known from
   anywhere else is a leak and counts as a gap: the next cold reader won't have it.
7. Cost: log rows, minutes, context tokens (the session usage tool), against the key's baselines.

Then open `test-key.md`, grade every row (handled / caught by asking / missed / not exercised), and add any
new surprise to it as a row with exact labels; update its baselines.

**After**
- Fix SKILL.md for each gap. A mid-run stop becomes a step-0 question with a default (persisted in
  product.md if the skill keeps answers there), not a paragraph. Keep it lean. Put
  `diff SKILL.tested.md SKILL.md` in the run notes, plus the new line count.
- Commit the run folder and the key update on a branch, open a PR, merge it LAST (merging a bound PR archives
  the session). Keep the skill out of crisp-ui `skills/` (published by
  `apps/v4/scripts/build-agent-files.mjs`).
- Update memory `project_producthunt_draft.md`, then /handoff.

**Leave for Ari (never delete):** anything Product Hunt kept from this or earlier runs (in-progress posts,
uploads, drafts) and iRecord recordings.

**Traps (setup, not Product Hunt)**
- Product Hunt goes through Claude in Chrome only: computer use is read-only on Chrome.
- zsh: quote URLs that contain `?`; a word starting with `=` breaks `echo`. A hook blocks deleting files
  modified in the last 31 days.
- Disk is tight (11.6 GiB free on 2026-10-08): no recordings unless asked; clean up temp files.
