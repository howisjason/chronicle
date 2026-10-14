# When is the Thai holy day, and is it the real full moon?

Wan phra are the Buddhist holy days of the Thai lunar calendar: waxing 8, waxing 15 (the full-moon day), waning 8, and the last day of each lunar month. This build works them out from the old arithmetic. It also computes the real full moon from the sky, so the two can be compared.

**The face:** `demo.html` shows the next wan phra and the next big holy day from today (Thai time), a histogram of where the full moon falls against the holy day, a paragraph on how this compares with a published count, every holy day of a year from 1996 to 2031, and, beside each full-moon day, when the sky is actually full.

## How to run

    bash room/tools/try.sh wan-phra test.mjs        # the checks, and the measurement
    bash room/tools/try.sh wan-phra make-demo.mjs   # rebuilds demo.html from wanphra.mjs
    bash room/tools/try.sh wan-phra lean.mjs        # where the moon sits inside the calendar's days
    bash room/tools/try.sh wan-phra count.mjs       # the holy days of 2013 and 2014 against a published count

Outside the room, `node test.mjs` does the same. `wanphra.mjs` has no dependencies: `holyDaysInYear(2027)` lists a year, and `missHours(jdn)` says how far the sky is from a day.

## The two roads

**The calendar** (road one): the Suriyayatra year rules, as written out in [pythaidate](https://github.com/hmmbug/pythaidate). Each Chula Sakarat year gets a *horakhun* (days since the epoch), an *avoman* and a *tithi*. These decide whether the year is normal (354 days), gets a leap day (month 7 gets 30 days, 355 in all), or gets a leap month (a second month 8, 384 in all). Odd months have 29 days and even months 30.

Copied exactly, those rules miss 26 of the 36 Makha Bucha dates in Thai Wikipedia's table, most of them by a whole month. The rows showed two changes, and with both made, every row from 1996 to Makha Bucha 2024 matches except one:

1. **A tithi of 24 is enough for a leap month.** 2012 has tithi 24 and a second month 8 (Asahna Bucha on 2 August 2012 in the table). 2031 also has tithi 24, and the table gives it a second month 8 too. pythaidate's rule reads `tithi > 24`. When two years in a row qualify (2020 has tithi 24, 2021 has 4), the second year takes the month. pythaidate makes that exception only for the pair 25 and 5.
2. **An avoman of 0 counts as 0.** pythaidate rewrites 0 as 692, which shuts that year out of a leap day. With 0 left alone, 2015 qualifies, its leap day is deferred to 2016 because 2015 already has a leap month, and the calendar matches 2014 to 2016. 2014 itself (avoman exactly 137) is not a leap-day year, so the cut is `< 137`. The other cut, `<= 126` in a solar leap year, is pythaidate's, and nothing here tests it at its edge.

**The sky** (road two): the times of the Moon's phases from Jean Meeus, *Astronomical Algorithms*, chapter 49. It reproduces the book's worked example to five decimals, and the 13 full moons of 2026 to within 0.64 minutes of the [U.S. Naval Observatory](https://aa.usno.navy.mil/api/moon/phases/year?year=2026).

## What the checks say

- **Thai PBS, 2026:** all 49 wan phra on [their list](https://www.thaipbs.or.th/now/content/3498), every date and every lunar label, plus Makha, Visakha and Asahna Bucha, Khao Phansa, Ok Phansa and Loy Krathong.
- **Thai Wikipedia, 1996 to 2031** ([Makha Bucha](https://th.wikipedia.org/wiki/วันมาฆบูชา), [Asahna Bucha](https://th.wikipedia.org/wiki/วันอาสาฬหบูชา)): the tables and this build agree on every row up to Makha Bucha 2024. From Asahna Bucha 2024 to Makha Bucha 2030 (twelve rows), the tables are one day later than this build, and from Asahna Bucha 2030 they agree again. So the tables add a leap day in 2024 that this build adds in 2030. On that stretch, the pages' own infoboxes (2025, 2026), Thai PBS (2026) and Thairath (Asahna Bucha 2024 on Saturday 20 July) all agree with this build, not with the tables.
- **The one row I can't settle: Asahna Bucha 2005.** The table says 20 July, and this build says 21 July. I found nothing that says which is right.

## What I found

From 1996 to 2031 the calendar has 446 full-moon days (waxing 15). The sky's full moon falls on that Thai day in **193 of them (43.3%)**. In 242 the holy day comes first: the day is over before the moon is full. In 11 it comes after. When they miss, the gap from the nearer midnight is a median of 9.4 hours and at most 34.7 hours.

### Why so one-sided (14 Oct 2026)

I left that as a question yesterday. `lean.mjs` measures where the moon sits inside the calendar's days, month by month, and the answer is not what I guessed.

My guess was a sawtooth that runs one way. The sawtooth is real. From one year's month 5 to the next, the mean full moon moves **8.8 hours later** after an ordinary year of 354 days, **15.2 hours earlier** after a leap-day year, and **2.5 hours earlier** after a leap-month year. Those are measured from the calendar against Meeus's mean moon, and the arithmetic (12 or 13 mean months, minus the year's days) gives the same three numbers to within 0.05 hours. So the calendar falls behind the moon year after year, and the full moon comes later and later in the holy day, until a leap pulls it back.

But that isn't why the misses fall on one side. For the mean moon (Meeus's mean phase, without the real moon's wobble), the full moon comes on average 24.9 hours after waxing 15 begins, the median is 25.0, and the range is 2.7 to 47.9 hours. The middle of that range is 25.3. So the spread is about even on both sides of its centre. What makes the misses one-sided is **where the centre sits: 0.9 hours after the holy day ends**, at the next midnight. A pile centred there puts a little under half of it on the day and nearly all the rest after. For the mean moon that's 207 on the day, 239 after and none before. The real moon's wobble widens the range to -9.5 to 58.7 hours, and the count becomes 193 on, 242 after and 11 before.

The new moon, too, falls after the day you might expect. It comes 6.6 hours into day 1 on average, so it falls on waxing 1 in 275 months and on the last day of the month before (the dark-moon holy day) in only 130. Add half a mean month (14 days 18.4 hours) to 6.6 hours and you get 24.9 hours into waxing 15. That's a consistency check, not a second road: both numbers come from the same moon.

Of the 24 windows of 24 hours that start on the hour (Thai clock), the one that catches the most true full moons starts at 15:00 (292 of 446). Midnight to midnight, the holy day itself, catches 193, and 06:00 to 06:00 catches 263.

One reading, which I haven't checked against any source on the Thai calendar: in Indian lunar reckoning, a lunar day (*tithi*) is twelve degrees of the moon's run past the sun, and the fifteenth ends at the moment of full moon. A calendar that counts day 1 from the day the new moon falls in would then put the full moon at the end of day 15, which is where it sits here. That fits the numbers. It isn't proved by them.

Run it: `bash room/tools/try.sh wan-phra lean.mjs`. The face shows it as a histogram. test.mjs checks every number in this section except the median, the middle of the range and 14 d 18.4 h, which lean.mjs prints.

### Against a published count (14 Oct 2026, night)

Someone counted this before me. Nibondh Saibejra and Jaturong Sukonthachat, "Lunar Calendar: Effects that May Be Caused by Errors in the Thai Lunar Calendar and a Development of Lunar Data Using Astronomy Knowledge", *The Journal of the Royal Institute of Thailand* 39(2), April–June 2014 ([the issue online](https://www.orst.go.th/FILEROOM/CABROYINWEB/DRAWER004/GENERAL/DATA0000/00000617.FLP/html/41)). The English abstract says the holy days run "faster than it should be according to the true Moon's phase by about 1 day up to 24 and 34 times in the Buddhist year 2556 and 2557". The Thai text says the holy days' tithi was off from the Moon's true tithi (ดิถีจริง) on as many as 34 of the 52 holy days of B.E. 2557. I read the Thai pages through a fetching tool that summarises, and that one sentence I had it quote. I haven't seen how they chose the moment of the day, or a list of their days.

`count.mjs` counts the same thing. A tithi is the Moon's lead on the Sun in steps of 12 degrees: tithi 15 ends at the full moon and tithi 30 at the new moon. A holy day's own tithi is its number in the month (8, 15, 23, and 29 or 30). The Sun comes from Meeus chapter 25 and the Moon from chapter 47 (39 terms of its longitude table, which the check below is there to vouch for). That is a new road to the sky, and it meets the old one: at the 54 new and full moons of chapter 49 from December 2012 to February 2015, the Moon's lead is 0 or 180 degrees to within 0.0134 degrees, about 1.6 minutes of the Moon's motion.

| The true tithi read at | 2013 (B.E. 2556), 50 holy days | 2014 (B.E. 2557), 49 holy days |
|---|---|---|
| 00:00, as the day begins | ahead 22, behind 0 | ahead 36 (5 of them by two), behind 0 |
| 06:00 | ahead 15, behind 5 | ahead 28 (1 by two), behind 0 |
| 12:00 | ahead 7, behind 10 | ahead 19, behind 1 |
| 24:00, as the day ends | ahead 0, behind 29 | ahead 4, behind 13 |

The paper's numbers are 24 and 34. Read as each day begins, mine are 22 and 36. Read that way, every miss is the calendar ahead of the Moon, the paper's direction, and the count climbs from 2013 to 2014 as theirs does. My reading of the climb, not measured here: it is the sawtooth above. The lunar years that start in 2013 and 2014 are both ordinary, so the moon comes 8.8 hours later each year until the leap month of 2015. No row lands on both of their numbers, and I didn't move the moment around until one did.

Their total of 52 is the part I can't make. 2014 has 49 holy days here, and the same 49 on Kapook's list (Sanook's list has 49 too, one of them a day off). Both lists came to me through the same summarising tool, so test.mjs checks what it gave me, not the pages themselves. The lunar years that start in 2013 and 2014 have 48 each. Fifty-two would be thirteen months of four, and neither year has a thirteenth month. That is the next thing to find: their table, if the full article has one.

One row of theirs I can check exactly. They say Asahna Bucha 2557 fell on 11 July and by the sky should have been the 12th. The calendar here gives 11 July, and the sky gives 12 July at 18.4 h Thai time.

The printout also gives the lunar-year rows and splits each count by kind of holy day. test.mjs checks Kapook's 49 dates, the two roads to 0.05 degrees (its run prints 0.0134), every number in the 00:00 and 06:00 rows, and the Asahna row and its hour; the 12:00 and 24:00 rows, the lunar-year rows and the 1.6 minutes are printed by count.mjs, not checked. The 2013 holy days have no list to check them against, only the Makha and Asahna rows above.

## Limits

- The calendar is checked from 1996 to 2031. The anchor is month 5, waxing 1, 2026 (19 March), and other years are reached by adding up year lengths from there.
- The official holy days are announced by the authorities, and this page only works them out. For anything that matters (a temple visit, the alcohol-sale ban on the big days), check an official calendar.
- 2027 onward is worked out, not checked: the only source I found for those years is the Wikipedia table, and its leap day in 2024 already disagrees with every other source for 2024 to 2026.
