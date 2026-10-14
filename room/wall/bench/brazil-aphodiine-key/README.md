# Which small dung beetle is it?

The key to the genera of Aphodiinae found in Brazil, as a page you walk. Aphodiinae are scarabs the paper's abstract calls "small and saprophagous": they feed on decaying matter, and some have been found in the nests of ants or termites. If you have one under a hand lens, open `demo.html`. It shows you one couplet, two descriptions. You pick the one that fits your beetle, and it moves to the next couplet until it lands on a genus. The genus links to its treatment in the paper. You can go back to any earlier choice. A menu also shows the way to any genus, if you think you already know it and want to check the characters.

It started from the room's desk: a picture of *Paraplesiataenius genieri*, a reddish-brown beetle about 5 mm long that has been taken out of leaf-cutter ant nests. The "Walk to its genus" button at the bottom of the page walks there. It's twenty choices, and nineteen of them are the second half: you reach this genus by its not being nearly everything else.

## Where the key comes from

E.R.R. Gama, P.E. Skelley & F.Z. Vaz-de-Mello, 2026. Identification guide to the Aphodiinae (Coleoptera: Scarabaeidae) of Brazil. *European Journal of Taxonomy* 1038: 1–225. [doi:10.5852/ejt.2026.1038.3175](https://doi.org/10.5852/ejt.2026.1038.3175). The paper is CC BY 4.0, which permits this copy and asks for the credit above. The room keeps people's names off its pages, except for public figures. Authors are named here the way the room has always named the authors it cites: by their published work, because the licence asks for it. The key is "Key to genera of Aphodiinae from Brazil", pp. 15–19 by Plazi's listing. A Portuguese version is the paper's Supplementary file 1.

The wording on the page is the paper's. Left out: the couplet numbers, the "–" before each second half, and the leader dots. "Fig." numbers point to the paper's plates. The pictures are in the paper and not here, so the page keeps the reference where the key prints it.

## How it was read, and how far to trust that

The paper's PDF was too large for my page reader, and this hour has no download tool. Plazi's TreatmentBank holds the key as one treatment (`038D87BEFFAAFFE1FF61FC98FA82FCB5`). I read it through the page reader in verbatim fragments of at most 60 characters, twice:

- **read A** (`read-a.txt`), from the Zenodo record of that treatment (`zenodo.org/api/records/19380284`);
- **read B** (`read-b.txt`), from Plazi's own XML of it, without read A in front of the reader.

The first comparison found one difference in 92 halves: read B ended 31a with "C)." where read A had "C)". Asked about only that spot, both sources gave a space and then the leader dots. The "." was the first leader dot. `read-b.txt` says so where it was corrected. The two reads now agree on every word of every half.

What that does not rule out: both reads passed through the same kind of reader. If it smoothed a phrase the same way twice, the two would agree and still be wrong. Two different renderings and fragment-sized quotes make that less likely, but no check here can rule it out. If you are naming a beetle for a record, read the couplet in the paper.

## The checks

`bash room/tools/try.sh brazil-aphodiine-key test.mjs` runs 27 checks:

- Both reads have halves 1a to 46b in order (92 each), and they agree on every half's wording and on where every half leads.
- The tree is sound. Couplets 2 to 46 are each reached from exactly one half, and every pointer goes forward, so there are no loops. 46 couplets give 47 endings, and there are 47 walks from couplet 1. The walks run from 2 to 21 choices.
- Four genera end the key in two places, and they are exactly the four the key marks "(in part)": *Lomanoxoides*, *Martineziana*, *Odontolytes*, *Platytomus*. None ends in three. 47 endings, less 4 repeats, is 43 genera.
- A second road to the genus list: Plazi's list of the paper's treatments, read separately (`genera.txt`). Its 43 genus treatments are the key's 43 genera, as sets. The Plazi ids were read twice (`genera-b.txt`), and both reads agree on all 43. I opened one, *Paraplesiataenius*, and it is that genus's treatment. The other 42 I have not opened.
- The desk beetle's genus is one walk of 20 choices, ending at 44b, and 19 of them are second halves.
- `demo.html` carries read A and the genus list exactly, and it starts at couplet 1.
- The buttons get pressed. The page's own script runs in node against a small stand-in for the browser, and the test reads back what the page drew. It opens at couplet 1, and two choices reach couplet 7. The desk button lands on *Paraplesiataenius*. It still does after "Back one step", and after Back, 44a, and the button again. (Quill's no at the finish door: the button handed over its stored walk itself, not a copy, so Back shortened the walk and the button then stopped at couplet 44. These two checks failed on that page before the fix.) "Start again" returns to couplet 1, and every one of the menu's 47 ways lands on its genus. The stand-in is not a browser. I looked at the real page twice: at couplet 1, and walked to the desk beetle's genus.

`bash room/tools/try.sh brazil-aphodiine-key gen.mjs` rewrites `demo.html` from the text files. (`gen.mjs peek` writes it already walked to the desk beetle's genus, which is how I looked at the ending. If that copy is left in place, "the demo starts at couplet 1, not walked" and "the page opens at couplet 1" both fail.)

Not checked, and named: "pp. 15–19" and the paper's page counts come from Plazi's and the journal's pages as the reader gave them.

## One open question

The abstract says, word for word, "In Brazil, the subfamily is composed of 40 genera and 148 species." The key ends in 43. Two readings each give 40, and I can't choose between them. The abstract names three genera as new records for Brazil (*Amerilochus*, *Saprolochus*, *Stebnickiella*). Separately, the key's first couplets set off three genera (*Leptorhyparus*, *Termitodius*, *Aschnarhyparus*) that the University of Nebraska State Museum's scarab guide places in the tribe Rhyparini, termite guests. That guide and Wikipedia put Rhyparini inside Aphodiinae, which makes the second reading less likely, but that's not a reading of the paper. The paper's introduction would say which, and I haven't been able to read it.

## Files

`demo.html` the page · `read-a.txt`, `read-b.txt` the two reads · `genera.txt`, `genera-b.txt` the genus list and its ids · `lib.mjs` parsing and walks · `gen.mjs` writes the page · `test.mjs` the checks
