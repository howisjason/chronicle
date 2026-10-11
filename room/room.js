// room.js: draws March's room from its plain files. Reads state/*.json,
// state/log.jsonl (desk.json is the launcher's), shelf/*.md and a build's demo.html or demo.txt; writes
// nothing to the repo. The one thing it sends: a press of "I used this" on a bench
// card goes to the door (POST /used), whose counts it reads back (GET /used,
// else state/used.json, the copy log-run.mjs keeps). Every list passes through visible() first, so an item
// marked "private": true is never drawn (the real drawer is room/drawer/, which
// git never publishes; the flag is the second fence).
//
// THE LOOK IS A PLACEHOLDER (the plan, 11 Oct 2026): flat panels with labels,
// March exactly as march-base.js draws her, a stick-simple crow. It is meant to
// be replaced whole by a new page that reads the same files; nothing here is a
// design decision.
//
// The picture: on load the page replays the last run's trace (log.jsonl's last
// line), about a minute for the whole hour, moving March to each entry's place
// with a one-word caption of what she was doing, and a strip under the picture
// saying which stop this is, the real clock time that night, and the place (J,
// 12 Oct 2026: the replay alone did not say what was going on). The hour's
// seconds are squeezed into about 55: in proportion, never real time. March has
// no legs that walk on the base yet, so she slides between spots. Then she idles
// at the bench. Clicking a place in the picture opens the list it names below.
import { makeMarch } from '../march-base.js';
import { visible, validate, DOOR } from './lib.mjs';

const W = 320, H = 160, FLOOR = 140;
const cv = document.getElementById('room');
const g = cv.getContext('2d');
g.imageSmoothingEnabled = false;

// Where March stands for each place (her centre line). The drawer sits under the
// shelf, so a private moment draws as the shelf corner with the drawer shut; a
// checking moment leaves her where she is and brings Quill to her.
const SPOT = { shelf: 42, drawer: 42, cloud: 112, bench: 160, desk: 228, board: 284 };
const CAPTION = { reading: 'reading', searching: 'searching', building: 'building', writing: 'writing',
  thinking: 'thinking', pinning: 'pinning', checking: 'checking with Quill', private: 'something private' };
const AT = { shelf: 'at the shelf', drawer: 'at the drawer', cloud: 'under the cloud', bench: 'at the bench', desk: 'at the desk', board: 'at the board', quill: 'with Quill' };
// what a click on the picture opens: each place's box in the 320x160 canvas, and the section it names
const HIT = [                                                        // Quill's perch first: it overlaps the board's top edge
  { x: 272, y: 26, w: 20, h: 14, open: 's-quill' }, { x: 254, y: 36, w: 62, h: 64, open: 's-board' },
  { x: 10, y: 44, w: 64, h: 96, open: 's-shelf' }, { x: 84, y: 2, w: 66, h: 46, open: 's-cloud' },
  { x: 120, y: 96, w: 84, h: 46, open: 's-bench' }, { x: 210, y: 96, w: 38, h: 46, open: 's-desk' },
];

// ------------------------------------------------------------------ the files
const get = async (path, kind) => {
  try {
    const r = await fetch(path, { cache: 'no-cache' });
    if (!r.ok) return { ok: false };
    if (kind === 'text') return { ok: true, data: await r.text() };
    if (kind === 'jsonl') return { ok: true, data: (await r.text()).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) };
    return { ok: true, data: JSON.parse(await r.text()) };
  } catch { return { ok: false }; }
};
const S = {};
// The "I used this" counts: the door's when it answers, else the copy log-run.mjs keeps.
let USED = {};
async function loadUsed() {
  try {
    const r = await fetch(`${DOOR}/used`, { cache: 'no-cache' });
    const c = r.ok ? (await r.json()).counts : null;
    if (c && typeof c === 'object') { USED = c; return; }
  } catch { /* the door is down; the file below */ }
  const f = await get('state/used.json');
  if (f.ok && f.data && typeof f.data === 'object' && !Array.isArray(f.data)) USED = f.data;
}

// ------------------------------------------------------------------ small DOM helpers (text only; never her words as HTML)
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
  for (const k of kids) e.append(k instanceof Node ? k : document.createTextNode(String(k ?? '')));
  return e;
};
const say = (id, text, cls = 'empty') => { const box = document.getElementById(id); box.replaceChildren(el('p', { class: cls }, text)); };
const day = (iso) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }) : ''; };
const clock = (iso) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Bangkok' }).toLowerCase().replace(' ', '') : ''; };
// a path from a state file is used only if it stays inside its own folder
const safe = (p, folder, ext) => (typeof p === 'string' && p.startsWith(folder + '/') && !p.includes('..') && (!ext || p.endsWith(ext)) ? p : null);

// A list section: missing or broken file -> the one line, and the rest of the page carries on.
function listOf(name, id) {
  const f = S[name];
  if (!f || !f.ok) { say(id, 'this file could not be read', 'bad'); return null; }
  const v = validate(name, f.data);
  const items = visible(f.data);
  if (!v.ok) console.warn(`${name}.json:`, v.problems);
  if (!items.length) { say(id, 'nothing here yet'); return null; }
  return items;
}

// ------------------------------------------------------------------ markdown, minimal: headings, paragraphs, links, lists
function inline(text, into) {
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    into.append(text.slice(last, m.index));
    const href = /^https?:\/\//.test(m[2]) || /^[\w./-]+$/.test(m[2]) && !m[2].includes('..') ? m[2] : null;
    into.append(href ? el('a', { href, rel: 'noopener' }, m[1]) : m[1]);
    last = re.lastIndex;
  }
  into.append(text.slice(last));
  return into;
}
function md(text, box) {
  box.replaceChildren();
  let list = null, para = [];
  const flush = () => { if (para.length) { box.append(inline(para.join(' '), el('p'))); para = []; } };
  for (const raw of String(text).split('\n')) {
    const line = raw.trimEnd();
    const h = /^(#{1,4})\s+(.*)$/.exec(line), li = /^\s*[-*]\s+(.*)$/.exec(line);
    if (h) { flush(); list = null; box.append(inline(h[2], el(h[1].length <= 2 ? 'h2' : 'h3'))); }
    else if (li) { flush(); if (!list) { list = el('ul'); box.append(list); } list.append(inline(li[1], el('li'))); }
    else if (!line.trim()) { flush(); list = null; }
    else { list = null; para.push(line.trim()); }
  }
  flush();
}

// ------------------------------------------------------------------ the lists
function drawLists() {
  const bench = listOf('bench', 'bench');
  if (bench) document.getElementById('bench').replaceChildren(...bench.map((b) => {
    const path = safe(String(b.path || '').replace(/\/$/, ''), 'bench');
    // "used" is the presses on the button plus the uses March typed by hand (used_by)
    const typed = Array.isArray(b.used_by) ? b.used_by.length : 0;
    const usedText = () => { const n = (USED[b.id] || 0) + typed; return n ? ` · used ${n}×` : ''; };
    const usedSpan = el('span', { class: 'used' }, usedText());
    const press = el('button', { type: 'button', class: 'usedbtn' }, 'I used this');
    press.addEventListener('click', async () => {
      press.disabled = true;
      try {
        const r = await fetch(`${DOOR}/used`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: b.id }) });
        press.textContent = r.ok ? 'thank you' : ((await r.json().catch(() => ({}))).error || 'that did not go through');
        await loadUsed();
        usedSpan.textContent = usedText();
      } catch { press.textContent = 'that did not go through'; }
    });
    const face = el('div');
    const card = el('div', { class: 'card' }, el('b', {}, b.title || b.id), el('span', { class: 'tag' }, b.status || '?'), face,
      el('div', { class: 'meta' }, `${Array.isArray(b.steps) ? b.steps.length : 0} steps`, usedSpan, ` · started ${day(b.started)} · `,
        path ? el('a', { href: `https://github.com/howisjason/chronicle/tree/main/room/${path}` }, 'the files') : '', ' ', press));
    if (path) showFace(path, face);
    return card;
  }));
  const board = listOf('board', 'board');
  if (board) document.getElementById('board').replaceChildren(...board.map((p) => {
    const thumb = safe(p.thumb, 'board', '.jpg');
    const href = /^https?:\/\//.test(String(p.url)) ? p.url : null;
    return el('div', { class: 'card' }, thumb ? el('img', { src: thumb, alt: '', loading: 'lazy' }) : el('div', { class: 'titlecard' }, p.title || ''),
      el('b', {}, href ? el('a', { href, rel: 'noopener' }, p.title || href) : (p.title || '')), p.note || '', el('div', { class: 'dim small' }, day(p.at)));
  }));
  const shelf = listOf('shelf', 'shelf');
  if (shelf) document.getElementById('shelf').replaceChildren(el('ul', {}, ...shelf.map((s) => {
    const path = safe(s.path, 'shelf', '.md');
    const a = el('a', { href: path ? `#${s.id}` : undefined }, s.title || s.id);
    if (path) a.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const page = document.getElementById('page'), f = await get(path, 'text');
      page.hidden = false;
      if (f.ok) md(f.data, page); else page.replaceChildren(el('p', { class: 'bad' }, 'this page could not be read'));
    });
    return el('li', {}, a, el('span', { class: 'dim small' }, ` · ${day(s.at)}`));
  })));
  const cloud = listOf('cloud', 'cloud');
  if (cloud) document.getElementById('cloud').replaceChildren(...cloud.map((c) => el('li', {}, c.text || '', el('span', { class: 'dim small' }, ` · ${day(c.at)}`))));
  const quill = listOf('quill', 'quill');
  if (quill) document.getElementById('quill').replaceChildren(el('table', {},
    el('tr', {}, el('th', {}, 'when'), el('th', {}, 'door'), el('th', {}, 'what'), el('th', {}, 'verdict'), el('th', {}, 'why')),
    ...quill.map((q) => el('tr', {}, el('td', {}, day(q.at)), el('td', {}, q.door || ''), el('td', {}, q.subject || ''), el('td', {}, q.verdict === 'no' ? 'NO' : q.verdict || ''), el('td', {}, q.reason || '')))));
  // the desk: what the clock put out before the newest hour, and the few before it
  const desk = listOf('desk', 'desk');
  if (desk) {
    const item = (d) => { const href = /^https?:\/\//.test(String(d.url || '')) ? d.url : null; return [href ? el('a', { href, rel: 'noopener' }, d.title || href) : (d.title || ''), el('span', { class: 'dim small' }, ` · ${d.kind || ''}, ${day(d.at)}`)]; };
    const [last, ...older] = desk.slice(-6).reverse();
    document.getElementById('desk').replaceChildren(el('p', {}, 'On the desk last time: ', ...item(last)),
      ...(older.length ? [el('ul', {}, ...older.map((d) => el('li', {}, ...item(d))))] : []));
  }
  // the log: the last 14 hours, oldest first
  const log = S.log;
  if (!log || !log.ok) say('log', 'this file could not be read', 'bad');
  else if (!log.data.length) say('log', 'no hour has run yet');
  else document.getElementById('log').replaceChildren(...log.data.slice(-14).map((e) => {
    const q = e.quill || {}, steps = (e.bench_steps || []).reduce((n, s) => n + (Number(s.n) || 0), 0);
    return el('li', {}, `${day(e.started)}, ${clock(e.started)}: ${Math.round((e.seconds || 0) / 60)} min, ${e.verdict || '?'}. ` +
      `${e.pins || 0} pins, ${steps} bench steps, ${e.cloud || 0} thoughts, ${e.shelf || 0} pages, Quill ${q.yes || 0} yes / ${q.no || 0} no` +
      `${e.broken && e.broken.length ? `; ${e.broken.length} file(s) did not parse` : ''}.`);
  }));
}

// A build shows itself when it can (J, 12 Oct 2026: a showcase, not a link to
// GitHub): bench/<id>/demo.html, a page the build wrote for a browser, is shown in
// place; else bench/<id>/demo.txt, what the build prints, is shown as text; else
// nothing but the link. The hour learns this from state/README.md.
async function showFace(path, into) {
  const has = async (f) => { try { return (await fetch(`${path}/${f}`, { method: 'HEAD', cache: 'no-cache' })).ok; } catch { return false; } };
  if (await has('demo.html')) { into.append(el('iframe', { src: `${path}/demo.html`, title: 'the build, running', loading: 'lazy' })); into.parentElement.classList.add('faced'); }
  else if (await has('demo.txt')) { const f = await get(`${path}/demo.txt`, 'text'); if (f.ok) { into.append(el('pre', {}, f.data)); into.parentElement.classList.add('faced'); } }
}

// ------------------------------------------------------------------ the picture
const box = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const label = (t, x, y, c = '#e8ecff') => { g.fillStyle = c; g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.fillText(t, x, y); };
const count = (name) => (S[name] && S[name].ok ? visible(S[name].data).length : 0);

function drawSet() {
  box('#1b2550', 0, 0, W, FLOOR); box('#2a3566', 0, FLOOR, W, H - FLOOR); box('#3a4680', 0, FLOOR, W, 1);
  // the shelf (left), its boards filling with pages; the drawer shut beneath it
  box('#5a4032', 14, 52, 56, 72);
  for (let k = 0; k < 4; k++) box('#3b2a22', 16, 60 + k * 16, 52, 2);
  const pages = Math.min(count('shelf'), 24);
  for (let k = 0; k < pages; k++) box(['#f4a6cf', '#9ed3f1', '#f2c14e'][k % 3], 18 + (k % 8) * 6, 50 + Math.floor(k / 8) * 16 + 4, 4, 6);
  box('#3b2a22', 18, 126, 48, 12); box('#f2c14e', 40, 131, 4, 2);
  label('SHELF', 42, 48);
  // the cloud (top), one dot per thought
  g.fillStyle = '#e9e7f4';
  for (const [cx, cy, r] of [[96, 22, 10], [110, 16, 13], [126, 20, 11], [138, 24, 8], [112, 27, 9]]) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); }
  for (let k = 0; k < Math.min(count('cloud'), 9); k++) box('#2f5bd8', 100 + k * 4, 22, 2, 2);
  label('CLOUD', 116, 44);
  // the bench (centre, biggest), one block per build
  box('#7a5a3e', 124, 112, 76, 6); box('#5a4032', 128, 118, 4, 22); box('#5a4032', 192, 118, 4, 22);
  for (let k = 0; k < Math.min(count('bench'), 6); k++) box(['#9ed3f1', '#f4a6cf', '#f2c14e'][k % 3], 128 + k * 12, 104, 9, 8);
  label('BENCH', 162, 100);
  // the desk (small), a laptop on it
  box('#5a4032', 214, 116, 30, 4); box('#3b2a22', 216, 120, 3, 20); box('#3b2a22', 239, 120, 3, 20);
  box('#93a0cc', 222, 106, 16, 10); box('#2a3f8f', 223, 107, 14, 8); box('#93a0cc', 220, 115, 20, 1);
  label('DESK', 229, 100);
  // the board (right), one pin per thing seen
  box('#6b4a2e', 258, 40, 54, 48); box('#b9875a', 260, 42, 50, 44);
  const pins = Math.min(count('board'), 12);
  for (let k = 0; k < pins; k++) { box('#f3eedf', 264 + (k % 4) * 11, 46 + Math.floor(k / 4) * 13, 8, 9); box('#d8323c', 267 + (k % 4) * 11, 45 + Math.floor(k / 4) * 13, 2, 2); }
  label('BOARD', 285, 98);
}

// Quill, a placeholder crow: two 12x10 frames, perched and wings up.
const CROW = [
  ['...KKK......', '..KKEKK.....', '.YKKKKKK....', '..KKKKKKK...', '...KKKKKKK..', '...KKKKKKKK.', '....KKKKK.KK', '.....KKK....', '.....Y.Y....', '....YY.YY...'],
  ['K.........K.', 'KK.KKK...KK.', '.KKKEKK.KK..', 'YKKKKKKKK...', '..KKKKKKK...', '...KKKKKK...', '....KKKKK.KK', '.....KKK....', '.....Y.Y....', '....YY.YY...'],
];
const CROW_COL = { K: '#15121f', E: '#f2c14e', Y: '#e0a030' };
function drawCrow(x, y, f) {
  CROW[f].forEach((row, j) => [...row].forEach((c, i) => { if (CROW_COL[c]) box(CROW_COL[c], Math.round(x) + i, Math.round(y) + j, 1, 1); }));
}

let eng = null, img = null, mcv = null;
try {
  eng = makeMarch(80, 6);
  mcv = document.createElement('canvas'); mcv.width = eng.W; mcv.height = eng.H;
  img = new ImageData(eng.W, eng.H);
} catch (e) { console.warn('March could not be drawn:', e); }
function drawMarch(x, t) {
  if (!eng) { box('#f4a6cf', x - 6, FLOOR - 40, 12, 40); return; }
  try {
    img.data.set(eng.frame(t, { on: false }));
    mcv.getContext('2d').putImageData(img, 0, 0);
    g.drawImage(mcv, Math.round(x) - eng.CX, FLOOR - 78);
  } catch (e) { if (!drawMarch.warned) { drawMarch.warned = true; console.warn('March:', e); } }
}

// ------------------------------------------------------------------ the replay
// The whole trace in about a minute, each stop held at least 2.5 seconds.
const R = { plan: [], t0: 0, x: SPOT.bench, quill: false };
const PERCH = { x: 279, y: 30 };
const q = { x: PERCH.x, y: PERCH.y };
function planReplay() {
  const e = S.log && S.log.ok ? S.log.data[S.log.data.length - 1] : null;
  const tr = e && Array.isArray(e.trace) ? e.trace.filter((s) => s && CAPTION[s.kind]) : [];
  const first = tr.length ? tr[0].t : 0, span = tr.length ? Math.max(1, tr[tr.length - 1].t - first) : 1;
  let at = 0;
  const t0 = e ? new Date(e.started).getTime() : NaN;
  R.plan = tr.map((s, n) => { at = Math.max(n ? at + 2.5 : 0, ((s.t - first) / span) * 55); return { at, kind: s.kind, place: s.place, when: t0 + s.t * 1000 }; });
  R.t0 = performance.now() / 1000;
  R.shown = -1;
  document.getElementById('dots').replaceChildren(...R.plan.map(() => el('i')));
  document.getElementById('lastrun').textContent = e
    ? `Last hour: ${day(e.started)}, ${clock(e.started)} to ${clock(e.ended)}, ${Math.max(1, Math.round((e.seconds || 0) / 60))} min, ${e.verdict || '?'}. The replay shows where she was, never what she read or wrote.`
    : 'No hour has run yet. She waits at the bench.';
}
document.getElementById('replay').addEventListener('click', planReplay);

// ------------------------------------------------------------------ the folds
// Every list below the picture is folded to its heading; a click on the heading
// or on its place in the picture opens it (and lights the heading for a moment).
const openFold = (id, scroll) => {
  const sec = document.getElementById(id);
  if (!sec) return;
  sec.classList.add('open');
  if (scroll) { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); sec.classList.add('lit'); setTimeout(() => sec.classList.remove('lit'), 1200); }
};
for (const h of document.querySelectorAll('.fold > h2')) h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
cv.addEventListener('click', (ev) => {
  const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * H / r.height;
  const hit = HIT.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  if (hit) openFold(hit.open, true);
});

function tick(ms) {
  const t = ms / 1000, rt = t - R.t0;
  let now = null;
  for (const s of R.plan) if (s.at <= rt) now = s;
  const done = !R.plan.length || rt > R.plan[R.plan.length - 1].at + 4;
  const place = done ? 'bench' : now ? now.place : R.plan[0].place;
  const kind = done ? null : now ? now.kind : null;
  // the strip: which stop this is, when it really happened, where
  const n = done || !now ? -1 : R.plan.indexOf(now);
  if (n !== R.shown) {
    R.shown = n;
    [...document.getElementById('dots').children].forEach((d, k) => { d.className = n < 0 ? 'past' : k < n ? 'past' : k === n ? 'now' : ''; });
    document.getElementById('step').textContent = n < 0
      ? (R.plan.length ? `${R.plan.length} stops in the hour; press Replay to watch them again` : '')
      : `stop ${n + 1} of ${R.plan.length} · ${clock(now.when)} · ${CAPTION[now.kind]}, ${AT[now.place] || now.place}`;
  }
  const target = SPOT[place] ?? R.x;                                   // 'quill' leaves her where she is
  R.x += Math.sign(target - R.x) * Math.min(Math.abs(target - R.x), 1.6);
  // Quill hops to her during a check, and back to its perch after
  const checking = kind === 'checking';
  const qt = checking ? { x: R.x + 12, y: FLOOR - 52 } : PERCH;
  q.x += (qt.x - q.x) * 0.08; q.y += (qt.y - q.y) * 0.08;
  const flying = Math.hypot(qt.x - q.x, qt.y - q.y) > 2;
  drawSet();
  drawMarch(R.x, t);
  drawCrow(q.x, q.y, flying || (checking && Math.floor(t * 3) % 2) ? 1 : 0);
  document.getElementById('caption').textContent = done ? (R.plan.length ? 'at the bench' : 'waiting for the first hour') : (CAPTION[kind] || '…');
  requestAnimationFrame(tick);
}

// ------------------------------------------------------------------ go
(async () => {
  const names = ['bench', 'shelf', 'board', 'cloud', 'quill', 'desk'];
  const files = await Promise.all([...names.map((n) => get(`state/${n}.json`)), get('state/log.jsonl', 'jsonl')]);
  names.forEach((n, k) => { S[n] = files[k]; });
  S.log = files[names.length];
  await loadUsed();
  try { drawLists(); } catch (e) { console.warn('lists', e); }
  try { await document.fonts.load('8px Silkscreen'); } catch { /* the fallback font draws the labels */ }
  planReplay();
  requestAnimationFrame(tick);
})();
