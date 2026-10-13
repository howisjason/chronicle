// room.test.mjs: the room's pure functions (lib.mjs). Plain node:test, run with
//   node --test timing.test.mjs station/validate.test.mjs room/room.test.mjs
// Every promise the room makes about privacy has a test here that plants the
// wrong input and watches it refused (the twin law: a check must show the bad
// case fails, not only that the good case passes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kindOf, buildTrace, mergeTraces, visible, validate, formatMorningLine, sameness, lastDesk, drawnThisWake, pastReads } from './lib.mjs';

const R = '/Users/howisjason/Projects/chronicle/room';
const B = '/Users/howisjason/Projects/march-7th/march-brain';

test('kindOf follows the plan table, row by row', () => {
  const rows = [
    [['Read', { file_path: `${R}/state/bench.json` }], { kind: 'reading', place: 'shelf' }],
    [['Read', { file_path: '/Users/howisjason/Projects/growth-op/README.md' }], { kind: 'reading', place: 'desk' }],
    [['Glob', { path: `${R}/bench`, pattern: '*' }], { kind: 'reading', place: 'shelf' }],
    [['Grep', { pattern: 'x', path: '/tmp' }], { kind: 'reading', place: 'desk' }],
    [['WebSearch', { query: 'anything' }], { kind: 'searching', place: 'desk' }],
    [['WebFetch', { url: 'https://example.com' }], { kind: 'searching', place: 'desk' }],
    [['Write', { file_path: `${R}/bench/clock/main.js` }], { kind: 'building', place: 'bench' }],
    [['Edit', { file_path: `${R}/bench/clock/README.md` }], { kind: 'building', place: 'bench' }],
    [['Bash', { command: `bash ${R}/tools/try.sh clock main.js` }], { kind: 'building', place: 'bench' }],
    [['Write', { file_path: `${R}/shelf/on-vega.md` }], { kind: 'writing', place: 'shelf' }],
    [['Edit', { file_path: `${R}/state/shelf.json` }], { kind: 'writing', place: 'shelf' }],
    [['Edit', { file_path: `${R}/state/cloud.json` }], { kind: 'thinking', place: 'cloud' }],
    [['Bash', { command: `bash ${R}/tools/pin.sh https://example.com "t" "n"` }], { kind: 'pinning', place: 'board' }],
    [['Edit', { file_path: `${R}/state/board.json` }], { kind: 'pinning', place: 'board' }],
    [['Agent', { description: 'Quill', prompt: '...' }], { kind: 'checking', place: 'quill' }],
    [['Edit', { file_path: `${B}/inner-life/diary/2026-10-12.md` }], { kind: 'private', place: 'drawer' }],
    [['Write', { file_path: `${B}/inner-life/memory/x.md` }], { kind: 'private', place: 'drawer' }],
    [['Write', { file_path: `${R}/drawer/cloud.json` }], { kind: 'private', place: 'drawer' }],
    [['ToolSearch', { query: 'select:WebSearch' }], { kind: 'idle', place: 'none' }],
    [['Bash', { command: 'echo hi' }], { kind: 'idle', place: 'none' }],
    [['Bash', { command: `node ${R}/tools/room.mjs thought "a secret thought"` }], { kind: 'thinking', place: 'cloud' }],
    [['Bash', { command: `node ${R}/tools/room.mjs step clock "x"` }], { kind: 'building', place: 'bench' }],
    [['Bash', { command: `node ${R}/tools/room.mjs page on-vega "On Vega" shelf/on-vega.md` }], { kind: 'writing', place: 'shelf' }],
    [['Bash', { command: `node ${R}/tools/room.mjs quill pin "x" yes "y"` }], { kind: 'idle', place: 'none' }],
    [['Edit', { file_path: `${R}/state/quill.json` }], { kind: 'idle', place: 'none' }],
    [['Bash', { command: `node ${R}/tools/room.mjs desk d-20261014-ab12-a` }], { kind: 'reading', place: 'desk' }],
  ];
  for (const [[name, input], want] of rows) assert.deepEqual(kindOf(name, input), want, `${name} ${JSON.stringify(input)}`);
});

test('reading her own diary or memories also shows only the drawer', () => {
  assert.deepEqual(kindOf('Read', { file_path: `${B}/inner-life/diary/2026-10-12.md` }), { kind: 'private', place: 'drawer' });
});

const rec = (iso, name, input) => ({ timestamp: iso, message: { content: [{ type: 'tool_use', id: 'x', name, input }] } });

test('the trace carries t, kind and place only, never a path or a word', () => {
  const start = Date.parse('2026-10-12T00:00:00Z');
  const records = [
    { timestamp: '2026-10-12T00:00:00Z', message: { content: 'the prompt, which is words' } },
    rec('2026-10-12T00:00:05Z', 'Edit', { file_path: `${B}/inner-life/diary/2026-10-12.md`, old_string: 'a secret', new_string: 'a secret line' }),
    rec('2026-10-12T00:00:09Z', 'WebSearch', { query: 'something private-sounding' }),
    rec('2026-10-12T00:00:10Z', 'WebFetch', { url: 'https://example.com/a' }),
    rec('2026-10-12T00:00:30Z', 'ToolSearch', { query: 'x' }),
    rec('2026-10-12T00:01:00Z', 'Write', { file_path: `${R}/bench/clock/main.js`, content: 'code' }),
  ];
  const tr = buildTrace(records, start);
  assert.deepEqual(tr, [
    { t: 5, kind: 'private', place: 'drawer' },
    { t: 9, kind: 'searching', place: 'desk' },
    { t: 60, kind: 'building', place: 'bench' },
  ]);
  for (const e of tr) assert.deepEqual(Object.keys(e).sort(), ['kind', 'place', 't']);
  const flat = JSON.stringify(tr);
  for (const leak of ['diary', 'secret', 'private-sounding', 'example.com', 'clock', 'main.js', '/Users']) assert.ok(!flat.includes(leak), leak);
});

test('a helper\'s calls draw as Quill checking, merged in time order', () => {
  const start = Date.parse('2026-10-12T00:00:00Z');
  const main = buildTrace([rec('2026-10-12T00:00:01Z', 'Read', { file_path: '/a' }), rec('2026-10-12T00:00:20Z', 'Agent', { description: 'Quill' })], start);
  const sub = buildTrace([rec('2026-10-12T00:00:22Z', 'Read', { file_path: `${R}/quill.md` })], start, { kind: 'checking', place: 'quill' });
  assert.deepEqual(mergeTraces(main, sub), [{ t: 1, kind: 'reading', place: 'desk' }, { t: 20, kind: 'checking', place: 'quill' }]);
});

test('visible drops private items and keeps the rest', () => {
  const items = [{ id: 'a' }, { id: 'b', private: true }, { id: 'c', private: false }, null];
  assert.deepEqual(visible(items).map((i) => i.id), ['a', 'c']);
  assert.deepEqual(visible(undefined), []);
  assert.deepEqual(visible({ not: 'a list' }), []);
});

test('validate refuses a missing id or at, and a bad bench status', () => {
  assert.equal(validate('cloud', [{ id: 'a', at: '2026-10-12T07:01:00+07:00', text: 'x' }]).ok, true);
  assert.equal(validate('cloud', [{ at: '2026-10-12T07:01:00+07:00', text: 'x' }]).ok, false);
  assert.equal(validate('cloud', [{ id: 'a', text: 'x' }]).ok, false);
  assert.equal(validate('cloud', [{ id: 'a', at: 'yesterday-ish', text: 'x' }]).ok, false);
  assert.equal(validate('cloud', [{ id: 'a', at: '2026-10-12T07:01:00+07:00' }, { id: 'a', at: '2026-10-12T07:02:00+07:00' }]).ok, false);
  const bench = { id: 'clock', title: 'A clock', started: '2026-10-12T07:05:00+07:00', status: 'half', path: 'bench/clock/' };
  assert.equal(validate('bench', [bench]).ok, true);
  assert.equal(validate('bench', [{ ...bench, status: 'nearly' }]).ok, false);
  assert.equal(validate('bench', [{ ...bench, started: undefined }]).ok, false);
  assert.equal(validate('quill', [{ id: 'q1', at: '2026-10-12T07:05:00+07:00', door: 'pin', verdict: 'maybe' }]).ok, false);
  assert.equal(validate('board', [{ id: 'p1', at: '2026-10-12T07:05:00+07:00', url: 'file:///etc/hosts' }]).ok, false);
  assert.equal(validate('shelf', 'not a list').ok, false);
});

test('validate refuses a desk item with no id, no at, or a kind it does not know', () => {
  const d = { id: 'd-20261012-070001', at: '2026-10-12T07:00:01+07:00', kind: 'wikipedia', title: 'Vega', url: 'https://en.wikipedia.org/wiki/Vega' };
  assert.equal(validate('desk', [d]).ok, true);
  assert.equal(validate('desk', [{ ...d, id: undefined }]).ok, false);
  assert.equal(validate('desk', [{ ...d, at: undefined }]).ok, false);
  assert.equal(validate('desk', [{ ...d, kind: 'tarot' }]).ok, false);
  assert.equal(validate('desk', [{ ...d, url: 'javascript:alert(1)' }]).ok, false);
});

test('the morning line, exactly', () => {
  const desk = [{ pool: 'wikipedia', door: 'summary' }, { pool: 'commons', door: 'picture' }];
  const e = { started: '2026-10-12T07:03:10+07:00', cost_usd: 1.234, cap_usd: 4, verdict: 'clean', pins: 2,
    bench_steps: [{ id: 'clock', n: 3, status: 'half' }], cloud: 1, shelf: 0, quill: { yes: 2, no: 1, called: 3, recorded: 3 }, desk, took: 'Vega', talks: 1 };
  assert.equal(formatMorningLine(e, { clock: 'A clock that knows the moon' }),
    '- **2026-10-12 — the room:** 2 pins, bench: "A clock that knows the moon" +3 steps (half), 1 in the cloud, 0 on the shelf, Quill: 2 yes / 1 no, desk: wikipedia/summary, commons/picture; took "Vega"; talks: 1; $1.23 of $4 used (31%), clean.');
  const zero = { started: '2026-10-13T07:02:00+07:00', cost_usd: 0.31, cap_usd: 4, verdict: 'clean', pins: 0, bench_steps: [], cloud: 0, shelf: 0, quill: { yes: 0, no: 0, called: 0, recorded: 0 }, desk, talks: 0 };
  assert.equal(formatMorningLine(zero), '- **2026-10-13 — the room:** nothing new in the room, desk: wikipedia/summary, commons/picture; took neither; talks: 0; $0.31 of $4 used (8%), clean.');
  assert.equal(formatMorningLine({ ...zero, used_new: 2 }), '- **2026-10-13 — the room:** 0 pins, bench: nothing new, 0 in the cloud, 0 on the shelf, Quill: 0 yes / 0 no, desk: wikipedia/summary, commons/picture; took neither; talks: 0, used: 2; $0.31 of $4 used (8%), clean.');
  // a talk with Quill is something new, even with nothing else made
  assert.match(formatMorningLine({ ...zero, talks: 2 }), /Quill: 0 yes \/ 0 no, desk: .*; talks: 2;/);
  assert.match(formatMorningLine({ ...zero, desk: [] }), /desk: nothing drawn; took neither/);
});

test('validate: the second day\'s desk, wall and Quill doors, and the bad cases refused', () => {
  const d = { id: 'd-20261014-ab12-a', at: '2026-10-14', pool: 'commons', door: 'picture', title: 'File:Owl.jpg', url: 'https://commons.wikimedia.org/wiki/File:Owl.jpg', shown: 'https://upload.wikimedia.org/x/Owl.jpg' };
  assert.equal(validate('desk', [d]).ok, true);
  assert.equal(validate('desk', [{ ...d, taken: '2026-10-14' }]).ok, true);
  assert.equal(validate('desk', [{ ...d, pool: 'openstreetmap' }]).ok, false);
  assert.equal(validate('desk', [{ ...d, door: 'smell' }]).ok, false);
  assert.equal(validate('desk', [{ ...d, shown: '' }]).ok, false);
  assert.equal(validate('desk', [{ ...d, taken: 'soon' }]).ok, false);
  const w = { id: 'clock', title: 'A clock', started: '2026-10-12', status: 'done', path: 'bench/clock', kind: 'bench', day: '2026-10-12' };
  assert.equal(validate('wall', [w, { ...w, kind: 'shelf', path: 'shelf/clock.md' }]).ok, true); // same id, two kinds
  assert.equal(validate('wall', [w, w]).ok, false);
  assert.equal(validate('wall', [{ ...w, kind: 'cloud' }]).ok, false);
  assert.equal(validate('wall', [{ ...w, day: undefined }]).ok, false);
  assert.equal(validate('wall', [{ ...w, path: undefined }]).ok, false);
  assert.equal(validate('wall', [{ id: 'p', title: 't', kind: 'board', day: '2026-10-12', url: 'file:///etc/hosts' }]).ok, false);
  const q = { id: 'q1', at: '2026-10-14', door: 'talk', subject: 'x', verdict: 'yes', reason: 'y' };
  assert.equal(validate('quill', [q, { ...q, id: 'q2', door: 'sentence' }]).ok, true);
  assert.equal(validate('quill', [{ ...q, door: 'chat' }]).ok, false);
});

test('visible drops private items from the real wall', () => {
  const wall = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'state/wall.json'), 'utf8'));
  assert.equal(validate('wall', wall).ok, true);
  const planted = [{ ...wall[0], id: 'secret', private: true }, ...wall];
  assert.deepEqual(visible(planted).map((i) => i.id), wall.map((i) => i.id));
});

test('drawnThisWake: a wake whose draw failed reports nothing, never the wake before', () => {
  const it = (id) => ({ id, pool: 'wikipedia', door: 'title' });
  const desk = [it('d-20261013-1111-a'), it('d-20261013-1111-b')];
  assert.deepEqual(drawnThisWake(desk, new Set()).map((d) => d.id), ['d-20261013-1111-a', 'd-20261013-1111-b']);
  assert.deepEqual(drawnThisWake(desk, new Set(['d-20261013-1111-a', 'd-20261013-1111-b'])), []);
  assert.deepEqual(drawnThisWake([{ id: 'd-20261012-084308', kind: 'arxiv' }], new Set()), []);
  assert.match(formatMorningLine({ started: '2026-10-14T07:00:00+07:00', cost_usd: 0, cap_usd: 5, verdict: 'clean', desk: drawnThisWake(desk, new Set(desk.map((d) => d.id))) }), /desk: nothing drawn/);
});

test('lastDesk: the newest wake\'s two items, or an old lone item', () => {
  const old = { id: 'd-20261012-084308' }, a1 = { id: 'd-20261013-1111-a' }, b1 = { id: 'd-20261013-1111-b' }, a2 = { id: 'd-20261014-2222-a' }, b2 = { id: 'd-20261014-2222-b' };
  assert.deepEqual(lastDesk([old, a1, b1, a2, b2]), [a2, b2]);
  assert.deepEqual(lastDesk([old, a1, b1, a2]), [a2]);
  assert.deepEqual(lastDesk([a1, b1, old]), [old]);
  assert.deepEqual(lastDesk([]), []);
});

// The room command, run against a COPY of state/ (ROOM_STATE), never the real lists.
const HERE = dirname(fileURLToPath(import.meta.url));
const roomCmd = (dir, ...args) => {
  try { return { code: 0, out: execFileSync('node', [join(HERE, 'tools/room.mjs'), ...args], { env: { ...process.env, ROOM_STATE: dir }, encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout) }; }
};
const copyState = () => { const d = mkdtempSync(join(tmpdir(), 'room-state-')); cpSync(join(HERE, 'state'), d, { recursive: true }); return d; };

test('the room command: a good thought lands, with a quote and a newline intact', () => {
  const d = copyState();
  const text = 'a "quoted" word\nand a second line';
  const r = roomCmd(d, 'thought', text);
  assert.equal(r.code, 0, r.out);
  const cloud = JSON.parse(readFileSync(join(d, 'cloud.json'), 'utf8'));
  const last = cloud[cloud.length - 1];
  assert.equal(last.text, text);
  assert.match(last.id, /^c-\d{8}-[a-z0-9]{4}-\d+$/);
  assert.match(last.at, /^\d{4}-\d{2}-\d{2}$/); // a day, never a clock (12 Oct 2026)
  assert.equal(validate('cloud', cloud).ok, true);
});

test('the room command refuses a bad status and leaves the file exactly as it was', () => {
  const d = copyState();
  assert.equal(roomCmd(d, 'build', 'moon-clock', 'A clock that knows the moon').code, 0);
  const before = readFileSync(join(d, 'bench.json'), 'utf8');
  const r = roomCmd(d, 'status', 'moon-clock', 'nearly');
  assert.equal(r.code, 2);
  assert.match(r.out, /^refused: /);
  assert.equal(readFileSync(join(d, 'bench.json'), 'utf8'), before);
  assert.equal(roomCmd(d, 'build', 'Bad Id!', 'x').code, 2);
  assert.equal(roomCmd(d, 'quill', 'door-nobody-keeps', 'x', 'yes', 'y', 'NOTEBOOK: a line').code, 2);
  assert.equal(roomCmd(d, 'page', 'escape', 'x', 'shelf/../../tools/room.mjs').code, 2);
  assert.equal(roomCmd(d, 'page', 'nothing-yet', 'x', 'shelf/not-written.md').code, 2);
});

test('the room command: steps, used, quill and judged land in the shapes the page reads', () => {
  const d = copyState();
  roomCmd(d, 'build', 'moon-clock', 'A clock');
  roomCmd(d, 'step', 'moon-clock', 'the first step');
  roomCmd(d, 'used', 'moon-clock', 'J', 'read the time');
  const b = JSON.parse(readFileSync(join(d, 'bench.json'), 'utf8')).find((i) => i.id === 'moon-clock');
  assert.equal(b.steps[0].note, 'the first step');
  assert.equal(b.used_by[0].who, 'J');
  const q = roomCmd(d, 'quill', 'build', 'moon-clock', 'no', 'too big', 'NOTEBOOK: shown a clock, said too big').out.trim().replace('quill: ', '');
  assert.match(q, /^q-\d{8}-[a-z0-9]{4}-build-\d+$/);
  assert.equal(roomCmd(d, 'judged', q, 'right').code, 0);
  assert.equal(roomCmd(d, 'judged', q, 'maybe').code, 2);
  const ql = JSON.parse(readFileSync(join(d, 'quill.json'), 'utf8'));
  assert.equal(ql.find((i) => i.id === q).judged, 'right');
  assert.equal(validate('quill', ql).ok, true);
});

test('pastReads counts reads of her own past before the first making step, and nothing after it', () => {
  const S = '/Users/x/Projects/march-7th/day/tests/A0/chronicle/room';
  const MB = '/Users/x/Projects/march-7th/day/tests/A0/march-brain';
  const call = (name, input) => ({ message: { content: [{ type: 'tool_use', name, input }] } });
  const recs = [
    call('Read', { file_path: `${S}/state/desk.json` }),                  // today's desk: not the past
    call('Read', { file_path: `${MB}/inner-life/memory/pole-star.md` }),  // memory
    call('Grep', { pattern: 'wan-phra', path: S }),                       // a search over the room
    call('Read', { file_path: `${S}/wall/bench/wan-phra/README.md` }),    // the wall's files
    call('Read', { file_path: '/Users/howisjason/Projects/chronicle/room/first-day/shelf/x.md' }), // the real room
    call('WebSearch', { query: 'tides' }),                                // not a read of the past
    call('Bash', { command: `node ${S}/tools/room.mjs build tides "Tides"` }), // the first making step
    call('Read', { file_path: `${S}/state/wall.json` }),                  // after it: not counted
  ];
  assert.deepEqual(pastReads(recs), { count: 4, where: ['first-day', 'memory', 'real', 'search', 'wall'] });
  assert.deepEqual(pastReads([]), { count: 0, where: [] });
  // a session that never makes anything counts every read of the past
  assert.equal(pastReads(recs.filter((r) => r.message.content[0].name !== 'Bash')).count, 5);
  // a read of something that is not hers counts nothing
  assert.deepEqual(pastReads([call('Read', { file_path: '/Users/x/Projects/growth-op/README.md' })]), { count: 0, where: [] });
});

test('sameness: the same night again is 100, a different night is 0, and nothing to compare is 0', () => {
  const night = [{ t: 0, kind: 'reading', place: 'desk' }, { t: 9, kind: 'searching', place: 'desk' }, { t: 60, kind: 'building', place: 'bench' }, { t: 90, kind: 'thinking', place: 'cloud' }];
  const other = [{ t: 0, kind: 'pinning', place: 'board' }, { t: 5, kind: 'writing', place: 'shelf' }, { t: 9, kind: 'private', place: 'drawer' }];
  assert.equal(sameness(night, [night.map((e) => ({ ...e, t: e.t + 7 }))]), 100);
  assert.equal(sameness(night, [other]), 0);
  assert.equal(sameness(night, []), 0);
  assert.equal(sameness(night, [other, night]), 100);
});

const roomEnv = (dir, env, ...args) => {
  try { return { code: 0, out: execFileSync('node', [join(HERE, 'tools/room.mjs'), ...args], { env: { ...process.env, ROOM_STATE: dir, ...env }, encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout) }; }
};
const J = (d, name) => JSON.parse(readFileSync(join(d, `${name}.json`), 'utf8'));

test('day-ends moves the bench, shelf and board to the front of the wall, empties them, and is safe twice', () => {
  const d = copyState();
  writeFileSync(join(d, 'shelf.json'), '[]\n'); writeFileSync(join(d, 'board.json'), '[]\n');
  const wallBefore = J(d, 'wall');
  assert.equal(roomCmd(d, 'build', 'tide-clock', 'A tide clock').code, 0);
  mkdirSync(join(d, '..', 'shelf'), { recursive: true });
  writeFileSync(join(d, 'board.json'), JSON.stringify([{ id: '20261014-0700-aa11', at: '2026-10-14', title: 'A pin', url: 'https://example.com', thumb: 'board/x.jpg', note: 'n' }]));
  const benchBefore = J(d, 'bench');
  assert.equal(roomCmd(d, 'day-ends').code, 2, 'refused without the launcher\'s word');
  assert.deepEqual(J(d, 'bench'), benchBefore, 'and nothing moved');
  const r = roomEnv(d, { ROOM_DAY_ENDS: '1' }, 'day-ends');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, new RegExp(`${benchBefore.length + 1} moved`));
  for (const k of ['bench', 'shelf', 'board']) assert.deepEqual(J(d, k), []);
  const wall = J(d, 'wall');
  assert.equal(wall.length, wallBefore.length + benchBefore.length + 1);
  const tide = wall.find((i) => i.id === 'tide-clock');
  assert.equal(tide.kind, 'bench'); assert.match(tide.day, /^\d{4}-\d{2}-\d{2}$/); assert.equal(tide.title, 'A tide clock');
  assert.equal(wall.find((i) => i.kind === 'board').title, 'A pin');
  assert.deepEqual(wall.slice(-wallBefore.length), wallBefore, 'the old wall stays behind the new things, untouched');
  assert.equal(validate('wall', wall).ok, true);
  const again = roomEnv(d, { ROOM_DAY_ENDS: '1' }, 'day-ends');
  assert.match(again.out, /0 moved/);
  assert.deepEqual(J(d, 'wall'), wall);
  // an id on the wall cannot be built again (its files moved to wall/bench/<id>/)
  assert.equal(roomCmd(d, 'build', 'tide-clock', 'Again').code, 2);
  // a build on the wall can still be marked used
  assert.equal(roomCmd(d, 'used', 'tide-clock', 'March', 'read a tide').code, 0);
  assert.equal(J(d, 'wall').find((i) => i.id === 'tide-clock').used_by[0].how, 'read a tide');
});

test('day-ends carries the files with the rows: bench folder, shelf page, pin picture; never overwrites, never climbs out', () => {
  const root = mkdtempSync(join(tmpdir(), 'room-root-'));
  const d = join(root, 'state');
  cpSync(join(HERE, 'state'), d, { recursive: true });
  for (const k of ['bench', 'shelf', 'board']) writeFileSync(join(d, `${k}.json`), '[]\n');
  const env = { ROOM_ROOT: root };
  assert.equal(roomEnv(d, env, 'build', 'tide-clock', 'A tide clock').code, 0);
  assert.equal(roomEnv(d, env, 'build', 'kept', 'Its wall twin exists').code, 0);
  mkdirSync(join(root, 'bench', 'tide-clock'), { recursive: true }); writeFileSync(join(root, 'bench', 'tide-clock', 'README.md'), 'tide');
  mkdirSync(join(root, 'bench', 'kept'), { recursive: true }); writeFileSync(join(root, 'bench', 'kept', 'README.md'), 'new');
  mkdirSync(join(root, 'wall', 'bench', 'kept'), { recursive: true }); writeFileSync(join(root, 'wall', 'bench', 'kept', 'README.md'), 'old');
  mkdirSync(join(root, 'shelf'), { recursive: true }); writeFileSync(join(root, 'shelf', 'on-tides.md'), '# On tides');
  writeFileSync(join(d, 'shelf.json'), JSON.stringify([{ id: 'on-tides', title: 'On tides', at: '2026-10-14', path: 'shelf/on-tides.md' }]));
  mkdirSync(join(root, 'board'), { recursive: true }); writeFileSync(join(root, 'board', 'p1.jpg'), 'jpg');
  writeFileSync(join(d, 'board.json'), JSON.stringify([
    { id: 'p1', at: '2026-10-14', title: 'A pin', url: 'https://example.com', thumb: 'board/p1.jpg', note: 'n' },
    { id: 'p2', at: '2026-10-14', title: 'A bad pin', url: 'https://example.com', thumb: 'board/../../escape.jpg', note: 'n' }]));
  const r = roomEnv(d, { ROOM_DAY_ENDS: '1', ...env }, 'day-ends');
  assert.equal(r.code, 0, r.out);
  const wall = J(d, 'wall');
  const row = (kind, id) => wall.find((i) => i.kind === kind && i.id === id);
  assert.equal(row('bench', 'tide-clock').path, 'wall/bench/tide-clock');
  assert.equal(readFileSync(join(root, 'wall', 'bench', 'tide-clock', 'README.md'), 'utf8'), 'tide');
  assert.equal(existsSync(join(root, 'bench', 'tide-clock')), false, 'the bench folder is gone from bench/');
  assert.equal(row('shelf', 'on-tides').path, 'wall/shelf/on-tides.md');
  assert.equal(existsSync(join(root, 'shelf', 'on-tides.md')), false);
  assert.equal(row('board', 'p1').thumb, 'wall/board/p1.jpg');
  // the bad cases: a path that climbs out is left alone; an existing wall folder is never overwritten
  assert.equal(row('board', 'p2').thumb, 'board/../../escape.jpg');
  assert.equal(readFileSync(join(root, 'wall', 'bench', 'kept', 'README.md'), 'utf8'), 'old', 'never overwritten');
  assert.equal(row('bench', 'kept').path, 'wall/bench/kept');
  // without ROOM_ROOT the test copy moves no files at all (a test never touches the real room)
  const d2 = copyState();
  writeFileSync(join(d2, 'bench.json'), '[]\n');
  assert.equal(roomCmd(d2, 'build', 'x1', 'X').code, 0);
  assert.equal(roomEnv(d2, { ROOM_DAY_ENDS: '1' }, 'day-ends').code, 0);
  assert.equal(J(d2, 'wall').find((i) => i.id === 'x1').path, 'bench/x1');
});

test('desk marks today\'s item taken and refuses an unknown or older id', () => {
  const d = copyState();
  const item = (id, pool) => ({ id, at: '2026-10-14', pool, door: 'title', title: id, shown: id });
  writeFileSync(join(d, 'desk.json'), JSON.stringify([item('d-20261013-1111-a', 'wikipedia'), item('d-20261013-1111-b', 'archive'), item('d-20261014-2222-a', 'commons'), item('d-20261014-2222-b', 'wiktionary')]));
  assert.equal(roomCmd(d, 'desk', 'd-20261099-0000-a').code, 2);
  assert.equal(roomCmd(d, 'desk', 'd-20261013-1111-a').code, 2, 'yesterday\'s desk is not today\'s');
  const before = readFileSync(join(d, 'desk.json'), 'utf8');
  assert.equal(readFileSync(join(d, 'desk.json'), 'utf8'), before);
  assert.equal(roomCmd(d, 'desk', 'd-20261014-2222-b').code, 0);
  const desk = J(d, 'desk');
  assert.match(desk[3].taken, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(desk[2].taken, undefined);
});

test('quill: talk and sentence doors, and the notebook line lands verbatim without its label', () => {
  const d = copyState();
  assert.equal(roomCmd(d, 'quill', 'talk', 'a question about tides', 'yes', 'Shiny.').code, 2, 'no notebook line, refused');
  assert.equal(roomCmd(d, 'quill', 'talk', 'a question about tides', 'yes', 'Shiny.', 'NOTEBOOK: she asked about tides; second sea thing this week').code, 0);
  assert.equal(roomCmd(d, 'quill', 'sentence', 'the new words', 'no', 'writes grace back in', 'NOTEBOOK: shown a new first sentence, said no').code, 0);
  const lines = readFileSync(join(d, 'quill-notebook.md'), 'utf8').trim().split('\n');
  assert.match(lines[0], /^- \d{4}-\d{2}-\d{2}  talk  she asked about tides; second sea thing this week$/);
  assert.match(lines[1], /^- \d{4}-\d{2}-\d{2}  sentence  shown a new first sentence, said no$/);
  const ql = J(d, 'quill');
  assert.deepEqual(ql.slice(-2).map((q) => q.door), ['talk', 'sentence']);
});
