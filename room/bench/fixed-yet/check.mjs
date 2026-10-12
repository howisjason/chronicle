// check.mjs: is the Chinese calendar in this Node (ICU, through Intl) fixed yet?
//   node check.mjs        the twelve months, what ICU says about each, and a verdict
//
// Plain Node, no dependencies. The part between the two markers is copied into
// demo.html word for word, so a browser asks itself the same twelve questions;
// test.mjs checks the copy.

// ---- copied into demo.html ----
// The first day of a month, as the Hong Kong Observatory's yearly tables print it,
// one in each year where ICU's Chinese calendar has been seen to start a month on
// another day (ICU-13195, ICU-23274, ICU-23469). Every one was read off the
// Observatory's own table for that year.
const CASES = [
  { day: "1917-03-23", month: 2, leap: true, what: "the leap 2nd month" },
  { day: "1922-06-25", month: 5, leap: true, what: "the leap 5th month" },
  { day: "1954-02-03", month: 1, leap: false, what: "New Year" },
  { day: "1955-02-22", month: 2, leap: false, what: "the 2nd month" },
  { day: "1987-07-26", month: 6, leap: true, what: "the leap 6th month (so the seventh night is 30 Aug)" },
  { day: "1999-01-17", month: 12, leap: false, what: "the 12th month" },
  { day: "2012-08-17", month: 7, leap: false, what: "the 7th month (so the seventh night is 23 Aug)" },
  { day: "2018-11-08", month: 10, leap: false, what: "the 10th month" },
  { day: "2027-02-06", month: 1, leap: false, what: "New Year" },
  { day: "2030-02-03", month: 1, leap: false, what: "New Year" },
  { day: "2057-09-28", month: 9, leap: false, what: "the 9th month" },
  { day: "2070-03-12", month: 2, leap: false, what: "the 2nd month" },
];

const CHINESE = new Intl.DateTimeFormat("en-u-ca-chinese", { timeZone: "UTC", month: "numeric", day: "numeric" });

// What this calendar says a Gregorian day is: which month, leap or not, which day.
function ask(day) {
  const [y, m, d] = day.split("-").map(Number);
  const p = Object.fromEntries(CHINESE.formatToParts(new Date(Date.UTC(y, m - 1, d, 12))).map((x) => [x.type, x.value]));
  return { month: parseInt(p.month), leap: /bis$/.test(p.month), day: parseInt(p.day) };
}

const monthName = (m) => `${m.leap ? "leap " : ""}${m.month}`;

function checkAll() {
  return CASES.map((c) => {
    const said = ask(c.day);
    return { ...c, said, ok: said.day === 1 && said.month === c.month && said.leap === c.leap };
  });
}

function verdict(rows) {
  const wrong = rows.filter((r) => !r.ok).length;
  if (wrong === 0) return "Fixed. All twelve months start on the Observatory's day.";
  if (wrong === rows.length) return "Not yet. All twelve months start on another day.";
  return `Not yet: ${wrong} of ${rows.length} months still start on another day.`;
}
// ---- end of the copy ----

export { CASES, ask, checkAll, verdict, monthName };

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = checkAll();
  console.log(`Node ${process.versions.node}, ICU ${process.versions.icu}\n`);
  console.log("day          Observatory   ICU says");
  for (const r of rows) {
    const icu = `${monthName(r.said)}, day ${r.said.day}`;
    console.log(`${r.day}   ${monthName(r).padEnd(12)}  ${icu.padEnd(18)} ${r.ok ? "ok" : "WRONG"}  ${r.what}`);
  }
  console.log(`\n${verdict(rows)}`);
}
