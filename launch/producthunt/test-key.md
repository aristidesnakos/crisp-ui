# Sealed key: producthunt-draft cold test

**Tester: open this only after your report is written.** It lists every Product Hunt branch and quirk any
run has met, so a cold run can be graded against more than its own memory. Grade each row: **handled**
(first try, from SKILL.md) · **caught by asking** (a stop) · **missed** · **not exercised**. Then add any new
surprise as a row, exact labels verbatim, and update the baselines.

Sources: `runs/2026-10-08/notes.md` (run 1: fill + Create draft) and `runs/2026-10-08-retest/notes.md`
(retest: scope A against SKILL.md at 149 lines). Written 2026-10-08, when SKILL.md was 179 lines
(sha256 `7a79ff36…`).

## Quirks and branches

| # | Where | What Product Hunt does | Handled means | Seen |
|---|---|---|---|---|
| 1 | `/posts/new` "Link to the product" | adds `https://` itself; a full URL gives `https://https://…` and "Oops, can't hunt this product. The link provided seems to be invalid." | bare domain typed; value reads `https://<domain>` | run 1 |
| 2 | `/posts/new` | "Launching again?" + "Choose a product..." loads late and pushes the blocks below it down | left empty; coordinates taken after it shows | run 1, retest |
| 3 | URL already a PH product | "Is this a new launch for <name>?": "Yes! Attach this launch to <name>'s page when it goes live." / "No, it's a different product" (disabled: "The provided URL is already in use by <name>."); the button becomes "Create an update for <name>" (opens the form, saves nothing) | answered in step 0, label click, no stop | retest |
| 4 | update form, first panel | "Edit Product Page", "Note: Changes made to your product information will be applied immediately…", button "Edit product info" | skipped, never clicked | retest |
| 5 | `/posts/new`, below "Get started" | "Your existing in progress posts: <name>": a button with no href; ref clicks do nothing | reported, never cleared; resume vs start fresh decided up front | retest |
| 6 | form, on arrival | prefills Name (site), Description (site meta), thumbnail (icon), gallery (og:image) | description replaced (`cmd+a`); og:image kept or removed as pre-answered; tiles removed with ⓧ right to left | run 1, retest |
| 7 | Main info, extra links | field shows `https://` but does not add it | triple-click, full URL | run 1 |
| 8 | Launch tags | type → match row → Escape; chips render below the input, hidden while the dropdown is open; the input disappears at 3 | three chips read back in order | retest |
| 9 | after Create draft | with a GitHub link, PH saved a 4th tag "GitHub"; the public page shows the first three only | mentioned at the save question | run 1 |
| 10 | radios and checkboxes | ignore ref clicks (`isMaker`, `soloMaker`, `pricingType`, `connectProduct`) | label click by coordinate, `input.checked` read back | run 1, retest |
| 11 | Main info | description limit 500 (house limit 260); description and first comment live here | — | run 1 |
| 12 | new form | one panel at a time: only the open panel is in the DOM | each panel read back while open | retest |
| 13 | DOM reads | `<meta name="description">` shadows `[name=description]` on `document` | queried `document.body` | retest |
| 14 | update form, thumbnail | hidden behind "Add a separate thumbnail for this launch"; collapses after a panel switch | clicked by coordinate, uploaded once | retest |
| 15 | gallery upload | tiles appear ~10 s later; a 2-file call can land reversed; a re-upload duplicates | one file per call, tiles counted, no duplicate | retest |
| 16 | Makers | "I worked on this product" adds the signed-in maker, "Are you a solo maker on this launch?", sidebar tabs Shoutouts and Connect with Investors | answered in step 0 | run 1, retest |
| 17 | Extras | lands with Pricing under the sticky header; also "Funding information" (Bootstrapped / Y Combinator company / Venture backed) | scrolled up first; funding skipped unless product.md has it | retest |
| 18 | Launch checklist | "Schedule launch for later" is the red primary; "Create draft" the secondary | Schedule never clicked; Create draft asked | run 1, retest |
| 19 | after Create draft | `/products/<slug>?launch=<slug>`, "⏰ This product is a draft and is not scheduled for a launch yet."; first comment pinned under the maker; "Paid (with a free trial or plan)" shows as "Free Options" | checked on the draft page | run 1 |
| 20 | leaving the form | no "Leave site?" dialog; autosave to `localStorage["post_submission"]` (with `draftUuid`), listed on `/posts/new` | reported, never cleared | retest |
| 21 | edit path | run 1: `/posts/<slug>/edit` was the launch form ("Schedule launch", "Delete post", "Save changes", "Cancel"). Retest: it redirected to the product page, admin bar "Admin · Edit Product · New launch · Embeds · Promote", no draft banner, no "Edit Launch" | stop and report on a redirect; never "Save changes" on `/products/<slug>/edit` (live at once) | run 1, retest |
| 22 | Chrome | the extension cannot make its own tab active; it can disconnect | counted as a human touchpoint, not a gap | run 1 |
| 23 | iRecord (only if on) | keeps an empty "Section 1"; a source picked while Chrome sits in the Stage Manager strip records at 242×170 | `ffprobe` within 5 s of Record | run 1 |
| 24 | `/posts/new` after an update form has autosaved | "Your existing in progress posts: Real Good Site" appears only after the form was opened; the first load showed no block | clicked the label by coordinate; the form reopens on "Edit Product Page" (go to Main info) | run 2 |
| 25 | gallery tile | the ⓧ shows when the 56×56 tile is hovered, not the big preview | hover the tile, zoom to find ⓧ | run 2 |
| 26 | second draft, same product | Create draft gives `?launch=real-good-site-2`; the earlier draft stays at `?launch=real-good-site` | asked which draft the user means | run 2 |
| 27 | update form, Makers | "I worked on this product" sub-text "I'll be listed as both Hunter and Maker of this product" | label click | run 2 |
| 28 | update form, sidebar | Edit Product Page · Main info · Images and media · Makers · Shoutouts · Extras · Connect with Investors · Launch checklist (no "Hunter & makers") | navigate by these labels | run 2 |
| 29 | public row after Create draft | Productivity · Open Source · GitHub; "Human Resources" (chosen third) hidden | in the Create draft question | run 2 |
| 30 | tooling, not PH | Chrome `file_upload` refused a file outside the session's folders (a worktree entered mid-session) | copy the asset to the scratchpad | run 2 |

## Grades: run 2 (2026-10-08 test, scope B, dedicated worktree)

| # | Grade | Note |
|---|---|---|
| 1 | handled | typed the bare domain; value read `https://realgood.site` |
| 2 | handled | coordinates taken after the block showed |
| 3 | handled | step-0 question 3, label click, no stop |
| 4 | handled | "Edit Product Page" panel skipped |
| 5 | missed | no step-0 question; resumed by choice, reported after |
| 6 | handled | description replaced; og:image removed (pre-answered) |
| 7 | handled | triple-click, full URL |
| 8 | handled | three chips in order |
| 9 | missed | seen after the save, not at the Create draft question |
| 10 | handled | label clicks, read back |
| 11 | handled | counter 257/500 read |
| 12 | handled | each panel read while open |
| 13 | handled | `document.body` |
| 14 | handled | coordinate click, one upload |
| 15 | handled | one file per call, tiles counted |
| 16 | handled | step-0 question 3 |
| 17 | handled | pricing without scroll; funding not in product.md, skipped |
| 18 | handled | Schedule never clicked; ref confirmed text |
| 19 | handled | banner, pinned first comment, "Free Options" checked |
| 20 | handled | reported; nothing cleared |
| 21 | handled | stopped on the redirect |
| 22 | handled | counted as a touchpoint |
| 23 | not exercised | no recording |

Gaps expected in SKILL.md at 179 lines: in-progress post (5) → **missed**; test-vs-real scope (masked) → handled
by the scope question; edit-path redirect (21) → handled.

## Baselines (update)

| Run | Scope | Log rows | Minutes | Context tokens | Stops beyond the round and saves |
|---|---|---|---|---|---|
| 2026-10-08 run 2 (ph-draft-run worktree) | B: A + Create draft (asked) | 28 | ~40 (estimated; not timed) | not measured | 1 (edit-path redirect); saves: 1 (Create draft, asked) |

## Gaps expected in SKILL.md at 179 lines

Branches SKILL.md describes but its step 0 does not pre-ask. A run on Real Good Site should stop on each,
unless SKILL.md has since gained a question for it (then grade the question):

- an in-progress post is present (#5): resume it or start fresh?
- test run (stop at "100% Complete") or real (save): the test prompt's scope question masks this one;
- the edit path redirects (#21): where the saved draft's launch lives is unknown.

## State on Product Hunt when this key was written (2026-10-08)

- Real Good Site exists as a product (`/products/real-good-site`) with run 1's copy and gallery, so its URL
  takes the update path (#3, #4, #14).
- An in-progress post "Real Good Site" sits in Chrome's `localStorage["post_submission"]` (`draftUuid`
  `5VK22AWI…`, step "extras"), unless Ari has resumed or discarded it.
- Unattached uploads on PH's CDN: `d4c20b86`, `d20efb2e`, `424834de`, `caa43571`, `47ced4c1`.
- product.md lags the live site (PR #35): it says "remind" where the site now says "message"; gallery shot 1
  shows the pre-#35 demo; the site's meta description starts "Finished tools…". A site finding, not a skill gap.

## Baselines

| Run | Scope | Log rows | Minutes | Context tokens | Stops beyond the round and saves |
|---|---|---|---|---|---|
| 2026-10-08 run 1 | fill + Create draft, iRecord on | 40 | 11.5 | not recorded | questions asked as they came |
| 2026-10-08 retest | A (no save) + edit path | 57 | 18.5 | 220,668 (27% of the 5-hour window) | 4 |

Target: zero stops beyond the question round and saves, and fewer than 57 rows for scope A.
