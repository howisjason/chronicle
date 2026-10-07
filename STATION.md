# STATION.md

The sheet a cloud session follows once a morning to make the day's chapters. It is fired from the Mac with one line: "follow STATION.md for <date>, keep <N> minutes ahead of the clock; the inbox follows" plus the inbox text. The station runs LIVE (J's design, 8 Oct 2026): it makes one segment at a time, each written, checked, voiced and pushed before the next is begun, and keeps going until the day's chapters end at least N minutes after the current time in Chiang Mai. Then it stops. It is fired again and again through the day, so the channel is always a little ahead of the clock and never a two-hour block made in one go. The session sees this repo and the inbox text in its prompt, and nothing else of J's. It never looks J up anywhere else: not the internet, not other repos, not memory.

Read this whole sheet before doing anything. Then do the steps in order. Each step says what proves it. If a step cannot be done, stop and say so in the final message. A segment is pushed only when it is checked; nothing half-made is ever pushed.

## 0. What a chapter is

One segment of the day's story, about 18 lines, two speakers, written as data in the format below. The narrator tells the day from above like a legend; March tells it from beside him. `station/narrator.md` and `station/march.md` are the two sheets; read both before writing. The law: never invent an event. Every line points at a source. The telling may make a day feel big; it never says he did a thing he did not do.

The format (every part of the page agrees on it):
```json
{ "date": "2026-10-08", "tz": "Asia/Bangkok",
  "segments": [ { "id": "2026-10-08-01", "title": "THE DAY THE MATCH WAS STRUCK",
    "startAt": "2026-10-08T06:00:00+07:00", "audio": null,
    "gaps": { "firstLeadMs": 1000, "leadMs": 200, "holdMs": 600 },
    "sources": [ { "kind": "commit", "repo": "braincell", "text": "braincell: finished; ..." } ],
    "lines": [ { "speaker": "narrator", "text": "...", "emotion": "dry", "action": "none", "source": 0 },
               { "speaker": "march",    "text": "...", "emotion": "happy", "action": "point", "source": 0 } ] } ] }
```
Speakers: `narrator`, `march`. Emotions: `neutral`, `happy`, `dry`, `surprised`. Actions: `none`, `point`, `facepalm` (the narrator's action is always `none`). `source` is an index into the segment's `sources`. `audio` is `null` until step 5 fills it. `audioMs` on a line is written by step 5 only.

## 1. Setup

Run `bash station/setup.sh` if it exists (it installs Kokoro, the voice; step 4 of the build adds it). If it fails, say so at the end and still do steps 2 to 4 and 6, with `audio` left `null`.

## 2. Read the inbox, and what is already told

The inbox is in the prompt, after the line "the inbox follows". It has up to three parts: `commits` (public-safe commit messages, one per line, each with its repo), `day-note` (a short note of what he built, learned, decided, tried, in plain words), `notes` (tagged vault notes, for quiet days and teaching lines). It is the only record of the day.

Then `git pull` and read `day/<date>.json` if it exists: its segments are what the channel has already told today, and their `sources` are the inbox items already used. What is NEW is the inbox minus those sources. New items are the next segments. When nothing is new, one quiet segment is allowed per fire: March and the narrator on one of the `notes`, or, with no notes, a short beat that says plainly the day has been quiet since the last word and looks back on one thing already told, in new words. Never two quiet segments in a row, and never a line about a thing that did not happen.

## 3. Write ONE segment

Build its `sources` first: one entry per inbox item it uses, copied word for word (`kind`: `commit`, `day-note` or `note`; `repo` for commits; `text`). Then write about 18 lines. Its `startAt` is the previous segment's start plus its length, or one minute from now for the first segment of the day (the day begins when the station first speaks, not at a fixed hour); step 5 corrects it from the real voiced length and the clock. The segment has its own title and its own slice of the day. Append it to `day/<date>.json` (create the file with `date` and `tz` if it is the day's first). Then go straight to step 4; the next segment waits until this one is pushed.

Rules while writing:
- Every line has a `source`. A line of feeling or play points at the source it reacts to.
- A number spoken in a line must appear in its source. Prefer no numbers.
- No names of people other than J. No clients, money, health, visa, family. `forbidden.md` is the list.
- Short sentences, plain words (VOA Learning English). The page types each line at speaking speed, so a line is one or two sentences.
- Save as `day/<date>.json`.

## 4. Check the segment

Run `node station/validate.mjs day/<date>.json`. It refuses the file on any finding and prints each one. Fix the lines and run it again until it prints `OK`. Never change the checker to make a segment pass.

Then the truth check: start a fresh subagent (Haiku 5.5 is enough) with the text of `station/truth-check.md` as its instructions, followed by the new segment's JSON and the whole inbox text. It answers `CLEAN` or a list of flagged lines. For each flagged line, rewrite it inside the record or cut it, then run the checker again. Run the truth check again after fixes. A segment is not voiced until it comes back `CLEAN`.

## 5. Voice the segment

If setup succeeded: `python3 station/voice.py day/<date>.json --budget 480`. It voices every segment without audio (normally just the new one), writes its `audio` path and each line's real `audioMs` into the JSON, and sets the new segment's `startAt` to the end of the one before it, or to thirty seconds from now if that is already past, so the segment goes on air just ahead of the clock. It prints when the day now ends. Then run the checker once more. If setup failed, leave `audio` null; the page plays blips, and the start is set by hand the same way.

## 6. Publish the segment, then loop

Prune old sound first, once per fire: the chapters stay forever as data, the MP3s do not (about 45 MB a day would swell the public repo). Delete every `audio/<d>` folder whose date is more than 7 days before <date> with `git rm -r -q audio/<d>`. Then `git add day/<date>.json audio/<date>` (audio only if it exists), commit with the message `chronicle: <date>, <n> segment(s)` and push. The cloud harness may make you push to a branch of its own instead of `main`; that is fine, the repo lands every `claude/` branch on `main` by itself (`.github/workflows/land.yml`).

Then look at the clock. If the day's last segment ends less than N minutes after now (Chiang Mai time) and there is something new or a quiet segment is allowed, go back to step 3. Otherwise stop. The final message of the session says: how many segments were added, when the day now ends, what the checker and the truth check said, and anything that failed. If there is no `origin` remote, add it first: `git remote add origin https://github.com/howisjason/chronicle.git`, then `git fetch origin main` and rebase on it. If the push is refused for credentials, attach the repo `howisjason/chronicle` with push access using the session's own add_repo tool, then push again. (Both happened on the first run, 8 Oct 2026.) GitHub Pages serves it within minutes. The final message of the session says: how many segments, whether they are voiced, what the checker and the truth check said, and anything that failed.

## What the session never does

Never commits the inbox or any file outside `day/` and `audio/`. Never edits the checker, the sheets, or the page. Never reads about J beyond the inbox. Never pushes a day that the checker refused.
