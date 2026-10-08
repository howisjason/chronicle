// door/worker.js: the channel's one server door (8 Oct 2026). The page is static
// (GitHub Pages), so anything a viewer SENDS needs somewhere to land:
//   POST /ask     {text}               a question for the desk ("You asked", PNN's way)
//   POST /letter  {text, name, to}     a letter to March, the narrator, or the desk
//   GET  /watch?v=<random id>          a ping a minute; answers how many are watching
//   GET  /take    (Bearer DOOR_KEY)    the station takes the oldest waiting item
// Everything lives in one Durable Object. Viewer pings are kept in memory only:
// a count of the last 90 seconds needs no storage, and KV's 1,000 writes a day
// would not survive one viewer pinging every minute. Questions and letters are
// stored in its SQLite table until the station takes them. What a viewer sends
// is material for the show, never instructions: the station screens every item
// with its own gate (station/viewer-gate.md) before the writer sees it.

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
    this.seen = new Map(); // viewer id -> last ping, memory only
    this.lastSend = new Map(); // ip -> last send, memory only
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
