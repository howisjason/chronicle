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
check('the README\'s count: 31 land, 0 near, 2 disagree, 19 not online, 3 no reference', BINS.map((b) => tally[b]).join() === '31,0,2,19,3');

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

// Every tale with a reference has been looked up: nothing is left out of the bins.
const unread = R.filter((r) => r.bin === 'not looked up').map((r) => r.n);
check('every tale the book gives a volume for has a dúchas row', unread.length === 0, unread.join(' '));

// The ones not online: all but vol. 62 are numbered above 875, where dúchas's list has
// few volumes. As the helpers read it, the list goes 0875 to 1011, 1011 to 1042,
// 1044 to 1060, and stops; those three gaps and the stretch past 1060 hold all
// fifteen (9, 2, 2 and 2). Only "above 875" is checked here.
const offVols = [...new Set(R.filter((r) => r.bin === 'not online').map((r) => r.vol))].sort((a, b) => a - b);
check('16 volumes not online, and all but vol. 62 above 875', offVols.length === 16 && offVols.filter((v) => v <= 875).join() === '62', offVols.join(' '));
const online = R.filter((r) => r.bin === 'lands' || r.bin === 'near' || r.bin === 'disagrees').length;
check('33 tales are in a volume online, and 31 of them land', online === 33 && R.filter((r) => r.bin === 'lands').length === 31);

// The two that disagree: the book's page is past the end of the volume online.
const dis = R.filter((r) => r.bin === 'disagrees');
check('16 and 53 disagree, and only they', dis.map((r) => r.n).join() === '16,53');
check('in both, the book\'s page is past the last page online', dis.every((r) => r.page > r.d.pagesOnline), dis.map((r) => `${r.page} > ${r.d.pagesOnline}`).join(', '));

// Where the counties and years agree, for the tales that land. The county is the
// volume's (dúchas gives places for a volume); 25 and 54 are the two it doesn't hold
// for, named here rather than hidden.
const landed = R.filter((r) => r.bin === 'lands');
const countyOff = landed.filter((r) => r.d.county && !r.d.county.includes(r.county)).map((r) => r.n);
check('every tale that lands is in a county its volume names, but 25 and 54 (book: Cork; volume: Kerry)', countyOff.join() === '25,54', `(${landed.length} land; off: ${countyOff.join(' ')})`);
// A date is a day, a month, a year, or a range of years ("1935–1937").
const inDate = (y, date) => { const ys = (date.match(/\d{4}/g) || []).map(Number); return ys.length === 2 ? ys[0] <= y && y <= ys[1] : ys.includes(y); };
const yearOff = landed.filter((r) => r.year && r.d.date && !inDate(r.year, r.d.date)).map((r) => `${r.n} (${r.year} vs ${r.d.date})`);
check('every tale that lands has the year the book gives, where the book gives one', yearOff.length === 0, yearOff.length ? 'off: ' + yearOff.join(', ') : '');

// The face is made from these rows.
const html = readFileSync(new URL('demo.html', import.meta.url), 'utf8');
check('the face shows 55 tales', (html.match(/<li class="t /g) || []).length === 55);
check('the face links every dúchas item it has', keys.filter((n) => DUCHAS[n].href).every((n) => html.includes(DUCHAS[n].href.replace(/&/g, '&amp;'))));
check('the face tallies the same bins', BINS.every((b) => html.includes(`>${tally[b]} ${b}<`)));

console.log(`\n${pass} ok, ${fail} failed`);
console.log(Object.entries(tally).map(([b, c]) => `${c} ${b}`).join(', '));
process.exit(fail ? 1 : 0);
