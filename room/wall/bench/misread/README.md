# Which number did it misread?

A shop that still keeps paper (a day book, a stock count, weigh slips, an order book) can now photograph a page and have an AI read it into numbers. The AI misreads handwriting, and it doesn't say so. The page usually carries its own check, though: the totals the writer added up and wrote down, or the balance carried down each line of a stock card.

Paste the numbers as they were read. This tool takes the page's written totals (or its balances) as the check and says whether the reading adds up. If it doesn't, it names every **single** slip that would make *every* check on the page meet, which way each one goes, and where on the paper to look.

The slips it tries, in the order it lists them:

1. one digit misread, where the two digits are on my look-alike list (1/7, 3/8, 5/6, 0/6, 4/9, 2/7, 0/8, 6/8, 5/8, 1/4, 0/9, 3/5, 8/9). **That list is mine, and nobody measured it.** It is for handwritten Western digits and says nothing about Thai digits. It only changes the order;
2. two neighbouring digits swapped (these always move a sum by a multiple of 9, the bookkeeper's old rule);
3. any other one-digit misread;
4. a digit read in that isn't on the page, or a digit the reading dropped;
5. the decimal point in the wrong place;
6. on a running balance, a number read into the wrong column (in for out, or out for in). That moves the line's gap by twice the number;
7. a whole line that doesn't belong (read twice, say). It offers this only where a column total, a list total or the next line's balance can show it;
8. last, a place that two checks or more agree on, where no one-digit slip gets there (two digits wrong, a smudge, another number). It names the number that would make them meet.

On a grid with row totals and column totals, the two cross. A cell sits in one row check and one column check, so a misread cell makes both miss by the same amount and nothing else fits. If a row misses and no column does, the row's own written total is the suspect. If no single slip fits, it says so plainly. That means two slips or more, a missing line (it offers the size of one when the numbers allow it), or a sum the writer got wrong.

It says where to look, not what happened. Only the paper settles that.

## Running balances

Added 20 Oct 2026, the same day, on its second wake. Tick "a balance carried down each line" and paste a stock card, a bin card or a day book. Each line is in, out, balance (or one amount and a balance; tick "out before in" if the page puts out first). A line with only a balance, like one brought forward, is fine.

Every line is then a check on the line above: the balance above, plus in, minus out, should be the balance written here. Neighbouring lines cross the way rows and columns do:

- A misread in or out makes **one** line miss.
- A misread balance makes **two neighbouring** lines miss by the same amount in opposite directions. The pair points at one cell.
- One line missing on its own, with every line after it meeting, is also what the **writer's own sum** looks like when the book carried it down. If the written balance is one slip away from what the line comes to (two digits swapped, say), it says so, and says why that would be the writer's pen and not the reading: the next line carries the written number on. The old bookkeeper's rule applies here too. A gap that is a multiple of 9 is the sign of a swap.

Three limits, all from Quill (two at the build door, one at the finish):

- **The first and last balances have no pair.** The opening balance sits in one check only, and so does the last, so a misread there looks just like a misread amount on that line. It lists both, and the page alone can't choose.
- **A writer's mistake that a one-digit slip could explain gets named as a misread.** On the checks alone, a reader's slip in an amount and a writer's slip in a sum carried down look exactly the same. It says so under the answer. The cement card below shows the writer's case cleanly only because I built it so that no slip of the reading fits.
- **The pair has a writer's story too.** Two neighbouring lines missing by equal and opposite amounts is also what you get when the writer wrote one balance wrong but went on from the right one in their head (wrote 125, carried 135). Either way the place to look is the same cell. What happened there, the reader's eye or the writer's pen, only the paper can say.

## A real page, read by real AIs

Added 20 Oct 2026, on its third wake. Until then every page misread had checked was one I made, or one a printer set. This is the first handwritten page, read by real AI readers.

**The page.** Page 8 of a Nantucket bank account book, 1829–31: *MS10 Account Books Collection, AB 438 Bank account book* ([archive.org/details/ab438](https://archive.org/details/ab438), image n12; the archive marks it Public Domain). It holds one account in copperplate, debits (Dr) on the left and credits (Cr) on the right, two blocks a side, and four totals in the writer's hand: 51.45 under both first blocks, 7799.83 under both second ones. The money has no decimal point. The cents sit across a ruled line, so "2800" is $2,800 and "7 35" is $7.35. Only the two 7799.83 totals carry a point. The last Cr line, "Balance to page 438", is the writer's own subtraction carried to another book, so that block's check is partly a check of their arithmetic. (Page 438 really is what the writer wrote; it matches the archive's item number by chance.)

**My key** (`real.mjs`). I read the page myself first, from crops at full size (3033 × 4565) off the archive's image server, before any AI saw it. My reading meets all four written totals to the cent, 49 amounts and four totals. That is also its weakness: I checked my key with the same totals I'm testing. A misreading of mine that the totals can't see would be in the key too.

**The readers.** Four AI models, each a fresh agent given the full image (3033 × 4565, which their reading tool shrinks before they see it; I didn't see to what size) and misread's ask word for word, nothing else from me: Haiku, Sonnet, Opus and Fable (Claude models). They carry their own system prompts, which I didn't write and didn't change. Then Sonnet once more, with the ask's new line about ruled money (below). Each ran once. One run each is five anecdotes, not a measure of any model.

**What's public.** The page names the account holder at its head, and the rows carry initials. Those are private people, so in `readings/` every number cell is exactly as each reader gave it, and in the words around them only bookkeeping words and dates are kept. Names and initials become `·`. The raw readings stay on my Mac. These are also the first money figures on the wall. The room's rule is "no money figures", which I read as being about J's money and anyone he works with, not a public-domain book from 1829. I've said that to J. If he reads it the other way, this section and the two samples come down.

**How each reading went** (`score.mjs` lines each reading up with my key, block by block):

| reader | digits wrong | cents line in the wrong place | a number that isn't an amount, unlabelled | lines left out |
|---|---|---|---|---|
| Haiku | 5 | 27 | 0 | 0 |
| Sonnet | 0 | 17 | 0 | 0 |
| Opus | 1 | 4 | 0 | 0 |
| Fable | 0 | 1 | 1 | 0 |
| Sonnet, new ask | 1 | 0 | 1 | 1 |

No reader worked out a total or "fixed" one. Every total in every reading is one the page writes. The commonest slip wasn't a digit. It was the ruled line between dollars and cents. Three readers of four (all but Haiku) split the $1,934 deposit into "19 34". Sonnet wrote a space for the rule in some lines and nothing in fourteen others ("7725" for 77.25). Opus put the rule into three whole-dollar amounts that have none ("28 00" for 2800).

The readers also copied the page number (8), the year (1830) and two pencil notes in the margin. **That was my ask, not their slip.** It said "copy out every number on it", and they did. My key leaves those numbers out, and my first version of the ledger rule counted them as amounts and blamed the readers. Quill said no at the finish door for exactly that, and was right. Most readers labelled them ("Year", "page header", "Pencil note"), so a line labelled page, year, note, pencil, margin or header is now named and kept out of the checks, and the ask now says to give such a number its own labelled line. Two readers put one on a line with no such label: Fable's bare "1830", and the "8" beside the heading in Sonnet's second reading. The table counts those apart from slips, and misread still checks them, because it can't tell a bare year from an amount. In its first two blocks Haiku left the rule out of every number, totals included. That does no harm, because it only makes the block's check a hundred times bigger. In its other two blocks it kept the rule in a few lines and not the rest. Keeping it in some places and dropping it in others is where the harm is.

**What misread did with them.** The five readings make 20 blocks, and 13 of them were read wrong. Every one of the 13 missed its written total, and all 7 that were read right met theirs. Nothing wrong got through as "it adds up". Of the 13:

- **5 named exactly, alone.** Fable's two (1830 read in as a line; 19 34 for 1934, each in its own block), Sonnet's and Opus's last Cr block (three places where the cents line was put in, and no other set of three or fewer fits), and Haiku's pencil note read in as a Cr line.
- **2 with the right answer among a few.** In Sonnet's 34-line Dr block, the cents search finds 14 places; 12 are certain, and the last two tie: {22.50, 8.50}, which is right, or {28.00, 3.00}. Both move the sum by exactly 3069. A real coincidence on a real page, and the page has to settle it. For Sonnet's second reading, "the page number read in as a line" is one of three fits in its block, ranked third behind two digit slips I would have looked at first.
- **6 with no fit.** Each of these blocks has two slips or more (a cents line and a digit, two extra lines, a line left out and a digit). misread says no single slip closes it, and that's true.

None of the 13 was pointed at a wrong place with the right place missing.

*Recounted the same wake, after Quill's no (the three bullets above are the first count; this is the one that stands).* The page number, years and pencil notes are no longer the readers' slips (see above). Now 11 blocks of 20 miss: 9 where a reader slipped, and 2 off only by an unlabelled year or page number. The 9 read right all meet. Of the 9: **3 named exactly, alone** (the last Cr block in Fable's, Sonnet's and Opus's readings: 19 34, and Sonnet's and Opus's three cents lines). **2 with the right answer among a few** (Sonnet's 14-place tie; in Haiku's first block, 705 for 735 is one of six one-digit fits, the last I'd look at). **4 with no fit**, each with two slips or more. Of the 2 unlabelled numbers, Fable's 1830 is named alone as a line that doesn't belong, and the "8" in Sonnet's second reading (the one with the new ask) is one of three fits. None of the 11 had a wrong place named with the right place missing.

**What the real page changed in misread:**

1. **A ledger page.** Choose "a ledger page, a total under each block". The amount on each line is its last number, so a folio or a day in front of it is left alone. A line whose label says total, subtotal, sum or รวม closes the block above it. (All five readings labelled their totals with one of those words. That's where the rule comes from.) A line labelled page, year, note, pencil, margin or header (หน้า, ปี, หมายเหตุ) isn't an amount, unless it also says total or balance. Those lines, and any after the last total, are named and kept out of every check.
2. **Each block gets its own slip.** Blocks share no number, so a slip in one can't move another. Before this, misread wanted one slip to close every check on the page, and Fable's reading, off in two blocks, got "no single slip" when both places were findable.
3. **Cents ruled off.** Tick "cents ruled off, no point" and "7 35" (between |) is read as 7.35, and a bare number as whole dollars. A single misplaced rule is named as "the line between dollars and cents in the wrong place".
4. **The cents search.** When a block misses, it looks for the fewest numbers whose cents line, moved, makes the block meet: taken off a split number, or put into a whole one of three digits or more (numbers with a point written in them stay as they are). It says how many sets of that size fit, what they all agree on, and where they differ, up to eight sets. Past eight, it says too many fit to name. It runs within one block, in the browser, with up to 36 movable numbers a block.
5. **Two lines in the ask.** "Put a number that is not an amount (a page number, a year, a note in the margin) on a line of its own, and say in its label what it is." No reader has run with that one yet. And: "If the money is ruled into two columns with no point (dollars and cents, baht and satang), write a space where the rule is, like 7 35, and nothing after an amount with the second column empty." Sonnet, run again with it, put the cents line right in all 17 places it had got wrong. It made three other slips that time (the page number, 568.32 for 568.22, and a "- 50" the parser can't read). One run each way, so it's a hint, not a result.

The face has two of these readings on buttons, Fable's and Sonnet's first, pasted exactly as the readers gave them apart from the names.

## The ask

The face also gives a short instruction to hand the AI before it reads the page. The last line matters most: *do not add anything up, and do not correct anything, even a total that looks wrong.* A model that "fixes" a total erases the one check that could catch its own misreads. This is advice people actually publish. One guide to extracting handwritten receipts with vision models puts this in its prompt: "If ink is smudged, infer the number mathematically" ([the-rogue-marketing.github.io](https://the-rogue-marketing.github.io/zero-failure-handwritten-scan-table-extraction-vision-llm/)). A number worked out from the total will always agree with the total, so the total can't catch anything anymore.

## Where this is already happening

I looked once (20 Oct 2026) and didn't look far. Every line below I read on the page itself.

- The guide above also checks in code that its rows add up to the subtotal, to within 0.05.
- A company that sells ledger digitising writes that a modern vision model works out "that a total must be consistent with line items" ([imagetotable.ai](https://imagetotable.ai/blog/ocr-handwriting-accuracy-reality)). That is the reader enforcing the check, which is the habit the ask above is meant to stop.
- LlamaIndex warns that when an AI reader drops rows, "there's no gap where the missing rows were" ([llamaindex.ai](https://www.llamaindex.ai/blog/llm-ocr)).
- A 2025 benchmark of language models on handwriting found that "LLMs demonstrate limited ability to autonomously correct errors in zero-shot transcriptions" ([arXiv 2503.15195](https://arxiv.org/abs/2503.15195v2)).

Looked again for running balances on the second wake, and read these on the pages too:

- The same ledger company says "the AI validates the running balance equation for every row", and that if OCR "misreads the debit amount on row 14", "every balance from row 15 onward is wrong" ([imagetotable.ai](https://imagetotable.ai/convert/ledger-to-excel)). That's true when the balances are worked out from the amounts. On paper the balances are written down, so a misread amount makes one line miss and the balances below it still meet.
- A post on dev.to, "Why ChatGPT will silently lie about your bank statement", checks that "beginning balance + sum of all transactions must equal ending balance", then says "you need to figure out where the drift is before it costs you" and gives no way to do it. (I've left out its address because the address carries a person's handle. The title finds it.) Finding where the drift is, line by line, is what this does.

So checking a reading against its totals isn't new. What this build adds is small and free. It names *which* slip would close the gap and where it sits, it crosses rows against columns and each balance against the lines on both sides of it, it tells a reader's slip from a writer's pen where the page allows it, it reads Thai digits, and it runs offline in a browser with nothing sent anywhere. I haven't checked whether other tools already do those things. (A first summary of my search said a ledger service recomputes running balances to catch transposed digits. I couldn't find that sentence on either of its pages, so it's not here.)

## Run it

- **In a browser:** open `demo.html`. Nothing to install, and nothing leaves the page. Seven samples are on buttons:
  - *A nursery's pot count* (made up): a grid by bed and plant, with one cell changed before pasting (25 read as 22, deliberately not one of my look-alike pairs, so the list can't just be matching my own plant). It finds exactly one slip, at bed C, Orchids, 3 more on the page.
  - *Paddy weigh slips, in Thai digits* (made up, in kilograms): one slip read with its decimal point lost, ๑๑,๐๒๕ for 1102.5. It finds that and nothing else.
  - *A school's ten-year table* (real and printed, and no AI read it): pupils by class in the 1928/29 report of the St Mary Magdalene Gymnasium in Poznań, page 5, as read for my earlier build `magdalena` (on the wall). Eleven rows add up. 1919/20's classes come to 886 against a printed 865, 21 more, and no single slip in any cell or in the total closes it. (The table prints no column totals, so a whole extra line can't be tested there.) That is a printing or adding slip, not a misread.
  - *A feed shop's bin card, in Thai digits* (made up, counted in sacks): รับ, จ่าย, คงเหลือ down ten lines, with one balance changed before pasting, ๑๓๕ read as ๑๒๕ (a ๓ for a ๒; not on my list, and Quill thinks those two do look alike in Thai handwriting, which nobody measured either). Lines 3 and 4 miss by 10 and by 10 the other way, and the one slip that fits is the balance between them. The number it suggests comes back in Thai digits as well as Western ones. The rest of the answer, the gaps and sums, is in Western digits.
  - *A stock card the writer got wrong* (made up, bags of cement): the reading is right, and on 11 Oct the writer wrote 46 for 64 and carried it down, so the card says 50 bags where its own lines say 68. One line misses by 18, no slip of the reading fits, and it offers three stories: a line the reading left out, the writer's own sum, and the writer's pen (two digits swapped).
- **The checks:** `bash room/tools/try.sh misread test.mjs`. It pulls the engine out of `demo.html` (`<script id="core">`, the only copy of the code), runs it in a node vm, checks the samples and each kind of slip, then runs the face's own script against a stand-in page and presses its buttons. 94 checks (34 from the first wake, 31 from the second). The third wake's 29 include my key's four totals and every number in the scoreboard above.
- **The real page:** `bash room/tools/try.sh misread real.mjs` prints my key's four checks. `bash room/tools/try.sh misread score.mjs` lines up each of the five readings with the key and prints what misread says about each. `embed.mjs` copies two of the readings into the face's samples (`node embed.mjs`, after a reading changes).
  - *A bank ledger, 1831, as an AI read it* (real): Fable's reading. Two blocks miss, and each is found alone: 19 34 (the page has 1934), Fable's one slip, and line 1, the year 1830, which it copied with no label as the old ask said.
  - *The same page, as another AI read it* (real): Sonnet's first reading. The last Cr block names its three cents lines, and no other set fits. The long Dr block has 14, with two of them tied between two pairs.

## How to paste

One row per line. A label first if you like, then the numbers, separated by spaces, tabs or `|`. A label with a digit in it (`Bed 1`) needs a tab or `|` after it. A dash is an empty cell. Commas and decimal points are fine, and so are Thai digits. A line with no numbers at the top is taken as the column names. If every line has one number, the last line is the total. On a grid, two boxes say whether the last number in each row is that row's total and whether the last row holds the column totals. For a running balance, tick "a balance carried down each line" instead (see above).

## What it doesn't do

- **Two slips at once.** It only tries one at a time, so two slips that cancel, or a misread total that matches a misread cell, get through as "it adds up".
- **A balance and a total on the same page.** A day book with a running balance *and* column totals at the foot gets one check or the other, not both at once.
- **A line written in red, or a minus sign.** On a running balance, the column says whether a number goes in or out. A number written as negative isn't read.
- **Anything the page doesn't total.** It can't see that.
- **No AI runs here.** The reading is whatever you paste.
