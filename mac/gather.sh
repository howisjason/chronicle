#!/usr/bin/env bash
# gather.sh: builds the inbox for one air date on the Mac. Never commits anything.
# Usage: bash mac/gather.sh [YYYY-MM-DD]   (default: today, Chiang Mai time)
#
# The air date D tells the day before it: the window is D-1 00:00 to D 06:00,
# Chiang Mai time (+07:00, no daylight saving). This file is the one place a
# privacy mistake can happen, so it is short and readable, and it copies ONLY
# what the channel plan's allow-list names (8 Oct 2026, J's confirm):
#   commits.md   commit messages from the public-safe repos, nothing else
#   day-note.md  a short note of the day, written by one small Haiku call from
#                the day's session transcripts, under forbidden.md
#   notes.md     vault notes tagged #onair, whole
# Nothing from growth-op, march-brain or personal ever enters, not even counts.
set -euo pipefail
cd "$(dirname "$0")/.."
export TZ=Asia/Bangkok
DATE=${1:-$(date +%F)}
PREV=$(date -j -f %F -v-1d "$DATE" +%F)
# The window runs to NOW, so a gather later in the day brings the day's own
# commits too (the station runs live and tells what is new since it last told).
FROM="$PREV 00:00:00 +0700"; TO="$(date '+%F %T') +0700"
OUT=inbox/$DATE; mkdir -p "$OUT"
P=/Users/howisjason/Projects

# 1. commits from the public-safe repos (each line: repo time message)
{
  echo "# commits, $PREV 00:00 to $DATE 06:00 (public-safe repos only)"; echo
  # format-local: a cloud session commits in UTC; the times here are Chiang Mai's.
  git -C "$P/howisjason.com" log --since="$FROM" --until="$TO" --reverse --format='howisjason.com %ad %s' --date=format-local:'%H:%M'
  git -C "$P/chronicle" log --since="$FROM" --until="$TO" --reverse --format='chronicle %ad %s' --date=format-local:'%H:%M'
  # braincell and creature-lab live inside the Projects repo; one log over both
  # paths so a commit touching both is listed once, labelled by its message.
  git -C "$P" log --since="$FROM" --until="$TO" --reverse --format='%ad %s' --date=format-local:'%H:%M' -- braincell creature-lab \
    | grep -v 'daily snapshot' | awk '{ label = ($0 ~ /creature-lab/) ? "creature-lab" : "braincell"; print label, $0 }' || true
} > "$OUT/commits.md"

# 2. the day note: one Haiku call over the day's session text, under forbidden.md.
#    Only typed turns and spoken replies go in (never tool calls, results or
#    system text), capped so the call stays small. Written ONCE per air date:
#    J reads it before the first fire (the first-ten gate), and later gathers
#    the same day must not swap it for a note he has not read.
if [ ! -s "$OUT/day-note.md" ]; then
python3 - "$FROM" "$TO" > "$OUT/sessions.txt" <<'PY'
import json, os, sys, glob, datetime as dt
frm = dt.datetime.strptime(sys.argv[1], '%Y-%m-%d %H:%M:%S %z'); to = dt.datetime.strptime(sys.argv[2], '%Y-%m-%d %H:%M:%S %z')
out = []
# Sessions in the order they were touched; each capped so no one session
# crowds the others out of the note.
files = sorted(glob.glob(os.path.expanduser('~/.claude/projects/-Users-howisjason-Projects/*.jsonl')), key=os.path.getmtime)
for f in files:
    m = dt.datetime.fromtimestamp(os.path.getmtime(f), dt.timezone.utc)
    if m < frm: continue
    turns = []
    for line in open(f, errors='ignore'):
        try: o = json.loads(line)
        except Exception: continue
        ts = o.get('timestamp')
        if not ts: continue
        t = dt.datetime.fromisoformat(ts.replace('Z', '+00:00'))
        if not (frm <= t < to): continue
        c = o.get('message', {}).get('content')
        if o.get('type') == 'user' and isinstance(c, str) and c.strip() and not c.lstrip().startswith('<'):
            turns.append('J: ' + c.strip()[:1200])
        elif o.get('type') == 'assistant' and isinstance(c, list):
            txt = ' '.join(x.get('text', '') for x in c if isinstance(x, dict) and x.get('type') == 'text').strip()
            if txt: turns.append('March: ' + txt[:1200])
    if turns:
        out.append('=== a session ===\n' + '\n\n'.join(turns)[:15000])
print('\n\n'.join(out)[:90000])
PY
{
  echo "Write the day note for $PREV: what J built, learned, decided, tried and failed at that day, in plain words (VOA Learning English), 120 to 250 words, in his words where his words are not about forbidden things. It will be read on a public channel. Say only what the session text below shows happened; never guess, never add. Mention no AI model names and no prices."
  echo; echo "THE FORBIDDEN LIST, absolute:"; cat forbidden.md
  echo; echo "Also forbidden: the names of any projects or people that are not clearly public work (when unsure, describe the thing, do not name it)."
  echo; echo "SESSION TEXT:"; cat "$OUT/sessions.txt"
} | claude -p --model claude-haiku-5-5 > "$OUT/day-note.md"
rm -f "$OUT/sessions.txt"
fi

# 3. vault notes tagged #onair, whole. The tag must stand on a line of its own:
#    a note that merely MENTIONS the tag (the channel plan does) must not match.
#    That near-miss happened on the first run, 8 Oct 2026, and the plan holds
#    private lines.
: > "$OUT/notes.md"; N=0
while IFS= read -r f; do
  { echo "## NOTE: $(basename "$f" .md)"; cat "$f"; echo; } >> "$OUT/notes.md"; N=$((N+1))
done < <(grep -rlx --include='*.md' '#onair' "$P/personal/context/obsidian/🌱 Brain Dump" 2>/dev/null || true)

echo "gathered $OUT: $(grep -c . "$OUT/commits.md") commit lines, $(wc -w < "$OUT/day-note.md" | tr -d ' ') words of day note, $N tagged notes"
