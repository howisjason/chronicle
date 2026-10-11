#!/usr/bin/env node
// live.mjs: while March's hour runs, say where she is (round two, J's yes
// 12 Oct 2026). Started by march-brain/scripts/free-hour.sh beside the run:
//   node room/tools/live.mjs <session id> <run id> <launcher pid>
// It reads the run's session file as it grows, turns each tool call into a kind
// and a place (lib.mjs kindOf: never a path or a word), writes state/now.json
// and posts the same to the door (POST /now), which the page asks every 15
// seconds. When the launcher sends SIGTERM, or the launcher is gone, it writes
// awake: false, posts it once more, and exits. log-run.mjs writes now.json again
// after the hour; that file is what the clock commits.
//
// WHY THE SESSION FILE AND NOT THE RUN'S OUTPUT (measured 12 Oct 2026, CLI
// 2.1.293): with --output-format stream-json the stream's LAST line is a
// task_summary, not the result record the launcher's tripwire and log-run.mjs
// read, so the run keeps --output-format json and the launcher names the session
// up front (--session-id), which makes this file's path known from the start.
//
// Posts: at most one every 5 seconds, and at least one a minute while awake (the
// door reads anything older than 3 minutes as asleep, so a dead watcher cannot
// leave her awake). A failed post is ignored: the page is a window, never a gate.
import { readFileSync, writeFileSync, existsSync, openSync, readSync, fstatSync, closeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { kindOf, DOOR } from '../lib.mjs';

const ROOM = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOW = process.env.ROOM_NOW || join(ROOM, 'state/now.json');
const SESSIONS = join(homedir(), '.claude/projects/-Users-howisjason-Projects-march-7th-march-brain');
const [sid, run, launcher] = process.argv.slice(2);
if (!/^[0-9a-f-]{36}$/.test(sid || '')) { console.error('live: no session id'); process.exit(1); }
const FILE = join(SESSIONS, `${sid}.jsonl`);
let KEY = '';
try { KEY = readFileSync(join(homedir(), '.claude/chronicle-door-key'), 'utf8').trim(); } catch { /* no key: now.json only */ }

const bkk = (ms = Date.now()) => new Date(ms + 7 * 3600e3).toISOString().replace(/\.\d{3}Z$/, '+07:00');
let state = { awake: true, kind: 'waking', place: 'desk', since: bkk(), run };
let lastPost = 0, posted = '';

const post = async (force = false) => {
  const body = JSON.stringify(state);
  const t = Date.now();
  if (!force && ((body === posted && t - lastPost < 60000) || t - lastPost < 5000)) return;
  lastPost = t; posted = body;
  if (!KEY) return;
  try {
    await fetch(`${DOOR}/now`, { method: 'POST', headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(8000) });
  } catch { /* the door is down; the page falls back to the file */ }
};
const save = () => { try { writeFileSync(NOW, JSON.stringify(state, null, 2) + '\n'); } catch { /* never stop the hour */ } };

// the session file, read from where we left off; a half-written last line waits for the next read
let offset = 0, carry = '';
const readNew = () => {
  if (!existsSync(FILE)) return;
  const fd = openSync(FILE, 'r');
  try {
    const size = fstatSync(fd).size;
    if (size <= offset) return;
    const buf = Buffer.alloc(size - offset);
    readSync(fd, buf, 0, buf.length, offset);
    offset = size;
    const lines = (carry + buf.toString('utf8')).split('\n');
    carry = lines.pop();
    for (const l of lines) {
      let r; try { r = JSON.parse(l); } catch { continue; }
      const content = r && r.message && r.message.content;
      if (r.type !== 'assistant' || !Array.isArray(content)) continue;
      for (const b of content) {
        if (!b || b.type !== 'tool_use') continue;
        const k = kindOf(b.name, b.input);
        if (k.kind === 'idle' || (k.kind === state.kind && k.place === state.place)) continue;
        state = { awake: true, kind: k.kind, place: k.place, since: bkk(Date.parse(r.timestamp) || Date.now()), run };
      }
    }
  } finally { closeSync(fd); }
};

let ending = false;
const end = async () => {
  if (ending) return;
  ending = true;
  try { readNew(); } catch { /* ignore */ }
  state = { awake: false, last_run: run, ended: bkk() };
  save();
  await post(true);
  process.exit(0);
};
process.on('SIGTERM', end);
process.on('SIGINT', end);

save();
await post(true);
setInterval(async () => {
  if (launcher && !(() => { try { process.kill(Number(launcher), 0); return true; } catch { return false; } })()) return end();
  const before = JSON.stringify(state);
  try { readNew(); } catch { /* a bad read waits for the next tick */ }
  if (JSON.stringify(state) !== before) save();
  await post();
}, 2000);
