// gen.mjs: writes demo.html, the key as a page you walk, with read A and the
// genus list inside it. Run: bash room/tools/try.sh brazil-aphodiine-key gen.mjs
import { writeFileSync } from 'node:fs';
import { readKey, readGenera } from './lib.mjs';

const json = x => JSON.stringify(x).replace(/</g, '\\u003c');
const key = json(readKey('read-a.txt'));
const genera = json(readGenera());

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Which small dung beetle is it? The key to Brazil's Aphodiinae genera</title>
<style>
  :root { --bg:#faf8f4; --fg:#22201c; --dim:#6b665d; --line:#ddd6ca; --card:#fff; --hi:#8a4b1c; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#1b1a18; --fg:#ece7de; --dim:#a39c90; --line:#3a3731; --card:#24221f; --hi:#e0a36d; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.5 Georgia, 'Iowan Old Style', serif; }
  main { max-width: 760px; margin: 0 auto; padding: 28px 18px 60px; }
  h1 { font-size: 1.5rem; margin: 0 0 4px; }
  .sub { color: var(--dim); margin: 0 0 20px; }
  .label { font: 600 .8rem/1 system-ui, sans-serif; letter-spacing:.06em; text-transform:uppercase; color:var(--dim); margin: 0 0 10px; }
  .half { display:block; width:100%; text-align:left; background:var(--card); color:var(--fg); border:1px solid var(--line);
          border-radius:10px; padding:14px 16px; margin:0 0 10px; font:inherit; cursor:pointer; }
  .half:hover, .half:focus-visible { border-color: var(--hi); outline: none; }
  .to { display:block; margin-top:6px; font: .85rem system-ui, sans-serif; color: var(--dim); }
  .end { background:var(--card); border:1px solid var(--hi); border-radius:10px; padding:16px; margin:0 0 10px; }
  .end h2 { margin:0 0 4px; font-size:1.4rem; font-style: italic; }
  .end p { margin: 6px 0; }
  a { color: var(--hi); }
  .row { display:flex; gap:8px; flex-wrap:wrap; margin: 6px 0 18px; }
  button.small, select { font: .9rem system-ui, sans-serif; padding:6px 10px; border-radius:8px; border:1px solid var(--line);
          background:var(--card); color:var(--fg); cursor:pointer; }
  button.small:disabled { opacity: .4; cursor: default; }
  ol.trail { padding-left: 0; list-style: none; margin: 0 0 18px; font-size: .92rem; }
  ol.trail li { padding: 6px 0; border-top: 1px solid var(--line); color: var(--dim); }
  ol.trail li b { color: var(--fg); font: 600 .85rem system-ui, sans-serif; margin-right: 6px; }
  ol.trail li button { background:none; border:none; color:var(--hi); cursor:pointer; font: .85rem system-ui, sans-serif; padding:0 0 0 6px; }
  footer { margin-top: 30px; border-top: 1px solid var(--line); padding-top: 14px; color: var(--dim); font-size: .88rem; }
  footer p { margin: 6px 0; }
</style>
</head>
<body>
<main>
  <h1>Which small dung beetle is it?</h1>
  <p class="sub">The key to the 43 genera of Aphodiinae found in Brazil, from Gama, Skelley &amp; Vaz-de-Mello (2026).
  Read both halves and choose the one that fits your beetle.</p>

  <div id="now"></div>
  <div class="row">
    <button class="small" id="back">Back one step</button>
    <button class="small" id="restart">Start again</button>
    <select id="pick" aria-label="Show the couplets that lead to a genus"><option value="">Or: the way to a genus…</option></select>
  </div>
  <p class="label" id="trailLabel"></p>
  <ol class="trail" id="trail"></ol>

  <footer>
    <p>The key: E.R.R. Gama, P.E. Skelley &amp; F.Z. Vaz-de-Mello, 2026. Identification guide to the Aphodiinae (Coleoptera: Scarabaeidae) of Brazil.
    <i>European Journal of Taxonomy</i> 1038: 1–225, pp. 15–19.
    <a href="https://doi.org/10.5852/ejt.2026.1038.3175">doi:10.5852/ejt.2026.1038.3175</a>, CC BY 4.0.
    A Portuguese version is the paper's Supplementary file 1.</p>
    <p>The wording is the paper's, read twice from Plazi's copy of it (once from its XML, once from its Zenodo record) and compared half by half.
    Left out: the couplet numbers, the dash before each second half, and the leader dots. "Fig." numbers are the paper's plates: the pictures are in the paper, not here.</p>
    <p>One thing is open. The paper's abstract says Brazil has 40 genera; its key ends in 43. I have not read the part of the paper that would say why.</p>
    <p>This started from one picture: <i>Paraplesiataenius genieri</i>, a reddish-brown beetle about 5 mm long, taken out of leaf-cutter ant nests.
    <button class="small" id="desk">Walk to its genus</button></p>
  </footer>
</main>
<script id="key" type="application/json">${key}</script>
<script id="genera" type="application/json">${genera}</script>
<script>
const KEY = JSON.parse(document.getElementById('key').textContent);
const GENERA = JSON.parse(document.getElementById('genera').textContent);
const half = {}; KEY.forEach(h => half[h.label] = h);
const isCouplet = to => /^\\d+$/.test(to);
const genusName = to => to.split(' ')[0];
const plazi = {}; GENERA.forEach(g => plazi[g.name] = 'https://treatment.plazi.org/id/' + g.id);

let trail = [];   // labels chosen, e.g. ['1b', '5b']
const $ = id => document.getElementById(id);
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };

function where() {
  if (!trail.length) return { couplet: '1' };
  const last = half[trail[trail.length - 1]];
  return isCouplet(last.to) ? { couplet: last.to } : { end: last.to };
}

function render() {
  const now = $('now'); now.replaceChildren();
  const w = where();
  if (w.couplet) {
    now.append(el('p', 'Couplet ' + w.couplet + ' of 46', 'label'));
    for (const side of ['a', 'b']) {
      const h = half[w.couplet + side];
      const b = el('button', h.text, 'half');
      b.append(el('span', isCouplet(h.to) ? '→ couplet ' + h.to : '→ ' + h.to, 'to'));
      b.onclick = () => { trail.push(h.label); render(); };
      now.append(b);
    }
  } else {
    const box = el('div', null, 'end');
    const g = genusName(w.end);
    box.append(el('p', 'Your beetle is in the genus', 'label'), el('h2', g));
    box.append(el('p', w.end.slice(g.length).trim()));
    if (w.end.includes('(in part)')) box.append(el('p', '"In part": only some of its species key out here. The genus ends the key in one other place too; the menu below shows both ways.'));
    const p = el('p'); const a = el('a', 'Its treatment in the paper, on Plazi →'); a.href = plazi[g]; p.append(a); box.append(p);
    now.append(box);
  }
  $('back').disabled = !trail.length;
  $('trailLabel').textContent = trail.length ? 'The way so far (' + trail.length + ' choices)' : '';
  const ol = $('trail'); ol.replaceChildren();
  trail.forEach((lab, i) => {
    const li = el('li'); li.append(el('b', lab), document.createTextNode(half[lab].text));
    const go = el('button', 'go back here'); go.onclick = () => { trail = trail.slice(0, i); render(); };
    li.append(go); ol.append(li);
  });
}

// every walk from couplet 1 to an ending
function walks(n = '1', path = []) {
  let out = [];
  for (const side of ['a', 'b']) {
    const h = half[n + side], p = [...path, h.label];
    out = out.concat(isCouplet(h.to) ? walks(h.to, p) : [{ path: p, to: h.to }]);
  }
  return out;
}
const WALKS = walks();
const sel = $('pick');
[...new Set(WALKS.map(w => genusName(w.to)))].sort().forEach(g => {
  WALKS.filter(w => genusName(w.to) === g).forEach((w, i, all) => {
    const o = el('option', g + (all.length > 1 ? ' (way ' + (i + 1) + ' of 2)' : ''));
    o.value = w.path.join(','); sel.append(o);
  });
});
sel.onchange = () => { if (sel.value) { trail = sel.value.split(','); render(); } sel.value = ''; };
$('back').onclick = () => { trail.pop(); render(); };
$('restart').onclick = () => { trail = []; render(); };
$('desk').onclick = () => { trail = [...WALKS.find(w => genusName(w.to) === 'Paraplesiataenius').path]; render(); window.scrollTo(0, 0); };
render();${process.argv[2] === 'peek' ? "\n$('desk').click();" : ''}
</script>
</body>
</html>
`;
writeFileSync(new URL('demo.html', import.meta.url), page);
console.log('demo.html written,', page.length, 'characters');
