// Builds the Real Good Site registry into public/r/<name>.json with the stock
// `shadcn build`. Cross-item dependencies are absolute URLs, so the origin the
// registry will be served from is injected here:
//   CRISP_REGISTRY_ORIGIN=https://your-domain pnpm --filter=v4 crisp:build
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"

// Explicit override, else the Vercel production domain, else local dev.
const origin = (
  process.env.CRISP_REGISTRY_ORIGIN ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:4000")
).replace(/\/$/, "")
const template = readFileSync("registry-crisp.template.json", "utf8")
writeFileSync(
  "registry-crisp.json",
  template.replaceAll("__REGISTRY_ORIGIN__", origin)
)

execFileSync(
  "pnpm",
  ["exec", "shadcn", "build", "registry-crisp.json", "--output", "public/r"],
  { stdio: "inherit" }
)
console.log(`Real Good Site registry built for ${origin}`)
