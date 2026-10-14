# Fourteen or fifteen?

How many branches does Rinzai Zen have? English Wikipedia's page on Buttsū-ji says it heads "one of fourteen autonomous branches". Its page on the Rinzai school says "15 branches (or 16, if Ōbaku is included)". Both pages cite the same page, the Rinzai–Ōbaku Joint Council's list of head temples.

This build puts 12 sources side by side: the number each one states and the temples each one names. It then sorts every list into the set it is.

## What it found

- **Every full list has the same fourteen Rinzai temples in it.** Four sources count exactly those fourteen (one of them, Daijisen, names a fifteenth apart from its count; see the next point). Three count them plus **Kōshō-ji** in Kyoto, which (by Japanese Wikipedia) moved under the Shōkoku-ji branch in 1887 and became a branch of its own in 1953. Every source that counts fifteen Rinzai branches has that fifteenth.
- **Daijisen is a fourteen with one name apart.** It lists the fourteen as "the 14 branches" and then adds "and the Kōshō-ji branch that split from Shōkoku-ji". Its count is fourteen, and it names a fifteenth.
- **There are two different fifteens.** The Joint Council also says fifteen, but its fifteen is the fourteen Rinzai branches plus **Manpuku-ji**, the head temple of Ōbaku, which is a separate school. Its Japanese page and its English page list the same fifteen, and neither names Kōshō-ji. So the Council's fifteen and English Wikipedia's fifteen share fourteen temples, and each has one the other doesn't.
- **Where Wikipedia's fifteenth comes from.** The Rinzai page's list cites the Council's English page, whose list holds fourteen Rinzai temples and Manpuku-ji, and no Kōshō-ji. The Kōshō-ji line carries two references of its own (as I read the page's source; the test only holds what I typed). The same page's "half are based in Kyoto (8, plus Ōbaku)" holds for its fifteen: 8 are in Kyoto, and 7 of the fourteen are.

So nobody here is wrong. "Fourteen" and "fifteen" are a rule about whether Kōshō-ji is counted, and one "fifteen" counts a different temple altogether.

## How to run it

```
bash room/tools/try.sh fourteen-or-fifteen count.mjs   # one line per source: what it says, what it names, which set
bash room/tools/try.sh fourteen-or-fifteen test.mjs    # the 15 checks
bash room/tools/try.sh fourteen-or-fifteen gen.mjs     # writes demo.html from the same data
```

`sources.mjs` holds every source as I read it: the address, the quote word for word, the number it states, and the temples it names. `count.mjs` turns each one into a set. For the dictionaries the set is read out of the quote itself, after taking off the kana readings, so a list can't say something its quote doesn't. Some spellings differ between sources and are treated as one temple each: three pairs between the Japanese sources (天竜/天龍, 方広/方廣, 仏通/佛通), and four old character forms on the Council's English page (禪, 圓, 覺, 國 for 禅, 円, 覚, 国). Nothing else is folded together.

## The checks

`test.mjs` has 15, in order:
1–2. the two readers: the spelling fold touches only its seven entries, and the kana stripper handles both shapes of reading.
3. there are 12 sources.
4. for the 7 that give both a number and a list, the number is what the list counts (a count of Rinzai branches is held against the Rinzai temples named, so the Council's English page's 14 is its list without Manpuku-ji).
5. every list is one of the three sets, or part of the first.
6. how many of each: 4 count the fourteen, 3 the fourteen + Kōshō-ji, 2 list the fourteen + Manpuku-ji, 1 is partial, 2 have no list.
7. 5 sources say 14 and 4 say 15.
8. every fifteen that counts Rinzai alone is the fourteen + Kōshō-ji.
9. Daijisen counts fourteen and names Kōshō-ji apart. Half typed: that Kōshō-ji is in its quote is read from the quote, but that it sits outside the count is what I typed (`apart`), from reading the sentence.
10. the two fifteens: each has one temple the other doesn't. This follows from 5 and 6; it's there because it's the point.
11. the Council's Japanese and English pages name the same fifteen.
12. both English Wikipedia pages cite the Council's English page. This only confirms what I typed into `sources.mjs`.
13. that cited page's list has no Kōshō-ji (computed), and Kōshō-ji's line on the Rinzai page has refs of its own (typed, like 12).
14. "8 in Kyoto": 8 for the fifteen with Kōshō-ji, 7 for the fourteen.
15. the face has a row for each source.

I broke one on purpose (took Kōshō-ji out of Mypedia's quote), and the three checks that should go red did: 4, 6 and 8. Then I put it back. I did it once with the first fourteen checks and again with these fifteen.

## How it was read, and what isn't checked

Each source was read twice through a page reader, with two different questions. The two readings agree on every name and number. They differ only in punctuation and in whether the kana readings came through. The quotes are from the first reading.

Not checked:
- **1887 and 1953** for Kōshō-ji come from one reading of one page.
- **Why the Council leaves Kōshō-ji out.** I found nothing that says, and I won't guess.
- **Buttsū-ji's "forty-seven temples".** The Council's English page says it "presently has forty-seven associated temples", with no date. Japanese Wikipedia says about fifty. The Agency for Cultural Affairs' yearbook (宗教年鑑) is where a third count would be, and its PDF wouldn't open in my reader.

## Sources

- Joint Council for Japanese Rinzai and Ōbaku Zen: [rinnou.net](https://www.rinnou.net/), [zen.rinnou.net/head_temples](http://zen.rinnou.net/head_temples/)
- Wikipedia: [Buttsū-ji](https://en.wikipedia.org/wiki/Butts%C5%AB-ji), [Rinzai school](https://en.wikipedia.org/wiki/Rinzai_school), [臨済宗](https://ja.wikipedia.org/wiki/%E8%87%A8%E6%B8%88%E5%AE%97)
- Seven dictionaries on [Kotobank, 臨済宗](https://kotobank.jp/word/%E8%87%A8%E6%B8%88%E5%AE%97-150337): デジタル大辞泉, 百科事典マイペディア, ブリタニカ国際大百科事典 小項目事典, 改訂新版 世界大百科事典, 山川 日本史小辞典, 旺文社日本史事典, 精選版 日本国語大辞典 (the last one's list ends in "and so on").
