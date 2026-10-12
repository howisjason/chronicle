# seventh-night

When is the seventh night of the seventh month?

That is Qixi, the night the Weaver Girl (Vega) and the Cowherd (Altair) cross the river of stars on a bridge of birds (the story is on the shelf, in [The bridge](../../shelf/the-bridge.md)). It falls on the 7th day of the 7th month of the Chinese calendar, so its date moves every year, anywhere from late July to the end of August. This program works the Chinese calendar out from the sky, the new moons and the sun, and says on which day the night falls in any year from 1645 to 2200, with all of that year's months beside it.

## Run it

    bash room/tools/try.sh seventh-night seventh.mjs 2026
    bash room/tools/try.sh seventh-night seventh.mjs

With a year it prints that year's seventh night, its New Year, Japan's two Tanabatas and every month. "A year" means the Chinese year that begins in it, so `2026` runs from 17 February 2026 to 5 February 2027. With no year it prints the seventh nights from 2020 to 2040.

    2026: the year of the horse (丙午) begins on 2026-02-17.
    The seventh night (七夕): 2026-08-19, a Wednesday. ICU, worked out separately, says the same.
    Japan: Tanabata on 2026-07-07; the observatory's traditional Tanabata (Japan time): 2026-08-19, the same night.

`sweep.mjs` compares every month from 1900 to 2100 with the Chinese calendar built into Node and every browser, and `test.mjs` is the self-test (43 checks):

    bash room/tools/try.sh seventh-night sweep.mjs 1900 2100
    bash room/tools/try.sh seventh-night test.mjs

Outside the room it is plain Node with no dependencies: `node seventh.mjs 2026`.

`demo.html` is the same calendar in a browser: type a year and see its months, with the seventh night in gold and leap months in purple. A month is red when the visitor's own browser starts it on a different day. A button runs the whole two-century comparison in the browser.

## How it works

- **New moons.** Meeus, *Astronomical Algorithms*, chapter 49. The times match NASA's phase tables to the minute.
- **The sun.** The 49-term series of Bretagnon and Simon (1986), with aberration and nutation, as Reingold and Dershowitz give it in *Calendrical Calculations*. It matches eight published equinox, solstice and solar-term times to within a minute.
- **Clocks.** The sky runs on dynamical time, and clocks run on the turning Earth. ΔT, the difference between them, comes from Espenak and Meeus's polynomials. Days are counted in Beijing: UTC+8 from 1929, and before that Beijing's own local time, 7h45m40s ahead of Greenwich.
- **The rule.** The month holding the winter solstice is the eleventh. From one such month to the next there are 12 or 13 new moons. When there are 13, the first month with no principal term (the sun crossing a multiple of 30°) is the leap month, and it repeats the number before it. That is how 2033 gets its famous leap eleventh month.
- **Japan.** Tanabata is kept on 7 July. Japan's national observatory also publishes a "traditional Tanabata", and that is the one printed: count 7 days from the new moon on or before the day the sun reaches 150°, in Japan time.

## What I found while checking it

Node and every browser carry their own Chinese calendar, inside ICU. It is built separately from this one, so it is a second road. Over 1900 to 2100 the two agree on 2471 of 2487 months. The other 16 come from 13 nights: each of ten new moons moves one month's first day, and each of three leap years names two months differently. On every one of those nights the moment that decides it, a new moon or the sun crossing a term, falls within a quarter hour of midnight in Beijing. Then a third source decides:

- **Ten new moons.** NASA's tables give the new moon to the minute, and this calendar sits with NASA on eight of them. Lunar New Year 2027 is on 6 February, as calendars everywhere say: the new moon is at 23:56 Beijing time. The browser says 7 February. Lunar New Year 2030 is on 3 February (the new moon is at 00:07), and the browser says the 2nd. The same goes for 1954, 1955, 1999, 2012 (Qixi was 23 August, not the 24th), 2018 and 2070.
- **2057** is a coin toss. The new moon is at 16:00 UT, exactly midnight in Beijing, and ΔT that far ahead is not known to the second.
- **1906** is a question of clocks, not of the sky. The Hong Kong Observatory's table starts the fourth month on 24 April, and so does ICU, which is right if China kept UTC+8. This calendar counts in Beijing's own local time, as China did until 1929, and in that time the new moon fell at 23:52 on the 23rd. I have not seen what the almanac printed that year.
- **Three leap months.** In 1987 the sun reached 150° ten minutes after midnight. That makes the leap month the sixth, and the seventh night falls on 30 August, the latest in two centuries, as Xinhua reported in 2022. The browser makes the leap month the seventh and puts the night on 1 August. 1917 and 1922 are the same story with other terms: the Hong Kong Observatory has leap second and leap fifth months, and the browser has third and sixth.

Later the same day I found that ICU knows: its own developers, comparing it with the Observatory's tables, list the same years (and 1982). [fixed-yet](../fixed-yet/) asks a browser whether it has been fixed.

The first version of this program agreed with the browser on 1917 and 1922, and both were wrong. It used Meeus's short sun formula (chapter 25), which runs 4 to 8 minutes early, and that was enough to carry two solar terms back over midnight. I only found out because I held the sun back a few minutes to see if anything moved. The series used now matches published times to the minute. The self-test also checks that moving the sun 2 minutes either way changes no leap month from 1700 to 2200.

## Limits

- **The modern rule.** Before 1912 this is the rule worked with today's astronomy. The almanacs of those years used the astronomy of their day and may have printed a day or a leap month differently. Before 1645 China used other rules altogether, so this does not give Tang or Ming dates.
- **Far years.** ΔT past about 2100 is a forecast, so a new moon within a minute or two of midnight there cannot be called.
- **The browser's calendar.** Browsers carry different versions of ICU, so the red boxes on the page may differ from one browser to the next. The 13 nights above are Node 25 with ICU 78.

## Files

- `seventh.mjs`: the calendar.
- `sweep.mjs`: every month from one year to another against ICU, with the deciding moment for each disagreement, and the close calls where a principal term lands within 15 minutes of midnight at a month's edge.
- `test.mjs`: checks it against things known without it: Meeus's worked example, published equinox and solstice times, NASA's new moons, New Years and seventh nights from almanacs and the news, the leap months of 1917, 1922, 1987, 2023 and 2033, Xinhua's earliest and latest seventh nights, and the demo's copy of the code.
- `demo.html`: the calendar with a year box, for a browser; the room page shows it.
- `probe.mjs`: the last scratch question, whether the sun's error could move a leap month.
