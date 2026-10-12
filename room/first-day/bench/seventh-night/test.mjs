// test.mjs: checks seventh.mjs against things known without it.
//   node test.mjs     prints one line per check and exits 1 if any fail
import { newMoonTT, newMoon, sunReaches, chineseYear, sui, seventhNight, oldTanabata, icuSeventhNight, yearName, jdn, iso, ymd, nudge } from "./seventh.mjs";
import { sweep } from "./sweep.mjs";

let failed = 0;
function check(what, ok, got) {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${got === undefined ? "" : ` (got ${got})`}`);
  if (!ok) failed++;
}
const utc = (jd) => new Date((jd - 2440587.5) * 864e5).toISOString().slice(0, 16).replace("T", " ");
const minutesOff = (jd, y, mo, d, h, mi) => Math.round((jd - (jdn(y, mo, d) - 0.5 + (h + mi / 60) / 24)) * 1440);
const newYear = (y) => iso(chineseYear(y)[0].start);

// Meeus's own worked examples.
check("Meeus 49.a: the new moon of k = -283 is JDE 2443192.65118", Math.abs(newMoonTT(-283) - 2443192.65118) < 0.00001, newMoonTT(-283).toFixed(5));

// The sun at a season's turn, in UT, from published times (the minute, rounded).
for (const [deg, y, mo, d, h, mi, what] of [[0, 2000, 3, 20, 7, 35, "March equinox 2000"], [270, 2024, 12, 21, 9, 20, "December solstice 2024"],
  [90, 2025, 6, 21, 2, 42, "June solstice 2025"], [150, 2024, 8, 22, 14, 54, "Chushu 2024 (22:54 Beijing, Xinhua)"],
  [0, 2026, 3, 20, 14, 46, "March equinox 2026"], [90, 2026, 6, 21, 8, 24, "June solstice 2026"],
  [180, 2026, 9, 23, 0, 5, "September equinox 2026"], [270, 2026, 12, 21, 20, 50, "December solstice 2026"]]) {
  const off = minutesOff(sunReaches(deg, jdn(y, mo, d)), y, mo, d, h, mi);
  check(`${what} within 1 minute`, Math.abs(off) <= 1, `${off} min`);
}

// The nights where this calendar and ICU part: NASA's phase tables (Espenak), UT to the minute.
for (const [y, mo, d, h, mi] of [[1906, 4, 23, 16, 7], [1954, 2, 3, 15, 55], [1955, 2, 22, 15, 54],
  [1999, 1, 17, 15, 46], [2012, 8, 17, 15, 54], [2018, 11, 7, 16, 2], [2027, 2, 6, 15, 56],
  [2030, 2, 2, 16, 7], [2057, 9, 28, 16, 0], [2070, 3, 12, 15, 52]]) {
  const k = Math.round((jdn(y, mo, d) - 2451550.1) / 29.530588861);
  const off = minutesOff(newMoon(k), y, mo, d, h, mi);
  check(`new moon ${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")} ${h}:${String(mi).padStart(2, "0")} UT, NASA, within 1 minute`, Math.abs(off) <= 1, utc(newMoon(k)));
}

// Dates known from almanacs and the news.
check("Lunar New Year 2026 is 17 Feb, the horse", newYear(2026) === "2026-02-17" && yearName(2026).animal === "horse", newYear(2026));
check("Lunar New Year 2027 is 6 Feb (ICU says 7 Feb)", newYear(2027) === "2027-02-06", newYear(2027));
check("Lunar New Year 2030 is 3 Feb (ICU says 2 Feb)", newYear(2030) === "2030-02-03", newYear(2030));
check("Lunar New Year 1954 is 3 Feb (ICU says 4 Feb)", newYear(1954) === "1954-02-03", newYear(1954));
for (const [y, want] of [[2024, "2024-08-10"], [2025, "2025-08-29"], [2026, "2026-08-19"], [2012, "2012-08-23"], [1987, "1987-08-30"]])
  check(`the seventh night of ${y} is ${want}`, iso(seventhNight(y)) === want, iso(seventhNight(y)));
const leap = (y) => chineseYear(y).filter((m) => m.leap).map((m) => `leap ${m.n} from ${iso(m.start)}`).join(", ") || "none";
check("2033 has a leap eleventh month from 22 Dec", leap(2033) === "leap 11 from 2033-12-22", leap(2033));
check("1987 has a leap sixth month (ICU says seventh)", leap(1987).startsWith("leap 6 "), leap(1987));
check("2023 has a leap second month", leap(2023).startsWith("leap 2 "), leap(2023));
// The Hong Kong Observatory's tables (T1917e, T1922e): both turned on a solar term
// a few minutes after midnight, and Meeus's short sun formula had them before it.
check("1917 has a leap second month from 23 Mar (HKO; ICU says third)", leap(1917) === "leap 2 from 1917-03-23", leap(1917));
check("1922 has a leap fifth month from 25 Jun (HKO; ICU says sixth)", leap(1922) === "leap 5 from 1922-06-25", leap(1922));
// HKO (T1906e) starts 1906's fourth month on 24 Apr: right, if China kept UTC+8 then.
// In Beijing's own local time, which it kept until 1929, the new moon fell on the 23rd.
{
  const four = (zone) => iso(sui(1906, zone).find((m) => m.n === 4 && !m.leap).start);
  check("1906's fourth month: 23 Apr in Beijing local time, 24 Apr in UTC+8 (HKO)", four(undefined) === "1906-04-23" && four(() => 8) === "1906-04-24", `${four(undefined)}, ${four(() => 8)}`);
}
// The sun's last few minutes of error: holding it back or pushing it on by 2 minutes moves no leap month.
{
  const leaps = () => { const s = []; for (let y = 1700; y <= 2200; y++) for (const m of sui(y)) if (m.leap) s.push(`${y} ${m.n} ${m.start}`); return s.join(); };
  const base = leaps(); nudge.sun = -2; const early = leaps(); nudge.sun = 2; const late = leaps(); nudge.sun = 0;
  check("1700-2200: the sun 2 minutes early or late moves no leap month", early === base && late === base);
}
check("2026 has no leap month", leap(2026) === "none", leap(2026));

// Xinhua (4 Aug 2022): from 1901 to 2100 the seventh night falls no earlier than
// 31 July (2006) and no later than 30 August (1987).
{
  const md = (y) => { const [, m, d] = ymd(seventhNight(y)); return m * 100 + d; };
  let lo = 1901, hi = 1901;
  for (let y = 1901; y <= 2100; y++) { if (md(y) < md(lo)) lo = y; if (md(y) > md(hi)) hi = y; }
  check("earliest seventh night 1901-2100 is 31 July, and 2006 has it", md(lo) === 731 && md(2006) === 731, `${iso(seventhNight(lo))}`);
  check("latest seventh night 1901-2100 is 30 August, and 1987 has it", md(hi) === 830 && md(1987) === 830, `${iso(seventhNight(hi))}`);
}

// Every sui has 12 or 13 months, and month lengths are 29 or 30 days.
{
  let ok = true;
  for (let y = 1700; y <= 2200; y++) { const s = sui(y); if (s.length < 12 || s.length > 13 || s.some((m) => m.days < 29 || m.days > 30)) ok = false; }
  check("1700-2200: every sui has 12 or 13 months of 29 or 30 days", ok);
}

// ICU, worked out separately: every month start 1900-2100. They part 13 times,
// each on a night when the deciding moment is within a quarter hour of midnight.
{
  const { months, bad } = sweep(1900, 2100);
  const mins = bad.map((b) => b.min);
  check("1900-2100: 2487 month starts, ICU parts on 13 nights (26 rows), all within 15 min of midnight", months === 2487 && bad.length === 26 && Math.max(...mins) <= 15, `${months}, ${bad.length} rows, max ${Math.max(...mins)} min`);
}
check("ICU's seventh night 2026 is the same", icuSeventhNight(2026) === seventhNight(2026));
check("Japan's traditional Tanabata 2026 is 19 Aug", iso(oldTanabata(2026)) === "2026-08-19", iso(oldTanabata(2026)));

// demo.html carries its own copy of the calendar (a page opened from a file may not
// import), so check the copy still says exactly what seventh.mjs says.
{
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./seventh.mjs", import.meta.url), "utf8");
  const page = readFileSync(new URL("./demo.html", import.meta.url), "utf8");
  const want = src.slice(src.indexOf("export const DEG"), src.indexOf("function one(y)")).replace(/^export /gm, "").trim();
  const a = page.indexOf("// ---- copied from seventh.mjs"), b = page.indexOf("// ---- end of the copy ----");
  const got = a < 0 || b < 0 ? "" : page.slice(page.indexOf("\n", a) + 1, b).trim();
  check("demo.html's copy matches seventh.mjs", got === want, got ? `${got.length} vs ${want.length} chars` : "no copy found");
}

console.log(failed ? `${failed} failed` : "all passed");
if (failed) process.exitCode = 1;
