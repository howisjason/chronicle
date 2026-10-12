// seventh.mjs: a Chinese calendar worked out from the sky, and the night of the bridge.
//   node seventh.mjs 2026      the Chinese year that begins in 2026: its seventh night, its months
//   node seventh.mjs           the seventh night from 2020 to 2040, beside what ICU says
//
// Plain Node, no dependencies. ICU (the calendar library inside Node and every
// browser) has its own Chinese calendar; it is only read here to print beside
// this one, never to make it.

export const DEG = Math.PI / 180;
const sin = (d) => Math.sin(d * DEG);
const mod = (a, b) => ((a % b) + b) % b;

// Days. A day is counted by its Julian Day Number (the JD at its noon), Gregorian dates.
export function jdn(y, m, d) {
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
export function ymd(n) {
  const a = n + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor((1461 * d) / 4), m = Math.floor((5 * e + 2) / 153);
  return [100 * b + d - 4800 + Math.floor(m / 10), m + 3 - 12 * Math.floor(m / 10), e - Math.floor((153 * m + 2) / 5) + 1];
}
export const iso = (n) => ymd(n).map((v, i) => String(v).padStart(i ? 2 : 4, "0")).join("-");
export const weekday = (n) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][mod(n + 1, 7)];

// Clocks, in hours east of Greenwich. China counted days in Beijing's local mean
// time (116°25′ E, 7h45m40s) until 1929, then UTC+8 (Reingold and Dershowitz,
// Calendrical Calculations). Japan has kept UTC+9 since 1888.
export const BEIJING = (jd) => (jd < 2425612.5 ? 1397 / 180 : 8);
export const JAPAN = () => 9;
export const localDay = (jd, zone) => Math.floor(jd + 0.5 + zone(jd) / 24);

// ΔT, seconds: the sky runs on dynamical time, clocks on the turning Earth.
// Espenak and Meeus's polynomials (NASA eclipse pages), 1600 to 2150 and past.
export function deltaT(jd) {
  const y = 2000 + (jd - 2451545) / 365.25;
  const p = (t, ...c) => c.reduce((s, k, i) => s + k * t ** i, 0);
  if (y < 1600) { const u = (y - 1820) / 100; return -20 + 32 * u * u; }
  if (y < 1700) return p(y - 1600, 120, -0.9808, -0.01532, 1 / 7129);
  if (y < 1800) return p(y - 1700, 8.83, 0.1603, -0.0059285, 0.00013336, -1 / 1174000);
  if (y < 1860) return p(y - 1800, 13.72, -0.332447, 0.0068612, 0.0041116, -0.00037436, 0.0000121272, -0.0000001699, 0.000000000875);
  if (y < 1900) return p(y - 1860, 7.62, 0.5737, -0.251754, 0.01680668, -0.0004473624, 1 / 233174);
  if (y < 1920) return p(y - 1900, -2.79, 1.494119, -0.0598939, 0.0061966, -0.000197);
  if (y < 1941) return p(y - 1920, 21.2, 0.84493, -0.0761, 0.0020936);
  if (y < 1961) return p(y - 1950, 29.07, 0.407, -1 / 233, 1 / 2547);
  if (y < 1986) return p(y - 1975, 45.45, 1.067, -1 / 260, -1 / 718);
  if (y < 2005) return p(y - 2000, 63.86, 0.3345, -0.060374, 0.0017275, 0.000651814, 0.00002373599);
  if (y < 2050) return p(y - 2000, 62.92, 0.32217, 0.005589);
  const u = (y - 1820) / 100;
  if (y < 2150) return -20 + 32 * u * u - 0.5628 * (2150 - y);
  return -20 + 32 * u * u;
}

// The k-th new moon after the one of 6 January 2000, as a JD in dynamical time
// (Meeus, Astronomical Algorithms, chapter 49; good to a few seconds).
export function newMoonTT(k) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = 2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3;
  const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4;
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;
  const Om = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3;
  let c = -0.4072 * sin(Mp) + 0.17241 * E * sin(M) + 0.01608 * sin(2 * Mp) + 0.01039 * sin(2 * F)
    + 0.00739 * E * sin(Mp - M) - 0.00514 * E * sin(Mp + M) + 0.00208 * E * E * sin(2 * M)
    - 0.00111 * sin(Mp - 2 * F) - 0.00057 * sin(Mp + 2 * F) + 0.00056 * E * sin(2 * Mp + M)
    - 0.00042 * sin(3 * Mp) + 0.00042 * E * sin(M + 2 * F) + 0.00038 * E * sin(M - 2 * F)
    - 0.00024 * E * sin(2 * Mp - M) - 0.00017 * sin(Om) - 0.00007 * sin(Mp + 2 * M)
    + 0.00004 * sin(2 * Mp - 2 * F) + 0.00004 * sin(3 * M) + 0.00003 * sin(Mp + M - 2 * F)
    + 0.00003 * sin(2 * Mp + 2 * F) - 0.00003 * sin(Mp + M + 2 * F) + 0.00003 * sin(Mp - M + 2 * F)
    - 0.00002 * sin(Mp - M - 2 * F) - 0.00002 * sin(3 * Mp + M) + 0.00002 * sin(4 * Mp);
  const A = [[299.77 + 0.107408 * k - 0.009173 * T2, 325], [251.88 + 0.016321 * k, 165], [251.83 + 26.651886 * k, 164],
    [349.42 + 36.412478 * k, 126], [84.66 + 18.206239 * k, 110], [141.74 + 53.303771 * k, 62], [207.14 + 2.453732 * k, 60],
    [154.84 + 7.30686 * k, 56], [34.52 + 27.261239 * k, 47], [207.19 + 0.121824 * k, 42], [291.34 + 1.844379 * k, 40],
    [161.72 + 24.198154 * k, 37], [239.56 + 25.513099 * k, 35], [331.55 + 3.592518 * k, 23]];
  for (const [a, w] of A) c += (w / 1e6) * sin(a);
  return jde + c;
}
export const newMoon = (k) => { const tt = newMoonTT(k); return tt - deltaT(tt) / 86400; };

// The sun's apparent longitude, degrees, at a JD in dynamical time: the 49-term
// series of Bretagnon and Simon (Planetary Programs and Tables, 1986) as Reingold
// and Dershowitz give it in Calendrical Calculations, with their aberration and
// nutation. Meeus's short formula (chapter 25) was the first road here; it ran 4 to
// 8 minutes early, and that moved the leap month in 1917 and 1922 (see the README).
const SUN = [[403406, 270.54861, 0.9287892], [195207, 340.19128, 35999.1376958], [119433, 63.91854, 35999.4089666],
  [112392, 331.2622, 35998.7287385], [3891, 317.843, 71998.20261], [2819, 86.631, 71998.4403], [1721, 240.052, 36000.35726],
  [660, 310.26, 71997.4812], [350, 247.23, 32964.4678], [334, 260.87, -19.441], [314, 297.82, 445267.1117], [268, 343.14, 45036.884],
  [242, 166.79, 3.1008], [234, 81.53, 22518.4434], [158, 3.5, -19.9739], [132, 132.75, 65928.9345], [129, 182.95, 9038.0293],
  [114, 162.03, 3034.7684], [99, 29.8, 33718.148], [93, 266.4, 3034.448], [86, 249.2, -2280.773], [78, 157.6, 29929.992],
  [72, 257.8, 31556.493], [68, 185.1, 149.588], [64, 69.9, 9037.75], [46, 8, 107997.405], [38, 197.1, -4444.176],
  [37, 250.4, 151.771], [32, 65.3, 67555.316], [29, 162.7, 31556.08], [28, 341.5, -4561.54], [27, 291.6, 107996.706],
  [27, 98.5, 1221.655], [25, 146.7, 62894.167], [24, 110, 31437.369], [21, 5.2, 14578.298], [21, 342.6, -31931.757],
  [20, 230.9, 34777.243], [18, 256.1, 1221.999], [17, 45.3, 62894.511], [14, 242.9, -4442.039], [13, 115.2, 107997.909],
  [13, 151.8, 119.066], [13, 285.3, 16859.071], [12, 53.3, -4.578], [10, 126.6, 26895.292], [10, 205.7, -39.127],
  [10, 85.9, 12297.536], [10, 146.1, 90073.778]];
export function sunLongitude(jde) {
  const c = (jde - 2451545) / 36525;
  let s = 0;
  for (const [x, y, z] of SUN) s += x * sin(y + z * c);
  const lambda = 282.7771834 + 36000.76953744 * c + 0.000005729577951308232 * s;
  const aberration = 0.0000974 * Math.cos((177.63 + 35999.01848 * c) * DEG) - 0.005575;
  const nutation = -0.004778 * sin(124.9 - 1934.134 * c + 0.002063 * c * c) - 0.0003667 * sin(201.11 + 72001.5377 * c + 0.00057 * c * c);
  return mod(lambda + aberration + nutation, 360);
}
// `nudge.sun` holds the sun back by that many minutes; it is 0 except when test.mjs
// asks whether the formula's few minutes of error could move a leap month.
export const nudge = { sun: 0 };
const sunAtUT = (jd) => sunLongitude(jd + deltaT(jd) / 86400 - nudge.sun / 1440);

// When the sun next reaches longitude `deg` near the JD `guess`, as a JD in UT.
export function sunReaches(deg, guess) {
  let jd = guess;
  for (let i = 0; i < 20; i++) {
    const step = (mod(deg - sunAtUT(jd) + 180, 360) - 180) * (365.2422 / 360);
    jd += step;
    if (Math.abs(step) < 1e-7) break;
  }
  return jd;
}

// The new moon that starts the month holding a given day: its k and its day.
export function monthHolding(day, zone) {
  let k = Math.floor((day - 2451550.1) / 29.530588861);
  while (localDay(newMoon(k), zone) > day) k--;
  while (localDay(newMoon(k + 1), zone) <= day) k++;
  return k;
}

// How many principal terms (the sun at a multiple of 30°) fall on the days from
// `start` up to but not including `end`: count the multiples crossed between the
// two midnights.
export function principalTerms(start, end, zone) {
  const midnight = (day) => day - 0.5 - zone(day) / 24;
  const a = sunAtUT(midnight(start)), b = a + mod(sunAtUT(midnight(end)) - a, 360);
  return Math.floor(b / 30) - Math.floor(a / 30);
}

// The winter solstice's day in Gregorian year y.
export const solstice = (y, zone) => localDay(sunReaches(270, jdn(y, 12, 21)), zone);

// One sui: the months from the month holding the solstice of year y-1 up to the
// one holding the solstice of year y. That first month is the eleventh. When a sui
// has 13 months, the first one with no principal term is the leap month and
// repeats the number before it (Calendrical Calculations, the modern rule).
export function sui(y, zone = BEIJING) {
  const k0 = monthHolding(solstice(y - 1, zone), zone), k1 = monthHolding(solstice(y, zone), zone);
  const starts = [];
  for (let k = k0; k <= k1; k++) starts.push(localDay(newMoon(k), zone));
  const months = [];
  let leapAt = -1;
  if (k1 - k0 === 13) {
    for (let i = 1; i < 13 && leapAt < 0; i++) if (principalTerms(starts[i], starts[i + 1], zone) === 0) leapAt = i;
  }
  let n = 10;
  for (let i = 0; i < k1 - k0; i++) {
    const leap = i === leapAt;
    if (!leap) n = (n % 12) + 1;
    months.push({ n, leap, start: starts[i], days: starts[i + 1] - starts[i] });
  }
  return months;
}

// The Chinese year that begins in Gregorian year y: month 1 to the last before the next month 1.
export function chineseYear(y, zone = BEIJING) {
  const all = [...sui(y, zone), ...sui(y + 1, zone)];
  const first = all.findIndex((m) => m.n === 1 && !m.leap);
  const next = all.findIndex((m, i) => i > first && m.n === 1 && !m.leap);
  return all.slice(first, next);
}

// The seventh night: the 7th day of the (not leap) 7th month.
export const seventhNight = (y) => chineseYear(y).find((m) => m.n === 7 && !m.leap).start + 6;

// Japan's national observatory's "traditional Tanabata": count 7 days from the new
// moon on or before the day the sun reaches 150° (Shosho, Chushu), in Japan time.
export function oldTanabata(y) {
  const day = localDay(sunReaches(150, jdn(y, 8, 23)), JAPAN);
  return localDay(newMoon(monthHolding(day, JAPAN)), JAPAN) + 6;
}

const STEMS = "甲乙丙丁戊己庚辛壬癸", BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
const ANIMALS = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
export const yearName = (y) => ({ hanzi: STEMS[mod(y - 4, 10)] + BRANCHES[mod(y - 4, 12)], animal: ANIMALS[mod(y - 4, 12)] });

// What ICU's own Chinese calendar says about a day, for printing beside this one.
const ICU = new Intl.DateTimeFormat("en-u-ca-chinese", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" });
export function icu(day) {
  const [y, m, d] = ymd(day);
  const p = Object.fromEntries(ICU.formatToParts(new Date(Date.UTC(y, m - 1, d, 12))).map((x) => [x.type, x.value]));
  return { y: +p.relatedYear, n: parseInt(p.month), leap: p.month.endsWith("bis"), d: +p.day };
}
export function icuSeventhNight(y) {
  for (let day = jdn(y, 7, 20); day < jdn(y, 9, 5); day++) { const c = icu(day); if (c.n === 7 && !c.leap && c.d === 7) return day; }
  return null;
}
export const FIRST = 1645, LAST = 2200;

function one(y) {
  const months = chineseYear(y), nm = yearName(y), q = seventhNight(y), iq = icuSeventhNight(y), t = oldTanabata(y);
  const out = [`${y}: the year of the ${nm.animal} (${nm.hanzi}) begins on ${iso(months[0].start)}.`,
    `The seventh night (七夕): ${iso(q)}, a ${weekday(q)}. ICU, worked out separately, says ${iq === q ? "the same" : iq ? iso(iq) : "nothing"}.`,
    `Japan: Tanabata on ${y}-07-07; the observatory's traditional Tanabata (Japan time): ${iso(t)}${t === q ? ", the same night" : ""}.`,
    "", "Months:"];
  for (const m of months) out.push(`  ${(m.leap ? "leap " : "") .padStart(5)}${String(m.n).padStart(2)}  ${iso(m.start)}  ${m.days} days`);
  if (y < 1912) out.push("", "Before 1912 this is the rule worked with today's astronomy; the almanac of that year may have printed a day or a leap month differently.");
  return out.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (arg) {
    const y = Number(arg);
    if (!Number.isInteger(y) || y < FIRST || y > LAST) { console.log(`a year from ${FIRST} to ${LAST}, please`); process.exit(2); }
    console.log(one(y));
  } else {
    console.log("year  seventh night         ICU");
    for (let y = 2020; y <= 2040; y++) {
      const q = seventhNight(y), i = icuSeventhNight(y);
      console.log(`${y}  ${iso(q)} ${weekday(q).slice(0, 3)}    ${i === q ? "same" : i ? iso(i) : "-"}`);
    }
  }
}
