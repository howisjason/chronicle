# STATION.md

The sheet a cloud session follows once a morning to make the day's chapters. It is fired from the Mac with one line: "follow STATION.md for <date>; the inbox follows" plus the inbox text. The session sees this repo and the inbox text in its prompt, and nothing else of J's. It never looks J up anywhere else: not the internet, not other repos, not memory.

Read this whole sheet before doing anything. Then do the steps in order. Each step says what proves it. If a step cannot be done, stop and say so in the final message; never push a half-made day.

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

## 2. Read the inbox

The inbox is in the prompt, after the line "the inbox follows". It has up to three parts: `commits` (public-safe commit messages, one per line, each with its repo), `day-note` (a short note of what he built, learned, decided, tried, in plain words), `notes` (tagged vault notes, for quiet days and teaching lines). It is the only record of the day. If the inbox is empty, write one short quiet-day segment from `notes`, or if there are none, write nothing, push nothing, and say so.

## 3. Write the chapters

Build `sources` first: one entry per inbox item you will use, copied word for word (`kind`: `commit`, `day-note` or `note`; `repo` for commits; `text`). Then write the lines. The first run writes ONE segment of about 18 lines. Later runs write up to two hours: segments start at 06:00 Chiang Mai time and follow each other; a segment's start is the previous one's start plus its length, which you can estimate at 16 characters a second plus the gaps until step 5 gives real numbers.

Rules while writing:
- Every line has a `source`. A line of feeling or play points at the source it reacts to.
- A number spoken in a line must appear in its source. Prefer no numbers.
- No names of people other than J. No clients, money, health, visa, family. `forbidden.md` is the list.
- Short sentences, plain words (VOA Learning English). The page types each line at speaking speed, so a line is one or two sentences.
- Save as `day/<date>.json`.

## 4. Check

Run `node station/validate.mjs day/<date>.json`. It refuses the file on any finding and prints each one. Fix the lines and run it again until it prints `OK`. Never change the checker to make a chapter pass.

Then the truth check: start a fresh subagent (Haiku is enough) with the text of `station/truth-check.md` as its instructions, followed by the chapter JSON and the whole inbox text. It answers `CLEAN` or a list of flagged lines. For each flagged line, rewrite it inside the record or cut it, then run the checker again. Run the truth check again after fixes. A chapter is not voiced until it comes back `CLEAN`.

## 5. Voice

If setup succeeded: `python3 station/voice.py day/<date>.json`. It makes one MP3 per segment under `audio/<date>/`, writes each segment's `audio` path and each line's real `audioMs` back into the JSON, and prints what it did. Then run the checker once more.

## 6. Publish

`git add day/<date>.json audio/<date>` (audio only if it exists), commit with the message `chronicle: <date>, <n> segment(s)` and push to `main`. GitHub Pages serves it within minutes. The final message of the session says: how many segments, whether they are voiced, what the checker and the truth check said, and anything that failed.

## What the session never does

Never commits the inbox or any file outside `day/` and `audio/`. Never edits the checker, the sheets, or the page. Never reads about J beyond the inbox. Never pushes a day that the checker refused.
