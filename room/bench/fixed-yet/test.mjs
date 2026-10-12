// test.mjs: checks for check.mjs and its page.
//   node test.mjs
// The twelve days come from the Hong Kong Observatory's tables. The second road here
// is the calendar in ../seventh-night, worked out from the sky with no table at all:
// it should start the same twelve months on the same twelve days.
import { readFileSync } from "node:fs";
import { CASES, ask } from "./check.mjs";
import { chineseYear, iso } from "../seventh-night/seventh.mjs";
import { verdicts, leap4 } from "./1982.mjs";

let bad = 0;
const check = (what, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"}  ${what}${detail ? `  (${detail})` : ""}`); if (!ok) bad++; };

check("twelve cases, one in each year", CASES.length === 12 && new Set(CASES.map((c) => c.day.slice(0, 4))).size === 12);

// The sky's calendar, for the Chinese years that touch each case.
for (const c of CASES) {
  const y = +c.day.slice(0, 4);
  const months = [...chineseYear(y - 1), ...chineseYear(y)];
  const m = months.find((x) => iso(x.start) === c.day);
  check(`the sky starts ${c.day} as the Observatory does`, !!m && m.n === c.month && m.leap === c.leap,
    m ? `${m.leap ? "leap " : ""}${m.n}` : "no month starts that day");
}

// The reader must read a day ICU gets right as right, or every row is wrong for a
// dull reason. 2026's New Year, and 1982's leap fourth month, which is in ICU's own
// list of failing years but which ICU, the Observatory and the sky all start on 23 May.
const ny = ask("2026-02-17"), l4 = ask("1982-05-23");
check("the reader reads 2026-02-17 as month 1, day 1", ny.month === 1 && !ny.leap && ny.day === 1, JSON.stringify(ny));
check("the reader reads 1982-05-23 as leap 4, day 1", l4.month === 4 && l4.leap && l4.day === 1, JSON.stringify(l4));

// What fails in 1982 (1982.mjs): two rows of the ticket's test, day 29 of the 4th
// month and of the leap 4th, with their expected days swapped. ICU and the sky
// agree with each other and not with the rows. The rows also disagree with their
// own neighbour, #2041, which starts the leap 4th month on 23 May: its day 29
// cannot be 22 May.
for (const v of verdicts()) {
  check(`1982 #${v.n}: ICU and the sky agree, the test row does not`, v.icuRight && !v.testRight, `sky ${v.sky}, row ${v.expected}`);
}
check("1982: the sky starts the leap 4th month on 23 May, as #2041 does", iso(leap4.start) === "1982-05-23");

// demo.html carries its own copy (a page opened from a file may not import).
const src = readFileSync(new URL("./check.mjs", import.meta.url), "utf8");
const page = readFileSync(new URL("./demo.html", import.meta.url), "utf8");
const cut = (s) => { const a = s.indexOf("// ---- copied into demo.html ----"), b = s.indexOf("// ---- end of the copy ----"); return a < 0 || b < 0 ? "" : s.slice(a, b); };
const want = cut(src), got = cut(page);
check("demo.html's copy matches check.mjs", !!got && got === want, `${got.length} vs ${want.length} chars`);

console.log(bad ? `\n${bad} failed` : "\nall passed");
process.exit(bad ? 1 : 0);
