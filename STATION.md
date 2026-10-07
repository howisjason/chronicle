# STATION.md

The sheet a cloud session follows once a morning to make the day's chapters. It is fired from the Mac with one line: "follow STATION.md for <date>; the inbox follows" plus the inbox text. The session sees this repo, the inbox text in its prompt, and nothing else of J's.

This is the skeleton. Each section is filled in by the build step named beside it.

## 1. Setup (step 4)

Install Kokoro and fetch its weights. Done first, so a failure shows before any writing.

## 2. Read the inbox (step 3)

The inbox arrives inside the prompt. It is the only record of the day. Nothing else is looked up about J.

## 3. Write the chapters (step 3)

Two hours of segments, each about 18 lines, two speakers: the narrator and March. Every line that states a fact carries the index of its source. The MVP writes one chapter first.

## 4. Validate (step 3)

`node station/validate.mjs day/<date>.json`: the shape, the forbidden list, a source index on every factual line, every spoken number present in its source. A failing chapter is not voiced.

## 5. The truth check (step 3)

A second, fresh pass compares each line to its source and flags invention. A flagged line is rewritten or cut before voicing.

## 6. Voice (step 4)

`python3 station/voice.py day/<date>.json`: one MP3 per segment, 24 kHz mono; each line's real `audioMs` written back into the JSON.

## 7. Publish (step 3)

Commit `day/<date>.json` and the audio, push to `main`. GitHub Pages does the rest.
