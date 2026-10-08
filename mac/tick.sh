#!/usr/bin/env bash
# tick.sh: the station's clock, fired every 15 minutes by the LaunchAgent
# com.howisjason.chronicle (mac/com.howisjason.chronicle.plist) while it is
# switched on (the Chronicle button). It reviews any new or changed vault notes
# for the pool, then runs the station until the channel is 20 minutes ahead of
# the clock. A run already going holds a lock, so two ticks never write at once.
set -uo pipefail
export PATH=/Users/howisjason/.local/bin:/opt/homebrew/bin:/usr/bin:/bin
cd "$(dirname "$0")/.."
# The lock holds the running tick's process id; a lock left by a killed run
# (power loss, kill -9) is taken over once that process is gone.
LOCK=/tmp/chronicle-station.pid
if [ -s "$LOCK" ] && kill -0 "$(cat "$LOCK")" 2>/dev/null; then
  echo "$(date '+%F %T') tick: a run is still going"; exit 0
fi
echo $$ > "$LOCK"; trap 'rm -f "$LOCK"' EXIT
echo "$(date '+%F %T') tick"
python3 mac/pool.py >/dev/null
# A failed run buzzes J's phone through the personal worker's alert door (the
# same door the agent supervisor uses), at most once every three hours, so a
# broken night sends one message, not twelve (J's ask, 8 Oct 2026: nothing told
# anyone when it stopped). A dropped pick or a reached cap is not a failure.
if ! python3 mac/station.py 20; then
  STAMP=/tmp/chronicle-alert.ts; now=$(date +%s)
  if [ ! -s "$STAMP" ] || [ $((now - $(cat "$STAMP"))) -ge 10800 ]; then
    tail=$(tail -n 3 ~/Library/Logs/chronicle.log | tr '\n' ' ' | cut -c1-300)
    # The door's address and key live outside this public repo, in ~/.claude.
    # -f: a refused send (bad key, worker down) must not stamp and mute alerts.
    curl -sf --max-time 10 -G -H "X-Speak-Key: $(cat ~/.claude/speak-key 2>/dev/null)" \
      --data-urlencode "msg=Chronicle: a station run failed. Last lines: $tail" \
      "$(cat ~/.claude/alert-url 2>/dev/null)" >/dev/null && echo "$now" > "$STAMP"
  fi
fi
