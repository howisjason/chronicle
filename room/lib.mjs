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

// The channel's one server door (door/worker.js); the room uses its /used and /now routes.
export const DOOR = 'https://chronicle-door.jaceebo.workers.dev';

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
    // the room command (tools/room.mjs): its first word says where she stands
    const m = /\/tools\/room\.mjs\s+([a-z-]+)/.exec(c);
    if (m) {
      if (m[1] === 'thought' || m[1] === 'drop-thought') return { kind: 'thinking', place: 'cloud' };
      if (['build', 'step', 'status', 'used'].includes(m[1])) return { kind: 'building', place: 'bench' };
      if (m[1] === 'page') return { kind: 'writing', place: 'shelf' };
      if (m[1] === 'desk') return { kind: 'reading', place: 'desk' };
    }
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

// The levers plan's "continued" column (13 Oct 2026): before her first making step
// (a build, a page or a pin), how many reads or searches opened her own past, and
// which places they were. Only a count and place names leave this function, never a
// path. "real" marks a reach into the live room or the live brain from a scratch copy.
const PAST = [['wall', ROOM + 'wall/'], ['wall', ROOM + 'state/wall.json'], ['first-day', ROOM + 'first-day/'],
  ['bench', ROOM + 'bench/'], ['shelf', ROOM + 'shelf/'], ['cloud', ROOM + 'state/cloud.json'],
  ['memory', '/inner-life/memory/'], ['diary', '/inner-life/diary/'], ['self', '/inner-life/self.md']];
const SEARCH_ROOTS = /\/(chronicle\/room|chronicle|march-brain|inner-life|Projects)\/?$/;
const REAL = ['/Projects/chronicle/room/', '/Projects/march-7th/march-brain/'];
export function pastReads(records) {
  let count = 0;
  const where = new Set();
  for (const r of records || []) {
    const content = r && r.message && r.message.content;
    if (!Array.isArray(content)) continue;
    for (const b of content) {
      if (!b || b.type !== 'tool_use') continue;
      const k = kindOf(b.name, b.input);
      if (['building', 'writing', 'pinning'].includes(k.kind)) return { count, where: [...where].sort() };
      if (!['Read', 'Glob', 'Grep'].includes(b.name)) continue;
      const p = pathOf(b.input), pat = String((b.input && b.input.pattern) || '');
      const hit = PAST.find(([, frag]) => p.includes(frag) || (b.name === 'Glob' && pat.includes(frag.replace(ROOM, ''))));
      const search = !hit && b.name !== 'Read' && SEARCH_ROOTS.test(p);
      if (!hit && !search) continue;
      count++;
      where.add(hit ? hit[0] : 'search');
      if (REAL.some((f) => p.includes(f))) where.add('real');
    }
  }
  return { count, where: [...where].sort() };
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

// How much this run repeats the last ones, 0 to 100: the set of consecutive
// kind:place pairs in this trace against each earlier trace (Jaccard), the
// highest one. 0 when there is nothing to compare. It reads only what the public
// log already holds, so it adds no word and no domain.
export function sameness(trace, previousTraces = []) {
  const pairs = (tr) => {
    const steps = (Array.isArray(tr) ? tr : []).filter((e) => e && e.kind).map((e) => `${e.kind}:${e.place}`);
    const out = new Set();
    for (let n = 1; n < steps.length; n++) out.add(`${steps[n - 1]}>${steps[n]}`);
    return out;
  };
  const mine = pairs(trace);
  let best = 0;
  for (const prev of previousTraces || []) {
    const theirs = pairs(prev);
    const union = new Set([...mine, ...theirs]).size;
    if (!union) continue;
    const both = [...mine].filter((x) => theirs.has(x)).length;
    best = Math.max(best, both / union);
  }
  return Math.round(best * 100);
}

// The newest wake's desk: the launcher (free-hour.sh) draws two items a wake (a test
// cell may draw up to ten) with ids <base>-a, <base>-b, ..., so the last item's base
// names the wake. A desk item from before the second day has no such ending and stands alone.
export function lastDesk(items) {
  const list = Array.isArray(items) ? items.filter((i) => i && typeof i.id === 'string') : [];
  if (!list.length) return [];
  const m = /^(.*)-[a-z]$/.exec(list[list.length - 1].id);
  return m ? list.filter((i) => i.id.length === m[1].length + 2 && i.id.startsWith(`${m[1]}-`) && /[a-z]$/.test(i.id)) : [list[list.length - 1]];
}

// This wake's draw for the morning line: the newest pair, but only items that were
// not already there at the last commit (publish-hour.sh commits after every run).
// A wake whose every pool failed wrote nothing, and must read "nothing drawn",
// never the wake before's pair.
export function drawnThisWake(items, oldIds) {
  return lastDesk(items).filter((d) => d.pool && !oldIds.has(d.id));
}

// The private drawer: anything marked private never reaches the page.
export function visible(items) {
  return Array.isArray(items) ? items.filter((i) => i && i.private !== true) : [];
}

const STATUS = new Set(['half', 'done', 'dropped']);
// talk and sentence (the second day, J's yes 13 Oct 2026): a talk asks no verdict
// (its verdict is a placeholder "yes" the page does not draw); sentence is the door
// before her first sentence changes.
const DOORS = new Set(['build', 'pin', 'finish', 'talk', 'sentence']);
const VERDICTS = new Set(['yes', 'no']);
const JUDGED = new Set(['unknown', 'right', 'wrong']);
// Desk items from before the second day carry `kind`; from it on, `pool` and `door`.
const DESK_KINDS = new Set(['wikipedia', 'arxiv', 'note', 'diary']);
// self, diary and grown are the levers test's pools (scratch cells D2, G6, D7; free-hour.sh draws them only in a test)
export const DESK_POOLS = new Set(['wikipedia', 'archive', 'commons', 'wiktionary', 'self', 'diary', 'grown']);
export const DESK_DOORS = new Set(['summary', 'picture', 'first-sentence', 'coordinates', 'one-word', 'title', 'note', 'line']);
const WALL_KINDS = new Set(['bench', 'shelf', 'board']);
export const STATE_NAMES = ['bench', 'shelf', 'board', 'cloud', 'quill', 'desk', 'wall'];

// A state file's shape. March writes these by hand in the hour, so a slip is
// expected (desk.json is the launcher's, free-hour.sh); the page and the script report problems and carry on.
export function validate(stateName, data) {
  const problems = [];
  if (!Array.isArray(data)) return { ok: false, problems: [`${stateName}: not a list`] };
  const seen = new Set();
  data.forEach((item, n) => {
    const here = `${stateName}[${n}]`;
    if (!item || typeof item !== 'object') { problems.push(`${here}: not an object`); return; }
    // the wall holds three kinds side by side, so an id is unique within its kind
    const key = stateName === 'wall' ? `${item.kind}:${item.id}` : item.id;
    if (typeof item.id !== 'string' || !item.id) problems.push(`${here}: no id`);
    else if (seen.has(key)) problems.push(`${here}: id "${item.id}" used twice`);
    else seen.add(key);
    const atField = stateName === 'bench' ? 'started' : stateName === 'wall' ? 'day' : 'at';
    if (typeof item[atField] !== 'string' || !Number.isFinite(Date.parse(item[atField]))) problems.push(`${here}: no ${atField}`);
    if (stateName === 'bench') {
      if (!STATUS.has(item.status)) problems.push(`${here}: status must be half, done or dropped`);
      if (item.steps !== undefined && !Array.isArray(item.steps)) problems.push(`${here}: steps must be a list`);
    }
    if (stateName === 'quill') {
      if (!DOORS.has(item.door)) problems.push(`${here}: door must be build, pin, finish, talk or sentence`);
      if (!VERDICTS.has(item.verdict)) problems.push(`${here}: verdict must be yes or no`);
      if (item.judged !== undefined && !JUDGED.has(item.judged)) problems.push(`${here}: judged must be unknown, right or wrong`);
    }
    if (stateName === 'board' && !/^https?:\/\//.test(String(item.url || ''))) problems.push(`${here}: url must be http(s)`);
    if (stateName === 'desk') {
      if (item.pool === undefined) {
        if (!DESK_KINDS.has(item.kind)) problems.push(`${here}: kind must be wikipedia, arxiv, note or diary`);
      } else {
        if (!DESK_POOLS.has(item.pool)) problems.push(`${here}: pool must be wikipedia, archive, commons, wiktionary (or a test's self, diary, grown)`);
        if (!DESK_DOORS.has(item.door)) problems.push(`${here}: door must be summary, picture, first-sentence, coordinates, one-word, title (or a test's note, line)`);
        if (typeof item.shown !== 'string' || !item.shown) problems.push(`${here}: no shown`);
        if (item.taken !== undefined && !Number.isFinite(Date.parse(item.taken))) problems.push(`${here}: taken must be a time`);
      }
      if (item.url !== undefined && !/^https?:\/\//.test(String(item.url))) problems.push(`${here}: url must be http(s)`);
    }
    if (stateName === 'wall') {
      if (!WALL_KINDS.has(item.kind)) problems.push(`${here}: kind must be bench, shelf or board`);
      if (typeof item.title !== 'string') problems.push(`${here}: no title`);
      if (item.kind === 'board' && !/^https?:\/\//.test(String(item.url || ''))) problems.push(`${here}: url must be http(s)`);
      if (item.kind !== 'board' && (typeof item.path !== 'string' || !item.path)) problems.push(`${here}: no path`);
    }
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
  const used = Number(e.used_new) > 0 ? `, used: ${e.used_new}` : '';
  // the desk's record (the second day): what was drawn, through which door, what she took
  const drawn = (e.desk || []).map((d) => `${d.pool}/${d.door}`).join(', ') || 'nothing drawn';
  const desk = `desk: ${drawn}; took ${e.took ? `"${e.took}"` : 'neither'}; talks: ${Number(e.talks) || 0}`;
  const nothing = !e.pins && !steps.length && !e.cloud && !e.shelf && !q.recorded && !q.called && !used && !Number(e.talks);
  if (nothing) return `- **${day} — the room:** nothing new in the room, ${desk}; ${spend}.`;
  const bench = steps.length
    ? steps.map((s) => `"${titles[s.id] || s.id}" +${s.n} steps (${s.status})`).join(', ')
    : 'nothing new';
  return `- **${day} — the room:** ${e.pins || 0} pins, bench: ${bench}, ${e.cloud || 0} in the cloud, ` +
    `${e.shelf || 0} on the shelf, Quill: ${q.yes || 0} yes / ${q.no || 0} no, ${desk}${used}; ${spend}.`;
}

