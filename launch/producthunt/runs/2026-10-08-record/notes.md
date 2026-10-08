# Run 3 (recording run), 2026-10-08: notes for the next SKILL.md revision

Goal: a usable iRecord video of the Product Hunt submission, filled from scratch. Draft secondary.
Answers at step 0: sync copy first, fill to 100% (no save), tags as product.md (4th tag "GitHub"), start fresh.
Updated as the run goes; each line is a candidate change to SKILL.md ("Recording with iRecord" unless noted).

## Step 0 and preconditions
1. **Series choice is a missing step-0 question** (Ari, mid-run): reuse an existing series or make a new one. Check
   first in iRecord Home, list view, "Series" column. Found: "Product Hunt draft" (run 1, 1 recording). "Real Good
   Site on Product Hunt" (named in memory) was not shown; its recording had no series.
2. **"From scratch" is a step-0 answer to record** (Ari, mid-run): empty form, every field filled on camera, no
   resume. `/posts/new` showed no "Your existing in progress posts" this time.
3. **Stale product.md check belongs in step 0**: it still said "remind" and "real reminders" (Ari's no-reminders
   rule, 2026-10-08). Fixed in the worktree after Ari chose "Sync, then fill"; gallery shot 1 re-shot.
4. **Gallery script needs puppeteer-core in cwd.** A fresh worktree has no node_modules. Working fix, no install:
   scratchpad dir with `node_modules/.pnpm` symlinked to the main checkout's store, run
   `node ~/.claude/skills/producthunt-draft/scripts/capture-gallery.cjs shots.json` from that dir. The skill says
   `scripts/capture-gallery.cjs` (relative to the repo, wrong: it lives in the skill folder). Selector that works
   for the tracker demo: `section[aria-label="The training tracker, live"]`, offset 40.
5. Upload assets must be copied to the scratchpad (a mid-session worktree is not a session folder).

## Recording with iRecord
6. **The picker's "delivers N of N pt wide" is the only trustworthy width.** `app_list_windows` said Chrome was
   1280×900 while iRecord read "394 of 394 pt wide" (Chrome in the Stage Manager strip). Retina doubles pt to px, so
   the 1000 px guard is 500 pt: 394 pt would have been caught.
7. **The Window picker is a popover.** AXPress on the "Window" button works in the background; the items inside
   (Full Screen / Window / iPhone, "Choose window…", "All windows…" chevron) are refused ("modal sheet, dimmed
   area"; the chevron's frame starts at x=-13). Picking needs `request_full_control` and display-scope clicks.
8. **Chrome is read tier: its Stage Manager thumbnail cannot be clicked by me.** The user must shift-click it. After
   the user said "Chrome is on stage", iRecord still read 394 pt and my screenshot still showed the strip thumbnail:
   verify with the picker number, never with the user's word alone.
9. **Escape in the New Recording sheet cancels the whole sheet** (back to Home). Do not use it to close the
   popover. Click the "Window" button again to close it.
10. **The picker lists windows by active-tab title.** Load Product Hunt in the extension tab BEFORE picking (Ari,
    mid-run). Before that the window was "New Tab", next to "New Website | DataFast" and several Finder windows
    ("Applications", "Desktop — Local", …).
11. **Home's "Plan a Series" tile is a canvas** (no AX action, background click refused). File → New Recording works
    through `app_menu` in the background. `Recording` menu: Start Recording, Stop Recording, Pause/Resume.
12. **Display-scope typing garbled the first series name** ("aReall Goord Sitee: PH daraft recordring runy").
    After cmd+a and a retype it was clean. Zoom to verify every typed field in iRecord.
13. **"Camera" has no On/Off label** (Mic and System audio do). Untitled Recording 4 (17:37, 3360×2100, 19 s) has a
    `take-001.camera.mp4`: check Camera's real state before recording.
14. **Full control hides non-allowlisted windows** (System Settings, iRecord Dev, WindowManager) while it runs.
    Tell the user; call `release_full_control` when done.
15. 3360×2100 = the 1680×1050 display at 2×. Untitled Recording 4 at 17:37 was a full-display take, not in the
    handoff; unexplained.

16. **iRecord's search field also matches series names.** Typing "Product Hunt" jumps to that series' section with
    "Plan next lecture…". The Home grid is one narrow column and scrolls very slowly (15 ticks ≈ 100 px).

18. **"Plan next lecture…" on an existing series reopens that series' OLDEST unfinished recording** (here run 1's
    "Untitled Recording": Section 1, Pilot A recorded, Pilot B blank), not a fresh one. Recording into it would put
    the new video inside the project Ari means to delete. To reuse a series, plan a NEW recording with the same series
    name (Plan a Series → same name) instead, and say which project the take lands in.

## Fan-out (Ari, mid-run: "instruct to fan out subagents as needed when we are starting this operation")
17. **Add a "Start of the operation" block to SKILL.md that fans out subagents for the read-only prep**, which this
    run did one tool call at a time (~25 calls before iRecord was touched). Design, for reliability:
    - **Fan out (parallel, one message, scoped briefs):**
      a. *Copy-sync agent*: diff product.md against the live site and its source files (labels, claims, counts);
         returns a list of stale lines with file:line evidence. Read-only; the main thread edits and shows the diff.
      b. *Gallery agent*: re-shoot the shots (symlink trick from item 4), check 1270×760 at 2×, ≤2 MB, copy to the
         scratchpad upload folder, return paths and sizes.
      c. *Baseline agent*: `df`, newest takes with `ffprobe`, series names from iRecord's folders on disk
         (not the iRecord UI), the in-progress-post state from the saved draft list in memory/notes.
      d. *After the run: verify agent*: `ffprobe` the final take, extract ~6 frames with `ffmpeg` at even
         intervals into the scratchpad, look at them, report width, duration, size and whether the PH form shows.
    - **Never fan out UI work.** One screen, one Chrome tab, one iRecord window, one cursor: parallel agents would
      race for focus and Stage Manager. Only the main thread drives iRecord and the extension tab.
    - Briefs must be self-contained (paths, limits, what NOT to touch), write only inside the scratchpad, and return
      under ~15 lines. The main thread re-checks the numbers that gate the run (width, sizes) itself, because a
      subagent's summary comes back confident whether or not it is right.
    - Skip the fan-out when the prep is already done (a re-run) or the run is a quick test: a fresh agent costs more
      than a handful of calls.

## Late findings (after Ari's "take stock" request)
19. **Window title = the window's ACTIVE tab.** Chrome window 35997 read "New Tab - Google Chrome - Aristides" in
    `app_list_windows` and "New Tab" in iRecord's list for minutes after the extension's own tab (in its tab
    group) had loaded Product Hunt. The extension cannot make its tab active, so the user must click it.
20. **"Untitled Recording 4" is not ours.** It is a `--drive-capture` take from another session's iRecord QA
    (`~/Library/Logs/iRecord/drive-capture.txt`, 14:37Z: full display 3360×2100, camera ON, 30 s planned with a
    pause, 19 s). Never treat it as this run's video; never delete it.
21. **iRecord has a scripted driver, but only in the dev build** (`~/Applications/iRecord Dev.app`, `#if DEBUG`):
    `--drive-capture --seconds <n> [--into <slug>] [--new-section | --retake <n>]` records the FULL DISPLAY with
    no dialog, no pointer, no Stop to press (`~/Documents/irecord/CLAUDE.md:295`, `DriveCaptureCLI.swift`). It
    reads camera/mic/frame rate from `defaults` at launch (the QA run left the camera ON) and is launched with
    `open -n -a … --args …` (a shell-exec'd binary has no Screen Recording grant). Also `--dump-windows
    [--probe]`: every SCWindow with its `contentRect` next to the pixel size a take would use: a scriptable
    version of the "delivers N of N pt wide" gate. Neither was tried for Product Hunt.
22. **Series are on disk**: `~/Movies/iRecord/Projects/<project>/project.json` has `"series"`. After this run's
    planning, "Untitled Recording 5" = series "Product Hunt draft", one scene "Fill the Product Hunt submission
    from sc…" (speakerNotes "Fill the Product Hunt submission from scratch"), `recordings: []`. Open it from
    Home by its thumbnail (NOT "Plan next lecture…", which opens run 1's project) and click "Record Section".
23. Opening run 1's "Untitled Recording" through "Plan next lecture…" changed its Date Modified to "now"
    (nothing else; it is still the project Ari means to delete).
24. Cancelling the Ready sheet for Section 1 turned the plan from "0 of 2" into "0 of 1" sections: the empty
    "Section 1" is a placeholder, not a section the user plans.
25. **Reported state vs instrument:** Ari said Chrome was on stage; iRecord's preview still read 394 pt and the
    strip thumbnail was still there. The number decides.
26. Stopped state: nothing recorded. iRecord at the "Untitled Recording" (0 of 1 sections) editor; full control
    released; the extension's tab closed; no PH post started (`/posts/new` showed no in-progress post).

## Open
- Does the 394 pt reading change once Chrome is truly on stage (record-time vs pick-time)?
- Does `Record in 3s` by AXPress work with iRecord in the strip? Does the indicator's Stop work by AXPress?
- Driver route: does `--drive-capture` work from a Bash `open -n -a …` here with the camera off, and does the
  display show only Chrome when the user presses ⌃⌘F? Is a licence/permission prompt raised?
- `--dump-windows --probe`: does it list the Product Hunt window with a sensible `contentRect`?
