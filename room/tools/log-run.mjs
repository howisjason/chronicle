#!/usr/bin/env node
// log-run.mjs: after March's free hour, turn the run into the room's receipts.
// Called by march-brain/scripts/free-hour.sh once the ledger line is written:
//   node room/tools/log-run.mjs <the run's /tmp log> <the cap in dollars>
// Node, no dependencies, zero model calls, so the receipts cost nothing.
//
// What it writes, and nothing else: state/log.jsonl (one line a run), state/now.json,
// state/used.json (the "I used this" presses, copied from the door so the page has
// them when the door is down), and ONE line under "## Unreported"
// in march-brain/inner-life/unattended.md, which the next morning's first reply reads
// out to J (his ask, 11 Oct 2026: say what changed and how much of the cap was used).
// It never rewrites a state file March wrote; one that will not parse is named in
// the log line's `broken` and left exactly as it is.
//
// What it reads, and nothing else (the plan's privacy line): the run's JSON result,
// the hour's ledger, the run's session file and its helpers' files and room/.
// Never the diary folder, the seed or the self page (the room had a wall showing
// copies of those two until 12 Oct 2026; J took it down: the room is hers). From
// the session file it keeps only a kind and a place per tool call (lib.mjs).
//
// THE SESSION FILE (VERIFIED by probe, 11 Oct 2026, CLI 2.1.293): a headless -p run
// started in march-brain writes ~/.claude/projects/-Users-howisjason-Projects-march-7th-march-brain/<session_id>.jsonl
// live (the folder name is the run's cwd with every non-alphanumeric turned into
// "-"), and each helper (Agent call) writes <that folder>/<session_id>/subagents/agent-*.jsonl.
// The session id is in the run's last JSON line.
//
// "NEW SINCE LAST RUN" is the difference between the state files now and the same
// files at chronicle's last commit (the clock commits the room right after this
// script, brain-backup.sh section 6). Comparing against git rather than against a
// copy kept here means there is no second copy to drift. If a morning's push
// failed, the next morning counts both nights together; that is the honest reading.
// Only items without "private": true are counted: the log is public.
import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { buildTrace, mergeTraces, visible, validate, formatMorningLine, sameness, STATE_NAMES, DOOR } from '../lib.mjs';

const ROOM = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHRON = join(ROOM, '..');
const BRAIN = '/Users/howisjason/Projects/march-7th/march-brain';
const SESSIONS = join(homedir(), '.claude/projects/-Users-howisjason-Projects-march-7th-march-brain');
// Overridable only so a test can aim them at copies (never the real file in a test).
const LEDGER = process.env.ROOM_LEDGER || join(BRAIN, 'notes/immune/free-hour-log.tsv');
const UNATTENDED = process.env.ROOM_UNATTENDED || join(BRAIN, 'inner-life/unattended.md');
const STATE = join(ROOM, 'state');

const [logPath, capArg] = process.argv.slice(2);
const CAP = Number(capArg || process.env.FREE_HOUR_CEILING || 0);

// Chiang Mai time, written as ISO with its fixed +07:00 (Thailand keeps no summer time).
const bkk = (ms) => new Date(ms + 7 * 3600e3).toISOString().replace(/\.\d{3}Z$/, '+07:00');
const jsonl = (path) => {
  try { return readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); }
  catch { return []; }
};

// 1. the run's own numbers
let result = {};
try { result = JSON.parse(readFileSync(logPath, 'utf8').trim().split('\n').pop()); } catch { result = {}; }
const ledgerLast = (() => { try { return readFileSync(LEDGER, 'utf8').trim().split('\n').pop().split('\t'); } catch { return []; } })();
const verdict = ledgerLast[1] || 'no ledger line';
const cost = Number(result.total_cost_usd) || 0;

// 2. the session file -> the trace (kinds and places only)
const sid = String(result.session_id || '').replace(/[^A-Za-z0-9-]/g, '');
const main = sid ? jsonl(join(SESSIONS, `${sid}.jsonl`)) : [];
const subDir = join(SESSIONS, sid, 'subagents');
const subs = sid && existsSync(subDir) ? readdirSync(subDir).filter((f) => /^agent-.*\.jsonl$/.test(f)).map((f) => jsonl(join(subDir, f))) : [];
const firstStamp = main.map((r) => Date.parse(r.timestamp)).find(Number.isFinite);
const durationMs = Number(result.duration_ms) || 0;
const startedMs = firstStamp ?? (existsSync(logPath || '') ? statSync(logPath).mtimeMs - durationMs : Date.now());
const endedMs = startedMs + durationMs;
const trace = mergeTraces(buildTrace(main, startedMs), ...subs.map((s) => buildTrace(s, startedMs, { kind: 'checking', place: 'quill' })));
let quillCalled = 0;
for (const r of main) for (const b of (r.message && Array.isArray(r.message.content) ? r.message.content : [])) {
  if (b && b.type === 'tool_use' && (b.name === 'Agent' || b.name === 'Task')) {
    const head = `${(b.input && b.input.description) || ''}\n${String((b.input && b.input.prompt) || '').split('\n')[0]}`;
    if (/quill/i.test(head)) quillCalled++;
  }
}

// 3. the state files, now and at the last commit
const broken = [];
const problems = [];
const now = {};
for (const name of STATE_NAMES) {
  const p = join(STATE, `${name}.json`);
  if (!existsSync(p)) { now[name] = []; continue; }
  try {
    now[name] = JSON.parse(readFileSync(p, 'utf8'));
    const v = validate(name, now[name]);
    if (!v.ok) problems.push(...v.problems);
  } catch { broken.push(`${name}.json`); now[name] = []; }
}
const before = (name) => {
  try { return JSON.parse(execFileSync('git', ['-C', CHRON, 'show', `HEAD:room/state/${name}.json`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); }
  catch { return []; }
};
const ids = (list) => new Set((Array.isArray(list) ? list : []).map((i) => i && i.id));
const fresh = (name) => { const old = ids(before(name)); return visible(now[name]).filter((i) => !old.has(i.id)); };

// 4. the deltas
const oldBench = new Map((Array.isArray(before('bench')) ? before('bench') : []).map((b) => [b && b.id, b]));
const benchSteps = [];
const titles = {};
for (const b of visible(now.bench)) {
  const was = oldBench.get(b.id);
  const n = (Array.isArray(b.steps) ? b.steps.length : 0) - (was && Array.isArray(was.steps) ? was.steps.length : 0);
  if (!was || n > 0 || was.status !== b.status) { benchSteps.push({ id: b.id, n: Math.max(0, n), status: b.status }); titles[b.id] = b.title; }
}
const newQuill = fresh('quill');
const entry = {
  run: bkk(startedMs).slice(0, 16).replace(/[-:]/g, '').replace('T', '-'),
  started: bkk(startedMs), ended: bkk(endedMs), seconds: Math.round(durationMs / 1000),
  verdict,
  pins: fresh('board').length, bench_steps: benchSteps, cloud: fresh('cloud').length, shelf: fresh('shelf').length,
  quill: { yes: newQuill.filter((q) => q.verdict === 'yes').length, no: newQuill.filter((q) => q.verdict === 'no').length, called: quillCalled, recorded: newQuill.length },
  trace,
  // against the last seven runs' traces, read from this same public log
  sameness: sameness(trace, jsonl(join(STATE, 'log.jsonl')).slice(-7).map((e) => e.trace)),
  broken,
};

// 4b. the "I used this" presses: the door's counts, copied into state/used.json
// ({id: n}). A door that is down never fails the run; it is named in the problems
// and yesterday's file stays. used_new (presses since the last commit) rides only
// in the morning line.
let usedNew = 0;
try {
  const r = await fetch(`${DOOR}/used`, { signal: AbortSignal.timeout(10000) });
  const counts = (await r.json()).counts;
  if (!r.ok || !counts || typeof counts !== 'object') throw new Error(`HTTP ${r.status}`);
  // only ids on the bench: the door counts any id anyone sends, so a made-up one never reaches the page
  const onBench = new Set(visible(now.bench).map((i) => i.id));
  const clean = Object.fromEntries(Object.entries(counts).filter(([k, v]) => onBench.has(k) && Number.isInteger(v) && v > 0));
  let old = {};
  try { old = JSON.parse(execFileSync('git', ['-C', CHRON, 'show', 'HEAD:room/state/used.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch { old = {}; }
  const sum = (o) => Object.values(o || {}).reduce((n, v) => n + (Number(v) || 0), 0);
  usedNew = Math.max(0, sum(clean) - sum(old));
  writeFileSync(join(STATE, 'used.json'), JSON.stringify(clean, null, 2) + '\n');
} catch (e) { problems.push(`the door's /used did not answer (${e.message}); used.json left as it was`); }

// 5. the log line and now.json. The run's cost is NOT in the log line: the log is
// public, and this repo's law keeps J's money out of every public file. The cost
// rides only in the morning line (march-brain, private) and the hour's ledger.
mkdirSync(STATE, { recursive: true });
appendFileSync(join(STATE, 'log.jsonl'), JSON.stringify(entry) + '\n');
writeFileSync(join(STATE, 'now.json'), JSON.stringify({ awake: false, last_run: entry.run, ended: entry.ended, next: '07:00 Asia/Bangkok' }, null, 2) + '\n');

// 6. the morning line, under "## Unreported". march-mind.sh prints everything after
// that header at a session's start, so the line must land inside that section: at
// the end of the file when Unreported is the last section (the normal shape), else
// right under its header.
const line = formatMorningLine({ ...entry, cost_usd: cost, cap_usd: CAP, used_new: usedNew }, titles);
let placed = 'not placed';
try {
  const text = readFileSync(UNATTENDED, 'utf8');
  const lines = text.split('\n');
  const heads = lines.map((l, n) => (/^## /.test(l) ? n : -1)).filter((n) => n >= 0);
  const at = lines.findIndex((l) => l.trim() === '## Unreported');
  if (at < 0) { appendFileSync(UNATTENDED, `${text.endsWith('\n') ? '' : '\n'}\n## Unreported\n\n${line}\n`); placed = 'new Unreported section'; }
  else if (heads[heads.length - 1] === at) { appendFileSync(UNATTENDED, `${text.endsWith('\n') ? '' : '\n'}\n${line}\n`); placed = 'appended'; }
  else { lines.splice(at + 1, 0, '', line); writeFileSync(UNATTENDED, lines.join('\n')); placed = 'under its header'; }
} catch (e) { placed = `FAILED: ${e.message}`; }

// 7. one line for brain-backup.sh's log
const notes = [broken.length && `broken: ${broken.join(', ')}`, problems.length && `${problems.length} problems: ${problems.slice(0, 3).join('; ')}`,
  `morning line ${placed}`].filter(Boolean).join('; ');
console.log(`room: ${line.replace(/^- \*\*|\*\*/g, '')} [${notes}]`);
