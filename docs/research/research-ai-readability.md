# Research: making crisp-ui readable to AI agents and LLM crawlers

Date of all fetches: 2026-10-01 (same-day). Method notes:
- "WebFetch" = fetched with the WebFetch tool (a small model summarizes the page; wording is paraphrase, and fine print can be lost).
- "curl" = I requested the URL directly from the shell and read headers/bytes myself (more reliable for existence/headers/content-type).
- Anything I could not verify is marked UNVERIFIED. Nothing was installed; only the scratchpad was written. The repo (/Users/ari/Documents/crisp-ui) was read-only.

---

## 1. Findings (with citations)

### 1.1 llms.txt spec and evidence

**Format (WebFetch https://llmstxt.org/, 2026-10-01)**
- File lives at `/llms.txt` or any subpath (e.g. `/docs/llms.txt`); when several apply, the most specific one wins.
- Only H1 (project/site name) is mandatory. Then a blockquote summary, then optional free prose, then H2 sections that are "file lists" of `[name](url): optional note`.
- A section titled "Optional" is by convention the skippable material when an agent needs a shorter context.
- The spec proposes that pages offer a clean `.md` version at the same URL (append `.md`, or swap the extension for `.md`).
- Per my fetch, the spec page does NOT define `llms-full.txt`. It is a community convention (Fumadocs, Vercel, Next.js, Cloudflare, Anthropic all publish one: verified by curl below). Treat llms.txt = curated map; llms-full.txt = everything concatenated.

**Does anyone read it? Honest summary: coding agents pointed at docs plausibly do; training/search crawlers mostly do not.**

Evidence AGAINST (all secondary sources, fetched 2026-10-01; I could not reach the underlying studies):
- Server-log study over ~900 domains, Sep 2025 to Apr 2026: 1,227 requests for llms.txt-family files, none from a verified frontier-lab crawler (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) per https://www.digitalapplied.com/blog/llms-txt-in-practice-adoption-evidence-2026 (WebFetch).
- ~300,000-domain citation correlation (attributed to SE Ranking): no measurable link between having llms.txt and being cited in AI answers; same digitalapplied page, and https://www.1clickreport.com/blog/llms-txt-evidence-2026 (WebFetch).
- Ahrefs (May 2026, 137,000 sites): 97% of llms.txt files got zero traffic; Limy: 408 requests to /llms.txt in 515M bot events; OtterlyAI: ~0.1% of AI visits. Cited via 1clickreport and https://www.geoly.ai/blog/does-llms-txt-work (WebFetch). UNVERIFIED at primary source.
- Google: Gary Illyes said (July 2025) Google does not support llms.txt; John Mueller compared it to the keywords meta tag (same two secondary pages). Google's own page says no special AI text files or markup are needed for AI Overviews/AI Mode: https://developers.google.com/search/docs/appearance/ai-features (WebFetch).
- digitalapplied also says it found no primary, on-record statement from OpenAI, Anthropic or Perplexity confirming consumption.

Evidence FOR (weaker, but real):
- Big docs publishers invest in it and address agents directly: Vercel's llms.txt has a "How agents should use Vercel" section; Next.js's tells agents to fetch the canonical URL with `Accept: text/markdown` and to cite canonical, not `.md` (curl https://vercel.com/llms.txt, https://nextjs.org/llms.txt).
- Claude Code's own docs pages open with a banner telling agents to fetch the docs llms.txt index first (WebFetch https://code.claude.com/docs/en/memory). That shows Anthropic's docs expect agents to use it; it is not proof any given client does.
- Coding-assistant claims (Cursor/Windsurf/Claude Code "fetch it when pointed at docs") appear in WebSearch results from blogs (e.g. https://dev.to/toyama0919/using-llmstxt-with-cursor-and-claude-code-a-concrete-playbook-4jln, https://upstash.com/blog/context7-llmtxt-cursor). UNVERIFIED: I did not fetch those pages or any vendor statement.
- geoly (WebFetch) says Anthropic asked Mintlify to implement llms.txt support. UNVERIFIED primary.
- Cost is near zero for a small site.

Bottom line: do it for coding-agent/IDE consumption (cheap), do not expect SEO/citation lift.

### 1.2 How ui.shadcn.com exposes itself (curl + WebFetch, 2026-10-01)

| Surface | Result |
|---|---|
| `/llms.txt` | 200, text/plain, ~12 KB, H1 + blockquote + H2 sections (Overview, Installation, Components, Dark Mode, RTL, Forms, Advanced, MCP, Registry), 130+ links with one-line notes (curl https://ui.shadcn.com/llms.txt, WebFetch). |
| `/llms-full.txt` | 404 (curl). |
| per-page `.md` | 200 `text/markdown`, e.g. `/docs/components/base/button.md` (curl). Has YAML frontmatter, but MDX components (`<CodeTabs>`, `<Steps>`) are left in as raw tags, so it is "source MDX", not clean prose. `/docs/components/button.md` redirects to the `/base/` path. |
| `Accept: text/markdown` on a docs URL | Not honored: returns HTML (curl with the Accept header against /docs/components/base/button). |
| UI | "Copy Page" and "Open in v0" strings present in the page HTML (curl + grep). No `rel=alternate` markdown link found. No JSON-LD found. |
| robots.txt | `User-Agent: *  Allow: /` + sitemap only (curl). |
| `/.well-known/skills/index.json` | 404 (curl). Skills are distributed through a CLI instead, below. |
| Registry JSON | `/r/index.json` 200 (58 KB); per-item e.g. `/r/styles/new-york-v4/button.json` embeds full source in `files[].content` (WebFetch). `/registry.json` at site root is 404 (curl). |
| Schemas | `https://ui.shadcn.com/schema/registry.json` and `.../schema/registry-item.json` both 200 (curl). |
| Directory index | `https://ui.shadcn.com/r/registries.json`: hundreds of community registries with name, homepage, url template, description, plus `health` and `ranking` fields (WebFetch). |

**shadcn MCP server** (https://ui.shadcn.com/docs/mcp.md via curl; WebFetch of /docs/mcp)
- Described capabilities: browse/list items, search across registries, install via natural language, multiple/private/namespaced registries. The docs page does not list individual tool names; I did not find them, so exact tool names are UNVERIFIED.
- Setup: `npx shadcn@latest mcp init --client claude` (also `cursor`; VS Code, Codex, OpenCode tabs exist). Manual config is an `mcpServers.shadcn` entry running `npx shadcn@latest mcp` (`.mcp.json` for Claude Code, `.cursor/mcp.json`, `.vscode/mcp.json`; Codex uses `~/.codex/config.toml`).
- It works with any registry listed under `registries` in `components.json`, so crisp-ui gets MCP support "for free" once it is a reachable registry.

**shadcn CLI features aimed at agents** (https://ui.shadcn.com/docs/cli.md via curl)
- `view <items...>` shows registry items before install (supports `@ns/item` and URLs).
- `search`/`list <@registries> -q -l -o` queries registries.
- `docs [component] --json [--base]` returns component docs/API refs.
- `info --json` returns project config (framework, aliases, installed components, etc.).
- `add --dry-run`, `build` (reads `registry.json`, writes to `public/r`).
- `shadcn add <user>/<repo>/<item>` installs straight from a GitHub repo that has a root `registry.json`, with no hosted JSON (https://ui.shadcn.com/docs/registry/github.md, curl). Refs like `#v1.2.0` pin versions.
- Skills: `npx skills add shadcn/ui`. The skill detects `components.json`, runs `shadcn info --json`, and carries CLI/theming/registry/MCP knowledge (https://ui.shadcn.com/docs/skills.md, curl).
- I did not find any shadcn-shipped AGENTS.md/CLAUDE.md snippet for end users. UNVERIFIED that none exists.

**Open in v0** (WebFetch https://ui.shadcn.com/docs/registry/open-in-v0)
- Link of the form `https://v0.dev/chat/api/open?url=<public registry-item URL>`. Registry must be publicly hosted. It does NOT support `cssVars`, `css`, `envVars`, namespaced registries, or header-based auth (so any crisp-ui item that uses those won't open in v0 correctly).

**Registry authoring (https://ui.shadcn.com/docs/registry/registry-item-json.md, curl; registry-json and getting-started via WebFetch)**
- `registry.json`: `$schema` (`https://ui.shadcn.com/schema/registry.json`), `name`, `homepage`, and `items` (or `include` for composing several registry files; one of the two is required).
- Item types listed in the docs table: `registry:base`, `block`, `component`, `font`, `lib`, `hook`, `ui`, `page`, `file`, `style`, `theme`, `item`. (There is no separate "dashboard" type; use `registry:block` for multi-file patterns.)
- Item fields: `name`, `title`, `description`, `type`, `author`, `dependencies`, `devDependencies`, `registryDependencies`, `files[]` (`path`, `type`, `target`; `target` is REQUIRED for `registry:page` and `registry:file`), `cssVars`, `css`, `envVars` (dev/example values only, merged into `.env.local`, never overwriting existing), `font`, `docs` (a message shown in the CLI at install time), `categories` (string tags), `meta` (free-form key/values), `tailwind` (deprecated).
- `registryDependencies` entries may be bare names (built-in shadcn items), `@ns/item`, `owner/repo/item[#ref]`, a full URL, or a local path.
- Namespaces: `components.json` `registries` maps `@name` to a URL template containing `{name}` (optional `{style}`), or an object with `url` + `headers`. Install with `npx shadcn add @name/item` (https://ui.shadcn.com/docs/registry/namespace, WebFetch).
- Directory submission (https://ui.shadcn.com/docs/registry/registry-index.md, curl): add an entry to `apps/v4/registry/directory.json` in shadcn-ui/ui, run `pnpm validate:registries`, open a PR. Requirements: open source and public; valid per the registry schema; "flat" layout with `/registry.json` and `/<item>.json` at the root; and `files` in the index must not carry `content`. It is not needed for `owner/repo/item` GitHub addresses.
- `shadcn build` writes JSON to `public/r` by default; test with `npx shadcn add http://localhost:3000/r/<item>.json` (WebFetch getting-started).

### 1.3 Other docs sites (probed with curl on 2026-10-01; see table in section 2)

Notable, verified specifics:
- **Content negotiation is mainstream.** With `Accept: text/markdown`, these returned `text/markdown`: vercel.com/docs (response `Vary: Accept`), docs.stripe.com/payments, platform.claude.com/docs/en/intro (docs.anthropic.com 301s there), developers.cloudflare.com/workers, nextjs.org/docs/app/getting-started/installation, supabase.com/docs/guides/getting-started. Default (no Accept) returned HTML on all six. ui.shadcn.com did not honor it.
- **`rel="alternate" type="text/markdown"`** in page HTML on Vercel, Cloudflare, Next.js, Supabase (curl + grep). Stripe advertises `/.well-known/skills/index.json` via a `Link: rel="service-meta"` header.
- **Skills discovery file**: `https://docs.stripe.com/.well-known/skills/index.json` lists skills (name, description, file list incl. SKILL.md + references) (curl).
- **Next.js** publishes `/.well-known/ai-catalog.json` (specVersion 1.0, a typed index of its llms.txt files) and its llms.txt blurbs say create-next-app ships an AGENTS.md and first-party Skills exist (curl https://nextjs.org/.well-known/ai-catalog.json and https://nextjs.org/llms.txt). I did not validate that catalog format against any spec; whether any client consumes it is UNVERIFIED.
- **Cloudflare** layers: root llms.txt points to per-product llms.txt; docs-for-agents page recommends markdown, llms.txt, skills, MCP servers, CLI, OpenAPI (WebFetch https://developers.cloudflare.com/docs-for-agents/). Separately, Cloudflare offers edge HTML-to-Markdown conversion on `Accept: text/markdown` for Pro/Business/Enterprise plans, with `x-markdown-tokens` headers and a 2 MB origin cap (WebFetch https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/). Not applicable to a Vercel-hosted site.
- **Vercel** has an "agent playbook" at `/get-started.md` that tells a coding agent to install the CLI, add a plugin or standalone skills (`npx skills add vercel-labs/agent-skills`), and connect `https://mcp.vercel.com` (WebFetch).
- **Stripe** llms.txt starts with instructions to the agent (check latest package versions, prefer sandboxes) before the link list: a good pattern for "agent-facing guidance in llms.txt" (curl).
- UI affordances in HTML: Vercel "Copy page / Ask AI / Open in v0"; Cloudflare "Copy as Markdown / View as Markdown / Copy Page"; Next.js "Copy page / Ask AI"; Supabase "Copy as Markdown / Ask Claude"; Stripe "View as Markdown / Ask AI"; Anthropic "Copy page" (curl + grep of strings).
- File sizes of llms-full.txt (curl): Vercel ~10 MB, Next.js ~4 MB, Anthropic ~40 MB, Cloudflare ~62 MB. These are corpus dumps far larger than any context window; for a 6-component site the equivalent would be tiny, so llms-full.txt is genuinely usable here.
- Not fetched: Mintlify- or GitBook-hosted sites specifically (not verified here; Anthropic/Stripe/Supabase etc. cover the pattern).

### 1.4 Fumadocs specifics

Current docs: https://www.fumadocs.dev/docs/integrations/llms (fetched as .md via curl) and https://www.fumadocs.dev/docs/headless/mdx/remark-llms.md, https://www.fumadocs.dev/docs/headless/utils/mcp.md.
- One-shot scaffold: `npx @fumadocs/cli feature llms` (adds `docsLlms` in `lib/source.ts` plus routes).
- `llms(source, { renderPage })` from `fumadocs-core/source` returns `index(lang?)` (llms.txt from the page tree), `page(page)` (one page) and `full(lang?)` (joined). `page()`/`full()` exist only when `renderPage` is passed. Example `renderPage` uses `page.data.getText('processed')`.
- Needs `docs: { postprocess: { includeProcessedMarkdown: true } }` in `defineDocs` (fumadocs-mdx). MDX components appear as JSX unless the `output` option is configured (`remarkLLMs`, `output: 'function'` plus passing your MDX components to `getText('processed', { components })`).
- Next.js routes shown: `app/llms.txt/route.ts` (`docsLlms.index()`), `app/llms-full.txt/route.ts` (`docsLlms.full()`), `app/llms.mdx/docs/[[...slug]]/route.ts`, plus a `next.config` rewrite `/docs/:slug*.md` to `/llms.mdx/docs/:slug*/content.md`.
- `Accept` negotiation: `isMarkdownPreferred` and `rewritePath` from `fumadocs-core/negotiation`, used in `proxy.ts`. The docs warn Next.js discards `Vary` on App Router page responses, so set `Vary: Accept` at the CDN if one caches.
- Page actions: `MarkdownCopyButton` and `ViewOptionsPopover` from `fumadocs-ui/layouts/docs/page` (take `markdownUrl`, and `githubUrl` for the popover). They require the `*.md` route to exist first.
- MCP: `npx @fumadocs/cli feature mcp` adds `/api/mcp` (streamable HTTP) using `fumadocs-core/mcp` `registerSourceTools` / `registerSearchTool`; tools `list_pages`, `get_page`, `search`. Needs `@modelcontextprotocol/server` and `zod`. WebMCP is flagged experimental (Chrome 149+ behind a flag).
- Is `getLLMText` an API? Older Fumadocs guides had users hand-write a `getLLMText` helper; the current docs fold this into `renderPage`. A WebSearch snippet described getLLMText as returning `undefined` to exclude a page from llms-full (UNVERIFIED; belongs to the plugin docs at press.fumadocs.dev for Fumapress, not necessarily this framework).

**Version gap that matters for this repo (read-only inspection of /Users/ari/Documents/crisp-ui/apps/v4):**
- Installed: `fumadocs-core 16.10.5`, `fumadocs-ui 16.10.5`, `fumadocs-mdx 15.0.12`, `next 16.3.3`. npm latest today: `fumadocs-core 16.15.17`, `fumadocs-mdx 15.4.5` (curl registry.npmjs.org).
- In the installed fumadocs-core d.ts, `llms()` exposes only `index(lang?)` and `indexNode(node, lang?)`. The `renderPage`/`page()`/`full()` API in the current docs is NOT in the installed version. Which release added it is UNVERIFIED (GitHub releases page did not surface it).
- In the installed packages I did find: `fumadocs-core/negotiation` export, `MarkdownCopyButton`/`ViewOptionsPopover` in `fumadocs-ui/dist/layouts/docs/page`, and `includeProcessedMarkdown` in fumadocs-mdx dist. So negotiation, page actions and llms.txt index work today; llms-full.txt either needs a hand-rolled concatenation or a minor upgrade.
- The repo already has a fork-inherited `/llm/[[...slug]]` route that serves `page.data.getText("raw")` with ComponentPreview tags inlined as code, plus a `next.config.mjs` rewrite `/docs/:path*.md` to `/llm/:path*`. It has no `llms.txt` route, no JSON-LD, no `Accept` negotiation, and `robots.ts` is allow-all. `apps/v4/public/r` holds 7 built JSON files (including `registry.json`). `registry-crisp.json` sets `homepage` to `http://localhost:4000`, which will be wrong once published.
- Note: the Fumadocs docs I fetched are from the `main` branch (the page's source line points at refs/heads/main); treat APIs there as newer than the installed 16.10.5.

### 1.5 Structured data (JSON-LD)

- Google says no special structured data or AI files are needed to appear in AI Overviews/AI Mode (https://developers.google.com/search/docs/appearance/ai-features, WebFetch).
- Google's Search gallery lists Breadcrumb, Software app and Article among supported features; HowTo is not shown and FAQ is not shown (https://developers.google.com/search/docs/appearance/structured-data/search-gallery, WebFetch). Google's updates log: HowTo rich results discontinued 2023-09-14; FAQ restricted to government/health sites 2023-09-14; sitelinks search box removed 2024-11-29 (https://developers.google.com/search/updates, WebFetch). Implication: `WebSite` + `SearchAction` has no Google payoff anymore; HowTo is dead.
- schema.org: TechArticle sits under Article and adds `dependencies` and `proficiencyLevel` (https://schema.org/TechArticle, WebFetch). SoftwareSourceCode has `codeRepository`, `programmingLanguage`, `runtimePlatform`, `codeSampleType`, `targetProduct` (https://schema.org/SoftwareSourceCode, WebFetch).
- What peers actually ship (curl, grep of `"@type"` in page HTML): Vercel docs page: TechArticle, BreadcrumbList, WebSite, Organization. Cloudflare Workers guide: TechArticle, WebSite, Organization. Next.js docs page: TechArticle + Organization. Supabase guide: BreadcrumbList. shadcn and Stripe: none found. So TechArticle + BreadcrumbList is the observed norm; none use SoftwareSourceCode on docs pages.
- LLM use of JSON-LD: the only first-party-sounding claim I found is that a Bing PM said at SMX Munich (Mar 2025) that schema helps Bing's LLMs/Copilot; I only saw it reported on SEO blogs (e.g. WebSearch result https://www.belmoredigital.com/tvfmw/geo/does-schema-markup-help-llms-what-the-evidence-actually-shows-20260512), not a primary source. UNVERIFIED. I found no vendor statement that GPTBot/ClaudeBot/PerplexityBot parse JSON-LD. Treat JSON-LD as classic-SEO hygiene with possible Bing/Copilot upside, not an LLM-crawler lever.

### 1.6 Robots / AI crawler tokens (vendor docs, fetched 2026-10-01)

| Vendor | Token | Purpose (vendor wording, paraphrased) | Source |
|---|---|---|---|
| OpenAI | `GPTBot` | crawls for foundation-model training | https://developers.openai.com/api/docs/bots (WebFetch; platform.openai.com/docs/bots 301s here) |
| OpenAI | `OAI-SearchBot` | surfaces sites in ChatGPT search; allow to appear; ~24h to take effect | same |
| OpenAI | `ChatGPT-User` | user-initiated visits; robots.txt "may not apply" | same |
| OpenAI | `OAI-AdsBot` | validates pages submitted as ads | same |
| Anthropic | `ClaudeBot` | collects web content for model development; blocking signals exclusion from training | https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler (WebFetch) |
| Anthropic | `Claude-User` | fetches pages when a user's question needs it | same |
| Anthropic | `Claude-SearchBot` | indexing to improve search quality | same (Crawl-delay supported for ClaudeBot per that page) |
| Perplexity | `PerplexityBot` | search indexing/surfacing; says it does not train; respects robots.txt | https://docs.perplexity.ai/guides/bots (WebFetch) |
| Perplexity | `Perplexity-User` | user-initiated; generally ignores robots.txt | same |
| Google | `Google-Extended` | product token controlling use of crawled content for Gemini training/grounding; does not affect Search inclusion or ranking | https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers (WebFetch) |

- Cloudflare's bot list groups the same names into training / search / user-action categories (https://developers.cloudflare.com/ai-crawl-control/reference/bots/, WebFetch).
- Content Signals: `Content-Signal: search=..., ai-input=..., ai-train=...` line in robots.txt, introduced by Cloudflare 2025-09-24; Google had not committed to honoring it at launch (WebSearch summary of Search Engine Land / others; I did not fetch a primary Cloudflare announcement). Live use confirmed by curl: Vercel `search=yes, ai-input=yes, ai-train=no`; Stripe, Cloudflare and Supabase all `=yes` for all three (their robots.txt files).
- Peer policy (curl robots.txt): shadcn and Next.js: effectively allow-all. Supabase: explicit `Allow: /` for GPTBot, ClaudeBot, Google-Extended, PerplexityBot. Anthropic platform docs: only `/api/` disallowed.
- Recommendation for a public MIT docs site that wants distribution: allow all, including training. Block nothing; optionally add a Content-Signal line with all three `yes`. Caveat: Next.js `MetadataRoute.Robots` may not emit a `Content-Signal` field; I did not verify that. A plain `app/robots.txt/route.ts` would. Also: user-initiated agents (ChatGPT-User, Perplexity-User) may ignore robots.txt anyway, so robots.txt is not the lever for agents that act for a user; do not rely on it for blocking or enabling.

### 1.7 Agent-oriented repo files

- **AGENTS.md** (https://agents.md/, WebFetch): plain Markdown, no required headings, complements README; nested files in monorepos with closest-wins; supported by Codex, Cursor, VS Code, Copilot, Jules, Devin and others; stewarded under the Linux Foundation's Agentic AI Foundation per the page. Typical sections: build/test commands, code style, testing, security, PR rules.
- **Claude Code** (WebFetch https://code.claude.com/docs/en/memory): reads CLAUDE.md; reads AGENTS.md directly only when no CLAUDE.md exists in or above the working dir (Claude Code v2.1.277+); a CLAUDE.md containing `@AGENTS.md` imports it; keep files under ~200 lines; it is context, not enforced config.
- **Cursor** (WebFetch https://cursor.com/docs/context/rules): project rules in `.cursor/rules/*.mdc` with frontmatter (`alwaysApply`, `description`, `globs`); root/nested `AGENTS.md` also supported. The page did not mention `.cursorrules`; Claude Code's `/init` mentions reading `.cursorrules` (memory page), so it is legacy-but-recognized there. Treat `.cursorrules` as legacy (UNVERIFIED on Cursor's side).
- **Agent Skills** (https://agentskills.io/specification, WebFetch): directory with `SKILL.md`; frontmatter `name` (lowercase/hyphens, max 64, must match directory) and `description` (max 1024, say what and when) required; optional `license`, `compatibility`, `metadata`, `allowed-tools`; optional `scripts/`, `references/`, `assets/`; progressive disclosure, keep SKILL.md under ~500 lines. Claude Code skill locations: `.claude/skills/<name>/SKILL.md` (project), `~/.claude/skills`, plugins (https://code.claude.com/docs/en/skills, WebFetch).
- **Distribution**: `npx skills add <owner/repo>` via skills.sh, which says it supports 20+ agents and sources skills from GitHub repos (WebFetch https://skills.sh). shadcn uses exactly this (`npx skills add shadcn/ui`). The precise repo layout skills.sh requires for discovery was not specified on the page: UNVERIFIED.
- **The shadcn registry can itself ship agent files**: the GitHub-registry doc lists AGENTS.md, `.cursor/rules/*`, `.claude/commands/*`, and `.mcp.json` as distributable items (https://ui.shadcn.com/docs/registry/github.md, curl). So crisp-ui could offer e.g. `npx shadcn add <owner>/<repo>/crisp-agent-rules`. How well that is used is UNVERIFIED.

---

## 2. Comparison table (probed 2026-10-01; "yes" = observed by curl unless noted)

| Site | llms.txt | llms-full.txt | `.md` twin | `Accept: text/markdown` | `rel=alternate` md | Copy/Open menu in UI | MCP | Skills / agent setup | JSON-LD types seen | Robots stance for AI |
|---|---|---|---|---|---|---|---|---|---|---|
| ui.shadcn.com | yes, 12 KB, ~130 links | no (404) | yes (raw MDX tags left in) | no (returns HTML) | not seen | "Copy Page", "Open in v0" | yes (`shadcn mcp`) | yes (`npx skills add shadcn/ui`); no `.well-known/skills` | none | allow all |
| vercel.com/docs | yes, 4.8 KB, with "how agents should use" section | yes (~10 MB, at /docs/) | yes | yes (`Vary: Accept`) | yes | Copy page, Ask AI, Open in v0 | yes (mcp.vercel.com, per its llms.txt) | plugin + standalone skills, `/get-started.md` playbook | TechArticle, BreadcrumbList, WebSite, Organization | Content-Signal search/ai-input yes, ai-train no |
| docs.stripe.com | yes, 92 KB, begins with agent instructions | not tested | yes | yes (`Vary: Accept, Accept-Language`) | not seen (Link header points to skills index) | View as Markdown, Ask AI | yes (docs MCP page) | yes, `/.well-known/skills/index.json` | none | Content-Signal all yes |
| platform.claude.com (Anthropic docs) | yes, 80 KB (EN pages listed inline) | yes (~40 MB) | yes | yes | not seen | Copy page | docs mention MCP features; a docs-search MCP was not verified | docs about skills; own-docs skills not verified | none | allow all except /api/ |
| developers.cloudflare.com | yes, root index to per-product llms.txt | yes (~62 MB) | yes (`index.md`) | yes | yes | Copy Page, Copy as Markdown, View as Markdown | yes (managed MCP servers per docs-for-agents page) | yes (agent skills per docs-for-agents page) | TechArticle, WebSite, Organization | Content-Signal all yes |
| nextjs.org/docs | yes, root + /docs + per-router + blog + versioned | yes (~4 MB) | yes | yes | yes | Copy page, Ask AI | yes (per its llms.txt blog blurbs) | first-party skills; AGENTS.md in create-next-app (per its llms.txt blurbs) | TechArticle, Organization | no rules (sitemap only) |
| supabase.com/docs | yes (links to full file; /docs/llms.txt 404) | linked; not fetched | yes | yes | yes | Copy as Markdown, Ask Claude | yes (mcp.supabase.com) | not verified | BreadcrumbList | explicit Allow for GPTBot/ClaudeBot/Google-Extended/PerplexityBot + Content-Signal yes |

Pattern: every site except shadcn does Accept-negotiation; all publish `.md` twins and llms.txt; the heavy-lifting extras (MCP, skills, ai-catalog) track product complexity, not docs size.

---

## 3. What this means for crisp-ui (ranked)

Context: small Next.js 16 + Fumadocs 16.10.5 site, 6 items today, registry served from `apps/v4/public/r`, installable by `shadcn add <url>`; MIT.

Ranked by (agent-facing value) / effort:

1. **Make the registry JSON the primary agent surface and make it self-describing (S, high).**
   The thing an agent most needs is "how do I install this and what does it depend on". Ensure every item in `registry-crisp.json` has a precise `description`, `categories` (e.g. `dashboard`, `notifications`), `meta` (e.g. hints like intended use), a `docs` string with the usage line, correct `registryDependencies`, and a real `homepage` (currently `http://localhost:4000`). Publish the built `/r/*.json` at the production origin and document three install paths: direct URL, `@crisp` namespace config in `components.json`, and `owner/repo/item` GitHub address (the last requires a `registry.json` at the repo root; today it sits at `apps/v4/registry-crisp.json`, so check before advertising). This also makes the shadcn MCP server and `shadcn view/search` work with crisp-ui without writing any MCP code. Use `registry:block` for multi-file patterns.

2. **Ship a skill + AGENTS.md rules snippet in the repo and document them (S, high for coding agents).**
   One `skills/crisp-ui/SKILL.md` (name `crisp-ui`; description stating what and when; under ~500 lines; `references/` for per-item usage) so `npx skills add <owner>/<repo>` works, and a short copy-paste AGENTS.md/CLAUDE.md block on a docs page ("Use with AI agents"): install commands, import paths, the 6 item names and one-line purposes, dependencies on shadcn `button` etc., and a pointer to `/llms.txt`. Keep the snippet short (Claude Code guidance: concise). Also optionally offer the same text as a registry item (`registry:file`, with a `target`) installable by `shadcn add`. Whether skills.sh needs a particular repo layout is UNVERIFIED, so verify before documenting.

3. **Add `/llms.txt` using Fumadocs' `llms(source).index()` (S, medium).**
   Works with the installed 16.10.5 (index and indexNode exist). Add an agent-guidance preamble in the Vercel/Stripe style: how to install, link to `/r/*.json`, link to the `.md` pages. Cheap, but set expectations: crawler benefit is unproven; coding-agent benefit is plausible. Add `llms-full.txt` as a hand-rolled concatenation of per-page markdown (6 items means a few tens of KB), or upgrade Fumadocs and use `docsLlms.full()` (version gap, see 1.4).

4. **Clean per-page markdown (S/M, high).**
   The inherited `/llm` route plus `.md` rewrite already exist and inline ComponentPreview demos as code, which is better than shadcn's raw-tag output. Verify what it actually returns for a crisp page (not tested by me: the site is local and unpublished), strip leftover MDX tags, and put the install command and the props/dependency table in plain Markdown. Consider `includeProcessedMarkdown` (present in installed fumadocs-mdx) to get processed text.

5. **Accept-negotiation in `proxy.ts` via `fumadocs-core/negotiation` (S/M, medium).**
   Verified peers (Vercel, Stripe, Anthropic, Cloudflare, Next.js, Supabase) all do it, and Next.js explicitly tells agents to request it. `isMarkdownPreferred` exists in the installed package. Needs `Vary: Accept` handled at the CDN (Fumadocs warns Next.js drops it on page responses). Add `<link rel="alternate" type="text/markdown">` in page metadata as the cheaper discovery signal.

6. **Page actions: `MarkdownCopyButton` + `ViewOptionsPopover` (S, human-in-the-loop value).**
   Present in installed `fumadocs-ui`. Gets you "Copy Markdown" and "Open in ..." parity with Vercel/Cloudflare/Supabase for people pasting into a chat. Needs the `.md` route first (item 4). Optionally add an "Open in v0" link per item, but only for items without `cssVars`/`css`/`envVars`.

7. **JSON-LD: `TechArticle` + `BreadcrumbList` on docs pages; optional `WebSite` (no SearchAction) (S, low).**
   Matches what Vercel/Cloudflare/Next.js ship; Breadcrumb and Article are supported Google features. Skip HowTo (discontinued) and `WebSite`+`SearchAction` (sitelinks search box removed). `SoftwareSourceCode` is semantically right for component pages (`codeRepository`, `programmingLanguage`) but no peer ships it and no crawler benefit is evidenced: optional. Do not expect LLM-crawler gains; Bing/Copilot is the only plausible one and is secondhand evidence.

8. **robots/AI policy: keep allow-all; add explicit sitemap (already there) and optionally Content-Signal all-yes (S, low).**
   For a public MIT site there is nothing to block. Explicitly allowing named bots (as Supabase does) is redundant with `User-agent: *`. Only use a route handler for robots.txt if you want the Content-Signal line (UNVERIFIED that `MetadataRoute.Robots` can emit it).

9. **Docs MCP endpoint via `npx @fumadocs/cli feature mcp` (M, low for now).**
   Extra deps (`@modelcontextprotocol/server`, `zod`), a public endpoint to maintain, and shadcn MCP already covers install flows. Revisit when there are enough pages that search matters. Same for `/.well-known/skills/index.json` and `/.well-known/ai-catalog.json`: peers do them, no evidence of consumers, defer.

10. **Directory listing at shadcn registry index (M, discovery).**
   Gets `shadcn add @crisp/<item>` working without user config and surfaces crisp-ui in `shadcn search`. Requirements include a flat `/registry.json` and `/<item>.json` layout at the root and no `content` in the index `files`; crisp's JSON lives under `/r/`, so check whether a URL template with `/r/` is acceptable before investing (UNVERIFIED).

---

## 4. Unverified / open questions

- Whether any major LLM crawler (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) reads llms.txt: no primary vendor statement found; study numbers come from secondary blogs I could not trace to the original studies. Whether coding agents (Cursor, Claude Code, Windsurf) auto-fetch it is blog-reported only.
- Names of the individual tools the shadcn MCP server exposes (docs page lists capabilities, not tool names).
- Exact Fumadocs release that introduced `llms().page()/full()/renderPage`; confirmed only that 16.10.5 lacks it and 16.15.x docs show it. Also unverified: whether `getLLMText` is still a recommended helper.
- Whether `MetadataRoute.Robots` in Next 16.3 can emit `Content-Signal`.
- Whether skills.sh requires a specific repo layout/registration step for discovery; page did not say.
- Whether the shadcn directory accepts a registry whose items live under `/r/`.
- Bing/Copilot using schema.org markup: reported by SEO sites, no primary source fetched.
- Stripe/Supabase llms-full.txt existence not probed; Mintlify/GitBook-hosted sites not examined; Stripe JSON-LD absence is based on a string grep of one page.
- Anthropic docs: no docs-MCP server confirmed; no JSON-LD found on the one page checked.
- Next.js `ai-catalog.json` format: not validated against any spec, adoption by clients unknown.
- Current output of the repo's existing `/llm` route for crisp pages was not run (read-only, nothing started); I only read its source.
- Cursor `.cursorrules` deprecation status on Cursor's side.
- My probes are a single-day snapshot; headers/behavior of third-party sites may change.
