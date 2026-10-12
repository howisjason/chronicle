// pole.mjs: which star is the North Star in a given year?
//
//   node pole.mjs 14000        one year: the nearest bright star to the pole
//   node pole.mjs 2800BC       years may be written with BC (or AD)
//   node pole.mjs              a table across the whole precession cycle
//   node pole.mjs turns        each star's closest approaches, 26,000 BC to 26,000 AD
//
// Earth's pole: the IAU long-term precession model of Vondrák, Capitaine and
// Wallace (2011, A&A 534, A22; corrected 2012, A&A 541, C1), as published in
// ERFA's eraLtpequ. It gives the pole as a unit vector in the J2000 mean
// equator frame, valid for about 200,000 years either side of 2000.
//
// The stars: J2000 positions, proper motions, parallaxes and radial velocities
// from SIMBAD (Hipparcos / Gaia values), moved in a straight line through space.


const DEG = Math.PI / 180;
const AS2R = DEG / 3600;

// Polynomial terms for X and Y, arcseconds, powers of t (Julian centuries from J2000).
const XPOL = [5453.282155, 0.4252841, -0.00037173, -0.000000152];
const YPOL = [-73750.930350, -0.7675452, -0.00018725, 0.000000231];

// Periodic terms: period (centuries), X cos, Y cos, X sin, Y sin (arcseconds).
const PER = [
  [256.75, -819.940624, 75004.344875, 81491.287984, 1558.515853],
  [708.15, -8444.676815, 624.033993, 787.163481, 7774.939698],
  [274.20, 2600.009459, 1251.136893, 1251.296102, -2219.534038],
  [241.45, 2755.175630, -1102.212834, -1257.950837, -2523.969396],
  [2309.00, -167.659835, -2660.664980, -2966.799730, 247.850422],
  [492.20, 871.855056, 699.291817, 639.744522, -846.485643],
  [396.10, 44.769698, 153.167220, 131.600209, -1393.124055],
  [288.90, -512.313065, -950.865637, -445.040117, 368.526116],
  [231.10, -819.415595, 499.754645, 584.522874, 749.045012],
  [1610.00, -538.071099, -145.188210, -89.756563, 444.704518],
  [620.00, -189.793622, 558.116553, 524.429630, 235.934465],
  [157.87, -402.922932, -23.923029, -13.549067, 374.049623],
  [220.30, 179.516345, -165.405086, -210.157124, -171.330180],
  [1200.00, -9.814756, 9.344131, -44.919798, -22.899655],
];

// The north celestial pole in `year` (a Julian epoch), as a unit vector.
export function pole(year) {
  const t = (year - 2000) / 100;
  let x = 0, y = 0;
  for (const [p, xc, yc, xs, ys] of PER) {
    const a = (2 * Math.PI * t) / p;
    x += xc * Math.cos(a) + xs * Math.sin(a);
    y += yc * Math.cos(a) + ys * Math.sin(a);
  }
  let w = 1;
  for (let i = 0; i < 4; i++) { x += XPOL[i] * w; y += YPOL[i] * w; w *= t; }
  x *= AS2R; y *= AS2R;
  const w2 = 1 - x * x - y * y;
  return [x, y, w2 < 0 ? 0 : Math.sqrt(w2)];
}

// name, Bayer, RA (deg), Dec (deg), pmRA* (mas/yr), pmDec (mas/yr), parallax (mas), RV (km/s), V mag
export const STARS = [
  ["Polaris", "alf UMi", 37.95456067, 89.26410897, 44.48, -11.85, 7.54, -16.42, 2.02],
  ["Kochab", "bet UMi", 222.67635750, 74.15550394, -32.61, 11.42, 24.91, 16.96, 2.08],
  ["Pherkad", "gam UMi", 230.1820980485, 71.8340254549, -15.908, 17.146, 6.5959, -3.90, 3.00],
  ["Yildun", "del UMi", 263.0541592214, 86.5864596056, 10.025, 54.053, 17.8802, -8.92, 4.34],
  ["Thuban", "alf Dra", 211.0973233202, 64.3758696176, -56.351, 12.329, 12.5156, -6.1, 3.68],
  ["Kappa Draconis", "kap Dra", 188.3705971536, 69.7882388590, -58.571, 10.110, 7.0093, -12.00, 3.89],
  ["Iota Herculis", "iot Her", 264.8661954084, 46.0063313828, -6.929, 3.682, 6.5157, -38.4, 3.80],
  ["Tau Herculis", "tau Her", 244.9351533251, 46.3133617043, -13.162, 38.546, 10.1626, -15.50, 3.87],
  ["Eta Herculis", "eta Her", 250.7240206061, 38.9222549196, 35.482, -85.395, 29.2595, 8.325, 3.50],
  ["Pi Herculis", "pi Her", 258.7618093599, 36.8091615490, -27.402, 2.925, 8.8991, -25.57, 3.18],
  ["Vega", "alf Lyr", 279.23473479, 38.78368896, 200.94, 286.23, 130.23, -13.5, 0.03],
  ["Delta Cygni", "del Cyg", 296.2436538443, 45.1308146314, 41.870, 47.298, 21.1474, -23.60, 2.87],
  ["Deneb", "alf Cyg", 310.35797975, 45.28033881, 2.01, 1.85, 2.31, -4.90, 1.25],
  ["Alderamin", "alf Cep", 319.64488470, 62.58557446, 150.55, 49.09, 66.50, -15.80, 2.46],
  ["Alfirk", "bet Cep", 322.1649868804, 70.5607151893, 12.54, 8.39, 4.76, -8.2, 3.23],
  ["Iota Cephei", "iot Cep", 342.4200728828, 66.2004050535, -65.947, -124.967, 27.2869, -12.763, 3.54],
  ["Errai", "gam Cep", 354.8371267224, 77.6323641059, -64.860, 171.159, 72.5167, -43.668, 3.22],
];

const KMS = 1.0227121650537077e-6; // 1 km/s in parsecs per year

// Where a star sits in `year`, as a unit vector in the J2000 frame: its 2000
// position and velocity, carried in a straight line through space.
export function starAt(s, year) {
  const [, , raDeg, decDeg, pmra, pmdec, plx, rv] = s;
  const ra = raDeg * DEG, dec = decDeg * DEG;
  const d = 1000 / plx;
  const ca = Math.cos(ra), sa = Math.sin(ra), cd = Math.cos(dec), sd = Math.sin(dec);
  const u = [cd * ca, cd * sa, sd];
  const east = [-sa, ca, 0];
  const north = [-sd * ca, -sd * sa, cd];
  const ve = (pmra / 1000) * AS2R * d, vn = (pmdec / 1000) * AS2R * d, vr = rv * KMS;
  const dt = year - 2000;
  const r = [0, 1, 2].map((i) => d * u[i] + dt * (ve * east[i] + vn * north[i] + vr * u[i]));
  const n = Math.hypot(...r);
  return r.map((c) => c / n);
}

// Angle in degrees between two unit vectors.
function sep(a, b) {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cx = a[1] * b[2] - a[2] * b[1], cy = a[2] * b[0] - a[0] * b[2], cz = a[0] * b[1] - a[1] * b[0];
  return Math.atan2(Math.hypot(cx, cy, cz), dot) / DEG;
}

export function distance(s, year) {
  return sep(pole(year), starAt(s, year));
}

// Every star, nearest to the pole first.
export function ranked(year) {
  const p = pole(year);
  return STARS.map((s) => ({ name: s[0], bayer: s[1], mag: s[8], deg: sep(p, starAt(s, year)) }))
    .sort((a, b) => a.deg - b.deg);
}

// Local minima of a star's distance from the pole between two years.
export function turns(s, from = -25999, to = 26000, under = 10) {
  const out = [];
  const step = 10;
  let a = distance(s, from - step), b = distance(s, from);
  for (let y = from; y <= to; y += step) {
    const c = distance(s, y + step);
    if (b < a && b <= c && b < under) {
      // refine to the year
      let best = y, bd = b;
      for (let yy = y - step; yy <= y + step; yy++) {
        const dd = distance(s, yy);
        if (dd < bd) { bd = dd; best = yy; }
      }
      out.push({ year: best, deg: bd });
    }
    a = b; b = c;
  }
  return out;
}

export const MIN_YEAR = -99999, MAX_YEAR = 100000;

// "14000", "-2799", "2800BC", "2800 bc", "1066AD" → astronomical year (1 BC = 0).
export function parseYear(text) {
  const m = String(text).trim().match(/^(-?\d+)\s*(BC|BCE|AD|CE)?$/i);
  if (!m) return null;
  let y = Number(m[1]);
  const era = (m[2] || "").toUpperCase();
  if (era === "BC" || era === "BCE") {
    if (y <= 0) return null;
    y = 1 - y;
  }
  return y;
}

export function showYear(y) {
  return y <= 0 ? `${1 - y} BC` : `${y} AD`;
}

function fmt(deg) {
  return deg < 1 ? `${(deg * 60).toFixed(0)}′` : `${deg.toFixed(1)}°`;
}

// The one-line answer, as a string, so demo.html can show it in a browser too.
export function sentence(year) {
  const [first, second] = ranked(year);
  const word = first.deg < 1 ? "the North Star" : first.deg < 5 ? "the nearest thing to a North Star" : "the nearest bright star to an empty pole";
  return `${showYear(year)}: ${first.name} (${first.bayer}, mag ${first.mag}) is ${word}, ${fmt(first.deg)} from the pole. Next: ${second.name}, ${fmt(second.deg)}.`;
}

function one(year) {
  console.log(sentence(year));
}

function table() {
  console.log("year         nearest bright star     from the pole");
  for (let y = -12000; y <= 16000; y += 1000) {
    const yr = y <= 0 ? y + 1 : y; // whole BC/AD thousands
    const [first] = ranked(yr);
    console.log(`${showYear(yr).padEnd(12)} ${first.name.padEnd(23)} ${fmt(first.deg)}`);
  }
}

function allTurns() {
  const rows = [];
  for (const s of STARS) for (const t of turns(s)) rows.push({ name: s[0], ...t });
  rows.sort((a, b) => a.year - b.year);
  console.log("closest approaches to the pole, 26,000 BC to 26,000 AD, under 10°");
  for (const r of rows) console.log(`${showYear(r.year).padEnd(12)} ${r.name.padEnd(23)} ${fmt(r.deg)}`);
}

function main(args) {
  if (args.length === 0) return table();
  if (args[0] === "turns") return allTurns();
  const year = parseYear(args.join(" "));
  if (year === null || year < MIN_YEAR || year > MAX_YEAR) {
    console.log(`a year, please: a whole number from ${showYear(MIN_YEAR)} to ${showYear(MAX_YEAR)}, like 14000, -2799 or 2800BC`);
    process.exitCode = 2;
    return;
  }
  one(year);
}

// Run main only from the command line. In a browser (demo.html imports this file)
// there is no process, so nothing runs and the exports are all that matter.
if (typeof process !== "undefined" && process.argv && process.argv[1]) {
  const { pathToFileURL } = await import("node:url");
  if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
}
