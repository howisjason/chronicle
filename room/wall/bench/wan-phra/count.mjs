// count.mjs: a published count, checked. A 2014 paper in the Journal of the
// Royal Institute of Thailand (vol. 39 no. 2; Nibondh Saibejra and Jaturong
// Sukonthachat) says the holy days of B.E. 2557 had their tithi off from the
// Moon's true tithi on 34 of 52 days, and its English abstract gives 24 for
// B.E. 2556. This counts the same thing from this build's calendar.
//
// The true tithi is the paper's measure: the Moon's lead on the Sun (the
// elongation) in steps of 12 degrees, so tithi 1 is 0-12 degrees, tithi 15 is
// 168-180 (it ends at the full moon) and tithi 30 is 348-360 (it ends at the new
// moon). A holy day's own tithi is its day number in the month: waxing 8 is 8,
// waxing 15 is 15, waning 8 is 23, and the last day is 29 or 30.
//
// Positions are Meeus, Astronomical Algorithms (2nd ed.): the Sun from ch. 25
// (low accuracy, about 0.01 degree) and the Moon from ch. 47, cut to its largest
// terms (TERMS below), which is plenty when a tithi is 12 degrees wide.
// The check that the two agree with the phase road in wanphra.mjs is in the
// printout: the elongation at every ch. 49 new and full moon from December 2012
// to February 2015.
//   bash room/tools/try.sh wan-phra count.mjs
import * as W from './wanphra.mjs';

const rad = Math.PI / 180;
const sin = (x) => Math.sin(x * rad);
const norm = (x) => ((x % 360) + 360) % 360;
const deltaT = (year) => { const t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; };

// The Sun's apparent longitude (Meeus ch. 25, low accuracy).
export function sunLon(jde) {
  const T = (jde - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
    + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
  const om = 125.04 - 1934.136 * T;
  return norm(L0 + C - 0.00569 - 0.00478 * sin(om));
}

// Meeus table 47.A, longitude terms: D, M, M', F, coefficient in 1e-6 degree.
// Terms with M are multiplied by E (|M| = 1) or E squared (|M| = 2).
const TERMS = [
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314],
  [0, 0, 2, 0, 213618], [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332],
  [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066], [2, 0, 1, 0, 53322],
  [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528],
  [0, 0, 1, -2, 10980], [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034],
  [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888], [2, 1, 0, 0, -6766],
  [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665],
  [0, 1, -2, 0, -2689], [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390],
  [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236], [0, 1, 2, 0, -2120],
  [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110],
];

// The Moon's apparent longitude, less nutation (it cancels in the elongation).
export function moonLon(jde) {
  const T = (jde - 2451545) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T ** 3 / 538841;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T ** 3 / 545868;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T ** 3 / 69699;
  const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  let s = 0;
  for (const [d, m, mp, f, c] of TERMS) {
    const e = m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E;
    s += c * e * sin(d * D + m * M + mp * Mp + f * F);
  }
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.290 * T;
  s += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
  return norm(Lp + s / 1e6);
}

export const elongation = (jde) => norm(moonLon(jde) - sunLon(jde));
export const tithiAt = (jde) => Math.floor(elongation(jde) / 12) + 1;

// A moment on a Thai civil day (JDN), at an hour of the Thai clock, as JDE.
export function jdeAt(jdn, hour) {
  const jdUt = jdn - 0.5 + (hour - 7) / 24;
  const year = 2000 + (jdUt - 2451545) / 365.25;
  return jdUt + deltaT(year) / 86400;
}

// Every holy day in a window, with its own tithi and the true one at an hour.
// wanphra.mjs labels them: day n of the month is n (8, 15, 23, 29 or 30).
export function holy(lo, hi) {
  const out = [];
  for (let cs = W.ymdFromJdn(lo).y - 640; cs <= W.ymdFromJdn(hi).y - 637; cs++) {
    for (const h of W.holyDays(cs).days) if (h.wanPhra && h.jdn >= lo && h.jdn <= hi) out.push({ ...h, cs });
  }
  return out.sort((a, b) => a.jdn - b.jdn);
}

// Compare: 'ahead' is the paper's direction, the calendar ahead of the Moon (the
// true tithi less than the day's number, counting 30 then 1 round); 'two' is how
// many of those are two tithis ahead.
export function compare(days, hour) {
  const r = { n: days.length, same: 0, ahead: 0, two: 0, behind: 0, byKind: {} };
  for (const h of days) {
    const t = tithiAt(jdeAt(h.jdn, hour));
    const diff = ((h.day - t + 45) % 30) - 15;   // the calendar's lead, in tithis
    const k = h.day === 8 ? '8' : h.day === 15 ? '15' : h.day === 23 ? '23' : 'last';
    const b = (r.byKind[k] ||= { n: 0, ahead: 0 });
    b.n++;
    if (diff === 0) r.same++;
    else if (diff > 0) { r.ahead++; b.ahead++; if (diff >= 2) r.two++; }
    else r.behind++;
  }
  return r;
}

// The face's line, made from the runs (make-demo.mjs pastes it, test.mjs checks it).
export function faceLine() {
  const at = (y, hr) => compare(holy(W.jdnFromYmd(y, 1, 1), W.jdnFromYmd(y, 12, 31)), hr);
  const [a0, b0, a6, b6] = [at(2013, 0), at(2014, 0), at(2013, 6), at(2014, 6)];
  return 'Checked against a published count. A 2014 paper in the <i>Journal of the Royal Institute of Thailand</i> says the holy days ran ahead of the Moon\'s true lunar day (its <i>tithi</i>, the Moon\'s lead on the Sun in 12° steps) on as many as 24 days of B.E. 2556 and 34 of the 52 of B.E. 2557. '
    + `Reading the true tithi at the midnight each holy day begins, this calendar is ahead on <b>${a0.ahead} of ${a0.n}</b> in 2013 and <b>${b0.ahead} of ${b0.n}</b> in 2014, and behind on ${a0.behind + b0.behind || 'none'}; read at 06:00, ahead on ${a6.ahead} and ${b6.ahead}, behind on ${a6.behind} and ${b6.behind}. `
    + `Read at midnight, every miss is in the paper's direction, and the count rises from one year to the next as theirs does; neither reading gives their numbers. The pages I could read don't say what moment of the day they used, and their total of 52 is one I can't make: 2014 has ${b0.n} holy days here and on two Thai lists.`;
}

export const WINDOWS = [
  { name: 'B.E. 2556 as the year 2013', lo: W.jdnFromYmd(2013, 1, 1), hi: W.jdnFromYmd(2013, 12, 31) },
  { name: 'B.E. 2557 as the year 2014', lo: W.jdnFromYmd(2014, 1, 1), hi: W.jdnFromYmd(2014, 12, 31) },
];
// The lunar years that start at month 5 in those two years.
for (const cs of [1375, 1376]) {
  const lo = W.yearStart(cs);
  const hi = W.yearStart(cs + 1) - 1;
  WINDOWS.push({ name: `the lunar year from month 5, ${W.iso(lo)} to ${W.iso(hi)} (type ${W.yearType(cs)})`, lo, hi });
}
export const HOURS = [0, 6, 12, 24];

if (import.meta.url === `file://${process.argv[1]}`) {
  // Road check: the elongation at each ch. 49 new and full moon should be 0 and 180.
  let worst = 0;
  let n = 0;
  for (let k = 160; k <= 186; k++) {
    for (const [p, want] of [[0, 0], [0.5, 180]]) {
      const jde = W.moonPhaseJde(k, p);
      const off = ((elongation(jde) - want + 540) % 360) - 180;
      worst = Math.max(worst, Math.abs(off));
      n++;
    }
  }
  const span = [W.moonPhaseJde(160, 0), W.moonPhaseJde(186, 0.5)].map((j) => W.iso(Math.floor(j + 0.5))).join(' to ');
  console.log(`road check: the elongation at the ${n} new and full moons from ${span} (Meeus ch. 49, the same moons test.mjs uses) is off by at most ${worst.toFixed(4)} degrees, which is ${(worst / 12.19 * 24 * 60).toFixed(1)} minutes of the Moon's run`);

  for (const w of WINDOWS) {
    const days = holy(w.lo, w.hi);
    console.log(`\n${w.name}: ${days.length} holy days`);
    for (const hr of HOURS) {
      const r = compare(days, hr);
      const kinds = Object.entries(r.byKind).map(([k, b]) => `${k}: ${b.ahead}/${b.n}`).join(', ');
      console.log(`  true tithi at ${String(hr).padStart(2, '0')}:00 Thai time: calendar ahead ${String(r.ahead).padStart(2)} (${r.two} of them by two), same ${String(r.same).padStart(2)}, behind ${String(r.behind).padStart(2)}   (ahead by kind ${kinds})`);
    }
  }

  // The 'other' rows: every holy day of 2013-2014 whose true tithi at 00:00 is
  // more than one away from its day number.
  console.log(`\nmore than one tithi apart at 00:00, 2013-2014:`);
  for (const h of holy(W.jdnFromYmd(2013, 1, 1), W.jdnFromYmd(2014, 12, 31))) {
    const e = elongation(jdeAt(h.jdn, 0));
    const t = Math.floor(e / 12) + 1;
    const diff = ((h.day - t + 45) % 30) - 15;
    if (Math.abs(diff) > 1) console.log(`  ${W.iso(h.jdn)} ${h.label}, month ${h.month} (day ${h.day}): true tithi ${t} (elongation ${e.toFixed(1)} degrees), calendar ahead by ${diff}`);
  }
}
