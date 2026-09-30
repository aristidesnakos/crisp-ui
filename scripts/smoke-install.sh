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

ORIGIN="${CRISP_REGISTRY_ORIGIN:-http://localhost:4000}"
ITEM="${1:-status-notify}"
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
npx --yes shadcn@latest add "$ORIGIN/r/$ITEM.json" --yes

echo "--- installed files"
git ls-files --others --exclude-standard 2>/dev/null || true
# Next generates the global LayoutProps/PageProps types the starter uses.
npx next typegen
npx tsc --noEmit
echo "smoke test passed: $ITEM installs and typechecks"
