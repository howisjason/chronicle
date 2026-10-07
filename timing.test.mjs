import test from 'node:test';
import assert from 'node:assert/strict';
import { speakMs, layout, locate } from './timing.js';

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
