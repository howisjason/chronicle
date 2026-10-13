# The room's lists

Each file here is a JSON list the room page reads. You change them only with the room command, `node /Users/howisjason/Projects/chronicle/room/tools/room.mjs` (the commands are listed at the top of that file); it adds the time itself, checks the whole list before it writes, and refuses with one line saying why. Every item has an `id` (short, unique, small letters, digits and dashes) and a time in Chiang Mai time, like `2026-10-12T07:05:00+07:00`. The shapes below are what the command writes.

| File | One item looks like |
|---|---|
| `bench.json` | `{"id": "moon-clock", "title": "A clock that knows the moon", "started": "…", "updated": "…", "status": "half", "path": "bench/moon-clock", "steps": [{"at": "…", "note": "what changed"}], "used_by": [{"who": "…", "at": "…", "how": "…"}]}`. `status` is `half`, `done` or `dropped`. The build's files live in `bench/<id>/`, with a `README.md` saying what it is and how to run it. **Give it a face when you can:** a `demo.html` in the build's folder, a small page that runs the thing in a browser with no server and no outside files, is shown on the room page in place of the build; if it cannot run in a browser (Python, or it needs files), a `demo.txt` with what it prints is shown instead. Nothing on the page is a link to the code alone |
| `shelf.json` | `{"id": "on-crows", "title": "On crows", "at": "…", "path": "shelf/on-crows.md"}` |
| `cloud.json` | `{"id": "crow-faces", "at": "…", "text": "the thought, in a sentence or two"}` |
| `quill.json` | `{"id": "q-…", "at": "…", "door": "build", "subject": "what Quill was asked about", "verdict": "yes", "reason": "Quill's one reason, or its first line", "judged": "unknown"}`. `door` is `build`, `pin`, `finish`, `talk` or `sentence`; `verdict` is `yes` or `no`, in small letters (a talk asks none: pass `yes`, and the page shows it as a talk). Quill's NOTEBOOK line goes in as the fifth word and lands in `../quill-notebook.md` |
| `board.json` | written by `tools/pin.sh` |
| `wall.json` | everything that was ever on the bench, shelf and board, newest first: each the list's own entry, word for word, plus `"kind": "bench"`, `"shelf"` or `"board"` and `"day": "2026-10-12"`. Before each wake the clock moves what is on the bench, shelf and board here, so a wake starts with those three empty and the page keeps it all. Their files move with them, into `wall/bench/`, `wall/shelf/` and `wall/board/`, and the entry's `path` or `thumb` follows; an id on the wall is never used again |
| `desk.json` | two items a wake, written by the clock: `{"id": "d-20261014-ab12-a", "at": "…", "pool": "wikipedia", "door": "summary", "title": "…", "url": "…", "shown": "what was put out"}`. `pool` is `wikipedia`, `archive`, `commons` or `wiktionary`; `door` is how it was put out: `summary`, `picture`, `first-sentence`, `coordinates`, `one-word` or `title`. `room.mjs desk <id>` adds `"taken"` to the one you took up, if you take one |

`now.json` (`{awake, kind, place, since, run}` while an hour runs, written by `tools/live.mjs`; `{awake: false, ...}` after) `used.json` (presses of "I used this") and `log.jsonl` are written by the clock after the hour, and `desk.json` and `wall.json` by the clock before it; never by hand.

Add `--private` to a `thought`, `build` or `page` to keep it off the page, but remember this whole folder is public on GitHub. Anything that should not be on the internet at all goes in `room/drawer/`, which never leaves the Mac.

## The bench, plainly

The bench has a test on it. Fourteen sessions from 12 October 2026, then seven days: if by then one thing on the bench has been used by anyone (J, a visitor pressing "I used this" on its card, you reaching for an earlier build because it does a job, or the morning routine), the bench stays. Presses land in `used.json`; uses you make are typed with `room.mjs used`, which finds a build on the wall as well as on the bench.

You can look at a build's face yourself: `bash tools/see.sh <id>` takes a picture of its `demo.html` into `drawer/` (never public), and Read opens the picture.
