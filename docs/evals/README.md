# Prompt evals

Each pattern page has an **Agent prompt**, and `/docs/build-the-arc` has a whole-arc prompt. An eval asks one question: *if a person pastes this prompt into a coding agent in an empty project, does the agent finish, and does the result meet the prompt's own acceptance checks?*

This is a measurement of the prompts, not of crisp-ui's components, and not of the agent. A failure is a prompt, a recipe or a component to fix.

## Protocol

1. **Base project, once.** `create-next-app` (TypeScript, Tailwind, App Router) then `shadcn init --defaults`, with dependencies installed. About 1 GB.
2. **Registry, served locally.** Until `https://regularui.com` is live the install commands cannot resolve, so build the registry for a local origin and serve it:
   ```bash
   CRISP_REGISTRY_ORIGIN=http://localhost:4000 pnpm registry:build
   python3 -m http.server 4000 --directory apps/v4/public
   ```
   The harness replaces `https://regularui.com` with `$EVAL_ORIGIN` in the prompt. That is the only difference from the real flow, and every results file says so.
3. **One run per prompt.** `scripts/eval/run.sh <slug> [sector]` clones the base project (APFS copy-on-write, so ten runs do not cost ten gigabytes), builds the prompt exactly as the Copy prompt bar does (the page's prompt plus one sector's example data), and runs a fresh headless `claude -p` in the clone. The agent gets no user skills, hooks, memory or MCP servers from the machine it runs on (`--setting-sources project --disable-slash-commands --strict-mcp-config`). It runs with edits accepted and an allowlist of build commands, not with permissions bypassed.
4. **Mechanical grading.** `scripts/eval/grade.mjs` runs `tsc --noEmit` and `eslint .` itself, diffs `package.json` for dependencies the prompt forbade, checks the installed files exist, and reads the transcript to see whether the agent read every installed file before writing its own code. It records turns, cost and duration. The agent's own "all green" is never the evidence.
5. **Behaviour grading, by hand.** The prompt's acceptance checks that need a browser (keyboard-only operation, accessible names, state coverage) are checked by running the result and driving it. Each check is recorded pass, fail, or not checked.
6. **Record.** One results file per agent and date, committed. A failed check becomes a prompt, recipe or component fix, then a re-run.

## Sectors

Runs rotate through the four sectors (education, manufacturing, engineering, health) so the example data, not only the manufacturing wording, is exercised.

## Limits

- One run per prompt is an anecdote, not a pass rate. Agents are not deterministic; treat a single failure as a lead and a repeated failure as a finding.
- The agent is Claude Code only. Other agents are untested; the deeplinks in the Copy prompt bar are format-verified, not run-verified.
- The registry is served locally and the install commands are rewritten to match.
- The grader checks the mechanics. It does not judge design quality.
