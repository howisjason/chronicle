> **Stamped 2026-10-08 12:44 · 826303d** — true as of this commit; anything after it is unaccounted for.

# HANDOFF — chronicle

The third baton. It replaces the 05:08 one, which was wrong in three ways by noon: the pixel people it named as the next job are already on the page; its cost of 3 to 9 cents a scene came from the old cloud setup and an older writer (Haiku now measures about 1 cent); and most of its outstanding list belonged to parts deleted on 8 Oct (the cloud way, the daily-progress gatherer, the 08:00 gather). The manual (`CLAUDE.md`) wins every conflict and now describes the whole factory; J's private map is `personal/context/obsidian/🌱 Brain Dump/The channel - where it stands (8 Oct 2026).md`.

## The one job next

**The UI and UX of the channel page, in a fresh session, which is J's call: "I want to get all of the system factory stuff built out properly first before I touch the UI and UX stuff."** The factory is now finished. Start by looking at the live page yourself (https://howisjason.github.io/chronicle/, press "Tap for sound") and at PNN (https://pnn.watch) side by side, then ask J what bothers him most before changing anything. The look itself is DECIDED: PNN-style pixel people (CLAUDE.md, "The look"). Never reopen the style search and never propose a style from the rejected list there. If he asks for options, each one differs in what he is choosing and is a finished world built over screenshot rounds; a quick sketch on a plain card is the failure he has paid for twice. Keep the page contract that `player.js` and `clip.js` depend on: `viewAt(t)` is the one renderer for both the live page and the clip, so any visual change goes through it, and the clip must still burn in the title, the caption and "Watch live: howisjason.github.io/chronicle".

## What changed on 8 Oct, ranked

1. **The writing was rebuilt for the cheapest writer, on J's order.** J heard the stream and called it "robotic and bland ... a set of scenes laid out one in front of the other". Opus wrote clearly better scenes in the lab at about 10 cents each, and J refused it: "Fuck no. We are using Haiku ... the cheapest of the cheap." So quality now comes from direction rather than the model: lean sheets (a quarter of the old words wrote as well), March as the host who knows J and the narrator built as her opposite (J turned down a teller-and-listener design), segment kinds from PNN, a ten-line show memory, and a checker that refuses worn-out words. Not obvious: the long rulebook bought nothing, and sample lines in a character sheet get copied verbatim (PNN's owner found the same).
2. **The station pushes main.** Every aired scene does `git pull --rebase` and `git push`, so any commit on local main goes public within minutes, graded or not. This published the clip rework before its grader finished. Now in the manual's Landmines.
3. **The machinery holds 24/7.** Scenes are stored one file per hour; a viewer at 24/7 pulls about 17 MB a day instead of about 0.6 GB. The writer outpaces airtime (about 45 seconds to make a scene that airs about 1.7 minutes).
4. **The Dock button never worked until today** ("running" is reserved in an applet). It now offers On with no end, On for 1, 4 or 8 hours, or Off, and keeps the Mac from idle sleep while on.
5. **Clip now captures the 30 seconds before the press**, after J pointed out that nobody can predict the good moment.
6. A failed tick sends J a Telegram message, at most once every three hours; its address and key live in `~/.claude/`, never in this public repo.

## Verified versus unseen

**VERIFIED** (watched): the first new-sheets scene aired at 11:39 ("WHY IT ENDS AT THE GLASS", a verdict with an "up next"); the first hour-file scene was written to `day/2026-10-08/12.json`, voiced, pushed, and served by GitHub (200, 6.8 KB); `caffeinate` was running during the tick; both TEST alerts reached J's phone (his word); J's click on "On for 1 hour" wrote an end time an hour out; a tick past an end time removed it and stopped before writing; the button's status block printed the right state and spend; I looked at the clip frames across a scene change; 19 of 19 tests pass. Fresh graders checked every commit of the day, and their stamps are in `march-7th/march-brain/notes/immune/graded.txt`.

**REPORTED** (a builder or grader said so, nobody here watched): the 17 MB a day figure (a simulation of 848 scenes, cross-checked roughly by the grader at about 12 MB); clip audio matching the MP3s; the migration of 7 and 8 Oct into hour files being exact (grader compared all 55 scenes).

**PROMISED** (never seen): the Share button on a phone; the clip on iPhone Safari and Firefox; the timed run switching itself off for real at its end (only the past-end branch was run by hand); a full day at the cap.

## Facts that will rot: recipes, not values

Today's spend against the cap: `python3 mac/usage.py`. Whether the clock is on: `launchctl list | grep chronicle`. When a timed run ends: `date -r $(cat inbox/until.txt) '+%H:%M'` (no file means no end). What the station did lately: `tail -20 ~/Library/Logs/chronicle.log`. The cap: `cat inbox/daily-cap.txt` (missing means $2.00). Cost per scene: sum `inbox/costs.tsv` column 3 over a window and divide by the scenes aired in it.

## Decided on 8 Oct (all in the manual)

Haiku on low effort is the writer, for cost; the truth check is always Haiku. March is the host; the narrator is her opposite. Lean sheets with voices described, never sampled. One file per hour. The cap stays at $2 a day (J lowered it from $3). Unreviewed work goes on a branch while the station is on.

## Landmines found today

A lab run's cost counts against the live daily cap (the labs used $1.42 of 8 Oct's $2). Editing `mac/tick.sh` while a tick is running can break that tick, because bash reads scripts as it goes; pause the clock first. `launchctl unload` kills a run mid-scene and can leave one checked but unvoiced scene in the file; the next tick voices it.

## Open flags, live seams, his words

OPEN: at 24/7, the 26 approved notes would each come up about eight times a day; only a growing vault cures it. OPEN: the repeat catcher refused real scenes over plain words before it was loosened, and it still drops a pick now and then (log: "three tries refused"); watch how often. LIVE SEAM: `viewAt(t)` in `player.js` is shared by the live page and the clip, so a UI change there changes clips too. HIS WORDS NOT DONE: none; every instruction of the day was executed.

## Still outstanding, in order

1. The UI and UX (above), a new session. 2. One real day at the $2 cap to see how much of his Pro window it takes (no work, just time; read the usage screen with him). 3. Clip on a real phone, his to try. 4. The untracked files in `design/` are a record only and can be deleted (small).

## The one thing worth carrying forward

J kept turning down the more expensive answer (Opus, two drafts per scene) and asked for better direction instead, and that worked. When something is weak, look for what the system is telling the cheap model before reaching for a bigger one.
