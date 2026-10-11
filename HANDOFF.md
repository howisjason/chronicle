> **Stamped 2026-10-12 00:29 · 32d9d3d** — true as of this commit; anything after it is unaccounted for.

# HANDOFF — chronicle: March's room

This replaces the unstamped baton of 467f457, written mid-build. That one said the first night would start from empty lists. That stopped being true when the first hour, run by hand, was committed (32d9d3d). Its probe table is still accurate and is kept below.

## The one job next

J is opening a new session for **a round of revisions and discussion about the room**. That session is his to steer: he brings what he wants changed, and the session works inside his plan. The second job, whoever gets there first, is to read the **07:00 clock run of 12 Oct 2026** and only then call the room VERIFIED. The list of what to read is in "Still outstanding" below. Do not change `room/tools/`, march-brain's `scripts/free-hour.sh` or `brain-backup.sh` while a run is going: bash reads a running script as it goes, so an edit mid-run can break that run. Check first with `pgrep -f free-hour.sh`.

## What changed, ranked

**The room exists and has been used once for real.** The page is live at https://howisjason.github.io/chronicle/room/. Her first hour with the room, run by hand at 00:11 with J's yes to the sheet paragraph, built one thing: `bench/pole-star`, a small program that says which star is the North Star in any year, with a self-test. It sent Quill twice (both yes) and left one thought in the cloud. This matters more than any line of code here. The bench test asks whether the hour makes usable things, and on its first try it made one that runs.

**The plan's privacy design had a hole, and it is closed.** The plan's private drawer was a `"private": true` flag the page skips. But the repo is public, so a flagged item is still readable on GitHub. The real drawer is now `room/drawer/`, which git ignores; `pin.sh --private` files there. The flag stays as a second fence. This was not obvious because the page check passed: the page never drew the private items, so everything looked fine, even though the files themselves were public.

**The hour's fence is real only in one mode with one path form.** That is `dontAsk` mode with rule paths written with two leading slashes. Auto mode's classifier approves commands nobody listed. A rule path with one slash silently never matches. Before tonight, the hour's diary and memory grants were in that never-matching form and only worked because auto mode waved them through. A grant to the whole of `room/**`, as the plan had it, would have let the hour rewrite the bench runner and so remove its own sandbox. So writes are granted folder by folder (bench, shelf, state, drawer), and the clock's receipt files are denied.

**The hour learns the lists' shapes from one place.** Her first Quill entry was written as `"YES"` with a `said` field, which the page cannot show. Nothing had told her the shapes. `state/README.md` now does, and Quill's sheet points to it; she fixed her entries the same run. Her bench steps are still plain sentences, not the `{at, note}` items the README asks for. The page only counts them, so nothing breaks.

## Verified versus unseen

**VERIFIED** (seen working):
- The tests: `node --test timing.test.mjs station/validate.test.mjs room/room.test.mjs` printed 36 pass, 0 fail.
- The fence under the real launcher. Five probe runs read from each run's `permission_denials` and from the files on disk (table below). The real hour's own record shows exactly two refusals, both shell commands outside the two allowed scripts.
- The bench runner: it refused a `../` path, a write outside the build's folder, a write to `/tmp`, and network access, and it stopped an endless loop at 60 seconds. Her `pole-star` self-test printed "all passed" through it.
- The pin script: it refused a `file://` address. It pinned example.com with a 320 px thumbnail, and a `--private` pin landed only in the ignored drawer (`git status --ignored` shows `!! room/drawer/`).
- Quill: given a pin with a planted money figure, it answered `QUILL: NO` and named the figure. Given a clean pin, it also said no, for a true reason (the linked page did not support the note's claim).
- The page, locally and live: every list renders; three planted private items did not appear; a broken `cloud.json` showed only "this file could not be read". The replay moves through the trace's places in Playwright with no page errors. The live JSON carried `pole-star` about 50 seconds after the push.
- The post-run script on the real hour: one log line with only `t`, `kind`, `place` in the trace, no cost field, and the morning line under "Unreported" in march-brain's `inner-life/unattended.md`.

**REPORTED** (a grader said so; I did not re-watch every point): two rounds by a fresh Opus grader. Round one: all 11 claims CORRECT, plus six catches, all fixed. Round two: all five fix commits CORRECT. Stamped in `march-brain/notes/immune/graded.txt`.

**PROMISED** (nobody has seen it):
- The 07:00 clock run: that `brain-backup.sh` section 6 commits `room/`, pulls, pushes and publishes. Only `bash -n` has checked that code.
- The diary write grant. It uses the same form proven on the memories folder, and the real hour showed no refusal on its private writes, but no session may look at the diary to confirm.

| Probe question | Result |
|---|---|
| Do narrow grants hold? | Yes, in dontAsk with two-slash rule paths. Refused: `touch`, a python write, an allowed script with a write chained after it, writes outside the granted folders, edits to `tools/try.sh` and `quill.md`, the receipt files, the seed. Plain read-only commands like `echo` still run (J's call, 12 Oct: keep going) |
| Does the session file carry the tool calls? | Yes: `~/.claude/projects/-Users-howisjason-Projects-march-7th-march-brain/<session_id>.jsonl`, and helpers in `<session_id>/subagents/` |
| Can the clock push chronicle? | Yes: both remotes use https, and a no-op pull and push succeeded |
| Thumbnails? | Yes, through Playwright's headless browser. Chrome is not installed |

## Facts that will rot

The run's numbers live in places a command reads, never here. The last run: `tail -1 room/state/log.jsonl`. Its cost: the last row of march-brain's `notes/immune/free-hour-log.tsv`. Whether a run is going: `pgrep -f free-hour.sh`. Whether the room is published: `git -C ~/Projects/chronicle status -sb` (it should say nothing ahead).

## Decided this session

J said yes to the exact sheet paragraph (about 12:10am, 12 Oct). He chose to keep dontAsk even though `echo` passes, because every write by shell is refused and reading adds nothing the hour lacks. Both are in the manual and in march-brain's launcher header.

## Landmines found

The Edit tool checks whether the text is there before it checks permission. So a probe that edits text that is not in the file "runs" whether it is allowed or not. Probe with a real, undoable edit. (Saved to the workshop memory of measured CLI facts.)

## Open flags, live seams, his words

Open: her own timestamps in the state files are guesses that run a few minutes late; the log's times are the true ones. Bench steps are sentences, not `{at, note}`. Seam: "new since last run" is measured against chronicle's last commit, so anything left uncommitted is counted by the next run. The hand run is committed, so 07:00 counts only its own work. His words: "a round of revisions and discussion in a new session". NOT DONE yet, and it is the next session's whole purpose.

## Still outstanding, in order

1. J's revision round (his session, his agenda).
2. After 07:00, read: `/tmp/march-brain-backup.log` (the `free hour:` and `room` lines), the ledger's last row, `room/state/log.jsonl`'s last line, `git log -1` here (a `room: 2026-10-12` commit on origin), the live page, and the morning line the waking hook prints. Then call the room VERIFIED. (15 minutes.)
3. Once VERIFIED: add the bench-test line to march-brain's standing facts §3 (the first clock run's date + 14 days, with a `<!--due:YYYY-MM-DD warn:0-->` anchor). Add "first clock run <date>" to the pile's room line. Delete the build plan in the pile folder, since its durable parts live in this manual. (10 minutes.)
4. The first post-MVP door, by the manual's own guess: one small `room` command that checks each entry before writing, replacing the hand-edited JSON. (One session; J's call when.)

## The one thing worth carrying forward

A privacy rule that a page enforces is not a privacy rule in a public repo. Check where the bytes go, not only what gets drawn.
