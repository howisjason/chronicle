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

**A third road, added 15 Oct 2026, for the key's shape only.** The paper's Supplementary file 1 is the same key in Portuguese, as a Word file. `supp.mjs` opens it without the page reader. It reads the zip and the Word XML in node, with no outside packages, and writes each half and where it leads to `supp1-endings.txt`. The Portuguese key leads where read A does at all 92 halves: the same couplet number, or the same genus. One genus is spelled differently there, *Pseudoatenius* at 46a, and the test folds it to *Pseudataenius* in one named line. This road never went through a summariser, so the tree (which half leads where, and which genus each walk ends in) now rests on two reads of Plazi and the authors' own file. The English wording still rests on the two reads only, because the Portuguese can't check it word for word.

## The checks

`bash room/tools/try.sh brazil-aphodiine-key test.mjs` runs 37 checks:

- Both reads have halves 1a to 46b in order (92 each), and they agree on every half's wording and on where every half leads.
- The tree is sound. Couplets 2 to 46 are each reached from exactly one half, and every pointer goes forward, so there are no loops. 46 couplets give 47 endings, and there are 47 walks from couplet 1. The walks run from 2 to 21 choices.
- Four genera end the key in two places, and they are exactly the four the key marks "(in part)": *Lomanoxoides*, *Martineziana*, *Odontolytes*, *Platytomus*. None ends in three. 47 endings, less 4 repeats, is 43 genera.
- A second road to the genus list: Plazi's list of the paper's treatments, read separately (`genera.txt`). Its 43 genus treatments are the key's 43 genera, as sets. The Plazi ids were read twice (`genera-b.txt`), and both reads agree on all 43. I opened one, *Paraplesiataenius*, and it is that genus's treatment. The other 42 I have not opened.
- The desk beetle's genus is one walk of 20 choices, ending at 44b, and 19 of them are second halves.
- `demo.html` carries read A and the genus list exactly, and it starts at couplet 1.
- The buttons get pressed. The page's own script runs in node against a small stand-in for the browser, and the test reads back what the page drew. It opens at couplet 1, and two choices reach couplet 7. The desk button lands on *Paraplesiataenius*. It still does after "Back one step", and after Back, 44a, and the button again. (Quill's no at the finish door: the button handed over its stored walk itself, not a copy, so Back shortened the walk and the button then stopped at couplet 44. These two checks failed on that page before the fix.) "Start again" returns to couplet 1, and every one of the menu's 47 ways lands on its genus. The stand-in is not a browser. I looked at the real page twice: at couplet 1, and walked to the desk beetle's genus.
- The Portuguese key (4 checks, added 15 Oct): it has halves 1a to 46b in order. It leads where read A does at all 92. Its genera are the key's 43, with one spelling folded, and that fold is used once, at 46a. I guessed before the first run that all 92 would agree, with that one spelling. Then I changed 43b to point at 46 on purpose: one check went red, at 43b. I wrote the file again from the Word file, and all 37 passed.
- The bibliography sheet (6 checks, added 15 Oct; see the open question): 149 species, none listed twice; they fall in 38 genera, all in the key; the key's genera with no species in it are exactly five; the abstract's three new-record genera are among the five; two of the three Rhyparini are in it, and *Termitodius* isn't; and neither supplementary file counts 40 genera.

`bash room/tools/try.sh brazil-aphodiine-key gen.mjs` rewrites `demo.html` from the text files. (`gen.mjs peek` writes it already walked to the desk beetle's genus, which is how I looked at the ending. If that copy is left in place, "the demo starts at couplet 1, not walked" and "the page opens at couplet 1" both fail.)

Not checked, and named: "pp. 15–19" and the paper's page counts come from Plazi's and the journal's pages as the reader gave them.

## One open question

The abstract says, word for word, "In Brazil, the subfamily is composed of 40 genera and 148 species." The key ends in 43. Two readings each give 40, and I can't choose between them. The abstract names three genera as new records for Brazil (*Amerilochus*, *Saprolochus*, *Stebnickiella*). Separately, the key's first couplets set off three genera (*Leptorhyparus*, *Termitodius*, *Aschnarhyparus*) that the University of Nebraska State Museum's scarab guide places in the tribe Rhyparini, termite guests. That guide and Wikipedia put Rhyparini inside Aphodiinae, which makes the second reading less likely, but that's not a reading of the paper. The paper's introduction would say which, and I haven't been able to read it.

**What the paper's own files add (15 Oct 2026).** The PDF is still too large for my reader. But the article page has two supplementary files, and `supp.mjs` opens both. Neither counts 40.

- Supplementary file 1, the Portuguese key, ends in the same 43 genera.
- Supplementary file 2 is a spreadsheet, titled in its first row: "Bibliography used as reference for compiling data of species of Aphodiinae Leach, 1815 in Brazil." Each species has a "Reference" cell beside it. It lists 149 species in 38 genera. (`supp2.txt` keeps the species column only.) Five of the key's genera have no row: the three the abstract names as new to Brazil (*Amerilochus*, *Saprolochus*, *Stebnickiella*), *Cartwrightia* and *Termitodius*. For two of them the paper gives a reason. The abstract says *Cartwrightia cartwrighti* is among two species "tentatively considered as new records". The paper's *Termitodius* treatment says the genus "has four recognized species reported from Brazil, Colombia, Guatemala and Mexico (Skelley et al. 2022)". That sentence doesn't say which of the four are Brazilian. I haven't looked for a species treatment of it.

What that settles, and what it doesn't. The second reading (leave out the Rhyparini) was already up against the key's own title, "Key to genera of Aphodiinae from Brazil", which keys them out. Now the paper's bibliography sheet, titled for "species of Aphodiinae … in Brazil", holds two of the three as well. That's a second place in the paper's own files that puts them inside. The first reading (leave out the three new-record genera) gives the same set as the sheet's 38 plus *Cartwrightia* and *Termitodius*. Neither of those two has a row in the sheet. If the 40 counted genera with a published Brazilian record, the sheet alone would make it 38, not 40. That reading of the sheet is mine; its title says only "bibliography used … for compiling data". The abstract calls the *species* *Cartwrightia cartwrighti* tentatively new. It says nothing of the genus, and the sheet has no other *Cartwrightia* row. So I still can't say which three the 40 leaves out. The two files did turn up something I hadn't asked: the sheet's 149 species is not the abstract's 148 either. I haven't worked out why. The sheet is a bibliography and not the paper's species list, so I'm not counting it as a second mismatch. The paper's introduction is still the place to look.

Read for this section through my page reader, each quoted exactly: the abstract's sentences on 40 genera, the three new genera and the tentative records, read once each; the *Termitodius* sentence, read twice (whole, then as the 60 characters on either side of "Colombia"). The spreadsheet and the Word file were read in node, not through the reader.

## Files

`demo.html` the page · `read-a.txt`, `read-b.txt` the two reads · `genera.txt`, `genera-b.txt` the genus list and its ids · `lib.mjs` parsing and walks · `gen.mjs` writes the page · `test.mjs` the checks · `supp.mjs` opens the two supplementary files (`node supp.mjs <saved file> list|rows|text|species|ptkey`; inflating is capped at 2 MB a part) · `supp1-endings.txt` the Portuguese key's halves · `supp2.txt` the species column of the bibliography sheet · `supp-count.mjs` prints the sheet's genera against the key's
