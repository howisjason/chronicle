// gen.mjs: writes demo.html from rows.mjs and ledger.mjs, so the face can't drift
// from the checks the test runs. Run: bash room/tools/try.sh magdalena gen.mjs
import { writeFileSync } from 'node:fs';
import { TABLE, TABLE_COLUMNS, TABLE_SOURCE, REPORTS, link } from './rows.mjs';
import { checks, roadOf } from './ledger.mjs';

const C = checks();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (v) => (typeof v === 'number' && !Number.isInteger(v) ? String(v).replace('.', ',') : String(v));
const where = (w) => {
  if (!w || !w.report) return '';
  const label = `${w.report}${w.page ? `, p. ${w.page}` : ''}`;
  return `<a href="${esc(link(w.report, w.leaf))}">${esc(label)}</a>`;
};
const misses = C.filter((c) => !c.meets);
const printed = C.filter((c) => roadOf(c) === 'print').length;

function li(c) {
  const road = roadOf(c);
  let extra = '';
  if (!c.meets) {
    const bits = [];
    if (c.note) bits.push(esc(c.note));
    if (c.swaps) bits.push(c.swaps.length ? `swapping two neighbouring digits would close it: ${esc(c.swaps.map((s) => s.split(': ')[1]).join(', '))}` : 'no swap of two neighbouring digits closes it');
    if (c.readings) {
      const r = c.readings;
      if (r.passed.length) bits.push(`${r.passed.join(' or ')} passed would give the printed figure`);
      if (r.examined.length) bits.push(`so would ${r.examined.join(' or ')} examined`);
      else bits.push('no number examined would, with the pass count as printed');
    }
    extra = `<div class="why">${bits.join('; ')}.</div>`;
  }
  const ws = [...new Set([where(c.a.where), where(c.b.where)].filter(Boolean))].join(' · ');
  return `<li class="ck ${c.meets ? 'meet' : 'miss'}" data-road="${road}">
  <span class="mark">${c.meets ? '=' : '≠'}</span>
  <div><div class="say">${esc(c.say)}</div>
  <div class="roads"><span class="side"><b>${esc(num(c.a.value))}</b> <span class="lab">${esc(c.a.label)}</span></span>
  <span class="vs">${c.meets ? 'meets' : 'misses'}</span>
  <span class="side"><b>${esc(num(c.b.value))}</b> <span class="lab">${esc(c.b.label)}</span></span></div>
  ${extra}<div class="lab">${ws} <span class="road ${road}" title="${road === 'print' ? 'both sides read on the page image' : 'at least one side came through the OCR text, not seen on the page'}">${road}</span></div></div></li>`;
}

const GROUPS = [
  ['table', 'The ten-year table', 'The 1928/29 report marked ten years of the school as a Polish state gymnasium with a table of its pupils, class by class, from 1919/20, and two Prussian years before it for comparison. Each row has a printed total.'],
  ['count', 'Who was counted', 'Each report gives the pupils at the start of the year, and its school doctor gives how many he examined, split three ways. The table’s total turns out to count everyone who passed through the year: those at the start, and those who came later.'],
  ['exam', 'Exams', 'The entrance exam to class I, with the percentage each report prints beside its count, and the 1929/30 matura.'],
];

const cols = TABLE_COLUMNS.map((c) => `<th>${c === 'prep' ? 'prep.' : c === 'course' ? 'course' : c}</th>`).join('');
const table = `<table class="ten"><thead><tr><th>year</th>${cols}<th>printed total</th><th>added</th></tr></thead><tbody>
${TABLE.map(([y, cells, total]) => { const s = cells.reduce((a, x) => a + (x ?? 0), 0); return `<tr class="${s === total ? '' : 'off'}"><td>${y}</td>${cells.map((x) => `<td>${x ?? '–'}</td>`).join('')}<td>${total}</td><td>${s}</td></tr>`; }).join('\n')}
</tbody></table>`;

let body = '';
for (const [g, h, p] of GROUPS) {
  body += `<h2>${esc(h)}</h2>\n<p class="intro">${esc(p)}</p>\n${g === 'table' ? table : ''}<ol class="cks">${C.filter((c) => c.group === g).map(li).join('\n')}</ol>\n`;
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Does a school's yearbook add up? St Mary Magdalene Gymnasium, Poznań, 1926–1931</title>
<style>
  :root { --bg:#faf8f4; --fg:#22201c; --dim:#6b665d; --line:#ddd6ca; --card:#fff; --hi:#6b3a8a; --ok:#2f6b3a; --no:#9a3324; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#1b1a18; --fg:#ece7de; --dim:#a39c90; --line:#3a3731; --card:#24221f; --hi:#c9a3e6; --ok:#8fc79a; --no:#ec8f7f; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.5 Georgia, 'Iowan Old Style', serif; }
  main { max-width: 800px; margin: 0 auto; padding: 28px 18px 60px; }
  h1 { font-size: 1.5rem; margin: 0 0 4px; }
  h2 { font: 600 .8rem/1 system-ui, sans-serif; letter-spacing:.06em; text-transform:uppercase; color:var(--dim); margin: 28px 0 6px; }
  .sub, .intro { color: var(--dim); margin: 0 0 12px; }
  .intro { font-size: .93rem; }
  a { color: var(--hi); }
  .tally { font: .9rem system-ui, sans-serif; margin: 10px 0 4px; }
  .tally b.m { color: var(--no); }
  button { font: 600 .78rem system-ui, sans-serif; border: 1px solid var(--line); background: var(--card); color: var(--fg); border-radius: 99px; padding: 6px 10px; cursor: pointer; margin: 6px 6px 0 0; }
  button[aria-pressed="true"] { border-color: var(--hi); box-shadow: 0 0 0 1px var(--hi); }
  ol.cks { list-style: none; padding: 0; margin: 0; }
  li.ck { display: grid; grid-template-columns: 1.6em 1fr; gap: 8px; padding: 10px 0; border-top: 1px solid var(--line); }
  .mark { font: 700 1.2rem/1.3 system-ui, sans-serif; color: var(--ok); }
  .miss .mark { color: var(--no); }
  .say { font-size: .95rem; }
  .roads { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; margin: 3px 0; }
  .roads b { font: 600 1.05rem system-ui, sans-serif; }
  .vs { font: .75rem system-ui, sans-serif; color: var(--ok); }
  .miss .vs { color: var(--no); font-weight: 700; }
  .why { font-size: .9rem; font-style: italic; margin: 2px 0 3px; }
  .lab { color: var(--dim); font: .8rem system-ui, sans-serif; }
  .road { border: 1px solid var(--line); border-radius: 99px; padding: 1px 6px; margin-left: 4px; }
  .road.print { color: var(--ok); }
  table.ten { border-collapse: collapse; font: .78rem system-ui, sans-serif; width: 100%; margin: 4px 0 10px; }
  table.ten th, table.ten td { border-bottom: 1px solid var(--line); padding: 3px 4px; text-align: right; }
  table.ten th:first-child, table.ten td:first-child { text-align: left; }
  table.ten th { color: var(--dim); font-weight: 600; }
  table.ten tr.off td { color: var(--no); font-weight: 700; }
  .hide { display: none; }
  footer { margin-top: 30px; border-top: 1px solid var(--line); padding-top: 14px; color: var(--dim); font-size: .88rem; }
  footer p { margin: 6px 0; }
</style>
</head>
<body>
<main>
  <h1>Does a school’s yearbook add up?</h1>
  <p class="sub">The state gymnasium of St Mary Magdalene in Poznań printed a report every year. Five in a row, 1926/27 to 1930/31, are scanned and public.
  Wherever they say one number two ways (a row and its total, a count and its percentage, this year and last), the two are set side by side here.</p>
  <div class="tally"><b>${C.length}</b> checks: <b>${C.length - misses.length}</b> meet, <b class="m">${misses.length}</b> miss.
  ${printed} were read on the printed page on both sides; ${C.length - printed} came through the scan’s OCR text on at least one.</div>
  <div><button id="only" aria-pressed="false">only the misses</button><button id="pr" aria-pressed="false">only what was read on the page</button></div>
${body}
  <footer>
    <p><b>Open.</b> 1919/20’s classes add to 886, and the table prints 865; no swap of two neighbouring digits explains it.
    In 1926/27, 74 passed of 103 is 71.8%, and the report prints 82,5%, which 85 of 103 would give.
    In 1928/29, 49 of 97 is 50.5%, and it prints 62%, which 49 of 79 gives (a swap), and so would 60 of 97. Which number is wrong isn’t said here; the reports don’t say.
    In 1927/28 the doctor counted 510, the start-of-year number, while 514 passed through the school that year.
    In 1928/29 and 1929/30 he counted 3 more than the start (445 and 425); for 1928/29 the table’s total is 445 too, and for 1929/30 there is no table, and nothing I read says who the three were.</p>
    <p><b>Roads.</b> “print” means both sides were read on the page image of the scan; “ocr” means at least one came through archive.org’s OCR text by way of a page reader and was not seen on the page.
    Every page link opens the scan at that page.</p>
    <p><b>Sources.</b> Sprawozdanie Dyrekcji Państwowego Gimnazjum Św. Marji Magdaleny w Poznaniu, ${Object.keys(REPORTS).map((y) => `<a href="${esc(link(y))}">${y}</a>`).join(', ')}, from the Jagiellonian Library (public domain), on archive.org.
    The ten-year table is on page ${TABLE_SOURCE.page} of the 1928/29 report.</p>
    <p>The reports name their pupils, teachers and doctor; no one is named here. Their fee accounts and the notes on pupils’ health and deaths are left out on purpose.</p>
  </footer>
</main>
<script>
const only = document.getElementById('only'), pr = document.getElementById('pr');
function apply() {
  const m = only.getAttribute('aria-pressed') === 'true', p = pr.getAttribute('aria-pressed') === 'true';
  document.querySelectorAll('li.ck').forEach(li => li.classList.toggle('hide', (m && li.classList.contains('meet')) || (p && li.dataset.road !== 'print')));
}
[only, pr].forEach(b => b.onclick = () => { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); apply(); });
</script>
</body>
</html>
`;
writeFileSync(new URL('demo.html', import.meta.url), html);
console.log(`demo.html: ${C.length} checks, ${misses.length} miss, ${printed} print`);
