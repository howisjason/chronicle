// march-base.js: the new March, drawn live, every pixel computed each frame.
//
// ADOPTED from human-hunt/13-base/base.html (the base, step 1, 9 Oct 2026; its
// <script> from "SHARED DATA" to the end of the engine), copied as it was. Her
// data (HOSTS.march), the parts, ramps, hair, hands, face tables and springs
// are unchanged. Every line that differs is marked [chronicle]; the changes are
// only wiring:
//   1. the page-load IIFE is a factory, makeMarch(boxHeight, crownRow), one per
//      stage canvas; URL options are gone (every flag is off);
//   2. no page background is set;
//   3. the grid is a box FRAME_W wide (her reach) on the 128x72 stage at 1:1,
//      not sized from the window; no floor (the stage's desk is in front);
//   4. the demo's acts (talk gesture, wave) are removed: arms rest;
//   5. only the current 12-second loop's plan (blinks, weight shifts) is kept;
//   6. talking comes from the stage (TALK), not the demo's clock; no scripted
//      lean, wave or laugh;
//   7. the mouth's syllable is chosen by the stage from her own VISEMES table;
//      the demo's brow, gaze, hi, smile and laugh windows are removed;
//   8. no window canvas: frame() hands back RGBA pixels, background see-through
//      except her outline ink;
//   9. requestAnimationFrame and the tap are replaced by frame(t, talk), stepped
//      from the stage's clock, with jumps settled instead of stepped through.
// Kept but never used on the stage: GESTURES (the frame width still reads them),
// the tap, ?sil/?check/?hands code paths behind flags that are always off.
// people.js composes the returned pixels into the stage.

// ==================================================================== SHARED DATA
// Gestures (rule 7). A key is a pose for ONE arm: `at` is the wrist target in head units from the
// shoulder (x outward, y down), `hand` the hand picture, `dir` where the hand points (degrees,
// 0 out, 90 down, -90 up). Keys start at `t` seconds after the gesture starts; springs do the
// moving between them. `beat` nudges the pose on each spoken word; `osc` swings the forearm.
const GESTURES = {
  talk: { keys: [{ t: 0, at: [-.02, .33], hand: 'open', dir: -55 }],
          beat: { at: [.02, -.05], dir: -25 } },
  wave: { keys: [{ t: -.18, at: [.13, .56], hand: 'relaxed', dir: 90 },        // a small dip first (anticipation)
                 { t: 0, at: [.5, .1], hand: 'open', dir: -45 },
                 { t: .3, at: [.5, -.27], hand: 'wave', dir: -80 }],
          osc: { from: .42, to: 2.1, amp: 20, hz: 2 } },
};
// Expressions are points in seven numbers, Live2D's standard list (BASE-SPEC "The head"):
// eyeOpen (0 shut, 1 open, 1.5 wide), mouthOpen (0..1), mouthForm (-1 round, 0 flat, 1 smile),
// brow (-1..1, up), gaze (-1..1, whole pixels), eyeSmile (0..1), blush (0..1).
// A visible face is chosen from the host's stamps by these numbers, so a new face is data.
const EXPR = {
  rest:      { eyeOpen: 1, mouthOpen: 0, mouthForm: .4, brow: 0, gaze: 0, eyeSmile: 0, blush: .5 },
  smile:     { mouthForm: 1, blush: .6 },
  hi:        { mouthOpen: .9, mouthForm: .6, brow: .5 },
  happy:     { eyeSmile: 1, mouthOpen: .9, mouthForm: 1, blush: 1, brow: .6 },
  surprised: { eyeOpen: 1.5, mouthOpen: .7, mouthForm: -1, brow: 1, blush: 0 },
};
// Talking: each syllable is a mouth shape given as [mouthOpen, mouthForm].
const VISEMES = [[.3, 0], [.6, 0], [.9, .3], [.6, 0], [.7, -1], [.5, .8]];

// ==================================================================== THE HOSTS
// Units: joints, radii and garments are in head units (HU); y = 0 is the crown, x = 0 the body's
// centre line, +x is screen right. Garment points ride the body; a third value of 1 marks a hem
// point that trails the hips. Head and hair numbers are pixels in head space (Face first's units:
// x from the centre line, y from the crown; the chin sits near y = HU).
const HOSTS = {
  march: {
    canon: { HU: 28, heads: 2.5 },
    ink: '#2b1d36',
    // one base colour per material; the kind picks the hue-shift rule (rule 5)
    mats: { wall: ['cloth', '#e9e7f4'], floor: ['cloth', '#d2cfe5'],
            skin: ['skin', '#fcdccd'], hair: ['hair', '#f7b9d3'], hairTip: ['hair', '#e886b3'],
            top: ['cloth', '#f8f8fd'], coat: ['cloth', '#9ed3f1'], navy: ['cloth', '#3f4472'], sole: ['cloth', '#dcdbea'] },
    joints: { neckTop: [0, .9], neckBot: [0, 1.08], shL: [-.24, 1.1], shR: [.24, 1.1],
              hipL: [-.12, 1.6], hipR: [.12, 1.6], knL: [-.12, 2.02], knR: [.12, 2.02], anL: [-.13, 2.35], anR: [.13, 2.35],
              toeL: [-.19, 2.45], toeR: [.19, 2.45] },
    limbs: { neck: [.072, .08], upper: [.07, .065, .31], fore: [.065, .06, .265], thigh: [.085, .07], shin: [.065, .055] },
    torso: [[-.22, 1.06], [.22, 1.06], [.25, 1.14], [.2, 1.62], [-.2, 1.62], [-.25, 1.14]],
    rest: { L: { at: [.22, .52], hand: 'relaxed', dir: 100 },           // the free arm hangs
            R: { at: [.1, .4], hand: 'relaxed', dir: 150 } },        // the other hand on her hip
    garments: [
      { name: 'boots', z: 18, mats: ['navy', 'sole'], pieces: [{ on: 'shin', from: .15, to: 1, r: [.085, .075] }, { on: 'foot', r: [.085, .1] }] },
      { name: 'skirt', z: 35, mats: ['navy'], pieces: [{ on: 'hip', rr: .5, pts: [[-.22, 1.48], [.22, 1.48], [.3, 1.62], [.43, 1.87, 1], [0, 1.89, 1], [-.43, 1.87, 1], [-.3, 1.62]] }] },
      { name: 'top', z: 40, mats: ['top'], pieces: [{ on: 'torso', pts: [[-.26, 1.06], [.26, 1.06], [.25, 1.3], [.22, 1.56], [-.22, 1.56], [-.25, 1.3]] }] },
      { name: 'coat', z: 50, mats: ['coat'], pieces: [
          { on: 'torso', mirror: 1, pts: [[-.29, 1.06], [-.12, 1.03], [-.11, 1.3], [-.13, 1.56], [-.27, 1.58], [-.3, 1.3]] },
          { on: 'upper', from: 0, to: 1, r: [.1, .09] }, { on: 'fore', from: 0, to: .6, r: [.095, .088] }] },
    ],
    head: { face: [[1, 8], [4, 11.4], [8, 12.6], [14, 13], [18, 12.7], [21.4, 11.8], [24, 10], [25.9, 7.4], [27.2, 4.4], [27.8, 1.6]], chin: 28 },
    hair: {
      dome: [0, 12.4, 16.6, 16.8], top: 4.4,
      inner: [[4, 11.8], [16, 12.6], [22, 12], [26, 11], [31, 11]],
      outer: [[12.4, 16.6], [18, 16.9], [24, 17.3], [28, 18.4], [31, 19.6]],
      tips: [[12.6, 34.4], [15.8, 36.4], [18.8, 34.8]], valley: 30.6,
      notch: { from: 8, to: 30, every: 5.5, depth: 2.4 },
      fringe: [[-13.8, 8], [-12, 14], [-9.4, 7], [-6, 13.2], [-3.2, 7.4], [.4, 14.6], [3.2, 7.6], [6.8, 13.4], [9.6, 7.2], [12.2, 14], [13.8, 8]],
      back: [15.6, 8, 31.6], shine: [[-9, 0], [-8, -1], [-7, -1]], grad: [[21, 'hairTip']],
      locks: [{ tube: [-13.4, 19, -15.2, 40, 2.9, .15], chain: 1 }],
      chains: [{ pivot: 13, len: 7, k: 38, c: 3.2, gain: 1.7, pass: .6 }, { pivot: 18, len: 8, k: 26, c: 2.4, gain: 2.1, pass: .7 }],
    },
    face: {
      eyeY: 16, eyeIn: 4, mouthY: 21, blush: { x: 9, y: 20 },
      cols: { K: '#3a1e3e', G: '#ffffff', M: '#3a1e3e', D: '#8e2f52', T: '#f28aa2', C: '#f6a7bf' },
      eyes: { open: ['KKK', 'KKK', 'KKK'], half: ['...', 'KKK', 'KKK'], shut: ['...', '...', 'KKK'],
              wide: ['.KK.', 'KKKK', 'KKKK', '.KK.'], happy: ['...', '.K.', 'K.K'], wink: ['K..', '.KK', 'K..'] },
      shine: [0, 0], happyEyes: ['happy', 'wink'],
      mouths: { flat: ['MMMM'], rest: ['M..M', '.MM.'], smile: ['M....M', '.MMMM.'],
                small: ['.DD.', '.DD.'], mid: ['DDDD', '.DD.'], wide: ['DDDD', 'DTTD', '.DD.'],
                o: ['.DD.', 'DDDD', '.DD.'], e: ['DDDDDD', '.DTTD.'], laugh: ['DDDDDD', 'DDTTDD', '.DTTD.'] },
      blushes: { soft: ['CC'], full: ['CCC'] },
    },
  },
};

// ==================================================================== THE ENGINE
export function makeMarch(BOX_H, TOP) {             // [chronicle] was (() => { ... })(): BOX_H rows of stage, crown line TOP
  'use strict';
  const Q = new URLSearchParams('');                 // [chronicle] no URL options on the stage: every flag below is off
  const HOST = HOSTS[Q.get('host')] || HOSTS.march;
  const SIL = Q.has('sil'), CHECK = Q.has('check'), INK_OWN = Q.get('ink') === 'own';
  const HAND = Q.has('hand') ? +Q.get('hand') || 9 : (HOST.hand || 9);
  const HU = HOST.canon.HU, HEADS = HOST.canon.heads;
  const LOOP = 12, DT = 1 / 120;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;

  // ------------------------------------------------------------------ colour: one base colour -> a 4-step ramp (rule 5)
  // Worked in OKLab so brightness steps are even to the eye. Ramp = [light, base, shade, dark].
  // Skin's shadow turns toward red-purple (a blue shadow on a face "looks like frostbite"), cloth
  // and hair toward blue-violet, light toward yellow; the step per jump is per kind (research C §6).
  const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const s2l = c => (c /= 255) <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  const l2s = c => 255 * (c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055);
  const toLab = rgb => { const [r, g, b] = rgb.map(s2l);
    const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b),
          s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    return [.2104542553 * l + .7936177850 * m - .0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .8086757660 * s]; };
  const fromLch = (L, C, h) => {                       // back to sRGB, chroma pulled in until it fits
    for (let k = 0; k < 40; k++) {
      const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
      const l = (L + .3963377774 * a + .2158037573 * b) ** 3, m = (L - .1055613458 * a - .0638541728 * b) ** 3, s = (L - .0894841775 * a - 1.2914855480 * b) ** 3;
      const lin = [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.7076147010 * s];
      if (lin.every(v => v > -1e-4 && v < 1.0001) || C < 1e-3) return lin.map(v => Math.round(clamp(l2s(clamp(v, 0, 1)), 0, 255)));
      C *= .9;
    } };
  const KIND = { skin: { to: 5, step: 12 }, hair: { to: 290, step: 17 }, cloth: { to: 285, step: 16 } };
  const toward = (h, t, d) => h + clamp(((t - h + 540) % 360) - 180, -d, d);
  const makeRamp = (kind, hex) => {
    const base = hx(hex), [L, a, b] = toLab(base), C = Math.hypot(a, b), K = KIND[kind];
    const h = C < .02 ? K.to : (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;   // a near-white has no hue; its shade borrows the kind's
    return [fromLch(Math.min(.995, L + .055), C * .8, toward(h, 100, K.step)), base,
            fromLch(L - .09, Math.max(C * 1.1, .03), toward(h, K.to, K.step)),
            fromLch(L * .5 + .02, Math.max(C * 1.15, .05), toward(h, K.to, K.step * 2))];
  };
  const R = {}; for (const k in HOST.mats) R[k] = makeRamp(...HOST.mats[k]);
  const INK = hx(HOST.ink);
  const FC = {}; for (const k in HOST.face.cols) FC[k] = hx(HOST.face.cols[k]);
  const lum = c => toLab(c)[0];

  // ------------------------------------------------------------------ grid
  // The frame is sized from how far this host reaches, never a fixed width: the widest hand target
  // of any pose (clamped to the arm's length, plus the wave's forearm swing), a hand beyond it, the
  // shoulder's lift outward, and the hair. A fixed 54 px clipped a wave at the frame's edge.
  const SHRUG = HOST.shrug || { up: .07, out: .035 };   // how far a shoulder lifts (head units) when its arm is raised
  const FRAME_W = (() => {
    const jt = HOST.joints, lm = HOST.limbs, arm = (lm.upper[2] + lm.fore[2]) * HU, hr = HOST.hair;
    const shx = Math.max(Math.abs(jt.shL[0]), Math.abs(jt.shR[0])) * HU + SHRUG.out * HU;
    let reachX = 0;
    const poses = [HOST.rest.L, HOST.rest.R, ...Object.values(GESTURES).flatMap(g => g.keys.map(k => Object.assign({ osc: g.osc }, k)))];
    for (const p of poses) { const d = Math.hypot(p.at[0], p.at[1]) * HU || 1;
      reachX = Math.max(reachX, p.at[0] * HU * Math.min(1, arm / d) + (p.osc ? lm.fore[2] * HU * Math.sin(p.osc.amp * Math.PI / 180) : 0)); }
    const hairX = Math.max(hr.dome[2], ...hr.outer.map(o => o[1]));
    return 2 * Math.ceil(Math.max(27, shx + reachX + HAND * .5 + 2, hairX + 4));
  })();
  // [chronicle] the box is FRAME_W wide (her reach) and BOX_H tall, at 1:1 on the 128x72 stage; TOP is the crown's row.
  const W = FRAME_W, H = BOX_H;
  const CX = Math.floor(W / 2);                       // the centre line sits on a pixel boundary: head and face mirror exactly
  const SOLE = TOP + HEADS * HU;
  const FLOORY = Infinity;                            // [chronicle] no floor: she sits behind the stage's desk
  const P = (x, y) => [CX + x * HU, TOP + y * HU];
  const sn = v => Math.round(v);                      // rule 2: joints land on whole pixels (pixel corners, so the centre line stays exact)
  const snp = ([x, y]) => [sn(x), sn(y)];
  const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  // ------------------------------------------------------------------ shapes (signed distance, art px; negative = inside)
  const segD = (x, y, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1e-6), 0, 1);
    return Math.hypot(x - ax - dx * t, y - ay - dy * t); };
  const tube = ([ax, ay], [bx, by], r1, r2) => (x, y) => {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-6, t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1);
    return Math.hypot(x - ax - dx * t, y - ay - dy * t) - (r1 + (r2 - r1) * t); };
  const poly = (pts, rr = 0) => (x, y) => {           // iq's polygon distance, any polygon
    let d = Infinity, s = 1;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [ax, ay] = pts[j], [bx, by] = pts[i], ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
      const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1);
      d = Math.min(d, Math.hypot(wx - ex * t, wy - ey * t));
      const c1 = y >= ay, c2 = y < by, c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    return s * d - rr; };
  const inter = (f, g) => (x, y) => Math.max(f(x, y), g(x, y));
  const bbPts = (pts, pad) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]; };
  const prof = pts => y => {                          // Face first's profile: a value per row, straight between the given rows
    if (y <= pts[0][0]) return pts[0][1];
    for (let k = 1; k < pts.length; k++) if (y <= pts[k][0]) { const [y0, v0] = pts[k - 1], [y1, v1] = pts[k]; return lerp(v0, v1, (y - y0) / (y1 - y0)); }
    return pts[pts.length - 1][1]; };

  // ------------------------------------------------------------------ the hand pictures (BASE-SPEC "The hands")
  // Pictures, pixel by pixel: fingers point UP, the wrist is the middle of the bottom row, the
  // thumb is on the right. S skin, k a crease (the skin's dark). The four straight turns are exact
  // 90-degree turns of the table; the four diagonal turns are made once from it by a 45-degree turn
  // sampled 4x4 per pixel; a mirror moves the thumb to the other side. (A rasterized round shape
  // was tried first: at 6 to 9 px every picture came out the same lump, round 3.)
  const HANDPICS = {
    9: {
      relaxed: ['.SSS....', 'SSSSS...', 'SkSkS...', 'SkSkS.SS', 'SSSSS.SS', 'SSSSSSS.', '.SSSSS..', '..SSS...', '..SSS...'],   // finger creases and a thumb apart: no mitten
      open:    ['.SSS....', 'SSSSS...', 'SSSSS...', 'SSSSS..S', 'SSSSS.SS', 'SSSSSSS.', '.SSSSS..', '..SSS...', '..SSS...'],
      wave:    ['SS.SS...', 'SSkSS...', 'SSkSS..S', 'SSSSS.SS', 'SSSSSSS.', '.SSSSS..', '.SSSS...', '..SSS...', '..SSS...'],
      fist:    ['.SS.SS..', 'SSSSSSS.', 'SSSSSSS.', 'SkkkkSSS', 'SSSSSkSS', '.SSSSSS.', '..SSS...', '..SSS...'],   // knuckle bumps on top, the thumb's bulge and crease
      point:   ['...SS..', '...SS..', '...SS..', '.SSSSS.', 'SSSSSSS', 'SSkkkSS', '.SSSSS.', '..SSS..', '..SSS..'],
      holding: ['..SSS..', '.SSSSS.', 'SSkkkSS', 'SS...SS', 'SSkkkSS', '.SSSSS.', '..SSS..', '..SSS..'],
    },
    6: {
      relaxed: ['.SSS.', 'SSSSS', 'SSSSS', 'SSSkS', '.SSkS', '.SSS.'],
      open:    ['.SS...', 'SSSS..', 'SSSS.S', 'SSSSSS', '.SSSS.', '.SSS..'],
      wave:    ['SS.S..', 'SSkS.S', 'SSSSSS', 'SSSSS.', '.SSS..', '.SS...'],
      fist:    ['.SSS.', 'SSSSS', 'SkkSS', 'SSSSS', '.SSS.', '.SSS.'],
      point:   ['..SS.', '..SS.', 'SSSSS', 'SkkSS', '.SSS.', '.SSS.'],
      holding: ['.SSS.', 'SS.SS', 'SS.SS', '.SSS.', '.SSS.'],
    },
  };
  const PICS = {};                                     // cells by "dx,dy" from the wrist, straight and diagonal
  const picOf = (size, name) => {
    const key = size + name; if (PICS[key]) return PICS[key];
    const sz = HANDPICS[size] ? size : 9, rows = HANDPICS[sz][name] || HANDPICS[sz].relaxed;
    const ay = rows.length - 1, bot = rows[ay], ax = Math.floor((bot.indexOf('S') + bot.lastIndexOf('S')) / 2);
    const at = (c, r) => (rows[r] || '')[c] || '.';
    const straight = new Map(); rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') straight.set((i - ax) + ',' + (j - ay), ch); }));
    const diag = new Map(), Rr = rows.length + rows[0].length, c45 = Math.SQRT1_2;
    for (let dy = -Rr; dy <= Rr; dy++) for (let dx = -Rr; dx <= Rr; dx++) {
      const cnt = {}; let fill = 0;
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
        const px = dx + (sx + .5) / 4 - .5, py = dy + (sy + .5) / 4 - .5;
        const ch = at(Math.round(ax + px * c45 + py * c45), Math.round(ay - px * c45 + py * c45));   // undo a clockwise 45-degree turn
        if (ch !== '.') { fill++; cnt[ch] = (cnt[ch] || 0) + 1; } }
      if (fill >= 8) diag.set(dx + ',' + dy, (cnt.k || 0) >= 4 ? 'k' : 'S');
    }
    return PICS[key] = { straight, diag };
  };
  const PIC_TONE = { S: 1, s: 2, k: 3 };

  // ------------------------------------------------------------------ the springs and the demo plan
  const spring = (x, k, c) => ({ x, v: 0, k, c });
  const step = (s, target, dt) => { s.v += (s.k * (target - s.x) - s.c * s.v) * dt; s.x += s.v * dt; };
  const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let plans = {};                                    // [chronicle] only the current loop's plan is kept (the demo kept every loop forever)
  const plan = n => plans[n] || ((plans = {})[n] = (() => {    // per loop: blinks, weight shifts, the sentence
    const r = rng(n * 7919 + 17);
    const blinks = [0.8 + r() * 1.4, 2.6 + r() * 0.3, 4.4 + r() * 1.0, 6.4 + r() * 0.5, 8.4 + r() * 0.4, 11.4 + r() * 0.3];
    const shifts = [[0, -.04 + r() * .03], [1.3 + r() * .9, .05 + r() * .04], [5.0 + r() * .6, -.03 + r() * .04], [8.9 + r() * .3, .06 + r() * .03], [11.3 + r() * .4, -.05 + r() * .02]];
    const syl = [], words = []; let t = 3.1, last = -1;
    while (t < 5.75) {
      const nn = 1 + Math.floor(r() * 3); words.push(t);
      for (let k = 0; k < nn; k++) { let sh; do sh = Math.floor(r() * VISEMES.length); while (sh === last);
        const d = .08 + r() * .08; syl.push([t, t + d, sh]); t += d; last = sh; }
      t += .1 + r() * .14; last = -1;
    }
    return { blinks, shifts, syl, words };
  })());
  // the demo's acts: which arm does which gesture, when (data, rule 7)
  const ACTS = [];                                   // [chronicle] the demo's talk and wave acts removed: in the narrator's seat her arms rest
  const inside = (t, a, b) => t >= a && t < b;
  const smooth = (a, b, t) => { const u = clamp((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };

  // ------------------------------------------------------------------ two-bone reach (rule 7): the elbow always takes the side away from the body
  const J = HOST.joints, LM = HOST.limbs, LU = LM.upper[2] * HU, LF = LM.fore[2] * HU;
  const ik2 = (l1, l2, tx, ty) => {                   // in the limb's own frame: x outward, y down; returns [upper, lower, elbow x, elbow y]
    const d = clamp(Math.hypot(tx, ty), Math.abs(l1 - l2) + .01, l1 + l2 - .01), th = Math.atan2(ty, tx);
    const al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const sol = [th + al, th - al].map(a1 => { const ex = l1 * Math.cos(a1), ey = l1 * Math.sin(a1); return [a1, Math.atan2(ty - ey, tx - ex), ex, ey]; });
    const pick = Math.abs(sol[0][2] - sol[1][2]) < .5 ? (sol[0][3] > sol[1][3] ? 0 : 1) : (sol[0][2] > sol[1][2] ? 0 : 1);
    return sol[pick]; };
  const reach = (tx, ty) => ik2(LU, LF, tx, ty);
  const SIDE = { L: -1, R: 1 };
  const toScreen = (a, s) => s > 0 ? a : Math.PI - a;  // an angle in the arm's frame -> on screen (mirrored for the left arm)
  const unwrap = (a, ref) => { while (a - ref > Math.PI) a -= 2 * Math.PI; while (a - ref < -Math.PI) a += 2 * Math.PI; return a; };
  const D2R = Math.PI / 180;

  // the arm's pose right now: the rest pose, or the gesture key in force
  const armPose = (arm, tau, p) => {
    let pose = HOST.rest[arm], extra = 0, at = pose.at, dir = pose.dir;
    for (const a of ACTS) if (a.arm === arm) {
      const g = GESTURES[a.g], rel = tau - a.from;
      if (rel < (g.keys[0].t) || tau >= a.to) continue;
      for (const k of g.keys) if (rel >= k.t) pose = k;
      at = pose.at; dir = pose.dir;
      if (g.beat) { let on = 0; for (const w of p.words) if (inside(tau, w, w + .22)) on = 1;
        if (on) { at = add2(at, g.beat.at); dir += g.beat.dir; } }
      if (g.osc && inside(rel, g.osc.from, g.osc.to)) extra = g.osc.amp * D2R * Math.sin(2 * Math.PI * g.osc.hz * (rel - g.osc.from)) * smooth(g.osc.from, g.osc.from + .2, rel);
    }
    return { at, dir, hand: pose.hand, extra };
  };
  const armTargets = (arm, pose) => {
    const [a1, a2] = reach(pose.at[0] * HU, pose.at[1] * HU), s = SIDE[arm];
    return { a1: toScreen(a1, s), r2: toScreen(a2, s) - toScreen(a1, s) + pose.extra * -s, hd: toScreen(pose.dir * D2R, s) - toScreen(a2, s) };
  };

  // ------------------------------------------------------------------ the simulation (fixed step; motion flows one way, rule 8)
  const HR = HOST.hair;
  const S = {
    t: 0, phase: 0, tapAt: -99,
    sway: spring(0, 7, 4.2), chest: spring(0, 12, 4.6), jolt: spring(0, 140, 9), hem: spring(0, 26, 3),
    hx: spring(0, 60, 11), hy: spring(0, 60, 11), hvPrev: 0, headX: 0, headY: 0, hipX: 0, chestX: 0, lift: 0,
    arms: {}, hands: {}, chains: HR.chains.map(() => ({ s: [0, 0, 0], v: [0, 0, 0] })),
  };
  for (const arm of ['L', 'R']) { const tg = armTargets(arm, { ...HOST.rest[arm], extra: 0 });
    S.arms[arm] = { a1: spring(tg.a1, 46, 9.5), a2: spring(tg.a1 + tg.r2, 150, 17), a3: spring(tg.a1 + tg.r2 + tg.hd, 260, 14) };
    S.hands[arm] = HOST.rest[arm].hand; }
  const breath = () => (1 - Math.cos(S.phase)) / 2;
  const hold = (cur, target) => Math.abs(target - cur) > .62 ? Math.round(target) : cur;   // whole pixels, with a little stickiness

  const advance = dt => {
    const T = S.t, n = Math.floor(T / LOOP), tau = T - n * LOOP, p = plan(n), prevTau = tau - dt;
    const talking = TALK.on, waving = false, happy = false;   // [chronicle] was the demo's 12-second script
    // 1. the body: breath, the weight shift, the laugh's pops
    S.phase += dt * 2 * Math.PI * (0.26 + 0.05 * Math.sin(T * 0.37) + (talking ? 0.05 : 0));
    let sw = 0; for (const [t0, v] of p.shifts) if (tau >= t0) sw = v * HU;
    step(S.sway, sw, dt); step(S.chest, sw * 1.25 + (talking ? 0.5 * Math.sin(T * 2.1) : 0), dt);
    for (const tk of [9.12, 9.42, 9.74, 10.1]) if (prevTau < tk && tau >= tk) S.jolt.v += 9;
    step(S.jolt, happy ? 0.4 : 0, dt);
    const tp = T - S.tapAt, tapNow = tp >= 0 && tp < dt * 1.5;
    if (tapNow) { S.jolt.v += 18; S.hy.v -= 7; S.hx.v += 8; S.hem.v += 28; S.sway.v -= 6; }
    S.hipX = hold(S.hipX, S.sway.x); S.chestX = hold(S.chestX, S.chest.x); S.lift = hold(S.lift, breath() * .75 + S.jolt.x);
    // 2. the head: follows the chest, nods on words, leans into the laugh, looks toward the wave
    let hxT = S.chest.x * .9, hyT = 0;
    if (talking && TALK.nod) hyT += 1.2;                // [chronicle] a nod on the stage's words; the demo's scripted lean is gone
    if (happy) { hyT += .3; hxT += 1; }
    if (waving) hxT += .8;                                   // the head leans away from the raised arm, so the hand stays clear of the face
    step(S.hx, hxT, dt); step(S.hy, hyT, dt);
    const tx = S.chest.x + clamp(S.hx.x - S.chest.x, -1.6, 1.6), ty = clamp(S.hy.x, -1, 1.4) - (breath() * .75 + S.jolt.x);
    S.headX = hold(S.headX, tx); S.headY = hold(S.headY, ty);
    // 3. the limbs: each arm reaches for its pose's target; springs on the angles give the follow-through
    for (const arm of ['L', 'R']) {
      const pose = armPose(arm, tau, p), tg = armTargets(arm, pose), A = S.arms[arm];
      if (tapNow) { A.a1.v += 5 * -SIDE[arm]; A.a2.v += 7 * -SIDE[arm]; A.a3.v -= 14 * -SIDE[arm]; }
      step(A.a1, unwrap(tg.a1, A.a1.x), dt);
      step(A.a2, unwrap(A.a1.x + tg.r2, A.a2.x), dt);
      step(A.a3, unwrap(A.a2.x + tg.hd, A.a3.x), dt);
      A.a3.x = A.a2.x + clamp(A.a3.x - A.a2.x, -.9, .9);       // a wrist only bends so far
      S.hands[arm] = pose.hand;
    }
    // 4. cloth and hair: the hem trails the hips; each hair chain is pushed only by the head moving
    step(S.hem, S.sway.x, dt);
    const hv = S.hx.v, dv = hv - S.hvPrev; S.hvPrev = hv;
    HR.chains.forEach((c, ci) => { const ch = S.chains[ci]; let kick = -dv * c.gain;
      for (let k = 0; k < 3; k++) { const v0 = ch.v[k];
        ch.v[k] += (-c.k * ch.s[k] - c.c * ch.v[k]) * dt + kick; ch.s[k] = clamp(ch.s[k] + ch.v[k] * dt, -1.6, 1.6);
        kick = (ch.v[k] - v0) * c.pass; } });
    S.t += dt;
  };
  // a chain's sideways push at head-space row y: straight lines between its three links
  const chainD = (ci, y) => { const c = HR.chains[ci], s = S.chains[ci].s, u = (y - c.pivot) / c.len;
    if (u <= 0) return 0; const k = Math.min(2, Math.floor(u)), f = Math.min(1, u - k);
    let d = 0; for (let q = 0; q < k; q++) d += s[q]; return d + s[k] * f; };

  // ------------------------------------------------------------------ the face right now: seven numbers (rule 7: expressions are data)
  const faceNow = () => {
    const T = S.t, n = Math.floor(T / LOOP), tau = T - n * LOOP, p = plan(n);
    const E = Object.assign({}, EXPR.rest), set = o => Object.assign(E, o);
    if (TALK.on && TALK.viseme >= 0) set({ mouthOpen: VISEMES[TALK.viseme][0], mouthForm: VISEMES[TALK.viseme][1] });   // [chronicle] her own visemes, chosen by the stage
    for (const b of p.blinks) { const d = tau - b; if (d >= 0 && d < .16) E.eyeOpen = d < .035 || d > .12 ? .5 : 0; }
    const tp = T - S.tapAt;
    if (tp >= 0 && tp < .5) set(EXPR.surprised), E.gaze = 0, E.eyeSmile = 0;
    else if (tp >= .5 && tp < 1.6) { set(EXPR.happy); E.gaze = 0; if (Math.floor((tp - .5) * 7.5) % 2) E.mouthOpen = .75; }
    return E;
  };
  // the stamps those numbers choose
  const FD = HOST.face;
  const pickEyes = E => E.eyeSmile > .5 ? (FD.happyEyes || ['happy', 'happy'])
    : Array(2).fill(E.eyeOpen < .2 ? 'shut' : E.eyeOpen < .7 ? 'half' : E.eyeOpen > 1.25 ? 'wide' : 'open');
  const pickMouth = E => {
    const o = E.mouthOpen, f = E.mouthForm;
    if (o < .15) return f > .7 ? 'smile' : f > .2 ? 'rest' : 'flat';
    if (f < -.5) return 'o';
    if (o < .45) return 'small';
    if (f > .9 && o > .8) return 'laugh';
    if (f > .6) return 'e';
    return o < .75 ? 'mid' : 'wide'; };
  const pickBlush = E => E.blush < .25 ? null : E.blush < .75 ? 'soft' : 'full';

  // ------------------------------------------------------------------ the parts, rebuilt every frame on the moving skeleton
  // Each part: z (the ladder, BASE-SPEC), sdf, ramp, group (pieces of one group draw no line
  // between them, rule 1), and options: seam (draw a line inside the group on purpose), joint
  // (inside a limb's group, a line still shows where one piece folds over another, away from the
  // joint they share), shade (a custom tone picker), face (stamps land here), cast (shadow below).
  let L = [];
  const add = (z, sdf, ramp, o = {}) => { const p = Object.assign({ z, sdf, ramp, th: 3, line: true }, o); L.push(p); return p; };
  const mirrorPts = pts => pts.map(([x, y, h]) => [-x, y, h]).reverse();
  const FACEP = HOST.head.face, faceHW = prof(FACEP), CHIN = HOST.head.chin;
  const DOME = HR.dome, domeHW = y => DOME[2] * Math.sqrt(Math.max(0, 1 - ((y - DOME[1]) / DOME[3]) ** 2));
  const inDome = (x, y) => ((x - DOME[0]) / DOME[2]) ** 2 + ((y - DOME[1]) / DOME[3]) ** 2 < 1;
  const curtainOut = prof(HR.outer), curtainIn = prof(HR.inner), curtainEnd = Math.max(...HR.tips.map(p => p[1]));
  // Lock ends are POINTED by default: the curtain's lower edge runs from the valley at its inner edge
  // down to each tip and back up to the valley, ending at the valley on the outer edge, so even the
  // outermost lock ends in a point (square blocks read as cut-off; sharp tips read as hair, our 8 Oct
  // test). `round: 1` eases each run instead, for a curl or a bun.
  const VAL = HR.valley ?? Math.min(...HR.tips.map(p => p[1])) - 4;
  const tipPts = [[curtainIn(VAL), VAL]];
  HR.tips.forEach((tp, k) => { if (k) tipPts.push([(HR.tips[k - 1][0] + tp[0]) / 2, VAL]); tipPts.push(tp); });
  tipPts.push([curtainOut(VAL), VAL]);
  const tipsLin = prof(tipPts.map(([x, y]) => [x, y]));
  const tipsY = HR.round ? ax => { for (let k = 1; k < tipPts.length; k++) if (ax <= tipPts[k][0]) {
      const [x0, y0] = tipPts[k - 1], [x1, y1] = tipPts[k], u = clamp((ax - x0) / (x1 - x0), 0, 1);
      return y0 < y1 ? lerp(y0, y1, Math.sin(u * Math.PI / 2)) : lerp(y0, y1, 1 - Math.cos(u * Math.PI / 2)); } return VAL; } : tipsLin;
  // The outline is broken into locks: down the sides the hair's outer edge steps in and swells back
  // out every few rows, so each lock ends in a point on the silhouette instead of one smooth bell.
  const NT = HR.notch ?? { from: DOME[1] - 4, to: curtainEnd - 4, every: 5.5, depth: 1.6 };
  const notchAt = y => y < NT.from || y >= NT.to ? 0 : NT.depth * (1 - ((y - NT.from) / NT.every) % 1);
  const outerW = y => (y < DOME[1] ? domeHW(y) : curtainOut(y)) - notchAt(y);
  const FB = HR.fringe, FW = FB[FB.length - 1][0], fringeBot = prof(FB);
  const NOTCH = FB.filter((p, k) => k % 2 === 0 && k > 0 && k < FB.length - 1);
  const SHINE = new Set((HR.shine || []).map(([x, y]) => x + ',' + y));
  const gradAt = (x, y, i, j) => { let r = R.hair; const zig = Math.abs(((x + 40) % 5) - 2.5) * 1.4;   // the colour climbs each lock in a point
    for (const [gy, k] of HR.grad || []) { const d = y - gy - zig; if (d > 1 || (d > 0 && ((i + j) & 1))) r = R[k]; } return r; };

  const build = () => {
    L = [];
    const hipX = S.hipX, chestX = S.chestX, lift = S.lift;
    const HIPY = (J.hipL[1] + J.hipR[1]) / 2, SHY = (J.shL[1] + J.shR[1]) / 2;
    // the body warp: shoulders carry the breath and the chest shift, hips the weight shift (whole pixels)
    const BW = (x, y) => {
      const w = clamp((HIPY - .4 - y) / (HIPY - .4 - SHY), 0, 1);
      const sx = hipX + (chestX - hipX) * clamp((HIPY + .1 - y) / (HIPY - SHY + .3), 0, 1);
      return [CX + x * HU + Math.round(sx), TOP + y * HU - Math.round(lift * w)]; };
    const hemD = clamp(Math.round(S.hem.x - S.sway.x), -2, 2);           // a hem swings, it never flaps
    const BP = ([x, y, h]) => h ? add2(BW(x, y), [hemD, -Math.abs(hemD) * .2]) : BW(x, y);
    const HX = CX + S.headX, HY = TOP + S.headY;             // head space origin
    const headPart = (z, test, ramp, o) => { const bb = [HX - 26, HY - 8, HX + 26, HY + 46];
      return add(z, (x, y) => test(x - HX, y - HY) ? -1 : 1, ramp, Object.assign({ bb, flat: 1 }, o, o.shade ? { shade: (x, y, i, j) => o.shade(x - HX, y - HY, i, j) } : {},
        o.rampAt ? { rampAt: (x, y, i, j) => o.rampAt(x - HX, y - HY, i, j) } : {})); };

    // z 9: back hair (behind everything; swings a little less than the curtains)
    if (HR.back) { const [hw, y0, y1] = HR.back;
      headPart(9, (x, y) => { x -= chainD(0, y) * .6; return Math.abs(x) < Math.min(hw, outerW(y)) && y > y0 && y < y1; }, R.hair,
        { group: 'hair', shade: () => 2, rampAt: gradAt }); }

    // z 15-20: legs reach from the hip to the planted ankle; boots and shoes over them
    const legs = {};
    for (const s of ['L', 'R']) {
      const hip = snp(BW(...J['hip' + s])), an = snp(P(...J['an' + s])), toe = snp(P(...J['toe' + s]));
      const l1 = HU * Math.hypot(J['kn' + s][0] - J['hip' + s][0], J['kn' + s][1] - J['hip' + s][1]) + .4;   // a hair longer, so a planted leg keeps a soft knee
      const l2 = HU * Math.hypot(J['an' + s][0] - J['kn' + s][0], J['an' + s][1] - J['kn' + s][1]);
      const [, , ex, ey] = ik2(l1, l2, SIDE[s] * (an[0] - hip[0]), an[1] - hip[1]);   // the knee takes the outward side
      const kn = snp([hip[0] + SIDE[s] * ex, hip[1] + ey]);
      legs[s] = { hip, kn, an, toe };
      add(15, tube(kn, an, LM.shin[0] * HU, LM.shin[1] * HU), R.skin, { group: 'leg' + s, joint: kn, jr: 3, th: 2.5, bb: bbPts([kn, an], 4) });
      add(15, tube(hip, kn, LM.thigh[0] * HU, LM.thigh[1] * HU), R.skin, { group: 'leg' + s, joint: kn, jr: 3, th: 3, bb: bbPts([hip, kn], 4) });
    }
    // z 25: the body under the clothes
    add(25, poly(HOST.torso.map(BP), 1), R.skin, { group: 'body', bb: bbPts(HOST.torso.map(BP), 3) });
    // z 30-60: garments. One garment = one group; its limb pieces get the limb's name too, so a
    // sleeve still draws a line where it crosses the garment's own body piece.
    const limbParts = [];
    for (const g of HOST.garments) for (const pc of g.pieces) {
      const ramp = R[g.mats[pc.area || 0]], grp = g.name;
      if (pc.on === 'torso' || pc.on === 'hip') for (const pts of pc.mirror ? [pc.pts, mirrorPts(pc.pts)] : [pc.pts]) {
        const q = pts.map(BP); add(g.z, poly(q, pc.rr ?? 1), ramp, { group: grp, cast: 1, bb: bbPts(q, 3) }); }
      else if (pc.on === 'shin') for (const s of ['L', 'R']) { const { kn, an } = legs[s], a = lerp2(kn, an, pc.from), b = lerp2(kn, an, pc.to);
        add(g.z, tube(a, b, pc.r[0] * HU, pc.r[1] * HU), ramp, { group: grp + s, th: 2.5, bb: bbPts([a, b], 4) }); }
      else if (pc.on === 'foot') for (const s of ['L', 'R']) {
        // seen from the front a shoe is a rounded top on a flat bottom; the sole runs the shoe's full width
        const { an, toe } = legs[s], a = [an[0], an[1] - 1], r1 = pc.r[1] * HU;
        const x0 = Math.min(a[0], toe[0]) - r1 * .9, x1 = Math.max(a[0], toe[0]) + r1 * .9, y0 = toe[1] - 1.5;
        const shoe = (x, y) => Math.max(Math.min(tube(a, toe, pc.r[0] * HU, r1)(x, y), poly([[x0, y0], [x1, y0], [x1, SOLE], [x0, SOLE]], 0)(x, y)), y - SOLE);
        add(g.z + 1, shoe, ramp, { group: grp + s, th: 2, bb: bbPts([a, toe], 5) });
        if (g.mats[1]) add(g.z + 1, (x, y) => Math.max(shoe(x, y) - .3, SOLE - 1 - y), R[g.mats[1]], { group: grp + s, flat: 1, keep: 1, bb: bbPts([a, toe], 6) }); }
      else limbParts.push({ g, pc, ramp });
    }
    // z 80: the neck, long enough that a nod never opens a gap
    const nk0 = snp([HX, HY + J.neckTop[1] * HU]), nk1 = snp(BW(...J.neckBot));
    add(80, tube(nk0, nk1, LM.neck[0] * HU, LM.neck[1] * HU), R.skin, { group: 'neck', cast: 1, bb: bbPts([nk0, nk1], 4) });
    // z 100: the head (Face first's width-per-row face)
    const hairOver = (x, y) => (x > -FW && x < FW && y < fringeBot(x) && inDome(x, y));
    headPart(100, (x, y) => y > 1 && y < CHIN && Math.abs(x) < faceHW(y), R.skin,
      { group: 'head', face: 1, cast: 1, shade: (x, y) => hairOver(x - 1, y - 1.5) ? 2 : 1 });
    // z 120: front hair: the dome and two curtains with pointed tips, the fringe, the extra locks
    const inCurtain = (x0, y) => { const x = x0 - chainD(0, y), ax = Math.abs(x);
      if (y < DOME[1]) return ax > curtainIn(y) && ax < outerW(y) && y > 3;
      return y < curtainEnd && ax > curtainIn(y) && ax < outerW(y) && y < tipsY(ax); };
    const hairTone = (x, y) => { if (SHINE.has(Math.floor(x) + ',' + Math.floor(y))) return 0;
      const xs = x - chainD(0, y);
      if (y > 8 && (Math.abs(xs) > outerW(y) - 2.6 || Math.abs(xs) < curtainIn(y) + 1.6)) return 2;   // the band away from the light, and next to the face
      return 1; };
    headPart(120, (x, y) => (inDome(x, y) && y < HR.top) || inCurtain(x, y), R.hair,
      { group: 'hair', seam: 1, seamBelow: 5, shade: hairTone, rampAt: gradAt });
    headPart(121, (x, y) => inDome(x, y) && Math.abs(x) < FW && y < fringeBot(x), R.hair,
      { group: 'hair', seam: 1, seamBelow: 5, rampAt: gradAt, shade: (x, y) => {
        if (SHINE.has(Math.floor(x) + ',' + Math.floor(y))) return 0;
        if (NOTCH.some(([nx, ny]) => segD(x, y, nx, ny, nx - 1.2, ny - 3.2) < .5)) return 2;   // the seam up from each notch
        return fringeBot(x) - y < 1.6 ? 2 : 1; } });
    for (const lk of HR.locks || []) { const T = lk.tube;
      headPart(122, (x, y) => tube([T[0], T[1]], [T[2], T[3]], T[4], T[5])(x - chainD(lk.chain, y), y) < 0, R.hair,
        { group: 'hair', seam: 1, rampAt: gradAt, shade: (x, y) => x - chainD(lk.chain, y) > (T[0] + T[2]) / 2 + .6 ? 2 : 1 }); }

    // z 140 (front) or 10 (back): arms. Upper arm and forearm under ONE sleeve; the hand picture last, over the wrist.
    for (const arm of ['L', 'R']) {
      const A = S.arms[arm], z = HOST.rest[arm].z || 140;
      // the shoulder lifts (and slides out a little) as the upper arm rises above level, so a raised
      // hand clears the side of the head; whole pixels, driven by the arm's own spring, so it never pops
      const raise = clamp((-Math.sin(A.a1.x) + .15) / .85, 0, 1);
      const sh = snp(add2(BW(...J['sh' + arm]), [SIDE[arm] * raise * SHRUG.out * HU, -raise * SHRUG.up * HU]));
      const el = snp(add2(sh, [LU * Math.cos(A.a1.x), LU * Math.sin(A.a1.x)]));
      const wr = snp(add2(el, [LF * Math.cos(A.a2.x), LF * Math.sin(A.a2.x)]));
      const grp = 'arm' + arm, jo = { joint: el, jr: 3.2 };
      add(z, tube(sh, el, LM.upper[0] * HU, LM.upper[1] * HU), R.skin, Object.assign({ group: grp, limb: arm, th: 2.5, bb: bbPts([sh, el], 4) }, jo));
      add(z, tube(el, wr, LM.fore[0] * HU, LM.fore[1] * HU), R.skin, Object.assign({ group: grp, limb: arm, th: 2, bb: bbPts([el, wr], 4) }, jo));
      for (const { g, pc, ramp } of limbParts) { const [a, b] = pc.on === 'upper' ? [sh, el] : [el, wr];
        const p0 = lerp2(a, b, pc.from), p1 = lerp2(a, b, pc.to);
        add(z + .1, tube(p0, p1, pc.r[0] * HU, pc.r[1] * HU), ramp, Object.assign({ group: g.name + arm, limb: arm, th: 3, cast: 1, bb: bbPts([p0, p1], 5) }, jo)); }
      handPart(z + .2, wr, A.a3.x, S.hands[arm], SIDE[arm], grp);
    }
  };
  // the hand: its picture turns in 8 steps around the wrist (the angle snaps, so its pixels never shimmer)
  const handPart = (z, wr, a, name, side, grp) => {
    const st = ((Math.round(a / (Math.PI / 4)) + 2) % 8 + 8) % 8;      // 45-degree steps from "fingers up"
    const an = (st - 2) * Math.PI / 4, vx = -Math.sin(an), vy = Math.cos(an);
    const flip = (vx * -side + vy * -.35) < 0;                         // the thumb takes the side toward the body
    const P = picOf(HAND, name), cells = st & 1 ? P.diag : P.straight, turns = st >> 1;
    const wi = Math.floor(wr[0]), wj = Math.floor(wr[1]);
    const look = (x, y) => { let dx = Math.floor(x) - wi, dy = Math.floor(y) - wj;
      for (let r = 0; r < turns; r++) [dx, dy] = [dy, -dx];              // undo the quarter turns
      if (flip) [dx, dy] = st & 1 ? [-dy, -dx] : [-dx, dy];              // undo the mirror (across the hand's own axis)
      return cells.get(dx + ',' + dy); };
    const r = HAND * 1.6;
    add(z, (x, y) => look(x, y) ? -1 : 1, R.skin, { keep: 1, limb: side < 0 ? 'L' : 'R', group: grp, joint: wr, jr: HAND * .45, bb: [wr[0] - r, wr[1] - r, wr[0] + r, wr[1] + r],
      shade: (x, y) => PIC_TONE[look(x, y)] || 1 });
  };
  // ?hands: every hand picture at all 8 turns, the figure's right hand above its mirror (a test sheet, not a frame)
  const HANDVIEW = Q.has('hands');
  const buildHands = () => { L = []; const names = Object.keys(HANDPICS[9]), cell = Math.ceil(HAND * 2.4);
    names.forEach((nm, r) => [-1, 1].forEach((side, m) => { for (let k = 0; k < 8; k++) {
      const wr = [Math.round(4 + (k + .5) * cell), Math.round(4 + ((r * 2 + m) + .5) * cell)];
      handPart(140, wr, k * Math.PI / 4, nm, side, 'h' + r + m + k); } })); };

  // ------------------------------------------------------------------ buffers
  const N = W * H, PID = new Int16Array(N), PID0 = new Int16Array(N), SH = new Uint8Array(N), RP = new Array(N), OUT = new Uint8ClampedArray(N * 4);
  const FIG0 = 2;                                     // ids 0 and 1 are the wall and the floor
  const nb = (i, j) => (i < 0 || j < 0 || i >= W || j >= H) ? -1 : PID[j * W + i];
  const nb0 = (i, j) => (i < 0 || j < 0 || i >= W || j >= H) ? -1 : PID0[j * W + i];
  const put = (i, j, c) => { if (i < 0 || j < 0 || i >= W || j >= H) return; const o = (j * W + i) * 4; OUT[o] = c[0]; OUT[o + 1] = c[1]; OUT[o + 2] = c[2]; OUT[o + 3] = 255; };
  const LD = [-.6, -.8];                              // light from the upper left

  const stamp = (rows, i0, j0, mirror, ok) => rows.forEach((r, dj) => [...r].forEach((ch, di) => {
    const c = FC[ch]; if (!c) return;
    const i = mirror ? i0 + r.length - 1 - di : i0 + di, jj = j0 + dj, q = nb(i, jj);
    if (q >= FIG0 && ok(L[q - FIG0])) put(i, jj, c); }));

  let flagged = [];
  const paint = () => {
    if (HANDVIEW) buildHands(); else build();
    L.forEach((p, k) => p.k = k); L.sort((a, b) => a.z - b.z || a.k - b.k);
    // pass 1: the owner of each pixel is the frontmost part that holds it
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = i + .5, y = j + .5; let top = y >= FLOORY ? 1 : 0;
      for (let p = L.length - 1; p >= 0; p--) { const q = L[p], b = q.bb;
        if (b && (x < b[0] || x > b[2] || y < b[1] || y > b[3])) continue;
        if (q.sdf(x, y) < 0) { top = p + FIG0; break; } }
      PID[j * W + i] = top;
    }
    // clean: a pixel with at most one neighbour of its own part joins the part around it. Each pass reads
    // a copy of the frame: cleaning in place let a 1-px strip (a shoe's sole) erode away along the sweep.
    for (let pass = 0; pass < 2; pass++) { PID0.set(PID); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, me = PID0[k], n4 = [nb0(i - 1, j), nb0(i + 1, j), nb0(i, j - 1), nb0(i, j + 1)];
      if (n4.includes(-1) || (me >= FIG0 && L[me - FIG0].keep)) continue;   // hand pictures keep every pixel they were drawn with
      const same = n4.filter(v => v === me).length;
      if (same <= 1) { const cnt = {}; let best = -1, bc = 0;
        for (const v of n4) if (v !== me) { cnt[v] = (cnt[v] || 0) + 1; if (cnt[v] > bc) { bc = cnt[v]; best = v; } }
        if (best >= 0 && bc >= 3 - same) PID[k] = best; }
      if (PID[k] < FIG0) { const f = n4.filter(v => v >= FIG0); if (f.length >= 3 && !L[Math.max(...f) - FIG0].keep) PID[k] = Math.max(...f); }
    } }
    // pass 2: tones. Cloth and skin: flat base, one shadow step on the side away from the light (and under a part that casts).
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, id = PID[k], x = i + .5, y = j + .5;
      if (id < FIG0) {
        RP[k] = id ? R.floor : R.wall;
        if (id === 0) SH[k] = 1;
        else { const [rx, ry] = [.6 * HU, .13 * HU]; SH[k] = Math.hypot((x - CX - S.sway.x * .5) / rx, (y - SOLE + .3) / ry) < 1 ? 2 : 1; }
        continue; }
      const p = L[id - FIG0]; let s;
      RP[k] = p.rampAt ? p.rampAt(x, y, i, j) : p.ramp;
      if (p.shade) s = p.shade(x, y, i, j);
      else if (p.flat !== undefined) s = p.flat;
      else { const e = .5, sd = p.sdf(x, y), gx = p.sdf(x + e, y) - p.sdf(x - e, y), gy = p.sdf(x, y + e) - p.sdf(x, y - e), gl = Math.hypot(gx, gy) || 1;
        const b = ((gx * LD[0] + gy * LD[1]) / gl) * (1 - clamp(-sd / p.th, 0, 1)); s = b < -.22 ? 2 : 1; }
      const up = nb(i, j - 1);
      if (up > id && up >= FIG0 && L[up - FIG0].cast && L[up - FIG0].group !== p.group && !p.face) s = 2;
      // a limb in front darkens the body right beside it, so an arm reads even on a jacket of its own colour (rule 6)
      for (const q of [nb(i - 2, j), nb(i + 2, j), nb(i - 1, j), nb(i + 1, j)]) if (q > id && q >= FIG0 && L[q - FIG0].limb && L[q - FIG0].limb !== p.limb && !p.face) s = Math.max(s, 2);
      if (p.limb && !p.keep) for (const q of [nb(i - 1, j), nb(i + 1, j)]) if (q >= FIG0 && q < id && L[q - FIG0].limb !== p.limb) s = Math.min(s, 1);   // ...and the limb's own edge there stays lit
      SH[k] = s;
    }
    // pass 3: colour and lines (rule 4)
    flagged = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, a = PID[k];
      let c = RP[k][SH[k]], best = -1;
      for (const q of [nb(i - 1, j), nb(i + 1, j), nb(i, j - 1), nb(i, j + 1)]) if (q > a && q > best && q >= FIG0 && L[q - FIG0].line) best = q;
      if (a >= FIG0 && best >= FIG0) {
        const A = L[a - FIG0], B = L[best - FIG0], x = i + .5, y = j + .5;
        const bRamp = RP[nb(i - 1, j) === best ? k - 1 : nb(i + 1, j) === best ? k + 1 : nb(i, j - 1) === best ? k - W : k + W];
        if (A.group !== B.group) c = bRamp[3];                              // inside line: the front part's darker shade
        else if (B.seam && y - (S.headY + TOP) >= (B.seamBelow ?? -99)) c = bRamp[2];   // a seam declared on purpose
        else if (B.joint && Math.hypot(x - B.joint[0], y - B.joint[1]) > B.jr) c = bRamp[2];   // a limb folded over itself
        const bk = nb(i - 1, j) === best ? k - 1 : nb(i + 1, j) === best ? k + 1 : nb(i, j - 1) === best ? k - W : k + W;
        if (CHECK && A.group !== B.group && Math.abs(lum(RP[k][SH[k]]) - lum(RP[bk][SH[bk]])) < .05) flagged.push(k);   // the tones the eye actually sees, either side of the line
      }
      if (a < FIG0) {                                                         // the outer edge
        let front = -1, fk = -1;
        for (const [q, kk] of [[nb(i - 1, j), k - 1], [nb(i + 1, j), k + 1], [nb(i, j - 1), k - W], [nb(i, j + 1), k + W]]) if (q >= FIG0 && q > front) { front = q; fk = kk; }
        if (front >= FIG0) c = INK_OWN ? RP[fk][3] : INK;                      // ?ink=own: the part's own darkest shade
      }
      if (SIL && a >= FIG0) c = INK;
      put(i, j, c);
      if (a < FIG0 && c !== INK) OUT[k * 4 + 3] = 0;                         // [chronicle] the wall is see-through: the stage's room shows behind her
    }
    for (let i = 0; i < W; i++) { const k = FLOORY * W + i; if (PID[k] < FIG0) put(i, FLOORY, R.floor[3]); }
    // pass 4: the face, stamped on whole pixels of the snapped head, only where the face is the owner
    if (!SIL && !HANDVIEW) {
      const E = faceNow(), onFace = p => p.face, eh = FD.eyes.open.length, ew = FD.eyes.open[0].length;
      const ci = CX + S.headX, ey = TOP + S.headY + FD.eyeY, g = Math.round(clamp(E.gaze, -1, 1));
      const [eL, eR] = pickEyes(E);
      for (const [nm, side] of [[eL, -1], [eR, 1]]) {
        const rows = FD.eyes[nm], w = rows[0].length, cw = (w - ew) >> 1, ch = (rows.length - eh) >> 1;
        const x0 = side < 0 ? ci - FD.eyeIn - ew - cw + g : ci + FD.eyeIn - cw + g, y0 = ey - ch;
        stamp(rows, x0, y0, side > 0, onFace);
        // the shine sits in the SAME corner of both eyes (a mirrored shine reads as a squint)
        if ((nm === 'open' || nm === 'wide') && FD.shine) stamp(['G'], x0 + FD.shine[0] + (nm === 'wide' ? 1 : 0), y0 + FD.shine[1] + (nm === 'wide' ? 1 : 0), false, onFace);
      }
      const bl = pickBlush(E);
      if (bl) { const rows = FD.blushes[bl], w = rows[0].length;
        stamp(rows, ci - FD.blush.x - w, TOP + S.headY + FD.blush.y, false, onFace);
        stamp(rows, ci + FD.blush.x, TOP + S.headY + FD.blush.y, true, onFace); }
      const mrows = FD.mouths[pickMouth(E)];
      stamp(mrows, ci - (mrows[0].length >> 1), TOP + S.headY + FD.mouthY, false, onFace);
    }
    // the brightness check (rule 6): grey by OKLab lightness, red where a layer sits too close to the one under it
    if (CHECK) {
      for (let k = 0; k < N; k++) { const o = k * 4, v = Math.round(255 * clamp(lum([OUT[o], OUT[o + 1], OUT[o + 2]]), 0, 1)); OUT[o] = OUT[o + 1] = OUT[o + 2] = v; }
      for (const k of flagged) { const o = k * 4; OUT[o] = 230; OUT[o + 1] = 30; OUT[o + 2] = 40; }
    }
  };

  // ------------------------------------------------------------------ run  [chronicle: replaces the demo's requestAnimationFrame loop and tap]
  // The stage calls frame() with its own clock (seconds). The springs step from the time since the last
  // call. A clock that jumps (a seek, a replay, a clip drawing the past, midnight) is never stepped
  // through: the simulation restarts its clock a quarter second before the new time and settles into it,
  // so springs carry on from where they were and nothing can fly off.
  const TALK = { on: false, viseme: -1, nod: false };
  let fresh = true;
  const frame = (t, talk) => {
    Object.assign(TALK, talk);
    if (fresh || t < S.t - 1e-6 || t - S.t > .25) { S.t = fresh ? t : t - .25; fresh = false; }
    while (S.t + DT <= t + 1e-9) advance(DT);
    paint();
    return OUT;
  };
  return { frame, W, H, CX };
}
