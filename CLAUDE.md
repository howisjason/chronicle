# CLAUDE.md — the channel's manual (public repo: nothing private, ever)

This repo is public. Nothing about J's money, people, clients, health or plans
goes in any file here, including this one. The map of where it stands lives in his private vault: `personal/context/obsidian/🌱
Brain Dump/The channel - where it stands (8 Oct 2026).md`; the first night's plan
beside it is history.

## What this is, in one paragraph

A channel that talks about J's Obsidian notes, the way PNN talks about the news:
March (a pixel person at a desk) and a voice-only narrator take one or two of his
Second Brain notes, turn them through one angle from his own "AI Prompts For
Obsidian Notes" list, and talk until something new shows. Written and voiced by
AI, played on a GitHub Pages site. No daily progress, no commits, no session text
(his call, 8 Oct 2026: fewer moving parts, done well). `README.md` carries the
honest labels; `forbidden.md` is the fixed list of what may never be said.

## How it runs (8 Oct 2026)

| Part | File |
|---|---|
| The pool: every Second Brain note a blind Sonnet reviewer passed for a public channel, reviewed once and again only when the note changes | `mac/pool.py`, verdicts in `inbox/pool.json` |
| The station: picks notes + an angle, writes one scene per plain headless `claude -p` call (Haiku 5.5, no tools, our own sheets), checks it, truth-checks it, repairs once, voices it, publishes | `mac/station.py` |
| The writing | `station/writer.md`, `station/march.md`, `station/narrator.md`, `station/kinds.md`, `station/truth-check.md`, `station/note-gate.md`. Lean on purpose (8 Oct 2026 lab): a quarter of the old words wrote as well on Haiku. March is the host who knows J; the narrator is built as her opposite (J's call: friction and chemistry). Voices are DESCRIBED, never given as sample lines, because the writer copies them (PNN's own finding). Each scene gets one segment kind from `kinds.md` (open, verdict, and a middle drawn from the rest) and two random details per character |
| The show's memory | `inbox/memory.json`: at most ten lines about the show itself (the score between March and the narrator, feuds, the image planted in a run, jokes and when last used), rewritten whole by the writer after each scene and handed to the next with the whole previous scene |
| The checker | `station/validate.mjs`: shape, sources, numbers, forbidden words, and for the newest scene only, worn-out words (one speaker using a word in more than four lines) and lines lifted from the scene before |
| The voices | `station/voice.py`, Kokoro from `station/.venv` (made by `python3 -m venv station/.venv` + `station/setup.sh`) |
| The words, forever | `day/<date>.json` on `main`: every scene's lines, notes, angle and sources |
| The sound, never kept | the `audio` branch, rebuilt from nothing at each scene with only the last hour; the page reads it from raw.githubusercontent.com. Older scenes replay as blips |
| The clock | `mac/tick.sh` every 15 minutes, LaunchAgent `com.howisjason.chronicle` (plist in `mac/`), log `~/Library/Logs/chronicle.log`. A failed run sends J a Telegram message through the personal worker's alert door, at most once every three hours (the door's address is in `~/.claude/alert-url` and its key in `~/.claude/speak-key`, both outside this public repo) |
| The clip button | `clip.js` on the page: a viewer presses Clip and gets the next 30 seconds as a video (MP4 or WebM) with captions, the title and "Watch live: howisjason.github.io/chronicle" burned in, made entirely in their browser; voice and blips reach it through one WebAudio mix in `player.js`. Untested on iPhone Safari; the button hides itself where the browser cannot record |
| The button | `~/Applications/Chronicle.app` in his Dock, from `mac/button.applescript` (`mac/install-button.sh`): says on or off and flips the clock |

All calls bill his Claude plan. Measured 8 Oct 2026: about half to two thirds of a
cent of API-equivalent usage per scene. The writer is Haiku on low effort, J's
call (8 Oct 2026): Opus wrote better but cost about ten cents a scene, and only
Haiku makes 24/7 possible. The truth check is always Haiku. `--lab` writes text
only into `inbox/lab<LAB_TAG>-day.json`; `CHRONICLE_MODEL` and `CHRONICLE_SHEETS`
let a lab round try another writer or another folder of sheets. Lab calls count
against the daily cap too. Each call's cost goes to `inbox/costs.tsv`. The Mac must be
awake for new scenes; the page replays otherwise. The cloud way (a cloud session on
the $250 credit) was removed the same day: one way to run, done well.

**Voices.** March is `station/march_voice.py`, adopted whole from the shelved
body (heart's throat, alice's movement, lifted; see its header). The narrator is
Onyx's throat with Lewis's movement at speed 0.92, J's pick from seventeen. The
model is kokoro-onnx, fetched by `station/setup.sh` from a GitHub release into
the ignored `station/models/`, because the cloud blocks huggingface.co.

**Timing.** A line is lead + speaking + hold; speaking is the real `audioMs`.
`voice.py` bakes the gaps into each segment's MP3, writes `audioMs` back, and
sets a newly voiced segment's `startAt` to the previous end or thirty seconds
from now if that is past. Every viewer's browser reads its own clock against
the published starts; the page refetches the day every minute and loops the day
as replays when nothing is live.

## Landmines

- A `+` in a `?at=` URL arrives as a space; `player.js` restores it.
- Two watchers pulling the same clone at once leave it dirty; `git checkout --
  day/<date>.json` then pull.
- Playwright's `npx -y playwright screenshot` can demand a newer browser; the
  headless shell at `~/Library/Caches/ms-playwright/chromium_headless_shell-1243`
  with `playwright-core` works from a scratch folder.

## Tests

`node --test timing.test.mjs station/validate.test.mjs` (14 tests; the checker's
plant a wrong number, a missing source and forbidden words and watch each
refused). The truth check is exercised by handing a fresh Haiku a planted
invented line with the real inbox; it flagged exactly that line on 8 Oct 2026.

## The look (step 8): pixel people, like PNN (J's call, 8 Oct 2026, 5:05am)

**Decided: copy PNN's own pixel-art people** (the teardown in his vault: `PNN teardown -
how pnn.watch works (7 Oct 2026).md`). The ideas and the look, never PNN's code. J closed
the design search after about fifteen attempts across two sessions; do not reopen it, do not
propose another style, and spend as few tokens on the look as the job allows. The rest of
the channel matters more.

What was tried and rejected (never propose again): pixel-room and lit-pixel chibis, felt
paper, watercolour, cel, lit-anime, clay, a skin-coloured ball with anime eyes, March as a
creature or snowflake, vector mochi figures (train, sticker, journal, device, sky), and
per-frame shaded versions (WebGL vinyl, lit pixel, glow). Their files sit untracked in
`design/` as a record; delete them freely.

**How options are made, if J ever asks for designs again:** each option differs in what he
is choosing, and each is a finished world built by its own helper over several screenshot
rounds beside the reference. Look at every shot before sending it. A quick hand sketch on a
plain card is the failure.
