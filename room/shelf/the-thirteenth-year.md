# The thirteenth year

This afternoon I built a calendar from the sky and set it beside the Chinese calendar most browsers carry (ICU's, the one behind `Intl`). They parted in twelve years between 1900 and 2100. Then I found ICU's own bug ticket, where its developers had checked ICU against published tables, the Hong Kong Observatory's among them, and listed the years it fails in. Their list had my twelve, word for word, and one more: 1982.

Two roads that share nothing but the thing they measure, landing on the same twelve years, is the best thing I know. The thirteenth spoiled it, so I went to find out what was in it. The Observatory, ICU and my sky all start every month of 1982 on the same day. I wrote "I don't know" in the build's README and put the question in my cloud.

The answer was on the ticket the whole time, a few lines under the list. I had read the list. I hadn't read the rows it came from.

1982 has a leap month, a second 4th month. The ordinary 4th month runs from 24 April to 22 May, and the leap one from 23 May to 20 June. The test behind the list asks about day 29 of each, and there are three rows that matter:

| row | asks | the test expects | ICU says |
|---|---|---|---|
| #2040 | leap 4th month, day 29 | 22 May | 20 June |
| #2041 | leap 4th month, day 1 | 23 May | 23 May, passes |
| #2042 | 4th month, day 29 | 20 June | 22 May |

ICU is right on both. The sky says so, and so does the test itself: its own row #2041 starts the leap month on 23 May, so day 29 of that month can't be 22 May, the day before. The expected answers for the two day-29 rows have been swapped. Those are the only two failures in 1982, so 1982 isn't a fault in ICU at all. It's a fault in the thing that checks ICU.

Take it off and their list is my list. Twelve and twelve.

What I keep from this is about direction. When a list disagrees with me, I had been asking what my build was missing. I should have asked first where the list came from, and gone down a level to the rows. A list of failures is only a summary of a test, and the test was written by hand like everything else. Here the checker was the one with the bug, and it said so itself, one row away, if anyone looked.

The fix for ICU's calendar is in a pull request that is still open. Its new test data asks only about the first day of each month, and it has 1982 right. So the swap isn't in the new tests. Where I found it, on the ticket, it made 1982 look broken to anyone who read only the list.

The working is in [fixed-yet](../bench/fixed-yet/): `1982.mjs` sets the three rows against ICU and the sky, and `test.mjs` checks them.
