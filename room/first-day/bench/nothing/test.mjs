// test.mjs: checks nothing.mjs against things known without it.
//   node test.mjs
import { exact, poisson, bayes, rule3, alphaOf, oneIn, zeroShare } from './nothing.mjs';

let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) pass++; else { fail++; console.log('FAIL', what); } };
const near = (x, y, tol, what) => ok(Math.abs(x - y) <= tol, `${what}: got ${x}, want ${y} ± ${tol}`);

// One try, nothing seen: the only rates ruled out are above 95%.
near(exact(1), 0.95, 1e-12, 'one try');
// Two tries: (1-p)^2 = 0.05, p = 1 - sqrt(0.05)
near(exact(2), 1 - Math.sqrt(0.05), 1e-12, 'two tries');
// The three of the rule of three is -ln(0.05).
near(poisson(1), 2.995732, 1e-6, '-ln 0.05');
// At 99% the rule of three becomes the rule of 4.6.
near(poisson(1, 0.01), 4.60517, 1e-5, '-ln 0.01');
// Put the bound back in: (1-p)^n should give alpha again.
for (const n of [3, 30, 3000]) near(Math.pow(1 - exact(n), n), 0.05, 1e-9, `back-substitute n=${n}`);
// A flat prior after n tries is the exact bound after n+1.
for (const n of [1, 9, 99]) near(bayes(n), exact(n + 1), 1e-12, `bayes(n) = exact(n+1), n=${n}`);
// The order holds everywhere: flat-prior < exact < Poisson < 3/n.
let ordered = true;
for (let n = 1; n <= 5000; n++) {
  if (!(bayes(n) < exact(n) && exact(n) < poisson(n) && poisson(n) < rule3(n))) ordered = false;
}
ok(ordered, 'flat-prior < exact < Poisson < 3/n for n = 1..5000');
// How good the rule is, in percent: about 16% high at n=10, about 5% at n=30.
near(rule3(10) / exact(10) - 1, 0.159, 0.002, '3/n vs exact at n=10');
near(rule3(30) / exact(30) - 1, 0.052, 0.002, '3/n vs exact at n=30');
near(rule3(1000) / exact(1000) - 1, 0.0029, 0.0003, '3/n vs exact at n=1000');
// The disagreement on the web: zero in 1000, one source says 3.7 per thousand,
// the rule says 3.0. Two-sided 95% puts 2.5% in the upper tail.
near(1000 * exact(1000, alphaOf(95, 2)), 3.682, 0.001, 'two-sided zero in 1000');
near(1000 * exact(1000, alphaOf(95, 1)), 2.991, 0.001, 'one-sided zero in 1000');
// The die: twenty rolls without a six. A fair six comes 1 in 6.
ok(exact(20) < 1 / 6, 'twenty sixless rolls put the ceiling under a fair six');
near(Math.pow(5 / 6, 20), 0.0261, 0.0001, 'chance of twenty sixless rolls on a fair die');
// The sentence rounds the safe way: 0.2991% is 1 in 334.3, said as 1 in 334.
ok(oneIn(exact(1000)) === 334, 'oneIn says 1 in 334 for zero in 1000');
ok(oneIn(0.25) === 4 && oneIn(0.3) === 3, 'oneIn rounds down');
ok(1 / oneIn(exact(1000)) >= exact(1000), 'the sentence never claims a lower ceiling than the bound');
// The second road: set the rate to the ceiling and walk it.
// Nothing should happen about alpha of the time.
for (const n of [5, 30, 300]) near(zeroShare(exact(n), n, 200000, n), 0.05, 0.0025, `walk n=${n}`);
near(zeroShare(exact(1000, 0.01), 1000, 60000, 3), 0.01, 0.0015, 'walk n=1000 at 99%');

// demo.html carries its own copy of the arithmetic (a page opened from a file may
// not import), so check the copy still says exactly what nothing.mjs says.
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./nothing.mjs', import.meta.url), 'utf8');
  const page = readFileSync(new URL('./demo.html', import.meta.url), 'utf8');
  const want = src.slice(src.indexOf('export const exact'), src.indexOf('const pct =')).replace(/^export /gm, '').trim();
  const a = page.indexOf('// ---- copied from nothing.mjs'), b = page.indexOf('// ---- end of the copy ----');
  const got = a < 0 || b < 0 ? '' : page.slice(page.indexOf('\n', a) + 1, b).trim();
  ok(got.length > 0 && got === want, `demo.html's copy matches nothing.mjs (${got.length} vs ${want.length} chars)`);
}

console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
