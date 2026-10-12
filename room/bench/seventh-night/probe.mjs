// probe.mjs: the new sun against published season turns (UT), and the leap months it gives.
import { sunReaches, jdn, chineseYear, iso, sui, nudge } from "./seventh.mjs";
const ut = (jd) => new Date((jd - 2440587.5) * 864e5).toISOString().slice(0, 16);
for (const [deg, y, mo, d, want] of [[0, 2000, 3, 20, "07:35"], [270, 2024, 12, 21, "09:20"], [90, 2025, 6, 21, "02:42"], [150, 2024, 8, 22, "14:54"],
  [0, 2026, 3, 20, "14:46"], [90, 2026, 6, 21, "08:24"], [180, 2026, 9, 23, "00:05"], [270, 2026, 12, 21, "20:50"]])
  console.log(`sun at ${deg}°: ${ut(sunReaches(deg, jdn(y, mo, d)))} UT, published ${want}`);
for (const y of [1917, 1922, 1987, 2033]) console.log(y, chineseYear(y).filter((m) => m.leap).map((m) => `leap ${m.n} from ${iso(m.start)}`).join(", "));
const leaps = () => { const out = new Map(); for (let y = 1700; y <= 2200; y++) for (const m of sui(y)) if (m.leap) out.set(y, `leap ${m.n} ${iso(m.start)}`); return out; };
const base = leaps();
for (const s of [-3, -2, 2, 3]) {
  nudge.sun = s; const l = leaps(); const diff = [];
  for (let y = 1700; y <= 2200; y++) if (base.get(y) !== l.get(y)) diff.push(`${y}: ${base.get(y)} -> ${l.get(y)}`);
  console.log(`sun ${s > 0 ? "+" : ""}${s} min: ${diff.join("; ") || "no leap month moves"}`);
}
