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
import { kindOf, buildTrace, mergeTraces, visible, validate, formatMorningLine, sameness, lastDesk, drawnThisWake, pastReads, validateObjects, sizeStep } from './lib.mjs';
import { sunAt, skyFromCode, weatherNow, WEATHER_EVERY_MS } from './sky.mjs';

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
  // helpers, when the closing record had them (the 15 Oct 2026 plan, step 4)
  assert.match(formatMorningLine({ ...e, helpers: { started: 3, finished: 2, killed_at_end: 1 } }), /talks: 1; helpers: 3 started, 2 finished, 1 killed at the turn's end; \$1\.23/);
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
  assert.equal(validate('quill', [q, { ...q, id: 'q2', door: 'talk' }]).ok, true);
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
  // a test cell's five items are one wake; a longer id that merely starts with the base is not
  const five = 'abcde'.split('').map((l) => ({ id: `d-20261015-3333-${l}` }));
  assert.deepEqual(lastDesk([a2, b2, ...five]), five);
  assert.deepEqual(lastDesk([{ id: 'd-20261015-3333-ab' }, ...five]), five);
});
test('validate: the test pools (self, diary, grown) and doors (note, line) pass; an unknown pool still fails', () => {
  const it = (pool, door) => [{ id: 'd-20261015-3333-a', at: '2026-10-15', pool, door, title: 't', shown: 's' }];
  for (const [p, d] of [['self', 'note'], ['self', 'line'], ['diary', 'summary'], ['grown', 'picture']]) assert.equal(validate('desk', it(p, d)).ok, true, p);
  assert.equal(validate('desk', it('arxiv', 'summary')).ok, false);
  assert.equal(validate('desk', it('self', 'smell')).ok, false);
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
  // the shell: a read-only command naming a place counts; a reach into the live brain's memory is marked real
  assert.deepEqual(pastReads([call('Bash', { command: 'cd room && head -c 1500 state/wall.json' }), call('Bash', { command: 'echo hi' })]), { count: 1, where: ['wall'] });
  assert.deepEqual(pastReads([call('Read', { file_path: '/Users/howisjason/Projects/march-7th/march-brain/inner-life/memory/x.md' })]), { count: 1, where: ['memory', 'real'] });
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

test('day-ends moves a dropped build, the shelf and the board to the front of the wall, empties the shelf and board, and is safe twice', () => {
  const d = copyState();
  for (const k of ['bench', 'shelf', 'board']) writeFileSync(join(d, `${k}.json`), '[]\n');
  const wallBefore = J(d, 'wall');
  assert.equal(roomCmd(d, 'build', 'tide-clock', 'A tide clock').code, 0);
  assert.equal(roomCmd(d, 'status', 'tide-clock', 'dropped').code, 0);
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
  for (const id of ['tide-clock', 'kept']) assert.equal(roomEnv(d, env, 'status', id, 'dropped').code, 0);
  mkdirSync(join(root, 'bench', 'tide-clock'), { recursive: true }); writeFileSync(join(root, 'bench', 'tide-clock', 'README.md'), 'tide');
  mkdirSync(join(root, 'bench', 'kept'), { recursive: true }); writeFileSync(join(root, 'bench', 'kept', 'README.md'), 'new');
  mkdirSync(join(root, 'wall', 'bench', 'kept'), { recursive: true }); writeFileSync(join(root, 'wall', 'bench', 'kept', 'README.md'), 'old');
  mkdirSync(join(root, 'shelf'), { recursive: true }); writeFileSync(join(root, 'shelf', 'on-tides.md'), '# On tides');
  writeFileSync(join(d, 'shelf.json'), JSON.stringify([{ id: 'on-tides', title: 'On tides', at: '2026-10-14', path: 'shelf/on-tides.md' }]));
  mkdirSync(join(root, 'board'), { recursive: true }); writeFileSync(join(root, 'board', 'p1.jpg'), 'jpg');
  writeFileSync(join(d, 'board.json'), JSON.stringify([
    { id: 'p1', at: '2026-10-14', title: 'A pin', url: 'https://example.com', thumb: 'board/p1.jpg', note: 'n' },
    { id: 'p2', at: '2026-10-14', title: 'A bad pin', url: 'https://example.com', thumb: 'board/../../escape.jpg', note: 'n' },
    { id: 'p3', at: '2026-10-14', title: 'A dot pin', url: 'https://example.com', thumb: 'board/..', note: 'n' }]));
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
  assert.equal(row('board', 'p3').thumb, 'board/..', 'a bare dot segment is left alone');
  assert.equal(readFileSync(join(root, 'wall', 'bench', 'kept', 'README.md'), 'utf8'), 'old', 'never overwritten');
  assert.equal(row('bench', 'kept').path, 'wall/bench/kept');
  // without ROOM_ROOT the test copy moves no files at all (a test never touches the real room)
  const d2 = copyState();
  writeFileSync(join(d2, 'bench.json'), '[]\n');
  assert.equal(roomCmd(d2, 'build', 'x1', 'X').code, 0);
  assert.equal(roomCmd(d2, 'status', 'x1', 'dropped').code, 0);
  assert.equal(roomEnv(d2, { ROOM_DAY_ENDS: '1' }, 'day-ends').code, 0);
  assert.equal(J(d2, 'wall').find((i) => i.id === 'x1').path, 'bench/x1');
});

test('day-ends test switch: ROOM_KEEP_FILES moves a dropped build\'s row and leaves its files where they were', () => {
  const root = mkdtempSync(join(tmpdir(), 'room-root-'));
  const d = join(root, 'state');
  cpSync(join(HERE, 'state'), d, { recursive: true });
  for (const k of ['bench', 'shelf', 'board']) writeFileSync(join(d, `${k}.json`), '[]\n');
  const env = { ROOM_ROOT: root };
  assert.equal(roomEnv(d, env, 'build', 'half-one', 'Half').code, 0);
  assert.equal(roomEnv(d, env, 'build', 'done-one', 'Done').code, 0);
  assert.equal(roomEnv(d, env, 'status', 'done-one', 'dropped').code, 0);
  for (const id of ['half-one', 'done-one']) { mkdirSync(join(root, 'bench', id), { recursive: true }); writeFileSync(join(root, 'bench', id, 'a'), id); }
  assert.equal(roomEnv(d, { ...env, ROOM_DAY_ENDS: '1', ROOM_KEEP_FILES: '1' }, 'day-ends').code, 0);
  assert.deepEqual(J(d, 'bench').map((i) => i.id), ['half-one'], 'the half build stays on the bench');
  assert.equal(J(d, 'wall').find((i) => i.id === 'done-one').path, 'bench/done-one', 'its row moved, its path did not');
  assert.equal(existsSync(join(root, 'bench', 'done-one', 'a')), true, 'and its files stayed');
  assert.equal(J(d, 'wall').some((i) => i.id === 'half-one'), false);
  // dropped without the switch, it goes too, files and all
  assert.equal(roomEnv(d, env, 'status', 'half-one', 'dropped').code, 0);
  assert.equal(roomEnv(d, { ...env, ROOM_DAY_ENDS: '1' }, 'day-ends').code, 0);
  assert.deepEqual(J(d, 'bench'), []);
  assert.equal(J(d, 'wall').find((i) => i.id === 'half-one').path, 'wall/bench/half-one');
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

test('quill: the talk door, and the notebook line lands verbatim without its label', () => {
  const d = copyState();
  assert.equal(roomCmd(d, 'quill', 'talk', 'a question about tides', 'yes', 'Shiny.').code, 2, 'no notebook line, refused');
  assert.equal(roomCmd(d, 'quill', 'talk', 'a question about tides', 'yes', 'Shiny.', 'NOTEBOOK: she asked about tides; second sea thing this week').code, 0);
  const lines = readFileSync(join(d, 'quill-notebook.md'), 'utf8').trim().split('\n');
  assert.match(lines[0], /^- \d{4}-\d{2}-\d{2}  talk  she asked about tides; second sea thing this week$/);
  const ql = J(d, 'quill');
  assert.deepEqual(ql.slice(-1).map((q) => q.door), ['talk']);
});

// resume (J's plan, 14 Oct 2026, step 4): a build on the wall comes back to the bench
const roomRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'room-root-'));
  const d = join(root, 'state');
  cpSync(join(HERE, 'state'), d, { recursive: true });
  for (const k of ['bench', 'shelf', 'board']) writeFileSync(join(d, `${k}.json`), '[]\n');
  return { root, d, env: { ROOM_ROOT: root } };
};

test('resume: a wall build comes back with the right row and its files; a second resume, a shelf id and an unknown id are refused', () => {
  const { root, d, env } = roomRoot();
  assert.equal(roomEnv(d, env, 'build', 'tide-clock', 'A tide clock').code, 0);
  assert.equal(roomEnv(d, env, 'step', 'tide-clock', 'reads the tables').code, 0);
  assert.equal(roomEnv(d, env, 'used', 'tide-clock', 'J', 'read a tide').code, 0);
  assert.equal(roomEnv(d, env, 'status', 'tide-clock', 'dropped').code, 0);
  mkdirSync(join(root, 'bench', 'tide-clock'), { recursive: true }); writeFileSync(join(root, 'bench', 'tide-clock', 'README.md'), 'tide');
  mkdirSync(join(root, 'shelf'), { recursive: true }); writeFileSync(join(root, 'shelf', 'on-tides.md'), '# On tides');
  writeFileSync(join(d, 'shelf.json'), JSON.stringify([{ id: 'on-tides', title: 'On tides', at: '2026-10-14', path: 'shelf/on-tides.md' }]));
  assert.equal(roomEnv(d, { ROOM_DAY_ENDS: '1', ...env }, 'day-ends').code, 0);
  const wallRow = J(d, 'wall').find((i) => i.kind === 'bench' && i.id === 'tide-clock');
  const wallLen = J(d, 'wall').length;
  const r = roomEnv(d, env, 'resume', 'tide-clock');
  assert.equal(r.code, 0, r.out);
  assert.equal(r.out.trim(), 'resume: tide-clock back on the bench');
  const b = J(d, 'bench');
  assert.equal(b.length, 1);
  assert.deepEqual(Object.keys(b[0]).sort(), ['id', 'path', 'started', 'status', 'steps', 'title', 'updated', 'used_by']);
  assert.equal(b[0].status, 'half', 'a dropped build picked up is open again');
  assert.equal(b[0].path, 'bench/tide-clock');
  assert.equal(b[0].started, wallRow.started);
  assert.match(b[0].updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(b[0].steps.map((s) => s.note), ['reads the tables', 'picked up from the wall']);
  assert.equal(b[0].used_by[0].how, 'read a tide');
  assert.equal(validate('bench', b).ok, true);
  assert.equal(J(d, 'wall').length, wallLen - 1);
  assert.equal(J(d, 'wall').some((i) => i.kind === 'bench' && i.id === 'tide-clock'), false, 'the row is off the wall');
  assert.equal(readFileSync(join(root, 'bench', 'tide-clock', 'README.md'), 'utf8'), 'tide', 'the files are back on the bench');
  assert.equal(existsSync(join(root, 'wall', 'bench', 'tide-clock')), false);
  // the bad cases, each leaving both lists as they were
  const before = [readFileSync(join(d, 'bench.json'), 'utf8'), readFileSync(join(d, 'wall.json'), 'utf8')];
  assert.match(roomEnv(d, env, 'resume', 'tide-clock').out, /^refused: tide-clock is not a build on the wall/);
  assert.equal(roomEnv(d, env, 'resume', 'on-tides').code, 2, 'a shelf id is not a build');
  assert.equal(roomEnv(d, env, 'resume', 'never-made').code, 2);
  assert.deepEqual([readFileSync(join(d, 'bench.json'), 'utf8'), readFileSync(join(d, 'wall.json'), 'utf8')], before);
  // an id already on the bench is refused, even when a wall row of the same id is planted
  const planted = [{ ...wallRow }, ...J(d, 'wall')];
  writeFileSync(join(d, 'wall.json'), JSON.stringify(planted));
  assert.match(roomEnv(d, env, 'resume', 'tide-clock').out, /^refused: bench already has "tide-clock"/);
  // a first-day build comes back from first-day/bench/<id>
  mkdirSync(join(root, 'first-day', 'bench', 'old-one'), { recursive: true }); writeFileSync(join(root, 'first-day', 'bench', 'old-one', 'README.md'), 'old');
  writeFileSync(join(d, 'wall.json'), JSON.stringify([{ id: 'old-one', title: 'Old', started: '2026-10-12', status: 'done', path: 'first-day/bench/old-one', kind: 'bench', day: '2026-10-12' }, ...J(d, 'wall')]));
  assert.equal(roomEnv(d, env, 'resume', 'old-one').code, 0);
  assert.equal(readFileSync(join(root, 'bench', 'old-one', 'README.md'), 'utf8'), 'old');
  assert.equal(existsSync(join(root, 'first-day', 'bench', 'old-one')), false);
  // a path outside a build folder on the wall is refused
  writeFileSync(join(d, 'wall.json'), JSON.stringify([{ id: 'bad-path', title: 'Bad', started: '2026-10-12', status: 'done', path: 'wall/bench/..', kind: 'bench', day: '2026-10-12' }, ...J(d, 'wall')]));
  assert.match(roomEnv(d, env, 'resume', 'bad-path').out, /^refused: bad-path's path/);
});

// The flexible bench (J's yes, 21 Oct 2026, 8:50pm): nothing is finished; a build leaves
// the bench only when she drops it, and the bench holds three open builds at most.
test('flexible bench: day-ends keeps half and done builds on the bench, files and all, and moves only a dropped one', () => {
  const { root, d, env } = roomRoot();
  for (const [id, status] of [['half-one', 'half'], ['done-one', 'done'], ['dropped-one', 'dropped']]) {
    assert.equal(roomEnv(d, env, 'build', id, id).code, 0);
    if (status !== 'half') assert.equal(roomEnv(d, env, 'status', id, status).code, 0);
    mkdirSync(join(root, 'bench', id), { recursive: true }); writeFileSync(join(root, 'bench', id, 'a'), id);
  }
  const r = roomEnv(d, { ROOM_DAY_ENDS: '1', ...env }, 'day-ends');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /day-ends: 1 moved/);
  assert.deepEqual(J(d, 'bench').map((i) => [i.id, i.status, i.path]), [['half-one', 'half', 'bench/half-one'], ['done-one', 'done', 'bench/done-one']]);
  assert.equal(readFileSync(join(root, 'bench', 'done-one', 'a'), 'utf8'), 'done-one', 'a kept build keeps its files on the bench');
  const wall = J(d, 'wall');
  assert.equal(wall.some((i) => i.id === 'half-one' || i.id === 'done-one'), false, 'a build on the bench is not also on the wall');
  assert.equal(wall.find((i) => i.id === 'dropped-one').path, 'wall/bench/dropped-one');
  assert.equal(existsSync(join(root, 'bench', 'dropped-one')), false);
  // safe twice: nothing more moves, the bench stays as it is
  const bench = J(d, 'bench');
  assert.match(roomEnv(d, { ROOM_DAY_ENDS: '1', ...env }, 'day-ends').out, /0 moved/);
  assert.deepEqual(J(d, 'bench'), bench);
});

test('flexible bench: a fourth open build is refused with the drop command named, and the file is unchanged; a dropped one does not count', () => {
  const { d, env } = roomRoot();
  for (const id of ['one', 'two', 'three']) assert.equal(roomEnv(d, env, 'build', id, id).code, 0);
  assert.equal(roomEnv(d, env, 'status', 'two', 'done').code, 0);
  const before = readFileSync(join(d, 'bench.json'), 'utf8');
  const r = roomEnv(d, env, 'build', 'four', 'Four');
  assert.equal(r.code, 2);
  assert.match(r.out, /^refused: .*three.*node \S*room\.mjs status <id> dropped/);
  assert.equal(r.out.trim().split('\n').length, 1, 'one plain line');
  assert.equal(readFileSync(join(d, 'bench.json'), 'utf8'), before);
  // a dropped build frees its place
  assert.equal(roomEnv(d, env, 'status', 'one', 'dropped').code, 0);
  assert.equal(roomEnv(d, env, 'build', 'four', 'Four').code, 0);
  // and taking a dropped one back up onto a full bench is refused the same way
  assert.match(roomEnv(d, env, 'status', 'one', 'half').out, /^refused: .*dropped/);
});

test('flexible bench: resume onto a full bench is refused, both lists unchanged', () => {
  const { root, d, env } = roomRoot();
  assert.equal(roomEnv(d, env, 'build', 'old-one', 'Old').code, 0);
  assert.equal(roomEnv(d, env, 'status', 'old-one', 'dropped').code, 0);
  mkdirSync(join(root, 'bench', 'old-one'), { recursive: true }); writeFileSync(join(root, 'bench', 'old-one', 'a'), 'x');
  assert.equal(roomEnv(d, { ROOM_DAY_ENDS: '1', ...env }, 'day-ends').code, 0);
  for (const id of ['one', 'two', 'three']) assert.equal(roomEnv(d, env, 'build', id, id).code, 0);
  const before = [readFileSync(join(d, 'bench.json'), 'utf8'), readFileSync(join(d, 'wall.json'), 'utf8')];
  const r = roomEnv(d, env, 'resume', 'old-one');
  assert.equal(r.code, 2);
  assert.match(r.out, /^refused: .*three.*node \S*room\.mjs status <id> dropped/);
  assert.deepEqual([readFileSync(join(d, 'bench.json'), 'utf8'), readFileSync(join(d, 'wall.json'), 'utf8')], before);
  assert.equal(existsSync(join(root, 'wall', 'bench', 'old-one', 'a')), true, 'the files did not move');
});

test('flexible bench: a done build stays across a wake and takes another step, still done', () => {
  const { d, env } = roomRoot();
  assert.equal(roomEnv(d, env, 'build', 'tide-clock', 'A tide clock').code, 0);
  assert.equal(roomEnv(d, env, 'status', 'tide-clock', 'done').code, 0);
  assert.equal(roomEnv(d, { ROOM_DAY_ENDS: '1', ...env }, 'day-ends').code, 0);
  const r = roomEnv(d, env, 'step', 'tide-clock', 'one more thing, after it was done');
  assert.equal(r.code, 0, r.out);
  const b = J(d, 'bench').find((i) => i.id === 'tide-clock');
  assert.equal(b.status, 'done');
  assert.deepEqual(b.steps.map((s) => s.note), ['one more thing, after it was done']);
  assert.equal(validate('bench', J(d, 'bench')).ok, true);
});

test('resume, then day-ends: the build stays on the bench, and dropped again goes back to the wall with the extra step kept', () => {
  const { root, d, env } = roomRoot();
  assert.equal(roomEnv(d, env, 'build', 'moon-clock', 'A moon clock').code, 0);
  assert.equal(roomEnv(d, env, 'step', 'moon-clock', 'the first step').code, 0);
  assert.equal(roomEnv(d, env, 'status', 'moon-clock', 'dropped').code, 0);
  mkdirSync(join(root, 'bench', 'moon-clock'), { recursive: true }); writeFileSync(join(root, 'bench', 'moon-clock', 'a.js'), 'x');
  assert.equal(roomEnv(d, { ROOM_DAY_ENDS: '1', ...env }, 'day-ends').code, 0);
  assert.equal(roomEnv(d, env, 'resume', 'moon-clock').code, 0);
  assert.equal(roomEnv(d, env, 'step', 'moon-clock', 'a step after the gap').code, 0);
  assert.equal(roomEnv(d, { ROOM_DAY_ENDS: '1', ...env }, 'day-ends').code, 0);
  assert.deepEqual(J(d, 'bench').map((i) => i.id), ['moon-clock'], 'resumed and not dropped, it stays');
  assert.equal(roomEnv(d, env, 'status', 'moon-clock', 'dropped').code, 0);
  assert.equal(roomEnv(d, { ROOM_DAY_ENDS: '1', ...env }, 'day-ends').code, 0);
  assert.deepEqual(J(d, 'bench'), []);
  const row = J(d, 'wall').find((i) => i.kind === 'bench' && i.id === 'moon-clock');
  assert.equal(row.path, 'wall/bench/moon-clock');
  assert.deepEqual(row.steps.map((s) => s.note), ['the first step', 'picked up from the wall', 'a step after the gap']);
  assert.equal(readFileSync(join(root, 'wall', 'bench', 'moon-clock', 'a.js'), 'utf8'), 'x');
  assert.equal(J(d, 'wall').filter((i) => i.kind === 'bench' && i.id === 'moon-clock').length, 1, 'once on the wall, not twice');
  assert.equal(validate('wall', J(d, 'wall')).ok, true);
});

test('the season file holds one set line at most, and the notes never reach her', () => {
  // The launcher's hers() keeps every line that is not a `#` note; the season is the one such
  // line in inner-life/season.md (J's design, 15 Oct 2026), or nothing. A second set line would
  // be two seasons, which the design forbids: one slot.
  const hers = (t) => t.split('\n').filter((l) => !/^\s*#( |$)/.test(l) && l.trim() !== '');
  const real = hers(readFileSync(`${B}/inner-life/season.md`, 'utf8'));
  assert.ok(real.length <= 1, 'one slot: at most one set line; empty is a valid season');
  if (real.length) assert.match(real[0], /^\*\*Set \d{1,2} \w+ \d{4}:\*\* \S/);
  assert.deepEqual(hers('# a note\n#\n# another\n'), []);
  assert.equal(hers('# note\n**Set 1 Jan 2027:** one\n**Set 2 Jan 2027:** two\n').length, 2, 'two lines must be seen as two, so the real file is held to one above');
});

// ---- the room's things (objects.json) and the album (days/), the room plan of 19 Oct 2026 ----
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const objs = (d) => JSON.parse(readFileSync(join(d, 'objects.json'), 'utf8'));

test('object add: a thing lands in a free slot in the full shape; every bad add is refused and the file is unchanged', () => {
  const d = copyState();
  writeFileSync(join(d, 'objects.json'), '[]\n');
  const r = roomCmd(d, 'object', 'add', 'kite', 'keepsake', 's03', 'for the wind I read about today', '--source', 'wan-phra');
  assert.equal(r.code, 0, r.out);
  const [o] = objs(d);
  assert.deepEqual(o, { id: 'kite', kind: 'keepsake', slot: 's03', born: today(), wakes: 1, touched: today(), source: 'wan-phra', why: 'for the wind I read about today', where: 'out' });
  assert.equal(validateObjects(objs(d)).ok, true);
  assert.equal(objs(d).length, 1);
  const before = readFileSync(join(d, 'objects.json'), 'utf8');
  for (const [args, why] of [
    [['object', 'add', 'lamp', 'decor', 's03', 'light'], /already holds "kite"/],
    [['object', 'add', 'lamp', 'decor', 's99', 'light'], /no slot "s99"/],
    [['object', 'add', 'kite', 'decor', 's04', 'light'], /already a thing "kite"/],
    [['object', 'add', 'Big Lamp', 'decor', 's04', 'light'], /is not an id/],
    [['object', 'add', 'lamp', 'Decor!', 's04', 'light'], /kind must be one small word/],
    [['object', 'add', 'lamp', 'decor', 's04', ''], /needs a why/],
    [['object', 'add', 'lamp', 'decor', 's04', 'one line\nand another'], /why must be one line/],
    [['object', 'add', 'lamp', 'decor', 's04', 'x'.repeat(201)], /longer than 200/],
    [['object', 'add', 'lamp', 'decor', 's04', 'light', '--art', '../../seed.mjs'], /art must be art/],
    [['object', 'add', 'lamp', 'decor', 's04', 'light', '--source'], /a value after --source/],
    [['object', 'paint', 'kite'], /add, move, grow, attic or back/],
  ]) {
    const bad = roomCmd(d, ...args);
    assert.equal(bad.code, 2, `${args.join(' ')} should be refused: ${bad.out}`);
    assert.match(bad.out, why);
    assert.equal(readFileSync(join(d, 'objects.json'), 'utf8'), before, `${args.join(' ')} changed the file`);
  }
});

test('object add: art must already exist in the room copy; with no slots file nothing can be added', () => {
  const root = mkdtempSync(join(tmpdir(), 'room-root-'));
  const d = join(root, 'state');
  cpSync(join(HERE, 'state'), d, { recursive: true });
  writeFileSync(join(d, 'objects.json'), '[]\n');
  const run = (...a) => { try { return { code: 0, out: execFileSync('node', [join(HERE, 'tools/room.mjs'), ...a], { env: { ...process.env, ROOM_STATE: d, ROOM_ROOT: root }, encoding: 'utf8' }) }; } catch (e) { return { code: e.status, out: String(e.stdout) }; } };
  assert.match(run('object', 'add', 'lamp', 'decor', 's01', 'light', '--art', 'art/lamp.png').out, /does not exist yet/);
  mkdirSync(join(root, 'art')); writeFileSync(join(root, 'art', 'lamp.png'), 'not really a png\n');
  // a card the page does not have is refused, and the file is unchanged
  const bad = run('object', 'add', 'lamp', 'decor', 's01', 'light', '--art', 'art/lamp.png', '--card', 'attic');
  assert.notEqual(bad.code, 0); assert.match(bad.out, /card must be one of/); assert.deepEqual(objs(d), []);
  const ok = run('object', 'add', 'lamp', 'decor', 's01', 'light', '--art', 'art/lamp.png', '--card', 'shelf');
  assert.equal(ok.code, 0, ok.out);
  assert.equal(objs(d)[0].art, 'art/lamp.png'); assert.equal(objs(d)[0].card, 'shelf');
  const noSlots = copyState();
  writeFileSync(join(noSlots, 'objects.json'), '[]\n');
  execFileSync('rm', [join(noSlots, 'slots.json')]);
  const r = roomCmd(noSlots, 'object', 'add', 'lamp', 'decor', 's01', 'light');
  assert.equal(r.code, 2); assert.match(r.out, /slots\.json is missing/);
});

test('object move, grow, attic and back: each checks the slot and where the thing is', () => {
  const d = copyState();
  writeFileSync(join(d, 'objects.json'), '[]\n');
  assert.equal(roomCmd(d, 'object', 'add', 'kite', 'keepsake', 's01', 'wind').code, 0);
  assert.equal(roomCmd(d, 'object', 'add', 'fern', 'plant', 's02', 'green').code, 0);
  assert.match(roomCmd(d, 'object', 'move', 'kite', 's02').out, /already holds "fern"/);
  assert.match(roomCmd(d, 'object', 'move', 'kite', 's01').out, /already in s01/);
  assert.match(roomCmd(d, 'object', 'move', 'ghost', 's05').out, /no objects item "ghost"/);
  assert.equal(roomCmd(d, 'object', 'move', 'kite', 's05').code, 0);
  assert.equal(objs(d).find((o) => o.id === 'kite').slot, 's05');
  assert.equal(roomCmd(d, 'object', 'grow', 'fern').code, 0);
  assert.match(roomCmd(d, 'object', 'grow', 'fern').out, /3 wakes, size 2/);
  assert.equal(roomCmd(d, 'object', 'attic', 'fern').code, 0);
  const fern = objs(d).find((o) => o.id === 'fern');
  assert.equal(fern.where, 'attic'); assert.equal(fern.slot, null);
  assert.match(roomCmd(d, 'object', 'grow', 'fern').out, /in the attic; bring it back first/);
  assert.match(roomCmd(d, 'object', 'attic', 'fern').out, /in the attic; bring it back first/);
  assert.match(roomCmd(d, 'object', 'back', 'kite', 's02').out, /not in the attic/);
  // the attic freed s02, so kite may take it; then fern cannot come back into it
  assert.equal(roomCmd(d, 'object', 'move', 'kite', 's02').code, 0);
  assert.match(roomCmd(d, 'object', 'back', 'fern', 's02').out, /already holds "kite"/);
  assert.equal(roomCmd(d, 'object', 'back', 'fern', 's07').code, 0);
  const back = objs(d).find((o) => o.id === 'fern');
  assert.equal(back.where, 'out'); assert.equal(back.slot, 's07'); assert.equal(back.wakes, 3);
  assert.equal(validateObjects(objs(d), JSON.parse(readFileSync(join(d, 'slots.json'), 'utf8'))).ok, true);
});

test('validateObjects refuses each planted bad row; sizeStep follows 1, 3, 7, 15', () => {
  const good = { id: 'kite', kind: 'keepsake', slot: 's01', born: '2026-10-19', wakes: 1, touched: '2026-10-19', source: 'just because', why: 'wind', where: 'out' };
  const slots = [{ id: 's01' }, { id: 's02' }];
  assert.equal(validateObjects([good], slots).ok, true);
  for (const [bad, why] of [
    [[good, { ...good, id: 'fern' }], /slot "s01" already holds "kite"/],
    [[good, { ...good }], /used twice/],
    [[{ ...good, where: 'attic' }], /attic has slot null/],
    [[{ ...good, slot: null }], /needs a slot/],
    [[{ ...good, slot: 's09' }], /no slot "s09"/],
    [[{ ...good, wakes: 0 }], /wakes must be/],
    [[{ ...good, wakes: 1.5 }], /wakes must be/],
    [[{ ...good, why: 'a\nb' }], /one line/],
    [[{ ...good, born: '19 Oct' }], /born must be a day/],
    [[{ ...good, where: 'shelf' }], /out or attic/],
    [[{ ...good, art: 'bench/x.js' }], /art must be/],
    [{ not: 'a list' }, /not a list/],
  ]) {
    const v = validateObjects(bad, slots);
    assert.equal(v.ok, false, JSON.stringify(bad));
    assert.match(v.problems.join('; '), why);
  }
  assert.deepEqual([0, 1, 2, 3, 6, 7, 14, 15, 40].map(sizeStep), [1, 1, 1, 2, 2, 3, 3, 4, 4]);
});

test('snapshot writes today\'s album page with only the things that are out, in slot order, and refuses a broken list', () => {
  const d = copyState();
  writeFileSync(join(d, 'objects.json'), '[]\n');
  roomCmd(d, 'object', 'add', 'kite', 'keepsake', 's09', 'wind');
  roomCmd(d, 'object', 'add', 'fern', 'plant', 's02', 'green');
  roomCmd(d, 'object', 'add', 'cup', 'decor', 's05', 'tea');
  roomCmd(d, 'object', 'attic', 'cup');
  const r = roomCmd(d, 'snapshot');
  assert.equal(r.code, 0, r.out);
  const page = JSON.parse(readFileSync(join(d, 'days', `${today()}.json`), 'utf8'));
  assert.equal(page.day, today());
  assert.deepEqual(page.objects.map((o) => o.id), ['fern', 'kite']);
  assert.equal(roomCmd(d, 'snapshot').code, 0);                       // twice in a day is safe
  writeFileSync(join(d, 'objects.json'), JSON.stringify([{ id: 'x' }]));
  const bad = roomCmd(d, 'snapshot');
  assert.equal(bad.code, 2); assert.match(bad.out, /refused/);
});

// ---- the real sky (sky.mjs) ----
test('the sun over Chiang Mai: high at noon in the south, far down at midnight, near the horizon at 6am; a wrong longitude would say otherwise', () => {
  const noon = sunAt(new Date('2026-10-19T12:15:00+07:00'));
  assert.ok(noon.altitude > 55 && noon.altitude < 65, `noon altitude ${noon.altitude}`);
  assert.ok(noon.azimuth > 150 && noon.azimuth < 210, `noon azimuth ${noon.azimuth}`);
  assert.equal(noon.phase, 'day');
  const night = sunAt(new Date('2026-10-20T00:00:00+07:00'));
  assert.ok(night.altitude < -45, `midnight altitude ${night.altitude}`);
  assert.equal(night.phase, 'night');
  const early = sunAt(new Date('2026-10-19T06:05:00+07:00'));
  assert.ok(early.altitude > -6 && early.altitude < 0, `6:05am altitude ${early.altitude}`);
  assert.equal(early.phase, 'dawn');
  assert.equal(sunAt(new Date('2026-10-19T18:15:00+07:00')).phase, 'dusk');
  // the same noon seen from the wrong side of the world is night: the check can fail
  assert.equal(sunAt(new Date('2026-10-19T12:15:00+07:00'), { lat: 18.79, lon: -98.99 }).phase, 'night');
});

test('the weather: a live answer, a failure falls back to clear, and the service is asked at most once in 30 minutes', async () => {
  const store = { m: {}, getItem(k) { return this.m[k] ?? null; }, setItem(k, v) { this.m[k] = v; } };
  let asked = 0;
  const answer = (j) => async () => { asked++; return { ok: true, json: async () => j }; };
  const t0 = Date.parse('2026-10-19T15:00:00Z');
  const live = await weatherNow({ fetchFn: answer({ current: { weather_code: 63, cloud_cover: 90 } }), store, now: t0 });
  assert.deepEqual([live.sky, live.from, asked], ['rain', 'live', 1]);
  const kept = await weatherNow({ fetchFn: answer({ current: { weather_code: 0 } }), store, now: t0 + WEATHER_EVERY_MS - 1 });
  assert.deepEqual([kept.sky, kept.from, asked], ['rain', 'kept', 1]);
  const down = async () => { asked++; throw new Error('overloaded'); };
  const failed = await weatherNow({ fetchFn: down, store, now: t0 + WEATHER_EVERY_MS });
  assert.deepEqual([failed.sky, failed.from, asked], ['clear', 'fallback', 2]);
  const again = await weatherNow({ fetchFn: down, store, now: t0 + WEATHER_EVERY_MS + 60e3 });
  assert.deepEqual([again.from, asked], ['kept', 2]);                  // a failure is not asked again for 30 minutes either
  const notOk = await weatherNow({ fetchFn: async () => ({ ok: false }), now: t0 });
  assert.equal(notOk.sky, 'clear');
  assert.deepEqual([0, 1, 2, 3, 45, 51, 80, 95, 99].map((c) => skyFromCode(c)), ['clear', 'clear', 'cloud', 'cloud', 'cloud', 'rain', 'rain', 'storm', 'storm']);
  assert.equal(skyFromCode(undefined, 80), 'cloud');
});
