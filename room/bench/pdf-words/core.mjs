// core.mjs: the PDF reading itself, shared by read.mjs (node) and demo.html
// (the browser). Everything between the two core markers is copied into
// demo.html word for word by gen.mjs, and test.mjs checks the copy, so it
// uses no imports: the caller hands in `inflate(bytes, cap)`, which returns a
// promise of the inflated bytes or throws once the output passes `cap`.

// core:start
const CAP = 32 * 1024 * 1024; // the most one stream may inflate to, in bytes

class Ref { constructor(n) { this.n = n; } }
class Str { constructor(b) { this.b = b; } } // b: one char per byte, 0-255
class Op { constructor(o) { this.o = o; } }
// Names are JS strings starting with '/', dicts are Maps keyed without the '/'.

function latin1(bytes, from = 0, to = bytes.length) {
  let s = '';
  for (let i = from; i < to; i += 8192) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(to, i + 8192)));
  }
  return s;
}

const isWs = c => c === '\0' || c === '\t' || c === '\n' || c === '\f' || c === '\r' || c === ' ';
const isDelim = c => '()<>[]{}/%'.includes(c);

function skipWs(L) {
  const s = L.s;
  while (L.pos < s.length) {
    const c = s[L.pos];
    if (c === '%') { while (L.pos < s.length && s[L.pos] !== '\n' && s[L.pos] !== '\r') L.pos++; }
    else if (isWs(c)) L.pos++;
    else break;
  }
}

function readLiteral(L) {
  const s = L.s;
  let i = L.pos + 1, depth = 1, out = '';
  while (i < s.length) {
    const c = s[i++];
    if (c === '\\') {
      const d = s[i++];
      if (d === 'n') out += '\n';
      else if (d === 'r') out += '\r';
      else if (d === 't') out += '\t';
      else if (d === 'b') out += '\b';
      else if (d === 'f') out += '\f';
      else if (d === '\r') { if (s[i] === '\n') i++; }
      else if (d === '\n') { /* a line continued */ }
      else if (d >= '0' && d <= '7') {
        let o = d;
        while (o.length < 3 && s[i] >= '0' && s[i] <= '7') o += s[i++];
        out += String.fromCharCode(parseInt(o, 8) & 255);
      } else if (d !== undefined) out += d;
    } else if (c === '(') { depth++; out += c; }
    else if (c === ')') { if (--depth === 0) break; out += c; }
    else out += c;
  }
  L.pos = i;
  return out;
}

function token(L) {
  skipWs(L);
  const s = L.s;
  if (L.pos >= s.length) return null;
  const c = s[L.pos];
  if (c === '<' && s[L.pos + 1] === '<') { L.pos += 2; return '<<'; }
  if (c === '>' && s[L.pos + 1] === '>') { L.pos += 2; return '>>'; }
  if (c === '[' || c === ']' || c === '{' || c === '}') { L.pos++; return c; }
  if (c === '/') {
    let j = L.pos + 1;
    while (j < s.length && !isWs(s[j]) && !isDelim(s[j])) j++;
    const raw = s.slice(L.pos + 1, j);
    L.pos = j;
    return '/' + raw.replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
  if (c === '(') return new Str(readLiteral(L));
  if (c === '<') {
    let j = s.indexOf('>', L.pos);
    if (j < 0) j = s.length;
    const hex = s.slice(L.pos + 1, j).replace(/[^0-9A-Fa-f]/g, '');
    L.pos = j + 1;
    let b = '';
    for (let i = 0; i < hex.length; i += 2) b += String.fromCharCode(parseInt(hex[i] + (hex[i + 1] || '0'), 16));
    return new Str(b);
  }
  let j = L.pos;
  while (j < s.length && !isWs(s[j]) && !isDelim(s[j])) j++;
  if (j === L.pos) { L.pos++; return new Op(c); } // a stray ) or >
  const w = s.slice(L.pos, j);
  L.pos = j;
  if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w)) return Number(w);
  return new Op(w);
}

function value(L, tok = token(L)) {
  if (tok === '<<') {
    const d = new Map();
    for (;;) {
      const k = token(L);
      if (k === '>>' || k === null) return d;
      if (typeof k === 'string' && k[0] === '/') d.set(k.slice(1), value(L));
    }
  }
  if (tok === '[') {
    const a = [];
    for (;;) {
      const t = token(L);
      if (t === ']' || t === null) return a;
      a.push(value(L, t));
    }
  }
  if (typeof tok === 'number' && Number.isInteger(tok) && tok >= 0) {
    const save = L.pos;
    const g = token(L);
    if (typeof g === 'number' && Number.isInteger(g)) {
      const r = token(L);
      if (r instanceof Op && r.o === 'R') return new Ref(tok);
    }
    L.pos = save;
  }
  return tok;
}

// Every "N G obj" in the file, read in order. A stream's bytes are skipped
// over, so nothing inside a picture is ever taken for an object. A later
// object with the same number wins, as an incremental update means.
function scanObjects(s) {
  const objs = new Map();
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;
  while ((m = re.exec(s))) {
    const L = { s, pos: re.lastIndex };
    const v = value(L);
    const o = { v };
    const at = { s, pos: L.pos };
    skipWs(at);
    if (s.startsWith('stream', at.pos)) {
      let start = at.pos + 6;
      if (s[start] === '\r') start++;
      if (s[start] === '\n') start++;
      let end = -1;
      const len = v instanceof Map ? v.get('Length') : undefined;
      if (typeof len === 'number' && /^\s*endstream/.test(s.slice(start + len, start + len + 12))) end = start + len;
      if (end < 0) {
        end = s.indexOf('endstream', start);
        if (end < 0) end = s.length;
        if (s[end - 1] === '\n') end--;
        if (s[end - 1] === '\r') end--;
      }
      o.start = start;
      o.end = end;
      re.lastIndex = end;
    } else re.lastIndex = L.pos;
    objs.set(+m[1], o);
  }
  return objs;
}

function a85(b) {
  const s = latin1(b).replace(/\s/g, '');
  const out = [];
  let group = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '~') break;
    if (c === 'z' && group.length === 0) { out.push(0, 0, 0, 0); continue; }
    group.push(c.charCodeAt(0) - 33);
    if (group.length === 5) {
      let n = 0;
      for (const g of group) n = n * 85 + g;
      out.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
      group = [];
    }
  }
  if (group.length > 1) {
    const k = group.length;
    while (group.length < 5) group.push(84);
    let n = 0;
    for (const g of group) n = n * 85 + g;
    const four = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    out.push(...four.slice(0, k - 1));
  }
  return Uint8Array.from(out);
}

function ahx(b) {
  const hex = latin1(b).split('>')[0].replace(/[^0-9A-Fa-f]/g, '');
  const out = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex[i] + (hex[i + 1] || '0'), 16);
  return out;
}

// Windows-1252 differs from Latin-1 only in 0x80-0x9F.
const WIN = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020,
  0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152,
  0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022,
  0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A,
  0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178,
};
const winChar = c => String.fromCharCode(WIN[c] || c);

// The few glyph names a /Differences array needs most often. Anything else
// becomes U+FFFD, so a gap shows instead of a wrong letter.
const GLYPHS = {
  space: ' ', period: '.', comma: ',', colon: ':', semicolon: ';', hyphen: '-',
  quoteright: '’', quoteleft: '‘', quotedbl: '"', quotesingle: "'",
  parenleft: '(', parenright: ')', slash: '/', fi: 'fi', fl: 'fl', ff: 'ff',
  endash: '–', emdash: '—', ampersand: '&', percent: '%', question: '?', exclam: '!',
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
};
function glyph(name) {
  if (/^[A-Za-z]$/.test(name)) return name;
  if (GLYPHS[name] !== undefined) return GLYPHS[name];
  const u = /^uni([0-9A-Fa-f]{4})$/.exec(name);
  return u ? String.fromCharCode(parseInt(u[1], 16)) : '�';
}

function utf16(hex) {
  if (hex.length <= 2) return hex ? String.fromCharCode(parseInt(hex, 16)) : '';
  let s = '';
  for (let i = 0; i + 4 <= hex.length; i += 4) s += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  return s;
}

function parseCMap(text) {
  const map = new Map();
  let bytes = 1;
  const cs = /begincodespacerange([\s\S]*?)endcodespacerange/.exec(text);
  if (cs) { const h = /<([0-9A-Fa-f]+)>/.exec(cs[1]); if (h) bytes = Math.max(1, h[1].length / 2); }
  for (const blk of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) map.set(parseInt(m[1], 16), utf16(m[2]));
  }
  for (const blk of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<[0-9A-Fa-f]*>|\[[^\]]*\])/g)) {
      const lo = parseInt(m[1], 16), hi = parseInt(m[2], 16);
      if (hi < lo || hi - lo > 65535) continue;
      if (m[3][0] === '[') {
        [...m[3].matchAll(/<([0-9A-Fa-f]*)>/g)].forEach((it, i) => map.set(lo + i, utf16(it[1])));
      } else {
        const base = m[3].slice(1, -1);
        const head = utf16(base);
        const last = head.charCodeAt(head.length - 1);
        for (let c = lo; c <= hi; c++) map.set(c, head.slice(0, -1) + String.fromCharCode(last + c - lo));
      }
    }
  }
  return { bytes, map };
}

function makeCtx(bytes, inflate) {
  const s = latin1(bytes);
  const ctx = { bytes, s, inflate, notes: [], fonts: new Map() };
  ctx.objs = scanObjects(s);
  ctx.get = v => {
    for (let i = 0; v instanceof Ref && i < 32; i++) v = ctx.objs.get(v.n)?.v;
    return v instanceof Ref ? undefined : v;
  };
  return ctx;
}

// A stream's decoded bytes, or null when its filter is a picture's (not text)
// or the stream won't inflate. Past the cap it is skipped and noted.
async function streamBytes(ctx, o) {
  if (!o || o.start == null) return null;
  let data = ctx.bytes.subarray(o.start, o.end);
  const d = o.v instanceof Map ? o.v : new Map();
  let f = ctx.get(d.get('Filter'));
  f = f == null ? [] : Array.isArray(f) ? f.map(ctx.get) : [f];
  for (const name of f) {
    if (name === '/FlateDecode' || name === '/Fl') {
      try { data = await ctx.inflate(data, CAP); }
      catch (e) {
        ctx.notes.push(/cap/.test(e.message) ? `a stream inflates past ${CAP / 1048576} MB; skipped` : 'a stream would not inflate; skipped');
        return null;
      }
    } else if (name === '/ASCII85Decode' || name === '/A85') data = a85(data);
    else if (name === '/ASCIIHexDecode' || name === '/AHx') data = ahx(data);
    else return null;
  }
  return data;
}

// Objects packed inside compressed object streams (/ObjStm) are unpacked
// into the same table. A plain object of the same number keeps its place.
async function unpackObjectStreams(ctx) {
  for (const o of [...ctx.objs.values()]) {
    if (!(o.v instanceof Map) || o.v.get('Type') !== '/ObjStm') continue;
    const b = await streamBytes(ctx, o);
    if (!b) continue;
    const t = latin1(b);
    const n = ctx.get(o.v.get('N')), first = ctx.get(o.v.get('First'));
    const L = { s: t, pos: 0 };
    const pairs = [];
    for (let i = 0; i < n; i++) pairs.push([token(L), token(L)]);
    for (const [num, off] of pairs) {
      if (typeof num === 'number' && typeof off === 'number' && !ctx.objs.has(num)) {
        ctx.objs.set(num, { v: value({ s: t, pos: first + off }) });
      }
    }
  }
}

function trailers(ctx) {
  const found = [];
  const re = /trailer\s*<</g;
  let m;
  while ((m = re.exec(ctx.s))) {
    const d = value({ s: ctx.s, pos: m.index + 7 });
    if (d instanceof Map) found.push(d);
  }
  for (const o of ctx.objs.values()) if (o.v instanceof Map && o.v.get('Type') === '/XRef') found.push(o.v);
  return found;
}

function pageList(ctx, catalog) {
  const out = [];
  const seen = new Set();
  const walk = (ref, inherited, depth) => {
    const node = ctx.get(ref);
    if (!(node instanceof Map) || depth > 64 || seen.has(node)) return;
    seen.add(node);
    const res = node.has('Resources') ? node.get('Resources') : inherited;
    const kids = ctx.get(node.get('Kids'));
    if (Array.isArray(kids)) for (const k of kids) walk(k, res, depth + 1);
    else out.push({ node, res });
  };
  if (catalog) walk(catalog.get('Pages'), null, 0);
  if (!out.length) { // no page tree found: every /Page in the order of the file
    for (const o of ctx.objs.values()) if (o.v instanceof Map && o.v.get('Type') === '/Page') out.push({ node: o.v, res: o.v.get('Resources') });
    if (out.length) ctx.notes.push('no page tree; pages taken in the order of the file');
  }
  return out;
}

async function fontOf(ctx, res, name) {
  const fonts = ctx.get(ctx.get(res)?.get?.('Font'));
  const ref = fonts instanceof Map ? fonts.get(String(name).slice(1)) : undefined;
  const key = ref instanceof Ref ? ref.n : ref;
  if (key !== undefined && ctx.fonts.has(key)) return ctx.fonts.get(key);
  const f = ctx.get(ref);
  let font = { bytes: 1, map: null, enc: null };
  if (f instanceof Map) {
    const tu = ctx.get(f.get('ToUnicode')) && ctx.objs.get(f.get('ToUnicode').n);
    const tub = tu ? await streamBytes(ctx, tu) : null;
    if (tub) font = { ...font, ...parseCMap(latin1(tub)) };
    else if (f.get('Subtype') === '/Type0') font.bytes = 2;
    const enc = ctx.get(f.get('Encoding'));
    if (enc instanceof Map) {
      const diffs = ctx.get(enc.get('Differences'));
      if (Array.isArray(diffs)) {
        font.enc = new Map();
        let code = 0;
        for (const d of diffs) {
          if (typeof d === 'number') code = d;
          else if (typeof d === 'string') font.enc.set(code++, glyph(d.slice(1)));
        }
      }
    }
  }
  if (key !== undefined) ctx.fonts.set(key, font);
  return font;
}

function decode(font, b) {
  const f = font || { bytes: 1 };
  let s = '';
  for (let i = 0; i < b.length; i += f.bytes) {
    let code = 0;
    for (let k = 0; k < f.bytes; k++) code = code * 256 + (b.charCodeAt(i + k) || 0);
    if (f.map && f.map.has(code)) s += f.map.get(code);
    else if (f.enc && f.enc.has(code)) s += f.enc.get(code);
    else s += f.bytes === 1 ? winChar(code) : '�';
  }
  return s;
}

// The text state: where the line is, and what has been written. A move to
// a new height starts a new line; a move along the same line is a space.
function newState() {
  return { m: [1, 0, 0, 1, 0, 0], lm: [1, 0, 0, 1, 0, 0], lead: 0, size: 12, lines: [], line: '', y: null, moved: false };
}
function moveText(T, tx, ty) {
  const [a, b, c, d, e, f] = T.lm;
  T.lm = [a, b, c, d, e + tx * a + ty * c, f + tx * b + ty * d];
  T.m = T.lm.slice();
  T.moved = true;
}
function show(T, text) {
  if (!text) return;
  const y = T.m[5];
  const tol = Math.max(0.5, 0.3 * Math.abs(T.size) * Math.hypot(T.m[2], T.m[3]));
  if (T.y !== null && Math.abs(y - T.y) > tol) {
    T.lines.push(T.line);
    T.line = '';
  } else if (T.moved && T.line && !/\s$/.test(T.line) && !/^\s/.test(text)) T.line += ' ';
  T.line += text;
  T.y = y;
  T.moved = false;
}
function space(T) { if (T.line && !/\s$/.test(T.line)) T.line += ' '; }

async function runContent(ctx, src, res, T, depth) {
  const L = { s: src, pos: 0 };
  const ops = [];
  let font = null;
  for (;;) {
    const t = value(L);
    if (t === null) break;
    if (!(t instanceof Op)) { ops.push(t); continue; }
    const o = t.o;
    const n = i => (typeof ops[i] === 'number' ? ops[i] : 0);
    if (o === 'BI') { // an inline picture: skip to its end
      const id = src.slice(L.pos).search(/\sID[\s]/);
      const from = id < 0 ? src.length : L.pos + id + 4;
      const ei = src.slice(from).search(/\sEI(?=[\s]|$)/);
      L.pos = ei < 0 ? src.length : from + ei + 3;
    } else if (o === 'BT') { T.m = [1, 0, 0, 1, 0, 0]; T.lm = [1, 0, 0, 1, 0, 0]; }
    else if (o === 'Tf') { font = await fontOf(ctx, res, ops[0]); T.size = n(1); }
    else if (o === 'TL') T.lead = n(0);
    else if (o === 'Td') moveText(T, n(0), n(1));
    else if (o === 'TD') { T.lead = -n(1); moveText(T, n(0), n(1)); }
    else if (o === 'Tm') { T.lm = [n(0), n(1), n(2), n(3), n(4), n(5)]; T.m = T.lm.slice(); T.moved = true; }
    else if (o === 'T*') moveText(T, 0, -T.lead);
    else if (o === 'Tj' && ops[0] instanceof Str) show(T, decode(font, ops[0].b));
    else if (o === "'" && ops[0] instanceof Str) { moveText(T, 0, -T.lead); show(T, decode(font, ops[0].b)); }
    else if (o === '"' && ops[2] instanceof Str) { moveText(T, 0, -T.lead); show(T, decode(font, ops[2].b)); }
    else if (o === 'TJ' && Array.isArray(ops[0])) {
      for (const e of ops[0]) {
        if (typeof e === 'number') { if (e < -200) space(T); }
        else if (e instanceof Str) show(T, decode(font, e.b));
      }
    } else if (o === 'Do' && depth < 8) {
      const xo = ctx.get(ctx.get(res)?.get?.('XObject'));
      const ref = xo instanceof Map ? xo.get(String(ops[0]).slice(1)) : undefined;
      const obj = ref instanceof Ref ? ctx.objs.get(ref.n) : null;
      if (obj && obj.v instanceof Map && obj.v.get('Subtype') === '/Form') {
        const b = await streamBytes(ctx, obj);
        if (b) await runContent(ctx, latin1(b), obj.v.get('Resources') || res, T, depth + 1);
      }
    }
    ops.length = 0;
  }
}

// The whole document: { pages: [text of each page], notes: [what was skipped] }.
async function pdfText(bytes, inflate) {
  const ctx = makeCtx(bytes, inflate);
  const head = ctx.s.indexOf('%PDF-');
  if (head < 0 || head > 1024) throw new Error('not a PDF: no %PDF- header');
  await unpackObjectStreams(ctx);
  const tr = trailers(ctx);
  if (tr.some(d => d.has('Encrypt'))) {
    throw new Error('encrypted: this PDF is locked, and this reader does not unlock PDFs, so it prints nothing rather than garbage');
  }
  let catalog = null;
  for (const d of tr) { const c = ctx.get(d.get('Root')); if (c instanceof Map && c.has('Pages')) catalog = c; }
  if (!catalog) for (const o of ctx.objs.values()) if (o.v instanceof Map && o.v.get('Type') === '/Catalog') catalog = o.v;
  const pages = [];
  for (const { node, res } of pageList(ctx, catalog)) {
    let c = node.get('Contents');
    c = Array.isArray(ctx.get(c)) ? ctx.get(c) : c == null ? [] : [c];
    const parts = [];
    for (const r of c) {
      const b = r instanceof Ref ? await streamBytes(ctx, ctx.objs.get(r.n)) : null;
      if (b) parts.push(latin1(b));
    }
    const T = newState();
    await runContent(ctx, parts.join('\n'), res, T, 0);
    if (T.line) T.lines.push(T.line);
    pages.push(T.lines.map(l => l.replace(/\s+$/, '')).filter(l => l).join('\n'));
  }
  return { pages, notes: ctx.notes };
}
// core:end

export { pdfText, parseCMap, a85, latin1, CAP };
