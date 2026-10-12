#!/usr/bin/env node
// meet.mjs: do the three forces meet?
//
// The three gauge couplings of the Standard Model run with energy. Here they are
// run up from the Z mass two ways, one loop in closed form and two loops by
// Runge-Kutta, in the plain Standard Model and with supersymmetry (the MSSM), and
// the script says where the lines cross and by how much they miss.
//
//   node meet.mjs                     the crossings, both models, both roads
//   node meet.mjs 0.1194              the same with another alpha_s(MZ)
//   node meet.mjs 0.1180 1000         superpartners switched on at 1000 GeV
//
// Couplings are carried as inverses, a1 = 1/alpha_1 and so on, because at one
// loop an inverse coupling is a straight line in t = ln(mu/MZ).
// alpha_1 is hypercharge in the GUT normalisation: alpha_1 = (5/3) alpha_Y.

// ---- the arithmetic (demo.html carries a copy of this block) ----
export const MODELS = {
  sm: {
    b: [41 / 10, -19 / 6, -7],
    bb: [[199 / 50, 27 / 10, 44 / 5], [9 / 10, 35 / 6, 12], [11 / 10, 9 / 2, -26]],
  },
  mssm: {
    b: [33 / 5, 1, -3],
    bb: [[199 / 25, 27 / 5, 88 / 5], [9 / 5, 25, 24], [11 / 5, 9, 14]],
  },
};

// MS-bar to DR-bar, the scheme the MSSM is run in: 1/alpha_i drops by C_i/(12 pi),
// C = (0, 2, 3) for U(1), SU(2), SU(3).
export const DRBAR = [0, 2, 3].map((c) => c / (12 * Math.PI));

// The three inverse couplings at MZ from what is measured there.
export function start(ainv, s2, as) {
  return [(3 / 5) * (1 - s2) * ainv, s2 * ainv, 1 / as];
}

// d(1/alpha_i)/dt = -b_i/(2 pi) - sum_j b_ij alpha_j / (8 pi^2)
function slope(m, a, loops) {
  return [0, 1, 2].map((i) => {
    let d = -m.b[i] / (2 * Math.PI);
    if (loops === 2) for (let j = 0; j < 3; j++) d -= m.bb[i][j] / a[j] / (8 * Math.PI * Math.PI);
    return d;
  });
}

function rk4(m, a, h, loops) {
  const k1 = slope(m, a, loops);
  const k2 = slope(m, a.map((x, i) => x + (h / 2) * k1[i]), loops);
  const k3 = slope(m, a.map((x, i) => x + (h / 2) * k2[i]), loops);
  const k4 = slope(m, a.map((x, i) => x + h * k3[i]), loops);
  return a.map((x, i) => x + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

// Carry the inverse couplings a from t0 up to t1 (t1 >= t0).
// model 'sm' or 'mssm'; tsusy (only for 'mssm') is where the superpartners switch
// on: below it the SM runs, and at it 1/alpha drops by the DR-bar shift.
// With tsusy = 0 the MSSM runs from MZ itself, every superpartner at MZ.
export function advance(a, t0, t1, { model = 'sm', loops = 2, h = 0.01, tsusy = 0 } = {}) {
  const leg = (a, m, from, to) => {
    if (to <= from) return a;
    if (loops === 1) return a.map((x, i) => x - m.b[i] * (to - from) / (2 * Math.PI));
    const n = Math.ceil((to - from) / h);
    for (let k = 0; k < n; k++) a = rk4(m, a, (to - from) / n, loops);
    return a;
  };
  if (model === 'sm') return leg(a, MODELS.sm, t0, t1);
  if (t1 <= tsusy) return leg(a, MODELS.sm, t0, t1);
  if (t0 < tsusy) a = leg(a, MODELS.sm, t0, tsusy).map((x, i) => x - DRBAR[i]);
  return leg(a, MODELS.mssm, Math.max(t0, tsusy), t1);
}

// The three inverse couplings at t, starting from a0 at MZ (where the MSSM with
// tsusy = 0 takes its DR-bar shift at once).
export function run(a0, t, opts = {}) {
  const now = opts.model === 'mssm' && !(opts.tsusy > 0) ? a0.map((x, i) => x - DRBAR[i]) : a0.slice();
  return advance(now, 0, t, opts);
}

// One walk up from MZ to 1e22 GeV in strides of 1/2 in t. Where a pair of lines
// changes order inside a stride, the crossing is found by bisection within it.
// t12, t23, t13 are where 1/alpha_1 = 1/alpha_2 and so on (null if never), a12 is
// 1/alpha there, and miss is how far the strong line is from that point (in
// 1/alpha; plus means above it: there the strong force is too weak to meet them).
export function meet(ainv, s2, as, opts = {}) {
  const pairs = [[0, 1], [1, 2], [0, 2]], found = [null, null, null];
  let t = 0, a = run(start(ainv, s2, as), 0, opts), at12 = null;
  while (t < 46 && found.includes(null)) {
    const b = advance(a.slice(), t, t + 0.5, opts);
    pairs.forEach(([i, j], p) => {
      if (found[p] !== null || (a[i] - a[j]) * (b[i] - b[j]) > 0) return;
      let lo = t, hi = t + 0.5;
      for (let k = 0; k < 50; k++) {
        const mid = (lo + hi) / 2, c = advance(a.slice(), t, mid, opts);
        if ((a[i] - a[j]) * (c[i] - c[j]) > 0) lo = mid; else hi = mid;
      }
      found[p] = (lo + hi) / 2;
      if (p === 0) at12 = advance(a.slice(), t, found[0], opts);
    });
    a = b; t += 0.5;
  }
  return { t12: found[0], t23: found[1], t13: found[2], a12: at12 && at12[0], miss: at12 && at12[2] - at12[0] };
}

// The alpha_s(MZ) that would put the strong line through the electroweak
// crossing exactly, by bisection.
export function predict(ainv, s2, opts, lo = 0.05, hi = 0.2) {
  const g = (as) => meet(ainv, s2, as, opts).miss;
  let gl = g(lo);
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2, gm = g(mid);
    if (gl * gm <= 0) hi = mid; else { lo = mid; gl = gm; }
  }
  return (lo + hi) / 2;
}
// ---- end of the arithmetic ----

// Measured at MZ, MS-bar, as cited by the Particle Data Group's 2024 review.
export const MZ = 91.188;
export const AINV = 127.930;
export const S2 = 0.23129;
export const AS = 0.1180;

export const gev = (t) => MZ * Math.exp(t);
const sci = (x) => x.toExponential(1).replace('e+', 'e');

function report(as, msusy) {
  const tsusy = msusy ? Math.log(msusy / MZ) : 0;
  console.log(`inputs at MZ = ${MZ} GeV: 1/alpha = ${AINV}, sin^2 theta_W = ${S2}, alpha_s = ${as}`);
  console.log(`start: 1/alpha_1, 1/alpha_2, 1/alpha_3 = ${start(AINV, S2, as).map((x) => x.toFixed(3)).join(', ')}`);
  console.log(`superpartners switched on at ${msusy ? msusy + ' GeV' : 'MZ'}\n`);
  for (const model of ['sm', 'mssm']) {
    for (const loops of [1, 2]) {
      const o = { model, loops, tsusy };
      const r = meet(AINV, S2, as, o);
      const p = predict(AINV, S2, o);
      const c = (t) => (t === null ? 'never' : sci(gev(t)) + ' GeV');
      console.log(`${model.toUpperCase().padEnd(4)} ${loops} loop${loops > 1 ? 's' : ' '}  ` +
        `1=2 at ${c(r.t12)}, 2=3 at ${c(r.t23)}, 1=3 at ${c(r.t13)}`);
      console.log(`              at 1=2, 1/alpha = ${r.a12.toFixed(2)}; the strong line misses by ${r.miss >= 0 ? '+' : ''}${r.miss.toFixed(2)}`);
      console.log(`              to meet exactly, alpha_s(MZ) would be ${p.toFixed(4)}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const as = process.argv[2] ? Number(process.argv[2]) : AS;
  const msusy = process.argv[3] ? Number(process.argv[3]) : 0;
  if (!(as > 0.05 && as < 0.2)) { console.log('alpha_s(MZ) should be between 0.05 and 0.2'); process.exit(2); }
  if (msusy && !(msusy >= MZ && msusy < 1e15)) { console.log('the superpartner scale should be between MZ and 1e15 GeV'); process.exit(2); }
  report(as, msusy);
}
