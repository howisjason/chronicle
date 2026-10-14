// room/scene.js: March's room, the morning picture, drawn by code into a 320x160
// buffer of palette indices and put on the canvas. Adopted from
// option B, the one J picked (all four options are kept as the record in the private
// march-brain repo, notes/room-scene-options/).
//
// What changed from that option (15 Oct 2026): the palette moved into the paper
// kit's family (parchment walls, olive, wood, gold as the one metal), so the picture
// sits in the paper page like a plate in a book; the one accent is March's pink hair.
// March is a puppet of parts (one head grid, one body grid, arms and legs drawn from
// joint points per pose) about 41 px tall, with a walk, an idle, a pose at each
// place and asleep in the futon. The judge's fixes: she always stands AT a place
// (PLACES[p].at), the desk got two big things on a dark cloth, the one-pixel
// details went (the dashed half-cloud, the sunbeam sparkles), the bottom-left box
// is now plainly a futon, and the wall is furnished edge to edge (a wainscot, a
// bigger board). Quill perches by the bench and hops to her when she checks a thing.
//
// export draw(ctx, t, state), PLACES, QUILL_BOX, FEET_Y, PALETTE.
// state: { awake, march: {x, y}, moving, place, checking, places }.
//   march.x is her centre line, march.y the row her feet stand on (FEET_Y).
//   moving: she is walking (the walk loop plays, phase taken from x).
//   place: where she is doing a thing (bench, shelf, desk, board, cloud); null
//   means she just stands (the idle). checking: Quill comes down beside her.
//   places: what is in each place today, so the picture grows with her work:
//   {shelf:{pages}, board:{cards}, cloud:{thoughts}, bench:{builds}, desk:{items}}.
//   Pages show as sheets on the shelf's third rack (12 at most), cards on the board
//   (6), puffs in the cloud (4; none is one small puff), things on the bench (3:
//   the gear, the dial box, the jar), and the desk's two things only when they exist.

const W = 320, H = 160;

// ---- palette: the paper kit's family. olive inks, wood and paper, parchment
// walls, green velvet, gold (the one metal), and the one accent, her pink hair ----
const HEX = {
  INK: '#23261b', SLATE: '#383c2b', DUSK: '#535640', STEEL: '#77795d', MIST: '#9fa283', HAZE: '#c7c9ae', FROST: '#e4e5d3',
  BARK: '#4a3a28', WOOD: '#6c5539', OAK: '#8f7350', TAN: '#b3966d', SAND: '#d2bb93', CREAM: '#e6d6b4', SHELL: '#f5eedc', SUN: '#fffbf0',
  PLAS: '#ebe2c9', PLASD: '#dccfae',
  LEAF: '#93a37c', GREEN: '#68785a', FOREST: '#3e5236',
  HONEY: '#d9b76c', GOLD: '#a98741', DGOLD: '#7d6129',
  PINK: '#ea8fb0', PINKD: '#b4587c',
  SKIN: '#f8dcc8', SKIND: '#e2b49c',
};
const NAMES = Object.keys(HEX);
const C = {}; NAMES.forEach((n, i) => (C[n] = i));
const RGB = NAMES.map(n => {
  const h = HEX[n];
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
});

// one step brighter (in the sun) and one step darker (in shade)
const LIT = {
  INK: 'SLATE', SLATE: 'DUSK', DUSK: 'STEEL', STEEL: 'MIST', MIST: 'HAZE', HAZE: 'FROST', FROST: 'SUN',
  BARK: 'WOOD', WOOD: 'OAK', OAK: 'TAN', TAN: 'SAND', SAND: 'CREAM', CREAM: 'SHELL', SHELL: 'SUN', SUN: 'SUN',
  PLAS: 'SHELL', PLASD: 'PLAS', LEAF: 'HAZE', GREEN: 'LEAF', FOREST: 'GREEN',
  HONEY: 'CREAM', GOLD: 'HONEY', DGOLD: 'GOLD', PINK: 'PINK', PINKD: 'PINK', SKIN: 'SHELL', SKIND: 'SKIN',
};
const DARK = {
  INK: 'INK', SLATE: 'INK', DUSK: 'SLATE', STEEL: 'DUSK', MIST: 'STEEL', HAZE: 'MIST', FROST: 'HAZE',
  BARK: 'INK', WOOD: 'BARK', OAK: 'WOOD', TAN: 'OAK', SAND: 'TAN', CREAM: 'SAND', SHELL: 'CREAM', SUN: 'SHELL',
  PLAS: 'PLASD', PLASD: 'SAND', LEAF: 'GREEN', GREEN: 'FOREST', FOREST: 'SLATE',
  HONEY: 'GOLD', GOLD: 'DGOLD', DGOLD: 'BARK', PINK: 'PINKD', PINKD: 'WOOD', SKIN: 'SKIND', SKIND: 'TAN',
};
const LITI = NAMES.map(n => C[LIT[n]]);
const DARKI = NAMES.map(n => C[DARK[n]]);

// ---- the five places: each one's box in this picture (the page opens that
// place's list on a click inside it) and `at`, the x where March stands to do it ----
export const PLACES = {
  shelf: { x: 4, y: 12, w: 56, h: 108, at: 50 },
  desk: { x: 66, y: 86, w: 84, h: 34, at: 136 },
  board: { x: 148, y: 28, w: 62, h: 62, at: 178 },
  cloud: { x: 200, y: 2, w: 100, h: 42, at: 216 },
  bench: { x: 222, y: 46, w: 98, h: 74, at: 244 },
};
export const FEET_Y = 122;                       // the row she walks along
const PERCH = { x: 302, y: 60 };                 // Quill's sprite corner on the perch
export const QUILL_BOX = { x: 298, y: 56, w: 22, h: 22 };
const FULL = { shelf: { pages: 6 }, board: { cards: 5 }, cloud: { thoughts: 3 }, bench: { builds: 3 }, desk: { items: 2 } };
const num = (v, cap) => Math.max(0, Math.min(cap, Math.floor(Number(v) || 0)));

// ---- the buffer and its brushes ----
const buf = new Uint8Array(W * H);
const px = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = c; };
const get = (x, y) => buf[y * W + x];
function rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, c); }
function hline(x, y, w, c) { rect(x, y, w, 1, c); }
function vline(x, y, h, c) { rect(x, y, 1, h, c); }
function disc(cx, cy, r, c) {
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.6) px(cx + i, cy + j, c);
}
function lightAt(x, y) { if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = LITI[buf[y * W + x]]; }
function darkAt(x, y) { if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = DARKI[buf[y * W + x]]; }
// checker seam between two flat bands (dither only at the seam)
function seam(x, y, w, c) { for (let i = x; i < x + w; i++) if ((i + y) % 2 === 0) px(i, y, c); }
function hash(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function sprite(rows, map, x0, y0, flip = false) {
  const w = rows[0].length;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      px(flip ? x0 + w - 1 - i : x0 + i, y0 + j, C[map[ch]]);
    }
  });
}

// ---- geometry of the light ----
const WIN = { x: 70, y: 8, w: 78, h: 76 };          // outer frame
const GLASS = { x: 74, y: 12, w: 70, h: 68 };       // glass
const FLOOR_Y = 118;
const PATCH_NEAR = 122, PATCH_FAR = 155;           // floor rows lit by the window
const SHIFT_NEAR = 30, SHIFT_FAR = 66;             // sun from the low left: patch slides right
const MUL_X = [97, 120], MUL_Y = [33, 56];         // mullions (2px)

// is floor pixel (x,y) lit through glass? returns 0 none, 1 rim, 2 core
function patchAt(x, y) {
  if (y < PATCH_NEAR - 1 || y > PATCH_FAR + 1) return 0;
  const v = (y - PATCH_NEAR) / (PATCH_FAR - PATCH_NEAR);            // 0 near wall .. 1 nearest viewer
  const wy = GLASS.y + GLASS.h - 1 - v * (GLASS.h - 1);            // window bottom -> top
  const wx = x - (SHIFT_NEAR + v * (SHIFT_FAR - SHIFT_NEAR));
  const inGlass = wx >= GLASS.x && wx < GLASS.x + GLASS.w && wy >= GLASS.y && wy < GLASS.y + GLASS.h;
  if (inGlass && y >= PATCH_NEAR && y <= PATCH_FAR) {
    const onMul = MUL_X.some(m => wx >= m && wx < m + 2) || MUL_Y.some(m => wy >= m - 0.5 && wy < m + 2.5);
    return onMul ? 1 : 2;
  }
  const near = wx >= GLASS.x - 3 && wx < GLASS.x + GLASS.w + 3 && wy >= GLASS.y - 4 && wy < GLASS.y + GLASS.h + 4;
  return near ? 1 : 0;
}

// the air shaft: hull of the glass and the floor patch
const HULL = [
  [GLASS.x + 4, GLASS.y + 2], [GLASS.x + GLASS.w - 2, GLASS.y + 2],
  [GLASS.x + GLASS.w + SHIFT_FAR - 6, PATCH_FAR], [GLASS.x + SHIFT_FAR + 8, PATCH_FAR],
  [GLASS.x + SHIFT_NEAR + 2, PATCH_NEAR], [GLASS.x + 4, GLASS.y + GLASS.h - 2],
];
function inPoly(x, y, P) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function shaftAt(x, y) {
  if (y >= PATCH_NEAR) return false;
  if (x >= GLASS.x - 4 && x < GLASS.x + GLASS.w + 4 && y < GLASS.y + GLASS.h + 6) return false; // the window itself
  if (!inPoly(x, y, HULL)) return false;
  if (x >= 70 && x < 148 && y > 101) return false;             // under the desk top: its own shadow
  return true;
}

// ---- the room ----
function drawWall() {
  rect(0, 0, W, FLOOR_Y, C.PLAS);
  // ceiling beam
  rect(0, 0, W, 3, C.WOOD); hline(0, 3, W, C.BARK);
  // soft shade under the beam and into the corners: flat band + checker seam
  rect(0, 4, W, 2, C.PLASD); seam(0, 6, W, C.PLASD);
  rect(0, 4, 3, FLOOR_Y - 4, C.PLASD);
  rect(W - 2, 4, 2, FLOOR_Y - 4, C.PLASD);
  // wainscot: a rail, then the lower wall a step darker, down to the skirting
  rect(0, 94, W, 2, C.OAK); hline(0, 94, W, C.TAN); hline(0, 96, W, C.SAND);
  rect(0, 97, W, FLOOR_Y - 4 - 97, C.PLASD);
  for (let x = 14; x < W; x += 34) { vline(x, 99, 13, C.SAND); vline(x + 1, 99, 13, C.SHELL); }
  // skirting board
  rect(0, FLOOR_Y - 4, W, 4, C.WOOD); hline(0, FLOOR_Y - 4, W, C.OAK); hline(0, FLOOR_Y - 1, W, C.BARK);
}

function drawFloor() {
  const rows = [FLOOR_Y, 123, 129, 136, 144, 153, H];
  for (let r = 0; r < rows.length - 1; r++) {
    const y0 = rows[r], y1 = rows[r + 1];
    rect(0, y0, W, y1 - y0, C.SAND);
    hline(0, y0, W, C.TAN);
    if (r === 0) hline(0, y0 + 1, W, C.TAN);
    // staggered plank ends
    let x = -Math.floor(hash(r, 77) * 60);
    while (x < W) { vline(x, y0 + 1, y1 - y0 - 1, C.TAN); x += 64 + r * 10 + Math.floor(hash(r, x) * 40); }
    // a few grain streaks, flat
    for (let k = 0; k < 3; k++) {
      const gx = Math.floor(hash(r, k) * W), gl = 6 + Math.floor(hash(k, r) * 10);
      const gy = y0 + 2 + Math.floor(hash(r + 9, k) * Math.max(1, y1 - y0 - 3));
      if (gy < y1) hline(gx, gy, gl, C.CREAM);
    }
  }
}

function drawRug() {
  const y0 = 137, y1 = 153;
  for (let y = y0; y <= y1; y++) {
    const k = (y - y0) / (y1 - y0);
    const xa = Math.round(158 - k * 8), xb = Math.round(250 + k * 8);
    for (let x = xa; x <= xb; x++) {
      const e = Math.min(x - xa, xb - x, (y - y0) * 3, (y1 - y) * 3);
      let c = C.GREEN;
      if (e < 3) c = C.LEAF;
      else if (e < 5) c = C.GREEN;
      else if (e < 7) c = C.FOREST;
      else if (Math.abs(y - (y0 + y1) / 2) < 1) c = C.LEAF;
      px(x, y, c);
    }
    if (y % 2 === 0) { px(xa - 1, y, C.HAZE); px(xb + 1, y, C.HAZE); }
  }
}

function drawWindow() {
  const { x, y, w, h } = WIN;
  // sky: flat bands, pale up top to warm cream at the horizon
  const g = GLASS;
  const bands = [[g.y, C.FROST], [g.y + 18, C.SHELL], [g.y + 40, C.CREAM], [g.y + 54, C.SAND]];
  for (let i = 0; i < bands.length; i++) {
    const [by, bc] = bands[i];
    const end = i + 1 < bands.length ? bands[i + 1][0] : g.y + g.h;
    rect(g.x, by, g.w, end - by, bc);
    if (i > 0) seam(g.x, by - 1, g.w, bc);
  }
  // the low sun, lower left, with one flat ring
  disc(92, 55, 9, C.SHELL);
  disc(92, 55, 6, C.SUN);
  // far hills (pale with distance) and nearer roofs
  for (let i = g.x; i < g.x + g.w; i++) {
    const hy = Math.round(70 + Math.sin(i * 0.07) * 2 + Math.sin(i * 0.19 + 1) * 1.5);
    for (let j = hy; j < g.y + g.h; j++) px(i, j, C.HAZE);
  }
  const houses = [[74, 76, 10], [83, 73, 12], [96, 77, 9], [104, 72, 14], [119, 76, 10]];
  for (const [hx, hy, hw] of houses) {
    const half = hw / 2;
    for (let j = hy - Math.ceil(half * 0.7); j < g.y + g.h; j++) for (let i = hx; i < hx + hw; i++) {
      const dx = Math.abs(i - (hx + half - 0.5));
      if (j >= hy || (hy - j) <= (half - dx) * 0.7) px(i, j, C.MIST);
    }
    rect(hx + 2, hy + 3, 2, 2, C.HAZE);
  }
  rect(108, 64, 2, 5, C.MIST);
  // an olive tree, nearer
  disc(136, 72, 6, C.GREEN); disc(130, 76, 4, C.GREEN); disc(141, 77, 4, C.GREEN); disc(134, 70, 3, C.LEAF);
  rect(135, 79, 2, 7, C.WOOD);
  // frame: painted wood, facing us
  rect(x, y, w, 4, C.TAN); rect(x, y + h - 4, w, 4, C.TAN);
  rect(x, y, 4, h, C.TAN); rect(x + w - 4, y, 4, h, C.TAN);
  hline(x, y, w, C.SAND); vline(x, y, h, C.SAND);
  hline(x + 3, y + 3, w - 6, C.OAK); vline(x + 3, y + 3, h - 6, C.OAK);
  vline(x + w - 1, y, h, C.OAK);
  for (const m of MUL_X) rect(m, g.y, 2, g.h, C.TAN), vline(m + 1, g.y, g.h, C.OAK);
  for (const m of MUL_Y) rect(g.x, m, g.w, 2, C.TAN), hline(g.x, m + 1, g.w, C.OAK);
  // sill
  rect(x - 4, y + h, w + 8, 2, C.SHELL); rect(x - 4, y + h + 2, w + 8, 2, C.SAND);
  hline(x - 4, y + h + 4, w + 8, C.TAN);
  seam(x - 4, y + h + 5, w + 8, C.PLASD);
}

function book(x, yb, w, h, c) {
  rect(x, yb - h, w, h, c);
  vline(x + w - 1, yb - h, h, DARKI[c]);
  if (h > 8) hline(x, yb - h + 3, w - 1, LITI[c]);
  if (h > 12) hline(x, yb - 4, w - 1, LITI[c]);
}

function drawShelf(pages) {
  const x0 = 8, x1 = 56, top = 14, bot = FLOOR_Y;
  rect(x0, top, x1 - x0, bot - top, C.BARK);                       // back
  rect(x0 - 2, top, x1 - x0 + 4, 4, C.OAK); hline(x0 - 2, top, x1 - x0 + 4, C.TAN);
  hline(x0 - 2, top + 4, x1 - x0 + 4, C.WOOD);
  rect(x0, top, 3, bot - top, C.OAK); vline(x0, top, bot - top, C.TAN);   // sides
  rect(x1 - 3, top, 3, bot - top, C.WOOD); vline(x1 - 1, top, bot - top, C.BARK);
  const boards = [40, 64, 88];
  for (const b of boards) { rect(x0, b, x1 - x0, 3, C.OAK); hline(x0, b, x1 - x0, C.TAN); hline(x0 + 3, b + 3, x1 - x0 - 6, C.INK); }
  rect(x0, 110, x1 - x0, 8, C.OAK); hline(x0, 110, x1 - x0, C.TAN); hline(x0, 117, x1 - x0, C.WOOD);
  hline(x0 + 3, 19, x1 - x0 - 6, C.INK);
  // row 1: books + a leaning one
  let bx = 11;
  const r1 = [[4, 16, C.FOREST], [3, 18, C.GREEN], [5, 14, C.SAND], [4, 17, C.DUSK], [3, 13, C.LEAF], [5, 18, C.TAN]];
  for (const [w, h, c] of r1) { book(bx, 40, w, h, c); bx += w; }
  for (let k = 0; k < 15; k++) { rect(bx + 1 + Math.floor(k / 3), 39 - k, 4, 1, C.OAK); px(bx + 4 + Math.floor(k / 3), 39 - k, C.BARK); }
  // stack of pages at the right
  for (let k = 0; k < 4; k++) { rect(42, 37 - k * 2, 11, 2, k % 2 ? C.CREAM : C.SHELL); px(52, 37 - k * 2, C.SAND); }
  // row 2: an ink pot with its pen, rolled pages, and books
  rect(13, 58, 7, 6, C.INK); rect(15, 56, 3, 2, C.SLATE); hline(13, 58, 7, C.SLATE);
  for (let k = 0; k < 8; k++) rect(18 + Math.floor(k / 3), 55 - k, 1, 1, C.SHELL), px(19 + Math.floor(k / 3), 55 - k, C.SAND);
  rect(22, 59, 12, 5, C.CREAM); hline(22, 59, 12, C.SHELL); hline(22, 63, 12, C.SAND); rect(33, 59, 2, 5, C.SAND);
  rect(24, 54, 10, 5, C.SHELL); hline(24, 58, 10, C.CREAM); rect(33, 54, 2, 5, C.CREAM);
  bx = 37;
  const r2 = [[4, 17, C.GREEN], [3, 15, C.HAZE], [5, 19, C.OAK], [4, 16, C.FOREST]];
  for (const [w, h, c] of r2) { book(bx, 64, w, h, c); bx += w; }
  // row 3: her written pages, one sheet each, laid in turn on three stacks
  const stacks = [[12, 14], [27, 12], [40, 13]];
  for (let k = 0; k < pages; k++) {
    const [sx, sw] = stacks[k % 3], yy = 87 - Math.floor(k / 3) * 3;
    rect(sx, yy - 2, sw, 2, Math.floor(k / 3) % 2 ? C.CREAM : C.SHELL); hline(sx, yy, sw, C.SAND);
  }
  // row 4: big books and a box of letters
  bx = 11;
  const r4 = [[6, 18, C.DUSK], [5, 16, C.TAN], [6, 19, C.FOREST]];
  for (const [w, h, c] of r4) { book(bx, 110, w, h, c); bx += w; }
  rect(30, 98, 22, 12, C.SAND); hline(30, 98, 22, C.CREAM); vline(51, 98, 12, C.TAN); hline(30, 103, 22, C.TAN);
  rect(39, 101, 4, 3, C.GOLD);
}

function drawDesk(items) {
  const x = 72, w = 74, top = 102;
  // desk
  rect(x - 2, top, w + 4, 2, C.TAN); rect(x - 2, top + 2, w + 4, 2, C.OAK); hline(x - 2, top + 4, w + 4, C.WOOD);
  rect(x, top + 5, 4, FLOOR_Y - top - 5, C.WOOD); vline(x, top + 5, FLOOR_Y - top - 5, C.OAK);
  rect(x + w - 4, top + 5, 4, FLOOR_Y - top - 5, C.WOOD); vline(x + w - 4, top + 5, FLOOR_Y - top - 5, C.OAK);
  // drawer, with a brass pull
  rect(x + 38, top + 5, 32, 10, C.OAK); hline(x + 38, top + 14, 32, C.WOOD); vline(x + 38, top + 5, 10, C.TAN);
  rect(x + 52, top + 9, 5, 2, C.GOLD); hline(x + 52, top + 9, 5, C.HONEY);
  // the two things laid out, on a green cloth that hangs over the front edge
  rect(78, top - 2, 50, 2, C.GREEN); hline(78, top - 2, 50, C.LEAF);
  rect(80, top, 46, 6, C.FOREST); hline(80, top, 46, C.GREEN);
  if (items >= 1) {
  // 1: a picture in a wooden frame, leaning on the wall: sky, a hill, the sun
  rect(83, 87, 18, 14, C.WOOD); hline(83, 87, 18, C.OAK); vline(83, 87, 14, C.OAK);
  rect(85, 89, 14, 10, C.FROST);
  for (let i = 0; i < 14; i++) { const hy = 95 - Math.round(Math.sin((i + 2) / 4.5) * 3); for (let j = hy; j < 99; j++) px(85 + i, j, C.GREEN); }
  disc(95, 92, 1, C.HONEY);
  vline(100, 88, 13, C.BARK);
  }
  if (items >= 2) {
  // 2: an open book, its pages written
  rect(106, 94, 9, 6, C.SHELL); rect(115, 94, 9, 6, C.CREAM);
  hline(107, 93, 7, C.SHELL); hline(116, 93, 7, C.CREAM);
  vline(115, 93, 7, C.TAN);
  for (const yy of [95, 97]) { hline(107, yy, 6, C.STEEL); hline(116, yy, 6, C.STEEL); }
  hline(105, 100, 20, C.FOREST); px(105, 99, C.FOREST); px(124, 99, C.FOREST);
  }
}

function drawClock() {               // the clock that wakes her, above the board
  const cx = 178, cy = 16;
  disc(cx, cy, 9, C.WOOD); disc(cx, cy, 8, C.OAK); disc(cx, cy, 6, C.SHELL);
  rect(cx, cy - 5, 2, 6, C.INK); rect(cx, cy, 5, 2, C.INK);
}
// the board hangs low, its bottom at her eye line, so she can reach a card
function drawBoard(cards) {
  const x = 150, y = 30, w = 56, h = 58;
  rect(x, y, w, h, C.OAK); hline(x, y, w, C.TAN); vline(x, y, h, C.TAN);
  hline(x, y + h - 1, w, C.WOOD); vline(x + w - 1, y, h, C.WOOD);
  rect(x + 2, y + 2, w - 4, h - 4, C.TAN);
  hline(x + 2, y + 2, w - 4, C.OAK);
  // cork flecks, 2x2, sparse, fixed
  for (let j = y + 4; j < y + h - 5; j += 5) for (let i = x + 4; i < x + w - 5; i += 5) if (hash(i, j) < 0.09) rect(i + Math.floor(hash(j, i) * 3), j + Math.floor(hash(i + 1, j) * 3), 2, 2, C.OAK);
  const card = (cx, cy, cw, ch, c) => { rect(cx, cy, cw, ch, c); hline(cx, cy + ch, cw, C.OAK); vline(cx + cw, cy + 1, ch, C.OAK); };
  const SLOTS = [
    (a, b) => { card(a, b, 15, 14, C.SHELL); for (const [yy, ww] of [[4, 10], [7, 11], [10, 7]]) rect(a + 2, b + yy, ww, 1, C.DUSK); },              // a note
    (a, b) => { card(a, b, 15, 15, C.SHELL); rect(a + 2, b + 2, 11, 11, C.FROST);                                                                 // a picture: sky and hill
      for (let i = 0; i < 11; i++) { const hy = b + 9 - Math.round(Math.sin(i / 3.5) * 3); for (let j = hy; j < b + 13; j++) px(a + 2 + i, j, C.GREEN); }
      disc(a + 9, b + 5, 1, C.HONEY); },
    (a, b) => { card(a, b, 11, 16, C.CREAM); for (const yy of [4, 8, 12]) hline(a + 2, b + yy, 7, C.TAN); },                                  // a narrow card
    (a, b) => { card(a, b, 15, 16, C.SHELL); disc(a + 7, b + 8, 5, C.STEEL); disc(a + 7, b + 8, 4, C.HAZE);                                    // a circle half in shadow
      for (let j = -4; j <= 4; j++) for (let i = 0; i <= 4; i++) if (i * i + j * j <= 18) px(a + 7 + i, b + 8 + j, C.MIST); },
    (a, b) => { card(a, b, 18, 12, C.CREAM); for (const [yy, ww] of [[3, 14], [6, 11], [9, 13]]) hline(a + 2, b + yy, ww, C.TAN); },            // a long slip
    (a, b) => { card(a, b, 9, 14, C.SHELL); rect(a + 2, b + 3, 5, 5, C.LEAF); hline(a + 2, b + 10, 5, C.DUSK); },                              // a pressed leaf
  ];
  const AT = [[154, 36], [172, 35], [191, 37], [154, 66], [172, 68], [193, 66]];
  for (let k = 0; k < cards; k++) {
    const [a, b] = AT[k]; SLOTS[k](a, b);
    rect(a + 5, b - 1, 2, 2, C.HONEY); px(a + 6, b, C.DGOLD);                // its brass pin
  }
}

function drawCloud(t, thoughts) {
  const bob = Math.round(Math.sin(t * 0.6) * 1);
  // one puff a thought (four at most); with none, one small puff still hangs there
  const blobs = thoughts ? [] : [[214, 26, 6], [222, 23, 7], [229, 27, 5]];
  const TOP = [[19, 9], [15, 11], [20, 8], [17, 10]];           // each puff its own height, so the row is not a caterpillar
  for (let i = 0; i < thoughts; i++) { const cx = 220 + i * 18, [cy, r] = TOP[i]; blobs.push([cx - 7, 26, 7], [cx, cy, r], [cx + 7, 25, 7]); }
  const mask = new Uint8Array(W * 50);
  const inM = (x, y) => y >= 0 && y < 50 && x >= 0 && x < W && mask[y * W + x];
  for (const [cx, cy, r] of blobs) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    const yy = cy + j + bob;
    if (i * i + j * j <= r * r + r * 0.6 && yy < 31 + bob && yy >= 0 && cx + i < W) mask[yy * W + cx + i] = 1;
  }
  for (let y = 0; y < 50; y++) for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue;
    let c = C.FROST;
    if (!inM(x, y + 2)) c = C.HAZE;                          // underside
    if (!inM(x, y + 1)) c = C.MIST;
    if (!inM(x, y - 2) && inM(x, y + 3)) c = C.SHELL;        // tops
    if (!inM(x - 3, y) && inM(x, y + 3)) c = C.SHELL;        // sun from the left
    if (!inM(x - 1, y) && inM(x, y + 3)) c = C.SUN;
    px(x, y, c);
  }
}

function gear(cx, cy, r, rot) {
  for (let j = -r - 3; j <= r + 3; j++) for (let i = -r - 3; i <= r + 3; i++) {
    const d = Math.sqrt(i * i + j * j);
    const ang = Math.atan2(j, i) + rot;
    const tooth = Math.floor(((ang / (2 * Math.PI)) * 16 + 160)) % 2 === 0;
    let c = -1;
    if (d < 1.2) c = C.DGOLD;
    else if (d < r - 2.5) c = (i + j > 2) ? C.GOLD : C.HONEY;
    else if (d < r - 1.5) c = C.GOLD;
    else if (d < r + 0.5) c = (i + j > 0) ? C.GOLD : C.HONEY;
    else if (d < r + 2.5 && tooth) c = (i + j > 0) ? C.DGOLD : C.GOLD;
    if (c >= 0) px(cx + i, cy + j, c);
  }
}

function drawBench(t, builds) {
  const x0 = 224, x1 = 318, top = 100;
  // shade on the wainscot under the bench
  for (let y = top + 5; y < FLOOR_Y - 4; y++) for (let x = x0 + 4; x < x1 - 4; x++) darkAt(x, y);
  // tool rail and tools
  rect(250, 50, 38, 3, C.WOOD); hline(250, 50, 38, C.OAK);
  rect(258, 53, 2, 13, C.OAK); vline(259, 53, 13, C.WOOD); rect(254, 53, 10, 4, C.DUSK); hline(254, 53, 10, C.STEEL);  // hammer
  rect(274, 55, 3, 10, C.STEEL); vline(276, 55, 10, C.DUSK); rect(272, 53, 7, 3, C.STEEL); px(275, 53, C.PLAS);         // wrench
  rect(273, 64, 5, 3, C.STEEL); px(275, 66, C.PLAS);
  // the bench
  rect(x0, top, x1 - x0, 2, C.TAN); rect(x0, top + 2, x1 - x0, 3, C.OAK); hline(x0, top + 5, x1 - x0, C.WOOD);
  rect(x0 + 3, top + 6, 5, FLOOR_Y - top - 6, C.WOOD); vline(x0 + 3, top + 6, FLOOR_Y - top - 6, C.OAK);
  rect(x1 - 9, top + 6, 5, FLOOR_Y - top - 6, C.WOOD); vline(x1 - 9, top + 6, FLOOR_Y - top - 6, C.OAK);
  rect(x0 + 3, 110, x1 - x0 - 12, 3, C.OAK); hline(x0 + 3, 110, x1 - x0 - 12, C.TAN);
  // crate and jars on the low shelf
  rect(262, 104, 20, 6, C.OAK); hline(262, 104, 20, C.TAN); vline(281, 104, 6, C.WOOD);
  rect(288, 103, 6, 7, C.HAZE); hline(288, 103, 6, C.FROST); vline(293, 103, 7, C.MIST); rect(289, 101, 4, 2, C.TAN);
  // the machine: a brass gear, a box with a dial, a glass jar with a spark
  const rot = t * 0.8;
  if (builds >= 1) { rect(248, 96, 18, 4, C.DUSK); hline(248, 96, 18, C.STEEL); gear(256, 87, 7, rot); }
  if (builds >= 2) {
  rect(266, 78, 20, 22, C.STEEL); hline(266, 78, 20, C.MIST); vline(266, 78, 22, C.MIST);
  vline(285, 78, 22, C.DUSK); hline(266, 99, 20, C.DUSK);
  disc(276, 87, 5, C.FROST); disc(276, 87, 5, C.FROST); hline(272, 93, 9, C.MIST);
  const na = -Math.PI / 2 + Math.sin(t * 1.3) * 0.9;
  for (let s = 0; s < 5; s++) { const xx = Math.round(276 + Math.cos(na) * s), yy = Math.round(87 + Math.sin(na) * s); px(xx, yy, C.INK); }
  rect(270, 95, 3, 2, C.HONEY); rect(275, 95, 3, 2, C.DUSK); rect(280, 95, 3, 2, C.DUSK);
  }
  if (builds >= 3) {
  // pipe up and over into the jar
  rect(280, 73, 2, 5, C.SLATE); rect(280, 72, 13, 2, C.SLATE); hline(280, 72, 13, C.DUSK); rect(291, 72, 2, 6, C.SLATE);
  rect(287, 80, 12, 20, C.HAZE); rect(288, 78, 10, 2, C.TAN); hline(288, 78, 10, C.SAND);
  vline(287, 80, 20, C.MIST); vline(298, 80, 20, C.MIST); hline(287, 99, 12, C.MIST);
  rect(289, 82, 1, 9, C.FROST);
  disc(293, 90, Math.floor(t * 2) % 2 ? 3 : 2, C.SHELL); disc(293, 90, 1, C.SUN);
  }
  // Quill's perch
  rect(310, 76, 2, 24, C.WOOD); vline(310, 76, 24, C.OAK);
  rect(302, 75, 16, 2, C.OAK); hline(302, 75, 16, C.TAN);
}

// ---- the futon, bottom left: laid out from the shelf toward us ----
function drawFuton(awake, t) {
  const x0 = 6, x1 = 38, y0 = 127, y1 = 154;
  for (let x = x0 + 2; x < x1 + 2; x++) darkAt(x, y1 + 5), darkAt(x, y1 + 6);     // its shadow on the floor
  rect(x0, y0, x1 - x0, y1 - y0, C.CREAM);                                       // mattress top
  hline(x0, y0, x1 - x0, C.SHELL); vline(x0, y0, y1 - y0, C.SHELL); vline(x1 - 1, y0, y1 - y0, C.SAND);
  rect(x0, y1, x1 - x0, 5, C.TAN); hline(x0, y1, x1 - x0, C.SAND); hline(x0, y1 + 4, x1 - x0, C.OAK);  // its front edge
  for (let x = x0 + 5; x < x1; x += 9) vline(x, y1 + 1, 3, C.OAK);
  // pillow
  rect(x0 + 5, y0 + 2, 22, 8, C.SHELL); hline(x0 + 6, y0 + 1, 20, C.SHELL); hline(x0 + 5, y0 + 9, 22, C.SAND); vline(x0 + 26, y0 + 2, 8, C.SAND);
  hline(x0 + 6, y0 + 10, 21, C.TAN); vline(x0 + 27, y0 + 3, 7, C.TAN); vline(x0 + 4, y0 + 3, 7, C.SAND);
  if (awake) {
    // the quilt thrown back to the foot, folded twice
    rect(x0, 143, x1 - x0, 11, C.GREEN); hline(x0, 143, x1 - x0, C.LEAF); hline(x0, 147, x1 - x0, C.FOREST);
    hline(x0, 148, x1 - x0, C.LEAF); hline(x0, 153, x1 - x0, C.FOREST);
    vline(x1 - 1, 143, 11, C.FOREST);
  } else {
    // she sleeps: her head on the pillow, the quilt up to her chin
    drawHead(x0 + 7, y0 - 4, false, 'shut', 0);
    rect(x0, 138, x1 - x0, 16, C.GREEN);
    hline(x0, 138, x1 - x0, C.SHELL); hline(x0, 139, x1 - x0, C.SHELL); hline(x0, 140, x1 - x0, C.LEAF);
    const breathe = Math.sin(t * 1.4) > 0 ? 1 : 0;                                  // the quilt rises and falls
    for (let x = x0 + 8; x < x0 + 26; x++) { const hy = 145 - breathe - Math.round(2 * Math.sin((x - x0 - 8) / 18 * Math.PI)); px(x, hy, C.LEAF); }
    hline(x0, 153, x1 - x0, C.FOREST); vline(x1 - 1, 138, 16, C.FOREST);
  }
}

// ---- March: a puppet of parts. Local grid 18 wide; her feet stand on row 40. ----
// One head grid (her eyes drawn on it per mode), one body grid; arms and legs drawn
// from joint points per pose, so a pose is a few numbers, never a new picture.
const MK = {
  k: 'INK', P: 'PINK', p: 'PINKD', S: 'SKIN', s: 'SKIND', G: 'GREEN', g: 'FOREST', v: 'LEAF',
  W: 'SHELL', w: 'CREAM', D: 'SLATE', h: 'DUSK', d: 'INK', B: 'BARK', b: 'WOOD',
};
const HEAD = [
  '......pppppp......',
  '....ppPPPPPPpp....',
  '...pPPPPPPPPPPp...',
  '..pPPPPPPPPPPPPp..',
  '.pPPPPPPPPPPPPPPp.',
  '.pPPPPPPPPPPPPPPp.',
  'pPPPPPPPPPPPPPPPPp',
  'pPPPPPpPPPPpPPPPPp',
  'pPPPPpSPPPPSPPPSPp',
  'pPPPpSSSPPSSSSPSPp',
  'pPPPpSSSSSSSSSSSPp',
  'pPPPpSSSSSSSSSSSPp',
  'pPPPpSSSSSSSSSSsPp',
  'pPPPpsSSSSSSSSssPp',
  '.pPPPpsSSSSSSSspPp',
  '.pPPp..sssssss.pp.',
];
const BODY = [                    // rows 16..26 of the figure
  '.........sss......',
  '......gWWWWWg.....',
  '.....gvGWWWGGg....',
  '.....gvGGWGGGg....',
  '.....gvGGGGGGg....',
  '.....gvGGGGGGg....',
  '.....gvGGGGGGg....',
  '.....ggggggggg....',
  '....gvGGGGGGGGg...',
  '....gvGGGGGGGGg...',
  '...ggggggggggggg..',
];
const FW = 18;
const fig = { ox: 0, oy: 0, flip: false };
function fpx(i, j, key) { px(fig.flip ? fig.ox + FW - 1 - i : fig.ox + i, fig.oy + j, C[MK[key]]); }
function fgrid(rows, dx, dy) {
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') fpx(i + dx, j + dy, row[i]); });
}
// eyes: 2 wide and 3 tall, open; one row when shut; a row higher looking up, lower looking down
function eyes(mode, dx, dy) {
  const rows = mode === 'shut' ? [12] : mode === 'up' ? [9, 10, 11] : mode === 'down' ? [11, 12, 13] : [10, 11, 12];
  for (const r of rows) for (const c of [7, 8, 12, 13]) fpx(c + dx, r + dy, 'k');
}
// the head alone, for the futon (no flip)
function drawHead(x, y, flip, mode, dx) {
  Object.assign(fig, { ox: x, oy: y, flip });
  fgrid(HEAD, dx, 0); eyes(mode, dx, 0);
}
// a limb along joint points: a band `width` wide outlined in `edge`, its core in `core`
function limb(pts, width, edge, core) {
  const r = (width - 1) / 2;
  const walk = (fn) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 2));
      for (let s = 0; s <= n; s++) fn(ax + (bx - ax) * s / n, ay + (by - ay) * s / n);
    }
  };
  walk((x, y) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) fpx(Math.round(x + i), Math.round(y + j), edge); });
  walk((x, y) => fpx(Math.round(x), Math.round(y), core));
}
function hand([x, y]) {
  const hx = Math.round(x), hy = Math.round(y);
  fpx(hx - 1, hy - 1, 'S'); fpx(hx, hy - 1, 'S'); fpx(hx + 1, hy - 1, 's');
  fpx(hx - 1, hy, 'S'); fpx(hx, hy, 'S'); fpx(hx + 1, hy, 's');
  fpx(hx - 1, hy + 1, 's'); fpx(hx, hy + 1, 's'); fpx(hx + 1, hy + 1, 's');
}
function arm(pts, lit) { limb(pts, 3, 'g', lit ? 'v' : 'G'); hand(pts[pts.length - 1]); }
// a leg from the hip (row 27) to the ankle; the shoe below it, toe forward
function leg(hip, foot, lift, near) {
  const ankle = 38 - lift, kneeY = 32 - Math.round(lift / 2);
  const knee = hip + (foot - hip) * 0.5 + (lift ? 2 : 0);
  const cols = near ? ['h', 'D', 'D', 'd'] : ['D', 'd', 'd', 'd'];
  for (let r = 27; r <= ankle; r++) {
    const x = r <= kneeY ? hip + (knee - hip) * (r - 27) / (kneeY - 27) : knee + (foot - knee) * (r - kneeY) / Math.max(1, ankle - kneeY);
    const x0 = Math.round(x - 1.5);
    cols.forEach((c, i) => fpx(x0 + i, r, c));
  }
  const s0 = Math.round(foot - 1.5);
  for (let i = 0; i < 4; i++) fpx(s0 + i, ankle + 1, 'b');
  for (let i = 0; i < 5; i++) fpx(s0 + i, ankle + 2, 'B');
}

// the poses, facing right (a left-facing one is the mirror). arms: [far, near] joint lists;
// legs: [far foot dx, far lift, near foot dx, near lift]; look: the eyes' mode
const DOWN_FAR = [[5, 18], [4, 22], [4, 26]], DOWN_NEAR = [[13, 18], [14, 22], [14, 26]];
const WALK = [                                   // contact, passing, contact, passing
  { legs: [-3, 0, 3, 0], bob: 0, far: [[5, 18], [7, 22], [9, 25]], near: [[13, 18], [13, 22], [12, 25]] },
  { legs: [1, 3, 0, 0], bob: -1, far: DOWN_FAR, near: DOWN_NEAR },
  { legs: [3, 0, -3, 0], bob: 0, far: [[5, 18], [3, 22], [1, 25]], near: [[13, 18], [16, 22], [18, 24]] },
  { legs: [0, 0, 1, 3], bob: -1, far: DOWN_FAR, near: DOWN_NEAR },
];
function pose(place, t) {
  const work = Math.floor(t * 2.5) % 2;
  switch (place) {
    case 'bench': return { face: 'R', look: 'open', far: [[5, 18], [9, 22], [16, 21 + work]], near: [[13, 18], [16, 22], [20, 21 - work]], behindFar: true };
    case 'shelf': return { face: 'L', look: 'up', far: DOWN_FAR, near: [[13, 18], [16, 13], [17, 7]] };
    case 'board': return { face: 'R', look: 'up', far: DOWN_FAR, near: [[13, 18], [16, 11], [16, 4]] };     // a hand up to a card
    case 'cloud': return { face: 'R', look: 'up', far: DOWN_FAR, near: [[13, 18], [16, 23], [13, 17]] };
    case 'desk': return { face: 'L', look: 'down', far: DOWN_FAR, near: [[13, 18], [16, 21], [19, 22]], bow: 1 };
    default: return null;
  }
}

const M = { lastX: null, face: 'R' };
function drawMarch(st, t) {
  const x = Math.round(st.march.x), feet = Math.round(st.march.y ?? FEET_Y);
  if (M.lastX !== null && Math.abs(x - M.lastX) >= 1) M.face = x > M.lastX ? 'R' : 'L';
  M.lastX = x;
  const blink = (t % 4.3) < 0.15;
  let p, legs = [0, 0, 0, 0], bob = 0, sway = 0;
  if (st.moving) {
    const w = WALK[Math.floor(x / 5) % 4];
    p = { face: M.face, look: 'open', far: w.far, near: w.near, behindFar: true };       // the far arm swings behind her
    legs = w.legs; bob = w.bob;
  } else {
    p = pose(st.place, t);
    if (!p) {                                                     // the idle: a slow shift of weight
      sway = Math.floor(t / 3.1) % 2;
      p = { face: st.checking && M.quillSide ? M.quillSide : M.face, look: 'open', far: DOWN_FAR, near: DOWN_NEAR };
    } else M.face = p.face;
  }
  const look = blink && p.look !== 'shut' ? 'shut' : p.look;
  Object.assign(fig, { ox: x - 9, oy: feet - 40, flip: p.face === 'L' });
  // her shadow on the floor
  for (let i = -7; i <= 7; i++) { darkAt(x + i, feet + 1); if (Math.abs(i) < 5) darkAt(x + i, feet + 2); }
  const at = (pts, dx, dy) => pts.map(([a, b]) => [a + dx, b + dy]);
  const bodyDX = sway, bodyDY = bob, headDY = bob + (p.bow || 0);
  if (p.behindFar) arm(at(p.far, bodyDX, bodyDY), true);
  if (p.behindNear) arm(at(p.near, bodyDX, bodyDY), false);
  leg(6.5, 6.5 + legs[0], legs[1], false);
  leg(11.5, 11.5 + legs[2], legs[3], true);
  fgrid(BODY, bodyDX, 16 + bodyDY);
  if (!p.behindFar) arm(at(p.far, bodyDX, bodyDY), true);
  fgrid(HEAD, bodyDX, headDY); eyes(look, bodyDX, headDY);
  if (!p.behindNear) arm(at(p.near, bodyDX, bodyDY), false);
}

// ---- Quill: a crow, perched by the bench; he comes down beside her when she checks a thing ----
const QUILL_MAP = { k: 'INK', q: 'SLATE', d: 'DUSK', g: 'STEEL', e: 'FROST', y: 'DUSK' };
const QUILL = [
  '....kkkk........',
  '...kqqqqk.......',
  '..kqeqqqqk......',
  'gggqqqqqqk......',
  '.ggkqqqqqk......',
  '...kdqqqqkk.....',
  '...kdqqqqqqk....',
  '...kddqqqqqqk...',
  '...kdddqqqqqk...',
  '...kqdddqqqqqk..',
  '....kqddqqqqqk..',
  '.....kqqqqqqqqk.',
  '......kkkqqqqqk.',
  '......y.y..kqqk.',
  '.....yy.yy..kqqk',
  '............kkk.',
];
const QUILL_BLINK_ROW = '..kqqqqqqk......';
const QUILL_FLY = [
  [                               // wings up
    '........kk......',
    '.......kqqk.....',
    '......kqqqk.....',
    '....kkkqqk......',
    '...kqqkqk.......',
    '..kqeqqqkkkk....',
    'gggqqqqqqqqqkk..',
    '.ggkqqqqqqqqqqk.',
    '...kkqqqqqqkkk..',
    '.....kkkkkk.....',
    '......y..y......',
    '................',
  ],
  [                               // wings down
    '................',
    '................',
    '................',
    '....kkk.........',
    '...kqqqk........',
    '..kqeqqqkkkk....',
    'gggqqqqqqqqqkk..',
    '.ggkqqqqqqqqqqk.',
    '...kkqqqqqqkkk..',
    '.....kqqqqk.....',
    '......kqqk......',
    '.......kk.......',
  ],
];
const Q = { x: PERCH.x, y: PERCH.y, t: null };
function drawQuill(st, t) {
  // where he wants to be: the perch, or on the floor beside her, looking up at her
  let tx = PERCH.x, ty = PERCH.y;
  if (st.awake && st.checking) {
    const mx = st.march.x, right = mx + 26 < 300;
    tx = right ? mx + 12 : mx - 28; ty = (st.march.y ?? FEET_Y) - 15;
    M.quillSide = right ? 'R' : 'L';
  } else M.quillSide = null;
  const dt = Q.t === null ? 0 : Math.min(0.1, Math.max(0, t - Q.t)); Q.t = t;
  const k = 1 - Math.pow(0.006, dt);              // about 8% a frame at 60 frames a second
  Q.x += (tx - Q.x) * k; Q.y += (ty - Q.y) * k;
  if (dt === 0) { Q.x = tx; Q.y = ty; }
  const flying = Math.hypot(tx - Q.x, ty - Q.y) > 2;
  const faceRight = st.checking && M.quillSide === 'L';
  if (flying) { sprite(QUILL_FLY[Math.floor(t * 8) % 2], QUILL_MAP, Math.round(Q.x), Math.round(Q.y) + 2, tx > Q.x); return; }
  const rows = QUILL.slice();
  if ((t % 5.1) < 0.18) rows[2] = QUILL_BLINK_ROW;
  sprite(rows, QUILL_MAP, Math.round(Q.x), Math.round(Q.y), faceRight);
}

// ---- light passes ----
function lightPasses() {
  // the window patch on the floor: core +2, rim +1
  for (let y = FLOOR_Y + 1; y < H; y++) for (let x = 0; x < W; x++) {
    const p = patchAt(x, y);
    if (p === 2) { lightAt(x, y); lightAt(x, y); }
    else if (p === 1) lightAt(x, y);
  }
}
function shaftPass() {
  // two flat bands: the whole beam +1, and a core well inside it +1 more (on bare wall only)
  const core = [];
  for (let y = 0; y < PATCH_NEAR; y++) for (let x = 0; x < W; x++) {
    if (!shaftAt(x, y)) continue;
    if (get(x, y) === C.PLAS && shaftAt(x + 7, y) && shaftAt(x - 3, y) && y > WIN.y + 6) core.push(y * W + x);
    lightAt(x, y);
  }
  for (const i of core) buf[i] = C.SUN;
}

// ---- entry ----
export function draw(ctx, t = 0, state = {}) {
  const st = { awake: true, moving: false, place: null, checking: false, ...state };
  if (!st.march) st.march = { x: PLACES.bench.at, y: FEET_Y };
  buf.fill(C.PLAS);
  drawWall();
  drawFloor();
  drawRug();
  lightPasses();
  drawWindow();
  const n = { ...FULL, ...(st.places || {}) };
  drawShelf(num(n.shelf && n.shelf.pages, 12));
  drawClock();
  drawBoard(num(n.board && n.board.cards, 6));
  drawCloud(t, num(n.cloud && n.cloud.thoughts, 4));
  drawBench(t, num(n.bench && n.bench.builds, 3));
  drawDesk(num(n.desk && n.desk.items, 2));
  shaftPass();
  drawFuton(st.awake, t);
  if (!(st.awake && st.checking)) drawQuill(st, t);
  if (st.awake) drawMarch(st, t);
  if (st.awake && st.checking) drawQuill(st, t);
  const img = ctx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const [r, g, b] = RGB[buf[i]];
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export const PALETTE = HEX;
