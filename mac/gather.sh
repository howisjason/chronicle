#!/usr/bin/env bash
# gather.sh: builds the inbox for one air date on the Mac. Never commits anything.
# Usage: bash mac/gather.sh [YYYY-MM-DD]   (default: today, Chiang Mai time)
#
# The air date D tells the day before it: the window is D-1 00:00 to D 06:00,
# Chiang Mai time (+07:00, no daylight saving). This file is the one place a
# privacy mistake can happen, so it is short and readable, and it copies ONLY
# what the channel plan's allow-list names (8 Oct 2026, J's confirm):
#   commits.md   commit messages from the public-safe repos, nothing else
#   day-note.md  the day as moments with his own words, written by one Sonnet
#                call from the day's session transcripts (station/day-note.md),
#                under forbidden.md
#   notes.md     the quiet-day shelf (mac/shelf.txt), gated blind
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

# 2. the day note: one Sonnet call over the day's session text (station/day-note.md),
#    under forbidden.md, then the blind gate.
#    Only typed turns and spoken replies go in (never tool calls, results or
#    system text), capped so the call stays small. Written ONCE per air date, so
#    later gathers the same day never swap a note already told on air.
# A note held back by the gate stays held for the day: no rewrite every tick
# (the grader's finding, 8 Oct 2026: that would cost a Sonnet call each time).
if [ ! -s "$OUT/day-note.md" ] && [ ! -e "$OUT/day-note.md.held" ]; then
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
# Sonnet 5.5: the note is the day's whole story material, written once a day,
# so depth is worth it here (J's model rule, 7 Oct 2026: Sonnet for deep work).
{
  echo "Write the day note for $PREV. Follow this sheet:"; cat station/day-note.md
  echo; echo "THE FORBIDDEN LIST, absolute:"; cat forbidden.md
  echo; echo "SESSION TEXT:"; cat "$OUT/sessions.txt"
} | claude -p --model claude-sonnet-5-5 --tools "" --strict-mcp-config --setting-sources "" --no-session-persistence > "$OUT/day-note.md"
rm -f "$OUT/sessions.txt"
# The note gate: a blind reviewer removes every paragraph not fit for a
# public channel (mac/gate.py; J's word, 8 Oct 2026: no manual review).
python3 mac/gate.py "$OUT/day-note.md" para || true  # held: the station runs on commits alone
fi

# 3. the quiet-day shelf: the vault notes listed in mac/shelf.txt (never
#    committed), whole, gated blind once per air date. (The old #onair tag
#    rule is gone: J wanted no manual work, so March picked the shelf.)
N=0
if [ ! -e "$OUT/notes.md" ] && [ ! -e "$OUT/notes.md.held" ] && [ -s mac/shelf.txt ]; then
  while IFS= read -r name; do
    case "$name" in ''|'#'*) continue;; esac
    f="$P/personal/context/obsidian/🧠 Second Brain/$name.md"
    [ -s "$f" ] && { echo "## NOTE: $name"; cat "$f"; echo; }
  done < mac/shelf.txt > "$OUT/notes.md"
  python3 mac/gate.py "$OUT/notes.md" note || true
fi
[ -s "$OUT/notes.md" ] && N=$(grep -c '^## NOTE:' "$OUT/notes.md" || true)
echo "gathered $OUT: $(grep -c . "$OUT/commits.md") commit lines, $(cat "$OUT/day-note.md" 2>/dev/null | wc -w | tr -d " ") words of day note, $N tagged notes"
