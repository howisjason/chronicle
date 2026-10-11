// scratch.mjs: what the demo draws, checked without a browser, and the cosh(eta)
// stretch between opening angle and dR seen directly.
import { pA, medianAngle, simulate } from './onejet.mjs';

for (const [m, pt] of [[2, 0], [2, 300], [8, 0]]) {
  const s = simulate(m, { pt, n: 6000, keep: 400 });
  const inside = s.pairs.filter(([a, b]) => Math.hypot(a, b) < 0.4).length;
  const far = Math.max(...s.pairs.map(([a, b]) => Math.hypot(a, b)));
  console.log(`m ${m} pt ${pt}: ${s.pairs.length} dots drawn, ${inside} inside, farthest ${far.toFixed(2)}; share ${(100 * s.share).toFixed(0)}%`);
}

// only "a"s flying across the beam (|eta| < 0.1): dR should come back to the bare angle
const mid = simulate(2, { etaMax: 0.1, n: 200000 }), all = simulate(2);
console.log(`m 2: median angle ${medianAngle(2, pA(2)).toFixed(3)}, median dR mid-detector ${mid.median.toFixed(3)} (${mid.kept} kept), median dR |eta|<2.5 ${all.median.toFixed(3)}`);
