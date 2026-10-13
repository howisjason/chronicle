// explore.mjs: lay the roads side by side and print where they part.
import * as W from './wanphra.mjs';
import { WIKI_MAKHA, WIKI_ASAHNA } from './data.mjs';

for (const avoman of ['pythaidate', 'raw']) for (const clash of ['defer', 'drop']) {
  const threshold = 24;
  W.RULE.avoman = avoman;
  console.log(`\n### avoman: ${avoman}`);
  let line = '';
  for (let cs = 1356; cs <= 1394; cs++) line += W.yearType(cs, clash);
  console.log(`\n== tithi >= ${threshold}, leap day in a leap-month year: ${clash}`);
  console.log(' types CS1356..1394', line);
  for (const [name, table] of [['Makha', WIKI_MAKHA], ['Asahna', WIKI_ASAHNA]]) {
    const off = [];
    for (const gy of Object.keys(table).map(Number)) {
      const h = W.holyDaysInYear(gy, clash).find((d) => d.name && d.name.includes(name));
      const want = W.jdnFromIso(`${gy}-${table[gy]}`);
      if (!h || h.jdn !== want) off.push(`${gy}:${h ? h.jdn - want : 'none'}`);
    }
    console.log(` ${name} vs wiki, ${off.length} differ:`, off.join(' '));
  }
}
