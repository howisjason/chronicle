// nothing.mjs: you tried something n times and it never happened.
// How often could it still happen?
//
//   node nothing.mjs                 a table over n
//   node nothing.mjs 300             one answer, at 95%
//   node nothing.mjs 300 99          one answer, at 99%
//   node nothing.mjs 1000 95 two     two-sided 95% (each tail 2.5%)
//
// Every bound here asks the same question from a different road: what is the
// largest rate p for which seeing zero in n tries is still not too surprising?
// "Too surprising" is alpha: 0.05 at 95% one-sided.

// Exact binomial (Clopper-Pearson upper end when the count is zero).
// Zero in n has probability (1-p)^n. Set it to alpha and solve for p.
export const exact = (n, a = 0.05) => 1 - Math.pow(a, 1 / n);

// Poisson: treat the n tries as one long stretch with mean n*p.
// Zero has probability e^(-n p). Set it to alpha: p = -ln(alpha) / n.
export const poisson = (n, a = 0.05) => -Math.log(a) / n;

// Bayesian, flat prior on p. After zero in n the posterior is Beta(1, n+1),
// whose upper tail above p is (1-p)^(n+1). Set it to alpha.
export const bayes = (n, a = 0.05) => 1 - Math.pow(a, 1 / (n + 1));

// The rule of three (Hanley & Lippman-Hand, JAMA 249:1743, 1983).
// It is the Poisson road with -ln(0.05) = 2.9957 rounded up to 3.
export const rule3 = (n) => 3 / n;

// alpha from a confidence and a side. Two-sided puts half of it in each tail;
// with zero seen the lower end is 0 either way, so only the upper tail is used.
export const alphaOf = (conf = 95, sides = 1) => (1 - conf / 100) / sides;

// "less than 1 in N". N is rounded down: 1 in 335 would be a lower ceiling than
// 0.2991% and claim more than the zero shows; 1 in 334 is a little above it.
export const oneIn = (p) => Math.floor(1 / p);

// A small seeded generator (mulberry32) for the walk-it-yourself check.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Set the true rate to p, run n tries, count how often nothing happens.
// If p is the exact ceiling, this should come back near alpha.
export function zeroShare(p, n, runs = 200000, seed = 7) {
  const r = rng(seed);
  let zero = 0;
  for (let i = 0; i < runs; i++) {
    let hit = false;
    for (let k = 0; k < n && !hit; k++) if (r() < p) hit = true;
    if (!hit) zero++;
  }
  return zero / runs;
}

const pct = (x) => (100 * x).toFixed(x < 0.01 ? 3 : 2).padStart(7) + '%';

function table(a) {
  const ns = [1, 2, 3, 5, 10, 20, 30, 50, 100, 300, 1000, 10000];
  const out = [];
  out.push(`Zero in n tries, one-sided ${(100 * (1 - a)).toFixed(0)}% ceiling on the rate:`);
  out.push('');
  out.push('      n    flat-prior     exact    Poisson     3/n    3/n vs exact');
  for (const n of ns) {
    const e = exact(n, a);
    const over = ((rule3(n) / e - 1) * 100).toFixed(1);
    // below n = 3 the Poisson road passes 100%, which no chance can be
    out.push(
      `${String(n).padStart(7)}  ${pct(bayes(n, a))}  ${pct(e)}  ${n < 3 ? '     -  ' : pct(poisson(n, a))}  ` +
      `${n < 3 ? '     -  ' : pct(rule3(n))}  ${n < 3 ? '     -' : ('+' + over + '%').padStart(7)}`,
    );
  }
  out.push('');
  out.push('Always in this order: flat-prior < exact < Poisson < 3/n.');
  out.push('The rule of three is the most cautious of the four, never the least.');
  return out.join('\n');
}

function one(n, conf, sides) {
  const a = alphaOf(conf, sides);
  const e = exact(n, a);
  const lines = [
    `${n} ${n === 1 ? 'try' : 'tries'}, nothing happened. ${conf}% ${sides === 2 ? 'two-sided' : 'one-sided'} (alpha ${+a.toFixed(6)}).`,
    '',
    `  exact binomial   ${pct(e)}   ${oneIn(e) < 2 ? 'it could still be nearly every time' : `less than 1 in ${oneIn(e)}`}`,
    `  Poisson          ${poisson(n, a) > 1 ? '   over 100%, no answer at this n' : pct(poisson(n, a))}`,
    `  flat prior       ${pct(bayes(n, a))}`,
  ];
  if (conf === 95 && sides === 1 && n >= 3) lines.push(`  rule of three    ${pct(rule3(n))}`);
  lines.push('');
  if (n > 100000) {
    lines.push('(no walk past 100,000 tries: it would outlast the bench\'s one-minute cap)');
    return lines.join('\n');
  }
  // a run stops at its first hit, so one costs about n/3 draws; keep the total near 60 million
  const runs = Math.max(20000, Math.min(200000, Math.floor(6e7 / n)));
  lines.push(`Walk it: set the rate to ${pct(e).trim()} and run ${n} ${n === 1 ? 'try' : 'tries'}, ${runs.toLocaleString('en-US')} times.`);
  lines.push(`Nothing happens in ${pct(zeroShare(e, n, runs)).trim()} of the runs. alpha was ${(100 * a).toFixed(2)}%.`);
  return lines.join('\n');
}

const isMain = process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href;
if (isMain) {
  const [nArg, confArg, sideArg] = process.argv.slice(2);
  if (!nArg) {
    console.log(table(0.05));
  } else {
    const n = Number(nArg), conf = confArg ? Number(confArg) : 95;
    const sides = sideArg === 'two' ? 2 : 1;
    if (!Number.isInteger(n) || n < 1 || !(conf > 0 && conf < 100)) {
      console.log('usage: node nothing.mjs [n] [confidence 0-100] [two]');
      process.exit(2);
    }
    console.log(one(n, conf, sides));
  }
}
