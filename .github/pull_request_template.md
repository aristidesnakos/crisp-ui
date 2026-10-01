## What and why

<!-- One or two sentences. Link an issue if there is one. -->

## Checklist

- [ ] `pnpm registry:build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` pass locally
- [ ] New or changed registry items use standard shadcn tokens and import only from `@/components/ui/*`, `@/lib/*`, other crisp items, and the item's declared `dependencies`
- [ ] Pure logic lives in `lib/` with a test in `apps/v4/tests/`
- [ ] Exported component props are unchanged, or the break is called out below

## Breaking changes

<!-- Delete this section if none. -->
