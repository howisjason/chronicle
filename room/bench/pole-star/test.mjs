// test.mjs: checks pole.mjs against things known without it.
//   node test.mjs     prints one line per check and exits 1 if any fail
//
// The bounds are loose on purpose. Published dates for "closest approach" differ
// by decades to centuries depending on the model behind them, and the far ends
// of the range are rough (see the README).

import { pole, STARS, distance, ranked, turns, parseYear, showYear } from "./pole.mjs";

const star = (name) => STARS.find((s) => s[0] === name);
let failed = 0;
function check(what, ok, got) {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${got === undefined ? "" : ` (got ${got})`}`);
  if (!ok) failed++;
}
function closest(name, from, to) {
  const t = turns(star(name), from, to, 90);
  return t.sort((a, b) => a.deg - b.deg)[0];
}

// The model is anchored at J2000: the pole there is the frame's own z axis.
const p0 = pole(2000);
check("pole at J2000 is the z axis", Math.hypot(p0[0], p0[1]) < 1e-6, p0.map((c) => c.toFixed(8)).join(" "));

// Polaris was 44′ from the pole in 2000 (Dec +89°15′51″).
const pol2000 = distance(star("Polaris"), 2000) * 60;
check("Polaris 44′ from the pole in 2000", Math.abs(pol2000 - 44.2) < 0.5, `${pol2000.toFixed(1)}′`);

// Polaris comes closest around 2100 AD, a little under half a degree off.
const pol = closest("Polaris", 1900, 2400);
check("Polaris closest around 2100 AD, under 0.5°", pol.year > 2050 && pol.year < 2150 && pol.deg < 0.5, `${showYear(pol.year)}, ${pol.deg.toFixed(2)}°`);

// Thuban was the pole star of the pyramid builders, closest in the 2800s BC.
const thu = closest("Thuban", -3500, -2000);
check("Thuban closest in the 2800s BC, under 0.3°", thu.year > -3000 && thu.year < -2600 && thu.deg < 0.3, `${showYear(thu.year)}, ${thu.deg.toFixed(2)}°`);

// Vega's next turn is in the 14th millennium AD, a few degrees off.
const veg = closest("Vega", 12000, 15500);
check("Vega closest in 12,000-15,500 AD, 3° to 7°", veg.deg > 3 && veg.deg < 7, `${showYear(veg.year)}, ${veg.deg.toFixed(1)}°`);

// Errai (gamma Cephei) is next after Polaris, around 4000 AD.
const err = closest("Errai", 3000, 5000);
check("Errai closest around 4000 AD", err.year > 3500 && err.year < 4600 && err.deg < 3, `${showYear(err.year)}, ${err.deg.toFixed(1)}°`);

// One precession cycle is about 25,770 years: Polaris comes back.
const back = closest("Polaris", 26000, 30000);
check("Polaris returns one cycle later", back.year - pol.year > 25000 && back.year - pol.year < 26600, `${showYear(back.year)}`);

// The ranking puts Polaris first today.
check("Polaris ranks first in 2026", ranked(2026)[0].name === "Polaris");

// Years: astronomers count a year 0, so 1 BC is 0 and 2800 BC is -2799.
check("parse 2800BC as -2799", parseYear("2800BC") === -2799);
check("parse 1 BC as 0", parseYear("1 bc") === 0);
check("parse -2799 as -2799", parseYear("-2799") === -2799);
check("parse 14000 AD as 14000", parseYear("14000 AD") === 14000);
check("refuse 0 BC and words", parseYear("0BC") === null && parseYear("soon") === null);
check("show 0 as 1 BC", showYear(0) === "1 BC");

// demo.html carries its own copy of the sky (a page opened from a file may not
// import), so check the copy still says exactly what pole.mjs says
{
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./pole.mjs", import.meta.url), "utf8");
  const page = readFileSync(new URL("./demo.html", import.meta.url), "utf8");
  const want = src.slice(src.indexOf("const DEG"), src.indexOf("function one(year)")).replace(/^export /gm, "").trim();
  const a = page.indexOf("// ---- copied from pole.mjs"), b = page.indexOf("// ---- end of the copy ----");
  const got = a < 0 || b < 0 ? "" : page.slice(page.indexOf("\n", a) + 1, b).trim();
  check("demo.html's copy of the sky matches pole.mjs", got === want, got ? `${got.length} vs ${want.length} chars` : "no copy found");
}

console.log(failed ? `${failed} failed` : "all passed");
if (failed) process.exitCode = 1;
