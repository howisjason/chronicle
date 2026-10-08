// timing.js: the one clock the page lives by. Pure functions, no DOM, so the
// same file runs in node (tests) and in the browser (player.js).
//
// A line lasts lead + speaking + hold. Speaking is the real audioMs the voice
// step wrote, else the text length at 16 characters a second (the stand-in).
// Each segment carries the gaps it was made with, because they are baked into
// its MP3 (the channel plan, 8 Oct 2026, section 4; the ideas are PNN's, not
// its code).
//
// Every viewer's browser reads its own clock against the published start
// times, so two browsers agree on the word without a server. When no segment
// is live, the loaded segments (player.js hands over two hour files as one
// "day") loop in order from the first, anchored to the first segment's start,
// so the loop position is also a function of the clock.

export const CHARS_PER_SEC = 16;
export const HOUR = 3600 * 1000;

// The transcript file for the Chiang Mai hour holding epoch ms: day/<date>/<HH>.json.
// Asia/Bangkok is a fixed +07:00 (no daylight saving), so the arithmetic is exact,
// and the hour before 00:xx is the previous day's 23.json.
export function hourFile(ms) {
  const k = new Date(ms + 7 * HOUR).toISOString();
  return `day/${k.slice(0, 10)}/${k.slice(11, 13)}.json`;
}
export const DEFAULT_GAPS = { firstLeadMs: 1000, leadMs: 200, holdMs: 600 };

export function speakMs(line) {
  if (Number.isFinite(line.audioMs) && line.audioMs > 0) return line.audioMs;
  return Math.round((line.text.length / CHARS_PER_SEC) * 1000);
}

// Lay a segment's lines out on a timeline starting at 0.
export function layout(segment) {
  const g = { ...DEFAULT_GAPS, ...(segment.gaps || {}) };
  let t = 0;
  const lines = segment.lines.map((line, i) => {
    const leadMs = i === 0 ? g.firstLeadMs : g.leadMs;
    const speak = speakMs(line);
    const startMs = t;
    t += leadMs + speak + g.holdMs;
    return { index: i, startMs, leadMs, speakMs: speak, holdMs: g.holdMs, endMs: t };
  });
  return { lines, totalMs: t };
}

// Where is the day at nowMs (epoch ms)? Returns null for an empty day.
export function locate(day, nowMs) {
  const segs = (day.segments || []).map((seg) => ({ seg, startMs: Date.parse(seg.startAt), ...layout(seg) }));
  if (!segs.length) return null;
  for (const s of segs) {
    if (nowMs >= s.startMs && nowMs < s.startMs + s.totalMs) return place(s, nowMs - s.startMs, false);
  }
  const loopTotal = segs.reduce((a, s) => a + s.totalMs, 0);
  if (!loopTotal) return null;
  const anchor = Math.min(...segs.map((s) => s.startMs));
  let off = (((nowMs - anchor) % loopTotal) + loopTotal) % loopTotal;
  for (const s of segs) {
    if (off < s.totalMs) return place(s, off, true);
    off -= s.totalMs;
  }
  return null;
}

function place(s, ms, replay) {
  const l = s.lines.find((x) => ms < x.endMs);
  const line = s.seg.lines[l.index];
  const into = ms - l.startMs;
  let phase, typed;
  if (into < l.leadMs) { phase = 'lead'; typed = 0; }
  else if (into < l.leadMs + l.speakMs) {
    phase = 'speak';
    typed = Math.min(line.text.length, Math.floor(((into - l.leadMs) / l.speakMs) * line.text.length));
  } else { phase = 'hold'; typed = line.text.length; }
  // The mouth flaps while the caption is still typing a letter and closes on spaces.
  const ch = phase === 'speak' ? line.text[typed] : '';
  const mouthOpen = phase === 'speak' && ch !== undefined && ch !== ' ';
  return {
    segment: s.seg, line, lineIndex: l.index, msIntoLine: into, msIntoSegment: ms,
    phase, typed, mouthOpen, replay,
  };
}
