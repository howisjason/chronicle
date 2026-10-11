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
//   node room.mjs quill build|pin|finish "<subject>" yes|no "<reason>"
//   node room.mjs judged <quill-id> right|wrong       an old verdict, judged later
//
// It writes state/{cloud,bench,shelf,quill}.json and nothing else. board.json is
// pin.sh's; log.jsonl, now.json, desk.json and used.json are the clock's.
// ROOM_STATE points it at a copy of state/ for the tests only.
import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../lib.mjs';

const ROOM = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STATE = process.env.ROOM_STATE || join(ROOM, 'state');

const refuse = (why) => { console.log(`refused: ${why}`); process.exit(2); };
const args = process.argv.slice(2);
const priv = args.includes('--private');
const [cmd, ...rest] = args.filter((a) => a !== '--private');

const now = () => new Date(Date.now() + 7 * 3600e3).toISOString().replace(/\.\d{3}Z$/, '+07:00');
const stamp = () => now().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
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
    const list = read('bench'), b = find(list, idOk(rest[0]), 'bench');
    b.used_by = [...(Array.isArray(b.used_by) ? b.used_by : []), { who: need(rest[1], 'who used it'), at: now(), how: need(rest[2], 'how it was used') }];
    write('bench', list, `bench: ${b.id} used ${b.used_by.length}×`);
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
    write('shelf', [...list, mark({ id, title, at: now(), path })], `shelf: ${id}`);
    break;
  }
  case 'quill': {
    const list = read('quill'), door = need(rest[0], 'a door: build, pin or finish');
    const item = { id: freshId(list, 'q', /^[a-z]+$/.test(door) ? door : 'x'), at: now(), door, subject: need(rest[1], 'the subject, in quotes'),
      verdict: need(rest[2], 'yes or no'), reason: need(rest[3], "Quill's reason, in quotes"), judged: 'unknown' };
    write('quill', [...list, item], `quill: ${item.id}`);
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
