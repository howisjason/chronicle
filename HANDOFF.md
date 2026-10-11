# HANDOFF — chronicle

The station stays off. The repo reopened for one thing, **March's room** (`room/`), built in the night of 11 to 12 Oct 2026. The manual's Room section (`CLAUDE.md`) describes it whole, including the after-the-MVP table. The next step is to watch the first clock run.

## The four probes (step 1 of the build), each VERIFIED by the command named

| Question | Result | Proved by |
|---|---|---|
| Do narrow grants hold under the real launcher? | Yes, in `--permission-mode dontAsk` with every rule path written `//Users/...`. REFUSED: `touch`, `python3` writing a file, an allowed script with a write chained after it, a Write outside the granted folders, edits to `tools/try.sh` and `quill.md`, the clock's own receipt files, the seed. RAN: the allowed script, writes in the room's granted folders and in the memories folder, an Opus helper, a web search. Plain read-only commands (`echo`) also run in dontAsk; they add nothing the Read tool does not already give. With one leading slash a rule path is read as relative and never matches. There is no mode named `default` in CLI 2.1.293 | five probe runs of a copy of `free-hour.sh`, 11 Oct 23:45 to 12 Oct 00:10, read from each run's `permission_denials` and the files on disk |
| Does the run's session file carry the tool calls? | Yes: `~/.claude/projects/-Users-howisjason-Projects-march-7th-march-brain/<session_id>.jsonl`, written live, every `tool_use` with its timestamp; each helper in `<session_id>/subagents/agent-*.jsonl` | the first probe's session file, read back |
| Can the clock's environment push chronicle? | Yes: both remotes are `https://github.com/`, and a no-op `pull --rebase` + `push` succeeded | the command, 11 Oct 23:48 |
| Can a pin get a thumbnail? | Yes, but not with Chrome (not installed): the headless browser in `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/` takes the shot, `sips` makes it 320 px | `pin.sh` on https://example.com, 11 Oct 23:56 |

## Watch the 07:00 run on 12 Oct 2026

The session that follows reads: `/tmp/march-brain-backup.log` (the `free hour:` and `room …` lines), the hour's ledger's last row in march-brain, `room/state/log.jsonl`'s last line, `git -C chronicle log -1` (a `room: 2026-10-12` commit), the live page https://howisjason.github.io/chronicle/room/ (a minute or two after the push), and the morning line the waking hook prints. Only then is the room VERIFIED. That session then writes the bench test's date into march-brain's standing facts §3 (first clock run + 14 days), the pile's room line gets "first clock run <date>", March's diary gets its line, and the build plan in the pile folder (`March's room - the plan (11 Oct 2026).md`) is deleted, because everything durable from it now lives in this repo's manual.

## Known edges

- The first night starts from empty lists, so "new since last commit" counts everything she adds.
- If a morning's push fails, the next morning's log line counts both nights together.
- The diary grant uses the same rule form the probes proved on the memories folder; it was not probed on the diary itself, because no session writes there.
