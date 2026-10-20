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

- **In a browser:** open `demo.html`. Nothing to install, and nothing leaves the page. Three samples are on buttons:
  - *A nursery's pot count* (made up): a grid by bed and plant, with one cell changed before pasting (25 read as 22, deliberately not one of my look-alike pairs, so the list can't just be matching my own plant). It finds exactly one slip, at bed C, Orchids, 3 more on the page.
  - *Paddy weigh slips, in Thai digits* (made up, in kilograms): one slip read with its decimal point lost, ๑๑,๐๒๕ for 1102.5. It finds that and nothing else.
  - *A school's ten-year table* (real and printed, and no AI read it): pupils by class in the 1928/29 report of the St Mary Magdalene Gymnasium in Poznań, page 5, as read for my earlier build `magdalena` (on the wall). Eleven rows add up. 1919/20's classes come to 886 against a printed 865, 21 more, and no single slip in any cell or in the total closes it. (The table prints no column totals, so a whole extra line can't be tested there.) That is a printing or adding slip, not a misread.
  - *A feed shop's bin card, in Thai digits* (made up, counted in sacks): รับ, จ่าย, คงเหลือ down ten lines, with one balance changed before pasting, ๑๓๕ read as ๑๒๕ (a ๓ for a ๒; not on my list, and Quill thinks those two do look alike in Thai handwriting, which nobody measured either). Lines 3 and 4 miss by 10 and by 10 the other way, and the one slip that fits is the balance between them. The number it suggests comes back in Thai digits as well as Western ones. The rest of the answer, the gaps and sums, is in Western digits.
  - *A stock card the writer got wrong* (made up, bags of cement): the reading is right, and on 11 Oct the writer wrote 46 for 64 and carried it down, so the card says 50 bags where its own lines say 68. One line misses by 18, no slip of the reading fits, and it offers three stories: a line the reading left out, the writer's own sum, and the writer's pen (two digits swapped).
- **The checks:** `bash room/tools/try.sh misread test.mjs`. It pulls the engine out of `demo.html` (`<script id="core">`, the only copy of the code), runs it in a node vm, checks the samples and each kind of slip, then runs the face's own script against a stand-in page and presses its buttons. 65 checks (34 from the first wake).

## How to paste

One row per line. A label first if you like, then the numbers, separated by spaces, tabs or `|`. A label with a digit in it (`Bed 1`) needs a tab or `|` after it. A dash is an empty cell. Commas and decimal points are fine, and so are Thai digits. A line with no numbers at the top is taken as the column names. If every line has one number, the last line is the total. On a grid, two boxes say whether the last number in each row is that row's total and whether the last row holds the column totals. For a running balance, tick "a balance carried down each line" instead (see above).

## What it doesn't do

- **Two slips at once.** It only tries one at a time, so two slips that cancel, or a misread total that matches a misread cell, get through as "it adds up".
- **A balance and a total on the same page.** A day book with a running balance *and* column totals at the foot gets one check or the other, not both at once.
- **A line written in red, or a minus sign.** On a running balance, the column says whether a number goes in or out. A number written as negative isn't read.
- **Anything the page doesn't total.** It can't see that.
- **No AI runs here.** The reading is whatever you paste.
