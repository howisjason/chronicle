// sweep.mjs: every month start from FROM to TO, this calendar against ICU's.
//   node sweep.mjs [from] [to]     prints each disagreement and why, the close
//                                  calls, then a count
//
// For each disagreement it names the moment that decided it and how near a local
// midnight that moment fell. Then the close calls: every principal term within
// 15 minutes of a midnight that is also a month's edge, the only place the sun's
// error (a few minutes, see the README) could move a leap month.
import { sui, icu, iso, newMoon, monthHolding, localDay, BEIJING, sunReaches, jdn } from "./seventh.mjs";

// Minutes between a moment and the nearest Beijing midnight, signed (+ just after).
export function fromMidnight(jd) {
  const min = (((jd + 0.5 + BEIJING(jd) / 24) % 1) + 1) % 1 * 1440;
  return min > 720 ? min - 1440 : min;
}

// Every principal term (the sun at a multiple of 30°) in Gregorian years from..to.
export function terms(from, to) {
  const out = [];
  for (let y = from; y <= to; y++) for (let d = 0; d < 360; d += 30) {
    const jd = sunReaches(d, jdn(y, 3, 20) + d * 1.0146);
    out.push({ deg: d, jd, day: localDay(jd, BEIJING), m: fromMidnight(jd) });
  }
  return out;
}

export function sweep(from, to) {
  const mine = new Map(), long = new Set();
  for (let y = from; y <= to + 1; y++) { const s = sui(y); for (const m of s) { mine.set(m.start, m); if (s.length === 13) long.add(m.start); } }
  const lo = jdn(from, 1, 1), hi = jdn(to, 12, 31);
  const theirs = new Map();
  for (let day = lo; day <= hi; day++) { const c = icu(day); if (c.d === 1) theirs.set(day, c); }
  const ts = terms(from - 1, to + 1);
  const bad = [];
  const days = [...new Set([...mine.keys(), ...theirs.keys()])].filter((d) => d >= lo && d <= hi).sort((a, b) => a - b);
  for (const day of days) {
    const a = mine.get(day), b = theirs.get(day);
    if (a && b && a.n === b.n && a.leap === b.leap) continue;
    const moons = [-1, 0, 1].map((j) => newMoon(monthHolding(day, BEIJING) + j)).map((jd) => ({ what: "new moon", jd, m: fromMidnight(jd) }));
    const near = [...moons, ...ts.filter((t) => Math.abs(t.jd - day) < 45).map((t) => ({ what: `sun at ${t.deg}°`, jd: t.jd, m: t.m }))]
      .filter((e) => Math.abs(e.jd - day) < 45).sort((p, q) => Math.abs(p.m) - Math.abs(q.m))[0];
    bad.push({ day, mine: a ? `${a.leap ? "leap " : ""}${a.n}` : "-", icu: b ? `${b.leap ? "leap " : ""}${b.n}` : "-",
      min: Math.round(Math.abs(near.m)), why: `${near.what} ${iso(localDay(near.jd, BEIJING))}, ${Math.round(Math.abs(near.m))} min ${near.m < 0 ? "before" : "after"} midnight` });
  }
  // a term at a month's edge: on a month's first day just after midnight, or on its eve just before
  const close = ts.filter((t) => t.day >= lo && t.day <= hi && Math.abs(t.m) < 15 && mine.has(t.m >= 0 ? t.day : t.day + 1))
    .map((t) => ({ ...t, leapYear: long.has(t.m >= 0 ? t.day : t.day + 1) }));
  return { months: [...mine.keys()].filter((d) => d >= lo && d <= hi).length, bad, close };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const from = Number(process.argv[2] || 1900), to = Number(process.argv[3] || 2100);
  const { months, bad, close } = sweep(from, to);
  for (const b of bad) console.log(`${iso(b.day)}  mine ${b.mine.padEnd(8)} ICU ${b.icu.padEnd(8)} ${b.why}`);
  console.log(`${from}-${to}: ${months} month starts, ${bad.length} disagreements\n\nClose calls, a principal term within 15 minutes of midnight at a month's edge:`);
  for (const t of close) console.log(`  sun at ${String(t.deg).padStart(3)}°  ${iso(t.day)}  ${Math.round(Math.abs(t.m))} min ${t.m < 0 ? "before" : "after"} midnight${t.leapYear ? "  (a 13-month sui: it could move the leap month)" : ""}`);
}
