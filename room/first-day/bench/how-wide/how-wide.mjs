#!/usr/bin/env node
// how-wide.mjs: the Higgs boson's width in the Standard Model, built channel by
// channel, against the LHC Higgs Cross Section Working Group's table (YR4).
//
//   node how-wide.mjs           the channels at 125.09 GeV, beside YR4's
//   node how-wide.mjs 130       another Higgs mass (no YR4 column then)
//
// The arithmetic between the two markers below is copied into demo.html, and
// test.mjs checks the copy character for character.

// ---- the arithmetic
const PI = Math.PI, Z3 = 1.2020569, Z4 = 1.0823232, Z5 = 1.0369278;

// Inputs: YR4's own (LHCHXSWG-INT-2015-006), except where it says otherwise.
const IN = {
  GF: 1.1663787e-5, MZ: 91.1876, GZ: 2.4952, MW: 80.385, GW: 2.085,
  asMZ: 0.118, mbmb: 4.18, mc3: 0.986, mt: 172.5,
  mtau: 1.77682, mmu: 0.1056584, alpha0: 1 / 137.035999,
  mbPole: 4.92, mcPole: 1.51,   // the masses inside the gg and gamma-gamma loops only
};

// QCD in a = alpha_s/pi. da/dln(mu^2) = -sum b_i a^(i+2); dln m/dln(mu^2) = -sum g_i a^(i+1).
function betas(nf) {
  return [
    (11 - 2 * nf / 3) / 4,
    (102 - 38 * nf / 3) / 16,
    (2857 / 2 - 5033 * nf / 18 + 325 * nf * nf / 54) / 64,
    ((149753 / 6 + 3564 * Z3) - (1078361 / 162 + 6508 * Z3 / 27) * nf
      + (50065 / 162 + 6472 * Z3 / 81) * nf * nf + 1093 * nf ** 3 / 729) / 256,
  ];
}
function gammas(nf) {
  return [
    1,
    (202 / 3 - 20 * nf / 9) / 16,
    (1249 + (-2216 / 27 - 160 * Z3 / 3) * nf - 140 * nf * nf / 81) / 64,
    (4603055 / 162 + 135680 * Z3 / 27 - 8800 * Z5
      + (-91723 / 27 - 34192 * Z3 / 9 + 880 * Z4 + 18400 * Z5 / 9) * nf
      + (5242 / 243 + 800 * Z3 / 9 - 160 * Z4 / 3) * nf * nf
      + (-332 / 243 + 64 * Z3 / 27) * nf ** 3) / 256,
  ];
}

// Walk alpha_s (as a = alpha_s/pi) and a running mass m from mu0 to mu1 with nf
// flavours, four loops, RK4 in ln(mu^2). Works up or down. Returns [a, m].
function walk(a, m, mu0, mu1, nf) {
  const b = betas(nf), g = gammas(nf);
  const f = (a) => [-(b[0] + (b[1] + (b[2] + b[3] * a) * a) * a) * a * a,
                    -(g[0] + (g[1] + (g[2] + g[3] * a) * a) * a) * a];
  const t0 = Math.log(mu0 * mu0), t1 = Math.log(mu1 * mu1);
  const n = Math.max(20, Math.ceil(Math.abs(t1 - t0) * 200)), h = (t1 - t0) / n;
  let lm = Math.log(m);
  for (let i = 0; i < n; i++) {
    const k1 = f(a), k2 = f(a + h / 2 * k1[0]), k3 = f(a + h / 2 * k2[0]), k4 = f(a + h * k3[0]);
    a += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    lm += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  }
  return [a, Math.exp(lm)];
}

// The running couplings and masses the decays need at the scale mu (= mH).
// The b threshold sits at m_b(m_b), where the two-loop matching terms are
// 11/72 a^2 for alpha_s and 89/432 a^2 for the charm mass.
function qcd(mu, P = IN) {
  const aMZ = P.asMZ / PI;
  const [aH, mbH] = walk(aMZ, 1, P.MZ, mu, 5);            // alpha_s at mu
  const [ab5] = walk(aMZ, 1, P.MZ, P.mbmb, 5);             // alpha_s^(5) at m_b
  const [, mb] = walk(ab5, P.mbmb, P.mbmb, mu, 5);         // m_b(mu)
  const ab4 = ab5 * (1 + 11 / 72 * ab5 * ab5);             // alpha_s^(4) at m_b
  const [a3] = walk(ab4, 1, P.mbmb, 3, 4);                 // alpha_s^(4) at 3 GeV
  const [ab4b, mc4] = walk(a3, P.mc3, 3, P.mbmb, 4);       // m_c^(4) at m_b
  const mc5 = mc4 / (1 + 89 / 432 * ab4b * ab4b);
  const [, mc] = walk(ab5, mc5, P.mbmb, mu, 5);            // m_c(mu)
  return { as: aH * PI, a: aH, mb, mc, ab5, mbH };
}

// Loop functions, tau = 4 m^2 / mH^2, as [re, im].
function fTau(t) {
  if (t >= 1) { const s = Math.asin(1 / Math.sqrt(t)); return [s * s, 0]; }
  const r = Math.sqrt(1 - t), L = Math.log((1 + r) / (1 - r));
  return [-(L * L - PI * PI) / 4, PI * L / 2];               // -1/4 [L - i pi]^2
}
const Ahalf = (t) => { const f = fTau(t); return [2 * t * (1 + (1 - t) * f[0]), 2 * t * (1 - t) * f[1]]; };   // -> 4/3
const Aone = (t) => { const f = fTau(t); return [-(2 + 3 * t + 3 * t * (2 - t) * f[0]), -3 * t * (2 - t) * f[1]]; }; // -> -7

// Two fermions: Nc GF mH m^2/(4 sqrt2 pi) beta^3, with the QCD factor for quarks.
function ffbar(mH, m, nc, P = IN) {
  const x = 4 * m * m / (mH * mH);
  return x >= 1 ? 0 : nc * P.GF * mH * m * m / (4 * Math.SQRT2 * PI) * (1 - x) ** 1.5;
}
function quark(mH, mRun, q, P = IN) {
  const a = q.a, nf = 5;
  const dqcd = 5.667 * a + (35.94 - 1.359 * nf) * a * a + (164.14 - 25.77 * nf + 0.259 * nf * nf) * a ** 3;
  const dtop = a * a * (1.57 - 2 / 3 * Math.log(mH * mH / (P.mt * P.mt)) + Math.log(mRun * mRun / (mH * mH)) ** 2 / 9);
  return ffbar(mH, mRun, 3, P) * (1 + dqcd + dtop);
}

// H -> V V*, both bosons allowed off shell: two Breit-Wigners, each mapped onto
// an angle so the peak is flat (q^2 = M^2 + M G tan th). delta = 2 for W, 1 for Z.
function vv(mH, M, G, delta, P = IN, n = 400) {
  const pre = delta * P.GF * mH ** 3 / (16 * Math.SQRT2 * PI);
  const th = (q2) => Math.atan((q2 - M * M) / (M * G));
  const q2of = (t) => M * M + M * G * Math.tan(t);
  const lo = th(0);
  // Gauss-Legendre-like midpoints are enough once the peak is flattened.
  const mid = (a, b, k, fn) => { let s = 0; const h = (b - a) / k; for (let i = 0; i < k; i++) s += fn(a + (i + 0.5) * h); return s * h; };
  const outer = (t1) => {
    const q1sq = q2of(t1), q1 = Math.sqrt(q1sq);
    const x1 = q1sq / (mH * mH), top2 = (mH - q1) ** 2;
    return mid(lo, th(top2), n, (t2) => {
      const x2 = q2of(t2) / (mH * mH), l = (1 - x1 - x2) ** 2 - 4 * x1 * x2;
      return l <= 0 ? 0 : Math.sqrt(l) * (l + 12 * x1 * x2);
    });
  };
  return pre * mid(lo, th(mH * mH), n, outer) / (PI * PI);
}

// H -> gg: the exact LO loop, times the heavy-top K factor to NNLO (nf = 5).
function gg(mH, q, P = IN, order = 2) {
  const s = [P.mt, P.mbPole, P.mcPole].map((m) => Ahalf(4 * m * m / (mH * mH)));
  const re = 0.75 * (s[0][0] + s[1][0] + s[2][0]), im = 0.75 * (s[0][1] + s[1][1] + s[2][1]);
  const lo = P.GF * q.as ** 2 * mH ** 3 / (36 * Math.SQRT2 * PI ** 3) * (re * re + im * im);
  const k = [1, 95 / 4 - 7 / 6 * 5, 156.808 - 5.708 * Math.log(P.mt * P.mt / (mH * mH))];
  let K = 0; for (let i = 0; i <= order; i++) K += k[i] * q.a ** i;
  return lo * K;
}

// H -> gamma gamma: W, top, b, c and tau loops, alpha at zero momentum (real
// photons); the top loop gets its small QCD factor (1 - a).
function yy(mH, q, P = IN) {
  const A = (m, nc, Q, kq = 1) => Ahalf(4 * m * m / (mH * mH)).map((v) => nc * Q * Q * v * kq);
  const parts = [Aone(4 * P.MW * P.MW / (mH * mH)), A(P.mt, 3, 2 / 3, 1 - q.a),
    A(P.mbPole, 3, -1 / 3), A(P.mcPole, 3, 2 / 3), A(P.mtau, 1, -1)];
  const re = parts.reduce((s, p) => s + p[0], 0), im = parts.reduce((s, p) => s + p[1], 0);
  return P.GF * P.alpha0 ** 2 * mH ** 3 / (128 * Math.SQRT2 * PI ** 3) * (re * re + im * im);
}

// Every channel, in GeV, at Higgs mass mH.
function widths(mH, P = IN, n = 400) {
  const q = qcd(mH, P);
  const w = {
    bb: quark(mH, q.mb, q, P),
    WW: vv(mH, P.MW, P.GW, 2, P, n),
    gg: gg(mH, q, P),
    tautau: ffbar(mH, P.mtau, 1, P),
    cc: quark(mH, q.mc, q, P),
    ZZ: vv(mH, P.MZ, P.GZ, 1, P, n),
    gamgam: yy(mH, q, P),
    mumu: ffbar(mH, P.mmu, 1, P),
  };
  const total = Object.values(w).reduce((s, x) => s + x, 0);
  return { w, total, q };
}
// ---- end of the arithmetic

export { IN, betas, gammas, walk, qcd, fTau, Ahalf, Aone, ffbar, quark, vv, gg, yy, widths };

// YR4 at mH = 125.09 GeV (twiki LHCPhysics/CERNYellowReportPageBR).
export const YR4 = {
  mH: 125.09, total: 4.100e-3,
  br: { bb: 5.809e-1, WW: 2.152e-1, gg: 8.180e-2, tautau: 6.256e-2, cc: 2.884e-2,
        ZZ: 2.641e-2, gamgam: 2.270e-3, mumu: 2.171e-4, Zgam: 1.541e-3 },
};
export const HBAR = 6.582119569e-22;   // MeV s

if (import.meta.url === `file://${process.argv[1]}`) {
  const mH = Number(process.argv[2] || YR4.mH), withYR4 = mH === YR4.mH;
  const { w, total, q } = widths(mH, IN, 600);
  const kev = (x) => (x * 1e6).toFixed(1).padStart(7);
  console.log(`Higgs mass ${mH} GeV. alpha_s(mH) = ${q.as.toFixed(4)}, m_b(mH) = ${q.mb.toFixed(3)} GeV, m_c(mH) = ${q.mc.toFixed(3)} GeV\n`);
  console.log(withYR4 ? 'channel   width keV   BR mine    BR YR4    mine/YR4 width' : 'channel   width keV   BR');
  for (const [k, x] of Object.entries(w)) {
    const line = `${k.padEnd(8)} ${kev(x)}    ${(x / total).toExponential(3)}`;
    if (!withYR4) { console.log(line); continue; }
    const theirs = YR4.br[k] * YR4.total;
    console.log(`${line}  ${YR4.br[k].toExponential(3)}   ${(x / theirs).toFixed(3)}`);
  }
  if (withYR4) console.log(`Zgam      (left out)              ${YR4.br.Zgam.toExponential(3)}`);
  console.log(`\ntotal    ${(total * 1e3).toFixed(3)} MeV` + (withYR4 ? `   YR4 ${(YR4.total * 1e3).toFixed(3)} MeV   ratio ${(total / YR4.total).toFixed(3)}` : ''));
  console.log(`lifetime ${(HBAR / (total * 1e3)).toExponential(2)} s`);
}
