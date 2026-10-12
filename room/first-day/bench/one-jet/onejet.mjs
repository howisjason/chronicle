// onejet.mjs: when do the two daughters of a light particle look like one jet?
//
// A Higgs decays to a Z boson and a light particle "a" (H -> Z a), and "a" decays
// to two particles. If "a" is light and fast, its two daughters fly out so close
// together that a detector's jet finder sweeps them into one jet. This works out
// how close, with nothing but two-body kinematics. It is a toy: see the README.
//
//   node onejet.mjs              table for a Higgs at rest, m_a from 0.5 to 3.5 GeV
//   node onejet.mjs pt 300       the same table for a Higgs moving sideways at 300 GeV
//   node onejet.mjs 2.0          one mass, in words
//
// Units are GeV and radians. The daughters are taken as massless.

export const MH = 125.1, MZ = 91.19, R = 0.4;

// momentum of "a" in the Higgs rest frame (the standard two-body formula)
export function pA(ma, mh = MH, mz = MZ) {
  const s = mh * mh, lo = (mz + ma) ** 2, hi = (mz - ma) ** 2;
  if (!(ma >= 0) || s < lo) return NaN;
  return Math.sqrt((s - lo) * (s - hi)) / (2 * mh);
}

// opening angle between the two daughters of a particle of mass ma and momentum p,
// when they come out at decay angle c = cos(theta*) to its flight in its own frame.
// From m^2 = 2 E1 E2 (1 - cos theta): cos theta = 1 - 2 / (gamma^2 (1 - beta^2 c^2)).
export function opening(ma, p, c) {
  if (ma === 0) return 0;
  const E = Math.hypot(ma, p), g = E / ma, b = p / E;
  const cos = 1 - 2 / (g * g * (1 - b * b * c * c));
  return Math.acos(Math.max(-1, Math.min(1, cos)));
}

// the narrowest it can be: an even split (c = 0), where tan(theta/2) = m/p
export const minAngle = (ma, p) => 2 * Math.atan(ma / p);

// c is spread evenly over -1..1, and the angle grows with |c|, so half of all
// decays open wider than the angle at |c| = 1/2
export const medianAngle = (ma, p) => opening(ma, p, 0.5);

// the share of decays that open less than r
export function shareInside(ma, p, r = R) {
  if (ma === 0) return 1;
  const E = Math.hypot(ma, p), g = E / ma, b = p / E;
  const c2 = (1 - 2 / (g * g * (1 - Math.cos(r)))) / (b * b);
  return c2 <= 0 ? 0 : Math.min(1, Math.sqrt(c2));
}

// the mass at which f(ma) reaches r, by halving; null if it never does below mh - mz
export function crossing(f, r = R, mh = MH, mz = MZ) {
  let lo = 1e-6, hi = mh - mz - 1e-6;
  if (f(hi) < r) return null;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (f(mid) < r) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

// ---- the detector's view: Delta R in (eta, phi), by simulation ----

// a small seeded generator, so the same run prints the same numbers
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const direction = (u, v) => {
  const c = 2 * u - 1, s = Math.sqrt(1 - c * c), phi = 2 * Math.PI * v;
  return [s * Math.cos(phi), s * Math.sin(phi), c];
};

// boost the four-vector [E, x, y, z] by velocity b = [bx, by, bz]
function boost([E, x, y, z], [bx, by, bz]) {
  const b2 = bx * bx + by * by + bz * bz;
  if (b2 === 0) return [E, x, y, z];
  const g = 1 / Math.sqrt(1 - b2), bp = bx * x + by * y + bz * z, k = (g - 1) * bp / b2 + g * E;
  return [g * (E + bp), x + k * bx, y + k * by, z + k * bz];
}

const eta = ([, x, y, z]) => Math.atanh(z / Math.hypot(x, y, z));
const phi = ([, x, y]) => Math.atan2(y, x);
// how far b sits from a in (eta, phi), phi wrapped into -pi..pi
export function offset(a, b) {
  let dphi = phi(b) - phi(a);
  if (dphi > Math.PI) dphi -= 2 * Math.PI;
  if (dphi < -Math.PI) dphi += 2 * Math.PI;
  return [eta(b) - eta(a), dphi];
}
export const deltaR = (a, b) => Math.hypot(...offset(a, b));

// Higgs made in the middle of the detector (eta 0) moving sideways at pt;
// "a" goes off in a random direction in the Higgs frame, its daughters in a random
// direction in its own. Only "a"s with |eta| < etaMax count (the tracker's reach).
// With keep: n, it also hands back the first n pairs as [d_eta, d_phi] of the
// softer daughter seen from the harder one (the demo draws these).
export function simulate(ma, { pt = 0, n = 20000, seed = 7, etaMax = 2.5, r = R, keep = 0 } = {}) {
  const rand = rng(seed), p = pA(ma), Ea = Math.hypot(ma, p), EH = Math.hypot(MH, pt);
  const bH = [pt / EH, 0, 0];
  const drs = [], pairs = [];
  let inside = 0;
  for (let i = 0; i < n; i++) {
    const d = direction(rand(), rand());
    const a = boost([Ea, p * d[0], p * d[1], p * d[2]], bH);
    const e = direction(rand(), rand());
    if (Math.abs(eta(a)) > etaMax) continue;
    const ba = [a[1] / a[0], a[2] / a[0], a[3] / a[0]], h = ma / 2;
    const d1 = boost([h, h * e[0], h * e[1], h * e[2]], ba);
    const d2 = boost([h, -h * e[0], -h * e[1], -h * e[2]], ba);
    const off = d1[0] >= d2[0] ? offset(d1, d2) : offset(d2, d1), dr = Math.hypot(...off);
    drs.push(dr);
    if (pairs.length < keep) pairs.push(off);
    if (dr < r) inside++;
  }
  drs.sort((x, y) => x - y);
  return { kept: drs.length, share: drs.length ? inside / drs.length : NaN, median: drs[Math.floor(drs.length / 2)], pairs };
}

// ---- words and tables ----

const f2 = (x) => x.toFixed(2), f3 = (x) => x.toFixed(3), pct = (x) => `${Math.round(100 * x)}%`;
const pad = (s, w) => String(s).padStart(w);

export function table(pt = 0, masses = [0.5, 1, 1.5, 2, 2.5, 3, 3.5]) {
  const lines = [];
  lines.push(pt ? `Higgs moving sideways at ${pt} GeV, made mid-detector:` : `Higgs at rest:`);
  lines.push(`  m_a   p_a(rest)  narrowest  median   share < ${R}   median dR   share dR < ${R}`);
  lines.push(`  GeV   GeV        angle      angle    (angle)        (sim)       (sim, |eta_a|<2.5)`);
  for (const m of masses) {
    const p = pA(m), s = simulate(m, { pt });
    const ang = pt ? ['', '', '', ''] : [f3(minAngle(m, p)), f3(medianAngle(m, p)), pct(shareInside(m, p))];
    lines.push(`  ${pad(f2(m), 4)}  ${pad(f2(p), 6)}     ${pad(ang[0] ?? '', 6)}     ${pad(ang[1] ?? '', 6)}   ${pad(ang[2] ?? '', 5)}          ${pad(f3(s.median), 6)}      ${pad(pct(s.share), 5)}`);
  }
  if (!pt) {
    const cMin = crossing((m) => minAngle(m, pA(m)));
    const cMed = crossing((m) => medianAngle(m, pA(m)));
    lines.push('');
    lines.push(`With the Higgs at rest, half the pairs open wider than ${R} from m_a = ${f2(cMed)} GeV,`);
    lines.push(`and even the narrowest pair does from m_a = ${f2(cMin)} GeV.`);
  }
  // the same random draws at every mass, so the median moves smoothly with m_a
  const cDR = crossing((m) => simulate(m, { pt, n: 4000 }).median);
  lines.push(`${pt ? '' : '\n'}As the detector measures it (dR), half the pairs fall outside one ${R} jet from m_a = ${cDR === null ? 'never, below ' + f2(MH - MZ) : f2(cDR)} GeV.`);
  return lines.join('\n');
}

export function words(m) {
  const p = pA(m);
  if (!(p >= 0)) return `m_a = ${m} GeV: no such decay; "a" must weigh between 0 and ${f2(MH - MZ)} GeV.`;
  const s = simulate(m);
  return `m_a = ${f2(m)} GeV: in a Higgs at rest, "a" flies at ${f2(p)} GeV. Its two daughters open at least ` +
    `${f3(minAngle(m, p))} rad, half the time more than ${f3(medianAngle(m, p))}; ${pct(shareInside(m, p))} of pairs ` +
    `open less than ${R}. Seen as the detector sees it (dR, |eta| < 2.5), ${pct(s.share)} fall inside one ${R} jet.`;
}

function main(args) {
  if (args[0] === 'pt') {
    const pt = Number(args[1]);
    if (!(pt >= 0)) { console.log('usage: onejet.mjs pt <GeV>'); process.exitCode = 2; return; }
    console.log(table(pt));
  } else if (args.length) {
    const m = Number(args[0]);
    if (!Number.isFinite(m)) { console.log('usage: onejet.mjs [m_a in GeV] | pt <GeV>'); process.exitCode = 2; return; }
    console.log(words(m));
  } else {
    console.log(table(0));
  }
}

// In a browser (demo.html) there is no process, so only the exports matter.
if (typeof process !== 'undefined' && process.argv && process.argv[1]) {
  const { pathToFileURL } = await import('node:url');
  if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
}
