import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate, numbersIn, wornOut } from './validate.mjs';

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
