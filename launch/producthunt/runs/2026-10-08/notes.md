# Run, 2026-10-08 13:29–13:41

Real Good Site saved as a Product Hunt **draft**:
https://www.producthunt.com/products/real-good-site?launch=real-good-site
("This product is a draft and is not scheduled for a launch yet."). Every action is in `log.jsonl`
(40 rows, clock times local); step screenshots are in `screenshots/` (`sN-…` = iRecord Section N).

## Result against product.md

| Field | Saved |
|---|---|
| Link | https://realgood.site (+ https://github.com/aristidesnakos/crisp-ui) |
| Name / tagline | Real Good Site / Know who's done it, chase who hasn't, prove it later (52/60) |
| Description | product.md text, 257/500 (PH pre-filled the site meta description; replaced) |
| Launch tags | Productivity, Human Resources, Open Source **plus "GitHub"**, a 4th tag PH added (likely from the GitHub link). The public page shows only the first three (Productivity, Open Source, GitHub), which first looked like HR was dropped; the edit form (`/posts/real-good-site/edit`) has all four (validator, confirmed). |
| Thumbnail / gallery | assets/thumbnail.png; gallery tracker demo, Built with (the auto-filled og.png removed) |
| First comment | product.md text, 1221 chars, pinned as Maker on the draft page (not shown in the edit form) |
| Makers | "I worked on this product", Aris Nakos @ari_nakos, solo maker ticked (Ari) |
| Pricing | Paid (with a free trial or plan); the public page labels it "Free Options" |
| Not set (optional) | X account, open-source checkbox, video/Loom, interactive demo, shoutouts, investors, promo code |

## Video: unusable

All 7 takes are 242×170: a black frame with a thumbnail-size Chrome in one corner. The capture source was
picked while Chrome sat in the Stage Manager strip ("delivers 403 of 403 pt wide"); moving Chrome on stage
before Record did not resize the stream, and no take was checked until after Stop. Ari chose to skip the
video and build the skill from this log and the screenshots.
Fix (in the skill): pick the source only after Chrome is on stage, and `ffprobe` the growing take ~5 s after
Record; under 1000 px wide → Stop and redo.

## Findings (all in the skill)

1. "Link to the product" adds `https://` itself: typing a full URL gave `https://https://…` → "Oops, can't hunt
   this product. The link provided seems to be invalid." Type the bare domain. The *second* link field does not
   add it: type the full URL there.
2. PH pre-fills Name (from the site), Description (site meta, 201 chars) and the gallery (the site's og:image).
   realgood.site's `og.png` still shows the old crisp-ui brand → removed from the gallery; fix tracked separately.
3. Radios and checkboxes ignore ref clicks (isMaker, pricingType stayed unchecked). Click the label text by
   coordinate, then verify `input.checked` in the DOM.
4. Description and first comment live on **Main info**, not separate steps; Description limit is 500, not 260.
5. Ticking "I worked on this product" auto-adds the signed-in maker, a "solo maker" checkbox, and two sidebar
   tabs: Shoutouts, Connect with Investors.
6. Launch checklist: "Schedule launch for later" is the red primary button; "Create draft" is secondary.
   No separate preview step.
7. The extension cannot make its tab the active one (new tabs open in the background); Ari clicked it.
8. iRecord's plan sheet (and "Replace Plan") always keeps the default "Section 1"; used as pre-roll.
   "Plan next lecture…" opens the series' next blank recording, which was the pilot's.

9. Editing a saved draft is a different form: `/posts/<slug>/edit` (the "Edit Launch" link ignores ref clicks;
   navigate instead), one long page, sidebar Main info · Images and media · Hunter & makers · Shoutouts · Extras ·
   Connect with Investors, no first comment, no thumbnail input, buttons "Schedule launch" (top), "Delete post",
   "Save changes", "Cancel". Found by the read-only validation subagent.

## Where the run needed Ari

Reconnect the Chrome extension; activate the extension's tab; answer gallery/hero/"Get started"/Pro-price,
solo maker, Create draft, tags, edit and validation questions. All but Create draft were foreseeable and now
sit in the skill's up-front question round.
