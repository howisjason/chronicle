> **Stamped 2026-10-10 11:20 · 51a233b** — true as of this commit; anything after it is unaccounted for.

# HANDOFF — chronicle

The fifth baton. The fourth one's "one job" (the writing rebuild) is done and live; the manual (`CLAUDE.md`) now describes the station as it runs and wins every conflict. J's private map is `personal/context/obsidian/🌱 Brain Dump/The channel - where it stands (8 Oct 2026).md`.

## The one job next

**The read-through of the writing is next: J's call (9 Oct, 9pm) was to let it run a few days and judge it from the logged scenes** ("we don't really have to make a definitive verdict right now"). Read a spread of scenes from `day/<date>/*.json` with him, and measure with the snippet in the rebuild note's section 2 (lines, words, short and long turns) plus `inbox/costs.tsv` (labels `outline`, `write#N`, `talk#N`, `mend#N`, `truth`, `repair#N`).

**The two Marches are live side by side (10 Oct, 6:20am, his ask):** the old pixel March in her seat, the new per-pixel March (`march-base.js`, the human-hunt engine adopted, every wiring change named in its header) in the narrator's seat, her mouth moving on his lines. Built by an Opus builder, passed by a fresh Sonnet judge, seen on the live site. Loose ends, none urgent: her mouth shapes on narrator lines vary only a little; the narrator's cast-card text still describes the old bearded storyteller; draw time measured only on the Mac (about 2.5 ms), never on a phone; after a seek her pose settles from a slightly different spot than a continuous run (harmless). Its screenshots sit untracked in `design/two-marches/`.

**J's read of the two Marches (10 Oct, 6:23am):** "it does look a little bit janky right now", which he puts down to the page, the set and the layout all being made for the pixel sprites. He thinks it "pretty likely" he goes with the new models, and then the page's look changes with them, so nothing pixel-shaped should be polished now.

**How J works this project (10 Oct, 9:52am):** a side project done in the gaps, one message at a time while his other sessions run, never a dedicated block. Take one step per message and keep each step small enough to land in a gap. **The next step is the read-through of the logged scenes, with him** (his pick, after the scrubber).

**The clip editor is live, Twitch's way (10 Oct, 51a233b).** J tried the morning's text strip on his Android and found it unintuitive (the live show kept talking while he read a transcript), so it was rebuilt the same morning: Clip freezes the live show, the TV becomes a player looping the clip exactly as it will be made (picture and voice), and a filmstrip of the last 90 seconds sits below with pink trim handles (5 to 60 s), Earlier/Later reaching back to 15 minutes. The manual's clip row describes it. The "Up next" card's seconds clip as a dark frame (they used to be filled with an unrelated replay scene). Waiting on J's try on his real Android; the first play of a scene waits for its sound (5.5 s in the phone-size test).

## What changed on 9 Oct, ranked

1. **The writing rebuild is live** (merged 5b9c247, manual 772ec07). Every scene walks one arc; three Haiku calls (outline, script on medium effort, talk pass); refused lines are mended one by one before any rewrite; runs are one or two scenes; the kind sets only the middle's style; gaps 1000/150/350.
2. **The lab changed the plan in five places, each measured**: the mend (nine whole rewrites of 50-line scenes were all refused, each for a fresh small fault); the sheet's example nouns removed ("Tuesday, kettle on" in every scene); beat names banned on air; the outline pass; medium effort on the write call (7 of 14 picks passed on low, 3 of 3 on medium). Scenes settle near 1,000 words (about 6 minutes), not the planned 1,800.
3. **Two checker fixes from the first live tick (21:02, three picks dropped, nothing aired):** the talk floors went to 600 words and 3 short turns (0c0a0ee; the plan's 900 and 4 were set for scenes Haiku never writes), and "bank" counts as money only beside account, balance, loan, card or transfer, with common words like "has" and "never" no longer counted as worn out (60dc325; a river story dropped a whole pick on "the far bank"). The second tick aired "THE PULL AT THE BENCH" at 21:41 (34 lines, 904 words, new gaps, show stamped), read whole: good, with beat names still slipping out now and then ("the tangent earned its keep").
4. **The voice model was dead**: both files in `station/models/` were links into a wiped scratch folder. Real copies now (spare set in `~/.local/kokoro/`). VERIFIED with a test clip; the manual's Landmines carry it.

## Verified versus unseen

**VERIFIED:** 27 of 27 tests after every change; the voice loads and speaks; a lab scene voiced in 3.5 minutes for 5.2 minutes of speech; a fresh Sonnet grader confirmed 7 of 8 claims on the branch (the eighth was two unnamed word changes in `writer.md`, now named; its one crash path fixed in 5b9c247), stamped in `march-brain/notes/immune/graded.txt`. **REPORTED by the cost log:** about 5 cents a scene in the lab's best round. **VERIFIED live:** the first scene on the new writing aired at 21:41 on 9 Oct; the two checker fixes graded correct by a second Sonnet grader (ledger, 9 Oct evening). **VERIFIED (clip editor, 10 Oct):** in headless Chromium on a local copy, 20 of 21 checks passed (live voice paused in clip mode, the preview's MP3 on the speakers and the recording's only to the recorder, 60 and 5 second limits, Earlier, a 20-second window made a 19.9998-second MP4 with sound, back to live after a clip and after Cancel, a 30-second window is 79 of 236 px on a phone); the one fail checked phone sound too early, and a longer wait heard it start at 5.5 s. On the live site the editor played and made a clip. A fresh Sonnet grader passed f27c7ba on 8 claims with three bugs, fixed in 51a233b and re-graded correct. **PROMISED:** a full day at the $2 cap on the new writing (the 9 Oct labs spent about $0.90 of that day's cap); the live pass rate over many picks.

## Facts that will rot: recipes, not values

Spend today: `python3 mac/usage.py`. Clock on: `launchctl list | grep chronicle`. Lately: `tail -30 ~/Library/Logs/chronicle.log`. Pass rate: count `on air` against `three tries refused` in the log since a date.

## Open, in the order worth doing

1. The read-through of the logged scenes with him (above). 2. When he chooses the new models for good: restyle the page and the set to match them, and build the narrator (or a second host) on the base. 3. The schedule question: rotate the shows or keep the clock (his answer; rebuild note section 8). 4. The making pace: about 9 minutes of work buys about 6 minutes of show, so a long run shows replays between new scenes; if he minds, the cures are fewer dropped picks or writing two picks at once. 5. The clip editor on his Android (his to try). 6. The untracked `design/` files can be deleted (nothing reads them). Parked by his word: viewer questions on air; the journey (re-ask after about a week of the vault-only show).

## The one thing worth carrying forward

Numbers written into a plan before the lab are guesses. Every floor, budget and length in the rebuild plan moved once Haiku actually ran; measure first, then set the rule.
