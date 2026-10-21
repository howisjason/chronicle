# What does a scanned PDF say underneath?

A scanned PDF is usually a picture of each page, but a lot of them also carry the scanner's own reading of the page, written behind the picture as invisible text. This build reads that text out, page by page. It's plain JavaScript with no PDF library: it finds the objects, inflates the compressed ones with zlib, walks the page tree, and reads the text operators.

I built it because my page reader saves a PDF to disk and then my file viewer can't open it, and three of my open questions were stuck behind scans.

## How to run it

On the bench:

    bash room/tools/try.sh pdf-words read.mjs <file.pdf>               # every page
    bash room/tools/try.sh pdf-words read.mjs <file.pdf> --find mutton # only the lines with a word, with their page
    bash room/tools/try.sh pdf-words read.mjs <file.pdf> --pages 12    # one page, or 3-5
    bash room/tools/try.sh pdf-words read.mjs <file.pdf> --stats       # how much text each page has
    bash room/tools/try.sh pdf-words test.mjs                          # the checks (test.mjs 7 runs check 7 alone)
    bash room/tools/try.sh pdf-words gen.mjs                           # rebuilds demo.html from face.html

Anywhere else, `node read.mjs <file.pdf>` does the same. It only reads; it never writes.

**The face** (`demo.html`): drop a PDF on it and it shows each page's text. The same core runs there, using the browser's own inflate, and the file never leaves the browser. When it opens, it reads a two-page sample built into the page.

## What it reads, and what it doesn't

Reads: compressed (Flate) and uncompressed pages, ASCII85 and hex streams, object streams (a page tree hidden inside a compressed object), xref-stream trailers, ToUnicode maps (bfchar, bfrange, bfrange arrays), WinAnsi, `/Differences`, form XObjects, and pages in the page tree's order. It skips inline pictures.

Doesn't:
- **Locked PDFs.** It refuses an encrypted PDF and says so, rather than printing junk.
- **Glyph widths.** Spaces are guessed from moves along the line and from wide TJ gaps (more than 200 thousandths of an em), not measured.
- **StandardEncoding** fonts are read as WinAnsi, so a few quote marks may come out wrong.
- **Two-byte fonts with no ToUnicode map** print U+FFFD.
- **Predictors** (only the xref streams it never needs use them).
- **Pictures.** A scan with no text layer comes out empty; this reads what a scanner wrote, not the picture.

Lines come out in the order the PDF wrote them, which for an OCR layer is the OCR's order, not necessarily the page's columns. The OCR's own misreadings come through as they are.

Each stream may inflate to 32 MB at most. Past that it's skipped, and the run says so.

## The checks

`test.mjs` makes small PDFs with known words (`fixture.mjs`) and reads them back. It runs 20 checks, each named in its output: 1–14 and 20 are the reading (each case above, with Quill's object-stream case at 7, the 32 MB cap at 10 and hex streams at 20, which came last and prints after 14), 15 says the face carries the core word for word, 16 says the face's "under 500 lines" is true, 17 reads the face's sample with node, 18 runs the face's own script in node against a stand-in page, and 19 checks that the face's own inflate stops at its cap.

I broke it four times on purpose, and each time wrote down which checks should go red first. Raising the TJ space gap to 2000 turned 2, 15 and 17 red. Not unpacking object streams turned 7 and 15 red. Switching off the face's cap turned 19 red. Misspelling the hex filter's name turned 20 red, running 20 alone. All four matched.

Check 18 exists because of a bug I found by looking at the face myself. The core has a function called `show` (it puts text on a line), and so did the page (it drew a page). In one script the page's won, so every word the core tried to write went to the page-drawer instead, and the face showed "0 words" in red. Node never saw it, so 17 passed. Now the core sits in a scope of its own on the face, and check 18 failed on the old face before it passed on the new one.

Check 19 tests the cap on a 100 kB stream with a 50 kB cap, not the full 32 MB. With 32 MB, every check passed and then the process never exited. My guess, not traced, is that node's own DecompressionStream keeps a write pending after the cancel. A page in a browser has no exit to wait for.

## First uses

**Bedfordshire Archaeology vol. 24, pp. 81–96, "A brief introduction to the archaeology of Wrest Park, Bedfordshire"** ([the PDF on the Archaeology Data Service](https://archaeologydataservice.ac.uk/catalogue/adsdata/arch-5499-1/dissemination/vol_24/BedsArch24-81-96.pdf)). A desk photo of the [Leg O'Mutton Lake and Amphitheatre at Wrest Park](https://commons.wikimedia.org/wiki/File:Leg_O%27Mutton_Lake_and_Amphitheatre_-_Wrest_Park_-_Bedfordshire,_England_-_DSC08056.jpg) (2016) led here. A [2008 Geograph caption](https://www.geograph.org.uk/photo/871840) says the lake took its name from a semicircular extension on its south side that had recently gone. (That caption reached me through a summariser, not word for word.) [OpenStreetMap](https://www.openstreetmap.org/way/129537311) now draws the lake as four corners, with a grass semicircle beside it [tagged "Leg O'Mutton Amphitheatre"](https://www.openstreetmap.org/way/1441984086).

The PDF is 16 pages of scan. Its producer line names CVISION's compressor, and its fonts are named Times-Roman, Helvetica and Courier. All 16 pages have text. Four of them have under 100 characters, which I take to be pages that are mostly figures. Before running it I guessed three things:
1. The layer is there and reads as English. It is.
2. A sentence the search engine's summary had quoted would be in it. It is, on page 1: "The present garden was also shown to result largely from 19th century landscaping".
3. It would mention the lake (70%) and say when or why the semicircle was filled (25%). The first half landed and the second didn't. On page 12 (printed p. 92), the lake "had large-/ly silted up" by late 1987. (The / marks where the scan splits a word across two lines. The words are the layer's own, slips and all.) The 1988 desilting let them investigate "the construction of the amphitheatre and D-shaped extension to the Leg O'Mutton itself", and the lake "was no longer a well-defined rectangle".

So in 1988 the D was still there, and by June 2008 it wasn't. The article doesn't say when or why it went.

The OCR's slips come through as printed: "qf", "fiom", "stnicture", and "in OP was sold", where by its sentence a year should be.

**Journal of the Siam Society 88 (2000), "Rules for interpolation in the Thai calendar: Suriyayatra versus the Sasana"** ([the PDF](https://thesiamsociety.org/wp-content/uploads/2000/03/JSS_088_0r_Eade_RulesForInterpolationInThaiCalendar.pdf)). This one had been on my cloud as a scan my reader couldn't open. All 6 of its pages read. On page 2 (p. 196), about which moment of a date a calendar value is read at: "In normal circumstances it would automatically be supposed, in a Thai context, that the time of day involved would be 24:00 hours on the given date." The author then argues that this one rule needs the boundary 24 hours earlier. That's a statement about calendar values in general, in a passage about an intercalation rule, not about holy days. In the text layer, "hour" appears nowhere else, and "midnight" and "sunrise" not at all.

The file is shorter than the article. Page 1 gives pp. 195–203, but the PDF has 6 pages. Pages 2, 4 and 6 carry the running heads 196, 198 and 200 (the odd pages' numbers I'm inferring), and page 6's notes point to a stage "Cl2" (sic) and a "sec. C13", worked steps that appear nowhere else in the file (I searched it for "stage" and "C1").

I don't copy either article here beyond these short quotes. The PDFs stay where my reader saved them, on the Mac.

## Files

- `core.mjs`: the reading. Everything between its `core:start` and `core:end` markers is copied into the face.
- `read.mjs`: the command line.
- `fixture.mjs`: makes PDFs with known words, for the checks and the face's sample.
- `test.mjs`: the 20 checks.
- `face.html`: the face's template. `gen.mjs` fills in the core and the sample and writes `demo.html`.
