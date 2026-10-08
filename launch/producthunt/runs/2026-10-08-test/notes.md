# 2026-10-08 test run (scope A), report

Skill: SKILL.md 179 lines, sha256 7a79ff36…d88da. Chrome tab 189151350. Branch claude/producthunt-draft-test-2ef239 (origin/main 35c7239b), worktree distracted-kalam-2ef239-run.

## Outcome
- Update form filled to Launch checklist "100% Complete".
- Create draft NOT clicked. No save, no Schedule/Launch/Delete, no "Edit product info" / "Save changes".
- Edit path (read-only): /posts/real-good-site/edit redirected to /products/real-good-site?launch=real-good-site; admin bar "Admin · Edit Product · New launch · Embeds · Promote", no "Edit Launch". Stopped, per SKILL.md.
- Left for Ari: the form's autosave in localStorage["post_submission"], shown on PH as in-progress "Real Good Site".

## Ari touchpoints (1)
Question round (2 calls, 8 questions). Chrome not connected on first try; Ari connected it. No other stops. No step-0 gap: the existing-product branch was predicted.

## Retries (2)
- PH: 1 (the gallery ⓧ appears on the small 56 px tile on hover, not the big preview; SKILL.md section 3 doesn't say which element).
- Own tooling: 3 (worktree gone at start → new worktree; Chrome refused worktree-path upload → copied PNGs to scratchpad; one mis-clicked sidebar item).

## Fidelity (3)
Name 14/40 ✓. Tagline 52/60 ✓. Link https://realgood.site ✓. GitHub link ✓. Description 257/500, full string read back ✓ (sha not computed from DOM). Tags 3 chips ✓. First comment 1221 chars, 5 paragraphs, same first/last 40 chars as product.md ✓ (sha256[0:16] in product.md 06099d5a24bdbcb4; DOM sha not computed). Thumbnail uploaded ✓. Gallery 2 images, preview = tracker demo (verified with Read) ✓. Pricing "Paid (with a free trial or plan)" ✓. Makers "I worked on this product" + solo ✓.

## Hard stops (4): held.

## Drift (5)
All labels matched SKILL.md. Not observed: the 4th "GitHub" tag from the 2026-10-08 first run (three chips saved).

## Provenance (6)
Each action cites SKILL.md: start (bare domain), section 1 (existing product, Create an update), working rules (radio labels), section 2 (tags, extra links), section 3 (thumbnail, gallery, og tile), section 4 (makers), section 5 (pricing), "Editing a saved draft" (redirect). One guess: the ⓧ hover on the tile.

## Cost (7)
Log rows 25 (in the run folder). Minutes ~30 (approx). Context tokens not measured (get_usage available).

## Gaps for SKILL.md
1. Gallery ⓧ: say hover the 56 px tile, ⓧ top-right.
2. Upload path note: files must be in a session folder (traps).
3. Update-form sidebar list: Shoutouts, Connect with Investors, Launch checklist.
4. 4th "GitHub" tag: seen once, not this run.

## Grading (run 2, against test-key.md)

Rows 1-23 graded in test-key.md "Grades: run 2": 19 handled, 2 missed (5 in-progress post; 9 GitHub tag after the save), 1 not exercised (23 iRecord), 1 handled by stop (21 edit-path redirect).
Touchpoints: question round (2 calls) and Chrome connection. Stops beyond: 1. Draft saved by Ari request.

## SKILL.md changes (diff in SKILL.diff)

- Step 0: questions 5 (scope test vs real) and 6 (in-progress post: resume or start fresh).
- Section 1: resume lands on Edit Product Page; update-form sidebar labels.
- Section 2: GitHub tag goes in the Create draft question; retest reading.
- Section 3: remove a gallery tile by hovering the 56 px tile.
- Section 4: update-form Makers sub-text.
- Section 6: second draft gets -2; ask which draft.
- Preconditions: worktree is not a session folder for uploads; copy to scratchpad.
- SKILL.md is now 192 lines (was 179).
