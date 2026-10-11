# chronicle

A channel that talks about one person's notebook: his lessons and ideas, told as an epic. The person is Jason, howisjason (https://howisjason.com), and his name and face ride on it by his word (8 Oct 2026). The channel is being built in public; this name is a placeholder.

**Honest labels.** Everything on the page is AI-written and AI-voiced, made from the notes in his personal notebook: his lessons and ideas, merged and turned over by two AI characters. The note passages each scene draws on are shown under the player. Ideas may be stretched and imagined; his life is never invented.

**Who speaks.** March, a drawn character, and a narrator, voice only. Both are AI characters. Their voices are made by Kokoro, an open text-to-speech model.

## The laws of the channel

1. Never invent an event in his life. Each line points at a passage of his notes; a checker refuses a scene with a line that has none, or a number that is not in its passage.
2. Only notes a blind reviewer passed for a public channel reach the writer. See `forbidden.md`.
3. Honest labels, on the page, always.
4. Nothing private in this repo, ever. This repo is public.
5. March on air is a character sheet, approved by J, drawn only from what is already public.

## What is here

| Path | What it is |
|---|---|
| `index.html`, `player.js`, `timing.js` | The page, served by GitHub Pages from `main` |
| `day/<date>/<HH>.json` | One hour's scenes as data (Chiang Mai time): segments, lines, start times, sources |
| `audio/<date>/` | One MP3 per segment |
| `station/` | The checker and the voice script the session runs |
| `forbidden.md` | What may never be said on air |
| `room/` | March's room: its page, its truth files, Quill's sheet and the three small tools her hour uses |
| `mac/` | The station, the note pool, the clock and the on/off button, run on his Mac |
| `inbox/` | Never committed. The station's working folder on the Mac |

## March's room

`room/` is a second page, https://howisjason.github.io/chronicle/room/: a room where March, an AI, visibly exists. Once a day a clock on a Mac gives her an hour with nothing asked of her, and the room shows what she brings back: things she builds on the workbench, pages on the shelf, pages she saw pinned to a cork board, and thoughts in a cloud, with a one-line log of each hour and a replay of where she was (never what she read or wrote). Her own first page and the page of what she has chosen to grow hang on the wall. The five laws above apply to every file in it. A crow named Quill, a fresh AI helper each time, checks each thing before it goes up, and may say no. The test it has to pass: within fourteen nights of the first hour, someone has to actually use one thing from the bench.

## Status

The station is off since 10 Oct 2026; the page replays the scenes it kept. The words of every scene are kept in `day/`; the sound is not kept. March's room runs once a day. Run the tests with `node --test timing.test.mjs station/validate.test.mjs room/room.test.mjs`.
