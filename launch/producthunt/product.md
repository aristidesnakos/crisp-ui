# Real Good Site: Product Hunt submission

Facts and copy for one Product Hunt post. Every claim has a source, and if a source changes, this file is
wrong until it is corrected. Live claims only: anything the site says that is not built or not proven is
listed under *Not claimed*. Checked 2026-10-08 against main `24a36cfc` and the live site.

**Status: DRAFT SAVED 2026-10-08:** https://www.producthunt.com/products/real-good-site?launch=real-good-site (run notes: `runs/2026-10-08/notes.md`). **DRAFT ONLY.** Pro and its one-click setup are not built, and the prices are placeholders. The end
state is Product Hunt's "Create draft". Never Schedule or Launch.

---

## Fields

| Field | Value | Chars / limit |
|---|---|---|
| Link to the product | `https://realgood.site` | |
| Name | `Real Good Site` | 14 |
| Tagline | `Know who's done it, chase who hasn't, prove it later` | 52 / 60 |
| Launch tags (up to 3) | Productivity, Human Resources, Open Source. *Saved as Productivity, Open Source, GitHub: PH swapped HR for GitHub; Ari kept it.* | |
| Other links | GitHub: `https://github.com/aristidesnakos/crisp-ui` | |
| Pricing | Free, with a paid plan (PH's closest option, e.g. "Paid (with a free trial or plan)"; log the label seen) | |
| Makers | "I worked on this product" (Aris Nakos, the signed-in account); solo maker: yes | |
| Thumbnail | `assets/thumbnail.png`, 240×240, from `apps/v4/public/android-chrome-512x512.png` (the live favicon) | |
| Gallery, in order | 1 `assets/gallery-2-tracker-demo.png` · 2 `assets/gallery-3-built-with.png`. Real headless-Chrome shots of https://realgood.site, 2026-10-08, 1270×760 viewport at 2× (2540×1520). No mockups. | |

### Description (≤260)

PH's limit is 500 (form, 2026-10-08); 260 kept as the house limit.

> A training tracker for whoever keeps the spreadsheet. Try it free with made-up people, no sign-up: see
> who's up to date, due or overdue, pick who to remind and see the count before you send. Each send
> lands on the record. Built from open-source (MIT) parts.

### First comment

> Hi Product Hunt, I'm Ari.
>
> Most workplaces have one person who keeps the list: who has done the safety training, whose certificate
> runs out next month, who still hasn't signed. Usually it's a spreadsheet, and the chasing happens by hand.
>
> Real Good Site starts with a tracker for that job. You can try it now with made-up people: type what you
> track and who, see who's up to date, due or overdue, pick who to remind and press Send. It tells you how
> many people it is about to remind before anything happens, and the send lands on a record of who did
> what and when. Nothing is sent or saved in the demo.
>
> It's made from building blocks I've used on my own sites: Setian, MichiKanji, RapidSafeSystems and
> Outbreak Files. The blocks are open source under MIT, with instructions written for AI assistants, and
> there's a complete free example: a calibration recall desk with a two-person sign-off.
>
> What isn't ready yet, said plainly: Pro, which takes the tracker live in your own accounts (sign-in,
> your own database, real reminders) for $149 once per tool, is what I'm building next, along with policy
> sign-offs, approvals, inspections and an incident log. I'd love to hear which list you keep and what it
> should do for you.

---

## Facts, and where they come from

| Claim | Source |
|---|---|
| Name "Real Good Site", URL realgood.site | `apps/v4/lib/config.ts`; `registry.json` `homepage`; live 200 |
| "Know who's done it, chase who hasn't, and prove it later" (tagline, "and" dropped) | `apps/v4/lib/tools.ts` training-tracker `job` |
| "Whoever keeps the spreadsheet" | `apps/v4/lib/config.ts` description; landing eyebrow `app/(app)/(root)/page.tsx` |
| Tracker covers training, certificates, licences | `apps/v4/lib/tools.ts` training-tracker `examples`; tracker page eyebrow |
| Free to try with made-up people, no sign-up, nothing sent or saved | `components/marketing/training-tracker-demo.tsx` footer ("Made-up people… Nothing is sent or saved."); no sign-in exists on the site |
| Up to date / due / overdue | `training-tracker-demo.tsx` StatusStrip segments ("up to date", "due in 30 days", "overdue") |
| Pick who to remind; count shown before send | `training-tracker-demo.tsx` `ConfirmSend` (`count={selected.size}`); `tools.ts` TRACKER_MOMENTS "Every send shows the count first" |
| Each send lands on the record | `training-tracker-demo.tsx` `sent` events prepended to the `AuditTimeline` |
| Building blocks open source, MIT | `LICENSE.md`; pricing page Free plan; every `/r/<item>.json` checked returns 200 (status-strip, confirm-send, audit-timeline, approval-step, alert-rules, data-table, calibration-desk) |
| Instructions written for AI assistants | `/docs/ai` (live 200); `skills/crisp-ui/SKILL.md` |
| Calibration recall desk, complete and free, two-person sign-off | `apps/v4/lib/tools.ts` (status `free`, `job`); `/r/calibration-desk.json` 200 |
| Built with: Setian, MichiKanji, RapidSafeSystems, Outbreak Files | `apps/v4/lib/tools.ts` `SHOWCASE` (Ari-confirmed 2026-10-06). Label is "Built with", never "Trusted by"; never Mangood |
| Policy sign-offs, approvals, inspections, incident log are next | `apps/v4/lib/tools.ts` status `next` ("Coming next") |
| Pro is $149 once per tool, not built yet, being built next | Ari, 2026-10-08 (named in the post by choice); `app/(app)/pricing/page.tsx` Pro `price`/`note` after PR #33 (euros → dollars). The price is still a placeholder |
| Pricing "Free, with a paid plan" | Everything usable today costs nothing; Pro is the named paid plan |
| GitHub link | `apps/v4/lib/config.ts` `links.github`; public (200) |

## Not claimed, and why

| On the site today | Why it stays out |
|---|---|
| "Describe it in plain words and your AI assistant makes it yours" / "Make it yours" | The four-question output tells the assistant to run `npx shadcn@latest add https://realgood.site/r/training-tracker.json` (`components/marketing/make-it-yours.tsx:66`), which is **404** on the live site. |
| "One click sets up sign-in, your database and email reminders" / Pro's feature list | Pro is not built (memory `project_crisp_ui_positioning.md`). The post names Pro and its price only, as not ready. |
| Done for you, from $900 | Placeholder price; not mentioned. |
| "We never store your records" / "never pass through us" | No backend exists yet, so the claim is unproven. |
| "Works with Lovable, Claude and Cursor" | No evals yet. |
| "Saved by the server, not the browser"; "cannot be edited" | The demo's record lives in the browser only. |
| "Meets WCAG AA contrast" | No audit on record to cite. |
| "Finished tools" (plural) | One tool works as a demo; the rest are "Coming next". |

## Decisions (Ari, 2026-10-08)

- Copy and favicon thumbnail approved as written.
- Name Pro at $149 in the post; the site switches to dollars ($0 / $149 / $900) in PR #33.
- Gallery: real shots of the live site, no mockups.
- Landing-hero shot dropped: it shows the live line "Describe it in plain words and your AI assistant makes
  it yours", the claim kept out of the copy above.
- "Get started" may be clicked without stopping; every save, including Create draft, waits for Ari.
