// scratch.mjs: Vega's two turns as the pole star, with and without Vega's own motion.
//   node scratch.mjs
//
// Written to check one sentence in the README: that the two turns differ because
// the axis tilts differently, not because Vega moves. Held still, Vega's turns
// are even further apart in closeness; its own drift narrows the gap.

import { STARS, turns, showYear } from "./pole.mjs";

const vega = STARS.find((s) => s[0] === "Vega");
const still = [...vega];
still[4] = 0; still[5] = 0; still[7] = 0; // no proper motion, no radial velocity

for (const [label, s] of [["Vega as it moves  ", vega], ["Vega held still   ", still]]) {
  const t = turns(s, -15000, 16000, 90);
  console.log(label + t.map((x) => `${showYear(x.year)}, ${x.deg.toFixed(1)}°`).join("   then   "));
}
