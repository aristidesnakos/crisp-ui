# Contributing

Thanks for helping. crisp-ui is small on purpose: a few dashboard patterns, each installable on its own.

## Setup

```bash
pnpm install
pnpm dev
```

The docs site is `apps/v4`. Item source is in `apps/v4/registry/crisp/{ui,lib,blocks}`, and each item is declared in `apps/v4/registry-crisp.template.json`.

## Before opening a pull request

```bash
pnpm registry:build
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Leaving feedback while the site runs

With `pnpm --filter=v4 dev` running, right-click any section of the site and choose "Dev feedback…". Type a note and press Cmd+Enter. The note and a screenshot of that section are saved to `.claude/dev-feedback.json` (git-ignored). Then ask Claude Code to "address my feedback" and the `iterate` skill in `.claude/skills/iterate/` will read the log, fix each item and mark it resolved. The capture exists only in development: a production build renders no wrapper and `/api/dev-feedback` answers 404. Wrap a new section with `<DevFeedback name="Area.Section">` from `components/dev/dev-feedback.tsx`.

## Rules for registry items

- Use the standard shadcn tokens (`primary`, `muted`, `border`) and no hard-coded colours, so items follow the host project's theme.
- Import only from `@/components/ui/*`, `@/lib/*`, other crisp items, and packages listed in the item's `dependencies`. Anything else will not exist in a consumer's project.
- Give every item `categories`, `meta.stage` (`see`, `decide`, `act`, `confirm` or `record`), `meta.recipe` and a 3 to 8 line `docs` note in the template, then run `pnpm --filter=v4 agent:build` to regenerate `skills/crisp-ui/SKILL.md`, `apps/v4/public/agents-snippet.md` and the snippet copy in `ai.mdx`. A test fails if they are stale.
- A new item shows up in the sidebar by itself, grouped by its `meta.stage` (items with `meta.stageEnd` go under "Whole screens"). Add its docs page to `apps/v4/content/docs/components/meta.json` in story order, and its "comes after / leads to" links to `STORY_MAP` in `apps/v4/lib/story.ts`; `tests/story.test.ts` checks the order and the links.
- Keep pure logic in `lib/` and cover it with a test in `apps/v4/tests/`.
- Do not fork or publish the `shadcn` npm packages; consumers use the stock CLI.

## Brand assets

`brand/mark.svg` is the only hand-edited brand file; its `<style>` block holds the palette. Everything else (`icon.svg`, the favicons, touch and manifest icons) is generated from it:

```bash
node scripts/build-brand.mjs   # needs rsvg-convert and magick (brew install librsvg imagemagick)
```

Commit the regenerated files. The header's inline mark (`apps/v4/components/brand-mark.tsx`) copies the geometry by hand, and `tests/brand-mark.test.ts` fails if it drifts from the source. Judge any change to the mark at 16px, not at 512.

The social card is not a file: `apps/v4/app/opengraph-image.tsx` renders it at build time from the landing hero copy (`heroCopy` in `apps/v4/lib/config.ts`), the fonts in `apps/v4/assets/fonts/` and hex copies of the `--paper` and `--brand` tokens. Open `/opengraph-image` on the dev server to see it; `tests/opengraph-image.test.ts` fails if its colours drift from `globals.css`.
