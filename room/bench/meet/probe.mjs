// probe.mjs: the scratch checks behind the README, kept so they can be rerun.
import { predict, meet, MZ } from './meet.mjs';

// Langacker and Polonsky's 1995 inputs (hep-ph/9503214): 1/alpha = 127.9,
// sin^2 = 0.2316, MS-bar. Their one-loop formula: alpha_s = 7 alpha / (15 s^2 - 3).
const lp1 = 7 / 127.9 / (15 * 0.2316 - 3);
const m = { model: 'mssm' };
const p1 = predict(127.9, 0.2316, { ...m, loops: 1 });
const p2 = predict(127.9, 0.2316, { ...m, loops: 2 });
console.log(`their formula ${lp1.toFixed(4)}; mine at one loop ${p1.toFixed(4)}, two loops ${p2.toFixed(4)}, step ${(p2 - p1).toFixed(4)} (theirs 0.014, total 0.129)`);

// The same, with the DR-bar shift switched off by hand, to see what it is worth.
import { DRBAR } from './meet.mjs';
const keep = DRBAR.slice();
DRBAR.fill(0);
const q1 = predict(127.9, 0.2316, { ...m, loops: 1 }), q2 = predict(127.9, 0.2316, { ...m, loops: 2 });
console.log(`no DR-bar shift: one loop ${q1.toFixed(4)}, two loops ${q2.toFixed(4)}`);
keep.forEach((x, i) => (DRBAR[i] = x));

// How much the third decimal of 1/alpha matters: 127.930 against 127.951.
for (const ainv of [127.930, 127.951]) console.log(`1/alpha ${ainv}: MSSM two-loop prediction ${predict(ainv, 0.23129, { ...m, loops: 2 }).toFixed(4)}`);

// Step size: the two-loop answer at h = 0.1, 0.01, 0.001.
for (const h of [0.5, 0.1, 0.01, 0.001]) {
  const r = meet(127.93, 0.23129, 0.118, { model: 'mssm', loops: 2, h });
  console.log(`h ${h}: t12 ${r.t12.toFixed(6)}, miss ${r.miss.toFixed(6)}`);
}

// Where the superpartners would have to switch on for the three to meet with a
// given alpha_s(MZ), by bisection in ln(M/MZ).
for (const target of [0.1180, 0.1194]) {
  let lo = 0, hi = Math.log(1e5 / MZ);
  const g = (ts) => predict(127.93, 0.23129, { model: 'mssm', loops: 2, tsusy: ts }) - target;
  for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (g(mid) > 0) lo = mid; else hi = mid; }
  console.log(`alpha_s ${target}: superpartners at ${Math.round(MZ * Math.exp((lo + hi) / 2))} GeV`);
}

// The prediction against the superpartner scale.
for (const ms of [MZ, 250, 500, 1000, 3000, 10000]) {
  const p = predict(127.93, 0.23129, { model: 'mssm', loops: 2, tsusy: Math.log(ms / MZ) });
  console.log(`superpartners at ${Math.round(ms)} GeV: alpha_s(MZ) to meet ${p.toFixed(4)}`);
}
