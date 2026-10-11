#!/bin/bash
# try.sh: run one file of a bench build, for March's free hour.
#   bash room/tools/try.sh <bench-id> <file> [args...]
#   bash room/tools/try.sh --probe          (prints ok; the permission probe's stub)
#
# WHY IT EXISTS. The hour has no shell (11 Oct 2026: under auto mode the CLI ran
# commands the allowed list never named). The shop law for unattended jobs is one
# script allowed by exact path, built incapable of more than its job, never a
# broad shell grant. This is that script for the bench: the hour's launcher
# grants `Bash(bash .../try.sh:*)` and nothing else of the shell.
#
# WHAT IT CANNOT DO. The file must resolve inside room/bench/<bench-id>/ (a ../
# or a link out is refused). It runs `node` or `python3 -I` from inside that
# folder, under a macOS sandbox that allows writes only in that folder and the
# per-user temp folder (never /tmp, where the hour's own run log sits: the
# grader's catch, 12 Oct 2026), and allows no network at all, so a build can neither touch
# anything else on the Mac nor send anything out. A 60-second cap stops a loop
# (macOS has no `timeout`; perl's alarm does the same job).
set -u

[ "${1:-}" = "--probe" ] && { echo ok; exit 0; }
[ $# -ge 2 ] || { echo "usage: try.sh <bench-id> <file> [args...]"; exit 2; }

ID="$1"; FILE="$2"; shift 2
case "$ID" in *[!a-z0-9-]*|"") echo "refused: a bench id is lowercase letters, digits and dashes"; exit 2 ;; esac

ROOM="$(cd "$(dirname "$0")/.." && pwd -P)"
DIR="$ROOM/bench/$ID"
[ -d "$DIR" ] || { echo "refused: no bench folder $ID"; exit 2; }
DIR="$(cd "$DIR" && pwd -P)"

REAL="$(cd "$DIR" && python3 -I -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$FILE")"
case "$REAL" in "$DIR"/*) ;; *) echo "refused: $FILE is outside bench/$ID"; exit 2 ;; esac
[ -f "$REAL" ] || { echo "refused: no such file $FILE"; exit 2; }

case "$REAL" in
  *.js|*.mjs) RUN=(node "$REAL") ;;
  *.py) RUN=(python3 -I "$REAL") ;;
  *) echo "refused: try.sh runs .js, .mjs or .py files"; exit 2 ;;
esac

PROFILE="(version 1)
(allow default)
(deny network*)
(deny file-write*)
(allow file-write* (subpath \"$DIR\") (subpath \"/private/var/folders\")
  (literal \"/dev/null\") (literal \"/dev/tty\") (regex #\"^/dev/fd/\"))"

cd "$DIR" || exit 2
perl -e 'alarm 60; exec @ARGV' -- /usr/bin/sandbox-exec -p "$PROFILE" "${RUN[@]}" "$@" 2>&1
CODE=$?
[ $CODE -eq 142 ] && echo "stopped: the 60-second cap"
echo "exit $CODE"
