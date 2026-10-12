// 1982.mjs: what fails in 1982? ICU-13195 lists it among the failing years, but
// ICU starts every month of 1982 on the Observatory's day (read off its 1982 table
// on 12 Oct 2026; this file checks only the two months below).
//   node 1982.mjs
//
// The two 1982 failures in the ticket's test output (6 Dec 2025 to 6 Jan 2026),
// ICU's months counted from 0 as ICU counts them, "got X not Y" as it prints them:
//   #2040  leap 4th month, day 29  expected 1982-05-22, ICU gave 1982-06-20
//   #2042       4th month, day 29  expected 1982-06-20, ICU gave 1982-05-22
// This asks two roads which is right: ICU itself (Intl), and seventh-night's
// calendar built from the sun and moon.

import { chineseYear, jdn, iso, icu } from "../seventh-night/seventh.mjs";

const TESTS = [
  { n: 2040, leap: true, day: 29, expected: "1982-05-22", icuGave: "1982-06-20" },
  { n: 2042, leap: false, day: 29, expected: "1982-06-20", icuGave: "1982-05-22" },
];

// The sky: the 4th month and the leap 4th month of the Chinese year that begins in 1982.
const year = chineseYear(1982);
const fourth = year.find((m) => m.n === 4 && !m.leap), leap4 = year.find((m) => m.n === 4 && m.leap);
const sky = (leap, d) => iso((leap ? leap4 : fourth).start + d - 1);

export function verdicts() {
  return TESTS.map((t) => {
    const truth = sky(t.leap, t.day);
    const said = icu(jdn(...t.icuGave.split("-").map(Number)));
    return { ...t, sky: truth, icuSays: said, icuRight: truth === t.icuGave, testRight: truth === t.expected };
  });
}
export { fourth, leap4 };

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`the sky: 4th month ${iso(fourth.start)} (${fourth.days} days), leap 4th ${iso(leap4.start)} (${leap4.days} days)\n`);
  for (const v of verdicts()) {
    const name = `${v.leap ? "leap " : ""}4th month, day ${v.day}`;
    console.log(`#${v.n}  ${name.padEnd(24)} test expects ${v.expected}  ICU gave ${v.icuGave}  sky says ${v.sky}`);
    console.log(`       ICU reads ${v.icuGave} as ${v.icuSays.leap ? "leap " : ""}${v.icuSays.n}/${v.icuSays.d}  ->  ${v.icuRight ? "ICU is right" : "ICU is wrong"}, ${v.testRight ? "the test is right" : "the test is wrong"}`);
  }
}
