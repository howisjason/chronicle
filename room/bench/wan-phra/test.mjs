// test.mjs: check the calendar and the sky against what others published.
//   bash room/tools/try.sh wan-phra test.mjs
import * as W from './wanphra.mjs';
import { PBS_2026, PBS_2026_NAMED, WIKI_MAKHA, WIKI_ASAHNA, USNO_FULL_2026 } from './data.mjs';

let fails = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails++; };

// --- the sky: Meeus against his own worked example, then against USNO ---
check(Math.abs(W.moonPhaseJde(-283, 0) - 2443192.65118) < 0.00001,
  `Meeus example 49.a: new moon k=-283 is JDE ${W.moonPhaseJde(-283, 0).toFixed(5)} (book: 2443192.65118)`);
let worst = 0;
for (const s of USNO_FULL_2026) {
  const [d, t] = s.split('T');
  const [h, m] = t.split(':').map(Number);
  const usno = W.jdnFromIso(d) - 0.5 + (h + m / 60) / 24;
  const mine = W.fullMoonNear(W.jdnFromIso(d)).jd;
  worst = Math.max(worst, Math.abs(mine - usno) * 1440);
}
check(worst < 2, `13 full moons of 2026 against USNO: worst miss ${worst.toFixed(2)} minutes (USNO prints whole minutes)`);

// --- the calendar against Thai PBS's 2026, every wan phra and its label ---
const thaiMonth = (m) => (m === '1' ? 'เดือนอ้าย' : m === '2' ? 'เดือนยี่' : m === '8-2' ? 'เดือน 8 หลัง' : `เดือน ${m}`);
const thaiLabel = (h) => (h.day <= 15 ? `ขึ้น ${h.day} ค่ำ` : `แรม ${h.day - 15} ค่ำ`) + ' ' + thaiMonth(h.month);
const mine2026 = W.holyDaysInYear(2026).filter((h) => h.wanPhra).map((h) => [W.iso(h.jdn), thaiLabel(h)]);
const same = mine2026.length === PBS_2026.length
  && mine2026.every(([d, l], i) => d === PBS_2026[i][0] && l === PBS_2026[i][1]);
check(same, `2026: ${mine2026.length} wan phra, ${PBS_2026.length} on Thai PBS, every date and label the same`);
for (const [name, date] of Object.entries(PBS_2026_NAMED)) {
  const h = W.holyDaysInYear(2026).find((x) => x.name && x.name.startsWith(name));
  check(h && W.iso(h.jdn) === date, `2026 ${name}: ${h ? W.iso(h.jdn) : 'none'} (Thai PBS ${date})`);
}

// --- thirty-six years of Thai Wikipedia's tables ---
const against = (table, name) => {
  const off = [];
  for (const gy of Object.keys(table).map(Number)) {
    const h = W.holyDaysInYear(gy).find((d) => d.name && d.name.includes(name));
    const d = h.jdn - W.jdnFromIso(`${gy}-${table[gy]}`);
    if (d) off.push(`${gy}:${d > 0 ? '+' : ''}${d}`);
  }
  return off.join(' ');
};
// Expected, and why: from Asahna 2024 on, the tables run a day late. Thai PBS
// (2026), the pages' own infoboxes (2025, 2026) and Thairath (Asahna 2024 on
// Saturday 20 July) all side with this build there. Asahna 2005 is the one row
// I can't settle: nothing I found says which day it was.
const makha = against(WIKI_MAKHA, 'Makha');
const asahna = against(WIKI_ASAHNA, 'Asahna');
check(makha === '2025:-1 2026:-1 2027:-1 2028:-1 2029:-1 2030:-1',
  `Makha Bucha 1996-2031, years differing from the table: ${makha}`);
check(asahna === '2005:+1 2024:-1 2025:-1 2026:-1 2027:-1 2028:-1 2029:-1',
  `Asahna Bucha 1996-2031, years differing from the table: ${asahna}`);

// --- the rules as pythaidate writes them, to show why this file differs ---
W.RULE.threshold = 25; W.RULE.avoman = 'pythaidate';
const asWritten = against(WIKI_MAKHA, 'Makha').split(' ').filter(Boolean).length;
W.RULE.threshold = 24; W.RULE.avoman = 'raw';
check(asWritten > 20, `with tithi > 24 and avoman 0 read as 692, ${asWritten} of 36 Makha years miss (a month out, before 2012)`);

// --- the measurement: is the full-moon day the sky's full moon? ---
const tally = { early: 0, same: 0, late: 0 };
let n = 0;
const misses = [];
for (let gy = 1996; gy <= 2031; gy++) {
  for (const h of W.holyDaysInYear(gy).filter((x) => x.full)) {
    const r = W.missHours(h.jdn);
    n++;
    if (r.offDays === 0) tally.same++; else if (r.offDays < 0) tally.early++; else tally.late++;
    if (r.offDays !== 0) misses.push(Math.abs(r.miss));
  }
}
misses.sort((a, b) => a - b);
console.log(`\nfull-moon days 1996-2031: ${n}`);
console.log(`  the sky's full moon falls on that Thai day: ${tally.same} (${(100 * tally.same / n).toFixed(1)}%)`);
console.log(`  the day comes before the full moon: ${tally.early}; after it: ${tally.late}`);
console.log(`  when it misses, by a median of ${misses[misses.length >> 1].toFixed(1)} h past midnight, at most ${misses[misses.length - 1].toFixed(1)} h`);

// --- the face carries this file, not an older copy of it ---
const { inlined } = await import('./make-demo.mjs');
const { readFileSync } = await import('node:fs');
check(readFileSync(new URL('./demo.html', import.meta.url), 'utf8').includes(inlined()),
  'demo.html carries the current wanphra.mjs (run make-demo.mjs if not)');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
