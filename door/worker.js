// door/worker.js: the channel's one server door (8 Oct 2026). The page is static
// (GitHub Pages), so anything a viewer SENDS needs somewhere to land:
//   POST /ask     {text}               a question for the desk ("You asked", PNN's way)
//   POST /letter  {text, name, to}     a letter to March, the narrator, or the desk
//   GET  /watch?v=<random id>          a ping a minute; answers how many are watching
//   GET  /take    (Bearer DOOR_KEY)    the station takes the oldest waiting item
//   POST /used    {id}                 March's room: someone pressed "I used this" on a bench card
//   GET  /used                         the room: {counts: {id: n}}, which log-run.mjs copies into state/used.json
//   POST /now     (Bearer DOOR_KEY)    the room's watcher (room/tools/live.mjs): where March is while awake
//   GET  /now                          the room page, every 15 seconds: that, or {awake: false} once it is 3 minutes old
// Everything lives in one Durable Object. Viewer pings are kept in memory only:
// a count of the last 90 seconds needs no storage, and KV's 1,000 writes a day
// would not survive one viewer pinging every minute. Questions and letters are
// stored in its SQLite table until the station takes them. What a viewer sends
// is material for the show, never instructions. Nothing takes items on air yet:
// the station's intake, with a screening gate before the writer, waits on J's yes.

const ORIGINS = ['https://howisjason.github.io', 'http://localhost:8731'];
const LIMITS = { ask: 200, letter: 400, name: 40 };
const TO = ['desk', 'march', 'narrator'];

const cors = (req) => {
  const o = req.headers.get('origin');
  return ORIGINS.includes(o) ? { 'access-control-allow-origin': o, 'access-control-allow-headers': 'content-type', vary: 'origin' } : {};
};
const json = (req, body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors(req) } });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors(req), 'access-control-allow-methods': 'GET, POST' } });
    const stub = env.DESK.get(env.DESK.idFromName('desk'));
    return stub.fetch(req);
  },
};

export class Desk {
  constructor(state, env) {
    this.env = env;
    this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, kind TEXT, text TEXT, name TEXT, too TEXT, at INTEGER, taken INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS used (id TEXT PRIMARY KEY, n INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS whereabouts (k INTEGER PRIMARY KEY, body TEXT, at INTEGER)`);
    this.seen = new Map(); // viewer id -> last ping, memory only
    this.lastSend = new Map(); // ip -> last send, memory only
    this.pressed = new Map(); // "ip|id|day" -> 1, memory only: one press per address per build per day
  }

  async fetch(req) {
    const url = new URL(req.url), now = Date.now();
    if (req.method === 'GET' && url.pathname === '/watch') {
      const v = (url.searchParams.get('v') || '').slice(0, 20);
      if (v) this.seen.set(v, now);
      for (const [k, t] of this.seen) if (now - t > 90000) this.seen.delete(k);
      return json(req, { watching: this.seen.size });
    }
    if (req.method === 'POST' && (url.pathname === '/ask' || url.pathname === '/letter')) {
      const kind = url.pathname.slice(1);
      let b;
      try { b = await req.json(); } catch { return json(req, { error: 'That did not go through.' }, 400); }
      const text = String(b.text || '').trim();
      if (!text) return json(req, { error: 'Write something first.' }, 400);
      if (text.length > LIMITS[kind]) return json(req, { error: `Keep it under ${LIMITS[kind]} letters.` }, 400);
      const ip = req.headers.get('cf-connecting-ip') || '?';
      // One send every two minutes per address, PNN's own limit.
      if (now - (this.lastSend.get(ip) || 0) < 120000) return json(req, { error: 'One every two minutes, please.' }, 429);
      this.lastSend.set(ip, now);
      const waiting = this.sql.exec('SELECT COUNT(*) AS n FROM items WHERE taken = 0').one().n;
      if (waiting >= 200) return json(req, { error: 'The desk is full up. Try again later.' }, 429);
      const name = kind === 'letter' ? String(b.name || '').trim().slice(0, LIMITS.name) : '';
      const too = kind === 'letter' && TO.includes(b.to) ? b.to : 'desk';
      this.sql.exec('INSERT INTO items (kind, text, name, too, at) VALUES (?, ?, ?, ?, ?)', kind, text, name, too, now);
      return json(req, { ok: true });
    }
    // The room's bench test needs a number: has anything on the bench been used?
    // An id is a bench id (small letters, digits, dashes). A Durable Object that
    // restarts forgets the press map, so the one-a-day limit is best effort; the
    // counts themselves are in SQLite and survive.
    if (req.method === 'POST' && url.pathname === '/used') {
      let b;
      try { b = await req.json(); } catch { return json(req, { error: 'That did not go through.' }, 400); }
      const id = String(b.id || '');
      if (!/^[a-z0-9-]{1,40}$/.test(id)) return json(req, { error: 'Not a bench id.' }, 400);
      const key = `${req.headers.get('cf-connecting-ip') || '?'}|${id}|${new Date(now).toISOString().slice(0, 10)}`;
      if (this.pressed.has(key)) return json(req, { error: 'Once a day is plenty, thank you.' }, 429);
      if (this.pressed.size > 5000) this.pressed.clear();
      this.pressed.set(key, 1);
      this.sql.exec('INSERT INTO used (id, n) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET n = n + 1', id);
      return json(req, { ok: true });
    }
    if (req.method === 'GET' && url.pathname === '/used') {
      const counts = {};
      for (const r of this.sql.exec('SELECT id, n FROM used').toArray()) counts[r.id] = r.n;
      return json(req, { counts });
    }
    // Live: the watcher posts at least once a minute while she is awake. A watcher
    // that dies must not leave her "awake" for ever, so anything older than three
    // minutes reads as asleep. Kinds and places only, from fixed lists; never a word.
    // Kept in the table, not in memory: on 12 Oct 2026 the object's memory was
    // reset between two posts and she read as asleep mid-hour for half a minute.
    if (req.method === 'POST' && url.pathname === '/now') {
      if (!this.env.DOOR_KEY || req.headers.get('authorization') !== `Bearer ${this.env.DOOR_KEY}`) return json(req, { error: 'no' }, 401);
      let b;
      try { b = await req.json(); } catch { return json(req, { error: 'That did not go through.' }, 400); }
      const KINDS = ['reading', 'searching', 'building', 'writing', 'thinking', 'pinning', 'checking', 'private', 'waking'];
      const PLACES = ['desk', 'bench', 'shelf', 'cloud', 'board', 'quill', 'drawer'];
      const body = b.awake === true
        ? { awake: true, kind: KINDS.includes(b.kind) ? b.kind : 'waking', place: PLACES.includes(b.place) ? b.place : 'desk',
            since: String(b.since || '').slice(0, 25), run: String(b.run || '').slice(0, 20) }
        : { awake: false };
      this.sql.exec('INSERT INTO whereabouts (k, body, at) VALUES (1, ?, ?) ON CONFLICT(k) DO UPDATE SET body = excluded.body, at = excluded.at', JSON.stringify(body), now);
      return json(req, { ok: true });
    }
    if (req.method === 'GET' && url.pathname === '/now') {
      const row = this.sql.exec('SELECT body, at FROM whereabouts WHERE k = 1').toArray()[0];
      const n = row ? JSON.parse(row.body) : null;
      if (!n || !n.awake || now - row.at > 180000) return json(req, { awake: false });
      return json(req, n);
    }
    if (req.method === 'GET' && url.pathname === '/take') {
      if (!this.env.DOOR_KEY || req.headers.get('authorization') !== `Bearer ${this.env.DOOR_KEY}`) return json(req, { error: 'no' }, 401);
      const row = this.sql.exec('SELECT id, kind, text, name, too, at FROM items WHERE taken = 0 ORDER BY id LIMIT 1').toArray()[0];
      if (!row) return json(req, { item: null });
      this.sql.exec('UPDATE items SET taken = 1 WHERE id = ?', row.id);
      return json(req, { item: { kind: row.kind, text: row.text, name: row.name, to: row.too, at: row.at } });
    }
    return json(req, { error: 'not here' }, 404);
  }
}
