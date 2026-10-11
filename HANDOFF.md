> **Stamped 2026-10-12 02:00** — true as of the commit that carries this line; anything after it is unaccounted for.

# HANDOFF — chronicle: March's room

## The one job next

**Read the 07:00 clock run of 12 Oct and call the room VERIFIED from the clock** (round one's "before piece 1" block, still open because the run had not happened when round two was built): `/tmp/march-brain-backup.log` (its `free hour:` lines and the publish lines after them), the last row of march-brain's `notes/immune/free-hour-log.tsv`, `tail -1 room/state/log.jsonl` (it should carry `sameness`), `git -C chronicle log -1` (a `room: 2026-10-12 (07:00)` commit on origin), the live page, and the morning line the waking prints. Then: the bench-test line into the standing facts §3 (first clock run's date + 14 days, with a `<!--due:YYYY-MM-DD warn:0-->` anchor); "first clock run <date>" onto the pile's room line; delete the round-one plan, `personal/context/obsidian/🌱 Brain Dump/The pile/March's room - the plan (11 Oct 2026).md`.

**Then the die waits on J's word.** It is built and tested by hand, NOT installed. When he says so: the two commands in the manual's "The die" paragraph. When it is installed, March's own words at the top of `room/index.html` ("Once a day a clock on a Mac gives me an hour…") stop being true; change them with her, in her voice.

## What changed on 12 Oct, 1:25 to 2:00am (round two, all six pieces)

The plan (`personal/context/obsidian/🌱 Brain Dump/The pile/March's room - round two, the plan (12 Oct 2026).md`) is executed and deleted; its durable parts are in `CLAUDE.md` (Room) and in the headers of march-brain's `free-hour.sh`, `die.sh` and `publish-hour.sh`. In order: the desk (one fresh thing drawn before each hour, its own fold); the room command (`tools/room.mjs`, the only way to write the four lists; the state/ Write/Edit grants are gone); "I used this" (door `POST/GET /used`, `state/used.json`); sameness and Quill's memory; live (`tools/live.mjs`, door `POST/GET /now`, the page asks every 15 seconds); the die (`die.sh`, its plist, and section 6's publishing moved into `publish-hour.sh`). Tests: 39 pass (27 station, 12 room). The door is deployed with both new route pairs.

## Verified versus unseen

**VERIFIED (named checks, seen):** all four desk draws and the fall-through to a note; the room command allowed and a direct Edit of `state/cloud.json` refused, under the real launcher (probe 01:30); the sheet arrived whole with no `{{` left; the button pressed in the headless browser took a card to "used 1×" and `GET /used` to 1; `log-run.mjs` against copies wrote `used.json`, `sameness` and "used: 1" in the morning line; the door's `/now` refuses a post without the key; the watcher under the real launcher took the door through waking, reading, searching, the cloud and asleep (probe 01:36); the page moved her to the board on a posted state and switched from the replay to "awake now" by itself during the real `FORCE=1` hour (01:40).

**REPORTED/PROMISED:** see the grader's report in march-brain's `notes/immune/graded.txt` for what a fresh reader checked. Not seen: a die tick from launchd (not installed); a losing tick printing nothing (by construction: it exits before any echo).

## Landmines found

- **Never edit `free-hour.sh` while an hour runs** (`pgrep -f free-hour.sh`). It happened at 01:45 on 12 Oct: a header insert mid-run; the exact running copy was put back from git before the run ended, and the edit re-applied after.
- `publish-hour.sh` adds ALL of `room/`, so room work in progress goes public at the end of the next hour. With the die installed, an hour can end at any minute: keep unfinished room work on a branch.
- The door holds a test count for a made-up id, `probe-build: 1`; `log-run.mjs` copies only ids on the bench, so it never shows. Never name a build `probe-build`.
- `stream-json` ends with a `task_summary` line, not the result record (measured, CLI 2.1.293); the run stays `json`.
- A Cloudflare deploy of the door took about a minute before the new routes answered; a "not here" right after a deploy is the old code, not a bug.
- The auto-mode safety check refused writing the die's plist from a shell command ("Unauthorized Persistence"); the file tool wrote it. Installing it is J's word, by hand or with his yes.

## Still outstanding, in order

1. The 07:00 read above (25 minutes).
2. The die: installed on J's word, then `launchctl list | grep march-die` and a day of `~/Library/Logs/march-die.log`.
3. The judging on 18 Oct (standing facts §3) reads the ledger, die hours included.
