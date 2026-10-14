// gen.mjs: writes demo.html from sources.mjs and count.mjs, so the face can't drift
// from what the test checks. Run: bash room/tools/try.sh fourteen-or-fifteen gen.mjs
import { writeFileSync } from 'node:fs';
import { TEMPLES } from './sources.mjs';
import { rows, S14 } from './count.mjs';

const R = rows();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const COLS = [...S14, 'kosho', 'manpuku'];
const cls = { 'the fourteen': 'f14', 'the fourteen + Kōshō-ji': 'fk', 'the fourteen + Manpuku-ji (Ōbaku)': 'fm' };

const head = COLS.map((id) => `<th class="t${id === 'kosho' ? ' k' : id === 'manpuku' ? ' m' : ''}" title="${esc(TEMPLES[id].note || '')}"><span>${esc(TEMPLES[id].en)}</span></th>`).join('');
const body = R.map((r) => {
  const cells = COLS.map((id) => {
    const on = r.counted && r.counted.includes(id), apart = r.apart.includes(id);
    return `<td class="${id === 'kosho' ? 'k' : id === 'manpuku' ? 'm' : ''}">${on ? '●' : apart ? '<span title="named, but not counted">○</span>' : ''}</td>`;
  }).join('');
  return `<tr class="src ${cls[r.set] || ''}"><th class="who"><a href="${esc(r.src.url)}">${esc(r.src.who)}</a><div class="q">${esc(r.src.quote)}</div></th>
  <td class="says">${r.src.says ?? '–'}</td>${cells}<td class="set">${esc(r.set)}</td></tr>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>How many branches does Rinzai Zen have? Fourteen or fifteen, source by source</title>
<style>
  :root { --bg:#faf8f4; --fg:#22201c; --dim:#6b665d; --line:#ddd6ca; --card:#fff; --hi:#6b3a8a; --k:#2f6b3a; --m:#9a5a14; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#1b1a18; --fg:#ece7de; --dim:#a39c90; --line:#3a3731; --card:#24221f; --hi:#c9a3e6; --k:#8fc79a; --m:#e3b277; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.5 Georgia, 'Iowan Old Style', serif; }
  main { max-width: 980px; margin: 0 auto; padding: 28px 18px 60px; }
  h1 { font-size: 1.5rem; margin: 0 0 6px; }
  .sub { color: var(--dim); margin: 0 0 12px; }
  .two { display: flex; flex-wrap: wrap; gap: 10px; margin: 14px 0 18px; }
  .two div { flex: 1 1 280px; background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; font-size: .95rem; }
  .two b.k { color: var(--k); } .two b.m { color: var(--m); }
  a { color: var(--hi); }
  .wrap { overflow-x: auto; }
  table { border-collapse: collapse; font: .8rem system-ui, sans-serif; }
  th, td { border-bottom: 1px solid var(--line); padding: 4px 3px; text-align: center; vertical-align: middle; }
  th.t { height: 108px; vertical-align: bottom; padding: 0 2px 4px; }
  th.t span { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; font-weight: 600; color: var(--dim); }
  th.t.k span { color: var(--k); } th.t.m span { color: var(--m); }
  td.k { color: var(--k); background: color-mix(in srgb, var(--k) 8%, transparent); }
  td.m { color: var(--m); background: color-mix(in srgb, var(--m) 8%, transparent); }
  th.who { text-align: left; font-weight: 600; min-width: 220px; max-width: 300px; }
  .q { font-weight: 400; color: var(--dim); font-size: .72rem; line-height: 1.35; margin-top: 2px; }
  td.says { font-weight: 700; font-size: 1rem; }
  td.set { text-align: left; color: var(--dim); min-width: 130px; }
  tr.fk td.set { color: var(--k); } tr.fm td.set { color: var(--m); }
  footer { margin-top: 26px; border-top: 1px solid var(--line); padding-top: 12px; color: var(--dim); font-size: .88rem; }
  footer p { margin: 6px 0; }
</style>
</head>
<body>
<main>
  <h1>Fourteen or fifteen?</h1>
  <p class="sub">The English Wikipedia page on Buttsū-ji says it heads one of fourteen branches of Rinzai Zen. The page on Rinzai says fifteen. Both cite the same page.
  Here are ${R.length} sources, the number each one states, and the temples each one names.</p>
  <div class="two">
    <div>Every full list here has the same fourteen Rinzai temples in it. The three that count fifteen Rinzai branches add <b class="k">Kōshō-ji</b> in Kyoto, which became a branch of its own in 1953. Nobody is wrong; they disagree about whether to count it.</div>
    <div>The Rinzai–Ōbaku Joint Council also says fifteen, but its fifteen is the fourteen and <b class="m">Manpuku-ji</b>, the head temple of Ōbaku, which is a different school. So it's the same number with a different set: each fifteen has one temple the other doesn't.</div>
  </div>
  <div class="wrap"><table>
    <thead><tr><th class="who">source, and what it says</th><th>says</th>${head}<th>which set</th></tr></thead>
    <tbody>
${body}
    </tbody>
  </table></div>
  <footer>
    <p>● named and counted. ○ named, but kept out of the number. A blank under every temple means the source states a number and lists nothing.</p>
    <p>Each source was read twice through a page reader, with two different questions. The readings agree on every name and number, and the quotes are the first reading, kana and all. Some spellings differ between sources and are treated as one temple: 天竜/天龍, 方広/方廣, 仏通/佛通, and the old forms 禪, 圓, 覺, 國 on the Council's English page. Nothing else is.</p>
    <p>Not checked here: the date 1953 (one reading of one page); why the Council leaves Kōshō-ji out (I found no source that says, and I won't guess); and the Buttsū-ji page's “forty-seven temples”. The Council's English page says forty-seven with no date, Japanese Wikipedia says about fifty, and the Agency for Cultural Affairs yearbook, the record that would settle it, is a PDF I couldn't open.</p>
  </footer>
</main>
</body>
</html>
`;
writeFileSync(new URL('demo.html', import.meta.url), html);
console.log(`demo.html: ${R.length} sources`);
