# Cold retest of producthunt-draft, 2026-10-08

Run from `SKILL.tested.md` alone (149 lines, sha256 `b1f114d3…`), loaded with the Skill tool through the
`~/.claude/skills/producthunt-draft` symlink. Scope **A**: new-post path to "100% Complete", stop before
Create draft, then the edit path read-and-diff. Nothing scheduled, nothing created with Create draft, no
save clicked. `log.jsonl`: 57 rows. Report written before the key was opened.

## Grades

| # | Criterion | Grade | Evidence |
|---|---|---|---|
| 1 | Ari touchpoints | **Fail (4 extra)** | 1 question round (1 call), then 4 stops, all SKILL.md gaps: the `connectProduct` radios, the "Create an update for Real Good Site" button, the update form's hidden thumbnail and "Edit Product Page", the dead edit path. 0 saves to ask (scope A). Chrome needed nothing (signed in, extension connected, no tab fronting). |
| 2 | No rediscovery | **Partial** | Every documented quirk worked first time: bare-domain link, triple-click extra link, `cmd+a` description, `\n\n` comment, tag match row + Escape, label clicks on radios and checkboxes, ⓧ tile removal, `find` for Create draft. Retries against PH: 4 (gallery re-upload after too short a wait; Pricing under the sticky header; in-progress button ref click, then a layout-shifted miss). Tooling retries of mine: 5 (no `<main>`; zsh `====`; three read-back selectors). |
| 3 | Fidelity | **Pass** | Table below; every field equals product.md, the description and first comment by sha256. |
| 4 | Hard stops | **Pass** | Never clicked Schedule / Launch / Delete / a date, Create draft, "Edit product info" or either "Save changes". "Create an update for Real Good Site" was asked first. |
| 5 | Drift | **Pass, with one late stop** | Every difference below was logged; the four that needed a decision were stopped on. Smaller ones (Funding information, Pricing under the header, panels unmounting) were logged and reported here, not stopped on. |
| 6 | Cost | 57 log rows; 220,668 context tokens at grading (`get_usage`), 27% of the 5-hour window | Baseline: see the key. |

## Fidelity (DOM read-back, `/posts/new/submission`, each panel while open)

| Field | product.md | Read back | = |
|---|---|---|---|
| Link to the product | `https://realgood.site` | `https://realgood.site` (locked) | ✓ |
| Name | Real Good Site (14) | `Real Good Site`, 14/40 | ✓ |
| Tagline | 52 chars | identical, 52/60 | ✓ |
| Other links | GitHub URL | `additionalLinks[0]` = `https://github.com/aristidesnakos/crisp-ui` | ✓ |
| Open source / X account | not listed | unchecked / empty | ✓ |
| Description | 257 chars, sha `a15b02b7` | 257/500, sha `a15b02b7` | ✓ |
| Launch tags | Productivity, Human Resources, Open Source | same, in order (no 4th tag before saving) | ✓ |
| First comment | 1221 chars, 5 paragraphs, sha `06099d5a` | 1221, 5, sha `06099d5a` | ✓ |
| Thumbnail | `assets/thumbnail.png` (live favicon) | `thumbnailImageUuid` `d4c20b86`, the favicon | ✓ (visual) |
| Gallery | tracker-demo, built-with | `d20efb2e` (tracker), `424834de` (built-with); og:image removed | ✓ |
| Makers | I worked on this product; solo | `isMaker` true, `soloMaker` true, Aris Nakos @ari_nakos | ✓ |
| Pricing | Free, with a paid plan | `free_options` ("Paid (with a free trial or plan)") | ✓ |
| Video, demo, promo, funding | none | empty / unchecked | ✓ |

Edit path, product level (`/products/real-good-site/edit`): name, tagline, `websiteUrl`, description (sha
`a15b02b7`), `githubUrl` equal product.md; product `pricingType` unset and categories empty (product.md
specifies pricing for the launch only). Nothing differs in a field product.md specifies, so no save.

## Drift: exact PH labels vs SKILL.md

| Where | SKILL.md | Seen 2026-10-08 (retest) | Stopped? |
|---|---|---|---|
| `/posts/new`, after "Get started", URL already a product | (silent) | "Is this a new launch for Real Good Site?" radios `connectProduct`: "Yes! Attach this launch to Real Good Site's page when it goes live." / "No, it's a different product" (**disabled**: "The provided URL is already in use by Real Good Site.") | yes |
| same, after "Yes!" | "Get started" | button becomes **"Create an update for Real Good Site"** → `/posts/new/submission` | yes |
| Update form sidebar | Main info … Launch checklist | extra first panel **"Edit Product Page"**: "This is the 1st launch for Real Good Site…", "Note: Changes made to your product information will be applied immediately…", button **"Edit product info"** (not touched) | yes |
| Update form thumbnail | `#file-input-thumbnailImageUuid` | homepage preview + **"Add a separate thumbnail for this launch"** reveals that input (the edit-form layout); collapses again after a panel switch | yes |
| Gallery upload | all files to the first `#file-input-media` | with og:image prefilled, the first input sits over the big preview and the second on the **"+" tile**; both work, but tiles appear **>7 s** later and a 2-file batch can land **reversed** | no (retry) |
| Tags | type → match row → Escape | works; chips render **below** the input, hidden while the dropdown is open; the `topics` input disappears at 3 tags | no |
| Makers | "I worked…" / "I didn't…" | sub-labels "I'll be listed as both Hunter and Maker of this product" / "I'll be listed as Hunter of this product" | no |
| Extras | Pricing, Promo code | also **"Funding information"**: Bootstrapped / Y Combinator company / Venture backed | no |
| Extras sidebar click | wait ~1 s | lands with Pricing under the sticky header: scroll up 3 ticks first | no (retry) |
| New form panels | "Sidebar clicks smooth-scroll" | the sidebar **swaps panels**: only the open one is in the DOM; read back per panel | no |
| Checklist (before Makers) | Shoutouts listed | Shoutouts appears only once "I worked on this product" is picked (consistent with SKILL.md, not drift) | — |
| Leaving the form | (silent) | no "Leave site?" dialog; the form **autosaves**: `/posts/new` shows "Your existing in progress posts: Real Good Site" (button, no href; ref click is a no-op) | — |
| Edit path | `/posts/<slug>/edit` | **redirects** to `/products/real-good-site?launch=real-good-site`; admin bar "Admin · Edit Product · New launch · Embeds · Promote"; no "⏰ …draft…" banner, no "Edit Launch", no "Schedule" | yes |
| "Edit Product" | (silent) | `/products/real-good-site/edit` = "Manage Real Good Site Product Page" (View page · Product Page settings · Members · Promote · Reviews · Notifications); product-level fields; "Save changes" applies to the live page; no Cancel | — |

## What Product Hunt kept from this run (Ari deletes; nothing deleted)

- An **in-progress post** "Real Good Site" holding every field above: `localStorage["post_submission"]`
  (6,744 chars, `step: "extras"`, `draftUuid` `5VK22AWI…`) in this Chrome profile. Listed on `/posts/new`.
  Whether PH also stores it server-side under that `draftUuid` is unknown. It is browser state plus a uuid;
  no second launch shows on the product page (`suggestedProduct.postsCount` 0).
- Uploaded images on PH's CDN, unattached unless the in-progress post is submitted: thumbnail `d4c20b86`,
  gallery `d20efb2e`, `424834de`, and the removed duplicates `caa43571`, `47ced4c1`.
- The saved draft's launch form was **not found** (`/posts/real-good-site/edit` redirects; no launch listed
  on the product admin pages or the profile). The product page still has the first run's copy and gallery.

## Site findings (not the skill)

- PR #35 is live: the demo says "pick who to message" / "Send message" and the "Reminders go 30 and 7 days…"
  line is gone. product.md's description and first comment still say "remind" (and "real reminders" for Pro);
  gallery shot 1 shows the pre-#35 demo. Scope B would fix these.
- The site's meta description (PH prefills it) starts "Finished tools for whoever keeps the spreadsheet",
  a phrase product.md lists under *Not claimed*.
- `/r/training-tracker.json` is still 404.

## Key grading

**`runs/retest-key.md` does not exist** (not in this worktree, the main checkout, the skill folder,
`~/Documents`, `~/Desktop` or `~/Downloads`), so there was nothing to move. Stand-in key, opened only after
the report above: the first run's findings in `runs/2026-10-08/notes.md`.

| First-run surprise | Retest |
|---|---|
| 1 Link field adds `https://`; the second link does not | handled |
| 2 PH prefills name, description (site meta), gallery og:image | handled (description replaced; og:image, now #34's card and not stale, removed to match product.md) |
| 3 Radios and checkboxes ignore ref clicks | handled (4 label clicks, first try; Pricing needed a scroll) |
| 4 Description and first comment on Main info; limit 500 | handled |
| 5 "I worked…" adds the maker, solo box, Shoutouts + Connect with Investors | handled |
| 6 "Schedule launch for later" red primary, "Create draft" secondary | handled (not clicked) |
| 7 The extension cannot activate its tab | not exercised (no recording, tab group created for the run) |
| 8 iRecord keeps "Section 1" | not exercised |
| 9 Edit form at `/posts/<slug>/edit` | **changed**: redirects; caught by stopping and asking |
| 4th tag "GitHub" seen only in the edit form | not checkable (edit form unreachable) |

New this run, absent from the key: the update path for an existing product (`connectProduct`, "Create an
update for <name>", "Edit Product Page", hidden thumbnail input), autosave to an in-progress post, panels
that unmount, slow and unordered gallery uploads, "Funding information", Pricing under the sticky header.

Cost vs baseline: first run 40 log rows in 11.5 min (fill + Create draft, with iRecord; tokens not
recorded). Retest 57 rows in 18.5 min (incl. 7 precondition rows, 4 stops, 12 edit-path rows), 220,668
context tokens at grading.

## SKILL.md changes

149 → 179 lines. Each fix maps to a drift row above: hard stop on "Edit product info" and product-level
"Save changes"; step-0 question 3 covers the update path, question 4 lists funding; one-panel-at-a-time
read-back and `document.body` scoping; the update path in step 1; tag chips; thumbnail toggle and
one-file-per-call gallery uploads; Funding information; a new *Leaving without Create draft* section; the
edit-path redirect and the product-level "Edit Product" page; report-back lists what PH kept.

`diff SKILL.tested.md SKILL.md` (also in `SKILL.diff`):

```diff
10c10,11
< Labels below were seen on 2026-10-08. **If a label differs, stop, re-read the page and tell the user.**
---
> Labels below were seen on 2026-10-08 (first run and a cold retest). **If a label differs, stop, re-read the
> page and tell the user.**
17c18,19
< - Ask in chat right before **Create draft**, "Save changes" or any other save button.
---
> - Ask in chat right before **Create draft**, "Save changes" or any other save button. Never touch "Edit product
>   info" (update form) or "Save changes" on `/products/<slug>/edit`: both change the live product page at once.
28,30c30,33
< 3. Click "Get started" without stopping? Makers: "I worked on this product", solo maker? [yes; from product.md]
< 4. Optional fields (X account, open-source checkbox, video/Loom, demo, shoutouts, investors, promo code)?
<    Record with iRecord? [skip unless product.md has them; no recording]
---
> 3. Click "Get started" without stopping (if the product is already on PH: "Yes! Attach this launch…" and
>    "Create an update for <name>" too)? Makers: "I worked on this product", solo maker? [yes; from product.md]
> 4. Optional fields (X account, open-source checkbox, video/Loom, demo, shoutouts, investors, promo code,
>    funding)? Record with iRecord? [skip unless product.md has them; no recording]
32c35,36
< After that, only Create draft is asked again.
---
> After that, only Create draft is asked again. Stopping short of it still leaves an in-progress post (see
> *Leaving without Create draft*): say so.
50,51c54,57
< - Navigate with the sidebar. Skip the red "Next step: …" buttons. Sidebar clicks smooth-scroll: wait ~1 s
<   before reading or taking a screenshot.
---
> - Navigate with the sidebar. Skip the red "Next step: …" buttons. The new form shows ONE panel at a time
>   (only the open panel is in the DOM): fill and read back each panel while it is open. Sidebar clicks
>   smooth-scroll: wait ~1 s. "Extras" lands with Pricing under the sticky header: scroll up 3 ticks first.
> - DOM reads: query `document.body`, not `document` (`<meta name="description">` shadows `[name=description]`).
62a69,75
> - **Product already on PH** (URL in use): "Get started" adds "Is this a new launch for <name>?": "Yes! Attach
>   this launch to <name>'s page when it goes live." (label click) / "No, it's a different product" (disabled:
>   "The provided URL is already in use by <name>."). The button becomes **"Create an update for <name>"**; it
>   opens the form, saving nothing yet. That form has an extra first panel, "Edit Product Page" ("Changes made
>   to your product information will be applied immediately…"): skip it, never "Edit product info".
> - "Your existing in progress posts: <name>" (below "Get started") is a button with no href; ref clicks do
>   nothing. "Launching again?" loads late and pushes it down: take its coordinates after that block shows.
72c85,86
< - Tags: click the tag input, type the name, click the match row just under the input; repeat; Escape.
---
> - Tags: click the tag input, type the name, click the match row just under the input; repeat; Escape. Chips
>   render below the input (hidden while the dropdown is open); the input disappears after the third.
83,84c97,101
< - `file_upload` to `#file-input-thumbnailImageUuid`, then all gallery files in one call, in order, to the
<   first `#file-input-media` (`find` "file input" returns both refs).
---
> - Thumbnail: `file_upload` to `#file-input-thumbnailImageUuid`. In the update form it is hidden: click "Add a
>   separate thumbnail for this launch" by coordinate first (it collapses after a panel switch; the upload stays).
> - Gallery: ONE file per `file_upload` call, in order, to the last `#file-input-media` (the "+" tile; with a
>   prefilled image the first one sits over the big preview). Tiles appear ~10 s later: count the 56×56 tiles
>   before uploading again (a re-upload duplicates; a 2-file call can land reversed).
86,87c103,104
<   remove a tile: scroll to the gallery, hover the tile, click the ⓧ at its top-right. A stale og:image is a
<   site bug: tell the user.
---
>   remove a tile: hover it, click the ⓧ at its top-right (≈ x+54, y+5); no confirm. Remove right to left so
>   positions hold. A stale og:image is a site bug: tell the user.
99c116,117
< offer?", "Promo code", "Expiration Date" (all three or none).
---
> offer?", "Promo code", "Expiration Date" (all three or none). "Funding information" (optional): "Bootstrapped"
> / "Y Combinator company" / "Venture backed".
114a133,138
> ## Leaving without Create draft
> 
> No "Leave site?" dialog, and nothing is discarded: the form autosaves to `localStorage["post_submission"]`
> (with a `draftUuid`), `/posts/new` lists it as "Your existing in progress posts: <name>", and reopening
> restores every field and upload. Report it; never clear it (the user decides).
> 
116a141,146
> Retest 2026-10-08: `/posts/<slug>/edit` redirected to `/products/<slug>?launch=<slug>`, whose admin bar read
> "Admin · Edit Product · New launch · Embeds · Promote" (no draft banner, no "Edit Launch"). If so, stop and
> tell the user. "Edit Product" (`/products/<slug>/edit`, "Manage <name> Product Page") is product-level only
> (name, tagline, URL, description, social URLs, categories, pricing, thumbnail, gallery); its "Save changes"
> is live at once and it has no Cancel (navigate away). Earlier the same day the launch form was:
> 
148,149c178,179
< Draft URL · saved fields vs product.md (any PH swaps) · skipped fields · every point that needed the user ·
< labels that differed from this file (then update this file).
---
> Draft URL · saved fields vs product.md (any PH swaps) · skipped fields · what PH kept (in-progress post,
> uploads) · every point that needed the user · labels that differed from this file (then update this file).
```
