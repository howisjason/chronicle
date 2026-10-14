// tithi1954.mjs: an Indian source for what a tithi is, from its own printed page.
// The Report of the Calendar Reform Committee (Government of India, 1955), p. 3
// (archive.org item calendar_reform_comittee_report, leaf n14), prints a table,
// "Ending Moments of Tithis": eleven tithis from 27 September to 26 October 1954,
// "Modern" beside "Old Method", both in Indian Standard Time, and the old method's
// error. I read every number twice off the page image (the whole page, then the
// table zoomed), not through OCR.
//
// This checks the Modern column against this build's Sun and Moon (count.mjs:
// Meeus ch. 25 and 47), and the ends of tithis 15 and 30 against the full and new
// moons from wanphra.mjs (Meeus ch. 49), a separate road to the same moments.
//   bash room/tools/try.sh wan-phra tithi1954.mjs
import * as W from './wanphra.mjs';
import * as C from './count.mjs';

// [month, day, tithi, Modern h, m, Old Method h, m, error sign, h, m], as printed.
// An hour past 24 is the page's way of writing a time after the next midnight.
export const ROWS_1954 = [
  [9, 27, 30, 6, 20, 5, 4, -1, 1, 16],
  [9, 30, 3, 12, 50, 10, 24, -1, 2, 26],
  [10, 3, 6, 20, 21, 16, 7, -1, 4, 14],
  [10, 6, 9, 24, 3, 18, 31, -1, 5, 32],
  [10, 9, 12, 20, 20, 16, 30, -1, 3, 50],
  [10, 12, 15, 10, 40, 11, 2, 1, 0, 22],
  [10, 14, 18, 23, 36, 27, 57, 1, 4, 21],
  [10, 17, 21, 15, 47, 21, 25, 1, 5, 38],
  [10, 20, 24, 13, 44, 17, 26, 1, 3, 42],
  [10, 23, 27, 16, 55, 17, 39, 1, 0, 44],
  [10, 26, 30, 23, 17, 22, 8, -1, 1, 9],
];

const IST = 5.5;
// The build's ΔT (wanphra.mjs), fitted for 2005-2050. In 1954 it gives about
// 60 s. If the true value then was nearer 31 s (a what-if, not checked here),
// every time below moves about half a minute LATER, so rows() can take a fixed
// ΔT in seconds to show that case too.
const deltaT = (year) => { const t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; };
let fixedDt = null;
const dT = (jdUt) => (fixedDt ?? deltaT(2000 + (jdUt - 2451545) / 365.25)) / 86400;
const midnightIst = (mo, d) => W.jdnFromYmd(1954, mo, d) - 0.5 - IST / 24; // JD (UT)

// When the Moon's lead on the Sun reaches 12n degrees, as minutes past the
// printed date's IST midnight. It searches the printed date and the day after
// it, hour by hour, then halves the hour; it never looks at the printed minute.
export function tithiEnd(mo, d, n) {
  const day0 = midnightIst(mo, d);
  const target = (12 * n) % 360;
  const lead = (jd) => ((C.elongation(jd + dT(jd)) - target + 540) % 360) - 180;
  for (let t = day0; t < day0 + 2; t += 1 / 24) {
    if (lead(t) < 0 && lead(t + 1 / 24) >= 0) {
      let a = t, b = t + 1 / 24;
      for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (lead(m) < 0) a = m; else b = m; }
      return ((a + b) / 2 - day0) * 1440;
    }
  }
  return null;
}

// The ch. 49 new or full moon nearest a moment, as minutes past that IST midnight.
export function phaseNear(mo, d, phase) {
  const day0 = midnightIst(mo, d);
  const k = Math.floor((day0 - 2451550.09766) / 29.530588861);
  let best = null;
  for (let kk = k - 1; kk <= k + 2; kk++) {
    const jde = W.moonPhaseJde(kk, phase);
    const min = (jde - dT(jde) - day0) * 1440;
    if (best === null || Math.abs(min - 720) < Math.abs(best - 720)) best = min;
  }
  return best;
}

// dtSeconds: null for the build's ΔT, or a fixed ΔT in seconds (the what-if).
export function rows(dtSeconds = null) {
  fixedDt = dtSeconds;
  const out = ROWS_1954.map(([mo, d, n, mh, mm, oh, om, sg, eh, em]) => {
    const printed = mh * 60 + mm, old = oh * 60 + om;
    const mine = tithiEnd(mo, d, n);
    const phase = n === 15 ? phaseNear(mo, d, 0.5) : n === 30 ? phaseNear(mo, d, 0) : null;
    return { mo, d, n, printed, old, err: sg * (eh * 60 + em), mine, phase };
  });
  fixedDt = null;
  return out;
}
export const WHAT_IF_DT = 31;

// The line on the face, built from the run (test.mjs checks the face carries it).
export function faceLine1954() {
  const r = rows();
  const worst = Math.max(...[null, WHAT_IF_DT].flatMap((dt) => rows(dt).map((x) => Math.abs(x.mine - x.printed))));
  const full = r.find((x) => x.n === 15);
  return `<b>What a tithi is, in print.</b> India's Calendar Reform Committee (report of 1955, p. 3) printed when ${r.length} tithis ended in September and October 1954. This page's Sun and Moon land within ${worst < 1.5 ? 'a minute and a half' : `${worst.toFixed(1)} minutes`} of all ${r.length}, and the fifteenth ends at ${hm(full.printed)} IST on 12 October, within a minute of the full moon. Whether the Thai calendar means its waxing 15 that way, no source I have read says.`;
}

const hm = (min) => { const r = Math.round(min); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; };

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Ending moments of tithis, Sept-Oct 1954, IST (Calendar Reform Committee report, 1955, p. 3)');
  console.log('date     tithi  printed  this build  gap (min)   old method  printed error  old - printed');
  for (const r of rows()) {
    const gap = r.mine - r.printed;
    console.log(`${r.mo === 9 ? 'Sept' : 'Oct '} ${String(r.d).padStart(2)}  ${String(r.n).padStart(5)}  ${hm(r.printed).padStart(7)}  ${hm(r.mine).padStart(10)}  ${gap.toFixed(2).padStart(9)}   ${hm(r.old).padStart(10)}  ${(r.err < 0 ? '-' : '+') + hm(Math.abs(r.err))}`.padEnd(85) + `${(r.old - r.printed < 0 ? '-' : '+') + hm(Math.abs(r.old - r.printed))}`);
  }
  console.log('\nThe ends of tithis 15 and 30 against the full and new moons of Meeus ch. 49:');
  for (const r of rows().filter((x) => x.phase !== null)) {
    console.log(`  ${r.mo === 9 ? 'Sept' : 'Oct'} ${r.d}, tithi ${r.n} ends at ${hm(r.printed)} printed; the ${r.n === 15 ? 'full' : 'new'} moon is at ${hm(r.phase)} (${(r.phase - r.printed).toFixed(2)} min)`);
  }
  const w = rows(WHAT_IF_DT);
  console.log(`\nWhat if ΔT in 1954 was ${WHAT_IF_DT} s, not the build's ${deltaT(1954.8).toFixed(1)} s (a what-if, not checked):`);
  console.log(`  gaps (min): ${w.map((x) => (x.mine - x.printed).toFixed(2)).join(' ')}`);
  console.log(`  worst ${Math.max(...w.map((x) => Math.abs(x.mine - x.printed))).toFixed(2)}; phases against print: ${w.filter((x) => x.phase !== null).map((x) => (x.phase - x.printed).toFixed(2)).join(' ')}`);
}
