// lean.mjs: why does the Thai full-moon day come before the sky's full moon so
// much more often than after it? Measure where the moon sits inside the
// calendar's days, month by month, 1996 to 2031.
//   bash room/tools/try.sh wan-phra lean.mjs
import * as W from './wanphra.mjs';

const rad = Math.PI / 180;
const deltaT = (year) => { const t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; };
// Thai civil-day number, fractional: day J runs from J to J+1.
const thaiOf = (jde) => {
  const year = 2000 + (jde - 2451545) / 365.25;
  return jde - deltaT(year) / 86400 + 0.5 + 7 / 24;
};
// Meeus 49.1 alone: the MEAN phase, before the periodic terms (the true
// moon wobbles about it by up to ~14 hours).
const meanJde = (k) => {
  const T = k / 1236.85;
  return 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T
    - 0.000000150 * T ** 3 + 0.00000000073 * T ** 4;
};
const kNear = (t) => Math.round((t - 2451550.59766 - 7 / 24) / 29.530588861);

// Every month of every lunar year whose first day falls in the window.
export function months(cs0 = 1357, cs1 = 1393) {
  const out = [];
  for (let cs = cs0; cs <= cs1; cs++) {
    const type = W.yearType(cs);
    let j = W.yearStart(cs);
    for (const [label, len] of W.monthsOf(type)) {
      const d15 = j + 14;
      // the full moon nearest the middle of waxing 15, and the new moon before day 1
      const kf = kNear(d15 + 0.5 - 14.765);
      const full = { true: thaiOf(W.moonPhaseJde(kf, 0.5)), mean: thaiOf(meanJde(kf + 0.5)) };
      const kn = kNear(j);
      const nw = { true: thaiOf(W.moonPhaseJde(kn, 0)), mean: thaiOf(meanJde(kn)) };
      out.push({ cs, type, label, len, day1: j, d15,
        full: { true: full.true - d15, mean: full.mean - d15 },  // days past the start of waxing 15
        nw: { true: nw.true - j, mean: nw.mean - j } });           // days past the start of day 1
      j += len;
    }
  }
  return out;
}

const all = months().filter((m) => {
  const y = W.ymdFromJdn(m.d15).y;
  return y >= 1996 && y <= 2031;
});
const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return { n: s.length, mean, min: s[0], max: s[s.length - 1], med: s[s.length >> 1] };
};
const h = (d) => `${(d * 24).toFixed(1)} h`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const tf = stats(all.map((m) => m.full.true));
  const mf = stats(all.map((m) => m.full.mean));
  const tn = stats(all.map((m) => m.nw.true));
  const mn = stats(all.map((m) => m.nw.mean));
  const inDay = (x) => x >= 0 && x < 1;
  console.log(`full-moon days (waxing 15), 1996-2031: ${all.length}`);
  console.log(`  true full moon:  on the day ${all.filter((m) => inDay(m.full.true)).length}, after it ${all.filter((m) => m.full.true >= 1).length}, before it ${all.filter((m) => m.full.true < 0).length}`);
  console.log(`  mean full moon:  on the day ${all.filter((m) => inDay(m.full.mean)).length}, after it ${all.filter((m) => m.full.mean >= 1).length}, before it ${all.filter((m) => m.full.mean < 0).length}`);
  console.log(`\nwhere the moon falls, measured from the START of the calendar day (0 to 24 h = on the day):`);
  console.log(`  true full moon from waxing 15: mean ${h(tf.mean)}, median ${h(tf.med)}, range ${h(tf.min)} to ${h(tf.max)}`);
  console.log(`  mean full moon from waxing 15: mean ${h(mf.mean)}, median ${h(mf.med)}, range ${h(mf.min)} to ${h(mf.max)}`);
  console.log(`  true new moon from day 1:      mean ${h(tn.mean)}, median ${h(tn.med)}, range ${h(tn.min)} to ${h(tn.max)}`);
  console.log(`  mean new moon from day 1:      mean ${h(mn.mean)}, median ${h(mn.med)}, range ${h(mn.min)} to ${h(mn.max)}`);

  // the dark-moon holy day is the last day of the month, the day before day 1
  const nOn1 = all.filter((m) => inDay(m.nw.true)).length;
  const nOnLast = all.filter((m) => m.nw.true >= -1 && m.nw.true < 0).length;
  console.log(`\nthe true new moon falls on day 1 (waxing 1) ${nOn1} times, on the last day of the month before (the dark-moon holy day) ${nOnLast}, elsewhere ${all.length - nOn1 - nOnLast}`);
  console.log(`  the mean full moon minus the mean new moon, in this calendar's days: 14 d ${h(mf.mean - mn.mean)} (Meeus's mean half-month is 14 d ${h(29.530588861 / 2 - 14)})`);

  // if the holy day were a 24-hour window starting at another hour, how many true full moons would it catch?
  const catches = (start) => all.filter((m) => m.full.true * 24 >= start && m.full.true * 24 < start + 24).length;
  let best = 0;
  for (let s = 0; s < 24; s++) if (catches(s) > catches(best)) best = s;
  console.log(`\na 24-hour holy day starting at a different hour (Thai clock) would catch:`);
  for (const s of [0, 6, 12, best]) console.log(`  from ${String(s).padStart(2, '0')}:00 to ${String(s).padStart(2, '0')}:00: ${catches(s)} of ${all.length}${s === best ? '  (the most of any whole hour)' : ''}`);

  // the sawtooth: the mean full moon against the calendar, one line per lunar year
  console.log(`\nper lunar year: type, mean full moon from the start of waxing 15 (first month .. last month)`);
  for (let cs = 1358; cs <= 1393; cs++) {
    const ms = all.filter((m) => m.cs === cs);
    if (!ms.length) continue;
    const t = W.yearType(cs);
    const s = W.suriyayatra(cs);
    console.log(`  CS ${cs} (${W.ymdFromJdn(ms[0].day1).y}) ${t}  avoman ${String(s.avoman).padStart(3)}  ${h(ms[0].full.mean).padStart(7)} .. ${h(ms[ms.length - 1].full.mean).padStart(7)}`);
  }
}
