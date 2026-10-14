// make-demo.mjs: writes demo.html with wanphra.mjs pasted inside it, so the
// page runs with no server and no other file. test.mjs checks the copy.
//   bash room/tools/try.sh wan-phra make-demo.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { faceLine } from './count.mjs';
import { faceLine1954 } from './tithi1954.mjs';
import { faceLine2002 } from './dhammayut2002.mjs';

export const inlined = () => readFileSync(new URL('./wanphra.mjs', import.meta.url), 'utf8')
  .replace(/^export /gm, '');

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>When is the Thai holy day, and is it the real full moon?</title>
<style>
  :root { --ink:#1d2433; --soft:#5b6478; --line:#e3e6ee; --bg:#fbfaf6; --gold:#b7791f; --sky:#2b6cb0; --warn:#c05621; }
  @media (prefers-color-scheme: dark) { :root { --ink:#e8eaf0; --soft:#a3aabb; --line:#323848; --bg:#161a22; --gold:#ecc94b; --sky:#90cdf4; --warn:#f6ad55; } }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 system-ui, sans-serif; }
  main { max-width:760px; margin:0 auto; padding:20px 18px 40px; }
  h1 { font-size:20px; margin:0 0 4px; } .soft { color:var(--soft); }
  .next { display:flex; gap:14px; flex-wrap:wrap; margin:16px 0; }
  .card { flex:1 1 220px; border:1px solid var(--line); border-radius:10px; padding:12px 14px; }
  .card b { display:block; font-size:22px; } .card .k { font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:var(--soft); }
  table { width:100%; border-collapse:collapse; font-size:14px; margin-top:8px; }
  td, th { padding:5px 6px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
  th { font-size:12px; color:var(--soft); font-weight:600; }
  tr.full td:first-child { border-left:3px solid var(--gold); }
  tr.past { opacity:.55; } .name { color:var(--gold); font-weight:600; }
  .same { color:var(--sky); } .early { color:var(--warn); }
  nav { display:flex; align-items:center; gap:10px; margin-top:22px; }
  button { font:inherit; padding:3px 10px; border-radius:6px; border:1px solid var(--line); background:transparent; color:var(--ink); cursor:pointer; }
  .tally { margin:18px 0 0; padding:12px 14px; border-radius:10px; border:1px solid var(--line); }
  footer { margin-top:24px; font-size:13px; color:var(--soft); }
</style></head><body><main>
<h1>When is the Thai holy day, and is it the real full moon?</h1>
<div class="soft">Wan phra, the Buddhist holy days, worked out from the old Thai calendar arithmetic, with the sky's full moon beside each full-moon day. Thai time.</div>
<div class="next" id="next"></div>
<div class="tally" id="tally"></div>
<h2 style="font-size:16px;margin:22px 0 2px">Where the full moon falls, counted from the start of the holy day</h2>
<div class="soft" style="font-size:13px">Every full-moon holy day from 1996 to 2031, in 3-hour bins. The shaded band is the holy day itself, midnight to midnight, Thai time. Hover a bar for its count.</div>
<svg id="lean" viewBox="0 0 720 230" style="width:100%;height:auto;margin-top:6px" role="img" aria-label="Histogram of where the full moon falls relative to the holy day"></svg>
<div class="soft" id="leanNote" style="font-size:14px"></div>
<div class="tally" id="count" style="font-size:14px">${'${COUNT}'}</div>
<div class="tally" id="t1954" style="font-size:14px">${'${T54}'}</div>
<div class="tally" id="d2002" style="font-size:14px">${'${D2002}'}</div>
<nav><button id="prev">&larr;</button><strong id="year"></strong><button id="fwd">&rarr;</button><span class="soft" id="range"></span></nav>
<table><thead><tr><th>Date</th><th>Lunar day</th><th>The sky's full moon</th></tr></thead><tbody id="rows"></tbody></table>
<footer>
  The calendar: the Suriyayatra year rules as written in the open-source <i>pythaidate</i> library, with two changes the published dates asked for (see the README). It matches all 49 holy days of 2026 on Thai PBS, and Thai Wikipedia's Makha and Asahna Bucha tables for 1996 to early 2024, except for one row. That row, Asahna Bucha 2005, said 21 July until an edit in 2018 made it the 20th; a holiday notice filed with the Thai stock exchange in 2004, Pattaya Mail and MGR Online all printed Thursday 21 July, which is this calendar's day.
  The sky: Meeus, <i>Astronomical Algorithms</i>, chapter 49. It is within a minute of the U.S. Naval Observatory for 2026.
  The big days are named. Khao Phansa is not a wan phra, but it is listed. Holy days are set by the authorities, and this page only works them out: check an official calendar before planning around one.
</footer>
<script>
${'${CODE}'}
const DAY = 86400000;
const thaiToday = () => { const t = new Date(Date.now() + 7 * 3600000); return jdnFromYmd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
const fmt = (j) => { const { y, m, d } = ymdFromJdn(j); return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); };
const monthName = (m) => (m === '8-2' ? 'second 8th month' : 'month ' + m);
const hhmm = (h) => String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor((h % 1) * 60)).padStart(2, '0');
const LO = 1996, HI = 2031;
const today = thaiToday();
let year = Math.min(HI, Math.max(LO, ymdFromJdn(today).y));

function skyCell(h) {
  if (!h.full) return '';
  const r = missHours(h.jdn);
  const when = fmt(r.jdn) + ', ' + hhmm(r.hour);
  if (r.offDays === 0) return '<span class="same">' + when + ', the same day</span>';
  const word = r.offDays < 0 ? 'the holy day comes first' : 'the holy day comes after';
  return '<span class="early">' + when + ', ' + word + '</span>';
}

function draw() {
  document.getElementById('year').textContent = year;
  document.getElementById('range').textContent = (year < 2025 ? '' : year > 2026 ? 'worked out, not yet published' : '');
  const rows = holyDaysInYear(year).map((h) =>
    '<tr class="' + (h.full ? 'full ' : '') + (h.jdn < today ? 'past' : '') + '"><td>' + fmt(h.jdn) + '</td><td>' + h.label + ', ' + monthName(h.month)
    + (h.name ? '<br><span class="name">' + h.name + '</span>' : '') + (h.wanPhra ? '' : ' <span class="soft">(not a wan phra)</span>')
    + '</td><td>' + skyCell(h) + '</td></tr>');
  document.getElementById('rows').innerHTML = rows.join('');
}

function next() {
  const all = [...holyDaysInYear(ymdFromJdn(today).y), ...holyDaysInYear(ymdFromJdn(today).y + 1)];
  const wp = all.find((h) => h.wanPhra && h.jdn >= today);
  const big = all.find((h) => h.name && h.jdn >= today);
  const away = (j) => (j === today ? 'today' : j - today === 1 ? 'tomorrow' : 'in ' + (j - today) + ' days');
  const card = (k, h) => '<div class="card"><span class="k">' + k + '</span><b>' + fmt(h.jdn) + '</b>' + away(h.jdn) + ' &middot; ' + h.label + ', ' + monthName(h.month) + (h.name ? '<br><span class="name">' + h.name + '</span>' : '') + '</div>';
  document.getElementById('next').innerHTML = (wp ? card('Next wan phra', wp) : '') + (big ? card('Next big day', big) : '');
}

function tally() {
  let n = 0, same = 0, early = 0;
  for (let y = LO; y <= HI; y++) for (const h of holyDaysInYear(y).filter((x) => x.full)) {
    n++; const r = missHours(h.jdn); if (r.offDays === 0) same++; else if (r.offDays < 0) early++;
  }
  document.getElementById('tally').innerHTML = 'From ' + LO + ' to ' + HI + ', the calendar has <b>' + n + '</b> full-moon days. The sky is full on that Thai day in <b>' + same + '</b> of them ('
    + (100 * same / n).toFixed(1) + '%). In <b>' + early + '</b> the holy day comes first: the day ends before the moon is full. In <b>' + (n - same - early) + '</b> it comes after.';
}

function lean() {
  const hours = [];
  for (let y = LO; y <= HI; y++) for (const h of holyDaysInYear(y).filter((x) => x.full)) hours.push((fullMoonNear(h.jdn).thai - h.jdn) * 24);
  const mean = hours.reduce((a, b) => a + b, 0) / hours.length;
  const lo = -12, hi = 60, w = 3, nb = (hi - lo) / w;
  const bins = Array(nb).fill(0);
  for (const x of hours) bins[Math.min(nb - 1, Math.max(0, Math.floor((x - lo) / w)))]++;
  const top = Math.max(...bins);
  const L = 34, R = 694, T = 24, B = 190;
  const X = (hr) => L + (hr - lo) / (hi - lo) * (R - L);
  const Y = (c) => B - c / top * (B - T);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('lean');
  const add = (tag, at, text) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (text != null) e.textContent = text; svg.appendChild(e); return e; };
  add('rect', { x: X(0), y: T - 18, width: X(24) - X(0), height: B - T + 18, fill: 'var(--line)', opacity: 0.7 });
  add('text', { x: (X(0) + X(24)) / 2, y: T - 5, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--soft)' }, 'the holy day');
  for (let c = 0; c <= top; c += 10) {
    add('line', { x1: L, x2: R, y1: Y(c), y2: Y(c), stroke: 'var(--line)', 'stroke-width': 1 });
    add('text', { x: L - 6, y: Y(c) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--soft)' }, c);
  }
  bins.forEach((c, i) => {
    const a = lo + i * w, inDay = a >= 0 && a < 24;
    const hgt = Math.max(0, B - Y(c));
    const r = add('rect', { x: X(a) + 1, y: B - hgt, width: X(a + w) - X(a) - 2, height: hgt, rx: 2, fill: inDay ? 'var(--sky)' : 'var(--warn)' });
    r.appendChild(add('title', {}, c + ' full moons from ' + a + ' h to ' + (a + w) + ' h after the holy day began'));
  });
  add('line', { x1: X(mean), x2: X(mean), y1: T - 4, y2: B, stroke: 'var(--ink)', 'stroke-width': 2, 'stroke-dasharray': '4 3' });
  add('text', { x: X(mean) + 5, y: T - 5, 'font-size': 12, fill: 'var(--ink)' }, 'average, ' + mean.toFixed(1) + ' h');
  add('line', { x1: L, x2: R, y1: B, y2: B, stroke: 'var(--soft)', 'stroke-width': 1 });
  for (let hr = lo; hr <= hi; hr += 12) {
    const lab = hr === 0 ? 'midnight it begins' : hr === 24 ? 'midnight it ends' : (hr > 0 ? '+' : '') + hr + ' h';
    add('text', { x: X(hr), y: B + 16, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--soft)' }, lab);
  }
  const inside = hours.filter((x) => x >= 0 && x < 24).length;
  document.getElementById('leanNote').innerHTML = 'The middle of the pile is the midnight that <b>ends</b> the holy day: on average the full moon comes <b>' + (mean - 24).toFixed(1)
    + ' h</b> after the day is over. So a little under half the full moons land on the holy day (' + inside + ' of ' + hours.length + ', blue) and almost all the rest after it (orange). The new moon does the same: it falls more often on the first day of the month (275 times) than on the dark-moon holy day before it (130).';
}

document.getElementById('prev').onclick = () => { if (year > LO) { year--; draw(); } };
document.getElementById('fwd').onclick = () => { if (year < HI) { year++; draw(); } };
next(); tally(); lean(); draw();
</script>
</main></body></html>
`;

if (process.argv[1] && process.argv[1].endsWith('make-demo.mjs')) {
  writeFileSync(new URL('./demo.html', import.meta.url),
    page.replace('${CODE}', () => inlined()).replace('${COUNT}', () => faceLine()).replace('${T54}', () => faceLine1954())
      .replace('${D2002}', () => faceLine2002()));
  console.log('wrote demo.html');
}
