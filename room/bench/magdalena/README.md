# Does a school's yearbook add up?

The state gymnasium of St Mary Magdalene in Poznań printed a report (*Sprawozdanie Dyrekcji*) every year. Five in a row, 1926/27 to 1930/31, are scanned by the Jagiellonian Library and public on archive.org:
[1926/27](https://archive.org/details/jbc.bj.uj.edu.pl.0002_NDIGCZAS031123_89470149),
[1927/28](https://archive.org/details/jbc.bj.uj.edu.pl.0003_NDIGCZAS031123_89470152),
[1928/29](https://archive.org/details/jbc.bj.uj.edu.pl.0004_NDIGCZAS031123_89470156),
[1929/30](https://archive.org/details/jbc.bj.uj.edu.pl.0005_NDIGCZAS031123_89470159),
[1930/31](https://archive.org/details/jbc.bj.uj.edu.pl.0006_NDIGCZAS031123_89470162).

This is a ledger of every place I found where those reports say one number two ways: a table row and its printed total, a pass count and the percentage beside it, the start of one year and "20 fewer" in the next. Each pair is a check, and the face shows both sides, whether they meet, and a link to the page.

## What it finds

33 checks: 29 meet and 4 miss.

- **1919/20.** In the 1928/29 report's ten-year table (page 5), the row's classes add to 886, and the row prints 865. The other eleven rows add up. No swap of two neighbouring digits, in any cell or in the total, closes it.
- **1927/28.** The school doctor examined 510 pupils (page 26; his three groups, 90 + 210 + 210, and a second three-way split on the same page, 311 + 113 + 86, both make 510). The year began with 510, and "4 more came during the year" (page 4), and the table's total for that year is 514. In 1926/27 and 1928/29 the doctor's count equals the table's total; this year it equals the start-of-year count instead. Whether he examined only the pupils there in September, the report doesn't say.
- **1926/27 entrance exam.** "103 examined, 74 passed (82,5%)" (page 3). 74 of 103 is 71.8%. 85 of 103 would give 82,5%; no number examined would, with 74 passed. No neighbour swap fits.
- **1928/29 entrance exam.** "97 examined, 49 passed (62%)" (page 9). 49 of 97 is 50.5% (51% to the whole percent the report prints). 49 of 79 is 62%, a swap of the 9 and 7, and it's the only neighbour swap among the four misses that closes one. 60 passed of 97 would also give 62%, with no swap. I don't say which number is wrong; the reports don't.

Things that meet, among them: the sentence above the table names its first two totals (651 and 789); start plus those who came is the table's total in both years that give both (544 + 4 = 548, 510 + 4 = 514); 1929/30's "20 fewer than the year before" is 442 − 20 = 422 across two reports; the doctor's three groups add to his total in all four years that give them; 1926/27's 66 new pupils and 12 repeaters make its two divisions of 40 and 38.

Not a check, and open: the doctor counted 3 more than the start in 1928/29 (445 against 442) and in 1929/30 (425 against 422). For 1928/29 the table's total is 445 too, so there the doctor matches the table, like 1926/27. For 1929/30 there's no table, and nothing I read says who the three were.

## Roads

Every number carries a road. **print** means I read it on the page image of the scan. **ocr** means it came through archive.org's OCR text of the scan, by way of a page reader, and I didn't see it on the page; its quote in `rows.mjs` keeps the OCR's slips. A check is "print" only if both its sides are. 23 checks are print and 10 are ocr, and all four misses are print on both sides.

## How to run it

```
bash room/tools/try.sh magdalena test.mjs   # the checks: every number above is asserted here, the misses as misses
bash room/tools/try.sh magdalena gen.mjs    # writes demo.html from the same checks
```

- `rows.mjs`: each number, its report, page, scan leaf, road, and the report's own words around it.
- `ledger.mjs`: the checks, and for a miss, which swaps of two neighbouring digits would close it, and which counts would give a printed percentage.
- `gen.mjs` writes `demo.html`, the face: a page with no outside files. "only the misses" and "only what was read on the page" filter it.

## Left out on purpose

The reports name their pupils, teachers and doctor; no one is named here, and the test checks every file against a list of the names I met, kept off the public page. The doctor's three groups appear only as numbers. The reports' fee and budget accounts are money figures, and their notes on pupils' illnesses and deaths are not mine to put on a page; none of that is here. (When the build is on the wall, the name list isn't next to it, and the test says it skipped those checks.)
