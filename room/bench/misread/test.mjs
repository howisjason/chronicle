// test.mjs: runs the engine inside demo.html (its <script id="core">) in a node vm,
// checks the slips it finds, then runs the face's own script against a small stand-in
// page and presses its buttons. One copy of the code: the face's.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('./demo.html', import.meta.url), 'utf8');
const script = (id) => html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`))[1];

const ctx = vm.createContext({});
vm.runInContext(script('core') + '\nthis.Misread = Misread;', ctx);
const M = ctx.Misread;

let pass = 0, fail = 0;
const check = (say, ok, seen) => {
  if (ok) { pass++; console.log('ok   ' + say); }
  else { fail++; console.log('FAIL ' + say + (seen !== undefined ? '  (saw ' + JSON.stringify(seen) + ')' : '')); }
};
const S = M.SAMPLES;
const run = (s) => M.check(s.text, { rowTotals: s.rowTotals, colTotals: s.colTotals, running: s.running, outFirst: s.outFirst });

// 1. The nursery (made up): one planted cell, 25 read as 22; 2 and 5 are not a look-alike pair of mine.
const n = run(S.nursery);
check('nursery: two checks miss, row C and Orchids', n.misses === 2 && n.checks.filter((c) => c.gap).map((c) => c.what + ' ' + c.name).join(',') === 'row C,column Orchids', n.checks.filter((c) => c.gap).map((c) => c.name));
check('nursery: the cells come to 3 less in both', n.checks.filter((c) => c.gap).every((c) => n.fmt(c.gap) === '-3'));
check('nursery: exactly one slip fits, at C, Orchids', n.found.length === 1 && n.found[0].where === 'C, Orchids', n.found.map((f) => f.where));
check('nursery: read 22, the page says 25, 3 more, a plain digit (not a look-alike)', n.found[0].read === '22' && n.found[0].page === '25' && n.fmt(n.found[0].delta) === '3' && n.found[0].kind === 'digit', n.found[0]);
check('nursery: the plant is not on the look-alike list', !M.PAIRS.includes('25') && !M.PAIRS.includes('52'));
const fixed = M.check(S.nursery.text.replace('| 22 |', '| 25 |'), { rowTotals: true, colTotals: true });
check('nursery with 25 put back: all 12 checks meet', fixed.misses === 0 && fixed.checks.length === 12, fixed.checks.length);

// 2. The weigh slips (made up), Thai digits, a decimal point lost.
const t = run(S.slips);
check('slips: a list of five lines and a total', t.mode === 'list' && t.rows.length === 6);
check('slips: Thai digits read, ๑,๒๔๘.๕ is 1248.5', M.token('๑,๒๔๘.๕').digits === '12485' && M.token('๑,๒๔๘.๕').dec === 1);
check('slips: one check misses, the lines come to 9922.5 more', t.misses === 1 && t.fmt(t.checks[0].gap) === '9922.5', t.fmt(t.checks[0].gap));
check('slips: the one slip that fits is the decimal point on line 3, ๑๑,๐๒๕ as 1102.5', t.found.length === 1 && t.found[0].kind === 'point' && t.found[0].page === '1102.5' && t.found[0].where.startsWith('line 3'), t.found);

// 3. Poznań 1919/20 (real, printed). Guess (a): no single slip of any kind closes a gap of 21.
const p = run(S.poznan);
check('poznan: twelve row checks, no column checks', p.checks.length === 12 && p.colTot === false);
check('poznan: one misses, 1919/20, the classes come to 21 more (886 against 865)', p.misses === 1 && p.checks.find((c) => c.gap).name.startsWith('1919/20') && p.fmt(p.checks.find((c) => c.gap).gap) === '21' && p.fmt(p.checks.find((c) => c.gap).sum) === '886');
check('poznan: no single slip closes it', p.found.length === 0, p.found);
check('poznan: the dashes are empty cells, not numbers', p.nums.length === p.rows.reduce((s, r) => s + r.cells.filter((c) => !c.empty).length, 0) && p.rows[0].cells[0].empty === true);
check('poznan: the header names the columns', p.header && p.header[0] === 'prep' && p.header[11] === 'Total', p.header);
check('poznan: no line-removal claim without column totals', !p.found.some((f) => f.kind === 'line'));

// 4. A look-alike, two neighbours swapped, a line read twice, a line left out.
const look = M.check('a 12\nb 7\nc 30\ntotal 43');
check('look-alike: 7 for 1 comes first, then the total read 43 for 49', look.found.map((f) => f.kind + ':' + f.read + '>' + f.page).join(' ') === 'look:7>1 digit:43>49', look.found.map((f) => f.kind + ':' + f.read + '>' + f.page));
check('look-alike: the direction is 6 less', look.fmt(look.found[0].delta) === '-6');
const sw = M.check('46\n20\n84');
check('swap: 46 for 64 is the only slip, and the gap (18) is a multiple of 9', sw.found.length === 1 && sw.found[0].kind === 'swap' && sw.found[0].page === '64' && sw.checks[0].gap % 9 === 0, sw.found);
const tw = M.check('10\n25\n25\n40\n75');
check('read twice: lines 2 and 3 each found as a line that does not belong, each the same as the other', tw.found.length === 2 && tw.found.every((f) => f.kind === 'line' && /same as line/.test(f.say)), tw.found);
const gone = M.check('10\n20\n40');
check('left out: the lines come to 10 less, and a missing line of 10 is offered', gone.notes.length === 1 && gone.notes[0].kind === 'missing' && gone.fmt(gone.notes[0].value) === '10');
const row = M.check('A | 1 | 2 | 3\nB | 4 | 5 | 9\nTotal | 9 | 12 | 21');
check('missing row: every row meets, columns short by 4, 5, 9: a row of 4, 5, 9 offered', row.notes.some((x) => x.kind === 'missing-row' && x.cells.map(row.fmt).join(',') === '4,5,9'), row.notes);
const rt = M.check('A | 1 | 2 | 3\nB | 4 | 5 | 8\nTotal | 5 | 7 | 12');
check("grid: a row total alone off points at that total, B's total 8 for 9", rt.found.some((f) => f.where === "B's total" && f.page === '9'), rt.found.map((f) => f.where + ' ' + f.page));

// 5. Slips themselves.
const sl = M.slips(M.token('105'), 1);
check('slips: no leading zero is offered (105 never becomes 05)', !sl.some((s) => s.digits === '05' || s.digits === '0105'));
check('slips: 1050 can become 10.50 by the point, given room for two places', M.slips(M.token('1050'), 2).some((s) => s.kind === 'point' && M.show(s.digits, s.dec) === '10.50'));
check('the ask tells the AI not to add up or correct anything', /Do not add anything up, and do not correct anything/.test(M.ASK));
check('errors: an empty page, and a ragged grid, say so in words', !!M.check('').error && /same count/.test(M.check('a 1 2 3\nb 1 2').error));

// 6. Running balances. The feed shop (made up, Thai digits): one balance planted, 135 read as 125, a ๓ as ๒.
const R = (text, o = {}) => M.check(text, { running: true, ...o });
const f = run(S.feed);
check('feed: a running balance, nine line checks for ten lines (the first has nothing above it)', f.mode === 'running' && f.rows.length === 10 && f.checks.length === 9, f.checks.length);
check('feed: the brought-forward line is a balance alone, its in and out left empty', f.rows[0].cells.length === 3 && f.rows[0].cells[0].empty && f.rows[0].cells[1].empty && f.rows[0].cells[2].text === '๑๒๐');
check('feed: two neighbouring lines miss, 3 and 4, by 10 and by 10 the other way', f.misses === 2 && f.checks.filter((c) => c.gap).map((c) => c.row + ':' + f.fmt(c.gap)).join(' ') === '2:10 3:-10', f.checks.filter((c) => c.gap).map((c) => c.row + ':' + f.fmt(c.gap)));
check('feed: exactly one slip fits, the balance on line 3, ๑๒๕ for 135, a plain digit', f.found.length === 1 && f.found[0].where === 'line 3 (๓ ต.ค.), คงเหลือ' && f.found[0].read === '๑๒๕' && f.found[0].page === '135' && f.found[0].kind === 'digit', f.found);
check('feed: the plant is not on the look-alike list', !M.PAIRS.includes('23') && !M.PAIRS.includes('32'));
check('feed with ๑๓๕ put back: all nine line checks meet', R(S.feed.text.replace('| ๑๒๕', '| ๑๓๕')).misses === 0);

// The cement card (made up): the reading is right, and the writer wrote 46 for 64 and carried it down.
const c = run(S.cement);
check('cement: one line misses, line 6 (11 Oct), the lines come to 18 more than the 46 written', c.misses === 1 && c.checks.find((x) => x.gap).name === 'line 6 (11 Oct)' && c.fmt(c.checks.find((x) => x.gap).gap) === '18' && c.fmt(c.checks.find((x) => x.gap).sum) === '64');
check('cement: no single slip of the reading closes it', c.found.length === 0, c.found);
check("cement: the writer's own sum carried down is offered, 18 off from there on", c.notes.some((n) => n.kind === 'carried' && !n.last && c.fmt(n.gap) === '18'));
check("cement: the writer's pen, 46 written for 64, two neighbouring digits swapped", c.notes.some((n) => n.kind === 'pen' && n.wrote === '46' && n.page === '64' && n.how === 'swap'), c.notes);
check('cement: or a line the reading left out, between 9 and 11 Oct, that took out 18', c.notes.some((n) => n.kind === 'missing-between' && n.after === 'line 5 (9 Oct)' && c.fmt(n.value) === '-18'));
check('cement: the gap, 18, is a multiple of 9, the old sign of a swap', c.checks.find((x) => x.gap).gap / 10 ** c.S % 9 === 0);

// Quill's edges: the opening balance has no pair, so a slip there looks like a slip in the first amount.
const ob = R('b/f | 30\nx | 10 | – | 60\ny | – | 5 | 55');
check('edge: a misread opening balance is offered next to the first amount, the page alone cannot choose', ob.found.some((s) => s.where === 'line 1 (b/f), balance' && s.page === '50') && ob.found.some((s) => s.where === 'line 2 (x), in' && s.page === '30'), ob.found.map((s) => s.where + ' ' + s.page));
const last = R('b/f | 50\nx | 10 | – | 60\ny | – | 5 | 58');
check('edge: a misread last balance also has no pair: it and the last amount are both offered', last.found.some((s) => s.where === 'line 3 (y), balance') && last.found.some((s) => s.where === 'line 3 (y), out'), last.found.map((s) => s.where));
check('edge: the last line is not offered as a line that does not belong, unless it repeats the one above', !last.found.some((s) => s.kind === 'line'));

const tw2 = R('a | 100\nb | 20 | – | 120\nb | 20 | – | 120\nc | – | 30 | 90');
check('running, read twice: both copies of line b are offered as the same as the other', tw2.found.filter((s) => s.kind === 'line').map((s) => s.r).join(',') === '1,2' && tw2.found.filter((s) => s.kind === 'line').every((s) => /same as line/.test(s.say)), tw2.found);
const wc = R('a | 100\nb | – | 20 | 120\nc | – | 30 | 90');
check('running, the wrong column: 20 read under out, under in on the page (the gap is twice it)', wc.found.some((s) => s.kind === 'column' && s.where === 'line 2 (b)' && s.from === 'out' && s.to === 'in'), wc.found);
const of = R('Date | Out | In | Left\na | 100\nb | – | 20 | 120\nc | 30 | – | 90', { outFirst: true });
check('running, out first: the columns are taken in that order and the header names them', of.misses === 0 && of.checks.length === 2 && of.header.join(',') === 'Out,In,Left');
const two = R('a | 100\nb | 20 | 120');
check('running, two columns: an amount and a balance', two.width === 2 && two.misses === 0 && two.checks.length === 1);
const ot = R('a | 100\nb | 35 | – | 146\nc | – | 20 | 115');
check('running: a balance two lines agree on, 146 for 135, is offered though no one-digit slip gets there', ot.found.length === 1 && ot.found[0].kind === 'other' && ot.found[0].page === '135' && ot.found[0].checks === 2, ot.found);
const og = M.check('A | 10 | 47 | 45\nB | 20 | 30 | 50\nT | 30 | 65 | 95');
check('grid: a cell its row and its column agree on, 47 for 35, is offered the same way', og.found.length === 1 && og.found[0].kind === 'other' && og.found[0].where === 'A, column 2' && og.found[0].page === '35', og.found);
check('running: errors say so in words (one column; four; one line)', /two numbers a line/.test(R('a | 1\nb | 2').error) && /at most three/.test(R('a 1 2 3 4\nb 1 2 3 4').error) && /two lines at least/.test(R('a | 1 | 2').error));
check('the ask tells the AI to copy every balance as written', /Copy every balance exactly as it is written/.test(M.ASK) && /Do not add anything up, and do not correct anything, even a total that looks wrong\.$/.test(M.ASK));

// 6b. A ledger page, and the first real page (third wake, 20 Oct 2026). real.mjs is my key;
// score.mjs puts the five AI readings through this engine and lines them up with the key.
const { KEY } = await import('./real.mjs');
const { score, READERS, reading } = await import('./score.mjs');
const L = (t, o = {}) => M.check(t, { ledger: true, ruled: true, ...o });
check('ruled: "7 35" is 7.35, and only with the tick and a | around it', M.token('7 35', true).digits === '735' && M.token('7 35', true).dec === 2 && M.token('7 35') === null);
const lb = L('a | 110 | 7 35\nb | 128 | 7 35\nTotal | 14 70\nc | 2800\nd | 25\nsubtotal | 2825');
check('ledger: the last number on a line is its amount, the folio before it is not', lb.misses === 0 && lb.checks.length === 2 && lb.rows[0].label === 'a 110');
check('ledger: a line labelled total closes its block, and each block is checked alone', lb.checks.map((c) => c.name).join(',') === 'lines 1–2,lines 4–5');
check('ledger: with no line labelled total it says so in words', /labelled “total”/.test(L('a | 1\nb | 2').error));
const lt = L('a | 7 35\nb | 1830\nc | 7 35\nTotal | 14 70\nd | 19 34\ne | 500\nTotal | 2434');
check('ledger: one slip a block, both found, each alone in its block (a year read in; 19 34 for 1934)',
  lt.misses === 2 && lt.found.length === 2 && lt.found.some((f) => f.kind === 'line' && f.r === 1) && lt.found.some((f) => f.kind === 'point' && f.page === '1934'), lt.found);
check('ledger: lines after the last total are in no check, and are named', L('a | 1\nTotal | 1\nx | 6.21').notes.some((n) => n.kind === 'after'));
const lc = L('a | 7 35\nb | 7725\nc | 21945\nd | 10\nTotal | 314.05');
check('cents: lost in two places and kept in one, the two are found, and nothing else fits', lc.notes.some((n) => n.kind === 'cents' && n.size === 2 && n.ways === 1 && n.where.map((w) => w.page).join(',') === '77.25,219.45'), lc.notes);
check('cents: a reading no move of the cents line closes says so', L('a | 7 35\nb | 7 36\nTotal | 14 70').notes.some((n) => n.kind === 'no-cents'));
for (const [name, b] of Object.entries(KEY)) check(`key: ${name}, ${b.lines.length} lines meet the written ${(b.total / 100).toFixed(2)}`, b.lines.reduce((s, [, c]) => s + c, 0) === b.total);
const sc = Object.fromEntries(READERS.map((w) => [w, score(w)]));
const tally = (w) => [sc[w].digits, sc[w].cents, sc[w].extra, sc[w].missing].join('/');
check('real: digits, cents line, unlabelled numbers that are not amounts, left out: haiku 5/27/0/0, sonnet 0/17/0/0, opus 1/4/0/0, fable 0/1/1/0, sonnet again 1/0/1/1',
  READERS.map(tally).join(' ') === '5/27/0/0 0/17/0/0 1/4/0/0 0/1/1/0 1/0/1/1', READERS.map(tally));
check('real: the page number, the year and the pencil notes, where a reader labelled them so, are named and kept out of the checks',
  sc.haiku.res.notes.find((n) => n.kind === 'aside').lines.length === 3 && sc.opus.res.notes.find((n) => n.kind === 'aside').lines.length === 2);
check('real: no reading wrote a total it worked out; every total is one the page writes', READERS.every((w) => sc[w].res.totalRows.every((ri) => ['5145', '779983'].includes(sc[w].res.nums.find((x) => x.r === ri).k.digits))));
const blocks = READERS.map((w) => sc[w].res.checks.filter((c) => c.gap).length);
check('real: 11 blocks of 20 miss, the 9 the readers slipped in and 2 off only by an unlabelled year or page number; every block read right meets', blocks.join(',') === '3,2,2,2,2' && blocks.reduce((a, b) => a + b) === 11, blocks);
const fab = sc.fable.res;
check('real, fable: its one slip (19 34 for 1934) and its unlabelled year line (1830) each found, the only fit in its block',
  fab.found.length === 2 && fab.found.some((f) => f.kind === 'line' && /^line 1\b/.test(f.where)) && fab.found.some((f) => f.kind === 'point' && f.read === '19 34' && f.page === '1934'), fab.found);
const cr2 = (w) => sc[w].res.notes.find((n) => n.kind === 'cents' && n.size === 3);
check('real, sonnet and opus: the last Cr block, the three cents lines put in where none are (19 34, 30 00, 6 00), and no other set fits',
  ['sonnet', 'opus'].every((w) => cr2(w) && cr2(w).ways === 1 && cr2(w).where.map((x) => x.read).join(',') === '19 34,30 00,6 00'));
const dr2 = sc.sonnet.res.notes.find((n) => n.kind === 'cents' && n.size === 14);
check('real, sonnet: the long Dr block, 14 lost cents lines; 12 sure, and the last two a tie the page must settle (22.50 and 8.50, or 28.00 and 3.00)',
  dr2 && dr2.ways === 2 && dr2.where.length === 12 && dr2.split.map((s) => s.map((x) => x.page).join('+')).sort().join(' | ') === '22.50+8.50 | 28.00+3.00', dr2);
check('real, haiku: in its first block, 705 for 735 is among the six fits (and the first block meets once its page number is set aside)',
  sc.haiku.res.found.length === 6 && sc.haiku.res.found.some((f) => f.read === '705' && f.page === '735'));
check('real, sonnet again: the page number read in as a line is among the three fits in its block', sc.sonnet2.res.found.some((f) => f.kind === 'line' && /^line 1\b/.test(f.where)) && sc.sonnet2.res.found.length === 3);
check('real: the public readings carry no initials', READERS.every((w) => !/[A-Z]\.?[A-Z]/.test(reading(w).replace(/Dr\.|Cr\./g, ''))));
check('real: the two samples on the face are the readings, word for word', S.bankFable.text === reading('fable').trim() && S.bankSonnet.text === reading('sonnet').trim());
check('the ask says how to write money ruled into two columns', /write a space where the rule is, like 7 35/.test(M.ASK));
check('the ask says to label a number that is not an amount, and a line so labelled is set aside', /not an amount \(a page number, a year, a note in the margin\)/.test(M.ASK)
  && L('Year | 1830\na | 5\nTotal | 5').misses === 0 && L('Balance to page 438 | 5\nTotal | 5').misses === 0 && L('Balance to page 438 | 5\nTotal | 5').checks.length === 1);

// 7. The face, against a stand-in page: its first picture, and its sample buttons.
const els = {};
const el = (id) => (els[id] ||= { id, value: '', textContent: '', innerHTML: '', checked: true, on: {}, addEventListener(k, f) { this.on[k] = f; }, getAttribute(a) { return this.attrs?.[a]; } });
const buttons = ['nursery', 'slips', 'poznan', 'feed', 'cement', 'bankFable', 'bankSonnet'].map((s) => Object.assign(el('b-' + s), { attrs: { 'data-sample': s } }));
const fctx = vm.createContext({ Misread: M, navigator: {}, document: { getElementById: el, querySelectorAll: () => buttons } });
vm.runInContext(script('face'), fctx);
check('face: opens on the nursery, marks C, Orchids, and says one slip fits', /One slip fits/.test(els.out.innerHTML) && /C, Orchids/.test(els.out.innerHTML) && /class="sus">22</.test(els.out.innerHTML));
check('face: the direction is printed, 3 more', /the page's number is 3 more than the reading/.test(els.out.innerHTML));
check('face: the misses are said plainly, row C adds up to 127 against 130', /Row C adds up to <b>127<\/b>; the total written on the page is <b>130<\/b> \(3 less\)/.test(els.out.innerHTML));
check('face: the ask is on the page', els.ask.textContent === M.ASK);
buttons[2].on.click();
check('face: Poznań button unticks column totals and says no single slip closes it', els.coltot.checked === false && /No single slip closes it/.test(els.out.innerHTML) && /886/.test(els.out.innerHTML) && /printing or the adding/.test(els.caption.textContent));
buttons[1].on.click();
check('face: the weigh-slips button finds 1102.5 and marks ๑๑,๐๒๕', /1102\.5/.test(els.out.innerHTML) && /class="sus">๑๑,๐๒๕</.test(els.out.innerHTML));
check('face: it opens on totals, not on a running balance', els['shape-running'].checked === false && els['shape-totals'].checked === true);
buttons[3].on.click();
check('face: the feed button turns on the running balance and marks ๑๒๕ on line 3', els['shape-running'].checked === true && /One slip fits/.test(els.out.innerHTML) && /class="sus">๑๒๕</.test(els.out.innerHTML) && /line 3 \(๓ ต\.ค\.\): the balance above, with this line's in and out, comes to <b>135<\/b>/i.test(els.out.innerHTML), els.out.innerHTML.slice(0, 400));
check('face: on a Thai page the answer is in Thai digits too, ๑๓๕ (135)', /if the page says <b>๑๓๕ \(135\)<\/b>/.test(els.out.innerHTML));
buttons[4].on.click();
check("face: the cement button says no slip closes it, and names the writer's pen, 64 and 46", /No single slip closes it/.test(els.out.innerHTML) && /it was the writer's pen and not the reading/.test(els.out.innerHTML) && /comes to <b>64<\/b>, and <b>46<\/b> is written: two neighbouring digits swapped/.test(els.out.innerHTML) && /18 less than its lines add up to/.test(els.out.innerHTML), els.out.innerHTML);
els.page.value = 'b/f | 30\nx | 10 | – | 60\ny | – | 5 | 55'; els['shape-running'].checked = true; els['shape-totals'].checked = false; els.outfirst.checked = false;
els.check.on.click();
check("face: one line misses and a slip fits, so it says a writer's sum carried down would look exactly the same", /Or the reading is right and the writer's own sum was off on line 2 \(x\)/.test(els.out.innerHTML) && /looks exactly the same as the slips above/.test(els.out.innerHTML), els.out.innerHTML);
check('face: the limits paragraph names the wrong column and the pair as a writer\'s too', /a number read into the wrong column/.test(html) && /A pair can also be the writer's/.test(html));
buttons[5].on.click();
check('face: the 1831 button ticks the ledger and the cents rule, and marks 19 34 and the 1830 line', els['shape-ledger'].checked === true && els.ruled.checked === true &&
  /class="sus">19 34</.test(els.out.innerHTML) && /class="sus">1830</.test(els.out.innerHTML) && /the line between dollars and cents in the wrong place/.test(els.out.innerHTML) && /public domain/.test(els.caption.textContent), els.out.innerHTML.slice(0, 600));
check('face: on a ledger it says each block gets its own slip, and not that the page cannot choose', /each block that misses gets its own slip/.test(els.out.innerHTML) && !/The page alone can't choose/.test(els.out.innerHTML));
buttons[6].on.click();
check('face: the second 1831 button says the three moves, and the tie it cannot settle', /no other set of 3 or fewer does/.test(els.out.innerHTML) && /2 different sets of 14 do/.test(els.out.innerHTML) && /look at these on the paper/.test(els.out.innerHTML), els.out.innerHTML.slice(0, 900));
buttons[0].on.click();
check('face: back to the nursery, the ledger is off again', els['shape-ledger'].checked === false && els.ruled.checked === false && /C, Orchids/.test(els.out.innerHTML));
check('face: back to the nursery, the running balance is off again and the page is checked by totals', els['shape-running'].checked === false && /C, Orchids/.test(els.out.innerHTML));
els.page.value = '<b>x</b> | 1 | 2 | 4\nTotal | 1 | 2 | 4'; els.rowtot.checked = true; els.coltot.checked = true;
els.check.on.click();
check('face: a pasted label is escaped, never run as markup', /&lt;b&gt;x&lt;\/b&gt;/.test(els.out.innerHTML) && !/<b>x<\/b>/.test(els.out.innerHTML));

check('the shipped face has no peek left in it', !/PEEK/.test(html));

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
