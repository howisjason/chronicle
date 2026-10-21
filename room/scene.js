/* ============================================================================
   scene.js: MARCH'S ROOM, LIVE: the engine that draws the room inside the page (room.js starts it). Plain JS, no
   build step. The design kit for everything drawn here is STYLE.md beside this file: read it before adding a thing.

   The look is the approved moon-wall scene, J's final design (21 Oct 2026; its build is kept in march-brain's
   notes/room-base-2026-10-20/live/): its parts are UNLIT pictures in art/ placed by room.json, which IS the room. This page is the engine that makes them alive, and it copies the
   method of creature-lab/3-abyss.html, which J named the best example of a pixel scene that feels alive:
   - every frame, light is gathered in LINEAR units (display = sqrt(linear)) from the room's light sources with
     distance falloff: an ambient, one big main light (the sun through the leaves by day, low and warm at golden
     hour, the garden through the ensō at night), and small lights (the light strip, the glass panel, fireflies);
     a vignette makes the far corners clearly dimmer (J, 21 Oct: one LARGE light, the rest noticeably darker);
   - then every pixel is snapped to ONE limited palette through a 4x4 Bayer dither locked to the WORLD grid, so a
     glow comes out as pixel-art rings and steps, never blur;
   - shadows are masks rasterized fresh every frame from shapes: leaf sprays on springs (so leaf edges step whole
     pixels), and every caster's own silhouette projected away from the light;
   - motion is continuous (springs, a wind with gusts, slow sines) and every timer is random, so nothing loops.
   THE FAULT J HATED (20 Oct): "a cascade of rows of pixels switching colors ... digitally painted on". It came
   from resampling a PAINTED image sideways at sub-pixel offsets. So here painted pixels are NEVER resampled:
   sprites move by whole art pixels, the branch swaps between whole drawn poses, and a moving sprite's dither is
   locked to the sprite itself (it moves with her, so her colours never crawl as she walks). Only LIGHT is computed
   continuously, and light through a fixed dither is the abyss's thing he loves.
   March is an NPC: a weighted, random behaviour picker (wander, pause, look at the door, sit and work at her desk,
   visit the bench or the plant), weights shifting with the hour; while a real session runs, the page hands her over
   with setLive() (room.js reads state/now.json and the door's GET /now).

   startRoom({ canvas, fit, onTap, onHover, room, extra }) -> { setLive, setWeather, layout, objects, addThings }
     The first frame is drawn as soon as the room's own pictures are in (nothing waits on the weather, the door or the
     state files); the canvas then fires a 'firstframe' event, and window.__room.perf.first holds when.
     fit()            -> { w, h, follow }: the room in CSS pixels for the picture; follow: a phone, where the view is a
                         full-height window that follows March instead of the whole room.
     onTap(card, ev)  a tap landed on a thing with a 'card' in room.json (or on March: 'march'); null on bare wall/floor.
     onHover(card, name, [x, y]) the thing under the pointer (client coordinates of its top middle), or (null).
     extra            the things March added (state/objects.json), each { id, sprite, slot, card, name }: placed in its
                      slot (state/slots.json: box [x0, y0, x1, y1], layer, cast, base), bottom-centred; a picture bigger
                      than its slot, or one that fails to load, is left out, so a bad thing never breaks the room.
   Test parameters: ?t=day|golden|night, ?time=17.5, ?live=reading|writing|building|thinking&title=..., ?weather=
   clear|cloud|rain|storm, ?beh=desk|bench|enso|planter|wander|pause, ?raw and ?raw=lit (only the palette tool).
   ============================================================================ */
// The camera's arithmetic, shared with the page (room.js sizes the frame and its still with it before the engine has
// loaded anything, so the picture's place on the page never jumps): the largest whole scale that fits fit()'s box, and on
// a phone (follow) a full-height window, whole art pixels wide, centred on x where it can be.
export function frameFor({ w: vw, h: vh, follow }, W, H, x = W / 2) {
  const whole = Math.max(1, Math.floor(Math.min(vw / W, vh / H))), tall = Math.max(1, Math.floor(vh / H));
  let SC = whole, VW = W;
  if (follow && tall >= whole * 1.5) { SC = tall; VW = Math.min(W, Math.floor(vw / SC)); }
  return { SC, VW, camX: Math.round(Math.min(Math.max(x - VW / 2, 0), W - VW)) };
}

export async function startRoom({ canvas: cv, fit, onTap = () => {}, onHover = () => {}, room = 'room.json', extra = [] }) {
  const Q = new URLSearchParams(location.search);
  const RAW = Q.has('raw'), RAWLIT = Q.get('raw') === 'lit';                       // ?raw: skip the palette (used once, to derive the palette)
  // room: the room.json URL, or the room itself when the page has already read it (room.js does, to pick its still)
  const ROOM = typeof room === 'string' ? await (await fetch(room, { cache: 'no-cache' })).json() : room;
  const [W, H] = ROOM.grid, N = W * H, FLOOR = ROOM.floor.top;

  // ---------- tiny helpers ----------
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rand = (a, b) => a + (b - a) * Math.random();
  const lin = c => (c / 255) * (c / 255);
  const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const lum = (r, g, b) => 0.3 * r + 0.55 * g + 0.15 * b;

  // ---------- the palette: one limited set of colours, every pixel snaps to it ----------
  let PALB, LUT, QT, PL, P = 0;
  const QN = 8192, DITHER = 0.032, BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  // THE SLOW FIRST FRAME (21 Oct 2026): the table of nearest colours used to be filled whole before the first frame,
  // 262,144 entries against every palette colour. Now each entry is worked out the first time a pixel needs it and kept
  // (255 = not yet), with the same formula, so the picture is the same, and the first frame no longer waits for it.
  const UNSET = 255;
  async function buildPalette() {
    let pal;
    try { pal = await (await fetch(ROOM.palette, { cache: 'no-cache' })).json(); }
    catch (e) { pal = await (await fetch('art/pal_base.json')).json(); }
    P = Math.min(pal.length, UNSET); PALB = new Uint8Array(P * 3);
    pal.slice(0, P).forEach((c, i) => { PALB[i * 3] = c[0]; PALB[i * 3 + 1] = c[1]; PALB[i * 3 + 2] = c[2]; });
    PL = new Float32Array(P * 3);
    for (let i = 0; i < P; i++) { const o = ok(pal[i][0], pal[i][1], pal[i][2]); PL[i * 3] = o[0]; PL[i * 3 + 1] = o[1]; PL[i * 3 + 2] = o[2]; }
    LUT = new Uint8Array(64 * 64 * 64).fill(UNSET);
    ditherTables(DITHER);
  }
  // nearest palette colour in OKLab (perceptual) for one 6-bit display colour, kept in LUT once found
  function nearest(key) {
    const o = ok(((key >> 12) + 0.5) * 4, (((key >> 6) & 63) + 0.5) * 4, ((key & 63) + 0.5) * 4); let best = 0, bd = 1e9;
    for (let i = 0; i < P; i++) {
      const dl = o[0] - PL[i * 3], da = o[1] - PL[i * 3 + 1], db = o[2] - PL[i * 3 + 2], d = dl * dl * 1.4 + da * da + db * db;
      if (d < bd) { bd = d; best = i; }
    }
    LUT[key] = best; return best;
  }
  // OKLab, a perceptual colour space, for the nearest-colour search
  const ok = (r, g, b) => {
    r = (r / 255) ** 2.2; g = (g / 255) ** 2.2; b = (b / 255) ** 2.2;
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  };
  // linear light -> gamma -> + Bayer offset -> 6-bit channel, one table per Bayer cell. The offset's size is the hour's
  // 'dither' (room.json): a smaller one leaves large flat walls one solid palette step, so only real light edges dither
  // (J, 21 Oct: the night wall read as a fine checker, a texture, not light).
  let QTD = -1;
  function ditherTables(d) {
    const key = Math.round(d * 1000); if (key === QTD) return; QTD = key;
    if (!QT) QT = new Uint8Array(16 * QN);
    for (let c = 0; c < 16; c++) {
      const off = ((BAYER[c] + 0.5) / 16 - 0.5) * d;
      for (let i = 0; i < QN; i++) QT[c * QN + i] = clamp(Math.floor((Math.sqrt(i / (QN - 1)) + off) * 64), 0, 63);
    }
  }

  // ---------- sprites: PNG -> linear albedo + alpha; whole-pixel edits only ----------
  async function imageData(src) {
    const im = new Image(); im.src = src; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
    return x.getImageData(0, 0, im.width, im.height);
  }
  function sprite(rgba, w, h) {
    const s = { w, h, rgba, a: new Uint8Array(w * h), lin: new Float32Array(w * h * 3), pts: [] };
    for (let i = 0; i < w * h; i++) {
      if (rgba[i * 4 + 3] < 128) continue;
      s.a[i] = 1; s.pts.push(i);
      s.lin[i * 3] = lin(rgba[i * 4]); s.lin[i * 3 + 1] = lin(rgba[i * 4 + 1]); s.lin[i * 3 + 2] = lin(rgba[i * 4 + 2]);
    }
    return s;
  }
  function crop(d, x0, y0, w, h) {
    const o = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) o.set(d.data.subarray(((y0 + y) * d.width + x0) * 4, ((y0 + y) * d.width + x0 + w) * 4), y * w * 4);
    return o;
  }
  const edit = (s, f) => { const o = new Uint8ClampedArray(s.rgba.length); f(s.rgba, o, s.w, s.h); return sprite(o, s.w, s.h); };
  const mirror = s => edit(s, (a, o, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    o.set(a.subarray((y * w + x) * 4, (y * w + x) * 4 + 4), (y * w + (w - 1 - x)) * 4); });
  // her eyes shut for a blink: the top eye row takes the colour above it (the approved blink(), ported)
  const INKC = [2, 7, 34];
  const blinkOf = (s, eyes) => edit(s, (a, o, w) => {
    o.set(a); const top = Math.min(...eyes.map(e => e[1]));
    for (const [x, y] of eyes) if (y === top) {
      const up = ((y - 1) * w + x) * 4, isInk = a[up] === INKC[0] && a[up + 1] === INKC[1] && a[up + 2] === INKC[2];
      const src = (a[up + 3] < 128 || isInk) ? ((y + 2) * w + x) * 4 : up;
      o.set(a.subarray(src, src + 4), (y * w + x) * 4);
    }
  });
  // a breath: everything above row `top` rises one whole pixel (the approved breath(), ported)
  const breathe = (s, top) => edit(s, (a, o, w, h) => {
    o.set(a);
    for (let y = 0; y < top; y++) for (let x = 0; x < w; x++) o[(y * w + x) * 4 + 3] = 0;
    for (let y = 0; y < top - 1; y++) for (let x = 0; x < w; x++) { const p = ((y + 1) * w + x) * 4; if (a[p + 3] >= 128) o.set(a.subarray(p, p + 4), (y * w + x) * 4); }
    for (let x = 0; x < w; x++) { const p = ((top - 1) * w + x) * 4; if (a[p + 3] >= 128) o.set(a.subarray(p, p + 4), p); }
  });
  // a squash (the hop's landing): the head comes down one whole pixel above `row`
  const squash = (s, row) => edit(s, (a, o, w, h) => {
    o.set(a);
    for (let y = row; y >= 1; y--) o.set(a.subarray((y - 1) * w * 4, y * w * 4), y * w * 4);
    o.fill(0, 0, w * 4);
  });

  // ---------- load the room ----------
  // Every picture is asked for at once (they are small and local), and nothing here waits on the network beyond this
  // folder: the weather, the door and the state files come later, through setWeather, setLive and addThings.
  const OBJ = [];
  let NEXT_OID = 1;
  async function loadThing(o, oid) {
    const ob = Object.assign({ layer: 'actor', lit: 'pixel', idx: oid - 1, oid, flare: 0, nudge: 0, pose: 0, poses: [] }, o);
    try {
      if (o.kind === 'panel') { ob.lit = 'panel'; const [x0, y0, x1, y1] = o.box; ob.x = x0; ob.y = y0; ob.w = x1 - x0 + 1; ob.h = y1 - y0 + 1; }
      else for (const d of await Promise.all((o.sprites || [o.sprite]).map(imageData))) ob.poses.push(sprite(d.data, d.width, d.height));
    } catch (e) { console.warn('room: could not load', o.id, e); return null; }
    if (ob.poses.length) { ob.w = ob.poses[0].w; ob.h = ob.poses[0].h; }
    if (o.slot) {                                   // one of her things: bottom-centred in its slot, never bigger than it
      const [x0, y0, x1, y1] = o.slot.box, sw = x1 - x0 + 1, sh = y1 - y0 + 1;
      if (ob.w > sw || ob.h > sh) { console.warn(`room: ${o.id} is ${ob.w}x${ob.h}, bigger than its slot ${o.slot.id} (${sw}x${sh}); left out`); return null; }
      ob.x = x0 + ((sw - ob.w) >> 1); ob.y = y1 - ob.h + 1; ob.layer = o.slot.layer || 'actor';
      if (o.slot.cast) ob.cast = o.slot.cast;
      ob.base = o.slot.base ?? y1;
      if (ob.layer === 'actor' && o.slot.cast === 'floor') ob.block = [ob.x, y1 - 3, ob.x + ob.w - 1, y1 + 1];   // her feet go round it
    }
    if (ob.base === undefined) ob.base = ob.y + ob.h - 1;
    ob.lights = o.light ? [].concat(o.light).map(l => Object.assign({ ph: Math.random() * 6.28, ph2: Math.random() * 6.28 }, l)) : [];
    return ob;
  }
  // a list of things, loaded together and added in the list's order (the order things are drawn in)
  async function addAll(list) {
    const oids = list.map(() => NEXT_OID++);
    const got = await Promise.all(list.map((o, k) => loadThing(o, oids[k])));
    for (const ob of got) if (ob) { OBJ.push(ob); if (ob.block) BLOCKS.push(ob.block); }
    for (const ob of OBJ) ob.castOid = ob.castId ? (OBJ.find(o => o.id === ob.castId) || ob).oid : ob.oid;   // a part shades with its whole
    return got.filter(Boolean);
  }
  const byId = id => OBJ.find(o => o.id === id);
  const BLOCKS = [];
  const MF = {};
  const [MJ] = await Promise.all([
    fetch(ROOM.march.frames).then(r => r.json()).then(async mj => {
      await Promise.all(Object.entries(mj).map(async ([set, m]) => {
        const d = await imageData(m.file); MF[set] = [];
        for (let k = 0; k < m.n; k++) MF[set].push(Object.assign(sprite(crop(d, k * m.w, 0, m.w, m.h), m.w, m.h), m.frames[k]));
      }));
      return mj;
    }),
    addAll([...ROOM.objects, ...extra]),
    buildPalette(),
  ]);

  // ---------- the hours: blended by the real Chiang Mai clock ----------
  const HN = ['day', 'golden', 'night'];
  function hourWeights() {
    const f = Q.get('t'); if (HN.includes(f)) return HN.map(h => h === f ? 1 : 0);
    let hr = Q.has('time') ? parseFloat(Q.get('time')) : ((Date.now() / 3600000 + ROOM.clock.utcOffset) % 24 + 24) % 24;
    const K = ROOM.clock.keys;
    for (let i = 0; i < K.length - 1; i++) if (hr >= K[i][0] && hr <= K[i + 1][0]) {
      let u = (hr - K[i][0]) / (K[i + 1][0] - K[i][0] || 1); u = u * u * (3 - 2 * u);
      return HN.map(h => (K[i][1] === h ? 1 - u : 0) + (K[i + 1][1] === h ? u : 0));
    }
    return [0, 0, 1];
  }
  const mix = (vals, w) => {                       // blend numbers, arrays and objects by the hour weights
    const v0 = vals[0];
    if (typeof v0 === 'number') return vals.reduce((s, v, i) => s + v * w[i], 0);
    if (Array.isArray(v0)) return v0.map((_, j) => mix(vals.map(v => v[j]), w));
    const o = {}; for (const k in v0) o[k] = mix(vals.map(v => v[k]), w); return o;
  };
  const perHour = (v, w) => v === undefined ? undefined : (typeof v === 'object' && !Array.isArray(v)) ? mix(HN.map(h => v[h]), w) : v;

  // ---------- buffers ----------
  const ALB = new Float32Array(N * 3), MODE = new Uint8Array(N), SLOT = new Uint8Array(N), OID = new Uint8Array(N), DOX = new Uint8Array(N);
  const LT = new Float32Array(N * 3), DL = new Float32Array(N), C = new Float32Array(N * 3), VIG = new Float32Array(N), AO = new Float32Array(N);
  const LEAF = new Float32Array(N);
  const SH = [0, 1].map(() => ({ id: new Uint8Array(N), v: new Float32Array(N) }));   // shadow masks: [0] the sun, [1] the room's main lamp
  const SLOTV = new Float32Array(64 * 3); let nslot = 1;
  const small = document.createElement('canvas'); small.width = W; small.height = H;
  const sctx = small.getContext('2d'), img = sctx.createImageData(W, H);
  const ctx = cv.getContext('2d');

  // ---------- camera: the WHOLE room at the largest whole scale that fits the page's frame (J, 20 Oct 11:45pm: wide);
  // on a phone (fit().follow) a full-height window, whole art pixels wide, that follows March ----------
  let SC = 1, VW = W, camF = 0, camX = 0;
  function layout() {
    const dpr = devicePixelRatio || 1;
    ({ SC, VW } = frameFor(fit(), W, H));
    const cw = VW * SC + 'px', ch = H * SC + 'px';
    if (cv.style.width !== cw || cv.style.height !== ch) { cv.style.width = cw; cv.style.height = ch; }
    const bw = Math.round(VW * SC * dpr), bh = Math.round(H * SC * dpr);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    camF = clamp(M.fx - VW / 2, 0, W - VW); camX = Math.round(camF);
  }

  // ---------- the wind, and the leaves it moves ----------
  const WIND = { gusts: [], next: rand(3, 8) };
  function windAt(t) {
    let w = 0.45 + 0.17 * Math.sin(t * 0.37) + 0.11 * Math.sin(t * 0.83 + 1.3) + 0.05 * Math.sin(t * 2.1 + 0.4);
    for (const g of WIND.gusts) { const a = t - g.t0; if (a < 0) continue;
      w += g.amp * (a < 0.8 ? (a / 0.8) ** 2 : a < 0.8 + g.hold ? 1 : Math.exp(-(a - 0.8 - g.hold) / 1.1)); }
    return w;
  }
  function gust(t, amp) { WIND.gusts.push({ t0: t, amp, hold: rand(0.4, 1.4) }); if (WIND.gusts.length > 8) WIND.gusts.shift(); }
  const SPRAYS = ROOM.leaves.sprays.map(sp => {
    const r = mulberry32(sp.seed), U = (a, b) => a + (b - a) * r();
    const twig = (x, y, a, n, c) => { const p = []; for (let i = 0; i < Math.floor(n); i++) { x += Math.cos(a); y += Math.sin(a); a += c + U(-0.05, 0.05); p.push([x, y, a]); } return p; };
    const main = twig(0, 0, sp.angle, sp.length, sp.curl), twigs = [main];
    const ns = 3 + Math.floor(r() * 3);
    for (let j = 0; j < ns; j++) { const p = main[Math.floor(main.length * U(0.15, 0.8))];
      twigs.push(twig(p[0], p[1], p[2] + (r() < 0.5 ? -1 : 1) * U(0.5, 1.0), sp.length * U(0.3, 0.7), -sp.curl * U(0.5, 2))); }
    const leaves = [], pts = [], [s0, s1] = ROOM.leaves.size, [g0, g1] = ROOM.leaves.gap;
    const leaf = (x, y, a, L) => leaves.push({ x: x + Math.cos(a) * L * 0.5, y: y + Math.sin(a) * L * 0.5, a, L, w: L * U(0.36, 0.55), ph: U(0, 6.28), fr: U(0.7, 1.6) });
    for (const p of twigs) {
      for (const q of p) pts.push(q[0], q[1]);
      let i = 2, side = 1;
      while (i < p.length) { const q = p[i | 0]; side = -side; leaf(q[0], q[1], q[2] + side * U(0.4, 1.4), U(s0, s1)); i += U(g0, g1); }
      const q = p[p.length - 1]; leaf(q[0], q[1], q[2] + U(-0.2, 0.2), U(7, 10));
    }
    return { sp, leaves, pts, th: 0, tv: 0, k: U(14, 24), delay: sp.x / 150, flex: U(0.07, 0.11) };
  });
  const BR = { b: 0.45, v: 0 };                     // the painted branch's bend, a spring; it picks the drawn pose

  // ---------- March: an NPC ----------
  const MD = ROOM.march.desk, FOOT = ROOM.march.foot;
  const M = { fx: ROOM.march.start[0], fy: ROOM.march.start[1], face: 'L', st: 'idle', t: 0, dur: 2, path: [], then: null,
    dist: 0, k: 0, hold: 0, blinkAt: rand(1, 4), blinkT: -1, breath: false, breathAt: rand(1, 3), hop: -1, jig: -1,
    seq: null, si: 0, sh: 0, seatMode: 'work', seatDur: 10, last: null, queue: null, speed: rand(...ROOM.march.speed), beh: 'start' };
  const inBlock = (x, y) => BLOCKS.some(b => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]);
  const WALK = ROOM.floor.walk;
  // Her walks are mostly SIDEWAYS: she has side-walk frames only (no front or back walk), and a long straight walk up
  // or down the screen on side frames looks like a slide. So a wander picks a point well to one side and changes depth
  // by at most about a third of the way across (21 Oct 2026).
  function freePoint() {
    for (let i = 0; i < 60; i++) {
      const x = rand(WALK[0], WALK[2]), dx = Math.abs(x - M.fx); if (dx < 24) continue;
      const y = clamp(M.fy + rand(-1, 1) * Math.min(14, 0.33 * dx), WALK[1], WALK[3]);
      if (!inBlock(x, y)) return [x, y];
    }
    return [M.fx < 120 ? 160 : 80, clamp(M.fy, WALK[1], WALK[3])];
  }
  function clampFree(x, y) {
    x = clamp(x, WALK[0], WALK[2]); y = clamp(y, WALK[1], WALK[3]);
    for (const b of BLOCKS) if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) y = b[3] + 2 > WALK[3] ? b[1] - 2 : b[3] + 2;
    return [x, clamp(y, WALK[1], WALK[3])];
  }
  function route(a, b) {                           // straight, or round the front of whatever box is in the way
    const hit = (p, q) => { for (const r of BLOCKS) for (let s = 0; s <= 1; s += 0.04) {
      const x = p[0] + (q[0] - p[0]) * s, y = p[1] + (q[1] - p[1]) * s; if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return r; } return null; };
    const r = hit(a, b); if (!r) return [b];
    const yb = Math.min(WALK[3], r[3] + 3), out = [];
    if (a[1] < yb) {                                // down to the front of the box on a slant, not straight down, if the slant is clear
      const s = Math.sign(b[0] - a[0]) || 1, d = [a[0] + s * Math.min(Math.abs(b[0] - a[0]) * 0.6, 2.2 * (yb - a[1])), yb];
      out.push(hit(a, d) ? [a[0], yb] : d);
    }
    out.push([b[0], yb]); out.push(b); return out;
  }
  function walkTo(p, then, direct) { M.path = direct ? [p] : route([M.fx, M.fy], p); M.st = 'walk'; M.then = then; }
  function idle(d, face) { M.st = 'idle'; M.t = 0; M.dur = d; if (face) M.face = face; }
  const glide = (set, ks) => {                     // the approved glide(): her head travels on a straight line, 1 px a step at most
    const ax = ks.map(k => MF[set][k].anchor[0]), n = ks.length - 1;
    return ks.map((k, i) => ({ set, k, dx: Math.round(ax[0] + (ax[n] - ax[0]) * i / n) - ax[i] }));
  };
  const DOWN = glide('down', [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  const UP = glide('up', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 13, 14, 15, 16]);
  function goDesk(dur, mode) {
    M.seatDur = dur; M.seatMode = mode;
    if (['down', 'seated'].includes(M.st)) return;
    if (M.st === 'up') { M.then = () => goDesk(dur, mode); return; }
    walkTo(MD.door, () => walkTo(MD.approach, () => { M.face = 'L'; M.st = 'down'; M.seq = DOWN; M.si = 0; M.sh = 0; }, true));
  }
  function standUp(then) { if (M.st !== 'seated') return; M.st = 'up'; M.seq = UP; M.si = 0; M.sh = 0; M.then = then; }
  function choose(hw) {
    if (M.queue) { const q = M.queue; M.queue = null; q(); return; }
    const opts = [['wander', perHour(ROOM.march.weights.wander, hw)], ['pause', perHour(ROOM.march.weights.pause, hw)]];
    for (const o of OBJ) if (o.spot) opts.push([o.id, perHour(o.spot.weight, hw)]);
    let tot = 0; for (const o of opts) { if (o[0] === M.last) o[1] *= 0.25; tot += o[1]; }
    let r = Math.random() * tot, pick = opts[0][0];
    for (const o of opts) { r -= o[1]; if (r <= 0) { pick = o[0]; break; } }
    doBehaviour(pick);
  }
  function doBehaviour(pick) {
    M.last = pick; M.beh = pick;
    if (pick === 'wander') walkTo(freePoint(), () => idle(rand(1.5, 5)));
    else if (pick === 'pause') { idle(rand(2, 6)); if (Math.random() < 0.5) M.flipAt = rand(0.6, 0.9) * M.dur; }
    else { const o = byId(pick), s = o.spot;
      if (s.use === 'desk') goDesk(rand(8, 26), Math.random() < 0.7 ? 'work' : 'sit');
      else walkTo(clampFree(s.x + rand(-5, 5), s.y + rand(-2, 2)), () => idle(rand(...(s.hold || [2, 5])), s.face)); }
  }
  function marchSprite() {
    let set, k, x, y, mir = false, base = Math.round(M.fy);
    if (M.st === 'walk') { set = M.face === 'L' ? 'walk' : 'walke'; k = Math.floor(M.dist / 2.1) % 8; x = Math.round(M.fx) - FOOT[0]; y = Math.round(M.fy) - FOOT[1]; }
    else if (M.st === 'down' || M.st === 'up') { const e = M.seq[M.si]; set = e.set; k = e.k; x = MD.sprite[0] + e.dx; y = MD.sprite[1]; base = MD.base; }
    else if (M.st === 'seated') { base = MD.base;
      if (M.seatMode === 'work') { set = 'work'; k = M.k; x = MD.sprite[0] + MD.workOffset[0]; y = MD.sprite[1] + MD.workOffset[1]; }
      else { set = 'sit'; k = 0; x = MD.sprite[0]; y = MD.sprite[1]; } }
    else { set = 'idle'; k = M.k; mir = M.face === 'R'; x = Math.round(M.fx) - (mir ? MJ.idle.w - 1 - FOOT[0] : FOOT[0]); y = Math.round(M.fy) - FOOT[1]; }
    const f = MF[set][k], blink = M.blinkT >= 0 && f.eyes, br = M.st === 'seated' && M.breath && set === 'sit';
    let hy = 0, sq = false;
    if (M.hop >= 0) { const a = M.hop; if (a < 0.07 || (a > 0.43 && a < 0.52)) sq = true; else if (a <= 0.43) hy = -Math.round(6 * Math.sin(Math.PI * (a - 0.07) / 0.36)); }
    if (M.jig >= 0 && M.jig < 0.18) hy -= 1;
    const key = `${set}${k}${blink ? 'b' : ''}${mir ? 'm' : ''}${br ? 'r' : ''}${sq ? 's' : ''}`;
    let s = SCACHE.get(key);
    if (!s) { s = f; if (blink) s = blinkOf(s, f.eyes); if (br) s = breathe(s, 50); if (sq) s = squash(s, Math.round(s.h * 0.62)); if (mir) s = mirror(s); SCACHE.set(key, s); }
    const seatedNow = !(M.st === 'walk' || M.st === 'idle');
    return { s, x, y: y + hy, base, feet: seatedNow ? null : [Math.round(M.fx), Math.round(M.fy)],
      lx: seatedNow ? MD.approach[0] : M.fx, ly: (seatedNow ? MD.approach[1] : M.fy) - 22 };
  }
  const SCACHE = new Map();

  function updateMarch(dt, t, hw) {
    // blinks and breaths: their own random clocks
    M.blinkAt -= dt; if (M.blinkAt <= 0 && M.blinkT < 0) M.blinkT = 0;
    if (M.blinkT >= 0) { M.blinkT += dt; if (M.blinkT > rand(0.1, 0.16)) { M.blinkT = -1; M.blinkAt = Math.random() < 0.15 ? 0.25 : rand(2, 6.5); } }
    M.breathAt -= dt; if (M.breathAt <= 0) { M.breath = !M.breath; M.breathAt = M.breath ? rand(0.7, 1.3) : rand(1.2, 2.8); }
    if (M.hop >= 0) { M.hop += dt; if (M.hop > 0.52) M.hop = -1; }
    if (M.jig >= 0) { M.jig += dt; if (M.jig > 0.3) M.jig = -1; }
    if (M.st === 'walk') {
      const p = M.path[0]; if (!p) { M.st = 'idle'; return; }
      const dx = p[0] - M.fx, dy = p[1] - M.fy, d = Math.hypot(dx, dy), step = M.speed * dt;
      if (Math.abs(dx) > 0.6) M.face = dx < 0 ? 'L' : 'R';
      if (d <= step) { M.fx = p[0]; M.fy = p[1]; M.dist += d; M.path.shift();
        if (!M.path.length) { const th = M.then; M.then = null; M.st = 'idle'; M.t = 0; M.dur = 0.3; M.k = 0; if (th) th(); } }
      else { M.fx += dx / d * step; M.fy += dy / d * step; M.dist += step; }
    } else if (M.st === 'idle') {
      M.t += dt; M.hold -= dt; if (M.hold <= 0) { M.k = (M.k + 1) % 5; M.hold = rand(0.15, 0.3); }
      if (M.flipAt && M.t > M.flipAt) { M.face = M.face === 'L' ? 'R' : 'L'; M.flipAt = 0; }
      if (M.t >= M.dur) { M.flipAt = 0; choose(hw); }
    } else if (M.st === 'down' || M.st === 'up') {
      M.sh -= dt; if (M.sh <= 0) { M.si++; M.sh = rand(0.085, 0.12);
        if (M.si >= M.seq.length) {
          if (M.st === 'down') { M.st = 'seated'; M.t = 0; M.k = 0; M.hold = 0; }
          else { M.fx = MD.exit[0]; M.fy = MD.exit[1]; M.face = 'R'; M.si = 0; const th = M.then; M.then = null;
            walkTo([MD.door[0] + 2, MD.door[1] + 1], th || (() => choose(hw)), true); }
        } }
    } else if (M.st === 'seated') {
      M.t += dt; M.hold -= dt;
      if (M.seatMode === 'work' && M.hold <= 0) {             // writing, with random pauses to think: never a loop
        if (Math.random() < 0.06) { M.k = 0; M.hold = rand(0.6, 1.8); }
        else { M.k = (M.k + 1) % 9; M.hold = LIVE.on && LIVE.action === 'building' ? rand(0.05, 0.1) : rand(0.08, 0.17); }
      }
      if (M.t >= M.seatDur) standUp();
    }
  }

  // ---------- the live hook: a real session can take her over ----------
  const LIVE = { on: false, action: '', title: '', since: 0 };
  function applyLive(j) {
    const was = LIVE.on; LIVE.on = !!(j && j.live); LIVE.action = LIVE.on ? (j.action || 'thinking') : ''; LIVE.title = LIVE.on ? (j.title || '') : '';
    if (LIVE.on && !was) LIVE.since = 0;
    if (!LIVE.on && was) {                         // back to autopilot
      if (M.st === 'seated') M.seatDur = M.t + rand(1, 3); else if (M.st === 'idle') M.dur = Math.min(M.dur, M.t + 1);
    }
  }
  function liveDrive() {
    if (!LIVE.on) return;
    const a = LIVE.action;
    if (a === 'reading' || a === 'writing' || a === 'building') {
      const mode = a === 'reading' ? 'sit' : 'work';
      if (M.st === 'seated') { M.seatMode = mode; M.seatDur = 1e9; }
      else if (M.st !== 'down' && !(M.st === 'walk' && M.beh === 'live')) { M.beh = 'live'; if (M.st === 'up') M.then = () => goDesk(1e9, mode); else goDesk(1e9, mode); }
    } else {                                        // thinking: pacing slowly in front of the door, looking at it
      if (M.st === 'seated') { if (M.seatDur > M.t + 1) M.seatDur = M.t + 0.5; return; }
      if (M.st === 'idle' && M.beh !== 'live') { M.beh = 'live'; walkTo(clampFree(rand(136, 166), rand(103, 108)), () => idle(rand(3, 7))); }
      else if (M.st === 'idle' && M.t >= M.dur - 0.05) { M.dur += 1e-3; walkTo(clampFree(rand(136, 166), rand(103, 108)), () => idle(rand(3, 7))); }
    }
  }
  if (Q.has('beh')) { M.queue = () => doBehaviour(Q.get('beh')); M.dur = 0.5; }   // ?beh=desk|bench|enso|planter|wander|pause: her first choice, for review
  // ?live= forces a session for review; otherwise the page calls setLive() from now.json and the door's GET /now
  const FORCED = Q.has('live');
  if (FORCED) applyLive({ live: true, action: Q.get('live'), title: Q.get('title') || 'A test session: reading the room plan' });

  // ---------- small life: motes, petals, fireflies, glints, ripples ----------
  const MOTES = []; { const r = mulberry32(7); for (let i = 0; i < 80; i++) MOTES.push({ x: r() * W, y: r() * H, z: r() < 0.8 ? 0.4 + r() * 0.5 : 1.2 + r() * 0.4, vx: 0, vy: 0, ph: r() * 6.28, ph2: r() * 6.28, sz: r() }); }
  const PETALS = [], RIPPLES = [];
  const FLIES = []; for (let i = 0; i < 7; i++) FLIES.push({ cx: rand(10, 230), cy: rand(14, 84), a1: rand(0.15, 0.35), a2: rand(0.4, 0.9), p1: rand(0, 6.3), p2: rand(0, 6.3), on: 0, T: rand(0, 3), x: 0, y: 0 });
  const GARDEN = byId('garden'), GLINTS = [];
  function shed(o, n, burst) {
    const s = o.poses[o.pose]; if (!s) return;
    for (let i = 0; i < n && PETALS.length < 60; i++) {
      const p = s.pts[(Math.random() * s.pts.length) | 0], x = o.x + p % s.w + 0.5, y = o.y + ((p / s.w) | 0) + 0.5;
      const c = (o.sheds && o.sheds.color) || [243, 184, 209], sh = rand(0.85, 1.05);
      PETALS.push({ x, y, vx: burst ? rand(-26, 26) : rand(-3, 3), vy: burst ? rand(-22, 4) : rand(-1, 2), ph: rand(0, 6.3), fr: rand(1.5, 3),
        land: rand(Math.max(FLOOR + 3, y + 4), H - 2), life: rand(7, 16), on: false, big: Math.random() < 0.35,
        c: [lin(c[0] * sh), lin(c[1] * sh), lin(c[2] * sh)] });
    }
  }
  function updateLife(dt, t, hw) {
    const w = windAt(t);
    for (const m of MOTES) {
      m.vx *= Math.exp(-1.1 * dt); m.vy *= Math.exp(-1.1 * dt);
      m.x += (m.vx + Math.sin(t * 0.13 + m.ph) * 0.9 * m.z + (w - 0.4) * 1.2 * m.z) * dt;
      m.y += (m.vy + Math.cos(t * 0.11 + m.ph2) * 0.6 * m.z - 0.12) * dt;
      if (m.y > H + 2) m.y = -2; if (m.y < -3) m.y = H + 1; if (m.x > W + 2) m.x = -2; if (m.x < -3) m.x = W + 1;
    }
    for (let i = PETALS.length - 1; i >= 0; i--) {
      const p = PETALS[i];
      if (!p.on) {
        p.vx += (Math.sin(t * p.fr + p.ph) * 7 + (w - 0.4) * 5 - p.vx * 0.9) * dt;
        p.vy += (8 - p.vy * 0.95) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y >= p.land) { p.y = p.land; p.on = true; }
        if (p.x < -4 || p.x > W + 4) { PETALS.splice(i, 1); continue; }
      } else if ((p.life -= dt) <= 0) PETALS.splice(i, 1);
    }
    for (const o of OBJ) if (o.sheds && Math.random() < o.sheds.rate * dt * (0.4 + w)) shed(o, 1, false);
    for (const f of FLIES) {
      f.T -= dt; if (f.T <= 0) { f.on = f.on ? 0 : 1; f.T = f.on ? rand(1.2, 4) : rand(0.6, 3); }
      f.x = f.cx + Math.sin(t * f.a1 + f.p1) * 11 + Math.sin(t * f.a2 + f.p2) * 4; f.y = f.cy + Math.cos(t * f.a1 * 0.8 + f.p2) * 6 + Math.sin(t * f.a2 * 1.3 + f.p1) * 2;
      f.lv = (f.lv || 0) + ((f.on ? 1 : 0) - (f.lv || 0)) * (1 - Math.exp(-5 * dt));
    }
    if (GARDEN && hw[2] > 0.2 && Math.random() < dt * 3) { const s = GARDEN.poses[0], p = s.pts[(Math.random() * s.pts.length) | 0]; GLINTS.push({ x: GARDEN.x + p % s.w, y: GARDEN.y + ((p / s.w) | 0), T: rand(0.12, 0.45) }); }
    for (let i = GLINTS.length - 1; i >= 0; i--) if ((GLINTS[i].T -= dt) <= 0) GLINTS.splice(i, 1);
    for (let i = RIPPLES.length - 1; i >= 0; i--) if ((RIPPLES[i].a += dt) > RIPPLES[i].life) RIPPLES.splice(i, 1);
    for (const o of OBJ) { o.flareT = (o.flareT || 0) * Math.exp(-1.3 * dt); o.flare += (o.flareT - o.flare) * (1 - Math.exp(-dt / 0.22));   // a quick swell, then a slow fade
    if (o.nudge > 0) o.nudge = Math.max(0, o.nudge - dt); }
    // the wind: its own random gusts, travelling across the room from left to right
    WIND.next -= dt; if (WIND.next <= 0) { gust(t, rand(0.35, 0.9)); WIND.next = rand(4, 13); }
    for (const S of SPRAYS) {
      const target = (windAt(t - S.delay) - 0.45) * S.flex;
      S.tv += (S.k * (target - S.th) - 3.0 * S.tv) * dt; S.th += S.tv * dt;
    }
    BR.v += (11 * (windAt(t) - BR.b) - 2.6 * BR.v) * dt; BR.b += BR.v * dt;
    for (const o of OBJ) if (o.sways && o.poses.length === 3) {   // a drawn pose for the bend, with a little hysteresis
      const b = BR.b, p = o.pose;
      o.pose = b > (p === 2 ? 0.74 : 0.8) ? 2 : b > (p >= 1 ? 0.55 : 0.61) ? 1 : 0;
    }
  }

  // ---------- light ----------
  let HW = [1, 0, 0], HP = null;
  // The weather over Chiang Mai (sky.mjs, through the page) dims the light from outside: the sun most, the sky a little.
  // At night the sun term is already faint, so the garden's glow is untouched.
  const WEATHER = { clear: [1, 1], cloud: [0.45, 0.93], rain: [0.25, 0.86], storm: [0.12, 0.76] };
  let SKY = WEATHER[Q.get('weather')] ? Q.get('weather') : 'clear', SKYF = WEATHER[SKY].slice();
  function lightParams(t) {
    const hw = HW, hp = mix(HN.map(h => ROOM.hours[h]), hw);
    const want = WEATHER[SKY]; for (let j = 0; j < 2; j++) SKYF[j] += (want[j] - SKYF[j]) * (1 - Math.exp(-DT / 3));   // eased over seconds
    hp.sun.color = hp.sun.color.map(v => v * SKYF[0]); hp.ambient = hp.ambient.map(v => v * SKYF[1]);
    const lights = [];
    for (const o of OBJ) for (const l of o.lights) {
      let s = perHour(l.strength, hw) ?? 1;
      if (l.pulse) s *= 1 + l.pulse[0] * (0.65 * Math.sin(t * 6.283 / l.pulse[1] + l.ph) + 0.35 * Math.sin(t * 6.283 / (l.pulse[1] * 1.618) + l.ph2));
      s *= 1 + 1.9 * o.flare * clamp(55 / (l.radius || 55), 0.25, 1);   // a flare swells the light near the source most
      if (s > 0.003) lights.push({ l, o, s, r: l.color[0] * s, g: l.color[1] * s, b: l.color[2] * s });
    }
    return { hp, lights };
  }
  function lightAt(x, y) {                         // the room's light at one point, without shadows (for whole sprites)
    const hp = HP.hp, s = hp.sun; let r = hp.ambient[0], g = hp.ambient[1], b = hp.ambient[2];
    const qx = (x - s.x) / s.rx, qy = (y - s.y) / s.ry, q = qx * qx + qy * qy;
    if (q < 1) { const f = (1 - q) * (1 - q); r += s.color[0] * f; g += s.color[1] * f; b += s.color[2] * f; }
    for (const L of HP.lights) {
      const l = L.l; let d2;
      if (l.line) { const dx = x < l.x ? l.x - x : x > l.x + l.line ? x - l.x - l.line : 0; d2 = dx * dx + (y - l.y) ** 2; }
      else d2 = (x - l.x) ** 2 + (y - l.y) ** 2;
      const q2 = d2 / (l.radius * l.radius); if (q2 >= 1) continue; const f = (1 - q2) * (1 - q2);
      r += L.r * f; g += L.g * f; b += L.b * f;
    }
    const [vx, vy, va, vmin = 0.2] = hp.vignette, dx = (x - vx) / (W * 0.62), dy = (y - vy) / (H * 0.7), v = clamp(1 - va * (dx * dx + dy * dy), vmin, 1);
    const fk = y >= FLOOR ? hp.floor : 1;
    return [r * v * fk, g * v * fk, b * v * fk];
  }

  function rasterLeaves(t) {
    LEAF.fill(0);
    const [ldx, ldy, shear] = HP.hp.leaf || HP.hp.sun.leaf, w = windAt(t);
    for (const S of SPRAYS) {
      const st = perHour(S.sp.strength, HW); if (st < 0.02) continue;
      const c = Math.cos(S.th), s = Math.sin(S.th), x0 = S.sp.x, y0 = S.sp.y;
      const put = (X, Y) => { if (X >= 0 && X < W && Y >= 0 && Y < FLOOR && LEAF[Y * W + X] < st) LEAF[Y * W + X] = st; };
      for (let i = 0; i < S.pts.length; i += 2) {      // the twigs, one pixel wide
        const lx = S.pts[i], ly = S.pts[i + 1], X = x0 + lx * c - ly * s, Y = y0 + lx * s + ly * c;
        put(Math.round(X + ldx + shear * (Y + 66)), Math.round(Y + ldy));
      }
      for (const L of S.leaves) {
        const fl = Math.sin(t * L.fr * 2.2 + L.ph) * (0.08 + 0.16 * w), nx = -Math.sin(L.a), ny = Math.cos(L.a), jit = 0.45 * Math.sin(t * L.fr * 1.7 + L.ph * 2);
        const lx = L.x + nx * jit, ly = L.y + ny * jit;
        const cx = x0 + lx * c - ly * s, cy = y0 + lx * s + ly * c, a = L.a + S.th + fl, ca = Math.cos(a), sa = Math.sin(a);
        const R = L.L * 0.5 + 1, sx = cx + ldx + shear * (cy + 66), sy = cy + ldy;
        for (let Y = Math.floor(sy - R); Y <= sy + R; Y++) {
          if (Y < 0 || Y >= FLOOR) continue;
          const wy = Y + 0.5 - ldy, dy = wy - cy, xo = ldx + shear * (wy + 66);
          for (let X = Math.floor(sx - R - 1); X <= sx + R + 1; X++) {
            if (X < 0 || X >= W) continue;
            const dx = X + 0.5 - xo - cx, u = dx * ca + dy * sa + L.L * 0.5, v = -dx * sa + dy * ca;
            if (u < 0 || u > L.L) continue;
            if (Math.abs(v) <= L.w * 0.5 * Math.pow(Math.sin(Math.PI * u / L.L), 0.8)) { const i = Y * W + X; if (LEAF[i] < st) LEAF[i] = st; }
          }
        }
      }
    }
  }

  // shadows: each caster's silhouette, projected away from the light, whole pixels, fresh every frame
  const CASTERS = [];
  function project(mask, s, sx, sy, base, oid, str, ox, oy, kx, ky, wallOnly) {
    const span = Math.max(1, Math.ceil(Math.abs(kx)));
    for (const p of s.pts) {
      const x0 = sx + p % s.w, y0 = sy + ((p / s.w) | 0), h = Math.max(0, base - y0);
      const X = Math.round(x0 + ox + kx * h), Y = Math.round(y0 + oy + ky * h);
      if (Y < 0 || Y >= H || (wallOnly && Y >= FLOOR)) continue;
      for (let e = 0; e < span; e++) { const XX = X + (kx < 0 ? -e : e); if (XX < 0 || XX >= W) continue; const i = Y * W + XX; mask.id[i] = oid; mask.v[i] = str; }
    }
  }
  function castShadows() {
    for (const m of SH) { m.id.fill(0); }
    const [ox, oy, kx, ky] = HP.hp.sun.cast;
    let lamp = null; for (const L of HP.lights) if (L.l.shadow && (!lamp || L.s > lamp.s)) lamp = L;
    for (const c of CASTERS) {
      const wall = c.cast === 'wall';
      if (wall) project(SH[0], c.s, c.x, c.y, c.base, c.oid, c.str, ox + 2 + kx * 3, oy + 3, 0, 0, true);
      else project(SH[0], c.s, c.x, c.y, c.base, c.oid, c.str, ox, oy, kx, ky, false);
      if (lamp && lamp.s > 0.05 && !wall) {        // from the main lamp (the garden at night): away from it, toward us
        const cx = c.x + c.s.w / 2, k = clamp((cx - lamp.l.x) / 55, -1.5, 1.5);
        project(SH[1], c.s, c.x, c.y, c.base, c.oid, c.str * clamp(lamp.s, 0, 1) * 0.8, 0, 1, k * 0.3, 1.3, false);
      }
    }
  }

  function computeLight(t) {
    const hp = HP.hp, s = hp.sun, [ar, ag, ab] = hp.ambient, isx = 1 / s.rx, isy = 1 / s.ry;
    const [vx, vy, va, vmin = 0.2] = hp.vignette, iw = 1 / (W * 0.62), ih = 1 / (H * 0.7);
    const S0 = SH[0], S1 = SH[1];
    for (let y = 0; y < H; y++) {
      const qy = (y + 0.5 - s.y) * isy, qy2 = qy * qy, dyv = (y + 0.5 - vy) * ih, fk = y >= FLOOR ? hp.floor : 1;
      for (let x = 0; x < W; x++) {
        const i = y * W + x, k = i * 3, qx = (x + 0.5 - s.x) * isx, q = qx * qx + qy2;
        let f = q < 1 ? (1 - q) * (1 - q) : 0;
        DL[i] = f;
        if (f > 0) {
          f *= 1 - LEAF[i];
          if (S0.id[i] && S0.id[i] !== OID[i]) f *= 1 - S0.v[i];
        }
        LT[k] = ar + s.color[0] * f; LT[k + 1] = ag + s.color[1] * f; LT[k + 2] = ab + s.color[2] * f;
        const dxv = (x + 0.5 - vx) * iw, v = 1 - va * (dxv * dxv + dyv * dyv);
        VIG[i] = (v < vmin ? vmin : v) * fk;
        AO[i] = 1;
      }
    }
    const sunL = lum(...s.color); for (let i = 0; i < N; i++) DL[i] *= sunL;
    // the lamps: a splat each, the main lamp's shadow mask applied
    for (const L of HP.lights) {
      const l = L.l, R = l.radius, iR2 = 1 / (R * R), shadow = !!l.shadow, Ls = lum(L.r, L.g, L.b);
      const x0 = Math.max(0, Math.floor((l.line ? l.x : l.x - R))), x1 = Math.min(W - 1, Math.ceil(l.line ? l.x + l.line : l.x + R));
      const y0 = Math.max(0, Math.floor(l.y - R)), y1 = Math.min(H - 1, Math.ceil(l.y + R));
      for (let y = y0; y <= y1; y++) {
        const dy = y + 0.5 - l.y, dy2 = dy * dy;
        for (let x = x0; x <= x1; x++) {
          const dx = l.line ? 0 : x + 0.5 - l.x, q = (dx * dx + dy2) * iR2; if (q >= 1) continue;
          let f = (1 - q) * (1 - q); const i = y * W + x;
          DL[i] += Ls * f;
          if (shadow && S1.id[i] && S1.id[i] !== OID[i]) f *= 1 - S1.v[i];
          const k = i * 3; LT[k] += L.r * f; LT[k + 1] += L.g * f; LT[k + 2] += L.b * f;
        }
      }
    }
    if (HOVER && HOVER !== 'march') { const s = HOVER.poses[HOVER.pose] || HOVER; splatLight(HOVER.x + s.w / 2, HOVER.y + s.h / 2, Math.max(s.w, s.h) * 0.75, 0.10, 0.09, 0.13); }
    for (const f of FLIES) if (f.lv > 0.02 && HW[2] > 0.05) splatLight(f.x, f.y, 7, 0.10 * f.lv * HW[2], 0.08 * f.lv * HW[2], 0.12 * f.lv * HW[2]);
    for (const r of RIPPLES) {                      // rings of light running out across the wall: dithered, never blurred
      const R = r.a * r.speed, I = r.I * (1 - r.a / r.life) ** 2, wd = r.w;
      const x0 = Math.max(0, Math.floor(r.x - R - 3 * wd)), x1 = Math.min(W - 1, Math.ceil(r.x + R + 3 * wd));
      const y0 = Math.max(0, Math.floor(r.y - R - 3 * wd)), y1 = Math.min(H - 1, Math.ceil(r.y + R + 3 * wd));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - r.x, y + 0.5 - r.y), e = (d - R) / wd; if (e * e > 9) continue;
        const f = I * Math.exp(-e * e), k = (y * W + x) * 3; LT[k] += r.c[0] * f; LT[k + 1] += r.c[1] * f; LT[k + 2] += r.c[2] * f; DL[y * W + x] += f * 0.5;
      }
    }
  }
  function splatLight(x, y, R, r, g, b) {
    const x0 = Math.max(0, Math.floor(x - R)), x1 = Math.min(W - 1, Math.ceil(x + R)), y0 = Math.max(0, Math.floor(y - R)), y1 = Math.min(H - 1, Math.ceil(y + R)), iR2 = 1 / (R * R);
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
      const dx = px + 0.5 - x, dy = py + 0.5 - y, q = (dx * dx + dy * dy) * iR2; if (q >= 1) continue;
      const f = (1 - q) ** 3, k = (py * W + px) * 3; LT[k] += r * f; LT[k + 1] += g * f; LT[k + 2] += b * f;
    }
  }

  // ---------- drawing ----------
  function draw(s, x, y, mode, slot, oid, lock) {
    const dox = lock ? (((-x) & 3) | (((-y) & 3) << 2)) : 0;
    for (let j = 0; j < s.h; j++) {
      const Y = y + j; if (Y < 0 || Y >= H) continue;
      for (let i = 0; i < s.w; i++) {
        const X = x + i; if (X < 0 || X >= W) continue;
        const p = j * s.w + i; if (!s.a[p]) continue;
        const q = Y * W + X, k = q * 3, sk = p * 3;
        ALB[k] = s.lin[sk]; ALB[k + 1] = s.lin[sk + 1]; ALB[k + 2] = s.lin[sk + 2];
        MODE[q] = mode; SLOT[q] = slot; OID[q] = oid; DOX[q] = dox;
      }
    }
  }
  function px(x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return;
    const q = y * W + x, k = q * 3; ALB[k] = c[0]; ALB[k + 1] = c[1]; ALB[k + 2] = c[2]; MODE[q] = 0; OID[q] = 0; DOX[q] = 0; }
  const slotFlat = (x, y, owner) => {              // one light for a whole moving sprite: part room light, part its own tint
    let L = lightAt(x, y); const sp = HP.hp.sprite, m = sp.mix, i = nslot++;
    if (owner) {                                    // eased over ~0.6 s, so walking through the light never jumps
      if (!owner.Ls) owner.Ls = L.slice(); const e = 1 - Math.exp(-DT / 0.6);
      for (let j = 0; j < 3; j++) owner.Ls[j] += (L[j] - owner.Ls[j]) * e; L = owner.Ls;
    }
    // stepped in 1/32s: the whole sprite is palette-swapped to its next light step at once, never dithered (see render)
    for (let j = 0; j < 3; j++) SLOTV[i * 3 + j] = Math.round((L[j] * m + sp.tint[j] * (1 - m)) * 32) / 32;
    return i;
  };
  const slotEmit = (o) => {
    const i = nslot++, e = perHour(o.emit, HW), g = HP.hp.glow, f = 1 + 0.35 * o.flare;
    const c = e === undefined ? g : typeof e === 'number' ? [e, e, e] : e;
    SLOTV[i * 3] = c[0] * f; SLOTV[i * 3 + 1] = c[1] * f; SLOTV[i * 3 + 2] = c[2] * f; return i;
  };
  const MARCH_OID = 250;
  let MS = null;
  function compose(t) {
    nslot = 1; CASTERS.length = 0;
    const ms = MS = marchSprite();
    const drawObj = (o) => {
      if (o.lit === 'panel') { if (o.cast) CASTERS.push({ s: panelSprite(o), x: o.x, y: o.y, base: o.base, oid: o.oid, str: o.castStrength ?? 0.85, cast: o.cast }); return; }
      const s = o.poses[o.pose], nx = o.nudge > 0 ? [1, -1, 1, 0, -1, 1][Math.floor(o.nudge * 14) % 6] : 0;
      const slot = o.lit === 'emit' ? slotEmit(o) : o.lit === 'flat' ? slotFlat(o.x + s.w / 2, o.y + s.h / 2, o) : 0;
      draw(s, o.x + nx, o.y, o.lit === 'emit' ? 2 : o.lit === 'flat' ? 1 : 0, slot, o.oid, o.lit === 'flat');
      if (o.cast) CASTERS.push({ s, x: o.x + nx, y: o.y, base: o.base, oid: o.castOid, str: o.castStrength ?? 0.85, cast: o.cast });
    };
    for (const o of OBJ) if (o.layer === 'back') drawObj(o);
    for (const p of PETALS) if (p.on) { px(p.x, p.y, p.c); if (p.big) px(p.x + 1, p.y, p.c.map(v => v * 0.8)); }
    const actors = OBJ.filter(o => o.layer === 'actor').map(o => [o.base, o]);
    actors.push([ms.base + 0.5, null]);
    actors.sort((a, b) => a[0] - b[0]);
    for (const [, o] of actors) {
      if (o) { drawObj(o); continue; }
      const slot = slotFlat(ms.lx, ms.ly, M);         // sampled at her body, from her feet: the same point whatever frame she is in
      draw(ms.s, ms.x, ms.y, 1, slot, MARCH_OID, true);
      CASTERS.push({ s: ms.s, x: ms.x, y: ms.y, base: ms.feet ? ms.feet[1] : ms.base, oid: MARCH_OID, str: 0.75, cast: 'floor' });
    }
    for (const o of OBJ) if (o.layer === 'front') drawObj(o);
    for (const p of PETALS) if (!p.on) { px(p.x, p.y, p.c); if (p.big) px(p.x + (p.vx > 0 ? -1 : 1), p.y, p.c.map(v => v * 0.8)); }
  }

  // the glass panel: a pane of clear glass over the wall, its edges and its content drawn on top (lit from within at night)
  const PANELS = new Map();
  function panelSprite(o) {
    if (PANELS.has(o.id)) return PANELS.get(o.id);
    const rg = new Uint8ClampedArray(o.w * o.h * 4); for (let i = 0; i < o.w * o.h; i++) rg[i * 4 + 3] = 255;
    const s = sprite(rg, o.w, o.h); PANELS.set(o.id, s); return s;
  }
  const FONT = {                                  // a 3 x 5 pixel font for the live title, row by row
    'A': '.#.#.#####.##.#', 'B': '##.#.###.#.###.', 'C': '.###..#..#...##', 'D': '##.#.##.##.###.', 'E': '####..##.#..###', 'F': '####..##.#..#..',
    'G': '.###..#.##.#.##', 'H': '#.##.#####.##.#', 'I': '###.#..#..#.###', 'J': '..#..#..##.#.#.', 'K': '#.##.###.#.##.#', 'L': '#..#..#..#..###',
    'M': '#.########.##.#', 'N': '##.#.##.##.##.#', 'O': '.#.#.##.##.#.#.', 'P': '##.#.###.#..#..', 'Q': '.#.#.##.###..##', 'R': '##.#.###.#.##.#',
    'S': '.###...#...###.', 'T': '###.#..#..#..#.', 'U': '#.##.##.##.####', 'V': '#.##.##.##.#.#.', 'W': '#.##.########.#', 'X': '#.##.#.#.#.##.#',
    'Y': '#.##.#.#..#..#.', 'Z': '###..#.#.#..###', '0': '####.##.##.####', '1': '.#.##..#..#.###', '2': '##...#.#.#..###', '3': '##...#.#...###.',
    '4': '#.##.####..#..#', '5': '####..##...###.', '6': '.###..####.####', '7': '###..#.#..#..#.', '8': '####.#####.####', '9': '####.####..###.',
    ' ': '...............', '.': '.............#.', ',': '..........#.#..', '-': '......###......', ':': '....#.....#....', '!': '.#..#..#.....#.',
    '?': '##...#.#.....#.', "'": '.#..#..........', '/': '..#..#.#.#..#..',
  };
  const ICON = { reading: ['##.##', '#.#.#', '#.#.#', '#.#.#', '##.##'], writing: ['....#', '...#.', '..#..', '.#...', '#....'],
    building: ['.#.#.', '#####', '.#.#.', '#####', '.#.#.'], thinking: ['.....', '.....', '#.#.#', '.....', '.....'] };
  const PT = { cur: true, curT: 0.5, n: 4, hold: 0.4, full: 0, lines: [22, 17, 24], doc: 0 };
  const hexl = c => [lin(c[0]), lin(c[1]), lin(c[2])];
  const PC = { white: [1, 1, 1], blue: hexl([169, 205, 240]), blueD: hexl([111, 154, 214]), pink: hexl([242, 178, 201]), pinkL: hexl([251, 224, 234]),
    pinkD: hexl([236, 163, 193]), edge: hexl([169, 205, 240]) };
  function updatePanel(dt) {
    PT.curT -= dt; if (PT.curT <= 0) { PT.cur = !PT.cur; PT.curT = rand(0.35, 0.7); }
    PT.hold -= dt; if (PT.hold > 0) return;
    if (PT.full > 0) {                              // erase it the way it was typed: a few pixels at a time, never a whole row at once
      PT.n = Math.max(0, PT.n - 3); PT.hold = rand(0.04, 0.08);
      if (PT.n === 0) { PT.full = 0; PT.doc++; PT.hold = rand(0.5, 1.2); }
      return; }
    PT.n += Math.random() < 0.8 ? 2 : 1; PT.hold = Math.random() < 0.1 ? rand(0.8, 1.6) : rand(0.25, 0.6);
    if (PT.n >= 20) { PT.n = 20; PT.full = 1; PT.hold = rand(1.5, 3.5); }
  }
  function drawPanel(o, t) {
    const [x0, y0, x1, y1] = o.box, night = HW[2], Lp = lightAt((x0 + x1) / 2, (y0 + y1) / 2);
    const a = 0.16 + 0.29 * night, tint = hexl([214, 232, 250]).map((v, j) => v * (1 - night) + hexl([170, 195, 240])[j] * night);
    const lit = [0, 1, 2].map(j => Lp[j] * (1 - night) + (0.95 + 0.05 * Math.sin(t * 1.3)) * night * (1 + 0.6 * o.flare));
    const set = (x, y, c, k = 1) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const q = (y * W + x) * 3; C[q] = c[0] * lit[0] * k; C[q + 1] = c[1] * lit[1] * k; C[q + 2] = c[2] * lit[2] * k; MODE[y * W + x] = 3; };
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const q = (y * W + x) * 3; for (let j = 0; j < 3; j++) C[q + j] = C[q + j] * (1 - a) + tint[j] * lit[j] * a; }
    for (let x = x0; x <= x1; x++) { set(x, y0, PC.white); set(x, y1, PC.edge); }
    for (let y = y0; y <= y1; y++) { set(x0, y, PC.white); set(x1, y, PC.edge); }
    for (let x = x0 + 2; x <= x1 - 2; x++) { set(x, y0 + 2, PC.pinkL); set(x, y1 - 2, PC.pinkL); }
    for (let y = y0 + 2; y <= y1 - 2; y++) { set(x0 + 2, y, PC.pinkL); set(x1 - 2, y, PC.pinkL); }
    const ring = [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4], [4, 3], [4, 2], [4, 1], [3, 0], [2, 0], [1, 0]];
    const rx = x1 - 9, ry = y0 + 4, spin = LIVE.on ? (LIVE.action === 'building' ? 0.07 : 0.16) : 0.25, kk = Math.floor(t / spin) % 12;
    ring.forEach(([a_, b], i) => set(rx + b, ry + a_, i === kk ? PC.white : PC.pink, i === kk ? 1.3 : 1));
    if (LIVE.on) {
      const ic = ICON[LIVE.action] || ICON.thinking;
      ic.forEach((row, yy) => [...row].forEach((ch, xx) => { if (ch === '#') set(x0 + 4 + xx, y0 + 3 + yy, PC.pink); }));
      const words = (LIVE.title || '').toUpperCase().replace(/[^A-Z0-9 .,\-:!?'/]/g, ' ').split(/\s+/).filter(Boolean), lines = []; let cur = '';
      for (const w of words) { for (let p = 0; p < w.length; p += 7) { const part = w.slice(p, p + 7); if (!cur) cur = part; else if (cur.length + 1 + part.length <= 7) cur += ' ' + part; else { lines.push(cur); cur = part; } } }
      if (cur) lines.push(cur);
      const top = lines.length > 2 ? Math.floor(LIVE.since / 2.6) % (lines.length - 1) : 0;     // a slow teleprompter, line by line
      for (let li = 0; li < 2; li++) { const s = lines[top + li]; if (!s) continue;
        [...s].forEach((ch, ci) => { const g = FONT[ch] || FONT[' ']; for (let b = 0; b < 15; b++) if (g[b] === '#') set(x0 + 4 + ci * 4 + b % 3, y0 + 8 + li * 6 + ((b / 3) | 0), li ? PC.blue : night > 0.5 ? PC.white : PC.blueD); }); }   // the title reads on dark glass at night too
    } else {
      set(x0 + 4, y0 + 4, PC.pink); set(x0 + 5, y0 + 4, PC.pink);
      for (let x = x0 + 7; x < x0 + 19; x++) set(x, y0 + 4, PC.blueD);
      PT.lines.forEach((ln, i) => { for (let x = x0 + 4; x < x0 + 4 + ln; x++) set(x, y0 + 8 + i * 3, night > 0.5 ? PC.blueD : PC.blue); });
      for (let x = x0 + 4; x < x0 + 4 + PT.n; x++) set(x, y0 + 17, PC.pink);
      if (PT.cur) { set(x0 + 5 + PT.n, y0 + 16, PC.pinkD); set(x0 + 5 + PT.n, y0 + 17, PC.pinkD); }
    }
  }

  // ---------- one frame: light it, then snap it to the palette through the dither ----------
  function render(t) {
    HW = hourWeights(); HP = lightParams(t); ditherTables(HP.hp.dither ?? DITHER);
    compose(t);
    rasterLeaves(t);
    castShadows();
    computeLight(t);
    // her contact shadow: a flat oval under her feet
    if (MS.feet) { const [fx, fy] = MS.feet; for (let y = fy - 1; y <= fy + 2; y++) for (let x = fx - 6; x <= fx + 6; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = y * W + x; if (OID[i] === MARCH_OID) continue;
      if (((x - fx) / 6.2) ** 2 + ((y - fy - 0.5) / 1.6) ** 2 <= 1) AO[i] = 0.8; } }
    for (let i = 0; i < N; i++) {
      const k = i * 3, m = MODE[i];
      if (m === 0) { const v = VIG[i] * AO[i]; C[k] = ALB[k] * LT[k] * v; C[k + 1] = ALB[k + 1] * LT[k + 1] * v; C[k + 2] = ALB[k + 2] * LT[k + 2] * v; }
      else { const s = SLOT[i] * 3, a = m === 1 ? AO[i] : 1; C[k] = ALB[k] * SLOTV[s] * a; C[k + 1] = ALB[k + 1] * SLOTV[s + 1] * a; C[k + 2] = ALB[k + 2] * SLOTV[s + 2] * a; }
    }
    // glints in the garden at night
    for (const g of GLINTS) { const k = (g.y * W + g.x) * 3; C[k] = 1.0; C[k + 1] = 0.86; C[k + 2] = 0.97; }
    // dust motes: they show only where light falls through the air (the abyss's marine snow near the lure)
    const warm = [1.0 * (1 - HW[2]) + 0.9 * HW[2], 0.92 * (1 - HW[2]) + 0.7 * HW[2], 0.75 * (1 - HW[2]) + 0.95 * HW[2]];
    for (const m of MOTES) {
      const x = m.x | 0, y = m.y | 0; if (x < 0 || y < 0 || x >= W - 1 || y >= H - 1) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * (0.8 + m.sz * 2.2) + m.ph), I = DL[y * W + x] * tw * (m.z < 1 ? 0.55 : 0.28) * (1 + 0.6 * HW[2]);
      if (I < 0.01) continue;
      const add = (X, Y, f) => { const k = (Y * W + X) * 3; C[k] += I * f * warm[0]; C[k + 1] += I * f * warm[1]; C[k + 2] += I * f * warm[2]; };
      add(x, y, 1); if (m.z >= 1) { add(x + 1, y, 1); add(x, y + 1, 1); add(x + 1, y + 1, 1); }
    }
    // fireflies: a bright core
    if (HW[2] > 0.05) for (const f of FLIES) if (f.lv > 0.05) { const x = Math.round(f.x), y = Math.round(f.y); if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const k = (y * W + x) * 3, I = f.lv * HW[2]; C[k] += 0.9 * I; C[k + 1] += 0.78 * I; C[k + 2] += 0.9 * I; }
    for (const o of OBJ) if (o.lit === 'panel') drawPanel(o, t);
    // to the palette, through the dither, for everything LIT PER PIXEL (wall, floor, furniture, ink, petals): the light
    // field is continuous, the palette and the Bayer cell (locked to the world grid) are fixed, so a glow comes out as
    // stepped pixel rings. SPRITES (March, the branch, the garden, the strip) and the panel's drawn lines are NOT
    // dithered: they are palette-swapped as a whole (their own painted colours, times one light stepped in 1/32s), the
    // way pixel games relight a sprite, so her colours can never crawl or speckle as she walks or as the hour turns.
    const D = img.data, QM = QN - 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, k = i * 3, o = i << 2;
      let r = C[k] * QM, g = C[k + 1] * QM, b = C[k + 2] * QM;
      r = r <= 0 ? 0 : r >= QM ? QM : r | 0; g = g <= 0 ? 0 : g >= QM ? QM : g | 0; b = b <= 0 ? 0 : b >= QM ? QM : b | 0;
      if (RAW && MODE[i] !== 0 && RAWLIT) { D[o] = 255; D[o + 1] = 0; D[o + 2] = 255; D[o + 3] = 255; continue; }   // ?raw=lit: only the dithered pixels, for tools/palette.py
      if (RAW || MODE[i] !== 0) { D[o] = Math.sqrt(r / QM) * 255; D[o + 1] = Math.sqrt(g / QM) * 255; D[o + 2] = Math.sqrt(b / QM) * 255; D[o + 3] = 255; continue; }
      const dd = DOX[i], base = ((((y + (dd >> 2)) & 3) << 2) | ((x + (dd & 3)) & 3)) * QN;
      const key = (QT[base + r] << 12) | (QT[base + g] << 6) | QT[base + b], li = LUT[key];
      const p = (li === UNSET ? nearest(key) : li) * 3;
      D[o] = PALB[p]; D[o + 1] = PALB[p + 1]; D[o + 2] = PALB[p + 2]; D[o + 3] = 255;
    }
    sctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, camX, 0, VW, H, 0, 0, cv.width, cv.height);
  }

  // ---------- touch ----------
  // THE FIRST-TAP STUTTER (21 Oct 2026): making the AudioContext inside the first tap stalled the page about 0.13 s.
  // So it is made at an idle moment after load (a browser keeps it suspended until a gesture), and a tap only calls
  // resume(), never awaited; sounds scheduled while it wakes play when it does.
  let AC = null, bus = null;
  function makeAudio() {
    if (AC !== null) return;
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      bus = AC.createGain(); bus.gain.value = 0.5;
      const dl = AC.createDelay(1), fb = AC.createGain(), lp = AC.createBiquadFilter();
      dl.delayTime.value = 0.23; fb.gain.value = 0.3; lp.type = 'lowpass'; lp.frequency.value = 1800;
      bus.connect(AC.destination); bus.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(AC.destination);
    } catch (e) { AC = false; }                      // no sound in this browser
  }
  (window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(makeAudio, { timeout: 3000 });
  function sound(kind) {
    try {
      if (!AC) { if (AC === null) setTimeout(makeAudio, 0); return; }   // tapped before the idle moment: silent this once
      if (AC.state === 'suspended') AC.resume();
      const t0 = AC.currentTime;
      const tone = (f, pk, a, d, type = 'sine', at = 0, f2) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0 + at);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + at + a + d);
        g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(pk, t0 + at + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + a + d);
        o.connect(g); g.connect(bus); o.start(t0 + at); o.stop(t0 + at + a + d + 0.05); };
      if (kind === 'door') { tone(196, 0.22, 0.04, 1.6, 'sine', 0, 186); tone(587.3, 0.06, 0.03, 1.8); tone(784, 0.05, 0.05, 2.0); tone(1174.7, 0.03, 0.06, 2.2); tone(1568, 0.015, 0.08, 1.6); }
      else if (kind === 'march') { tone(880, 0.07, 0.01, 0.12, 'triangle', 0, 990); tone(1320, 0.06, 0.01, 0.16, 'triangle', 0.09, 1480); }
      else if (kind === 'nudge') { tone(330, 0.05, 0.01, 0.25, 'triangle'); tone(495, 0.03, 0.01, 0.3, 'sine', 0.05); }
      else { tone(660, 0.045, 0.006, 0.22, 'sine', 0, 640); tone(1320, 0.012, 0.004, 0.18); }
    } catch (e) { /* sound is optional */ }
  }
  const toArt = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / SC + camX, (ev.clientY - r.top) / SC]; };
  function hitSprite(s, sx, sy, x, y) { const i = Math.floor(x - sx), j = Math.floor(y - sy); return i >= 0 && j >= 0 && i < s.w && j < s.h && s.a[j * s.w + i]; }
  function stir(x, y, power, reach) {
    for (const m of MOTES) { const dx = m.x - x, dy = m.y - y, d = Math.hypot(dx, dy) + 3; if (d < reach) { m.vx += dx / d * power * (1 - d / reach); m.vy += dy / d * power * (1 - d / reach); } }
  }
  function ripple(x, y, big) {
    const night = HW[2], c = big ? [0.55 + 0.2 * night, 0.42, 0.62] : [0.35, 0.36, 0.42];
    RIPPLES.push({ x, y, a: 0, life: big ? 2.2 : 0.9, speed: big ? 105 : 36, w: big ? 2.6 : 1.6, I: big ? 0.55 : 0.28, c });
  }
  // what is under a point: March first, then the things front to back (only those with a tap or a card)
  function pick(x, y) {
    if (MS && hitSprite(MS.s, MS.x, MS.y, x, y)) return 'march';
    const order = [...OBJ.filter(o => o.layer === 'front'), ...OBJ.filter(o => o.layer === 'actor').sort((a, b) => b.base - a.base), ...OBJ.filter(o => o.layer === 'back').reverse()];
    for (const o of order) {
      if (!o.tap && !o.card) continue;
      if (o.lit === 'panel' ? (x >= o.box[0] && x <= o.box[2] + 1 && y >= o.box[1] && y <= o.box[3] + 1) : hitSprite(o.poses[o.pose], o.x, o.y, x, y)) return o;
    }
    return null;
  }
  function tap(x, y, t) {
    const hit = pick(x, y);
    // March first: she hops and looks toward the tap
    if (hit === 'march') {
      if (['walk', 'idle'].includes(M.st)) { M.hop = 0; if (M.st === 'idle') { M.face = x >= MS.x + MS.s.w / 2 ? 'R' : 'L'; M.dur = Math.max(M.dur, M.t + 1.5); } }
      else M.jig = 0;
      M.blinkT = 0; sound('march'); stir(x, y, 12, 30); return 'march';
    }
    // then the thing hit: its own effect, and its card
    if (hit) {
      const o = hit;
      if (o.tap === 'flare') {
        const fo = o.lights.length ? o : (byId('garden') || o); fo.flareT = 1;
        const cx = fo.lights[0] ? fo.lights[0].x : x, cy = fo.lights[0] ? fo.lights[0].y + 7 : y;
        ripple(cx, cy, true); shed(fo, 18, true); stir(cx, cy, 30, 90); sound('door');
        if (M.st === 'idle') { M.face = cx > M.fx ? 'R' : 'L'; M.dur = Math.max(M.dur, M.t + 2); M.blinkT = 0; }
      } else if (o.tap === 'nudge') { o.nudge = 0.45; shed(o, 2, true); stir(x, y, 18, 40); sound('nudge'); }
      else if (o.tap === 'gust') { gust(t, 1.3); shed(o, 5, false); stir(x, y, 10, 60); sound('nudge'); }
      else if (o.tap === 'visit') { visit(o); ripple(x, y, false); sound('tap'); }
      else { ripple(x, y, false); sound('tap'); }
      return o.card || null;
    }
    if (y >= FLOOR) { const p = clampFree(x, y); goTo(p); ripple(x, y, false); stir(x, y, 14, 30); sound('tap'); }
    else { ripple(x, y, false); stir(x, y, 14, 34); sound('tap'); if (M.st === 'idle') { M.face = x > M.fx ? 'R' : 'L'; M.dur = Math.max(M.dur, M.t + 1.2); } }
    return null;
  }
  function goTo(p) {
    const go = () => walkTo(p, () => idle(rand(2, 5)));
    M.beh = 'tap';
    if (M.st === 'seated') standUp(go); else if (M.st === 'down' || M.st === 'up') M.queue = go; else go();
  }
  function visit(o) {
    const s = o.spot; if (!s) return;
    if (s.use === 'desk') { if (M.st !== 'seated' && M.st !== 'down') goDesk(rand(8, 20), Math.random() < 0.7 ? 'work' : 'sit'); return; }
    goTo(clampFree(s.x + rand(-4, 4), s.y));
    M.then = () => idle(rand(...(s.hold || [2, 5])), s.face);
  }
  let lastMove = null, HOVER = null;
  cv.addEventListener('pointerdown', ev => { const [x, y] = toArt(ev); const card = tap(x, y, T); onTap(card, ev); });
  cv.addEventListener('pointerleave', () => { HOVER = null; lastMove = null; cv.style.cursor = ''; onHover(null); });
  cv.addEventListener('pointermove', ev => { const [x, y] = toArt(ev);
    if (ev.pointerType === 'mouse') {               // the hover name and glow: a mouse only (a finger has no hover)
      const h = pick(x, y), card = h === 'march' ? 'march' : h && h.card;
      const next = card ? h : null;
      if (next !== HOVER) {
        HOVER = next; cv.style.cursor = card ? 'pointer' : '';
        if (!card) onHover(null);
        else { const b = h === 'march' ? { x: MS.x + MS.s.w / 2, y: MS.y + 6 } : { x: h.x + h.w / 2, y: h.y }, r = cv.getBoundingClientRect();
          onHover(card, h === 'march' ? 'March' : (h.name || h.id), [r.left + (b.x - camX) * SC, r.top + b.y * SC]); }
      }
    }
    if (lastMove) { const dx = x - lastMove[0], dy = y - lastMove[1];
      for (const m of MOTES) { const d = Math.hypot(m.x - x, m.y - y); if (d < 14) { m.vx += dx * 3 * (1 - d / 14); m.vy += dy * 3 * (1 - d / 14); } } }
    lastMove = [x, y]; });

  // ---------- the loop ----------
  let T = 0, DT = 0.016, last = performance.now();
  layout(); addEventListener('resize', layout);
  if (typeof ResizeObserver === 'function' && cv.parentElement) new ResizeObserver(() => layout()).observe(cv.parentElement);
  // perf.first: when the first frame was drawn (performance.now()); n, avg, worst: frame times after the first second
  const perf = { first: 0, n: 0, sum: 0, worst: 0, get avg() { return this.n ? this.sum / this.n : 0; } };
  const REC = { on: false, every: 1, i: 0, frames: [], times: [] };
  window.__room = {
    perf, M, LIVE, get hours() { return HW; }, get cam() { return { camX, VW, SC }; }, get sky() { return SKY; },
    toClient: (x, y) => { const r = cv.getBoundingClientRect(); return [r.left + (x - camX + 0.5) * SC, r.top + (y + 0.5) * SC]; },
    marchBox: () => MS && { x: MS.x, y: MS.y, w: MS.s.w, h: MS.s.h },
    record: (n, every = 1) => new Promise(res => { REC.on = true; REC.every = every; REC.i = 0; REC.frames = []; REC.times = []; REC.n = n; REC.res = res; }),
  };
  function frame(now) {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now; T += dt; DT = dt;
    const t0 = performance.now();
    HW = hourWeights();
    liveDrive(); if (LIVE.on) LIVE.since += dt;
    updateMarch(dt, T, HW); updateLife(dt, T, HW); updatePanel(dt);
    // the camera: whole art pixels, only when she nears the edge of the window
    // (a dead zone while she walks; once she stops, it drifts slowly back to centre her)
    if (VW < W) { const cx = (MS && !MS.feet) ? (MD.view ?? MD.approach[0]) : M.fx, lo = camF + VW * 0.32, hi = camF + VW * 0.68; let tgt = camF, k = 4;   // seated: MD.view keeps the desk and the glass panel both in view
      if (M.st !== 'walk') { tgt = cx - VW / 2; k = 0.8; } else { if (cx < lo) tgt = cx - VW * 0.32; if (cx > hi) tgt = cx - VW * 0.68; }
      camF += (clamp(tgt, 0, W - VW) - camF) * (1 - Math.exp(-k * dt)); camX = Math.round(camF); } else camX = 0;
    render(T);
    if (!perf.first) { perf.first = performance.now(); cv.dispatchEvent(new Event('firstframe')); }
    const ms = performance.now() - t0;
    if (T > 1) { perf.n++; perf.sum += ms; perf.worst = Math.max(perf.worst, ms); }
    if (REC.on && (REC.i++ % REC.every === 0)) {
      REC.frames.push(new Uint8Array(img.data.buffer.slice(0))); REC.times.push(T);
      if (REC.frames.length >= REC.n) { REC.on = false; const all = new Uint8Array(REC.frames.length * N * 4); REC.frames.forEach((f, i) => all.set(f, i * N * 4));
        let s = ''; for (let i = 0; i < all.length; i += 0x8000) s += String.fromCharCode.apply(null, all.subarray(i, i + 0x8000));
        REC.res({ w: W, h: H, n: REC.frames.length, times: REC.times, b64: btoa(s), camX }); REC.frames = []; }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {
    setLive: (j) => { if (!FORCED) applyLive(j); },          // { live, action: reading|writing|building|thinking, title }
    setWeather: (sky) => { if (!Q.has('weather') && WEATHER[sky]) SKY = sky; },
    layout,
    objects: OBJ,
    // the things March added (state/objects.json), once the page has read them: placed exactly as `extra` would have been
    addThings: (list) => addAll(list || []),
  };
}
