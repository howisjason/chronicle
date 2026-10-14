# Where was it written down?

Seán Ó Súilleabháin's *Folktales of Ireland* (Chicago, 1966) is 55 tales translated from Irish, and a note at the back of the book gives most of them a volume and page in the Irish Folklore Commission's manuscripts (the Main Manuscript Collection, now CBÉ, at UCD). Many of those volumes are now scanned on [dúchas.ie](https://www.duchas.ie/en/cbe/). This build takes each tale back to the page the book names, and says whether a manuscript item starts there.

`demo.html` is the face: the 55 tales in the book's seven sections, each with the book's reference, the dúchas item it lands on (a link to the scan), and its bin. The buttons at the top show one bin at a time.

## How to run it

    bash room/tools/try.sh back-to-the-hand test.mjs   # the checks
    bash room/tools/try.sh back-to-the-hand gen.mjs    # writes demo.html from the rows

`data.mjs` is the book's side, `duchas.mjs` the manuscript side, `lib.mjs` the bins, and `gen.mjs` makes the face from the same rows the test reads, so they can't drift apart.

## The rule for a hit

*This was written before any dúchas row was read, on 14 Oct.*

The book gives each tale's source as a volume and first page. Dúchas labels its page images like "Page 122b".

- **lands**: the volume is on dúchas, and an item there starts on a page whose number, with the letter dropped, is the book's first page.
- **near**: the volume is on dúchas, and no item starts on the book's page, but an item covers it (it starts earlier, and the next item starts later).
- **disagrees**: the volume is on dúchas, and neither of the above is true.
- **not online**: dúchas doesn't have that volume.
- **no reference**: the book's note gives no CBÉ volume.

For a tale with two volumes (it runs across a binding), the first volume and first page are what counts. Every tale goes in exactly one bin. A tale nobody has looked up yet is in no bin, so the bins can't add up to 55 until every tale has a row. (That last part was added on 15 Oct. Before it, a tale not yet looked up fell into "not online" by default, and that bin would have lied.)

"Lands" matches pages, not stories. No tale's text was read, and some of the manuscripts' own titles ("Scéilín", a little story) don't say which tale they are.

## What it found

Every count here is a check in `test.mjs`. The page lengths 556 and 549 are what the volumes' dúchas cards say (only "past the last page" is checked), and "both from Donegal" and the Ediphone line come from the book's notes.

- 31 land, 0 near, 2 disagree, 19 not online, 3 have no reference: 55.
- 33 tales are in a volume that is online, and 31 of them start exactly on the page the book gave.
- The 19 not online are in 16 volumes, and all but one (vol. 62) are numbered above 875, where dúchas has few volumes.
- The two that disagree are both from Donegal: 16 (vol. 142, p. 1312) and 53 (vol. 143, p. 2093). On dúchas those volumes run to pages 556 and 549. The book's note for 53 says "Recorded on Ediphone, February 7, 1936". I don't know yet what numbering those pages belong to.
- Of the 31 that land, every one is in a county its volume names, except 25 and 54: the book says Cork and the volume names only Kerry places. Dúchas mostly gives places for a whole volume, not for a tale.
- Every one that lands has the year the book gives, where the book gives one (a range like "1935–1937" counts if the year is inside it).

## Who read what

The book's side was read on 14 Oct, twice and in two shapes (a table, then 60-character verbatim fragments), from the archive.org OCR text; the two reads agreed on every row. On the manuscript side I read 35 and 37 (14 Oct) and 43 (15 Oct) myself, first. Five helpers read the rest on 15 Oct, one per stretch of the book, and I read three of their rows again myself (1, 25 and 49), and all three came back the same. Everything came through a summarising page reader, which is the build's one weak spot. Each link is there so anyone can check a row against the scan.

No tale's text is copied, and no informant or collector is named. The scans and their catalogue belong to the National Folklore Collection, UCD.
