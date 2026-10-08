-- The Chronicle button (J's ask, 8 Oct 2026: "a physical button that I can
-- toggle", then "both options": an on/off switch, and an on-for-a-while).
-- Click the app: it says whether the station is on, and until when, and offers
-- a list. On means the clock (LaunchAgent com.howisjason.chronicle) fires every
-- 15 minutes and keeps the Mac from idle sleep; off means nothing new airs and
-- the page replays. A timed run writes its end time to inbox/until.txt, and the
-- first tick after that time switches the clock off (mac/tick.sh). Built into
-- ~/Applications/Chronicle.app by mac/install-button.sh.
set home to POSIX path of (path to home folder)
set plist to home & "Library/LaunchAgents/com.howisjason.chronicle.plist"
set untilFile to home & "Projects/chronicle/inbox/until.txt"
set spend to do shell script "/opt/homebrew/bin/python3 " & quoted form of (home & "Projects/chronicle/mac/usage.py")
set isOn to (do shell script "launchctl list | grep -c com.howisjason.chronicle || true") is not "0"
set untilText to do shell script "[ -s " & quoted form of untilFile & " ] && date -r $(cat " & quoted form of untilFile & ") '+%H:%M' || true"

if isOn and untilText is not "" then
	set state to "The station is ON until about " & untilText & "."
else if isOn then
	set state to "The station is ON, with no end time."
else
	set state to "The station is OFF. The page replays."
end if

set choices to {"On, no end", "On for 1 hour", "On for 4 hours", "On for 8 hours", "Off"}
set picked to choose from list choices with title "Chronicle" with prompt (state & return & spend) default items {item (1 + ((isOn) as integer) * 4) of choices}
if picked is false then return
set picked to item 1 of picked

if picked is "Off" then
	do shell script "rm -f " & quoted form of untilFile & "; launchctl unload -w " & quoted form of plist & " 2>/dev/null || true"
	display notification "Nothing new will air. The page keeps replaying." with title "Chronicle is OFF"
	return
end if

if picked is "On, no end" then
	do shell script "rm -f " & quoted form of untilFile
	set msg to "It runs until you turn it off."
else
	set hrs to word 3 of picked as integer
	do shell script "echo $(( $(date +%s) + " & (hrs * 3600) & " )) > " & quoted form of untilFile
	set msg to "It turns itself off after about " & hrs & " hour" & (item (1 + ((hrs > 1) as integer)) of {"", "s"}) & "."
end if
if not isOn then do shell script "launchctl load -w " & quoted form of plist & " && launchctl start com.howisjason.chronicle"
display notification msg & " The first new scene airs within a few minutes." with title "Chronicle is ON"
