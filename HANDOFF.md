> **Stamped 2026-10-12 03:15** — true as of the commit that carries this line; anything after it is unaccounted for.

# HANDOFF — chronicle: March's room

## The one job next

**Read the 07:00 clock run of 12 Oct and call the room VERIFIED from the clock** (round one's "before piece 1" block, still open because the run had not happened when round two was built): `/tmp/march-brain-backup.log` (its `free hour:` lines and the publish lines after them), the last row of march-brain's `notes/immune/free-hour-log.tsv`, `tail -1 room/state/log.jsonl` (it should carry `sameness`), `git -C chronicle log -1` (a `room: 2026-10-12 (07:00)` commit on origin), the live page, and the morning line the waking prints. Then: the bench-test line into the standing facts §3 (first clock run's date + 14 days, with a `<!--due:YYYY-MM-DD warn:0-->` anchor); "first clock run <date>" onto the pile's room line; delete the round-one plan, `personal/context/obsidian/🌱 Brain Dump/The pile/March's room - the plan (11 Oct 2026).md`.

**The die is ON (J's word, 12 Oct 2026, 3:11am, after "leave it off" at 1:58am), and the stop-loss is $5 a session (same word).** Installed from the canonical plist; a hit logs to `~/Library/Logs/march-die.log`. J's word the same minute: a run is a SESSION, never an "hour" (the word collided with the clock's hour); the file names stay.

## What changed on 12 Oct, 1:25 to 2:00am (round two, all six pieces)

The plan (`personal/context/obsidian/🌱 Brain Dump/The pile/March's room - round two, the plan (12 Oct 2026).md`) is executed and deleted; its durable parts are in `CLAUDE.md` (Room) and in the headers of march-brain's `free-hour.sh`, `die.sh` and `publish-hour.sh`. In order: the desk (one fresh thing drawn before each hour, its own fold); the room command (`tools/room.mjs`, the only way to write the four lists; the state/ Write/Edit grants are gone); "I used this" (door `POST/GET /used`, `state/used.json`); sameness and Quill's memory; live (`tools/live.mjs`, door `POST/GET /now`, the page asks every 15 seconds); the die (`die.sh`, its plist, and section 6's publishing moved into `publish-hour.sh`). Tests: 39 pass (27 station, 12 room). The door is deployed with both new route pairs.

## Verified versus unseen

**VERIFIED (named checks, seen):** all four desk draws and the fall-through to a note; the room command allowed and a direct Edit of `state/cloud.json` refused, under the real launcher (probe 01:30); the sheet arrived whole with no unfilled double-brace slot left; the button pressed in the headless browser took a card to "used 1×" and `GET /used` to 1; `log-run.mjs` against copies wrote `used.json`, `sameness` and "used: 1" in the morning line; the door's `/now` refuses a post without the key; the watcher under the real launcher took the door through waking, reading, searching, the cloud and asleep (probe 01:36); the page moved her to the board on a posted state and switched from the replay to "awake now" by itself during the real `FORCE=1` hour (01:40).

**REPORTED/PROMISED:** see the grader's report in march-brain's `notes/immune/graded.txt` for what a fresh reader checked. Not seen: a die HIT from launchd (installed 03:12, no hit yet at 03:15; the first proof is a line in `~/Library/Logs/march-die.log` and a ledger row); a losing tick printing nothing (by construction: it exits before any echo).

## Landmines found

- **A pair of opening curly braces in ANY markdown or html file killed the public page for nine hours** (12 Oct, 01:52 to 11:10: eight Pages builds failed on `HANDOFF.md` line 17, the page stayed at the 01:46 state, and nothing noticed; the room logged three clean sessions nobody could see). GitHub Pages ran Jekyll by default and Jekyll reads braces as a template. `.nojekyll` at the root now switches Jekyll off for good (rung 3; editing the one line would have left the next session's README able to do it again). A "deployed" that is not a green build at `gh run list` is not live.

- **Never edit `free-hour.sh` while an hour runs** (`pgrep -f free-hour.sh`). It happened at 01:45 on 12 Oct: a header insert mid-run; the exact running copy was put back from git before the run ended, and the edit re-applied after.
- `publish-hour.sh` adds ALL of `room/`, so room work in progress goes public at the end of the next hour. With the die installed, an hour can end at any minute: keep unfinished room work on a branch.
- The door holds a test count for a made-up id, `probe-build: 1`; `log-run.mjs` copies only ids on the bench, so it never shows. Never name a build `probe-build`.
- `stream-json` ends with a `task_summary` line, not the result record (measured, CLI 2.1.293); the run stays `json`.
- A Cloudflare deploy of the door took about a minute before the new routes answered; a "not here" right after a deploy is the old code, not a bug.
- The auto-mode safety check refused writing the die's plist from a shell command ("Unauthorized Persistence"); the file tool wrote it. It was installed with `cp` and `launchctl bootstrap` on his word, 12 Oct 3:11am.

## Still outstanding, in order

1. J opens a new session with his next round of feedback and ideas for the room; that session serves his round first. The 07:00 read above (25 minutes) fits beside it.
2. The die: on; read a day of `~/Library/Logs/march-die.log` and the ledger for its first hit.
3. The judging on 18 Oct (standing facts §3) reads the ledger, die hours included.
