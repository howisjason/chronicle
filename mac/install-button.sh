#!/usr/bin/env bash
# install-button.sh: builds the Chronicle button app from mac/button.applescript
# into ~/Applications and puts it in the Dock. Run once, or again after editing it.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p ~/Applications
osacompile -o ~/Applications/Chronicle.app button.applescript
if ! defaults read com.apple.dock persistent-apps | grep -q "Chronicle.app"; then
  defaults write com.apple.dock persistent-apps -array-add \
    "<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>file://$HOME/Applications/Chronicle.app/</string><key>_CFURLStringType</key><integer>15</integer></dict></dict></dict>"
  killall Dock
fi
echo "button: ~/Applications/Chronicle.app"
