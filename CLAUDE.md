# CLAUDE.md — the channel's manual (public repo: nothing private, ever)

This repo is public. Nothing about J's money, people, clients, health or plans
goes in any file here, including this one. The plan behind the channel and every
decision's reason live in his private vault: `personal/context/obsidian/🌱 Brain
Dump/The channel - the plan (7 Oct 2026).md`, read whole before changing anything.

## What this is, in one paragraph

A channel that tells J's days as chapters of an epic, written and voiced by AI
from his real record, played on a GitHub Pages site with a drawn host (March) and
a voice-only narrator. Five parts: the inbox (on his Mac, never committed), the
station (`STATION.md` plus `station/`), the chapters (`day/<date>.json`), the
sound (`audio/<date>/`), the page (`index.html`, `player.js`, `timing.js`).
`README.md` carries the honest labels and the five laws; `forbidden.md` is the
fixed list of what a day note may never say.

## How it runs now (decided 8 Oct 2026, J's design)

**Live, one segment at a time.** `mac/fire.sh <date> <minutes-ahead>` starts a
cloud session from the Mac with STATION.md and the inbox in its prompt. The
session writes ONE segment, checks it (`station/validate.mjs`), runs the truth
check (`station/truth-check.md`, a fresh reader), voices it (`station/voice.py`),
pushes, then loops until the day's chapters end N minutes past the clock in
Chiang Mai, and stops. Nothing refires it by itself yet; every fire is by hand.
The end goal is 24/7, so nothing is built as a block.

**The cloud harness forces a session to push to its own `claude/...` branch,
never to `main`.** `.github/workflows/land.yml` merges every such push into
`main` by itself; a conflict is left unmerged with a warning. GitHub Pages
serves `main`. Found 8 Oct 2026 when 13 voiced segments sat on a branch unseen.

**The Mac side.** `mac/gather.sh <date>` builds `inbox/<date>/` from the
allow-list only: public-safe commit messages (times in Chiang Mai's clock), one
day note by a small Haiku call under `forbidden.md` (written ONCE per date, so
J can read it before the first fire; the first-ten-days gate), and vault notes
whose `#onair` tag stands alone on a line (a note that merely mentions the tag
must not match: the plan itself did, on the first run). The window runs from the
day before at 00:00 to now. The gather rides the Mac's one 08:00 clock
(`march-brain/scripts/brain-backup.sh`, after the save, can refuse nothing).

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
as replays when nothing is live. Pruning: `audio/<d>` older than 7 days is
removed by the station; the JSON stays forever.

## Landmines

- `claude --cloud` needs a real terminal and asks the folder-trust question once.
- Attaching to a cloud session is not enabled on this account; `claude --teleport
  <id>` works for a look (it checks out the session's branch; the local clone
  stayed on `main` both times, but check `git branch --show-current` after).
- A `+` in a `?at=` URL arrives as a space; `player.js` restores it.
- Two watchers pulling the same clone at once leave it dirty; `git checkout --
  day/<date>.json` then pull.
- Playwright's `npx -y playwright screenshot` can demand a newer browser; the
  headless shell at `~/Library/Caches/ms-playwright/chromium_headless_shell-1243`
  with `playwright-core` works from a scratch folder.

## Tests

`node --test timing.test.mjs station/validate.test.mjs` (12 tests; the checker's
plant a wrong number, a missing source and forbidden words and watch each
refused). The truth check is exercised by handing a fresh Haiku a planted
invented line with the real inbox; it flagged exactly that line on 8 Oct 2026.

## The look (step 8, open)

Six candidates in `design/` were rejected by J (pixel, paper, watercolour, cel,
lit-anime), and clay was refused before it was drawn: he does not like clay. The brief that stands: like the creature lab (`Projects/creature-lab/`,
shots in its `shots/`) and the brain cell, simple shapes, few colours, a scene
with its own life, charm from light; her vibe from the references, never her
detail. Playbook: `personal/context/obsidian/🌱 Brain Dump/Code-drawn creatures -
playbook.md`.
