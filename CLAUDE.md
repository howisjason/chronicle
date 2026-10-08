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

**On the Mac, the PNN way, on his plan.** `mac/station.py` writes one segment per
plain headless `claude -p` call (Haiku 5.5, no tools, no Claude Code instructions,
our own sheets as the system prompt), checks it (`station/validate.mjs`), runs the
truth check as a second call (`station/truth-check.md`, events and privacy only),
repairs or cuts flagged lines, voices it with Kokoro from `station/.venv`, commits
and pushes. A Sonnet 5.5 call plans the day's scenes once, ranked by drama
(`inbox/<date>/arc.json`). Measured: about half a cent of API-equivalent usage per
clean segment, against 3 to 9 cents in a cloud session. `--lab` writes text only
into `inbox/<date>/lab-day.json`, never voiced or pushed. Each call's cost is
logged in `inbox/<date>/costs.tsv`. The writing lives in `station/writer.md`,
`station/march.md` and `station/narrator.md` (personas, his yes 8 Oct 2026).

**The clock:** `mac/tick.sh`, every 15 minutes by the LaunchAgent
`com.howisjason.chronicle` (plist in `mac/`, log `~/Library/Logs/chronicle.log`):
gather, then the station until the day is 20 minutes ahead. It writes only when
there is something new, so a quiet day costs almost nothing. The Mac must be awake.

**No manual review (his word, 8 Oct 2026).** A blind reviewer
(`station/note-gate.md`, a fresh Sonnet call) removes any day-note paragraph not fit
for a public channel before the station sees it; removals are kept in
`inbox/<date>/note-gate.txt`. This replaced him reading the first ten notes.

**The cloud way still exists** (`mac/fire.sh` and `STATION.md`, a cloud session on
the $250 credit, which ends 5 Nov 2026); it is now for tests and build sessions,
not the daily station. **The cloud harness forces a session to push to its own
`claude/...` branch;** `.github/workflows/land.yml` merges every such push into
`main`.

**The Mac side.** `mac/gather.sh <date>` builds `inbox/<date>/` from the
allow-list only: public-safe commit messages (times in Chiang Mai's clock), one
day note by a Sonnet call under `station/day-note.md` and `forbidden.md`, written
ONCE per date and then gated blind (`mac/gate.py`), and the quiet-day shelf (the
vault notes named in the never-committed `mac/shelf.txt`, gated the same way). The
window runs from the day before at 00:00 to now. It runs at every tick and also
rides the Mac's 08:00 clock.

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
