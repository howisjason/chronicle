import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validate, numbersIn, wornOut, previousHourPath, talkShape } from './validate.mjs';

const good = () => JSON.parse(readFileSync(new URL('../day/sample.json', import.meta.url), 'utf8'));
const line = (d, i) => d.segments[0].lines[i];

test('the sample chapter passes', () => assert.deepEqual(validate(good()), []));

test('a planted wrong number is refused', () => {
  const d = good();
  line(d, 2).text = 'Before it could go live, a grader read it and found twelve things to fix.';
  const f = validate(d);
  assert.equal(f.length, 1);
  assert.match(f[0], /the number 12 is not in its source/);
});

test('a number that IS in the source passes', () => {
  const d = good();
  line(d, 0).text = 'The seventh of October, 2026. A brain cell meets the world.';
  assert.deepEqual(validate(d), []);
});

test('a line with no source index is refused', () => {
  const d = good();
  delete line(d, 1).source;
  assert.match(validate(d)[0], /no source index/);
  line(d, 1).source = 99;
  assert.match(validate(d)[0], /no source index/);
});

test('forbidden material is refused', () => {
  for (const text of ['He paid $1,800 for it.', 'The visa runs to May.', 'Mail me at someone@example.com', 'The key was ghp_abcdefghijklmnop', 'A client said yes.']) {
    const d = good();
    line(d, 3).text = text;
    assert.ok(validate(d).some((m) => /forbidden/.test(m)), `should refuse: ${text}`);
  }
});

test('shape faults are named', () => {
  const d = good();
  line(d, 0).speaker = 'host';
  line(d, 0).emotion = 'angry';
  d.segments[0].audio = 7;
  const f = validate(d);
  assert.ok(f.some((m) => /speaker/.test(m)));
  assert.ok(f.some((m) => /emotion/.test(m)));
  assert.ok(f.some((m) => /audio/.test(m)));
  assert.deepEqual(validate({}), ['date missing or not YYYY-MM-DD', 'tz must be Asia/Bangkok', 'segments missing or empty']);
});

test('numbersIn: digits, words, ordinals; one and single ignored', () => {
  assert.deepEqual([...numbersIn('twenty Looms, the seventh of Oct, 1,250 and one single 7')].sort(), ['1250', '20', '7']);
});

test('a worn-out word is refused, and only in the newest scene', () => {
  const d = good();
  const seg = d.segments[0];
  const n = seg.lines.filter((l) => l.speaker === 'narrator').slice(0, 5);
  n.forEach((l) => { l.text += ' Indeed, madam.'; });
  assert.ok(validate(d).some((m) => /worn out, the narrator says "madam" in 5 lines/.test(m)));
  d.segments.push(JSON.parse(JSON.stringify(good().segments[0])));
  d.segments[1].id = 'next';
  assert.ok(!validate(d).some((m) => /worn out/.test(m)), 'an aired scene is never judged again');
});

test('a line lifted from the scene before is refused', () => {
  const prev = { lines: [{ speaker: 'march', text: 'The sailor is fine, the sailor is watching the bus go.' }] };
  const seg = { id: 's', sources: [{ text: 'Note: nothing here.' }], lines: [{ speaker: 'narrator', text: 'As she said, the sailor is watching the bus go home.' }] };
  assert.match(wornOut(seg, prev)[0], /repeats the scene before/);
  assert.deepEqual(wornOut({ ...seg, lines: [{ speaker: 'narrator', text: 'A different line entirely, about a harbour.' }] }, prev), []);
});

test('previousHourPath: the hour before, across midnight; other paths have none', () => {
  assert.equal(previousHourPath('day/2026-10-08/11.json'), 'day/2026-10-08/10.json');
  assert.equal(previousHourPath('/x/day/2026-10-09/00.json'), '/x/day/2026-10-08/23.json');
  assert.equal(previousHourPath('day/2026-11-01/00.json'), 'day/2026-10-31/23.json');
  assert.equal(previousHourPath('inbox/lab-day.json'), null);
});

test('the first scene of an hour file is checked against the last scene of the hour before', () => {
  const prev = { id: 'p', lines: [{ speaker: 'march', text: 'The sailor is fine, the sailor is watching the bus go.' }] };
  const d = good();
  line(d, 1).text = 'As she said, the sailor is watching the bus go home.';
  assert.ok(validate(d, prev).some((m) => /repeats the scene before/.test(m)), 'alone in its file: checked against the hour before');
  assert.deepEqual(validate(d, null), []);
  // With a scene before it in the same file, that one is the scene before, not `before`.
  const two = good();
  two.segments.unshift({ ...JSON.parse(JSON.stringify(good().segments[0])), id: 'a' });
  two.segments[1].lines[1].text = 'As she said, the sailor is watching the bus go home.';
  assert.deepEqual(validate(two, prev), validate(two, null));
  assert.ok(!validate(two, prev).some((m) => /the sailor is watching/.test(m)));
});

test('the command line finds the scene before in the previous hour file, across midnight', () => {
  const dir = mkdtempSync(join(tmpdir(), 'chron-'));
  const prev = good();
  mkdirSync(join(dir, 'day/2026-10-08'), { recursive: true });
  mkdirSync(join(dir, 'day/2026-10-09'), { recursive: true });
  writeFileSync(join(dir, 'day/2026-10-08/23.json'), JSON.stringify(prev));
  const d = good();
  d.segments[0].id = 'next';
  d.segments[0].lines[1].text = prev.segments[0].lines[0].text;
  const file = join(dir, 'day/2026-10-09/00.json');
  writeFileSync(file, JSON.stringify(d));
  const run = spawnSync('node', [fileURLToPath(new URL('./validate.mjs', import.meta.url)), file], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /repeats the scene before/);
  rmSync(join(dir, 'day/2026-10-08/23.json'));
  assert.equal(spawnSync('node', [fileURLToPath(new URL('./validate.mjs', import.meta.url)), file]).status, 0);
});

// The talk rules (writing rebuild, 9 Oct 2026). A scene of n lines, each `len` words of
// distinct words, so nothing but length and rhythm can refuse it.
let w = 0;
const filler = (len) => Array.from({ length: len }, () => `w${(w++).toString(36).replace(/[0-9]/g, (d) => 'abcdefghij'[d])}`).join(' ');
const scene = (lens) => ({ id: 'x', sources: [{ kind: 'note', text: 'Note: x.' }],
  lines: lens.map((n, i) => ({ speaker: i % 2 ? 'narrator' : 'march', text: filler(n), emotion: 'neutral', action: 'none', source: 0 })) });

test('the old two-minute rally is refused as too short', () => {
  const f = talkShape(scene(Array(16).fill(22)));
  assert.ok(f.some((m) => /too short: 352 words \(900 to 2,600\)/.test(m)), f.join('; '));
});

test('a long scene of same-length lines is refused for one rhythm', () => {
  const f = talkShape(scene(Array(90).fill(20)));
  assert.deepEqual(f, ['x: one rhythm: 0 short lines, longest 20 words']);
});

test('a scene over 2,600 words is refused as too long', () => {
  assert.ok(talkShape(scene([...Array(4).fill(2), ...Array(60).fill(45)])).some((m) => /too long: 2708 words/.test(m)));
});

test('the talk rules judge only a scene being written, never the sample or aired ones', () => {
  const d = good();
  assert.deepEqual(validate(d), []);
  assert.ok(validate(d, null, { fresh: true }).some((m) => /too short/.test(m)));
});

test('the worn-out limit grows with a speaker\'s lines: one word in 5 of 48 lines passes, in 7 is refused', () => {
  const seg = scene([...Array(4).fill(3), ...Array(92).fill(18)]);
  const nar = seg.lines.filter((l) => l.speaker === 'narrator');
  nar.slice(0, 5).forEach((l) => { l.text += ' harbour'; });
  assert.ok(!wornOut(seg, null).some((m) => /harbour/.test(m)), 'five of 48 is under the limit of 6');
  nar.slice(5, 7).forEach((l) => { l.text += ' harbour'; });
  assert.ok(wornOut(seg, null).some((m) => /says "harbour" in 7 lines \(at most 6\)/.test(m)));
});
