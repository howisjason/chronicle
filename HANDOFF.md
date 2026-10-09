> **Stamped 2026-10-09 21:47 · 60dc325** — true as of this commit; anything after it is unaccounted for.

# HANDOFF — chronicle

The fifth baton. The fourth one's "one job" (the writing rebuild) is done and live; the manual (`CLAUDE.md`) now describes the station as it runs and wins every conflict. J's private map is `personal/context/obsidian/🌱 Brain Dump/The channel - where it stands (8 Oct 2026).md`.

## The one job next

**Nothing is due on the writing: J's call (9 Oct, 9pm) is to let it run a few days and judge it from the logged scenes** ("we don't really have to make a definitive verdict right now"). When he comes back to it, read a spread of scenes from `day/<date>/*.json` with him, and measure with the snippet in the rebuild note's section 2 (lines, words, short and long turns) plus `inbox/costs.tsv` (labels `outline`, `write#N`, `talk#N`, `mend#N`, `truth`, `repair#N`).

**His ask, waiting on his go (9 Oct, 9pm): the new March in the narrator's seat, the old March in hers, both live on the stream, so he can compare them.** Possible and smaller than a full swap: in that seat she only needs the idle, a talking mouth and the neutral face (the narrator's mood is always neutral and his action always none). The work: lift the engine out of `human-hunt/13-base/base.html` (today a one-page demo that sizes itself to the window and runs its own 12-second script) into a drawing piece `people.js` can call with a position and a mouth state; seat her behind the desk in the narrator's place on the 128x72 stage (her head is 28 px against the old 14, so she is twice the size); update `CROP` in `panels.js` for the cast card. The narrator's deep voice will come out of her mouth, and the page is public, so viewers see two Marches.

## What changed on 9 Oct, ranked

1. **The writing rebuild is live** (merged 5b9c247, manual 772ec07). Every scene walks one arc; three Haiku calls (outline, script on medium effort, talk pass); refused lines are mended one by one before any rewrite; runs are one or two scenes; the kind sets only the middle's style; gaps 1000/150/350.
2. **The lab changed the plan in five places, each measured**: the mend (nine whole rewrites of 50-line scenes were all refused, each for a fresh small fault); the sheet's example nouns removed ("Tuesday, kettle on" in every scene); beat names banned on air; the outline pass; medium effort on the write call (7 of 14 picks passed on low, 3 of 3 on medium). Scenes settle near 1,000 words (about 6 minutes), not the planned 1,800.
3. **Two checker fixes from the first live tick (21:02, three picks dropped, nothing aired):** the talk floors went to 600 words and 3 short turns (0c0a0ee; the plan's 900 and 4 were set for scenes Haiku never writes), and "bank" counts as money only beside account, balance, loan, card or transfer, with common words like "has" and "never" no longer counted as worn out (60dc325; a river story dropped a whole pick on "the far bank"). The second tick aired "THE PULL AT THE BENCH" at 21:41 (34 lines, 904 words, new gaps, show stamped), read whole: good, with beat names still slipping out now and then ("the tangent earned its keep").
4. **The voice model was dead**: both files in `station/models/` were links into a wiped scratch folder. Real copies now (spare set in `~/.local/kokoro/`). VERIFIED with a test clip; the manual's Landmines carry it.

## Verified versus unseen

**VERIFIED:** 27 of 27 tests after every change; the voice loads and speaks; a lab scene voiced in 3.5 minutes for 5.2 minutes of speech; a fresh Sonnet grader confirmed 7 of 8 claims on the branch (the eighth was two unnamed word changes in `writer.md`, now named; its one crash path fixed in 5b9c247), stamped in `march-brain/notes/immune/graded.txt`. **REPORTED by the cost log:** about 5 cents a scene in the lab's best round. **VERIFIED live:** the first scene on the new writing aired at 21:41 on 9 Oct. **PROMISED:** a full day at the $2 cap on the new writing (the 9 Oct labs spent about $0.90 of that day's cap); the live pass rate over many picks; the two checker fixes are with a grader as this is stamped.

## Facts that will rot: recipes, not values

Spend today: `python3 mac/usage.py`. Clock on: `launchctl list | grep chronicle`. Lately: `tail -30 ~/Library/Logs/chronicle.log`. Pass rate: count `on air` against `three tries refused` in the log since a date.

## Open, in the order worth doing

1. The side-by-side Marches (his ask; his go). 2. The clip scrubber (page only, rebuild note section 7). 3. The schedule question: rotate the shows or keep the clock (his answer; rebuild note section 8). 4. The making pace: about 9 minutes of work buys about 6 minutes of show, so a long run shows replays between new scenes; if he minds, the cures are fewer dropped picks or writing two picks at once. 5. The clip on his phone (his to try). 6. The untracked `design/` files can be deleted (nothing reads them). Parked by his word: viewer questions on air; the journey (re-ask after about a week of the vault-only show).

## The one thing worth carrying forward

Numbers written into a plan before the lab are guesses. Every floor, budget and length in the rebuild plan moved once Haiku actually ran; measure first, then set the rule.
