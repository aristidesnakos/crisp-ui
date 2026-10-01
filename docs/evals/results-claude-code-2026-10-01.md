# Eval results: Claude Code, 2026-10-01

Protocol: [README.md](./README.md). Agent: Claude Code 2.1.x, default model, fresh headless session with no user skills, hooks, memory or MCP. Project: `create-next-app` (Next 16.3, Tailwind 4) plus `shadcn init --defaults`. Registry served locally and the prompt's origin rewritten to match.

## Runs

Only one prompt has been run. The rest are paused until spend is approved (a run cost about $6).

| Prompt | Sector | Agent finished | Typecheck | Lint | Deps added | Read installed files first | Turns | Cost | Time |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `data-table` | manufacturing | **No**: stopped at the $6 budget cap while re-running its final checks | pass | pass, **only after the agent switched a rule off** | none | yes (2 of 2) | 69 | $6.04 | 13.1 min |

Behaviour checks (keyboard, names, view change) were not graded by hand for this run; the agent reported checking the DOM for checks 3 and 4. Treat the run as inconclusive on the acceptance checks and conclusive on the install findings below.

## Findings

1. **Installed components failed lint in a stock project.** `react-hooks/set-state-in-effect` (Next 16's default config) reported 5 errors across `confirm-send`, `data-table`, `save-bar` and `alert-rules`. The agent could only get "lint passes" by adding an override to `eslint.config.mjs`. Reproduced on a clean install without an agent. **Fixed** in PR 25; each component now uses the React-documented alternative to an effect, and the behaviour was re-checked in a browser.
2. **Two items imported themselves after install.** `lib/alert-rules.ts` and `lib/calibration-desk.ts` shared a basename with a component; the stock CLI rewrote imports of the lib file to the component (TS2303/TS2459). Found while verifying finding 1. The CI smoke test only typechecks `status-notify`, so it never saw this. **Fixed** in PR 25 by renaming to `alert-rules-lib.ts` and `calibration-desk-lib.ts`.
3. **Cost.** A single-pattern prompt took 69 turns and about $6. Cost per turn was not broken down. In its first 22 tool calls the agent read Base UI checkbox typings and Next's bundled docs, which may relate to finding 5 but is not shown to be the main cost.

## Open

4. `calibration-desk.tsx` has 6 React Compiler lint errors on a stock install (a `setState` in an effect, a mutated `useState` value, four "existing memoization could not be preserved").
5. `data-table` fails typecheck against the Base UI checkbox: `shadcn init --defaults` now generates the `base-nova` style, and the component assumes Radix's `checked: boolean | "indeterminate"`. Every item should be checked against both styles.
6. The smoke test should typecheck and lint **every** item, not only `status-notify`; that would have caught 1, 2, 4 and 5.

## Not measured

Other agents; more than one run per prompt; the whole-arc prompt; any behaviour check by hand.
