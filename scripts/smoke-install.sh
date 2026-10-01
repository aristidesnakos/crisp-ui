#!/usr/bin/env bash
# Installs the built status-notify block into a scratch Next.js project with the
# stock shadcn CLI and typechecks the result. This is the contract consumers
# rely on, so it runs in CI.
#
# Requires the registry to be built for, and served from, $ORIGIN:
#   CRISP_REGISTRY_ORIGIN=http://localhost:4000 pnpm registry:build
#   pnpm --filter=v4 start &
#   scripts/smoke-install.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORIGIN="${CRISP_REGISTRY_ORIGIN:-http://localhost:4000}"
ITEM="${1:-status-notify}"

# Every item declared in the template, so a new item is covered without editing
# this script.
ITEMS="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).items.map((i) => i.name).join(" "))' "$ROOT/apps/v4/registry-crisp.template.json")"
URLS=()
for name in $ITEMS; do URLS+=("$ORIGIN/r/$name.json"); done
WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/crisp-smoke.XXXXXX")"
trap 'rm -rf "$WORKDIR"' EXIT

curl -fsS "$ORIGIN/r/$ITEM.json" >/dev/null || {
  echo "registry is not serving $ORIGIN/r/$ITEM.json" >&2
  exit 1
}

cd "$WORKDIR"
npx --yes create-next-app@latest app --ts --tailwind --eslint --app \
  --no-src-dir --import-alias "@/*" --use-npm --skip-install --yes >/dev/null
cd app
npm install --no-audit --no-fund --loglevel=error
npx --yes shadcn@latest init --defaults --yes

# Two CLI calls cover every item, to stay cheap: `view` prints the served item
# JSON, which must carry the agent-facing metadata, and `add --dry-run` resolves
# each item and its dependencies without writing anything.
echo "--- registry metadata and dry-run for: $ITEMS"
VIEW_JSON="$(npx --yes shadcn@latest view "${URLS[@]}")"
printf '%s' "$VIEW_JSON" | ORIGIN="$ORIGIN" EXPECTED="$ITEMS" node -e '
const items = JSON.parse(require("fs").readFileSync(0, "utf8"))
const origin = process.env.ORIGIN
const stages = ["see", "decide", "act", "confirm", "record"]
const problems = []
const expected = process.env.EXPECTED.split(" ")
for (const name of expected) {
  if (!items.some((i) => i.name === name)) problems.push(name + ": not returned by view")
}
for (const i of items) {
  const lines = (i.docs ?? "").split("\n").filter(Boolean).length
  if (!Array.isArray(i.categories) || i.categories.length === 0) problems.push(i.name + ": categories")
  if (!stages.includes(i.meta?.stage)) problems.push(i.name + ": meta.stage")
  // Usually the item own page; a helper library points at the page of its parent item.
  const recipe = i.meta?.recipe ?? ""
  const prefix = origin + "/docs/components/"
  if (!(recipe.startsWith(prefix) && /^[a-z-]+\.md$/.test(recipe.slice(prefix.length)))) problems.push(i.name + ": meta.recipe")
  if (lines < 3 || lines > 8) problems.push(i.name + ": docs should be 3 to 8 lines, has " + lines)
}
if (problems.length) {
  console.error("registry metadata problems:\n  " + problems.join("\n  "))
  process.exit(1)
}
console.log("registry metadata ok for " + items.length + " items")
'
npx --yes shadcn@latest add "${URLS[@]}" --dry-run --yes

npx --yes shadcn@latest add "$ORIGIN/r/$ITEM.json" --yes

echo "--- installed files"
git ls-files --others --exclude-standard 2>/dev/null || true
# Next generates the global LayoutProps/PageProps types the starter uses.
npx next typegen
npx tsc --noEmit
echo "smoke test passed: $ITEM installs and typechecks"
