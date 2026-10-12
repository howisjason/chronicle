#!/usr/bin/env node
// yukawa.mjs: the Standard Model's two-loop crossings with the top quark in,
// held against a published run.
//
//   node yukawa.mjs
//
// meet.mjs leaves the top Yukawa out. Here it goes in: at two loops each
// 1/alpha_i gains + c_i yt^2 / (32 pi^3) per unit of t, c = (17/10, 3/2, 2), and
// yt itself runs at one loop,
//   d yt/dt = yt/(16 pi^2) (9/2 yt^2 - 17/20 g1^2 - 9/4 g2^2 - 8 g3^2).
// The start is not mine: it is Buttazzo et al.'s MS-bar couplings at Mt = 173.34
// GeV (arXiv:1307.3536, Table 3 and eqs. 57-60), and the finish line is theirs
// too, their couplings at the Planck mass (eq. 61), from three-loop running. So
// the same start goes up three roads (one loop, two loops gauge only, two loops
// with the top) and lands next to theirs.
import { MODELS, advance } from './meet.mjs';

const { b, bb } = MODELS.sm;
const C = [17 / 10, 3 / 2, 2];
const PI = Math.PI;

// Their start at mu = Mt, alpha_s(MZ) = 0.1184. g1 = sqrt(5/3) gY.
export const MT = 173.34;
export const START = { gY: 0.35830, g2: 0.64779, g3: 1.1666, yt: 0.93690 };
// Their eq. 61, at the Planck mass, M_Pl ~ 1.2e19 GeV (their Figure 2).
export const MPL = 1.22e19;
export const THEIRS = { g1: 0.6154, g2: 0.5055, g3: 0.4873, yt: 0.3825 };

export const ainvOf = (g) => 4 * PI / (g * g);
export const gOf = (ainv) => Math.sqrt(4 * PI / ainv);

// State: [1/alpha_1, 1/alpha_2, 1/alpha_3, yt]. top = false drops the Yukawa
// from the gauge running (yt still runs, but nobody listens).
function slope(s, top) {
  const a = s.slice(0, 3).map((x) => 1 / x);
  const yt2 = s[3] * s[3];
  const d = [0, 1, 2].map((i) => {
    let v = -b[i] / (2 * PI);
    for (let j = 0; j < 3; j++) v -= bb[i][j] * a[j] / (8 * PI * PI);
    if (top) v += C[i] * yt2 / (32 * PI ** 3);
    return v;
  });
  const g2 = a.map((x) => 4 * PI * x);
  d.push(s[3] / (16 * PI * PI) * (4.5 * yt2 - (17 / 20) * g2[0] - (9 / 4) * g2[1] - 8 * g2[2]));
  return d;
}

function rk4(s, h, top) {
  const add = (x, k, f) => x.map((v, i) => v + f * k[i]);
  const k1 = slope(s, top), k2 = slope(add(s, k1, h / 2), top);
  const k3 = slope(add(s, k2, h / 2), top), k4 = slope(add(s, k3, h), top);
  return s.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

export function start() {
  return [ainvOf(Math.sqrt(5 / 3) * START.gY), ainvOf(START.g2), ainvOf(START.g3), START.yt];
}

// Walk from Mt to mu in steps of at most h in t = ln(mu/Mt). Records where each
// pair of gauge lines crosses (linear interpolation inside the step).
export function climb(mu, { top = true, h = 0.001 } = {}) {
  const T = Math.log(mu / MT), n = Math.ceil(T / h), step = T / n;
  const pairs = [[0, 1], [0, 2], [1, 2]], cross = [null, null, null];
  let s = start();
  for (let k = 0; k < n; k++) {
    const nx = rk4(s, step, top);
    pairs.forEach(([i, j], p) => {
      const u = s[i] - s[j], v = nx[i] - nx[j];
      if (cross[p] === null && u * v <= 0 && u !== v) cross[p] = MT * Math.exp((k + u / (u - v)) * step);
    });
    s = nx;
  }
  return { s, g: s.slice(0, 3).map(gOf), yt: s[3], cross };
}

// The one-loop lines, straight, from the same start.
export function oneLoop(mu) {
  const t = Math.log(mu / MT), s = start();
  const a = s.slice(0, 3).map((x, i) => x - b[i] * t / (2 * PI));
  const pairs = [[0, 1], [0, 2], [1, 2]];
  const cross = pairs.map(([i, j]) => MT * Math.exp(2 * PI * (s[i] - s[j]) / (b[i] - b[j])));
  return { g: a.map(gOf), cross };
}

// meet.mjs's gauge-only two-loop walk, from the same start, for the sameness check.
export function viaMeet(mu) {
  return advance(start().slice(0, 3), 0, Math.log(mu / MT), { model: 'sm', loops: 2, h: 0.001 });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sci = (x) => (x === null ? 'never' : x.toExponential(1).replace('e+', 'e') + ' GeV');
  const f4 = (x) => x.toFixed(4);
  console.log(`start at Mt = ${MT} GeV (theirs): g1 ${f4(Math.sqrt(5 / 3) * START.gY)}, g2 ${START.g2}, g3 ${START.g3}, yt ${START.yt}`);
  console.log(`finish at M_Pl = ${MPL.toExponential(2)} GeV\n`);
  const rows = [
    ['one loop', oneLoop(MPL), null],
    ['two loops, gauge only', climb(MPL, { top: false }), null],
    ['two loops, with the top', climb(MPL, { top: true }), 'yt'],
  ];
  console.log('                            g1       g2       g3       yt');
  for (const [name, r, y] of rows) console.log(`${name.padEnd(26)}  ${r.g.map(f4).join('   ')}   ${y ? f4(r.yt) : '  -   '}`);
  console.log(`${'theirs (three loops)'.padEnd(26)}  ${[THEIRS.g1, THEIRS.g2, THEIRS.g3].map(f4).join('   ')}   ${f4(THEIRS.yt)}`);
  console.log('\nwhere the lines cross        1=2          1=3          2=3');
  for (const [name, r] of rows) console.log(`${name.padEnd(26)}  ${r.cross.map(sci).join('  ')}`);
  // Their own Planck values, run back down along straight one-loop lines: a rough
  // second road to where g2 and g3 cross in their run.
  const gap = ainvOf(THEIRS.g3) - ainvOf(THEIRS.g2), rate = (b[1] - b[2]) / (2 * PI);
  console.log(`\ntheirs, g2 and g3 at M_Pl run back down along one-loop lines: cross at ${sci(MPL * Math.exp(-gap / rate))}`);
  console.log('their text: "the weak coupling g2 overcomes the strong coupling at about 10^16 GeV"');
}
