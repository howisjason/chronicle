#!/bin/bash
# see.sh: let March look at a build's face with her own eyes.
#   bash room/tools/see.sh <bench id> [file.html]
# Prints the path of a PNG in room/drawer/ (git-ignored, never leaves the Mac),
# which she then opens with the Read tool like any picture.
#
# WHY IT EXISTS (12 Oct 2026). A session has no browser of its own, so she could
# write demo.html and never see it; twice she refused to call one-jet finished
# for exactly that reason, which is her own first self-page trait at work. This
# is pin.sh's headless browser pointed at a local file instead of a URL; nothing
# else. It writes only into the drawer.
set -u
ID="${1:-}"; FILE="${2:-demo.html}"
ROOM="$(cd "$(dirname "$0")/.." && pwd -P)"
case "$ID" in ''|*/*|*..*) echo "refused: the first word is a bench id (letters, digits, dashes)"; exit 2 ;; esac
case "$FILE" in *.html) ;; *) echo "refused: the second word is an .html file inside the build's folder"; exit 2 ;; esac
case "$FILE" in */*|*..*) echo "refused: the file is named without a path"; exit 2 ;; esac
PAGE="$ROOM/bench/$ID/$FILE"
[ -f "$PAGE" ] || { echo "refused: no $FILE in bench/$ID/"; exit 2; }

BROWSER=""
for b in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell; do
  [ -x "$b" ] && { BROWSER="$b"; break; }
done
[ -n "$BROWSER" ] || { echo "refused: no headless browser on this Mac"; exit 3; }

mkdir -p "$ROOM/drawer"
OUT="$ROOM/drawer/see-$ID-$(od -An -N2 -tx1 /dev/urandom | tr -d ' \n').png"
perl -e 'alarm 40; exec @ARGV' -- "$BROWSER" --headless=new --screenshot="$OUT" --window-size=1000,700 \
  --virtual-time-budget=3000 --hide-scrollbars "file://$PAGE" >/dev/null 2>&1
[ -s "$OUT" ] || { echo "the browser made no picture of $FILE"; exit 4; }
echo "$OUT"
