// test.mjs: the self-test for meet.mjs.   node test.mjs
import { readFileSync } from 'node:fs';
import { MODELS, DRBAR, start, run, meet, predict, MZ, AINV, S2, AS } from './meet.mjs';

let pass = 0, fail = 0;
const ok = (c, what) => { c ? pass++ : fail++; console.log(`${c ? 'pass' : 'FAIL'}  ${what}`); };
const near = (x, y, tol) => Math.abs(x - y) <= tol;
const a0 = start(AINV, S2, AS);

// 1. The start: alpha_1 = (5/3) alpha / cos^2, alpha_2 = alpha / sin^2.
ok(near(1 / a0[0], (5 / 3) / AINV / (1 - S2), 1e-15) && near(1 / a0[1], 1 / AINV / S2, 1e-15),
  `the start is the GUT-normalised hypercharge and the weak coupling (${a0.map((x) => x.toFixed(3)).join(', ')})`);

// 2. One loop, against the straight lines solved by hand: where two lines
// a_i - b_i x = a_j - b_j x cross, x = t/(2 pi) = (a_i - a_j)/(b_i - b_j).
for (const model of ['sm', 'mssm']) {
  const s = model === 'mssm' ? a0.map((x, i) => x - DRBAR[i]) : a0;
  const b = MODELS[model].b, r = meet(AINV, S2, AS, { model, loops: 1 });
  const hand = [[0, 1], [1, 2], [0, 2]].map(([i, j]) => 2 * Math.PI * (s[i] - s[j]) / (b[i] - b[j]));
  ok(near(r.t12, hand[0], 1e-9) && near(r.t23, hand[1], 1e-9) && near(r.t13, hand[2], 1e-9),
    `${model} one loop: the crossings are where the straight lines cross by hand`);
}

// 3. The SM at one loop misses badly and the MSSM nearly meets: the 1991 picture.
const sm1 = meet(AINV, S2, AS, { model: 'sm', loops: 1 }), ms1 = meet(AINV, S2, AS, { model: 'mssm', loops: 1 });
ok(Math.log10((MZ * Math.exp(sm1.t23)) / (MZ * Math.exp(sm1.t12))) > 3, `SM one loop: the crossings spread over more than 3 decades (${(Math.log10(Math.exp(sm1.t23 - sm1.t12))).toFixed(1)})`);
ok(Math.log10(Math.exp(ms1.t23 - ms1.t12)) < 0.2 && near(Math.log10(MZ * Math.exp(ms1.t12)), 16.3, 0.3),
  `MSSM one loop: all three within 0.2 decades, near 2e16 GeV (${(MZ * Math.exp(ms1.t12)).toExponential(1)})`);

// 4. Langacker and Polonsky's one-loop formula (hep-ph/9503214, eq. 2):
// alpha_s = 7 alpha / (15 sin^2 - 3), for the MSSM with no DR-bar shift. Mine has
// the shift, which is worth about 1e-4 here.
for (const [ainv, s2] of [[127.9, 0.2316], [AINV, S2]]) {
  const f = 7 / ainv / (15 * s2 - 3), p = predict(ainv, s2, { model: 'mssm', loops: 1 });
  ok(near(p, f, 3e-4), `one-loop MSSM prediction ${p.toFixed(4)} against their formula ${f.toFixed(4)} (1/alpha ${ainv}, sin^2 ${s2})`);
}

// 5. Two loops, against their published 0.129 on their inputs (their total, with
// a two-loop gauge step of 0.014 and a Yukawa piece between -0.003 and 0 that I
// leave out).
const p1 = predict(127.9, 0.2316, { model: 'mssm', loops: 1 }), p2 = predict(127.9, 0.2316, { model: 'mssm', loops: 2 });
ok(near(p2, 0.129, 0.002), `two-loop MSSM prediction on their inputs ${p2.toFixed(4)}, theirs 0.129`);
ok(near(p2 - p1, 0.014, 0.0015), `the two-loop step ${(p2 - p1).toFixed(4)}, theirs 0.014`);

// 6. Two loops, against a second road: the two-loop terms integrated by hand
// along the one-loop lines, 1/alpha_i(t) = one-loop line + sum_j b_ij/(4 pi b_j)
// ln(a_j(t)/a_j(0)). It drops terms of the next order, so it should agree to a
// few hundredths, and not exactly.
for (const model of ['sm', 'mssm']) {
  const { b, bb } = MODELS[model], t = 33;
  const s = model === 'mssm' ? a0.map((x, i) => x - DRBAR[i]) : a0;
  const line = s.map((x, j) => x - b[j] * t / (2 * Math.PI));
  const hand = s.map((x, i) => line[i] + [0, 1, 2].reduce((sum, j) => sum + bb[i][j] / (4 * Math.PI * b[j]) * Math.log(line[j] / s[j]), 0));
  const rk = run(a0, t, { model, loops: 2 });
  const gap = Math.max(...rk.map((x, i) => Math.abs(x - hand[i])));
  const twoLoop = Math.max(...rk.map((x, i) => Math.abs(x - line[i])));
  ok(gap < 0.05 && gap < twoLoop / 10, `${model} at t = 33: Runge-Kutta and the hand integral agree to ${gap.toFixed(3)}, where two loops moved things by ${twoLoop.toFixed(2)}`);
}

// 7. Two loops with the two-loop matrix emptied is one loop again.
const keep = MODELS.mssm.bb;
MODELS.mssm.bb = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
const z2 = run(a0, 30, { model: 'mssm', loops: 2 }), z1 = run(a0, 30, { model: 'mssm', loops: 1 });
MODELS.mssm.bb = keep;
ok(z2.every((x, i) => near(x, z1[i], 1e-10)), 'with the two-loop matrix emptied, two loops is one loop');

// 8. The step size. The lines are so smooth that the walk's strides of 1/2 are
// already as good as a step of 0.001, so to see that h is used at all, take one
// step from MZ to 2e16 GeV (t = 33) and watch it miss; then 0.1 against 0.001
// must not.
const one = run(a0, 33, { model: 'mssm', h: 33 }), many = run(a0, 33, { model: 'mssm', h: 0.001 });
const d = Math.max(...one.map((x, i) => Math.abs(x - many[i])));
ok(d > 1e-4, `one step of 33 is off by ${d.toExponential(1)}, so the step is used`);
const at = (h) => meet(AINV, S2, AS, { model: 'mssm', loops: 2, h });
const mid = at(0.1), fine = at(0.001);
ok(near(mid.miss, fine.miss, 1e-6) && near(mid.t12, fine.t12, 1e-6), 'steps of 0.1 and 0.001 agree to a millionth');

// 9. The superpartner step: switched on at MZ it is the plain MSSM; switched on
// above the crossings it is the plain SM.
const s0 = run(a0, 30, { model: 'mssm', tsusy: 0 }), sz = run(a0, 30, { model: 'mssm', tsusy: 1e-12 });
ok(s0.every((x, i) => near(x, sz[i], 1e-6)), 'superpartners at MZ and just above MZ agree');
const hi = run(a0, 30, { model: 'mssm', tsusy: 40 }), sm = run(a0, 30, { model: 'sm' });
ok(hi.every((x, i) => x === sm[i]), 'superpartners above 1e19 GeV leave the SM untouched below');
const ps = [0, Math.log(1000 / MZ), Math.log(1e4 / MZ)].map((tsusy) => predict(AINV, S2, { model: 'mssm', loops: 2, tsusy }));
ok(ps[0] > ps[1] && ps[1] > ps[2], `heavier superpartners need a smaller alpha_s to meet (${ps.map((p) => p.toFixed(4)).join(' > ')})`);

// 10. The third decimal of 1/alpha (127.930 in PDG 2024 against 127.951 in
// earlier editions) does not move the answer at the printed precision.
ok(near(predict(127.951, S2, { model: 'mssm' }), predict(AINV, S2, { model: 'mssm' }), 5e-5), 'the third decimal of 1/alpha does not show');

// 11. demo.html carries its own copy of the arithmetic; it must be this one.
const src = readFileSync(new URL('./meet.mjs', import.meta.url), 'utf8');
const cut = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b); return i < 0 || j < 0 ? '' : s.slice(s.indexOf('\n', i) + 1, j).trim(); };
const want = cut(src, '// ---- the arithmetic', '// ---- end of the arithmetic').replace(/^export /gm, '');
let page = '';
try { page = readFileSync(new URL('./demo.html', import.meta.url), 'utf8'); } catch {}
const got = cut(page, '// ---- the arithmetic', '// ---- end of the arithmetic');
ok(got.length > 0 && got === want, `demo.html's copy matches meet.mjs (${got.length} vs ${want.length} chars)`);

// 12. yukawa.mjs: with the top left out, its own walk is meet.mjs's walk.
const Y = await import('./yukawa.mjs');
const mine = Y.climb(Y.MPL, { top: false }).s.slice(0, 3), theirsWalk = Y.viaMeet(Y.MPL);
ok(mine.every((x, i) => near(x, theirsWalk[i], 1e-9)), 'yukawa.mjs without the top walks exactly as meet.mjs does');

// 13. From Buttazzo et al.'s start at Mt, two loops with the top land on their
// three-loop couplings at the Planck mass (arXiv:1307.3536, eq. 61) to 3e-4.
const top = Y.climb(Y.MPL), th = [Y.THEIRS.g1, Y.THEIRS.g2, Y.THEIRS.g3];
ok(top.g.every((g, i) => near(g, th[i], 3e-4)), `at M_Pl, g1 g2 g3 = ${top.g.map((g) => g.toFixed(4)).join(' ')}, theirs ${th.join(' ')}`);
const flat = Y.oneLoop(Y.MPL);
ok(flat.g.some((g, i) => !near(g, th[i], 1e-3)), `one loop alone does not (g3 ${flat.g[2].toFixed(4)})`);

// 14. Their "Planck mass" is about 1.2e19 GeV. 1.20e19 against 1.22e19 moves g1
// most, since its line is steepest; the shift must stay below the 3e-4 of check 13.
const lo = Y.climb(1.20e19), shift = lo.g.map((g, i) => Math.abs(g - top.g[i]));
ok(Math.max(...shift) < 2e-4, `M_Pl 1.20e19 against 1.22e19 moves g1 g2 g3 by ${shift.map((x) => x.toExponential(1)).join(' ')}`);

// 15. Their text: g1 is the largest from about 1e14 GeV, and g2 overcomes g3 at
// about 1e16 (the order of magnitude is all they give).
ok(near(Math.log10(top.cross[1]), 14, 0.5) && near(Math.log10(top.cross[2]), 16, 0.5),
  `g1 passes g3 at ${top.cross[1].toExponential(1)}, g2 passes g3 at ${top.cross[2].toExponential(1)} GeV`);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
