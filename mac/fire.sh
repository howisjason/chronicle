#!/usr/bin/env bash
# fire.sh: the one line that starts the morning. Builds the prompt from the
# inbox and hands it to a cloud session; returns at once. Needs a real
# terminal (claude --cloud refuses without one); a LaunchAgent gets one with
# `script -q /dev/null bash mac/fire.sh`.
# Usage: bash mac/fire.sh [YYYY-MM-DD] [MINUTES_AHEAD] [MODEL]   (defaults: today, 20, claude-haiku-5-5)
# The station runs live: it writes, voices and pushes one segment at a time
# until the day's chapters reach MINUTES_AHEAD past the clock, then ends.
# Haiku 5.5 (released 7 Oct 2026, $0.10 in / $0.50 out per million, 20x under
# Sonnet 5.5) is the default on J's word, 8 Oct 2026; the first full run is
# the test of whether it writes well enough.
set -euo pipefail
cd "$(dirname "$0")/.."
export TZ=Asia/Bangkok
DATE=${1:-$(date +%F)}; MINUTES=${2:-20}; MODEL=${3:-claude-haiku-5-5}
IN=inbox/$DATE
[ -s "$IN/commits.md" ] || { echo "fire: no inbox for $DATE; run mac/gather.sh first" >&2; exit 1; }
PROMPT="follow STATION.md for $DATE, keep $MINUTES minutes ahead of the clock; the inbox follows

## commits
$(cat "$IN/commits.md")

## day-note
$(cat "$IN/day-note.md")

## notes
$(cat "$IN/notes.md" 2>/dev/null || true)"
exec claude --model "$MODEL" --cloud "$PROMPT"
