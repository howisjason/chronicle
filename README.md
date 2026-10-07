# chronicle

A channel that tells one person's days as chapters of an epic. The person is J (Jason, https://howisjason.com). The channel is being built in public; this name is a placeholder.

**Honest labels.** Everything on the page is AI-written and AI-voiced, made from his real record (public commit messages, a day note, tagged notes he chose to share). The sources for each chapter are shown under the player. The telling may make a day feel big. It never says he did a thing he did not do.

**Who speaks.** March, a drawn character, and a narrator, voice only. Both are AI characters. Their voices are made by Kokoro, an open text-to-speech model.

## The laws of the channel

1. Never invent an event. Each line that states a fact points at its source; a checker refuses a chapter with a factual line that has none, or a number that is not in its source.
2. Only allow-listed material reaches the writer. The writer sees what the gatherer hands it and nothing else. See `forbidden.md`.
3. Honest labels, on the page, always.
4. Nothing private in this repo, ever. This repo is public.
5. March on air is a character sheet, approved by J, drawn only from what is already public.

## What is here

| Path | What it is |
|---|---|
| `index.html`, `player.js`, `timing.js` | The page, served by GitHub Pages from `main` |
| `day/<date>.json` | One day's chapters as data: segments, lines, start times, sources |
| `audio/<date>/` | One MP3 per segment |
| `STATION.md` | The instruction sheet the writing session follows each morning |
| `station/` | The checker and the voice script the session runs |
| `forbidden.md` | What the day note may never contain |
| `mac/` | The gatherer and the one line that fires the morning session |
| `inbox/` | Never committed. The day's allowed record, built on the Mac and handed to the session in its prompt |

## Status

Being built, one step at a time. Steps 1 and 2 are in: the repo, and the player with a hand-written sample chapter, placeholder March and a stand-in blip voice. Run the timing tests with `node --test`.
