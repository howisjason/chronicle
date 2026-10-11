#!/bin/bash
# pin.sh: put one thing March saw on the room's cork board.
#   bash room/tools/pin.sh <url> "<title>" "<her note>" [--private]
# Prints the new pin's id.
#
# WHY IT EXISTS. Same law as try.sh: the hour has no shell, and an unattended job
# gets one script allowed by exact path, never a broad grant. A pin is a small
# picture of the page plus a link to the source, never a copy of the page.
#
# WHAT IT DOES, ONLY: refuses anything but an http(s) address; takes one headless
# screenshot (Chrome if it is installed, else the headless browser Playwright
# keeps in ~/Library/Caches; Chrome is NOT on this Mac as of 11 Oct 2026), shrinks
# it to 320 px wide as board/<id>.jpg with sips, and adds one entry to
# state/board.json through Node (never sed on JSON). A failed shot still pins,
# with "thumb": null, and the page draws a title card instead. A board.json that
# will not parse is left alone and nothing is pinned.
#
# --private pins into room/drawer/ instead (drawer/board.json, drawer/<id>.jpg).
# The drawer is git-ignored, so it never leaves the Mac. A "private": true mark in
# state/ alone would keep a pin off the page but not off GitHub: this repo is
# public, and its files can be read by anyone (found by this script's own test,
# 11 Oct 2026).
set -u

URL="${1:-}"; TITLE="${2:-}"; NOTE="${3:-}"; PRIV="${4:-}"
case "$URL" in http://*|https://*) ;; *) echo "refused: a pin needs an http(s) address"; exit 2 ;; esac
[ -n "$TITLE" ] || { echo "refused: a pin needs a title"; exit 2; }
[ -z "$PRIV" ] || [ "$PRIV" = "--private" ] || { echo "refused: the fourth word may only be --private"; exit 2; }

ROOM="$(cd "$(dirname "$0")/.." && pwd -P)"
if [ "$PRIV" = "--private" ]; then PICS="$ROOM/drawer"; LIST="$ROOM/drawer/board.json"; REL="drawer"
else PICS="$ROOM/board"; LIST="$ROOM/state/board.json"; REL="board"; fi
mkdir -p "$PICS" "$(dirname "$LIST")"
ID="$(TZ=Asia/Bangkok date +%Y%m%d-%H%M)-$(od -An -N2 -tx1 /dev/urandom | tr -d ' \n')"
AT="$(TZ=Asia/Bangkok date +%Y-%m-%dT%H:%M:%S)+07:00"

BROWSER=""
for b in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell; do
  [ -x "$b" ] && { BROWSER="$b"; break; }
done

THUMB="null"
SHOT="$(mktemp -t pin).png"
if [ -n "$BROWSER" ]; then
  perl -e 'alarm 40; exec @ARGV' -- "$BROWSER" --headless=new --screenshot="$SHOT" --window-size=1200,800 \
    --virtual-time-budget=5000 --hide-scrollbars "$URL" >/dev/null 2>&1
  if [ -s "$SHOT" ] && sips -Z 320 -s format jpeg "$SHOT" --out "$PICS/$ID.jpg" >/dev/null 2>&1; then
    THUMB="\"$REL/$ID.jpg\""
  fi
fi
rm -f "$SHOT"

node -e '
const fs = require("fs");
const [file, id, at, title, url, thumb, note, priv] = process.argv.slice(1);
let list = [];
if (fs.existsSync(file)) {
  try { list = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { console.log("refused: " + file + " will not parse; fix it first"); process.exit(3); }
}
const pin = { id, at, title, url, thumb: JSON.parse(thumb), note };
if (priv === "--private") pin.private = true;
list.push(pin);
fs.writeFileSync(file, JSON.stringify(list, null, 2) + "\n");
' "$LIST" "$ID" "$AT" "$TITLE" "$URL" "$THUMB" "$NOTE" "$PRIV" || exit $?
echo "$ID"
