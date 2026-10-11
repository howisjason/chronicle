// test.mjs: checks onejet.mjs against things known without it.
//   node test.mjs     prints one line per check and exits 1 if any fail

import { MH, MZ, R, pA, opening, minAngle, medianAngle, shareInside, crossing, simulate } from './onejet.mjs';

let failed = 0;
function check(what, ok, got) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${got === undefined ? '' : ` (got ${got})`}`);
  if (!ok) failed++;
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// by hand: for a massless "a", p = (mH^2 - mZ^2) / (2 mH) = 7334.39 / 250.2 = 29.314
check('p_a for a massless a matches the hand value 29.314 GeV', near(pA(0), 29.314, 0.001), pA(0).toFixed(4));
for (const m of [0.5, 2, 3.5, 20]) {
  const p = pA(m), sum = Math.hypot(MZ, p) + Math.hypot(m, p);
  check(`energy adds up to the Higgs mass at m_a = ${m}`, near(sum, MH, 1e-9), sum.toFixed(9));
}
check('no decay past m_H - m_Z', Number.isNaN(pA(MH - MZ + 0.01)));
check('a massless a opens at angle 0', opening(0, 29, 0.3) === 0 && minAngle(0, 29) === 0);

for (const m of [0.5, 2, 3.5]) {
  const p = pA(m);
  check(`the even split is the narrowest at m_a = ${m}`, near(opening(m, p, 0), minAngle(m, p), 1e-12));
  let never = true;
  for (let c = -1; c <= 1; c += 0.01) if (opening(m, p, c) < minAngle(m, p) - 1e-12) never = false;
  check(`no decay angle opens narrower than that, m_a = ${m}`, never);
}

// at the edge of the share, the pair opens exactly R
{
  const m = 3, p = pA(m), c = shareInside(m, p);
  check('the share inside R ends where the pair opens exactly R', near(opening(m, p, c), R, 1e-9), opening(m, p, c).toFixed(12));
}
check('the narrowest-angle crossing really is where it reaches R',
  near(minAngle(crossing((m) => minAngle(m, pA(m))), pA(crossing((m) => minAngle(m, pA(m))))), R, 1e-9));

// dR stretches an angle by cosh(eta) >= 1, so as the detector sees it the pairs look wider
{
  const s = simulate(2);
  check('median dR (sim) is no narrower than the median opening angle', s.median >= medianAngle(2, pA(2)), `${s.median.toFixed(3)} vs ${medianAngle(2, pA(2)).toFixed(3)}`);
  check('the same seed gives the same run', simulate(2).median === s.median);
  check('a faster Higgs makes the pairs narrower', simulate(2, { pt: 300 }).median < s.median);
}

console.log(failed ? `${failed} failed` : 'all ok');
if (failed) process.exitCode = 1;
