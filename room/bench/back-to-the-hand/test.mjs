// test.mjs: the checks. Run: bash room/tools/try.sh back-to-the-hand test.mjs
import { readFileSync } from 'node:fs';
import { BOOK, SECTIONS } from './data.mjs';
import { DUCHAS } from './duchas.mjs';
import { rows, BINS, pageNum } from './lib.mjs';

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`);
}

const R = rows();

// The book's side.
check('55 tales, numbered 1 to 55 in order', BOOK.length === 55 && BOOK.every((b, i) => b[0] === i + 1));
check('seven sections, starting at tale 1', SECTIONS.length === 7 && SECTIONS[0][0] === 1);
const noRef = BOOK.filter((b) => b[4] == null).map((b) => b[0]);
check('the notes name no manuscript for 38, 44 and 45 only', noRef.join() === '38,44,45', `(${noRef.join(', ')})`);
check('every printed range starts with the first page stored', BOOK.filter((b) => b[4] != null).every((b) => parseInt(b[6]) === b[5]));

// The bins.
const tally = Object.fromEntries(BINS.map((b) => [b, R.filter((r) => r.bin === b).length]));
const sum = Object.values(tally).reduce((a, b) => a + b, 0);
check('every tale is in exactly one bin, and the bins add up to 55', sum === 55 && R.every((r) => BINS.includes(r.bin)), JSON.stringify(tally));

// The dúchas side: every row I keep is for a tale with a reference, in the right volume.
const keys = Object.keys(DUCHAS).map(Number);
check('dúchas rows only for tales the book gives a volume for', keys.every((n) => BOOK[n - 1][4] != null));
const wrongVol = keys.filter((n) => DUCHAS[n].volumeId && DUCHAS[n].vol !== BOOK[n - 1][4]);
check('each dúchas row is in the volume the book names', wrongVol.length === 0, wrongVol.join(' '));
const badHref = keys.filter((n) => DUCHAS[n].href && !DUCHAS[n].href.startsWith(`https://www.duchas.ie/en/cbe/${DUCHAS[n].volumeId}/`));
check('each link opens a page in that volume', badHref.length === 0, badHref.join(' '));

// The two I read myself, first, before the rest came in.
check('35, The March Cock and the Coffin: vol. 529, page 241, lands', R[34].bin === 'lands' && pageNum(R[34].d.label) === 241);
check('37, The Queen of the Planets: vol. 2, page 122b, lands', R[36].bin === 'lands' && R[36].d.label.endsWith('122b'));

// Where the counties and years agree, for the tales that land.
const landed = R.filter((r) => r.bin === 'lands');
const countyOff = landed.filter((r) => r.d.county && !r.d.county.includes(r.county)).map((r) => r.n);
check('every tale that lands is in the county the book gives', countyOff.length === 0, countyOff.length ? 'off: ' + countyOff.join(' ') : `(${landed.length})`);
const yearOff = landed.filter((r) => r.year && r.d.date && !r.d.date.includes(String(r.year))).map((r) => `${r.n} (${r.year} vs ${r.d.date})`);
check('every tale that lands has the year the book gives', yearOff.length === 0, yearOff.length ? 'off: ' + yearOff.join(', ') : '');

// The face is made from these rows.
const html = readFileSync(new URL('demo.html', import.meta.url), 'utf8');
check('the face shows 55 tales', (html.match(/<li class="t /g) || []).length === 55);
check('the face links every dúchas item it has', keys.filter((n) => DUCHAS[n].href).every((n) => html.includes(DUCHAS[n].href.replace(/&/g, '&amp;'))));
check('the face tallies the same bins', BINS.every((b) => html.includes(`>${tally[b]} ${b}<`)));

console.log(`\n${pass} ok, ${fail} failed`);
console.log(Object.entries(tally).map(([b, c]) => `${c} ${b}`).join(', '));
process.exit(fail ? 1 : 0);
