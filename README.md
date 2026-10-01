<p align="center"><img src="apps/v4/public/icon.svg" alt="" width="72" height="72"></p>

# crisp-ui

Reusable dashboard patterns as a [shadcn registry](https://ui.shadcn.com/docs/registry). Each one is a piece of a real admin dashboard, extracted so you can copy it into your own project with the stock `shadcn` CLI.

There is no package to upgrade: you install the source and own it.

## Items

| Item               | What it is                                                          |
| ------------------ | ------------------------------------------------------------------- |
| `status-notify`    | The whole status-and-notify pattern, wired together                 |
| `status-strip`     | Headline number, segmented bar, legend and an action slot           |
| `recipient-roster` | One list of people with a switch per channel                        |
| `confirm-send`     | Click, confirm with the count, send, "Sent to N"                    |
| `save-bar`         | "Unsaved changes" with Discard and Save, hidden when clean          |
| `notify-envelope`  | Pure helpers: roster from lists, list comparison, one-message To/Cc |
| `audit-timeline`   | Read-only "who did what, when, and why" list, grouped by day        |
| `audit-event`      | The `AuditEvent` type and pure helpers for building and grouping    |
| `alert-rules`      | Editor for reminder cadence, escalation and quiet hours             |
| `alert-rules-lib`  | Pure helpers: validate a rule, quiet-hours check, reminders due     |

```bash
npx shadcn@latest add https://<your-domain>/r/status-notify.json
```

## Develop

Requires Node 20.9+ and pnpm.

```bash
pnpm install
pnpm dev             # docs site on http://localhost:4000
pnpm registry:build  # writes apps/v4/public/r/<name>.json
pnpm typecheck && pnpm lint && pnpm test
pnpm build
```

Registry items are declared in `apps/v4/registry-crisp.template.json` and their source lives in `apps/v4/registry/crisp/`. Cross-item dependencies are absolute URLs, so set `CRISP_REGISTRY_ORIGIN` (or deploy on Vercel, which sets `VERCEL_PROJECT_PRODUCTION_URL`) to the origin the registry is served from before building for production.

## Attribution

crisp-ui is a fork of [shadcn/ui](https://github.com/shadcn-ui/ui) and keeps its MIT licence. The docs shell and registry format are theirs; the items under `apps/v4/registry/crisp` are ours. See [LICENSE.md](./LICENSE.md).
