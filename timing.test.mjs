import test from 'node:test';
import assert from 'node:assert/strict';
import { speakMs, layout, locate, hourFile, HOUR } from './timing.js';

const seg = (startAt, texts, extra = {}) => ({
  id: 'x', startAt, gaps: { firstLeadMs: 1000, leadMs: 200, holdMs: 600 },
  lines: texts.map((text) => ({ speaker: 'narrator', text, ...extra })),
});

test('speakMs uses audioMs when present, else 16 chars a second', () => {
  assert.equal(speakMs({ text: 'abcdefgh' }), 500);
  assert.equal(speakMs({ text: 'abcdefgh', audioMs: 4120 }), 4120);
});

test('layout: lead + speak + hold per line, first lead longer', () => {
  const { lines, totalMs } = layout(seg('2026-10-08T06:00:00+07:00', ['abcdefgh', 'abcdefghabcdefgh']));
  assert.deepEqual(lines[0], { index: 0, startMs: 0, leadMs: 1000, speakMs: 500, holdMs: 600, endMs: 2100 });
  assert.deepEqual(lines[1], { index: 1, startMs: 2100, leadMs: 200, speakMs: 1000, holdMs: 600, endMs: 3900 });
  assert.equal(totalMs, 3900);
});

test('locate: live segment, phases and typed count', () => {
  const t0 = Date.parse('2026-10-08T06:00:00+07:00');
  const day = { segments: [seg('2026-10-08T06:00:00+07:00', ['ab cd', 'efgh'])] };
  assert.equal(locate(day, t0 + 500).phase, 'lead');
  const mid = locate(day, t0 + 1000 + 156); // 5 chars over 313ms: half way
  assert.equal(mid.phase, 'speak');
  assert.equal(mid.typed, 2);
  assert.equal(mid.mouthOpen, false); // the third char is a space: mouth closed
  assert.equal(locate(day, t0 + 1000 + 20).mouthOpen, true);
  assert.equal(locate(day, t0 + 1000 + 313 + 100).phase, 'hold');
  assert.equal(locate(day, t0 + 1000 + 313 + 600 + 50).lineIndex, 1);
  assert.equal(locate(day, t0 + 100).replay, false);
});

test('locate: loops the day in order when nothing is live', () => {
  const t0 = Date.parse('2026-10-08T06:00:00+07:00');
  const a = seg('2026-10-08T06:00:00+07:00', ['abcdefgh']);   // 2100ms
  const b = seg('2026-10-08T07:00:00+07:00', ['abcdefgh']);   // 2100ms
  b.id = 'b';
  const day = { segments: [a, b] };
  const past = t0 + 3600 * 1000 * 5; // 11:00, long after both
  const r = locate(day, past);
  assert.equal(r.replay, true);
  // 5h = 18,000,000 ms; mod 4200 = 18,000,000 - 4285*4200 = 3000 -> inside b (offset 900)
  assert.equal(r.segment.id, 'b');
  assert.equal(r.msIntoSegment, 900);
  const before = t0 - 1000; // before the day: still loops, in order
  assert.equal(locate(day, before).replay, true);
  assert.equal(locate(day, before).segment.id, 'b');
});

test('locate: empty day is null', () => {
  assert.equal(locate({ segments: [] }, 0), null);
});

test('hourFile: Chiang Mai hour files, across midnight', () => {
  assert.equal(hourFile(Date.parse('2026-10-08T11:59:59+07:00')), 'day/2026-10-08/11.json');
  assert.equal(hourFile(Date.parse('2026-10-09T00:00:10+07:00')), 'day/2026-10-09/00.json');
  assert.equal(hourFile(Date.parse('2026-10-09T00:00:10+07:00') - HOUR), 'day/2026-10-08/23.json');
});

test('locate: a scene written in the previous hour file still plays live after the hour turns', () => {
  // Written at 10:50 into 10.json, starting 10:59:59, so it airs past 11:00; the
  // page joins 10.json and 11.json (empty so far) and must still find it live.
  const earlier = [seg('2026-10-08T10:59:59+07:00', ['abcdefghabcdefgh'])];
  const day = { segments: [...earlier] };
  const r = locate(day, Date.parse('2026-10-08T11:00:00.500+07:00'));
  assert.equal(r.replay, false);
  assert.equal(r.msIntoSegment, 1500);
  // Same across midnight: 23.json of the day before, joined with 00.json.
  const night = { segments: [seg('2026-10-08T23:59:30+07:00', ['x'.repeat(16 * 40)]), { ...seg('2026-10-09T00:00:12+07:00', ['abcdefgh']), id: 'y' }] };
  assert.equal(locate(night, Date.parse('2026-10-09T00:00:05+07:00')).segment.id, 'x');
  assert.equal(locate(night, Date.parse('2026-10-09T00:00:12.100+07:00')).segment.id, 'y');
});
