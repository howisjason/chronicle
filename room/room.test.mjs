// room.test.mjs: the room's pure functions (lib.mjs). Plain node:test, run with
//   node --test timing.test.mjs station/validate.test.mjs room/room.test.mjs
// Every promise the room makes about privacy has a test here that plants the
// wrong input and watches it refused (the twin law: a check must show the bad
// case fails, not only that the good case passes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kindOf, buildTrace, mergeTraces, visible, validate, formatMorningLine } from './lib.mjs';

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
    [['Edit', { file_path: `${R}/state/quill.json` }], { kind: 'idle', place: 'none' }],
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

test('the morning line, exactly', () => {
  const e = { started: '2026-10-12T07:03:10+07:00', cost_usd: 1.234, cap_usd: 4, verdict: 'clean', pins: 2,
    bench_steps: [{ id: 'clock', n: 3, status: 'half' }], cloud: 1, shelf: 0, quill: { yes: 2, no: 1, called: 3, recorded: 3 } };
  assert.equal(formatMorningLine(e, { clock: 'A clock that knows the moon' }),
    '- **2026-10-12 — the room:** 2 pins, bench: "A clock that knows the moon" +3 steps (half), 1 in the cloud, 0 on the shelf, Quill: 2 yes / 1 no; $1.23 of $4 used (31%), clean.');
  const zero = { started: '2026-10-13T07:02:00+07:00', cost_usd: 0.31, cap_usd: 4, verdict: 'clean', pins: 0, bench_steps: [], cloud: 0, shelf: 0, quill: { yes: 0, no: 0, called: 0, recorded: 0 } };
  assert.equal(formatMorningLine(zero), '- **2026-10-13 — the room:** nothing new in the room; $0.31 of $4 used (8%), clean.');
});
