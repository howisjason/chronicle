# When is the Thai holy day, and is it the real full moon?

Wan phra are the Buddhist holy days of the Thai lunar calendar: waxing 8, waxing 15 (the full-moon day), waning 8, and the last day of each lunar month. This build works them out from the old arithmetic. It also computes the real full moon from the sky, so the two can be compared.

**The face:** `demo.html` shows the next wan phra and the next big holy day from today (Thai time), a histogram of where the full moon falls against the holy day, a paragraph on how this compares with a published count, one on a 1954 table of tithis, one on the other order's holy days in 2002, every holy day of a year from 1996 to 2031, and, beside each full-moon day, when the sky is actually full.

## How to run

    bash room/tools/try.sh wan-phra test.mjs        # the checks, and the measurement
    bash room/tools/try.sh wan-phra make-demo.mjs   # rebuilds demo.html from wanphra.mjs
    bash room/tools/try.sh wan-phra lean.mjs        # where the moon sits inside the calendar's days
    bash room/tools/try.sh wan-phra count.mjs       # the holy days of 2013 and 2014 against a published count
    bash room/tools/try.sh wan-phra leapdays.mjs    # this build's leap days, and both tables' 2020s rows against them
    bash room/tools/try.sh wan-phra tithi1954.mjs   # a printed 1954 table of tithi endings against this build's Sun and Moon
    bash room/tools/try.sh wan-phra dhammayut2002.mjs  # the other order's 2002 holy days against this build and the sky

Outside the room, `node test.mjs` does the same. `wanphra.mjs` has no dependencies: `holyDaysInYear(2027)` lists a year, and `missHours(jdn)` says how far the sky is from a day.

## The two roads

**The calendar** (road one): the Suriyayatra year rules, as written out in [pythaidate](https://github.com/hmmbug/pythaidate). Each Chula Sakarat year gets a *horakhun* (days since the epoch), an *avoman* and a *tithi*. These decide whether the year is normal (354 days), gets a leap day (month 7 gets 30 days, 355 in all), or gets a leap month (a second month 8, 384 in all). Odd months have 29 days and even months 30.

Copied exactly, those rules miss 26 of the 36 Makha Bucha dates in Thai Wikipedia's table, most of them by a whole month. The rows showed two changes, and with both made, every row from 1996 to Makha Bucha 2024 matches except one:

1. **A tithi of 24 is enough for a leap month.** 2012 has tithi 24 and a second month 8 (Asahna Bucha on 2 August 2012 in the table). 2031 also has tithi 24, and the table gives it a second month 8 too. pythaidate's rule reads `tithi > 24`. When two years in a row qualify (2020 has tithi 24, 2021 has 4), the second year takes the month. pythaidate makes that exception only for the pair 25 and 5.
2. **An avoman of 0 counts as 0.** pythaidate rewrites 0 as 692, which shuts that year out of a leap day. With 0 left alone, 2015 qualifies, its leap day is deferred to 2016 because 2015 already has a leap month, and the calendar matches 2014 to 2016. 2014 itself (avoman exactly 137) is not a leap-day year, so the cut is `< 137`. The other cut, `<= 126` in a solar leap year, is pythaidate's, and nothing here tests it at its edge.

**The sky** (road two): the times of the Moon's phases from Jean Meeus, *Astronomical Algorithms*, chapter 49. It reproduces the book's worked example to five decimals, and the 13 full moons of 2026 to within 0.64 minutes of the [U.S. Naval Observatory](https://aa.usno.navy.mil/api/moon/phases/year?year=2026).

## What the checks say

- **Thai PBS, 2026:** all 49 wan phra on [their list](https://www.thaipbs.or.th/now/content/3498), every date and every lunar label, plus Makha, Visakha and Asahna Bucha, Khao Phansa, Ok Phansa and Loy Krathong.
- **Thai Wikipedia, 1996 to 2031** ([Makha Bucha](https://th.wikipedia.org/wiki/วันมาฆบูชา), [Asahna Bucha](https://th.wikipedia.org/wiki/วันอาสาฬหบูชา)): the tables and this build agree on every row up to Makha Bucha 2024. From Asahna Bucha 2024 to Makha Bucha 2030 (twelve rows), the tables are one day later than this build, and from Asahna Bucha 2030 they agree again. So the tables add a leap day in 2024 that this build adds in 2030. (On each page, that stretch came from one edit on 21 May 2019, and the two edits were minutes apart; see "How the table got that way" and "The Makha table, the same two nights" below.) On that stretch, the pages' own infoboxes (2025, 2026), Thai PBS (2026) and Thairath (Asahna Bucha 2024 on Saturday 20 July) all agree with this build, not with the tables.
- **The Mahanikaya's 2002, from the other order's list (15 Oct 2026):** all 49 days, date and kind. See "The other order" below.
- **Asahna Bucha 2005, settled (14 Oct 2026).** The table says 20 July, and this build says Thursday 21 July. Everything printed at the time I could find says the 21st: a holiday notice filed with the Stock Exchange of Thailand in December 2004, Pattaya Mail's issue for that week, and an MGR Online column the day before. The table itself said 21 July until 2018. See "How the table got that way" below.

## What I found

From 1996 to 2031 the calendar has 446 full-moon days (waxing 15). The sky's full moon falls on that Thai day in **193 of them (43.3%)**. In 242 the holy day comes first: the day is over before the moon is full. In 11 it comes after. When they miss, the gap from the nearer midnight is a median of 9.4 hours and at most 34.7 hours.

### Why so one-sided (14 Oct 2026)

I left that as a question yesterday. `lean.mjs` measures where the moon sits inside the calendar's days, month by month, and the answer is not what I guessed.

My guess was a sawtooth that runs one way. The sawtooth is real. From one year's month 5 to the next, the mean full moon moves **8.8 hours later** after an ordinary year of 354 days, **15.2 hours earlier** after a leap-day year, and **2.5 hours earlier** after a leap-month year. Those are measured from the calendar against Meeus's mean moon, and the arithmetic (12 or 13 mean months, minus the year's days) gives the same three numbers to within 0.05 hours. So the calendar falls behind the moon year after year, and the full moon comes later and later in the holy day, until a leap pulls it back.

But that isn't why the misses fall on one side. For the mean moon (Meeus's mean phase, without the real moon's wobble), the full moon comes on average 24.9 hours after waxing 15 begins, the median is 25.0, and the range is 2.7 to 47.9 hours. The middle of that range is 25.3. So the spread is about even on both sides of its centre. What makes the misses one-sided is **where the centre sits: 0.9 hours after the holy day ends**, at the next midnight. A pile centred there puts a little under half of it on the day and nearly all the rest after. For the mean moon that's 207 on the day, 239 after and none before. The real moon's wobble widens the range to -9.5 to 58.7 hours, and the count becomes 193 on, 242 after and 11 before.

The new moon, too, falls after the day you might expect. It comes 6.6 hours into day 1 on average, so it falls on waxing 1 in 275 months and on the last day of the month before (the dark-moon holy day) in only 130. Add half a mean month (14 days 18.4 hours) to 6.6 hours and you get 24.9 hours into waxing 15. That's a consistency check, not a second road: both numbers come from the same moon.

Of the 24 windows of 24 hours that start on the hour (Thai clock), the one that catches the most true full moons starts at 15:00 (292 of 446). Midnight to midnight, the holy day itself, catches 193, and 06:00 to 06:00 catches 263.

One reading, which I haven't checked against any source on the Thai calendar: in Indian lunar reckoning, a lunar day (*tithi*) is twelve degrees of the moon's run past the sun, and the fifteenth ends at the moment of full moon. A calendar that counts day 1 from the day the new moon falls in would then put the full moon at the end of day 15, which is where it sits here. That fits the numbers. It isn't proved by them. (15 Oct: the Indian half now has a printed source. See "What a tithi is, in print" below.)

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

### How the table got that way (14 Oct 2026, late)

The one row I couldn't settle was Asahna Bucha 2005. The table said 20 July, and this build says 21 July. So I went looking for what was printed at the time.

- A holiday notice filed with the Stock Exchange of Thailand on 13 December 2004 ([the filing](https://www.bafsthai.com/en/investor-relations/newsroom/set-announcements/52253/)): "10. วันพฤหัสบดีที่ 21 กรกฎาคม วันอาสาฬหบูชา *" and "11. วันศุกร์ที่ 22 กรกฎาคม วันเข้าพรรษา" (Thursday 21 July, Asahna Bucha; Friday 22 July, Khao Phansa).
- Pattaya Mail, issue of 15 to 21 July 2005 ([the page](http://www.pattayamail.com/624/news.shtml)): "...of the Buddhist Lunar calendar, this year equating to Thursday, July 21."
- MGR Online, a column published at 09:22 on 20 July 2005, the day before ([the page](https://mgronline.com/daily/detail/9480000096611)): "วันที่ 21 กรกฎาคม 2548 เป็นวันขึ้น 15 ค่ำ เดือน 8 จึงเป็นวันอาสาฬหบูชา" (21 July 2548 is waxing 15 of month 8, so it is Asahna Bucha).

I read all three through the same summarising page reader. Each quote above is a line I asked it to give word for word, not a line I saw on the page myself.

Then I asked when the table changed. Its wikitext is one template with three rows of twelve cells, and I read the 2005 cell in old revisions ([any revision's text](https://th.wikipedia.org/w/index.php?oldid=7752502&action=raw)). It says 7-21 in every revision I read from July 2012 to July 2018 (seven of them, listed in `data.mjs`). [Revision 7771106](https://th.wikipedia.org/w/index.php?diff=7771106&oldid=7752502), on 8 August 2018, changed it to 7-20. It also changed eight of the twelve cells in the 2020–2031 row. The edit gives no source and no summary beyond the section's name, so I can see what changed and when, but not why.

The next revision, [8306984](https://th.wikipedia.org/w/index.php?diff=8306984&oldid=7771106) on 21 May 2019, changed the 2020–2031 row again. Each of its twelve cells is exactly one day later than before. Against this build:

| The 2020–2031 row | Differs from this build at |
|---|---|
| before August 2018 (7752502) | 2023, 2027, 2031 a day early; 2024, 2028, 2029 a day late |
| 7771106, August 2018 | 2020–2023 and 2030–2031 a day early; right for 2024–2029 |
| 8306984, May 2019, still live | right for 2020–2023 and 2030–2031; 2024–2029 a day late |

So the "tables run a day late from 2024" above is the May 2019 shift. It fixed six years that had been a day early and moved six that had been right. Nobody changed the 2005 cell again: it still says 7-20. A [provincial Buddhism office page](https://pre.onab.go.th/th/content/category/detail/id/73/iid/9934) dated 2021 carries the same table, with 20 July 2548 in it.

test.mjs checks the 2005 date and weekday of Asahna Bucha and Khao Phansa against the printed ones, the 2005 cell's two values, that August 2018 changed eight cells of the 2020s row, that the May 2019 row is the live one I read on 13 October, that it is the August 2018 row plus one day in all twelve cells, and the middle and last lines of the table above. The first line (before August 2018) is printed, not checked. The provincial page and the seven earlier revisions are what the reader told me, not checks.

### The Makha table, the same two nights (15 Oct 2026, night)

The Makha Bucha table is the same kind of template, and its revision list ([the API's](https://th.wikipedia.org/w/api.php?action=query&prop=revisions&revids=7771106|7771115|8306984|8306991&rvprop=ids|timestamp|size|comment)) has the same two nights in it. [Revision 7771115](https://th.wikipedia.org/w/index.php?diff=7771115&oldid=7764637) came 19.7 minutes after the Asahna edit of 8 August 2018, and [8306991](https://th.wikipedia.org/w/index.php?diff=8306991&oldid=8145679) came 3.5 minutes after the Asahna edit of 21 May 2019. Each pair was made by the same account, one account in 2018 and a different one in 2019. Both Makha edits have only the section's name for a summary, and neither changed the page's size by more than a byte (75943 to 75944, and 75946 to 75946), so no source went in with them.

August 2018 changed six of the Makha row's twelve cells: 2021, 2022, 2025, 2029 and 2030 a day earlier, and 2028 a day later. The rows for 1996 to 2019 read the same before and after. May 2019 then added a day to eleven cells and left 2020, 8 February, alone. On the Asahna page it moved all twelve. (2028 went from 9 February to the 10th to the 11th, two days in two edits; this build says the 10th.)

The 2020 cell is where the calendar shows. A leap day is the 30th of month 7, and this build's leap day for 2020 falls on 20 June 2020, after Makha Bucha (8 February) and before Asahna Bucha (5 July). A day put in at that point moves Asahna 2020 and every Makha Bucha from 2021 on, and not Makha 2020. That is exactly what the May 2019 edit did on both pages.

| The Makha 2020–2031 row | Differs from this build at |
|---|---|
| before August 2018 (7764637) | 2023, 2024, 2028, 2031 a day early; 2025, 2029, 2030 a day late |
| 7771115, August 2018 | 2021–2024 and 2031 a day early; right for 2020 and 2025–2030 |
| 8306991, May 2019, still live | right for 2020–2024 and 2031; 2025–2030 a day late |

Makha Bucha of year Y+1 falls in the same lunar year as Asahna Bucha of year Y. Read that way, the two pages' rows from August 2018 differ from this build the same way in all 11 lunar years from 2020 to 2030, and so do the two rows from May 2019. The rows before August 2018 agreed in 9 of the 11. So on each of the two nights, both pages got the same run of years. In August 2018 that run was missing the build's leap day of June 2020 and had one in 2024 that the build doesn't have, and from Asahna 2030 it is a day early again. In May 2019 the June 2020 day went in, and the 2024 day stayed. That is why the live tables run a day late from Asahna 2024 to Makha 2030: Asahna 2024–2029 on one page, Makha 2025–2030 on the other. What it was worked from, the edits don't say.

test.mjs checks which six Makha cells August 2018 changed and by how much, that the May 2019 row is the live one, that it is August 2018's plus one day in eleven cells with 2020 left alone, the build's leap day of 20 June 2020 and that it falls between the two holy days, the last two lines of the table above, and the 11 of 11 for both nights. The first line of the table and the 9 of 11 are printed, not checked. `bash room/tools/try.sh wan-phra leapdays.mjs` prints the build's leap days from 2016 to 2032 and both pages' rows against it. The times, the accounts, the sizes and the unchanged early rows are what the API and the page reader gave me, not checks.

### What a tithi is, in print (15 Oct 2026, before dawn)

The reading at the end of "Why so one-sided" asked whether the Thai reckoning means waxing 15 the way an Indian tithi is counted. I didn't find a Thai source that says. I found the Indian half, in print.

India's Calendar Reform Committee reported to the government in 1955 ([the scan](https://archive.org/details/calendar_reform_comittee_report)). Page 3 defines the tithis by "the moments when the moon gains 12° or its integral multiple on the sun", and it prints a table, "Ending Moments of Tithis": eleven tithis from 27 September to 26 October 1954, in Indian Standard Time, with the "Modern" time (the committee says its tithis follow the Nautical Almanac) beside the "Old Method" and the old method's error. I read the table twice off the page image ([leaf n14](https://archive.org/details/calendar_reform_comittee_report/page/n14)), once whole and once zoomed, and not through OCR or a summariser. `tithi1954.mjs` holds the eleven rows as printed and finds each ending from this build's Sun and Moon (Meeus ch. 25 and 47, as in `count.mjs`). It searches the printed date and the day after, never the printed minute.

| 1954 | Tithi | Printed (IST) | This build | Gap (min) |
|---|---|---|---|---|
| 27 Sept | 30 | 6:20 | 6:20 | +0.41 |
| 30 Sept | 3 | 12:50 | 12:50 | −0.41 |
| 3 Oct | 6 | 20:21 | 20:21 | +0.20 |
| 6 Oct | 9 | 24:03 (00:03 on the 7th) | 24:03 | −0.39 |
| 9 Oct | 12 | 20:20 | 20:20 | −0.26 |
| 12 Oct | 15 | 10:40 | 10:40 | +0.32 |
| 14 Oct | 18 | 23:36 | 23:37 | +0.79 |
| 17 Oct | 21 | 15:47 | 15:47 | −0.45 |
| 20 Oct | 24 | 13:44 | 13:45 | +0.56 |
| 23 Oct | 27 | 16:55 | 16:55 | +0.20 |
| 26 Oct | 30 | 23:17 | 23:17 | −0.13 |

- **All eleven land within 0.79 minutes** with the build's ΔT. The page prints whole minutes. The build's ΔT formula is fitted for 2005–2050 and gives 59.8 s for 1954. If the true value then was nearer 31 s (a what-if I haven't checked), every one of my times moves about half a minute *later*: every gap turns positive, and the worst grows to 1.26 minutes (14 October). A shift that moves every row the same way can't explain gaps of both signs, so the gaps aren't ΔT. The claim is agreement within a minute and a half either way, not 0.79.
- **The fifteenth tithi ends at the full moon, in print.** Tithi 15 ends on 12 October at 10:40 IST, and the full moon from Meeus ch. 49, a separate road from ch. 25 and 47, comes 0.74 minutes earlier with the build's ΔT (0.26 earlier with the what-if). The two tithi-30 rows are the two new moons, and all three are within 0.74 minutes under either ΔT. Before tonight, "the fifteenth ends at the full moon" was my arithmetic (15 × 12° = 180°). Now a 1954 table shows it.
- **The old method** is the committee's name for the calculation the almanac-makers still used, which they date to 400 A.D. It is off by as much as 5 h 38 m (17 October). The error column is Old Method minus Modern in all eleven rows, so the table adds up.

What the report says about days. Page 2: "the civil day ( sāvana ), according to Hindu religious practices, should start from sunrise". Page 3: "a religious festival is to be observed in a locality when the prescribed tithi is current at a particular hour of the civil day of that locality." It doesn't name the hour on these pages, and I haven't read further to see if it does elsewhere. I read both sentences on the page images myself.

The Thai half is still only a word. In ขึ้น 15 ค่ำ, ค่ำ (*kham*) counts the lunar day, and it also means dusk, the early dark part of the night. English Wiktionary traces it to Proto-Tai *ɣamᴮ, "night". I got both Wiktionary entries through the summarising page reader, so they aren't quotes I saw. That fits a full moon sitting near the midnight after waxing 15, but it doesn't test anything. "Why so one-sided" already puts the centre 0.9 hours after the day ends, so any window centred on that midnight would win by construction. And "evening" reads both ways: if the day once began at dusk, the fifteenth evening would be the night before the civil day. Only 11 of the 446 full moons come before the civil day begins, but that night also runs into the day's first hours, and I haven't counted it. So the Indian half of the reading is now in print, and the Thai half isn't proved.

test.mjs checks that all eleven rows are within a minute with the build's ΔT, that the table adds up, that tithis 15 and 30 end within a minute of the ch. 49 full and new moons, that with ΔT at 31 s every gap is positive, the worst is under a minute and a half and the moons are still within a minute, that the largest old-method error is 5 h 38 m, and that the face carries the line `tithi1954.mjs` builds. The per-row gaps in the table above are what `tithi1954.mjs` prints, not checks. To see that the checks can fail, I changed 10:40 to 10:42 once: three of the four failed.

### The other order (15 Oct 2026, near dawn)

Thailand has two monastic orders, and they don't always keep the same holy days. The Mahanikaya follow the civil lunar calendar, the one this build works out. The Dhammayut follow Pakkhagaṇanā, a reckoning by half-months. A description of a Thai manuscript copy of it (Wat Huai Tako, on [manuscripts.sac.or.th](https://manuscripts.sac.or.th/article-download.php?id=3)) says Rama IV devised it because the lay calendar runs off. I read that through the summarising page reader, so it's not a quote.

Access to Insight used to publish the Dhammayut days each year. Its list for 2002 ([the page](https://www.accesstoinsight.org/ptf/dhamma/sila/uposatha.html), which no longer has the table; I read [a copy](https://cdn.britannica.com/primary_source/gutenberg/PGCC_classics/ptf/uposatha.html)) gives 49 days "provided by Metta Forest Monastery and Abhayagiri Buddhist Monastery", and says: "On dates marked with an asterisk, followers of the Mahanikaya sect observe the Uposatha the preceding day." Ten days have an asterisk, in three runs: 12 and 20 February, 12 April to 5 May, and 10 June to 3 July. I read the list twice through the summarising reader, once as the cells in order and once month by month, and the two readings agree. `dhammayut2002.mjs` holds it as printed.

What I guessed before running it, and what came back:

1. **The days the list implies for the Mahanikaya are this build's 2002, all 49, date and kind.** They are. 2002 is in the build's range, but before tonight only its Makha and Asahna Bucha had been checked.
2. **On the two asterisked full moons, the sky is full after the Mahanikaya day ends and inside the Dhammayut day.** It is: 27 April at 10.0 h and 25 June at 4.7 h, Thai time. Of the year's 12 full moons, the sky is full inside the Dhammayut day 7 times and inside this build's day 5 times. Those two are the whole difference. On the other 5 misses, both orders keep the same day, and it is over before the moon is full.
3. **Read at 06:00, the Mahanikaya day is early on all 10 asterisked days and the Dhammayut day on none.** Wrong. "Early" is count.mjs's "ahead": the day's number is past the Moon's true tithi.

| The true tithi read at | Mahanikaya (this build), all 49 | Dhammayut, all 49 | Mahanikaya, the 10 asterisked | Dhammayut, the 10 asterisked |
|---|---|---|---|---|
| 00:00 | early 25, same 24, late 0 | early 19, same 29, late 1 | early 8, same 2, late 0 | early 2, same 7, late 1 |
| 06:00 | early 16, same 30, late 3 | early 13, same 29, late 7 | early 5, same 5, late 0 | early 2, same 4, late 4 |

At midnight, the Dhammayut day matches the Moon's tithi more often (29 against 24). At 06:00 it doesn't (29 against 30). Row by row on the 10 moved days: at midnight the move turned 6 early days right, left 2 early (by one tithi less), made 1 right day late, and left 1 where it was. At 06:00 it turned 3 early days right, left 2 early, made 4 right days late, and left 1 where it was. So it isn't the true moon, and nothing here says it was meant to be. pythaidate's `pakdate.py` divides the days into blocks of 16168, 1447, 251, 59 and 15, and counts 1095, 98, 17 and 4 half-months in the first four. 16168 days in 1095 half-months is 14.7653 days each, a mean moon. I read those numbers in excerpts through the summarising reader, and that arithmetic is mine, not a check.

This is one year. The same site has lists for later years, and they would make it more than one. My reader couldn't reach them tonight.

test.mjs checks the list's shape (49 days, 10 asterisks, all five named festivals in the full-moon column), the 49 of 49, the full-moon counts, the two dates and the 5 shared misses, every number in the table above, and the row-by-row counts after it. `bash room/tools/try.sh wan-phra dhammayut2002.mjs` prints each full moon and each asterisked row. The hours 10.0 and 4.7 are printed, not checked, and so is "by one tithi less". To see that the checks can fail, I took the asterisk off 27 April once: six of the six went red.

## Limits

- The calendar is checked from 1996 to 2031. The anchor is month 5, waxing 1, 2026 (19 March), and other years are reached by adding up year lengths from there.
- The official holy days are announced by the authorities, and this page only works them out. For anything that matters (a temple visit, the alcohol-sale ban on the big days), check an official calendar.
- 2027 onward is worked out, not checked: the only source I found for those years is the Wikipedia table, and its leap day in 2024 already disagrees with every other source for 2024 to 2026.
