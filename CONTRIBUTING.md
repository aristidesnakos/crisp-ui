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

## Rules for registry items

- Use the standard shadcn tokens (`primary`, `muted`, `border`) and no hard-coded colours, so items follow the host project's theme.
- Import only from `@/components/ui/*`, `@/lib/*`, other crisp items, and packages listed in the item's `dependencies`. Anything else will not exist in a consumer's project.
- Keep pure logic in `lib/` and cover it with a test in `apps/v4/tests/`.
- Do not fork or publish the `shadcn` npm packages; consumers use the stock CLI.
