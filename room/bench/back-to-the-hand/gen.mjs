// gen.mjs: writes demo.html from data.mjs and duchas.mjs, so the face can't drift
// from the rows the test checks. Run: bash room/tools/try.sh back-to-the-hand gen.mjs
import { writeFileSync } from 'node:fs';
import { SECTIONS } from './data.mjs';
import { rows, BINS } from './lib.mjs';

const R = rows();
const count = (b) => R.filter((r) => r.bin === b).length;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const yrs = R.map((r) => r.year).filter(Boolean);
const YEARS = `${Math.min(...yrs)} to ${Math.max(...yrs)}`;
const sectionOf =(n) => SECTIONS.filter(([first]) => first <= n).at(-1)[1];

const SAY = {
  lands: 'the manuscript starts on the page the book gives',
  near: 'the book’s page is inside a manuscript item that starts a little earlier',
  disagrees: 'the volume is online, but no item there starts on or covers the book’s page',
  'not online': 'the book’s volume isn’t on dúchas.ie yet',
  'no reference': 'the book doesn’t name a manuscript for this one',
};

function tale(r) {
  const where = [r.county && 'Co. ' + r.county, r.year ?? (r.n === 6 ? 'no year given' : '')].filter(Boolean).join(', ');
  const ref = r.vol == null ? esc(r.pages) : `vol. ${r.vol}, ${/\D/.test(r.pages) ? 'pp.' : 'p.'} ${esc(r.pages)}`;
  let hand = '';
  if (r.d && r.d.href) {
    hand = `<a href="${esc(r.d.href)}">${esc(r.d.title)}</a> <span class="lab">${esc(r.d.label)}${r.d.date ? ' · ' + esc(r.d.date) : ''}</span>`;
  } else if (r.bin === 'not online') {
    hand = `<span class="miss">not on dúchas yet</span>`;
  } else if (r.bin === 'no reference') {
    hand = `<span class="miss">no manuscript named</span>`;
  }
  return `<li class="t ${r.bin.replace(' ', '-')}" data-bin="${r.bin}">
  <span class="n">${r.n}</span>
  <div><b>${esc(r.title)}</b> <span class="lab">${esc(where)} · ${ref}</span><br>${hand}</div>
  <span class="bin" title="${esc(SAY[r.bin])}">${r.bin}</span></li>`;
}

let body = '';
for (const [first, name] of SECTIONS) {
  const inS = R.filter((r) => sectionOf(r.n) === name);
  body += `<h2>${esc(name)}</h2>\n<ol class="tales">${inS.map(tale).join('\n')}</ol>\n`;
}

const tally = BINS.map((b) => `<button class="pill ${b.replace(' ', '-')}" data-bin="${b}" title="${esc(SAY[b])}">${count(b)} ${b}</button>`).join(' ');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Where was it written down? Folktales of Ireland, back to the manuscript</title>
<style>
  :root { --bg:#faf8f4; --fg:#22201c; --dim:#6b665d; --line:#ddd6ca; --card:#fff; --hi:#6b3a8a; --ok:#2f6b3a; --mid:#8a6a1c; --no:#9a3324; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#1b1a18; --fg:#ece7de; --dim:#a39c90; --line:#3a3731; --card:#24221f; --hi:#c9a3e6; --ok:#8fc79a; --mid:#e0c06d; --no:#ec8f7f; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.5 Georgia, 'Iowan Old Style', serif; }
  main { max-width: 780px; margin: 0 auto; padding: 28px 18px 60px; }
  h1 { font-size: 1.5rem; margin: 0 0 4px; }
  h2 { font: 600 .8rem/1 system-ui, sans-serif; letter-spacing:.06em; text-transform:uppercase; color:var(--dim); margin: 26px 0 8px; }
  .sub { color: var(--dim); margin: 0 0 16px; }
  a { color: var(--hi); }
  ol.tales { list-style:none; padding:0; margin:0; }
  li.t { display:grid; grid-template-columns: 2.2em 1fr auto; gap: 8px; padding: 9px 0; border-top: 1px solid var(--line); align-items: start; }
  .n { color: var(--dim); font: .85rem system-ui, sans-serif; padding-top: 3px; }
  .lab { color: var(--dim); font: .82rem system-ui, sans-serif; }
  .miss { color: var(--dim); font-style: italic; font-size: .92rem; }
  .bin, .pill { font: 600 .72rem/1 system-ui, sans-serif; border-radius: 99px; padding: 5px 8px; border: 1px solid var(--line); white-space: nowrap; }
  .pill { cursor: pointer; background: var(--card); color: var(--fg); margin: 0 4px 6px 0; padding: 7px 10px; font-size: .8rem; }
  .pill[aria-pressed="true"] { border-color: var(--hi); box-shadow: 0 0 0 1px var(--hi); }
  .lands .bin, .pill.lands { color: var(--ok); }
  .near .bin, .pill.near { color: var(--mid); }
  .disagrees .bin, .pill.disagrees { color: var(--no); }
  .not-online .bin, .no-reference .bin { color: var(--dim); }
  .hide { display: none; }
  footer { margin-top: 30px; border-top: 1px solid var(--line); padding-top: 14px; color: var(--dim); font-size: .88rem; }
  footer p { margin: 6px 0; }
</style>
</head>
<body>
<main>
  <h1>Where was it written down?</h1>
  <p class="sub">The 55 tales of Seán Ó Súilleabháin’s <i>Folktales of Ireland</i> (1966), each looked for in the manuscript it was taken from.
  The book’s notes date them ${YEARS}. ${R.filter((r) => r.vol != null).length} name a volume of the Irish Folklore Commission’s manuscripts, and some of those volumes are now scanned on
  <a href="https://www.duchas.ie/en/cbe/">dúchas.ie</a>. Where a link is given, it opens the first page of the tale in the collector’s hand.</p>
  <div id="tally">${tally}</div>
${body}
  <footer>
    <p>The book’s side is each tale’s note at the back of the book, giving a volume and pages in the Commission’s Main Manuscript Collection (now CBÉ, at University College Dublin),
    read from the <a href="https://archive.org/details/folktales-of-ireland">archive.org scan</a>. The manuscript side is dúchas.ie’s own catalogue: the item’s title, page label and date as dúchas gives them.
    A tale “lands” when an item there starts on the page the book gives.</p>
    <p>No tale’s text is copied here, only titles and references. The scans and their catalogue belong to the National Folklore Collection, UCD; this page only links to them.</p>
  </footer>
</main>
<script>
const pills = [...document.querySelectorAll('.pill')];
let on = null;
pills.forEach(p => p.onclick = () => {
  on = on === p.dataset.bin ? null : p.dataset.bin;
  pills.forEach(q => q.setAttribute('aria-pressed', String(q.dataset.bin === on)));
  document.querySelectorAll('li.t').forEach(li => li.classList.toggle('hide', on !== null && li.dataset.bin !== on));
  document.querySelectorAll('h2').forEach(h => { const ol = h.nextElementSibling; h.classList.toggle('hide', ![...ol.children].some(li => !li.classList.contains('hide'))); });
});
</script>
</body>
</html>
`;
writeFileSync(new URL('demo.html', import.meta.url), html);
console.log(`demo.html: ${R.length} tales; ` + BINS.map((b) => `${count(b)} ${b}`).join(', '));
