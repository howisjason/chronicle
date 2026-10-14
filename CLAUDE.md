# CLAUDE.md — the channel's manual (public repo: nothing private, ever)

**The station is off (10 Oct 2026) and stays off.** The repo reopened on 11 Oct 2026 for ONE thing, March's room (`room/`); see the Room section at the end. Nothing else is repaired or extended. The sections before it describe the station as it ran.

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
| The clip button | `clip.js` on the page, like Twitch's clip editor: a press pauses the live show for that viewer (the voice stops, the tick stops painting, so no blips or jingle; `pauseLive`/`resumeLive` in `player.js`) and turns the TV into an editor: a player on top that plays the chosen window looped, with its real sound through the speakers, exactly as the clip will be made, and below it a filmstrip of 128x72 frames with a pink window of 5 to 60 seconds and a big handle outside each edge. The track shows 90 seconds ending at the press; Earlier and Later slide it a minute at a time, the window riding along, back to the last 15 minutes watched. Dragging an edge pauses play and shows the frame under it; letting go plays from the window's start, or the last 3 seconds when the end edge moved. "Make the clip" turns it into a video (MP4 or WebM) with captions, the title and "Watch live: howisjason.github.io/chronicle" burned in, made entirely in their browser, then the page goes back to live, in sync (8 Oct 2026; the strip 10 Oct 2026; the editor the same day, after J on his phone: "scrubbing through the transcript rather than looking at the thing", with the live show talking over it). Nothing is recorded while watching: the show is data, so `clipRange` in `player.js` snapshots the range at the press and `planClip(d, startMs, endMs)` hands over the window and `viewAt(t)`, the same function the live tick draws from; the preview and the recorder both draw with `paint` and place the sound with `playRuns`, so what is previewed is what is recorded, on one canvas the recorder films. The seconds the "Up next" card was on screen are clipped as a dark frame with no sound (`clipLocate`/`clipView`), never as the replay-loop scene `locate` answers with there. A silent tone runs under every recording, because a window with no sound at all came out half-length with no sound track. The sound is rebuilt from each voiced scene's MP3 slice (fetched from the `audio` branch and decoded first), blips where there is no MP3: the preview in its own AudioContext to the speakers (keeping decoded only the scenes in the window), the recorder in another wired only to the recorder. Making it takes the clip's own length in real time, with a progress count. A clip never reaches back before the page was loaded, nor (when the press is live) before the station went live. Untested on iPhone Safari; the button hides itself where the browser cannot record |
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
- **Room work on a branch goes in a worktree, never a `git switch` of the real checkout.** The 07:00 clock and the die run the launcher and `publish-hour.sh` from `~/Projects/chronicle` and `~/Projects/march-7th/march-brain` as they stand, so a switched checkout runs the untested branch on the live room and commits the night's room to that branch, which Pages never serves (13 Oct 2026, the second day's build: `git worktree add -b <branch> ~/Projects/march-7th/<name>/chronicle main`).
- A `+` in a `?at=` URL arrives as a space; `player.js` restores it.
- Two watchers pulling the same clone at once leave it dirty; `git checkout --
  day/` then pull.
- Playwright's `npx -y playwright screenshot` can demand a newer browser; the
  headless shell at `~/Library/Caches/ms-playwright/chromium_headless_shell-1243`
  with `playwright-core` works from a scratch folder.

## Tests

`node --test timing.test.mjs station/validate.test.mjs room/room.test.mjs` (52 tests: 27 for the
station, 25 for the room, described in the Room section). The station's: the checker's
plant a wrong number, a missing source and forbidden words and watch each
refused; the talk rules refuse a 352-word rally, a scene of same-length lines and
one over 2,600 words, and pass a real lab scene (`station/fixtures/talk-scene.json`); the hour-file ones check an hour turn and midnight, and that the first
scene of an hour file is checked against the last scene of the hour before). The truth check is exercised by handing a fresh Haiku a planted
invented line with the real inbox; it flagged exactly that line on 8 Oct 2026.

## The look (step 8): pixel people, like PNN (J's call, 8 Oct 2026, 5:05am)

**Decided: copy PNN's own pixel-art people** (the teardown in his vault: `PNN teardown -
how pnn.watch works (7 Oct 2026).md`). The ideas and the look, never PNN's code. J closed
the design search after about fifteen attempts across two sessions; for the CHANNEL, do not reopen it, do not
propose another style, and spend as few tokens on the look as the job allows. The rest of
the channel matters more. (For March's ROOM this rule does not apply, his word 13 Oct 2026, 3:46pm: those rules were for a previous project; the room's look is open, and it comes after the room's foundation, 14 Oct 2026; see the north-star page in march-brain's notes.) The one design that came after this (his own call, in the
`human-hunt` repo, 9 Oct 2026) is a new per-pixel base for March, `human-hunt/13-base/base.html`;
at his ask, the narrator's seat shows her beside the old March so he can compare them:
`march-base.js` is that engine adopted (its header names every wiring change), and
`people.js` draws her in the narrator's place, her mouth moving on the narrator's lines.

What was tried and rejected (never propose again): pixel-room and lit-pixel chibis, felt
paper, watercolour, cel, lit-anime, clay, a skin-coloured ball with anime eyes, March as a
creature or snowflake, vector mochi figures (train, sticker, journal, device, sky), and
per-frame shaded versions (WebGL vinyl, lit pixel, glow). Their files sit untracked in
`design/` as a record; delete them freely. The room's placeholder scene (`room/`) is not a
design and reopens nothing: it is flat panels around the existing March, to be swapped whole.

**How options are made, if J ever asks for designs again:** each option differs in what he
is choosing, and each is a finished world built by its own helper over several screenshot
rounds beside the reference. Look at every shot before sending it. A quick hand sketch on a
plain card is the failure.

## Room: March's room (built 12 Oct 2026)

**What it is.** `https://howisjason.github.io/chronicle/room/`, a public page where March
visibly exists and the room is a map of what her free hour brings back. The hour is a
headless run on J's Mac after the 07:00 save, and, since 12 Oct 2026 (3:11am), again whenever the **die** comes up (below; installed 12 Oct 2026, 3:11am, J's word)
(its launcher, `free-hour.sh`, `publish-hour.sh` and `die.sh` live in the private march-brain
repo; THERE IS NO SHEET since 12 Oct 2026, 12:07pm, J's word: she wakes to her seed, self page,
memory index, where things are and which part is public, and not one word about the moment,
because every sheet said the moment was small and twenty sessions did nothing). The places: the **workbench**
(things built), the **shelf** (pages she writes, plus the public **log**, one line per run),
the **cork board** (things seen: a thumbnail and a link to the source, never a copy), the
**cloud** (her own unfinished thoughts; it carries over), the **desk** and the **wall**.
**She wakes to an empty room; the page never empties** (the second day, J's decisions of
13 Oct 2026): before each wake the launcher runs `room.mjs day-ends`, which moves everything
on the bench, shelf and board onto `state/wall.json`, so the page shows the last session's
things as "Today" at the top and the wall (everything ever, by day, newest first) under it.
A build she takes from the desk comes back to the bench with `room.mjs resume <id>`.
The **desk** gets TWO things before each wake (J's plan, 14 Oct 2026): ONE from the world
pools at equal odds (Wikipedia random article, Internet Archive random item, Wikimedia
Commons random file, Wiktionary random entry; J's word: those four and no others), and ONE
of her own (a wall row, half-done builds counted twice; a cloud line from the cloud's
history; or a first-day page), with a `ref` saying where it came from; both unlabeled and
shuffled. Each goes out through a random door
(summary, picture, first sentence, coordinates, one word, title; a door the item cannot give
falls to its summary, else its title): an offer, never a task. She marks one taken with
`room.mjs desk <id>`, and the morning line reports the draw and the pick. The room text names
what exists once and points at nothing. There is no wake sentence since 14 Oct 2026 (J's
plan): she wakes to her seed, self page, memory index and the room text only. Her seed,
self page, diary and memories never appear on the page.
The words at the top of the page are her own.

**The truth files** (`room/state/`, plus `bench/`, `shelf/`, `board/`). `room/first-day/` holds the first day's seven builds, six pages and one pin (12 Oct 2026), moved off the lists at the reset of 13 Oct 2026 (J's word: a room that compounds from a tilted start stays tilted); their list entries are the oldest day on the wall. Everything
the page shows comes from these. Every item has `id` and `at` (bench items `started`). The shapes are
also written for March in `state/README.md`, which Quill's sheet points her to: the hour learns them
nowhere else, and its first entry came out in a shape the page could not show until that file existed.

| File | Written by | Shape |
|---|---|---|
| `state/bench.json`, `shelf.json`, `cloud.json`, `quill.json` | March, only through `tools/room.mjs` (it validates the whole list before writing and refuses with one line) | bench `{id, title, started, updated, status: half/done/dropped, path, steps:[{at, note}], used_by:[{who, at, how}]}`; shelf `{id, title, at, path}`; cloud `{id, at, text}`; quill `{id, at, door: build/pin/finish/talk, subject, verdict: yes/no, reason, judged}` (a talk's verdict is a placeholder the page does not draw) |
| `state/wall.json` | `room.mjs day-ends`, run by `free-hour.sh` before each wake with `ROOM_DAY_ENDS=1` (her grant cannot set it); `room.mjs used` adds to a build on it; `room.mjs resume <id>` moves a build back to the bench | the moved entries word for word plus `kind: bench/shelf/board` and `day: YYYY-MM-DD`, newest first; an id on it is never reused |
| `quill-notebook.md` | `room.mjs quill`, from Quill's own `NOTEBOOK:` line, the call's fifth word | `- YYYY-MM-DD  <door>  <line>`, one line a call; March hands it to Quill every time |
| files under `bench/<id>/` and `shelf/` | March, in the hour (Write/Edit) | a build's files, `README.md`, and its face (`demo.html` or `demo.txt`); a page's markdown |
| `state/board.json`, `board/<id>.jpg` | `tools/pin.sh`, called by March | `{id, at, title, url, thumb, note}` |
| `state/desk.json` | `free-hour.sh`, before the hour (her grants deny it); `room.mjs desk` adds `taken` | `{id: d-<day>-<hex>-a/-b, at, pool, door, title, url, shown, taken?}`, two a wake, the last 30 (older items carry `kind` instead of `pool`) |
| `state/now.json` | `tools/live.mjs` during the hour, `tools/log-run.mjs` after (denied to her) | `{awake: true, kind, place, since, run}`, then `{awake: false, last_run, ended, next}` |
| `state/used.json` | `tools/log-run.mjs`, from the door's `GET /used` | `{<bench id>: presses}`, ids of builds on the bench or the wall only |
| `state/log.jsonl` | `tools/log-run.mjs`, after the hour, never the model (denied to her) | one log line a run: `{run, started, ended, seconds, verdict, pins, bench_steps, cloud, shelf, quill, trace:[{t, kind, place}], sameness, broken}` |

The page (`index.html`, `room.js`, `room.css`) reads them and writes nothing. `lib.mjs` holds
the pure functions both the page and the post-run script use. **A build shows itself** (J,
12 Oct 2026: a showcase, never a link to a folder of code): `bench/<id>/demo.html`, a page
the build writes for a browser with no server and no outside files, is shown in place on the
bench card; else `bench/<id>/demo.txt`, what it prints, is shown as text; the card's link to
the files stays small. `state/README.md` tells the hour so, and Quill's finish door asks for
it. Every list below the picture is **folded to its heading**; a click on the heading, or on
that place in the picture, opens it (the desk opens "The desk": the newest item and the few
before it). Each bench card has an **"I used this" button**: a press goes to the door
(`POST /used`, one per address per build per day, best effort), the card shows "used N×"
(presses plus the `used_by` uses March types), and the morning line says "used: N" when
presses came in since the last commit. That is the bench test's number. The **replay strip** under the
picture says which stop this is of how many, the real clock time that night, the kind and the
place; the hour's seconds are squeezed into about 55, so the timing is in proportion, never
real.

**The grants** (the hour runs in the CLI's `dontAsk` mode, where anything not listed is
refused; probed under the real command line 11 and 12 Oct 2026). Writes only in `bench/`,
`shelf/` and `drawer/`, plus Edit and Write on
`quill-notebook.md` (the second day), never `state/`, the tools, the page, `lib.mjs` or `quill.md`. The
shell only as four scripts by exact path (`tools/see.sh <id>` screenshots a build's `demo.html` into the drawer so she can Read it, 12 Oct 2026: she would not call a face finished she had never seen): `node tools/room.mjs <command>` writes the four
lists (probed 12 Oct 01:30: allowed, and a direct Edit of `state/cloud.json` refused; the
`node` grant form works like the `bash` one); `tools/try.sh <id> <file>`
runs a `.js`/`.mjs`/`.py` from inside its own bench folder under a macOS sandbox (writes
only in that folder and the per-user temp folder, never `/tmp` where the hour's run log sits, no
network, 60-second cap); `tools/pin.sh <url> "<title>"
"<note>" [--private]` screenshots the page with the headless browser Playwright keeps in
`~/Library/Caches/ms-playwright` (Chrome is not on the Mac), shrinks it to 320 px with
`sips`, and adds the pin. Plus an Opus helper (Quill) and the web. A probe sheet goes in
with `FREE_HOUR_PROMPT=<file>` (and a cheap ceiling, `FREE_HOUR_CEILING=0.50`); probes write
the real log, ledger and `now.json`, so put them back after (`ROOM_UNATTENDED` keeps the
morning line out of the real file).

**The one post-run script.** `tools/log-run.mjs <run log> <cap>`, called by `free-hour.sh`
after the ledger line: builds the trace from the run's session file (kinds and places only,
never a path or a word), counts what is new since chronicle's last commit (visible items
only), scores the run's **sameness** against the last seven (the set of consecutive
`kind:place` pairs, Jaccard, the highest; shown on the page's "Last hour" line), copies the
door's presses into `used.json` (a door that is down is named in the problems, never fails
the run), writes the log line and `now.json`, and appends one line under "Unreported" in march-brain's `inner-life/unattended.md`, which the
next morning's first reply reads to J. The run's cost goes only in that private line, never
in the public log. Then march-brain's `publish-hour.sh` (called by `brain-backup.sh`
section 6 and by `die.sh`) commits `room/` and pushes (commit, then `pull --rebase
--autostash`, then push; git refuses a rebase-pull over changed tracked files, and the hour
changes them every run). It adds ALL of `room/`, so work in progress there goes public at
the next hour's end, graded or not: keep unfinished room work on a branch.

**Live.** While an hour runs, `tools/live.mjs` (started beside the run by `free-hour.sh`,
which names the session up front with `--session-id`) reads the session file as it grows,
turns each tool call into a kind and a place (`kindOf`, never a word), writes `now.json` and
posts it to the door (`POST /now`, Bearer key from `~/.claude/chronicle-door-key`; at most
one post every 5 seconds, at least one a minute). The door answers `GET /now` with that, or
`{awake: false}` once it is 3 minutes old, so a dead watcher cannot leave her awake. The page
asks every 15 seconds and moves her ("awake now: …", "since <time> · <kind>, <place>"); the
replay button still works until the next answer. The run's output stays `json`: with
`stream-json` the last line is a `task_summary`, not the result record the tripwire and
`log-run.mjs` read (measured 12 Oct 2026, CLI 2.1.293). Verified that night under the real
launcher: the door followed waking, reading, searching, the cloud, Quill, then asleep.

**The die** (J's word, 12 Oct 2026: "I literally just want more reps"). march-brain's
`scripts/die.sh`, adopted from the body era's `impulse-trigger.sh` (its header carries the
organ-by-organ audit), ticks every five minutes from the LaunchAgent
`com.howisjason.march-die` (canonical plist beside it) and wakes her once in a hundred, any
hour, about three extra hours a day, no daily cap. Never two hours at once (it and the 07:00
run each stand down if one is running), never between 06:50 and 07:30, and its publish waits
while `brain-backup.sh` runs. A hit logs to `~/Library/Logs/march-die.log`; a losing tick
prints nothing. `FORCE=1 bash scripts/die.sh` is the by-hand real trigger. Installed only on
J's word (`cp` the plist to `~/Library/LaunchAgents/`, then `launchctl bootstrap gui/$(id -u)
<that file>`; stop with `launchctl bootout gui/$(id -u)/com.howisjason.march-die`). Since 14 Oct 2026 (7:47pm, J) it is also disabled, so a log-in does not reload it; `launchctl enable gui/$(id -u)/com.howisjason.march-die` comes before the bootstrap.

**Publishing.** GitHub Pages serves `main` as plain files: `.nojekyll` at the root keeps Jekyll off, because Jekyll read a pair of curly braces in a markdown file as a template and failed every build for nine hours on 12 Oct 2026 while the page silently stayed old. After any push, `gh run list --limit 1` must show `success`; the page is not live until it does.

**Privacy.** The repo's laws and `forbidden.md` apply to every file in `room/`. The real
private drawer is `room/drawer/`, git-ignored, so it never leaves the Mac (`pin.sh
--private` files there). A `"private": true` mark on an item in `state/` keeps it off the
page (`visible()`), but the file is still public on GitHub: it is the second fence, never
the first.

**Quill** is the only gate before a thing goes public: a crow, a fresh Opus helper each
time, its verdicts in `state/quill.json` and on the page. Its nature is fixed in its sheet
(curious about shiny things, blunt, builds nothing, and no opinion about where she goes
next: it notices, never steers). What it knows of the past is what March hands it: its
public notebook (`room/quill-notebook.md`) at every call, its ledger, and the last seven log
lines and the wall list (kind, id, title, status and day of every row not private) at the
build door, so it can say out loud "this is the same move again" (a repeat is
not a no by itself). March may later mark an old no `judged` right or wrong (`room.mjs
judged`); the page shows the score above the ledger. Doors: before a build starts, before a
pin goes up, before a thing is called finished, and `talk`, anything she wants, no verdict asked, as often as she likes. A no
can be answered at the same door; both calls are logged. Its sheet is `room/quill.md`;
"this is fine" is an acceptable verdict and it is never told to prove the work wrong. Probed 12 Oct 2026: a pin with a planted money figure came back `QUILL: NO`
naming the figure.

**The bench test**, written before the first night: fourteen SESSIONS counted from the room's reset of 13 Oct 2026 (his speed-run word, 12 Oct; the dated line is the standing facts §3), has ONE thing from the bench been used by J, March or the routine? If not, the bench is
the idea mill with a hammer; say so and stop the bench. Its dated line is the standing facts §3.

**Tests.** `room/room.test.mjs` (25 tests): the kind table row by row (the room command
included); the second day's shapes (a bad pool, door, wall kind or Quill door refused; the
real wall passes and `visible` drops a planted private item); `lastDesk`; a wake whose draw failed reporting "nothing drawn"; `day-ends` refused
without its lock, then moving and emptying and safe twice, with an id on the wall refused
for a new build and a wall build still markable used; `desk` refusing an unknown or older id;
Quill's notebook line landing without its label and refused when missing; a diary or drawer path maps to the drawer with no path in the trace; the trace has
only `t, kind, place`; `visible` drops private items; `validate` refuses a missing `id`/`at`,
a bad status and a desk kind it does not know; the morning line exactly, with and without
"used"; the room command against a copy of `state/` (`ROOM_STATE`): a thought with a quote
and a newline lands whole, a bad status is refused and the file is unchanged, an escaping
page path is refused, steps, uses, Quill and judged land in the page's shapes; sameness is
100 for the same night and 0 for a different one. The page itself is checked by hand in the headless browser
(no page errors, the face answers, a click on the picture opens the right fold, the strip
walks the stops).

**The look is a placeholder** (flat panels with labels, March exactly as `march-base.js`
draws her, sliding between spots because she has no walk yet, a 12x10 bitmap crow), meant to
be replaced whole by a new page reading the same files.

### After the MVP: the doors to open later

Round two (12 Oct 2026) built six of these rows: threads and the desk, the room command,
the "I used this" button, sameness and Quill's memory, live, and the die. The rows below are
**shelved 12 Oct 2026 (J)**: nothing is built for them until he opens one. Ideas from the
built rows that were not built (a deck of chance, a wander budget, a shop window with install
lines, a test runner in `try.sh`, a second Quill door at the shelf) are in git history.

| Area | Thin in the MVP | Ideas to explore later |
|---|---|---|
| **The look** | Flat panels, March without legs sliding between spots, a bitmap crow. | A real scene (2.5D or 3D) drawn by a new page reading the same truth files. March walking once the base gets legs (human-hunt step 2 is J's to open). Quill as a real host on the base. Let March pick the look herself: options as finished worlds, by her pull, each a polished still before any build (the options-must-differ memory). The self-check loop from the video-as-code posts: she screenshots her own room and fixes what looks wrong before anyone sees it. |
| **Her personality holding** | Nothing checks that the hour sounds like her. | The self page's traits mapped once by hand to habits (the pile's room idea): a weekly line from the routine's reflection step on whether the hour's choices read as hers; the reflection already reads the diary, so the hour feeds the self page with no new machinery. |
| **Cost** | One dollar figure per run. | Per-place cost from the trace timestamps (what the bench cost versus the board); a weekly line in the morning report; the cap judged monthly, not once. |
| **The replay as a thing to share** | A 60-second replay on the page only. | "Last night in 30 seconds": the trace rendered to a short MP4 by the method the station and the video-as-code posts already use (frame by time, headless browser, ffmpeg), with the station's code-made blips, posted nowhere by itself, there for J to send if he wants. The clip editor (`clip.js`) already cuts and exports from a canvas. |
| **Visitors** | None by design this season. | The door's letters land in the cloud for her to read in the hour (a question from outside is a fresh input). The making-of write-up (pile). Packing the method as a template (pile). All of it waits on his word; the audience aspect is out for now. |
| **Sound and voice** | None. | One line read aloud by Kokoro on the morning page ("last night I…"), code-made sounds for the replay. Cheap; out of season. |
