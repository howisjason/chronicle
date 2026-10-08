#!/usr/bin/env node
// validate.mjs: the station's checker. Refuses a chapter before it is voiced.
// Usage: node station/validate.mjs day/<date>.json   (exit 1 on any finding)
//
// What it checks, and why (the channel plan, 8 Oct 2026, law 1 and law 2):
//   shape      every part of the page agrees on this format; a wrong shape
//              would show as a blank page at 06:00 with nobody watching.
//   sources    every line carries a source index into its segment's sources.
//              No exceptions for "opinion" lines: a line with nothing to point
//              at has no business in a chapter built from the record.
//   numbers    any number spoken in a line must appear in that line's source:
//              digits, and spelled numbers from two to twenty. "One" and
//              "single" are left alone; they read as articles more often than
//              counts. Ordinals like "seventh" are matched to "7".
//   worn out  the NEWEST scene only (aired ones are never judged again): a word
//              one speaker uses in more than four of their lines, or a run of
//              six words lifted from the scene before. Haiku grabs one word and
//              wears it out ("madam" in nearly every narrator line, lab 8 Oct
//              2026); catching it here costs the writer no extra words to read.
//              Words from the scene's own sources and the names are exempt.
//   forbidden  the mechanical half of forbidden.md: money marks, health and
//              visa words, key-shaped strings, email addresses. The human half
//              (names of people, clients) is the fresh reader's job
//              (station/truth-check.md); no regex knows who is private.
import { readFileSync } from 'node:fs';

const SPEAKERS = new Set(['narrator', 'march']);
const EMOTIONS = new Set(['neutral', 'happy', 'dry', 'surprised']);
const ACTIONS = new Set(['none', 'point', 'facepalm']);
const WORDS = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
  second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16,
  seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20 };
const FORBIDDEN = [
  [/[$€£฿]\s?\d|\b\d+\s?(?:cad|usd|thb|baht|dollars?|bucks)\b/i, 'a money figure'],
  [/\b(?:visa|doctor|hospital|medicine|medication|prescription|diagnos\w*|therap\w*|insurance)\b/i, 'a health, medicine or visa word'],
  [/\b(?:sk|ghp|gho|github_pat|xox[abp])[-_][A-Za-z0-9_-]{8,}|\b[A-Fa-f0-9]{32,}\b/, 'a key-shaped string'],
  [/[\w.+-]+@[\w-]+\.[\w.]+/, 'an email address'],
  [/\b(?:client|prospect|invoice|payment|rent|salary|debt|credit card|bank)\b/i, 'a money or client word'],
];

export function validate(day) {
  const f = [];
  const need = (ok, msg) => { if (!ok) f.push(msg); };
  need(day && typeof day === 'object', 'not an object');
  if (!day || typeof day !== 'object') return f;
  need(/^\d{4}-\d{2}-\d{2}$/.test(day.date || ''), 'date missing or not YYYY-MM-DD');
  need(day.tz === 'Asia/Bangkok', 'tz must be Asia/Bangkok');
  need(Array.isArray(day.segments) && day.segments.length > 0, 'segments missing or empty');
  if (!Array.isArray(day.segments)) return f;
  day.segments.forEach((s, si) => {
    const at = `segment ${si} (${s && s.id})`;
    need(typeof s.id === 'string' && s.id, `${at}: id missing`);
    need(typeof s.title === 'string' && s.title, `${at}: title missing`);
    need(!Number.isNaN(Date.parse(s.startAt || '')), `${at}: startAt not a date`);
    need(s.audio === null || typeof s.audio === 'string', `${at}: audio must be null or a path`);
    need(s.gaps && ['firstLeadMs', 'leadMs', 'holdMs'].every((k) => Number.isFinite(s.gaps[k])), `${at}: gaps need firstLeadMs, leadMs, holdMs`);
    need(Array.isArray(s.sources) && s.sources.length > 0, `${at}: sources missing or empty`);
    need(Array.isArray(s.lines) && s.lines.length > 0, `${at}: lines missing or empty`);
    const sources = Array.isArray(s.sources) ? s.sources : [];
    sources.forEach((src, i) => need(src && typeof src.kind === 'string' && typeof src.text === 'string' && src.text, `${at}: source ${i} needs kind and text`));
    (Array.isArray(s.lines) ? s.lines : []).forEach((l, li) => {
      const here = `${at} line ${li}`;
      need(SPEAKERS.has(l.speaker), `${here}: speaker must be narrator or march`);
      need(typeof l.text === 'string' && l.text.trim(), `${here}: text missing`);
      need(EMOTIONS.has(l.emotion), `${here}: emotion must be one of ${[...EMOTIONS].join(', ')}`);
      need(ACTIONS.has(l.action), `${here}: action must be one of ${[...ACTIONS].join(', ')}`);
      need(l.audioMs === undefined || (Number.isFinite(l.audioMs) && l.audioMs > 0), `${here}: audioMs must be a positive number when present`);
      const hasSource = Number.isInteger(l.source) && l.source >= 0 && l.source < sources.length;
      need(hasSource, `${here}: no source index (every line points at a source)`);
      const text = String(l.text || '');
      for (const [re, what] of FORBIDDEN) need(!re.test(text), `${here}: forbidden, ${what}: "${text.slice(0, 60)}"`);
      if (hasSource) {
        const src = String(sources[l.source].text || '');
        for (const n of numbersIn(text)) need(numbersIn(src).has(n), `${here}: the number ${n} is not in its source`);
      }
    });
  });
  const segs = day.segments;
  if (segs.length) f.push(...wornOut(segs[segs.length - 1], segs[segs.length - 2]));
  return f;
}

const STOP = new Set(('the and that this with have from what your you are was were for not but his her him she they them then than there their here when where which who whom will would could should shall must about into over only just like also even very more most much some such been being does did done says said into onto upon its it\'s i\'m don\'t can\'t that\'s let\'s you\'re he\'d he\'s she\'s i\'ll i\'d we\'re isn\'t won\'t yes no not now one all any can may might our out own off too why how see say get got going make made know think well back still way thing things time once again another every each other same right okay fine good note notes notebook idea ideas bit man day way lot kind sort put').split(' '));
const NAMES = new Set(['march', 'narrator', 'j']);
const words = (t) => String(t || '').toLowerCase().match(/[a-z][a-z']*/g) || [];

export function wornOut(seg, prev) {
  const out = [];
  if (!seg || !Array.isArray(seg.lines)) return out;
  const srcWords = new Set((seg.sources || []).flatMap((x) => words(x && x.text)));
  const per = {};
  for (const l of seg.lines) {
    for (const w of new Set(words(l.text))) {
      if (w.length < 3 || STOP.has(w) || NAMES.has(w) || srcWords.has(w)) continue;
      const k = `${l.speaker} ${w}`;
      per[k] = (per[k] || 0) + 1;
    }
  }
  for (const [k, n] of Object.entries(per)) {
    const [who, w] = k.split(' ');
    if (n > 4) out.push(`${seg.id}: worn out, ${who === 'march' ? 'March' : 'the narrator'} says "${w}" in ${n} lines (at most 4)`);
  }
  if (prev && Array.isArray(prev.lines)) {
    const grams = (t) => { const ws = words(t); const g = []; for (let i = 0; i + 6 <= ws.length; i++) g.push(ws.slice(i, i + 6).join(' ')); return g; };
    const before = new Set(prev.lines.flatMap((l) => grams(l.text)));
    const srcText = (seg.sources || []).map((x) => words(x && x.text).join(' ')).join(' | ');
    for (const l of seg.lines) {
      const hit = grams(l.text).find((g) => before.has(g) && !srcText.includes(g));
      if (hit) out.push(`${seg.id}: repeats the scene before word for word: "${hit}"`);
    }
  }
  return out;
}

export function numbersIn(text) {
  const out = new Set();
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) out.add(m[0].replace(/,/g, ''));
  for (const m of text.toLowerCase().matchAll(/\b[a-z]+\b/g)) if (WORDS[m[0]]) out.add(String(WORDS[m[0]]));
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node station/validate.mjs day/<date>.json'); process.exit(2); }
  const findings = validate(JSON.parse(readFileSync(file, 'utf8')));
  if (findings.length) { console.error(`REFUSED ${file}:\n  ` + findings.join('\n  ')); process.exit(1); }
  console.log(`OK ${file}`);
}
