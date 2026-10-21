// cards.js: the room's files and the cards drawn from them, shared by the room page
// (room.js, which opens one card over the picture when a thing in it is clicked) and the
// records page (records.js: the full log, Quill's full ledger, the desk's history).
// Moved whole out of room.js on 19 Oct 2026 (the room plan of that day, section 3).
//
// Reads state/*.json, state/log.jsonl, quill-notebook.md, shelf/*.md and a build's
// demo.html or demo.txt; writes nothing to the repo. The one thing it sends: a press of
// "I used this" on a bench card goes to the door (POST /used), whose counts it reads back
// (GET /used, else state/used.json, the copy log-run.mjs keeps). Every list passes
// through visible() first, so an item marked "private": true is never drawn (the real
// drawer is room/drawer/, which git never publishes; the flag is the second fence).
//
// Every renderer RETURNS its nodes and writes into no fixed element. The old drawLists
// wrote straight to #quill, #notebook, #desk and #log with no guard, so a missing node
// threw and silently lost every list drawn after it (the 19 Oct survey's landmine).
import { visible, validate, lastDesk, DOOR } from './lib.mjs';

// ------------------------------------------------------------------ the files
export const get = async (path, kind) => {
  try {
    const r = await fetch(path, { cache: 'no-cache' });
    if (!r.ok) return { ok: false };
    if (kind === 'text') return { ok: true, data: await r.text() };
    if (kind === 'jsonl') return { ok: true, data: (await r.text()).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) };
    return { ok: true, data: JSON.parse(await r.text()) };
  } catch { return { ok: false }; }
};
export const S = {};
export async function loadAll() {
  const names = ['bench', 'shelf', 'board', 'cloud', 'quill', 'desk', 'wall', 'objects', 'slots'];
  const files = await Promise.all([...names.map((n) => get(`state/${n}.json`)), get('state/log.jsonl', 'jsonl'), get('quill-notebook.md', 'text'), get('state/season.txt', 'text'), get('state/now.json')]);
  names.forEach((n, k) => { S[n] = files[k]; });
  [S.log, S.notebook, S.season, S.now] = files.slice(names.length);
  await loadUsed();
}
// The season (J's design, 15 Oct 2026): one direction at a time, his pen, copied by the
// launcher into state/season.txt before each wake; empty when there is none.
export const seasonLine = () => (S.season && S.season.ok ? S.season.data.trim().replace(/^\*\*Set [^*]*\*\*\s*/, '') : '');
// The "I used this" counts: the door's when it answers, else the copy log-run.mjs keeps.
let USED = {};
export async function loadUsed() {
  try {
    const r = await fetch(`${DOOR}/used`, { cache: 'no-cache' });
    const c = r.ok ? (await r.json()).counts : null;
    if (c && typeof c === 'object') { USED = c; return; }
  } catch { /* the door is down; the file below */ }
  const f = await get('state/used.json');
  if (f.ok && f.data && typeof f.data === 'object' && !Array.isArray(f.data)) USED = f.data;
}

// ------------------------------------------------------------------ small DOM helpers (text only; never her words as HTML)
export const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
  for (const k of kids) e.append(k instanceof Node ? k : document.createTextNode(String(k ?? '')));
  return e;
};
const note = (text, cls = 'empty') => el('p', { class: cls }, text);
export const day = (iso) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }) : ''; };
export const clock = (iso) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Bangkok' }).toLowerCase().replace(' ', '') : ''; };
// a path from a state file is used only if it stays inside its own folder (or that
// folder under first-day/, where the first day's things moved at the reset of 13 Oct 2026,
// or under wall/, where the sweep moves a thing's files with its row)
const safe = (p, folder, ext) => (typeof p === 'string' && [`${folder}/`, `first-day/${folder}/`, `wall/${folder}/`].some((f) => p.startsWith(f)) && !p.includes('..') && (!ext || p.endsWith(ext)) ? p : null);

// A list: { items } when there is something to draw, else { msg } (a missing or broken
// file says so, and the rest of the page carries on).
function listOf(name) {
  const f = S[name];
  if (!f || !f.ok) return { items: [], msg: note('this file could not be read', 'bad') };
  const v = validate(name, f.data);
  const items = visible(f.data);
  if (!v.ok) console.warn(`${name}.json:`, v.problems);
  return items.length ? { items } : { items, msg: note('nothing here yet') };
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
// a page opens inside its own card
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
// A build shows itself when it can (J, 12 Oct 2026: a showcase, not a link to
// GitHub): bench/<id>/demo.html, a page the build wrote for a browser, is shown in
// place; else bench/<id>/demo.txt, what the build prints, is shown as text; else
// nothing but the link. The hour learns this from state/README.md.
async function showFace(path, into) {
  const has = async (f) => { try { return (await fetch(`${path}/${f}`, { method: 'HEAD', cache: 'no-cache' })).ok; } catch { return false; } };
  if (await has('demo.html')) { into.append(el('iframe', { src: `${path}/demo.html`, title: 'the build, running', loading: 'lazy' })); into.closest('.card').classList.add('faced'); }
  else if (await has('demo.txt')) { const f = await get(`${path}/demo.txt`, 'text'); if (f.ok) { into.append(el('pre', { class: 'well' }, f.data)); into.closest('.card').classList.add('faced'); } }
}
// a kit table; on a phone each row stacks, every cell under its column's name (data-l)
// (`wide` names the long columns: on a phone they take a whole line, after the short ones)
const table = (heads, rows, wide = []) => el('div', { class: 'tablewrap' }, el('table', { class: 'rows' },
  el('tr', {}, ...heads.map((h, k) => el('th', { class: wide.includes(k) ? 'w' : undefined }, h))),
  ...rows.map((cells) => el('tr', {}, ...cells.map((c, k) => {
    const td = c instanceof Node ? c : el('td', { 'data-l': heads[k] }, c);
    if (wide.includes(k)) td.classList.add('w');
    return td;
  })))));
const many = (n, one, more = `${one}s`) => (n ? `${n} ${n === 1 ? one : more}` : 'nothing yet');

// ------------------------------------------------------------------ the renderers: each returns { count, node }
export const render = {
  bench() {
    const { items, msg } = listOf('bench');
    return { count: many(items.length, 'build'), node: msg || el('div', { class: 'cards' }, ...items.map(benchCard)) };
  },
  board() {
    const { items, msg } = listOf('board');
    return { count: many(items.length, 'pin'), node: msg || el('div', { class: 'cards' }, ...items.map(boardCard)) };
  },
  shelf() {
    const { items, msg } = listOf('shelf');
    return { count: many(items.length, 'page'), node: msg || el('div', { class: 'cards' }, ...items.map(shelfCard)) };
  },
  cloud() {
    const { items, msg } = listOf('cloud');
    return { count: many(items.length, 'thought'), node: msg || el('ul', { class: 'lines' }, ...items.map((c) => el('li', {}, c.text || '', el('span', { class: 'meta' }, day(c.at))))) };
  },
  // the desk: this wake's two things, how each was put out, which she took up;
  // with history (the records page), every desk before it too, newest first
  desk({ history = false } = {}) {
    const { items, msg } = listOf('desk');
    if (msg) return { count: 'nothing yet', node: msg };
    const link = (d) => { const href = /^https?:\/\//.test(String(d.url || '')) ? d.url : null; return href ? el('a', { href, rel: 'noopener' }, d.title || href) : (d.title || ''); };
    const shown = (d) => (d.door === 'picture' && /^https:\/\//.test(String(d.shown))
      ? el('img', { src: d.shown, alt: d.title || '', loading: 'lazy' })
      : el('div', { class: 'note' }, d.shown || ''));
    const today = lastDesk(items);
    const older = history ? items.filter((d) => !today.includes(d)).reverse() : [];
    return { count: history ? many(items.length, 'thing') : many(today.length, 'thing'), node: el('div', { class: 'desk' },
      el('div', { class: 'cards' }, ...today.map((d) => el('div', { class: 'card' },
        el('div', { class: 'tags' }, el('span', { class: 'tag' }, d.pool ? `${d.pool} · ${d.door}` : (d.kind || '')), d.taken ? el('span', { class: 'tag fill' }, 'taken') : ''),
        el('div', { class: 'title' }, link(d)), d.pool && d.shown !== d.title ? shown(d) : '', el('div', { class: 'meta' }, day(d.at))))),
      ...(older.length ? [el('p', { class: 'label' }, 'Before that'), el('ul', { class: 'plain' }, ...older.map((d) => el('li', {}, link(d),
        el('span', { class: 'meta' }, ` · ${d.pool ? `${d.pool}/${d.door}` : d.kind || ''}${d.taken ? ', taken' : ''}, ${day(d.at)}`))))] : [])) };
  },
  // Quill's notebook: its last lines (the whole file is one click away)
  notebook({ last = 3 } = {}) {
    const nb = S.notebook;
    const all = nb && nb.ok ? nb.data.split('\n').filter((l) => /^- /.test(l)) : [];
    const lines = all.slice(-last);
    return { count: many(all.length, 'line'), node: el('div', {}, lines.length
      ? el('ul', { class: 'lines' }, ...lines.map((l) => {
        const m = /^- (\d{4}-\d\d-\d\d)\s+(\S+)\s+(.*)$/.exec(l);
        return m ? el('li', {}, el('span', { class: 'label' }, `${day(m[1])} · ${m[2]}`), el('div', {}, m[3])) : el('li', {}, l.slice(2));
      }))
      : note(nb && nb.ok ? 'nothing written yet' : 'the notebook could not be read'),
    el('p', { class: 'meta' }, el('a', { href: 'quill-notebook.md' }, 'the whole notebook'))) };
  },
  // Quill's ledger: the score always; the table only when full (the records page)
  quill({ full = false } = {}) {
    const { items, msg } = listOf('quill');
    if (msg) return { count: 'nothing yet', node: msg };
    // the no's March has since judged right or wrong
    const nos = items.filter((q) => q.verdict === 'no'), right = nos.filter((q) => q.judged === 'right').length, wrong = nos.filter((q) => q.judged === 'wrong').length;
    const yes = items.filter((q) => q.door !== 'talk' && q.verdict === 'yes').length, talks = items.filter((q) => q.door === 'talk').length;
    const score = el('p', { class: 'meta' }, `${yes} yes, ${nos.length} no, ${talks} talks in all. ${right + wrong} no's judged so far: ${right} right, ${wrong} wrong.`);
    if (!full) return { count: many(items.length, 'call'), node: score };
    // a talk asks no verdict, so its row has none
    return { count: many(items.length, 'call'), node: el('div', { class: 'quill' }, score,
      table(['when', 'door', 'what', 'verdict', 'why', 'judged'], items.map((q) => [day(q.at), q.door || '', q.subject || '',
        q.door === 'talk' ? '' : q.verdict === 'no' ? el('td', { 'data-l': 'verdict', class: 'verdict-no' }, 'NO') : q.verdict || '',
        q.reason || '', q.judged && q.judged !== 'unknown' ? q.judged : '']), [2, 4])) };
  },
  // the wall: everything ever made, grouped by the day it was made, newest first
  wall() {
    const { items, msg } = listOf('wall');
    if (msg) return { count: 'nothing yet', node: msg };
    const days = [];
    for (const w of items) { const last = days[days.length - 1]; if (last && last.day === w.day) last.items.push(w); else days.push({ day: w.day, items: [w] }); }
    const make = { bench: benchCard, shelf: shelfCard, board: boardCard };
    return { count: many(items.length, 'thing'), node: el('div', { class: 'wall-days' }, ...days.flatMap((g) => [
      el('div', { class: 'day-head' }, el('div', { class: 'label' }, many(g.items.length, 'thing')), el('h3', { class: 'display' }, day(g.day))),
      el('div', { class: 'cards' }, ...g.items.filter((w) => make[w.kind]).map((w) => make[w.kind](w))),
    ])) };
  },
  // the log: one line a session, newest first
  log() {
    const log = S.log;
    if (!log || !log.ok) return { count: 'nothing yet', node: note('this file could not be read', 'bad') };
    if (!log.data.length) return { count: 'nothing yet', node: note('no session has run yet') };
    return { count: many(log.data.length, 'session'), node: el('div', { class: 'log' }, table(['when', 'min', 'run', 'made', 'Quill'], [...log.data].reverse().map((e) => {
      const q = e.quill || {}, steps = (e.bench_steps || []).reduce((n, s) => n + (Number(s.n) || 0), 0);
      return [`${day(e.started)}, ${clock(e.started)}`, String(Math.round((e.seconds || 0) / 60)),
        `${e.verdict || '?'}${e.broken && e.broken.length ? `; ${e.broken.length} file(s) did not parse` : ''}`,
        `${e.pins || 0} pins, ${steps} bench steps, ${e.cloud || 0} thoughts, ${e.shelf || 0} pages`,
        `${q.yes || 0} yes / ${q.no || 0} no${q.talks ? `, ${q.talks} talks` : ''}`];
    }), [3])) };
  },
};
