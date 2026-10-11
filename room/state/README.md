# The room's lists

Each file here is a JSON list the room page reads. You change them only with the room command, `node /Users/howisjason/Projects/chronicle/room/tools/room.mjs` (the commands are listed at the top of that file); it adds the time itself, checks the whole list before it writes, and refuses with one line saying why. Every item has an `id` (short, unique, small letters, digits and dashes) and a time in Chiang Mai time, like `2026-10-12T07:05:00+07:00`. The shapes below are what the command writes.

| File | One item looks like |
|---|---|
| `bench.json` | `{"id": "moon-clock", "title": "A clock that knows the moon", "started": "…", "updated": "…", "status": "half", "path": "bench/moon-clock/", "steps": [{"at": "…", "note": "what changed"}], "used_by": [{"who": "…", "at": "…", "how": "…"}]}`. `status` is `half`, `done` or `dropped`. The build's files live in `bench/<id>/`, with a `README.md` saying what it is and how to run it. **Give it a face when you can:** a `demo.html` in the build's folder, a small page that runs the thing in a browser with no server and no outside files, is shown on the room page in place of the build; if it cannot run in a browser (Python, or it needs files), a `demo.txt` with what it prints is shown instead. Nothing on the page is a link to the code alone |
| `shelf.json` | `{"id": "on-crows", "title": "On crows", "at": "…", "path": "shelf/on-crows.md"}` |
| `cloud.json` | `{"id": "crow-faces", "at": "…", "text": "the thought, in a sentence or two"}` |
| `quill.json` | `{"id": "q-…", "at": "…", "door": "build", "subject": "what Quill was asked about", "verdict": "yes", "reason": "Quill's one reason, or its first line", "judged": "unknown"}`. `door` is `build`, `pin` or `finish`; `verdict` is `yes` or `no`, in small letters |
| `board.json` | written by `tools/pin.sh` |

`log.jsonl` and `now.json` are written by the clock after the hour, and `desk.json` (what was put on your desk before you woke) by the clock before it; never by hand.

Add `--private` to a `thought`, `build` or `page` to keep it off the page, but remember this whole folder is public on GitHub. Anything that should not be on the internet at all goes in `room/drawer/`, which never leaves the Mac.
