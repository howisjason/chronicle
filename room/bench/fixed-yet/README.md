# fixed-yet

Is your browser's Chinese calendar fixed yet?

Every major browser, and Node, carries a Chinese calendar inside ICU, the library behind `Intl`. Ask it `new Intl.DateTimeFormat("en-u-ca-chinese", …)` about 6 February 2027 and today it says the 30th day of the 12th month: Lunar New Year a day late. That is one of a dozen months it starts on the wrong day between 1900 and 2100. Each time, the new moon or the sun's crossing that decides it falls within a quarter hour of midnight in Beijing, and ICU's astronomy is a few minutes off.

ICU knows. It is reported in [ICU-23469](https://unicode-org.atlassian.net/browse/ICU-23469) ("Chinese new year 2026 is calculated wrong", filed July 2026, about exactly this day), in [ICU-13195](https://unicode-org.atlassian.net/browse/ICU-13195) (open since 2018, where ICU's developers list the failing years against the Hong Kong Observatory's tables) and in [ICU-23274](https://unicode-org.atlassian.net/browse/ICU-23274) (1987's leap month). A fix is planned for ICU 79.1, which the tracker lists for 15 October 2026; when I looked, on 12 October, its pull request was still open. A browser picks up a new ICU some weeks or months after it ships.

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

These twelve did not come from the tracker first. My earlier build, [seventh-night](../seventh-night/), works the Chinese calendar out from the sky with no table at all, and when I set it beside ICU it parted on the same years. ICU's developers, comparing ICU against the Observatory's tables, list thirteen: the same twelve, and 1982. `test.mjs` checks each of the twelve days against seventh-night's calendar, and the sky agrees with the Observatory on every one.

Two years are left out on purpose:

- **1982** is in ICU's list, but I cannot find what fails in it. The Observatory, ICU 78 and seventh-night all start every month of 1982 on the same day, the leap 4th month on 23 May included (`test.mjs` checks that one too). Their failing test may be something other than the first day of a month, or an older ICU. I don't know which.
- **1906** is where seventh-night parts from ICU and ICU agrees with the Observatory. It is a question of which clock China kept that year, not a fault in ICU, so it is not a case here.

## Limits

- Only the first day of each month is asked. A fixed ICU could still be wrong somewhere else.
- "Your browser" means whatever calendar the browser answers `Intl` with. Most use ICU, but versions differ from one browser to the next, and a browser could use something else. The page says only what this browser says.
- 2057's new moon falls almost exactly at midnight in Beijing. The Observatory says the 28th; how fast the Earth turns that far ahead isn't known to the second, so the sky can't settle it more firmly than that.

## Files

- `check.mjs`: the twelve cases, the reader, and the verdict.
- `demo.html`: the same, run in the visitor's browser; it carries its own copy of the cases and the reader.
- `test.mjs`: the twelve days against seventh-night's sky, the reader against two days ICU gets right, and the demo's copy against `check.mjs`.
