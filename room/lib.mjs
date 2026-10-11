// lib.mjs: the pure half of March's room, shared by the page (room.js, in the
// browser) and the post-run script (tools/log-run.mjs, in Node). No DOM, no
// imports, no file access, so both can load it and room.test.mjs can test it.
//
// The one promise this file keeps: what leaves the session file is a KIND and
// a PLACE, never a path, a query, a file name or a word of hers. kindOf looks
// at a tool call's input only to decide the place, and buildTrace keeps only
// {t, kind, place}. The tests assert both.

// The room's own folder, matched as a path fragment so the same rule holds
// for the live Mac path and for test paths.
const ROOM = '/chronicle/room/';
// The room's own drawer (git-ignored, never published) is private the same way.
const PRIVATE = ['/inner-life/diary/', '/inner-life/memory/', ROOM + 'drawer/'];

const pathOf = (input) => String((input && (input.file_path || input.path || input.notebook_path)) || '');

// One tool call -> where March stands while making it (the plan's table, 11 Oct 2026).
export function kindOf(name, input) {
  const p = pathOf(input);
  if (name === 'Edit' || name === 'Write' || name === 'NotebookEdit') {
    if (PRIVATE.some((d) => p.includes(d))) return { kind: 'private', place: 'drawer' };
    if (p.includes(ROOM + 'bench/')) return { kind: 'building', place: 'bench' };
    if (p.includes(ROOM + 'shelf/') || p.endsWith(ROOM + 'state/shelf.json')) return { kind: 'writing', place: 'shelf' };
    if (p.endsWith(ROOM + 'state/cloud.json')) return { kind: 'thinking', place: 'cloud' };
    if (p.endsWith(ROOM + 'state/board.json')) return { kind: 'pinning', place: 'board' };
    return { kind: 'idle', place: 'none' };
  }
  if (name === 'Read' || name === 'Glob' || name === 'Grep') {
    // her own private folders read as the drawer too, so nothing about them reaches the trace
    if (PRIVATE.some((d) => p.includes(d))) return { kind: 'private', place: 'drawer' };
    return { kind: 'reading', place: p.includes(ROOM) ? 'shelf' : 'desk' };
  }
  if (name === 'WebSearch' || name === 'WebFetch') return { kind: 'searching', place: 'desk' };
  if (name === 'Bash') {
    const c = String((input && input.command) || '');
    if (c.includes('/tools/try.sh')) return { kind: 'building', place: 'bench' };
    if (c.includes('/tools/pin.sh')) return { kind: 'pinning', place: 'board' };
    return { kind: 'idle', place: 'none' };
  }
  if (name === 'Agent' || name === 'Task') return { kind: 'checking', place: 'quill' };
  return { kind: 'idle', place: 'none' };
}

// Session-file records -> [{t, kind, place}], t in whole seconds from the run's
// start. `as` forces every entry to one kind (a helper's own calls are Quill at
// work, so they draw as checking). Idle calls (a tool search, say) are dropped,
// and a run of calls at the same place collapses to its first, so a hundred
// reads at the desk is one stop at the desk.
export function buildTrace(records, startedAtMs, as = null) {
  const out = [];
  for (const r of records || []) {
    const content = r && r.message && r.message.content;
    if (!Array.isArray(content)) continue;
    const at = Date.parse(r.timestamp);
    if (!Number.isFinite(at)) continue;
    for (const b of content) {
      if (!b || b.type !== 'tool_use') continue;
      const k = as || kindOf(b.name, b.input);
      if (k.kind === 'idle') continue;
      const t = Math.max(0, Math.round((at - startedAtMs) / 1000));
      const last = out[out.length - 1];
      if (last && last.kind === k.kind && last.place === k.place) continue;
      out.push({ t, kind: k.kind, place: k.place });
    }
  }
  return out;
}

// Two traces (the session's and its helpers') -> one, in time order, collapsed again.
export function mergeTraces(...traces) {
  const all = traces.flat().sort((a, b) => a.t - b.t);
  const out = [];
  for (const e of all) {
    const last = out[out.length - 1];
    if (last && last.kind === e.kind && last.place === e.place) continue;
    out.push({ t: e.t, kind: e.kind, place: e.place });
  }
  return out;
}

// The private drawer: anything marked private never reaches the page.
export function visible(items) {
  return Array.isArray(items) ? items.filter((i) => i && i.private !== true) : [];
}

const STATUS = new Set(['half', 'done', 'dropped']);
const DOORS = new Set(['build', 'pin', 'finish']);
const VERDICTS = new Set(['yes', 'no']);
export const STATE_NAMES = ['bench', 'shelf', 'board', 'cloud', 'quill'];

// A state file's shape. March writes these by hand in the hour, so a slip is
// expected; the page and the script report problems and carry on.
export function validate(stateName, data) {
  const problems = [];
  if (!Array.isArray(data)) return { ok: false, problems: [`${stateName}: not a list`] };
  const seen = new Set();
  data.forEach((item, n) => {
    const here = `${stateName}[${n}]`;
    if (!item || typeof item !== 'object') { problems.push(`${here}: not an object`); return; }
    if (typeof item.id !== 'string' || !item.id) problems.push(`${here}: no id`);
    else if (seen.has(item.id)) problems.push(`${here}: id "${item.id}" used twice`);
    else seen.add(item.id);
    const atField = stateName === 'bench' ? 'started' : 'at';
    if (typeof item[atField] !== 'string' || !Number.isFinite(Date.parse(item[atField]))) problems.push(`${here}: no ${atField}`);
    if (stateName === 'bench') {
      if (!STATUS.has(item.status)) problems.push(`${here}: status must be half, done or dropped`);
      if (item.steps !== undefined && !Array.isArray(item.steps)) problems.push(`${here}: steps must be a list`);
    }
    if (stateName === 'quill') {
      if (!DOORS.has(item.door)) problems.push(`${here}: door must be build, pin or finish`);
      if (!VERDICTS.has(item.verdict)) problems.push(`${here}: verdict must be yes or no`);
    }
    if (stateName === 'board' && !/^https?:\/\//.test(String(item.url || ''))) problems.push(`${here}: url must be http(s)`);
  });
  return { ok: problems.length === 0, problems };
}

const money = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`;
};

// The one line the next morning's first reply reads out (unattended.md, under
// "Unreported"). `titles` maps bench ids to titles; the log keeps only ids.
export function formatMorningLine(e, titles = {}) {
  const day = String(e.started || '').slice(0, 10);
  const cost = Number(e.cost_usd) || 0, cap = Number(e.cap_usd) || 0;
  const pct = cap > 0 ? Math.round((cost / cap) * 100) : 0;
  const spend = `$${cost.toFixed(2)} of ${money(cap)} used (${pct}%), ${e.verdict || 'no verdict'}`;
  const steps = e.bench_steps || [];
  const q = e.quill || {};
  const nothing = !e.pins && !steps.length && !e.cloud && !e.shelf && !q.recorded && !q.called;
  if (nothing) return `- **${day} — the room:** nothing new in the room; ${spend}.`;
  const bench = steps.length
    ? steps.map((s) => `"${titles[s.id] || s.id}" +${s.n} steps (${s.status})`).join(', ')
    : 'nothing new';
  return `- **${day} — the room:** ${e.pins || 0} pins, bench: ${bench}, ${e.cloud || 0} in the cloud, ` +
    `${e.shelf || 0} on the shelf, Quill: ${q.yes || 0} yes / ${q.no || 0} no; ${spend}.`;
}

// J's margin notes at the top of the seed and the self page are `# ` lines
// (and bare `#`), notes TO him, never part of her page. They are dropped up to
// the first real line; after that every line is hers, `##` headings included.
export function stripNotes(md) {
  const lines = String(md).split('\n');
  let k = 0;
  while (k < lines.length && (/^#( |$)/.test(lines[k]) || lines[k].trim() === '')) k++;
  return lines.slice(k).join('\n');
}

// Lines of `text` that trip the forbidden list. `words` is a list of
// [RegExp, what] pairs (station/validate.mjs's FORBIDDEN) or plain strings.
export function forbiddenHits(text, words) {
  const hits = [];
  String(text).split('\n').forEach((line, n) => {
    for (const w of words || []) {
      const re = Array.isArray(w) ? w[0] : w instanceof RegExp ? w : null;
      const what = Array.isArray(w) ? w[1] : String(w);
      const hit = re ? re.test(line) : line.toLowerCase().includes(String(w).toLowerCase());
      if (hit) { hits.push({ line: n, what }); break; }
    }
  });
  return hits;
}
