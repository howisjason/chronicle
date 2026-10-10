# CLAUDE.md — the channel's manual (public repo: nothing private, ever)

This repo is public. Nothing about J's money, people, clients, health or plans
goes in any file here, including this one. The map of where it stands lives in his private vault: `personal/context/obsidian/🌱
Brain Dump/The channel - where it stands (8 Oct 2026).md`; the first night's plan
beside it is history. The writing rebuild (its plan, with the NotebookLM and
content-creation findings whole, is `The channel - the writing rebuild (8 Oct
2026).md` beside it) went live on 9 Oct 2026: read that note whole before touching
any sheet in `station/`.

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
| The station: picks notes + an angle, then plain headless `claude -p` calls (Haiku 5.5, no tools, our own sheets): an outline of the eight beats, the script, the talk pass; then the checker, a mend of only the refused lines, the truth check and one repair; voices it, publishes | `mac/station.py` |
| The writing | `station/outline.md`, `station/writer.md`, `station/talk.md`, `station/march.md`, `station/narrator.md`, `station/kinds.md`, `station/truth-check.md`, `station/note-gate.md`. Every scene walks one arc (cold open, the comfortable lie, the turn with the note's own sentence, a worked case, a tangent, the crossing of two notes, the fork, the seal), one note per scene or two notes over two scenes; a scene ends by teasing the next notes. The kind from `kinds.md` sets only the style of the middle (`straight` twice as often, never the kind of the scene before; a short show's own kind wins). The talk pass rewrites the script for how two people speak and may change only the lines. March asks the listener's question and restates; the narrator has read everything and holds the best part back. Voices and pictures are DESCRIBED, never given as examples, because the writer copies them (PNN's finding, and the 9 Oct lab: "Tuesday, kettle on" in every scene until the sheet's examples went). Two random details per character |
| The show's memory | `inbox/memory.json`: at most ten lines about the show itself (the score between March and the narrator, feuds, the image planted in a run, jokes and when last used), rewritten whole by the writer after each scene and handed to the next with the whole previous scene |
| The checker | `station/validate.mjs`: shape, sources, numbers, forbidden words, and for the newest scene only, worn-out words (one speaker using a word in more than max(4, their lines / 8) lines) and lines lifted from the scene before (read from the previous hour's file when the newest scene opens its file). On the command line only (the station's path), the newest scene must also run 600 to 2,600 words with at least 3 lines under 6 words and one over 40: the catch if the writing slides back to the one-sentence rally (the plan's 900 and 4 dropped the first two live picks whole on 9 Oct 2026) |
| The voices | `station/voice.py`, Kokoro from `station/.venv` (made by `python3 -m venv station/.venv` + `station/setup.sh`) |
| The words, forever | `day/<date>/<HH>.json` on `main`, one file per Chiang Mai hour, a scene filed by the hour it is WRITTEN (ids `<date>-<HH>-<NN>`): every scene's lines, notes, angle and sources. One file a day would have grown to megabytes at 24/7 with every viewer re-fetching it each minute; an hour file stays about 35 scenes. The 7 and 8 Oct scenes were moved in by their start hour, unchanged, old ids kept. `day/sample.json` is the tests' fixture and the page's last resort |
| The sound, never kept | the `audio` branch, rebuilt from nothing at each scene with only the last hour; the page reads it from raw.githubusercontent.com. Older scenes replay as blips |
| The clock | `mac/tick.sh` every 15 minutes, LaunchAgent `com.howisjason.chronicle` (plist in `mac/`), log `~/Library/Logs/chronicle.log`. A failed run sends J a Telegram message through the personal worker's alert door, at most once every three hours (the door's address is in `~/.claude/alert-url` and its key in `~/.claude/speak-key`, both outside this public repo) |
| The clip button | `clip.js` on the page, like Twitch's: a press opens a strip under the TV of the last 15 minutes this viewer watched, with a band per scene; they drag a pink window of 5 to 60 seconds (its edges, the whole window, or a tap on the track) while the TV previews the frame under the moving edge, and the window's lines list below it; "Make the clip" turns it into a video (MP4 or WebM) with captions, the title and "Watch live: howisjason.github.io/chronicle" burned in, made entirely in their browser (8 Oct 2026; the strip 10 Oct 2026). Nothing is recorded while watching: the show is data, so `clipRange` in `player.js` snapshots the range at the press and `planClip(d, startMs, endMs)` hands over the window and `viewAt(t)`, the same function the live tick draws from, and the clip re-draws each past moment into a canvas nobody sees. The seconds the "Up next" card was on screen are clipped as a dark frame with no sound (`clipLocate`/`clipView`), never as the replay-loop scene `locate` answers with there. A silent tone runs under every clip, because a window with no sound at all came out half-length with no sound track. The sound is rebuilt in the clip's own AudioContext, wired only to the recorder: each voiced scene's MP3 slice (fetched from the `audio` branch and decoded first), blips where there is no MP3. Making it takes the clip's own length in real time, with a progress count, while the live page plays on. A clip never reaches back before the page was loaded, nor (when the press is live) before the station went live. Untested on iPhone Safari; the button hides itself where the browser cannot record |
| The lineup | `shows.json`: nine shows by Chiang Mai hour (five long, four fifteen-minute short ones listed first, first match wins), each with a one-line tone. The station's `show_at` hands the writer the tone of the show on air when the scene will start and stamps `show` on the scene; a short show with a `kind` does every middle part of a run as that kind. The page draws its schedule, on now, coming up and the shows from the same file (8 Oct 2026) |
| The page | `index.html` + `style.css`, its skeleton copied section by section from PNN's page (J's call, 8 Oct 2026: structure first, look later). `panels.js` fills everything around the TV from `viewAt`'s answer and `shows.json`; `show.html?id=` and `cast.html?id=` are the per-show and per-person pages. Parts not built carry a "Note to ourselves" box with what building them would take (the repo is public: build notes only, nothing private) |
| Bumpers, standby, replays | `voice.py` leaves 4 seconds before each newly voiced scene; the page shows an "Up next" card with a jingle in any gap of up to two minutes before a written scene (the first scene of an hour gets the disclaimer card), colour bars when nothing loads, and an off-air notice when it replays. The station rebuilds `day/replays.json` (every scene of the last seven days) at each publish; `?replay=<id>` plays one scene from its start, with blips once its sound is past the hour kept |
| The door | `door/` (`cd door && npx wrangler deploy`): the worker `chronicle-door.jaceebo.workers.dev`, its own worker and one Durable Object, apart from the personal worker that carries J's alerts. `POST /ask`, `POST /letter` (one per address every two minutes, at most 200 waiting), `GET /watch` (viewer count, memory only), `GET /take` for the station with the key in `~/.claude/chronicle-door-key` (secret `DOOR_KEY`). Nothing takes items on air yet: the station intake (every third scene, screened by a gate sheet) waits on J's yes |
| The button | `~/Applications/Chronicle.app` in his Dock, from `mac/button.applescript` (`mac/install-button.sh` builds it and copies the clock's plist from `mac/` into `~/Library/LaunchAgents/`): says on or off and until when, and offers On with no end, On for 1, 4 or 8 hours, or Off. A timed run writes its end to `inbox/until.txt`; the first tick past it switches the clock off. While on, each tick keeps the Mac from idle sleep for 16 minutes (`caffeinate`, kept alive past the tick by the plist's AbandonProcessGroup); a closed lid on battery still sleeps |

All calls bill his Claude plan. Measured in the 9 Oct 2026 lab: about 5 cents of
API-equivalent usage per scene of about 1,000 words (about 6 minutes on air), so the
$2 cap holds about 40 scenes. Making one takes about 9 minutes (about 5 writing,
3.5 voicing), longer than it airs, so a long run leaves gaps the page fills with
replays. Haiku on low wrote half-length scenes and passed 7 of 14 picks; the write
call alone runs on medium effort (3 of 3 passed), every other call on low. Opus
wrote better but cost about ten cents a two-minute scene; only Haiku makes long
runs possible (J's call, 8 Oct 2026). The truth check is always Haiku. `--lab` writes text
only into `inbox/lab<LAB_TAG>-day.json` (one file, not hour files); `CHRONICLE_MODEL` and `CHRONICLE_SHEETS`
let a lab round try another writer or another folder of sheets. Lab calls count
against the daily cap too. Each call's cost goes to `inbox/costs.tsv`. The Mac must be
awake for new scenes; the page replays otherwise. The cloud way (a cloud session) was
removed the same day: one way to run, done well.

**Voices.** March is `station/march_voice.py`, adopted whole from the shelved
body (heart's throat, alice's movement, lifted; see its header). The narrator is
Onyx's throat with Lewis's movement at speed 0.92, J's pick from seventeen. The
model is kokoro-onnx, fetched by `station/setup.sh` from a GitHub release into
the ignored `station/models/`, because the cloud blocks huggingface.co.

**Timing.** A line is lead + speaking + hold; speaking is the real `audioMs`. The gaps are 1,000 ms before a scene's first line, 150 before each other line and 350 after each (9 Oct 2026, shorter for one-word reactions), held in three places that must match: `GAPS` in `mac/station.py` and `DEFAULT_GAPS` in `station/voice.py` and `timing.js`; each scene carries its own `gaps`, so older scenes keep theirs.
`voice.py` bakes the gaps into each segment's MP3, writes `audioMs` back, and
sets a newly voiced segment's `startAt` to the previous end or thirty seconds
from now if that is past; for an hour file's first scene the previous end comes
from the hour before's file, across midnight too. Every viewer's browser reads
its own clock against the published starts. The station never writes more than
about 25 minutes ahead, so whatever airs now sits in this hour's file or the one
before: the page loads those two and re-asks for both every minute with
`cache: 'no-cache'`, so an unchanged file is a bodiless 304 (the hour before is
asked too because a scene written at :59 can land a few minutes after the hour
turns). When nothing is live it loops those two hours; when neither exists (the
station off), it walks back hour by hour, once at load, up to two days, and loops
the newest hour found with the one before it. `404.html` is tiny because the
off-air poll asks for missing hours every minute. Measured on a synthetic 24/7 day
(848 scenes): about 0.7 MB an hour per viewer as served (gzip), 17 MB a day, against
about 0.6 GB a day for the old one-file day (3.7 GB before gzip).

## Landmines

- **The station pushes main.** Every scene it airs runs `git pull --rebase` then `git push`, so ANY commit sitting on local main goes public within minutes, graded or not (8 Oct 2026: a clip rework went live before its grader finished). While the station is on, unreviewed work lives on a branch and is merged only after its grader reports. A push of your own can also bounce off the station's; pull and push again.

- **Editing `mac/tick.sh` while a tick is running can break that tick**, because bash reads a script as it goes; switch the clock off from the Dock button first. **`launchctl unload` kills a run mid-scene** and can leave one checked but unvoiced scene in the hour file; the next tick voices it.
- A lab run's calls count against the live daily cap (8 Oct 2026: the labs used $1.42 of that day's $2).
- **The voice model must be real files, never links into a session's scratch folder.** On 9 Oct 2026 both files in `station/models/` were links into a wiped scratch folder, so every scene would have failed at voicing; they are copies now (a spare set sits in `~/.local/kokoro/`).
- A worktree of this repo needs `inbox`, `station/models` and `station/.venv` linked from the main checkout; `.gitignore`'s folder patterns do not match links, so never `git add -A` there.
- A `+` in a `?at=` URL arrives as a space; `player.js` restores it.
- Two watchers pulling the same clone at once leave it dirty; `git checkout --
  day/` then pull.
- Playwright's `npx -y playwright screenshot` can demand a newer browser; the
  headless shell at `~/Library/Caches/ms-playwright/chromium_headless_shell-1243`
  with `playwright-core` works from a scratch folder.

## Tests

`node --test timing.test.mjs station/validate.test.mjs` (27 tests; the checker's
plant a wrong number, a missing source and forbidden words and watch each
refused; the talk rules refuse a 352-word rally, a scene of same-length lines and
one over 2,600 words, and pass a real lab scene (`station/fixtures/talk-scene.json`); the hour-file ones check an hour turn and midnight, and that the first
scene of an hour file is checked against the last scene of the hour before). The truth check is exercised by handing a fresh Haiku a planted
invented line with the real inbox; it flagged exactly that line on 8 Oct 2026.

## The look (step 8): pixel people, like PNN (J's call, 8 Oct 2026, 5:05am)

**Decided: copy PNN's own pixel-art people** (the teardown in his vault: `PNN teardown -
how pnn.watch works (7 Oct 2026).md`). The ideas and the look, never PNN's code. J closed
the design search after about fifteen attempts across two sessions; do not reopen it, do not
propose another style, and spend as few tokens on the look as the job allows. The rest of
the channel matters more. The one design that came after this (his own call, in the
`human-hunt` repo, 9 Oct 2026) is a new per-pixel base for March, `human-hunt/13-base/base.html`;
at his ask, the narrator's seat shows her beside the old March so he can compare them:
`march-base.js` is that engine adopted (its header names every wiring change), and
`people.js` draws her in the narrator's place, her mouth moving on the narrator's lines.

What was tried and rejected (never propose again): pixel-room and lit-pixel chibis, felt
paper, watercolour, cel, lit-anime, clay, a skin-coloured ball with anime eyes, March as a
creature or snowflake, vector mochi figures (train, sticker, journal, device, sky), and
per-frame shaded versions (WebGL vinyl, lit pixel, glow). Their files sit untracked in
`design/` as a record; delete them freely.

**How options are made, if J ever asks for designs again:** each option differs in what he
is choosing, and each is a finished world built by its own helper over several screenshot
rounds beside the reference. Look at every shot before sending it. A quick hand sketch on a
plain card is the failure.
