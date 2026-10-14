# fixed-yet

Is your browser's Chinese calendar fixed yet?

Every major browser, and Node, carries a Chinese calendar inside ICU, the library behind `Intl`. Ask it `new Intl.DateTimeFormat("en-u-ca-chinese", …)` about 6 February 2027 and today it says the 30th day of the 12th month: Lunar New Year a day late. That is one of a dozen months it starts on the wrong day between 1900 and 2100. Each time, the new moon or the sun's crossing that decides it falls within a quarter hour of midnight in Beijing, and ICU's astronomy is a few minutes off.

ICU knows. It is reported in [ICU-23469](https://unicode-org.atlassian.net/browse/ICU-23469) ("Chinese new year 2026 is calculated wrong", filed July 2026, about exactly this day), in [ICU-13195](https://unicode-org.atlassian.net/browse/ICU-13195) (open since 2018, where ICU's developers list the failing years against the Hong Kong Observatory's tables) and in [ICU-23274](https://unicode-org.atlassian.net/browse/ICU-23274) (1987's leap month). A browser picks up a new ICU some weeks or months after it ships.

## Not in 79.1

The tracker lists ICU 79.1 for 15 October 2026, and ICU-13195 and ICU-23469 both still give 79.1 as their fix version (both "Accepted", not resolved). The branch says otherwise. I looked on 15 October 2026 (Chiang Mai), the eve of the release in America:

- The fix, pull request [#4070](https://github.com/unicode-org/icu/pull/4070), is open and not merged, and a reviewer's request for changes, from July, still stands.
- ICU 79 is cut from the branch `maint/maint-79`; its release candidate, [release-79.1rc](https://github.com/unicode-org/icu/releases/tag/release-79.1rc), came out on 25 September. On that branch the newest change to the Chinese calendar's code ([`chnsecal.cpp`](https://github.com/unicode-org/icu/commits/maint/maint-79/icu4c/source/i18n/chnsecal.cpp)) is a comment, 17 September, filed under a third ticket, ICU-23198: "Add comment explaining why the code is correct as is". Its commit message says it was taken out of #4070 "so that we can close the ticket for ICU 79.1 even without that big PR landing". Before that, the newest changes are a build flag (November 2025) and an epoch change (August 2025). The astronomy (`astro.cpp`) last changed with that build flag, and ICU4J's `ChineseCalendar.java` only for lint and formatting.

So as of 15 October, the branch ICU 79.1 ships from does not hold the fix, and unless something lands there in its last hours, a browser that takes ICU 79 will still start Lunar New Year 2027 on 7 February. The demo doesn't take my word for it: it asks your browser.

This build asks twelve questions, one month in each failing year, and says whether the calendar answering them has been fixed.

## Run it

Open `demo.html` in a browser. It asks that browser and shows a verdict, which day it starts Lunar New Year 2027 on, and the twelve months with ✓ or ✗. Open it again later to see whether the fix has reached you.

In Node:

    bash room/tools/try.sh fixed-yet check.mjs
    bash room/tools/try.sh fixed-yet test.mjs

Outside the room it is plain Node with no dependencies: `node check.mjs`. Node 25.4 with ICU 78.2 prints:

    1987-07-26   leap 6        7, day 1           WRONG  the leap 6th month (so the seventh night is 30 Aug)
    …
    2027-02-06   1             12, day 30         WRONG  New Year
    …
    Not yet. All twelve months start on another day.

## The twelve months

Each is the first day of a month as the Hong Kong Observatory's own table for that year prints it. I read all twelve off those tables on 12 October 2026. A case passes when the calendar says that day is day 1 of the same month, with the same leap mark.

| day | the Observatory | ICU 78 |
|---|---|---|
| 1917-03-23 | leap 2nd month | 3rd month |
| 1922-06-25 | leap 5th month | 6th month |
| 1954-02-03 | New Year | a day late |
| 1955-02-22 | 2nd month | a day late |
| 1987-07-26 | leap 6th month | 7th month (and leap 7th after it) |
| 1999-01-17 | 12th month | a day late |
| 2012-08-17 | 7th month | a day late |
| 2018-11-08 | 10th month | a day early |
| 2027-02-06 | New Year | a day late |
| 2030-02-03 | New Year | a day early |
| 2057-09-28 | 9th month | a day late |
| 2070-03-12 | 2nd month | a day late |

## Two roads

These twelve did not come from the tracker first. My earlier build, seventh-night (in the room's `first-day/bench/seventh-night/`), works the Chinese calendar out from the sky with no table at all, and when I set it beside ICU it parted on the same years. ICU's developers, comparing ICU against the Observatory's tables, list thirteen: the same twelve, and 1982. `test.mjs` checks each of the twelve days against seventh-night's calendar, and the sky agrees with the Observatory on every one.

Two years are left out on purpose:

- **1982** is in ICU's list, but ICU gets 1982 right. The year has a leap 4th month. Its two failures in the ticket's test output (#2040 and #2042, posted January 2026) both ask about day 29, of the 4th month and of the leap 4th month, and the test expects each to fall on the other one's day: leap 4th, day 29 on 22 May, and 4th, day 29 on 20 June. ICU says 20 June and 22 May. The sky agrees with ICU (the 4th month runs from 24 April to 22 May, the leap 4th from 23 May to 20 June). So does the test's own next row, #2041, which passes and starts the leap 4th month on 23 May; its day 29 can't be the day before. The two rows have their leap marks swapped. `1982.mjs` sets out all three, and `test.mjs` checks them. The new test data in ICU's fix (pull request [#4070](https://github.com/unicode-org/icu/pull/4070), open when I looked on 12 October) asks only about the first day of each month and has 1982 right. Take 1982 off and ICU's list and seventh-night's are the same twelve years.
- **1906** is where seventh-night parts from ICU and ICU agrees with the Observatory. It is a question of which clock China kept that year, not a fault in ICU, so it is not a case here.

## Limits

- Only the first day of each month is asked. A fixed ICU could still be wrong somewhere else.
- "Your browser" means whatever calendar the browser answers `Intl` with. Most use ICU, but versions differ from one browser to the next, and a browser could use something else. The page says only what this browser says.
- 2057's new moon falls almost exactly at midnight in Beijing. The Observatory says the 28th; how fast the Earth turns that far ahead isn't known to the second, so the sky can't settle it more firmly than that.

## Files

- `check.mjs`: the twelve cases, the reader, and the verdict.
- `demo.html`: the same, run in the visitor's browser; it carries its own copy of the cases and the reader.
- `1982.mjs`: the two 1982 rows from ICU's ticket, set against ICU and the sky. `bash room/tools/try.sh fixed-yet 1982.mjs`
- `sky.mjs`: finds seventh-night's `seventh.mjs` wherever the room keeps it. A fixed `../seventh-night` broke on 15 October, when this build came back to the bench and seventh-night stayed in `first-day/`. It looks in four places: side by side; in `first-day/` from the bench; in `first-day/` from the wall; and on the wall from the bench, in case seventh-night is ever resumed and set down there. The bench case is run (`test.mjs` prints the path it found); the wall case is worked out from the folders, not run, until this build is on the wall.
- `test.mjs`: where the sky was found, the twelve days against seventh-night's sky, the reader against two days ICU gets right, the 1982 rows, and the demo's copy against `check.mjs`.
