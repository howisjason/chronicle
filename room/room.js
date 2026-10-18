// room.js: draws March's room from its plain files. Reads state/*.json,
// state/log.jsonl (desk.json and wall.json are the launcher's), quill-notebook.md,
// shelf/*.md and a build's demo.html or demo.txt; writes
// nothing to the repo. The one thing it sends: a press of "I used this" on a bench
// card goes to the door (POST /used), whose counts it reads back (GET /used,
// else state/used.json, the copy log-run.mjs keeps). Every list passes through visible() first, so an item
// marked "private": true is never drawn (the real drawer is room/drawer/, which
// git never publishes; the flag is the second fence).
//
// THE LOOK is J's design kit, Moon Gate, at its full dose (kit/; its rules are
// design-kit/KIT.md; the page's own placing is room.css): every list is a fold on the
// wall whose header line (.strap) opens it, the things in it are the kit's soft cards,
// the log and Quill's ledger are plain ruled tables. The picture inside the canvas is
// scene.js (the morning room, March as a puppet with a walk and a pose at each place,
// Quill the crow), a guest in the kit's panel; this file only says where she is and
// what she is doing.
//
// The picture: on load the page replays the last run's trace (log.jsonl's last
// line), about a minute for the whole hour, moving March to each entry's place
// with a one-word caption of what she was doing, and a strip under the picture
// saying which stop this is, the real clock time that night, and the place (J,
// 12 Oct 2026: the replay alone did not say what was going on). The hour's
// seconds are squeezed into about 55: in proportion, never real time. She walks
// between places and does each place's thing there; when the replay ends and she
// is not awake now, she is asleep in her futon. Clicking a place in the picture
// opens the list it names below.
//
// TODAY AND THE WALL (the second day, J's decision 1 and 6, 13 Oct 2026): the
// lists at the top hold what the last session left; before the next wake the
// launcher moves them onto the wall (state/wall.json), drawn below grouped by day,
// newest first. So the page never empties, though she wakes to an empty room.
import { draw as drawScene, PLACES, QUILL_BOX, FEET_Y } from './scene.js';
import { visible, validate, lastDesk, DOOR } from './lib.mjs';

const W = 320, H = 160;
const cv = document.getElementById('room');
const g = cv.getContext('2d');
g.imageSmoothingEnabled = false;

// Where March stands for each place: her centre line, the scene's own PLACES[p].at.
// The drawer sits under the shelf, so a private moment stands her at the shelf
// (standing still, no pose: what she does there is hers); a checking moment leaves
// her where she is and brings Quill down to her.
const SPOT = Object.fromEntries(Object.entries(PLACES).map(([p, b]) => [p, b.at]));
SPOT.drawer = SPOT.shelf;
const POSED = new Set(Object.keys(PLACES));             // places where she does the place's thing
const CAPTION = { reading: 'reading', searching: 'searching', building: 'building', writing: 'writing',
  thinking: 'thinking', pinning: 'pinning', checking: 'checking with Quill', private: 'something private', waking: 'waking up' };
const AT = { shelf: 'at the shelf', drawer: 'at the drawer', cloud: 'under the cloud', bench: 'at the bench', desk: 'at the desk', board: 'at the board', quill: 'with Quill' };
// what a click on the picture opens: each place's box in the 320x160 canvas (the
// scene's PLACES, so the boxes are always where the things are drawn), and the
// section it names. Quill's perch first: it sits inside the bench's box.
const HIT = [{ ...QUILL_BOX, open: 's-quill' }, ...Object.entries(PLACES).map(([p, b]) => ({ x: b.x, y: b.y, w: b.w, h: b.h, open: `s-${p}` }))];

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
// a path from a state file is used only if it stays inside its own folder (or that
// folder under first-day/, where the first day's things moved at the reset of 13 Oct 2026,
// or under wall/, where the sweep moves a thing's files with its row)
const safe = (p, folder, ext) => (typeof p === 'string' && [`${folder}/`, `first-day/${folder}/`, `wall/${folder}/`].some((f) => p.startsWith(f)) && !p.includes('..') && (!ext || p.endsWith(ext)) ? p : null);

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

// ------------------------------------------------------------------ the cards (today's lists and the wall draw the same way)
// Quill's newest verdict on a build, at any door but a talk. Her ledger names a build
// by its id, alone or followed by a colon, comma or space ("meet: do the three forces meet?").
const verdictOn = (id) => {
  const names = (subject) => subject === id || [':', ',', ' '].some((c) => String(subject || '').startsWith(id + c));
  const q = S.quill && S.quill.ok ? visible(S.quill.data).filter((x) => names(x.subject) && x.door !== 'talk') : [];
  const v = q[q.length - 1];
  return v ? ` · Quill at ${v.door}: ${v.verdict === 'no' ? 'NO' : 'yes'}` : '';
};
function benchCard(b) {
  const path = safe(String(b.path || '').replace(/\/$/, ''), 'bench');
  // "used" is the presses on the button plus the uses March typed by hand (used_by)
  const typed = Array.isArray(b.used_by) ? b.used_by.length : 0;
  const usedText = () => { const n = (USED[b.id] || 0) + typed; return n ? ` · used ${n}×` : ''; };
  const usedSpan = el('span', { class: 'used' }, usedText());
  const press = el('button', { type: 'button', class: 'btn soft sm usedbtn' }, 'I used this');
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
  const card = el('div', { class: 'card' }, el('div', { class: 'tags' }, el('span', { class: 'tag' }, b.status || '?')),
    el('div', { class: 'title' }, b.title || b.id), face,
    el('div', { class: 'meta' }, `${Array.isArray(b.steps) ? b.steps.length : 0} steps`, usedSpan, verdictOn(b.id), ` · started ${day(b.started)}`),
    el('div', { class: 'acts' }, press, path ? el('a', { class: 'meta', href: `https://github.com/howisjason/chronicle/tree/main/room/${path}` }, 'the files') : ''));
  if (path) showFace(path, face);
  return card;
}
function boardCard(p) {
  const thumb = safe(p.thumb, 'board', '.jpg');
  const href = /^https?:\/\//.test(String(p.url)) ? p.url : null;
  return el('div', { class: 'card' }, thumb ? el('img', { src: thumb, alt: '', loading: 'lazy' }) : el('div', { class: 'titlecard label' }, p.title || ''),
    el('div', { class: 'title' }, href ? el('a', { href, rel: 'noopener' }, p.title || href) : (p.title || '')), p.note ? el('div', { class: 'note' }, p.note) : '', el('div', { class: 'meta' }, day(p.at)));
}
// a page on the wall opens inside its own card
function shelfCard(s) {
  const path = safe(s.path, 'shelf', '.md');
  const page = el('article', { class: 'inpage', hidden: '' });
  const card = el('div', { class: 'card' });
  const a = el('a', { href: path ? `#${s.id}` : undefined }, s.title || s.id);
  if (path) a.addEventListener('click', async (ev) => {
    ev.preventDefault();
    if (!page.hidden) { page.hidden = true; card.classList.remove('faced'); return; }
    const f = await get(path, 'text');
    page.hidden = false; card.classList.add('faced');
    if (f.ok) md(f.data, page); else page.replaceChildren(el('p', { class: 'bad' }, 'this page could not be read'));
  });
  card.append(el('div', { class: 'tags' }, el('span', { class: 'tag' }, 'page')), el('div', { class: 'title' }, a), el('div', { class: 'meta' }, day(s.at)), page);
  return card;
}

// ------------------------------------------------------------------ the lists
// a fold's header line says how many things are inside it, so a closed fold still tells
const tally = (sec, n, one, many = `${one}s`) => {
  const m = document.querySelector(`#${sec} > .strap > .meta`);
  if (m) m.textContent = n ? `${n} ${n === 1 ? one : many}` : 'nothing yet';
};
// a kit table; on a phone each row stacks, every cell under its column's name (data-l)
// (`wide` names the long columns: on a phone they take a whole line, after the short ones)
const table = (heads, rows, wide = []) => el('div', { class: 'tablewrap' }, el('table', { class: 'rows' },
  el('tr', {}, ...heads.map((h, k) => el('th', { class: wide.includes(k) ? 'w' : undefined }, h))),
  ...rows.map((cells) => el('tr', {}, ...cells.map((c, k) => {
    const td = c instanceof Node ? c : el('td', { 'data-l': heads[k] }, c);
    if (wide.includes(k)) td.classList.add('w');
    return td;
  })))));
function drawLists() {
  const bench = listOf('bench', 'bench');
  tally('s-bench', bench ? bench.length : 0, 'build');
  if (bench) document.getElementById('bench').replaceChildren(...bench.map(benchCard));
  const board = listOf('board', 'board');
  tally('s-board', board ? board.length : 0, 'pin');
  if (board) document.getElementById('board').replaceChildren(...board.map(boardCard));
  const shelf = listOf('shelf', 'shelf');
  tally('s-shelf', shelf ? shelf.length : 0, 'page');
  if (shelf) document.getElementById('shelf').replaceChildren(el('ul', {}, ...shelf.map((s) => {
    const path = safe(s.path, 'shelf', '.md');
    const a = el('a', { href: path ? `#${s.id}` : undefined }, s.title || s.id);
    if (path) a.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const page = document.getElementById('page'), f = await get(path, 'text');
      page.hidden = false;
      if (f.ok) md(f.data, page); else page.replaceChildren(el('p', { class: 'bad' }, 'this page could not be read'));
    });
    return el('li', {}, a, el('span', { class: 'meta' }, ` · ${day(s.at)}`));
  })));
  const cloud = listOf('cloud', 'cloud');
  tally('s-cloud', cloud ? cloud.length : 0, 'thought');
  if (cloud) document.getElementById('cloud').replaceChildren(...cloud.map((c) => el('li', {}, c.text || '', el('span', { class: 'meta' }, day(c.at)))));
  const quill = listOf('quill', 'quill');
  tally('s-quill', quill ? quill.length : 0, 'call');
  if (quill) {
    // Quill's score: the no's March has since judged right or wrong
    const nos = quill.filter((q) => q.verdict === 'no'), right = nos.filter((q) => q.judged === 'right').length, wrong = nos.filter((q) => q.judged === 'wrong').length;
    document.getElementById('quill').replaceChildren(
      el('p', { class: 'meta' }, `${right + wrong} no's judged so far: ${right} right, ${wrong} wrong.`),
      // a talk asks no verdict, so its row has none
      table(['when', 'door', 'what', 'verdict', 'why', 'judged'], quill.map((q) => [day(q.at), q.door || '', q.subject || '',
        q.door === 'talk' ? '' : q.verdict === 'no' ? el('td', { 'data-l': 'verdict', class: 'verdict-no' }, 'NO') : q.verdict || '',
        q.reason || '', q.judged && q.judged !== 'unknown' ? q.judged : '']), [2, 4]));
  }
  // Quill's notebook: its last three lines (the whole file is one click away)
  const nb = S.notebook;
  const nbAll = nb && nb.ok ? nb.data.split('\n').filter((l) => /^- /.test(l)) : [];
  const nbLines = nbAll.slice(-3);
  tally('s-notebook', nbAll.length, 'line');
  document.getElementById('notebook').replaceChildren(nbLines.length
    ? el('ul', { class: 'lines' }, ...nbLines.map((l) => {
      const m = /^- (\d{4}-\d\d-\d\d)\s+(\S+)\s+(.*)$/.exec(l);
      return m ? el('li', {}, el('span', { class: 'label' }, `${day(m[1])} · ${m[2]}`), el('div', {}, m[3])) : el('li', {}, l.slice(2));
    }))
    : el('p', { class: 'empty' }, nb && nb.ok ? 'nothing written yet' : 'the notebook could not be read'),
  el('p', { class: 'meta' }, el('a', { href: 'quill-notebook.md' }, 'the whole notebook')));
  // the desk: this wake's two things, how each was put out, which she took up; then the desks before
  const desk = listOf('desk', 'desk');
  if (desk) {
    const link = (d) => { const href = /^https?:\/\//.test(String(d.url || '')) ? d.url : null; return href ? el('a', { href, rel: 'noopener' }, d.title || href) : (d.title || ''); };
    const shown = (d) => (d.door === 'picture' && /^https:\/\//.test(String(d.shown))
      ? el('img', { src: d.shown, alt: d.title || '', loading: 'lazy' })
      : el('div', { class: 'note' }, d.shown || ''));
    const today = lastDesk(desk);
    tally('s-desk', today.length, 'thing');
    const older = desk.filter((d) => !today.includes(d)).slice(-8).reverse();
    document.getElementById('desk').replaceChildren(
      el('div', { class: 'cards' }, ...today.map((d) => el('div', { class: 'card' },
        el('div', { class: 'tags' }, el('span', { class: 'tag' }, d.pool ? `${d.pool} · ${d.door}` : (d.kind || '')), d.taken ? el('span', { class: 'tag fill' }, 'taken') : ''),
        el('div', { class: 'title' }, link(d)), d.pool && d.shown !== d.title ? shown(d) : '', el('div', { class: 'meta' }, day(d.at))))),
      ...(older.length ? [el('p', { class: 'label' }, 'Before that'), el('ul', {}, ...older.map((d) => el('li', {}, link(d),
        el('span', { class: 'meta' }, ` · ${d.pool ? `${d.pool}/${d.door}` : d.kind || ''}${d.taken ? ', taken' : ''}, ${day(d.at)}`))))] : []));
  } else tally('s-desk', 0, 'thing');
  // the wall: everything ever made, grouped by the day it was made, newest first
  const wall = listOf('wall', 'wall');
  tally('s-wall', wall ? wall.length : 0, 'thing');
  if (wall) {
    const days = [];
    for (const w of wall) { const last = days[days.length - 1]; if (last && last.day === w.day) last.items.push(w); else days.push({ day: w.day, items: [w] }); }
    const make = { bench: benchCard, shelf: shelfCard, board: boardCard };
    document.getElementById('wall').replaceChildren(...days.flatMap((g) => [
      el('div', { class: 'day-head' }, el('div', { class: 'label' }, `${g.items.length} ${g.items.length === 1 ? 'thing' : 'things'}`), el('h3', { class: 'display' }, day(g.day)), el('span', { class: 'rule' })),
      el('div', { class: 'cards' }, ...g.items.filter((w) => make[w.kind]).map((w) => make[w.kind](w))),
    ]));
  }
  // the log: the last 14 sessions, oldest first
  const log = S.log;
  tally('s-log', log && log.ok ? log.data.length : 0, 'session');
  if (!log || !log.ok) say('log', 'this file could not be read', 'bad');
  else if (!log.data.length) say('log', 'no session has run yet');
  else document.getElementById('log').replaceChildren(table(['when', 'min', 'run', 'made', 'Quill'], log.data.slice(-14).map((e) => {
    const q = e.quill || {}, steps = (e.bench_steps || []).reduce((n, s) => n + (Number(s.n) || 0), 0);
    return [`${day(e.started)}, ${clock(e.started)}`, String(Math.round((e.seconds || 0) / 60)),
      `${e.verdict || '?'}${e.broken && e.broken.length ? `; ${e.broken.length} file(s) did not parse` : ''}`,
      `${e.pins || 0} pins, ${steps} bench steps, ${e.cloud || 0} thoughts, ${e.shelf || 0} pages`,
      `${q.yes || 0} yes / ${q.no || 0} no${q.talks ? `, ${q.talks} talks` : ''}`];
  }), [3]));
}

// A build shows itself when it can (J, 12 Oct 2026: a showcase, not a link to
// GitHub): bench/<id>/demo.html, a page the build wrote for a browser, is shown in
// place; else bench/<id>/demo.txt, what the build prints, is shown as text; else
// nothing but the link. The hour learns this from state/README.md.
async function showFace(path, into) {
  const has = async (f) => { try { return (await fetch(`${path}/${f}`, { method: 'HEAD', cache: 'no-cache' })).ok; } catch { return false; } };
  if (await has('demo.html')) { into.append(el('iframe', { src: `${path}/demo.html`, title: 'the build, running', loading: 'lazy' })); into.closest('.card').classList.add('faced'); }
  else if (await has('demo.txt')) { const f = await get(`${path}/demo.txt`, 'text'); if (f.ok) { into.append(el('pre', { class: 'well' }, f.data)); into.closest('.card').classList.add('faced'); } }
}

// ------------------------------------------------------------------ the picture
// ------------------------------------------------------------------ the replay
// The whole trace in about a minute, each stop held at least 2.5 seconds.
const R = { plan: [], t0: 0, x: SPOT.bench };
// what each place holds today, from the same lists the folds draw (visible items;
// the desk's newest pair), so the picture grows with her work
let PLACED = {};
function placed() {
  const n = (name) => (S[name] && S[name].ok && Array.isArray(S[name].data) ? visible(S[name].data).length : 0);
  const desk = S.desk && S.desk.ok && Array.isArray(S.desk.data) ? lastDesk(visible(S.desk.data)).length : 0;
  PLACED = { shelf: { pages: n('shelf') }, board: { cards: n('board') }, cloud: { thoughts: n('cloud') }, bench: { builds: n('bench') }, desk: { items: desk } };
}
// one frame of the picture: walk toward the place's spot, then do its thing there
const STEP = 1.2;                                                     // pixels a frame while walking
function show(t, awake, place, kind) {
  const target = SPOT[place] ?? R.x;                                  // 'quill' leaves her where she is
  const moving = awake && Math.abs(target - R.x) > 0.5;
  if (awake) R.x += Math.sign(target - R.x) * Math.min(Math.abs(target - R.x), STEP);
  drawScene(g, t, { awake, march: { x: R.x, y: FEET_Y }, moving, place: kind && POSED.has(place) ? place : null, checking: kind === 'checking', places: PLACED });
}
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
    ? `Last session: ${day(e.started)}, ${clock(e.started)} to ${clock(e.ended)}, ${Math.max(1, Math.round((e.seconds || 0) / 60))} min, ${e.verdict || '?'}${Number.isFinite(e.sameness) ? `, sameness ${e.sameness}% (how much it repeated the last seven)` : ''}. The replay shows where she was, never what she read or wrote.`
    : 'No session has run yet. She waits at the bench.';
  drawNums(e);
}
// The last session in four tiles, from the same log line; a value the line lacks shows as a dash.
function drawNums(e) {
  const num = (v) => (Number.isFinite(v) ? v : '–');
  const q = e && e.quill && typeof e.quill === 'object' ? e.quill : null;
  const steps = e && Array.isArray(e.bench_steps) ? e.bench_steps.reduce((n, s) => n + (Number(s && s.n) || 0), 0) : NaN;
  const tile = (label, stat, meta) => el('div', {}, el('div', { class: 'label' }, label), el('div', { class: 'stat' }, ...stat), el('div', { class: 'meta' }, meta));
  const made = e ? [['pins', e.pins], ['thoughts', e.cloud], ['pages', e.shelf]].map(([w, v]) => `${num(v)} ${w}`).join(' · ') : '';
  document.getElementById('nums').replaceChildren(
    tile('Minutes', [String(e && Number.isFinite(e.seconds) ? Math.max(1, Math.round(e.seconds / 60)) : '–')], e ? `${clock(e.started) || '–'} to ${clock(e.ended) || '–'}` : 'no session yet'),
    tile('The run', [e && e.verdict ? String(e.verdict) : '–'], e && Number.isFinite(e.sameness) ? `sameness ${e.sameness}%` : 'sameness –'),
    tile('Quill', q ? [String(num(q.yes)), el('small', {}, 'yes'), el('b', {}, String(num(q.no))), el('small', {}, 'no')] : ['–'], q && Number.isFinite(q.talks) ? `${q.talks} talks` : ''),
    tile('Bench steps', [String(num(steps))], made));
}
document.getElementById('replay').addEventListener('click', () => { R.manual = true; planReplay(); });

// ------------------------------------------------------------------ live
// While her hour runs, the watcher (tools/live.mjs) tells the door where she is;
// the page asks every 15 seconds and moves her there. The replay button still
// works, and the next answer from the door takes over again. When the door is
// down, the now.json the clock commits is the fallback (it says she is asleep).
let LIVE = null;
async function askNow() {
  let n = null;
  try { const r = await fetch(`${DOOR}/now`, { cache: 'no-cache' }); if (r.ok) n = await r.json(); } catch { /* the door is down */ }
  if (!n) { const f = await get('state/now.json'); n = f.ok ? f.data : null; }
  LIVE = n && n.awake === true && CAPTION[n.kind] ? n : null;
  document.getElementById('awake').textContent = LIVE ? `awake since ${clock(LIVE.since) || 'now'}` : 'asleep';
  if (LIVE) R.manual = false;
}

// ------------------------------------------------------------------ the folds
// Every list below the picture is folded to its heading; a click on the heading
// or on its place in the picture opens it (and lights the heading for a moment).
const openFold = (id, scroll) => {
  const sec = document.getElementById(id);
  if (!sec) return;
  sec.classList.add('open');
  if (scroll) { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); sec.classList.add('lit'); setTimeout(() => sec.classList.remove('lit'), 1200); }
};
// The picture is shown at a whole number of screen pixels per picture pixel (the
// widest that fits its frame), so every pixel draws the same width and nothing
// blurs; a frame narrower than 320 (a phone) gets the frame's width instead.
function snap() {
  const box = cv.parentElement, bs = getComputedStyle(box), cs = getComputedStyle(cv);
  const room = box.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
  const ex = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth), ey = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
  const k = Math.floor((room - ex) / W);
  const w = k >= 1 ? `${W * k + ex}px` : '', h = k >= 1 ? `${H * k + ey}px` : '';
  if (cv.style.width === w) return;                        // same width: write nothing, or the observer loops on its own change
  requestAnimationFrame(() => { cv.style.width = w; cv.style.height = h; });  // next frame, so the write is not inside the observer's own pass
}
new ResizeObserver(snap).observe(cv.parentElement);      // on load, on resize, and when the frame's layout settles
for (const h of document.querySelectorAll('.fold > h2')) h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
cv.addEventListener('click', (ev) => {
  const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * H / r.height;
  const hit = HIT.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  if (hit) openFold(hit.open, true);
});

function tick(ms) {
  const t = ms / 1000, rt = t - R.t0;
  if (LIVE && !R.manual) return liveTick(t);
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
      ? (R.plan.length ? `${R.plan.length} stops in the session; press Replay to watch them again` : '')
      : `stop ${n + 1} of ${R.plan.length} · ${clock(now.when)} · ${CAPTION[now.kind]}, ${AT[now.place] || now.place}`;
  }
  // the replay over (or none to play): she is asleep in her futon until the next session
  show(t, !done, place, kind);
  document.getElementById('caption').textContent = done ? (R.plan.length ? 'asleep' : 'asleep, waiting for the first session') : (CAPTION[kind] || '…');
  requestAnimationFrame(tick);
}

// awake right now: she stands where the watcher last saw her
function liveTick(t) {
  if (R.shown !== 'live' || R.liveKey !== LIVE.kind + LIVE.place + LIVE.since) {
    R.shown = 'live'; R.liveKey = LIVE.kind + LIVE.place + LIVE.since;
    document.getElementById('dots').replaceChildren();
    document.getElementById('step').textContent = `since ${clock(LIVE.since)} · ${CAPTION[LIVE.kind]}, ${AT[LIVE.place] || LIVE.place}`;
  }
  show(t, true, LIVE.place, LIVE.kind);
  document.getElementById('caption').textContent = `awake now: ${CAPTION[LIVE.kind]}`;
  requestAnimationFrame(tick);
}

// ------------------------------------------------------------------ go
(async () => {
  const names = ['bench', 'shelf', 'board', 'cloud', 'quill', 'desk', 'wall'];
  const files = await Promise.all([...names.map((n) => get(`state/${n}.json`)), get('state/log.jsonl', 'jsonl'), get('quill-notebook.md', 'text')]);
  names.forEach((n, k) => { S[n] = files[k]; });
  S.log = files[names.length];
  S.notebook = files[names.length + 1];
  // The season (J's design, 15 Oct 2026): one direction at a time, his pen, copied by the
  // launcher into state/season.txt before each wake; shown under her paragraph, hidden when empty.
  const season = await get('state/season.txt', 'text');
  const line = season.ok ? season.data.trim().replace(/^\*\*Set [^*]*\*\*\s*/, '') : '';
  const el = document.getElementById('season');
  if (el && line) { el.textContent = `This season: ${line}`; el.hidden = false; }
  await loadUsed();
  try { drawLists(); } catch (e) { console.warn('lists', e); }
  placed();
  await askNow();
  setInterval(askNow, 15000);
  planReplay();
  requestAnimationFrame(tick);
})();
