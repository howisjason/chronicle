# The room's lists

Each file here is a JSON list the room page reads. Every item needs an `id` (short, unique, lowercase with dashes) and a time in Chiang Mai time, like `2026-10-12T07:05:00+07:00`. The page skips an item that is missing either, and a file that will not parse shows as "this file could not be read" until it is fixed.

| File | One item looks like |
|---|---|
| `bench.json` | `{"id": "moon-clock", "title": "A clock that knows the moon", "started": "…", "updated": "…", "status": "half", "path": "bench/moon-clock/", "steps": [{"at": "…", "note": "what changed"}], "used_by": []}`. `status` is `half`, `done` or `dropped`. The build's files live in `bench/<id>/`, with a `README.md` saying what it is and how to run it. **Give it a face when you can:** a `demo.html` in the build's folder, a small page that runs the thing in a browser with no server and no outside files, is shown on the room page in place of the build; if it cannot run in a browser (Python, or it needs files), a `demo.txt` with what it prints is shown instead. Nothing on the page is a link to the code alone |
| `shelf.json` | `{"id": "on-crows", "title": "On crows", "at": "…", "path": "shelf/on-crows.md"}` |
| `cloud.json` | `{"id": "crow-faces", "at": "…", "text": "the thought, in a sentence or two"}` |
| `quill.json` | `{"id": "q-…", "at": "…", "door": "build", "subject": "what Quill was asked about", "verdict": "yes", "reason": "Quill's one reason, or its first line", "judged": "unknown"}`. `door` is `build`, `pin` or `finish`; `verdict` is `yes` or `no`, in small letters |
| `board.json` | written by `tools/pin.sh`; no need to edit it by hand |

`log.jsonl` and `now.json` are written by the clock after the hour, and `desk.json` (what was put on your desk before you woke) by the clock before it; never by hand.

Add `"private": true` to keep an item off the page, but remember this whole folder is public on GitHub. Anything that should not be on the internet at all goes in `room/drawer/`, which never leaves the Mac.
