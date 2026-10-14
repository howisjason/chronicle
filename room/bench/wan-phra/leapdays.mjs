// leapdays.mjs: where this build puts its leap days around the 2020s, and how
// each revision of the two tables' 2020-2031 rows sits against it.
//   bash room/tools/try.sh wan-phra leapdays.mjs
import * as W from './wanphra.mjs';
import { ROW_2020S, ROW_2020S_MAKHA } from './data.mjs';

// A leap day is the 30th of month 7, so it falls after that year's Makha Bucha
// (month 3 or 4 of the year before) and before its Asahna Bucha (month 8).
export function leapDays(from, to) {
  const out = [];
  for (let cs = from - 638; cs <= to - 638; cs++) {
    if (W.yearType(cs) !== 'B') continue;
    const h = W.holyDays(cs);
    const m7 = h.start + 29 + 30;            // first day of month 7
    out.push({ cs, day: W.iso(m7 + 29) });  // its 30th day
  }
  return out;
}

// Each cell of a row against this build: + means the build is later.
export function against(row, name) {
  const off = {};
  for (const gy of Object.keys(row).map(Number)) {
    const h = W.holyDaysInYear(gy).find((d) => d.name && d.name.includes(name));
    off[gy] = h.jdn - W.jdnFromIso(`${gy}-${row[gy]}`);
  }
  return off;
}

const show = (off) => Object.entries(off).map(([y, d]) => `${y}:${d > 0 ? '+' : ''}${d}`).join(' ');

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('this build\'s leap days (30th of month 7), 2016-2032:');
  for (const l of leapDays(2016, 2032)) console.log(`  CS ${l.cs}: ${l.day}`);
  console.log('\nAsahna Bucha, the 2020s row against this build (+ = build later):');
  for (const rev of Object.keys(ROW_2020S)) console.log(`  ${rev}: ${show(against(ROW_2020S[rev], 'Asahna'))}`);
  console.log('\nMakha Bucha, the 2020s row against this build:');
  for (const rev of Object.keys(ROW_2020S_MAKHA)) console.log(`  ${rev}: ${show(against(ROW_2020S_MAKHA[rev], 'Makha'))}`);
}
