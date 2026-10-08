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
python3 mac/pool.py >/dev/null; python3 mac/station.py 20
