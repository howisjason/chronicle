-- The Chronicle button (J's ask, 8 Oct 2026: "a physical button that I can
-- toggle"). Click the app: it says whether the station is on, and flips it.
-- On means the clock (LaunchAgent com.howisjason.chronicle) fires every 15
-- minutes while the Mac is awake; off means nothing new airs and the page
-- replays. Built into ~/Applications/Chronicle.app by mac/install-button.sh.
set plist to (POSIX path of (path to home folder)) & "Library/LaunchAgents/com.howisjason.chronicle.plist"
set running to (do shell script "launchctl list | grep -c com.howisjason.chronicle || true") is not "0"
if running then
	set r to display dialog "The station is ON." & return & "It writes new scenes every 15 minutes while this Mac is awake." buttons {"Leave it on", "Turn off"} default button "Leave it on" with title "Chronicle"
	if button returned of r is "Turn off" then
		do shell script "launchctl unload " & quoted form of plist
		display notification "Nothing new will air. The page keeps replaying." with title "Chronicle is OFF"
	end if
else
	set r to display dialog "The station is OFF." & return & "Nothing new airs; the page replays." buttons {"Leave it off", "Turn on"} default button "Turn on" with title "Chronicle"
	if button returned of r is "Turn on" then
		do shell script "launchctl load " & quoted form of plist & " && launchctl start com.howisjason.chronicle"
		display notification "The first new scene airs within a few minutes." with title "Chronicle is ON"
	end if
end if
