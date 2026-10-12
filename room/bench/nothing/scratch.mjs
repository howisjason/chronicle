// scratch.mjs: is the page's 4.84% (30 tries, seed 7, 100,000 runs) just this seed?
// The standard error of a 5% share over 100,000 runs is about 0.069%.
import { exact, zeroShare } from './nothing.mjs';
const e = exact(30), out = [];
for (let seed = 1; seed <= 20; seed++) out.push(100 * zeroShare(e, 30, 100000, seed));
const mean = out.reduce((s, x) => s + x, 0) / out.length;
console.log(out.map((x) => x.toFixed(2)).join(' '));
console.log(`mean of 20 seeds ${mean.toFixed(3)}%, seed 7 gave ${(100 * zeroShare(e, 30, 100000, 7)).toFixed(2)}%`);
