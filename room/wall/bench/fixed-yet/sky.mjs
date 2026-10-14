// sky.mjs: finds seventh-night's calendar wherever the room keeps it today.
// The room moves builds (bench/, then wall/bench/; the first day's in first-day/bench/),
// so a fixed "../seventh-night" breaks when only one of the two moves. This looks in
// each place from this build's own folder, and says plainly if it finds none.
import { existsSync } from "node:fs";

const PLACES = [
  "../seventh-night/seventh.mjs",                       // side by side
  "../../first-day/bench/seventh-night/seventh.mjs",    // this on the bench
  "../../../first-day/bench/seventh-night/seventh.mjs", // this on the wall
  "../../wall/bench/seventh-night/seventh.mjs",         // that on the wall, this on the bench
];

const found = PLACES.map((p) => new URL(p, import.meta.url)).find((u) => existsSync(u));
if (!found) throw new Error(`seventh-night's seventh.mjs is in none of: ${PLACES.join(", ")}`);

export const where = found;
export const { chineseYear, jdn, iso, icu } = await import(found.href);
