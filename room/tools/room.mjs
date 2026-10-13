#!/usr/bin/env node
// room.mjs: the one way March writes the room's four lists in her hour, so she
// never edits JSON by hand (round two, J's yes 12 Oct 2026). Granted to the hour
// by exact path (free-hour.sh: Bash(node <this file>:*)); the Write/Edit grants
// on state/ are gone, so a slip can no longer break a file until morning.
//
// Every command reads the list, changes it, runs lib.mjs validate() on the WHOLE
// list, and writes only if that passes; otherwise it prints one line
// "refused: ..." and exits 2 with the file untouched. Times come from the clock
// (Chiang Mai, +07:00), never typed. Ids are [a-z0-9-]+.
//
//   node room.mjs thought "<text>" [--private]        cloud: a thought
//   node room.mjs drop-thought <id>                   cloud: a thread picked up
//   node room.mjs build <id> "<title>" [--private]    bench: a new build, status half
//   node room.mjs step <id> "<note>"                  bench: one step
//   node room.mjs status <id> half|done|dropped       bench
//   node room.mjs used <id> "<who>" "<how>"           bench: someone used it
//   node room.mjs page <id> "<title>" shelf/<file>.md [--private]
//   node room.mjs quill build|pin|finish|talk|sentence "<subject>" yes|no "<reason>" "<Quill's NOTEBOOK line>"
//                                                     (a talk asks no verdict: pass yes)
//   node room.mjs judged <quill-id> right|wrong       an old verdict, judged later
//   node room.mjs desk <desk-id>                      the desk: the item you took up
//
// It writes state/{cloud,bench,shelf,quill}.json, `taken` on today's desk items,
// `used_by` on a bench item already on the wall, and appends Quill's notebook line
// to quill-notebook.md; nothing else. board.json is pin.sh's; log.jsonl, now.json
// and used.json are the clock's, and so is the rest of desk.json.
//
//   ROOM_DAY_ENDS=1 node room.mjs day-ends            the launcher's, before each wake
// moves everything on the bench, shelf and board onto the front of wall.json, their
// files into wall/ (the levers plan, 13 Oct 2026), and empties those three, so she wakes to an empty room and the page keeps it all
// (J's decision 1, 13 Oct 2026). It needs ROOM_DAY_ENDS=1 because her grant names
// this file with any words after it, and a wall-sweep in the middle of her session
// would take her own work off "today" before the page showed it.
// ROOM_STATE points it at a copy of state/ for the tests only (the notebook then
// lives in that copy too).
import { readFileSync, writeFileSync, appendFileSync, existsSync, realpathSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, lastDesk } from '../lib.mjs';

const ROOM = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STATE = process.env.ROOM_STATE || join(ROOM, 'state');
const NOTEBOOK = process.env.ROOM_STATE ? join(STATE, 'quill-notebook.md') : join(ROOM, 'quill-notebook.md');

const refuse = (why) => { console.log(`refused: ${why}`); process.exit(2); };
const args = process.argv.slice(2);
const priv = args.includes('--private');
const [cmd, ...rest] = args.filter((a) => a !== '--private');

// The day only, never the clock (J's word, 12 Oct 2026, 11:53am): a clock time in
// anything she reads at wake told her "it has only been a minute" and she stopped.
// The page shows days for these fields anyway; log.jsonl keeps real times (hers to
// never read; the replay needs them).
const now = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const stamp = () => now().replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6);
const ID = /^[a-z0-9-]{1,40}$/;   // 40: the door's /used takes no longer id
const need = (v, what) => { if (typeof v !== 'string' || !v.trim()) refuse(`${cmd} needs ${what}`); return v; };
const idOk = (v, what = 'an id') => { need(v, what); if (!ID.test(v)) refuse(`"${v}" is not an id (small letters, digits and dashes, at most 40)`); return v; };

const read = (name) => {
  const p = join(STATE, `${name}.json`);
  if (!existsSync(p)) return [];
  try { const d = JSON.parse(readFileSync(p, 'utf8')); return Array.isArray(d) ? d : refuse(`${name}.json is not a list; fix it by hand first`); }
  catch { return refuse(`${name}.json does not parse; fix it by hand first`); }
};
const write = (name, list, said) => {
  const v = validate(name, list);
  if (!v.ok) refuse(v.problems.join('; '));
  writeFileSync(join(STATE, `${name}.json`), JSON.stringify(list, null, 2) + '\n');
  console.log(said);
};
const find = (list, id, name) => list.find((i) => i && i.id === id) || refuse(`no ${name} item "${id}"`);
// a fresh id for an item that has none of its own: <prefix>-<stamp>[-<middle>]-<n>
const freshId = (list, prefix, middle = '') => {
  const ids = new Set(list.map((i) => i && i.id));
  for (let n = 1; ; n++) { const id = `${prefix}-${stamp()}${middle ? `-${middle}` : ''}-${n}`; if (!ids.has(id)) return id; }
};
const mark = (item) => (priv ? { ...item, private: true } : item);
// an id already on the wall is taken for good: its files still sit at bench/<id>/ or shelf/
const onWall = (kind, id) => read('wall').some((i) => i && i.kind === kind && i.id === id);

switch (cmd) {
  case 'thought': {
    const list = read('cloud');
    const item = mark({ id: freshId(list, 'c'), at: now(), text: need(rest[0], 'the thought, in quotes') });
    write('cloud', [...list, item], `cloud: ${item.id}`);
    break;
  }
  case 'drop-thought': {
    const list = read('cloud'), id = idOk(rest[0]);
    find(list, id, 'cloud');
    write('cloud', list.filter((i) => !i || i.id !== id), `cloud: dropped ${id}`);
    break;
  }
  case 'build': {
    const list = read('bench'), id = idOk(rest[0]);
    if (list.some((i) => i && i.id === id)) refuse(`bench already has "${id}"`);
    if (onWall('bench', id)) refuse(`"${id}" is already on the wall; pick another id`);
    const at = now();
    write('bench', [...list, mark({ id, title: need(rest[1], 'a title, in quotes'), started: at, updated: at, status: 'half', path: `bench/${id}`, steps: [], used_by: [] })], `bench: ${id}`);
    break;
  }
  case 'step': {
    const list = read('bench'), b = find(list, idOk(rest[0]), 'bench'), at = now();
    b.steps = [...(Array.isArray(b.steps) ? b.steps : []), { at, note: need(rest[1], 'a note, in quotes') }];
    b.updated = at;
    write('bench', list, `bench: ${b.id} step ${b.steps.length}`);
    break;
  }
  case 'status': {
    const list = read('bench'), b = find(list, idOk(rest[0]), 'bench');
    b.status = need(rest[1], 'half, done or dropped');
    b.updated = now();
    write('bench', list, `bench: ${b.id} is ${b.status}`);
    break;
  }
  case 'used': {
    // a build used again is most often one already on the wall (the bench test)
    const id = idOk(rest[0]);
    const bench = read('bench'), wall = read('wall');
    const name = bench.some((i) => i && i.id === id) ? 'bench' : 'wall';
    const list = name === 'bench' ? bench : wall;
    const b = list.find((i) => i && i.id === id && (name === 'bench' || i.kind === 'bench')) || refuse(`no build "${id}" on the bench or the wall`);
    b.used_by = [...(Array.isArray(b.used_by) ? b.used_by : []), { who: need(rest[1], 'who used it'), at: now(), how: need(rest[2], 'how it was used') }];
    write(name, list, `${name}: ${b.id} used ${b.used_by.length}×`);
    break;
  }
  case 'page': {
    const list = read('shelf'), id = idOk(rest[0]), title = need(rest[1], 'a title, in quotes'), path = need(rest[2], 'the path, shelf/<file>.md');
    if (!/^shelf\/[A-Za-z0-9._-]+\.md$/.test(path)) refuse('the path must be shelf/<file>.md');
    const full = resolve(ROOM, path);
    const rel = relative(join(ROOM, 'shelf'), full);
    if (rel.startsWith('..') || isAbsolute(rel)) refuse('the path must stay inside shelf/');
    if (!existsSync(full) || relative(realpathSync(join(ROOM, 'shelf')), realpathSync(full)).startsWith('..')) refuse(`${path} does not exist yet; write the page first`);
    if (list.some((i) => i && i.id === id)) refuse(`shelf already has "${id}"`);
    if (onWall('shelf', id)) refuse(`"${id}" is already on the wall; pick another id`);
    write('shelf', [...list, mark({ id, title, at: now(), path })], `shelf: ${id}`);
    break;
  }
  case 'quill': {
    const list = read('quill'), door = need(rest[0], 'a door: build, pin, finish, talk or sentence');
    const item = { id: freshId(list, 'q', /^[a-z]+$/.test(door) ? door : 'x'), at: now(), door, subject: need(rest[1], 'the subject, in quotes'),
      verdict: need(rest[2], 'yes or no'), reason: need(rest[3], "Quill's reason, in quotes"), judged: 'unknown' };
    // Quill's notebook (quill.md): its own NOTEBOOK line, verbatim, one line a call,
    // dated by the day only (J's word, 12 Oct 2026: no clock time in what she reads)
    const note = need(rest[4], "Quill's NOTEBOOK line, in quotes, as the fifth word").replace(/^\s*NOTEBOOK:\s*/i, '').replace(/\s+/g, ' ').trim();
    if (!note) refuse("Quill's NOTEBOOK line is empty");
    write('quill', [...list, item], `quill: ${item.id}`);
    appendFileSync(NOTEBOOK, `- ${now()}  ${door}  ${note}\n`);
    break;
  }
  case 'desk': {
    const list = read('desk'), id = idOk(rest[0], 'a desk id');
    const d = lastDesk(list).find((i) => i.id === id) || refuse(`"${id}" is not on today's desk`);
    d.taken = now();
    write('desk', list, `desk: took ${d.id}`);
    break;
  }
  case 'day-ends': {
    if (process.env.ROOM_DAY_ENDS !== '1') refuse('day-ends is the launcher\'s, before a wake');
    const wall = read('wall'), moved = [];
    const has = new Set(wall.map((i) => i && `${i.kind}:${i.id}`));
    for (const [kind, when] of [['bench', 'started'], ['shelf', 'at'], ['board', 'at']]) {
      // lists are appended oldest first, the wall is newest first
      for (const item of [...read(kind)].reverse()) {
        if (!item || has.has(`${kind}:${item.id}`)) continue;  // already moved by a run that stopped halfway
        moved.push({ ...item, kind, day: String(item[when] || '').slice(0, 10) });
      }
    }
    moved.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
    const v = validate('wall', [...moved, ...wall]);
    if (!v.ok) refuse(v.problems.join('; '));
    // The files go with the row (the levers plan, step 0.1, 13 Oct 2026): a build's
    // folder left in bench/ was one search away, and in Test D she found the wan-phra
    // folder that way, so the room was empty on the lists only. bench/<id>, shelf/<f>.md
    // and board/<id>.jpg move to wall/bench/, wall/shelf/, wall/board/, and the row's
    // path or thumb follows. Never overwrites; a stop halfway is picked up next time
    // (the file is already there, so the row is pointed at it). With ROOM_STATE (the
    // tests) files move only when ROOM_ROOT names the copy's room folder.
    const FILES = process.env.ROOM_STATE ? process.env.ROOM_ROOT : ROOM;
    const carry = (rel) => {
      const r = String(rel).replace(/\/$/, '');
      if (!FILES || !/^(bench|shelf|board)\/[A-Za-z0-9._-]+$/.test(r)) return rel;
      const from = join(FILES, r), to = join(FILES, 'wall', r);
      if (existsSync(to)) return `wall/${r}`;
      if (!existsSync(from)) return rel;
      mkdirSync(dirname(to), { recursive: true });
      renameSync(from, to);
      return `wall/${r}`;
    };
    for (const m of moved) {
      if (typeof m.path === 'string') m.path = carry(m.path);
      if (typeof m.thumb === 'string') m.thumb = carry(m.thumb);
    }
    // the wall first, then the emptying: a stop in between leaves duplicates the next run skips
    writeFileSync(join(STATE, 'wall.json'), JSON.stringify([...moved, ...wall], null, 2) + '\n');
    for (const kind of ['bench', 'shelf', 'board']) writeFileSync(join(STATE, `${kind}.json`), '[]\n');
    console.log(`day-ends: ${moved.length} moved to the wall`);
    break;
  }
  case 'judged': {
    const list = read('quill'), q = find(list, idOk(rest[0], 'a quill id'), 'quill');
    if (!['right', 'wrong'].includes(rest[1])) refuse('judged is right or wrong');
    q.judged = rest[1];
    write('quill', list, `quill: ${q.id} judged ${rest[1]}`);
    break;
  }
  default:
    refuse(`unknown command "${cmd || ''}"; the commands are listed at the top of tools/room.mjs`);
}
