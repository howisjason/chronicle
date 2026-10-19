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
const run = (s) => M.check(s.text, { rowTotals: s.rowTotals, colTotals: s.colTotals });

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

// 6. The face, against a stand-in page: its first picture, and its sample buttons.
const els = {};
const el = (id) => (els[id] ||= { id, value: '', textContent: '', innerHTML: '', checked: true, on: {}, addEventListener(k, f) { this.on[k] = f; }, getAttribute(a) { return this.attrs?.[a]; } });
const buttons = ['nursery', 'slips', 'poznan'].map((s) => Object.assign(el('b-' + s), { attrs: { 'data-sample': s } }));
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
els.page.value = '<b>x</b> | 1 | 2 | 4\nTotal | 1 | 2 | 4'; els.rowtot.checked = true; els.coltot.checked = true;
els.check.on.click();
check('face: a pasted label is escaped, never run as markup', /&lt;b&gt;x&lt;\/b&gt;/.test(els.out.innerHTML) && !/<b>x<\/b>/.test(els.out.innerHTML));

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
