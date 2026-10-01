#!/usr/bin/env bash
# One eval run: clone the base project, hand a page's prompt to a real headless
# Claude Code, then grade the result with grade.mjs. See docs/evals/README.md.
#
#   scripts/eval/run.sh <slug> [sector]
#
# Needs: EVAL_BASE (a Next.js + shadcn project with node_modules), EVAL_OUT (where
# runs go), and a registry served at $EVAL_ORIGIN that was built with that origin.
#
# The agent runs with edits accepted and an allowlist of the commands a build
# needs (package runners, node, read-only shell tools). Anything else is denied
# and the agent has to cope, which is also what a cautious user's setup does.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SLUG="${1:?pattern slug or build-the-arc}"
SECTOR="${2:-manufacturing}"
: "${EVAL_BASE:?path to the base project}" "${EVAL_OUT:?output directory}"
export EVAL_ORIGIN="${EVAL_ORIGIN:-http://localhost:4000}"
BUDGET="${EVAL_BUDGET_USD:-6}"

RUN="$EVAL_OUT/$SLUG"
rm -rf "$RUN"
mkdir -p "$RUN"
# Copy-on-write clone (APFS): the 1 GB node_modules is shared, not duplicated.
cp -cR "$EVAL_BASE" "$RUN/app"

node --experimental-strip-types "$ROOT/scripts/eval/prompt.mjs" "$SLUG" "$SECTOR" >"$RUN/prompt.txt"

ALLOWED="Read Edit Write Glob Grep Bash(npx:*) Bash(npm:*) Bash(node:*) Bash(ls:*) Bash(cat:*) Bash(head:*) Bash(tail:*) Bash(wc:*) Bash(grep:*) Bash(find:*) Bash(sed:*) Bash(mkdir:*) Bash(pwd) Bash(echo:*)"

cd "$RUN/app" || exit 1
# A fresh agent: no user skills, hooks, memory or MCP servers from this machine.
CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 claude -p "$(cat "$RUN/prompt.txt")" \
  --output-format stream-json --verbose \
  --setting-sources project --disable-slash-commands --strict-mcp-config \
  --permission-mode acceptEdits --allowedTools $ALLOWED \
  --max-budget-usd "$BUDGET" \
  >"$RUN/transcript.jsonl" 2>"$RUN/claude.err"
echo "agent exit: $?" >"$RUN/agent-exit.txt"

node "$ROOT/scripts/eval/grade.mjs" "$RUN/app" "$EVAL_BASE" "$RUN/transcript.jsonl" "$RUN/prompt.txt" >"$RUN/grade.json"
cat "$RUN/grade.json"
