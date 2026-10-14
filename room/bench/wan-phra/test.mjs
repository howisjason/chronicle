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
// Saturday 20 July) all side with this build there. Asahna 2005 is settled
// below, against what was printed in 2004 and 2005.
const makha = against(WIKI_MAKHA, 'Makha');
const asahna = against(WIKI_ASAHNA, 'Asahna');
check(makha === '2025:-1 2026:-1 2027:-1 2028:-1 2029:-1 2030:-1',
  `Makha Bucha 1996-2031, years differing from the table: ${makha}`);
check(asahna === '2005:+1 2024:-1 2025:-1 2026:-1 2027:-1 2028:-1 2029:-1',
  `Asahna Bucha 1996-2031, years differing from the table: ${asahna}`);

// --- Asahna 2005: the day that was kept, and how the table's cells moved ---
const { KEPT_2005, CELL_2005, ROW_2020S } = await import('./data.mjs');
const weekday = (jdn) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][(jdn + 1) % 7];
for (const [name, [date, wd]] of Object.entries(KEPT_2005)) {
  const h = W.holyDaysInYear(2005).find((x) => x.name && x.name.startsWith(name));
  check(h && W.iso(h.jdn) === date && weekday(h.jdn) === wd,
    `2005 ${name}: this build ${h ? `${weekday(h.jdn)} ${W.iso(h.jdn)}` : 'none'}; printed at the time: ${wd} ${date}`);
}
check(CELL_2005[7752502] === W.iso(W.holyDaysInYear(2005).find((x) => x.name && x.name.startsWith('Asahna')).jdn).slice(5)
  && CELL_2005[7771106] === WIKI_ASAHNA[2005],
  `the table's 2005 cell: ${CELL_2005[7752502]} up to revision 7752502 (this build's day), ${CELL_2005[7771106]} from 7771106 on (the live table's)`);
const changed = Object.keys(ROW_2020S[7771106]).filter((y) => ROW_2020S[7771106][y] !== ROW_2020S[7752502][y]);
check(changed.length === 8, `revision 7771106 changed ${changed.length} of the 12 cells of the 2020-2031 row (${changed.join(' ')})`);
const live = Object.keys(ROW_2020S[8306984]).every((y) => ROW_2020S[8306984][y] === WIKI_ASAHNA[y]);
check(live, 'revision 8306984\'s 2020-2031 row is the live table read on 13 Oct 2026');
const plusOne = Object.keys(ROW_2020S[7771106]).every((y) =>
  W.jdnFromIso(`${y}-${ROW_2020S[8306984][y]}`) - W.jdnFromIso(`${y}-${ROW_2020S[7771106][y]}`) === 1);
check(plusOne, 'revision 8306984 is revision 7771106 plus one day, in all twelve cells of the 2020-2031 row');
const rowVsBuild = {};
for (const rev of Object.keys(ROW_2020S)) rowVsBuild[rev] = against(ROW_2020S[rev], 'Asahna');
check(rowVsBuild[7771106] === '2020:+1 2021:+1 2022:+1 2023:+1 2030:+1 2031:+1'
  && rowVsBuild[8306984] === '2024:-1 2025:-1 2026:-1 2027:-1 2028:-1 2029:-1',
  `the 2020s row against this build: 7771106 (Aug 2018) differs at ${rowVsBuild[7771106]}; 8306984 (May 2019) at ${rowVsBuild[8306984]}`);
console.log(`  (printed, not checked) the row before Aug 2018, 7752502, differs at ${rowVsBuild[7752502] || 'none'}`);

// --- the Makha table's 2020s row, edited the same two nights (leapdays.mjs) ---
const { ROW_2020S_MAKHA: M } = await import('./data.mjs');
const L = await import('./leapdays.mjs');
const mChanged = Object.keys(M[7771115]).filter((y) => M[7771115][y] !== M[7764637][y])
  .map((y) => `${y}:${W.jdnFromIso(`${y}-${M[7771115][y]}`) - W.jdnFromIso(`${y}-${M[7764637][y]}`) > 0 ? '+' : ''}${W.jdnFromIso(`${y}-${M[7771115][y]}`) - W.jdnFromIso(`${y}-${M[7764637][y]}`)}`);
check(mChanged.join(' ') === '2021:-1 2022:-1 2025:-1 2028:+1 2029:-1 2030:-1',
  `revision 7771115 (8 Aug 2018) changed ${mChanged.length} of the 12 Makha cells, by days: ${mChanged.join(' ')}`);
check(Object.keys(M[8306991]).every((y) => M[8306991][y] === WIKI_MAKHA[y]),
  'revision 8306991\'s Makha 2020-2031 row is the live table read on 13 Oct 2026');
const mStep = Object.keys(M[8306991]).map((y) => W.jdnFromIso(`${y}-${M[8306991][y]}`) - W.jdnFromIso(`${y}-${M[7771115][y]}`));
check(mStep[0] === 0 && mStep.slice(1).every((d) => d === 1),
  'revision 8306991 (21 May 2019) is 7771115 plus one day in 11 cells, and leaves 2020 alone');
const leap1382 = L.leapDays(2020, 2020)[0];
const day2020 = (n) => W.iso(W.holyDaysInYear(2020).find((x) => x.name && x.name.includes(n)).jdn);
check(leap1382.day === '2020-06-20' && day2020('Makha') < leap1382.day && leap1382.day < day2020('Asahna'),
  `this build's leap day of 2020 is ${leap1382.day}, after Makha Bucha (${day2020('Makha')}) and before Asahna Bucha (${day2020('Asahna')})`);
const show = (off) => Object.entries(off).filter(([, d]) => d).map(([y, d]) => `${y}:${d > 0 ? '+' : ''}${d}`).join(' ');
const mVs = {}, aVs = {};
for (const rev of Object.keys(M)) mVs[rev] = L.against(M[rev], 'Makha');
for (const rev of Object.keys(ROW_2020S)) aVs[rev] = L.against(ROW_2020S[rev], 'Asahna');
check(show(mVs[7771115]) === '2021:+1 2022:+1 2023:+1 2024:+1 2031:+1'
  && show(mVs[8306991]) === '2025:-1 2026:-1 2027:-1 2028:-1 2029:-1 2030:-1',
  `the Makha 2020s row against this build: 7771115 (Aug 2018) differs at ${show(mVs[7771115])}; 8306991 (May 2019) at ${show(mVs[8306991])}`);
// Makha Bucha of year Y+1 is in the same lunar year as Asahna Bucha of year Y,
// so a row that counts its leap days the same way on both pages has the same
// offset at Makha Y+1 as at Asahna Y.
const paired = (ra, rm) => { let n = 0; for (let y = 2020; y <= 2030; y++) if (aVs[ra][y] === mVs[rm][y + 1]) n++; return n; };
check(paired(7771106, 7771115) === 11 && paired(8306984, 8306991) === 11,
  `lunar year by lunar year, Asahna Y against Makha Y+1 for 2020-2030: Aug 2018 agree in ${paired(7771106, 7771115)} of 11, May 2019 in ${paired(8306984, 8306991)} of 11`);
console.log(`  (printed, not checked) before Aug 2018 the two pages agree in ${paired(7752502, 7764637)} of 11; Makha 7764637 differs at ${show(mVs[7764637])}`);

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

// --- the lean: where the moon sits in the calendar's days (lean.mjs) ---
const { months } = await import('./lean.mjs');
const ms = months().filter((m) => { const y = W.ymdFromJdn(m.d15).y; return y >= 1996 && y <= 2031; });
const avg = (f) => ms.reduce((a, m) => a + f(m), 0) / ms.length * 24;
const fullH = avg((m) => m.full.true), newH = avg((m) => m.nw.true);
check(ms.length === n, `lean.mjs sees the same ${n} full-moon days as the tally above (${ms.length})`);
check(Math.abs(fullH - 24.9) < 0.05, `the full moon comes on average ${fullH.toFixed(2)} h after waxing 15 begins: ${(fullH - 24).toFixed(2)} h after it ends`);
check(Math.abs(fullH - newH - 29.530588861 / 2 * 24 + 14 * 24) < 0.5,
  `the new moon sits ${newH.toFixed(2)} h into day 1, and ${newH.toFixed(2)} h + half a mean month lands ${(newH + 29.530588861 / 2 * 24 - 14 * 24).toFixed(2)} h into waxing 15 (a consistency check, not a second road: both moons are Meeus's)`);
const on1 = ms.filter((m) => m.nw.true >= 0 && m.nw.true < 1).length;
const onLast = ms.filter((m) => m.nw.true >= -1 && m.nw.true < 0).length;
check(on1 === 275 && onLast === 130, `the true new moon falls on day 1 ${on1} times and on the dark-moon holy day before it ${onLast}`);
const where = (f) => [ms.filter((m) => f(m) >= 0 && f(m) < 1).length, ms.filter((m) => f(m) >= 1).length, ms.filter((m) => f(m) < 0).length];
const trueW = where((m) => m.full.true);
check(trueW.join() === '193,242,11' && Math.abs(newH - 6.6) < 0.05,
  `the true full moon: on the day ${trueW[0]}, after ${trueW[1]}, before ${trueW[2]}; the true new moon on average ${newH.toFixed(2)} h into day 1`);
const meanW = where((m) => m.full.mean);
check(meanW.join() === '207,239,0', `the mean full moon alone (no wobble): on the day ${meanW[0]}, after ${meanW[1]}, before ${meanW[2]}`);
const span = (f) => [Math.min(...ms.map(f)) * 24, Math.max(...ms.map(f)) * 24].map((x) => x.toFixed(1)).join(' to ');
check(span((m) => m.full.mean) === '2.7 to 47.9' && span((m) => m.full.true) === '-9.5 to 58.7',
  `the full moon from the start of waxing 15: mean moon ${span((m) => m.full.mean)} h, true moon ${span((m) => m.full.true)} h`);
const catches = (s) => ms.filter((m) => m.full.true * 24 >= s && m.full.true * 24 < s + 24).length;
const byHour = Array.from({ length: 24 }, (_, s) => catches(s));
const bestHour = byHour.indexOf(Math.max(...byHour));
check(byHour[0] === 193 && byHour[6] === 263 && bestHour === 15 && byHour[15] === 292,
  `24-hour windows starting on the hour catch: 00:00 ${byHour[0]}, 06:00 ${byHour[6]}, the most at ${bestHour}:00 (${byHour[bestHour]})`);
// The sawtooth, two ways: measured from the calendar against the mean moon, and from
// arithmetic alone (12 or 13 mean months minus the year's days), year to year.
const month5 = (cs) => ms.find((m) => m.cs === cs && m.label === '5');
const lunation = 29.530588861;
const expectStep = { A: 12 * lunation - 354, B: 12 * lunation - 355, C: 13 * lunation - 384 };
let worstStep = 0;
const seen = { A: new Set(), B: new Set(), C: new Set() };
for (let cs = 1359; cs <= 1392; cs++) {
  const a = month5(cs), b = month5(cs + 1);
  if (!a || !b) continue;
  const t = W.yearType(cs);
  const step = (b.full.mean - a.full.mean) * 24;
  seen[t].add(step.toFixed(1));
  worstStep = Math.max(worstStep, Math.abs(step - expectStep[t] * 24));
}
check(worstStep < 0.05, `the sawtooth: from one year's month 5 to the next, the mean full moon moves ${[...seen.A].join('/')} h after a normal year, ${[...seen.B].join('/')} h after a leap-day year, ${[...seen.C].join('/')} h after a leap-month year; arithmetic says ${(expectStep.A * 24).toFixed(1)}, ${(expectStep.B * 24).toFixed(1)}, ${(expectStep.C * 24).toFixed(1)} (worst gap ${worstStep.toFixed(3)} h)`);

// --- the published count (count.mjs) ---
const { KAPOOK_2014 } = await import('./data.mjs');
const C = await import('./count.mjs');
const mine2014 = W.holyDaysInYear(2014).filter((h) => h.wanPhra).map((h) => [W.iso(h.jdn), h.day, h.month]);
check(mine2014.length === KAPOOK_2014.length && mine2014.every((r, i) => r.join() === KAPOOK_2014[i].join()),
  `2014: ${mine2014.length} wan phra, ${KAPOOK_2014.length} on Kapook's list, every date, day and month the same`);
let worstElong = 0;
for (let k = 160; k <= 186; k++) {
  for (const [p, want] of [[0, 0], [0.5, 180]]) {
    const off = ((C.elongation(W.moonPhaseJde(k, p)) - want + 540) % 360) - 180;
    worstElong = Math.max(worstElong, Math.abs(off));
  }
}
const span49 = [W.moonPhaseJde(160, 0), W.moonPhaseJde(186, 0.5)].map((j) => W.iso(Math.floor(j + 0.5))).join(' to ');
check(worstElong < 0.05, `two roads: the Moon's lead on the Sun (ch. 25 and 47) at the 54 new and full moons from ${span49} (ch. 49) is 0 or 180 degrees to within ${worstElong.toFixed(4)}`);
const yr = (y, hr) => C.compare(C.holy(W.jdnFromYmd(y, 1, 1), W.jdnFromYmd(y, 12, 31)), hr);
const r13 = yr(2013, 0), r14 = yr(2014, 0), s13 = yr(2013, 6), s14 = yr(2014, 6);
check(r13.n === 50 && r13.ahead === 22 && r13.behind === 0 && r14.n === 49 && r14.ahead === 36 && r14.two === 5 && r14.behind === 0,
  `true tithi at the midnight a holy day begins: 2013 ahead ${r13.ahead} of ${r13.n}, behind ${r13.behind}; 2014 ahead ${r14.ahead} of ${r14.n} (${r14.two} by two), behind ${r14.behind}`);
check(s13.ahead === 15 && s13.two === 0 && s13.behind === 5 && s14.ahead === 28 && s14.two === 1 && s14.behind === 0,
  `at 06:00: 2013 ahead ${s13.ahead} (${s13.two} by two), behind ${s13.behind}; 2014 ahead ${s14.ahead} (${s14.two} by two), behind ${s14.behind}`);
const asahna14 = W.missHours(W.jdnFromYmd(2014, 7, 11));
check(W.iso(asahna14.jdn) === '2014-07-12' && asahna14.hour.toFixed(1) === '18.4',
  `the paper's Asahna Bucha 2557: the calendar's 11 July, the sky full on ${W.iso(asahna14.jdn)} at ${asahna14.hour.toFixed(1)} h Thai time (the paper: 12 July)`);

// --- an Indian source for the tithi: the Calendar Reform Committee's 1954 table (tithi1954.mjs) ---
const T54 = await import('./tithi1954.mjs');
const t54 = T54.rows();
const gaps = t54.map((r) => r.mine - r.printed);
const worstGap = Math.max(...gaps.map(Math.abs));
check(t54.length === 11 && t54.every((r) => r.mine !== null) && worstGap < 1,
  `the 1955 report's 11 printed tithi endings (Sept-Oct 1954, IST) against this build's Sun and Moon: worst gap ${worstGap.toFixed(2)} min (the page prints whole minutes)`);
check(t54.every((r) => r.old - r.printed === r.err),
  'the table adds up: Old Method minus Modern is the printed error, in all 11 rows');
const ph = t54.filter((r) => r.phase !== null);
const worstPh = Math.max(...ph.map((r) => Math.abs(r.phase - r.printed)));
check(ph.length === 3 && ph.find((r) => r.n === 15).printed === 10 * 60 + 40 && worstPh < 1,
  `tithi 15 ends at the full moon and tithi 30 at the new moon: the printed 10:40 of 12 Oct and the two new moons are within ${worstPh.toFixed(2)} min of Meeus ch. 49`);
const w54 = T54.rows(T54.WHAT_IF_DT);
const wGaps = w54.map((r) => r.mine - r.printed);
const wWorst = Math.max(...wGaps.map(Math.abs));
const wPh = Math.max(...w54.filter((r) => r.phase !== null).map((r) => Math.abs(r.phase - r.printed)));
check(wGaps.every((g) => g > 0) && wWorst < 1.5 && wPh < 1,
  `with ΔT ${T54.WHAT_IF_DT} s instead of the build's (a what-if): every gap is positive, the worst is ${wWorst.toFixed(2)} min, and tithis 15 and 30 are still within ${wPh.toFixed(2)} min of the ch. 49 moons`);
const worstOld = Math.max(...t54.map((r) => Math.abs(r.err)));
check(worstOld === 5 * 60 + 38, `the old method's largest error in the table: ${Math.floor(worstOld / 60)} h ${worstOld % 60} m`);

// --- the other order: Access to Insight's 2002 Dhammayut list (dhammayut2002.mjs) ---
const D02 = await import('./dhammayut2002.mjs');
const d02 = D02.rows();
check(d02.length === 49 && d02.filter((r) => r.star).length === 10
  && d02.filter((r) => r.label).length === 5 && d02.filter((r) => r.label).every((r) => r.phase === 'full moon'),
  '2002 list: 49 days, 10 asterisks, and all 5 named festivals fall in the full-moon column');
const ab = D02.againstBuild();
check(ab.built === 49 && ab.off.length === 0,
  `2002, a year the build was never checked in: the ${ab.n} Mahanikaya days the list implies (asterisk = the day before) are the build's ${ab.built}, every date and kind`);
const fm02 = D02.fullMoons();
const onM = fm02.filter((x) => x.missMaha === 0).length, onD = fm02.filter((x) => x.missDham === 0).length;
const split02 = fm02.filter((x) => x.star);
check(fm02.length === 12 && onM === 5 && onD === 7
  && split02.map((x) => W.iso(x.dham)).join() === '2002-04-27,2002-06-25' && split02.every((x) => x.missDham === 0 && x.missMaha < 0),
  `12 full moons: the sky is full inside the Dhammayut day ${onD} times and the build's ${onM}; the two asterisked ones (27 Apr, 25 Jun) are inside the Dhammayut day and after the Mahanikaya one`);
const l0 = D02.lead(0), l6 = D02.lead(6);
const tl = (rs, k) => { const v = D02.tally(rs, k); return `${v.ahead}/${v.same}/${v.behind}`; };
const st0 = l0.filter((x) => x.star), st6 = l6.filter((x) => x.star);
check(tl(l0, 'leadMaha') === '25/24/0' && tl(l0, 'leadDham') === '19/29/1' && tl(st0, 'leadMaha') === '8/2/0' && tl(st0, 'leadDham') === '2/7/1',
  `true tithi at 00:00, ahead/same/behind: all 49 Mahanikaya ${tl(l0, 'leadMaha')}, Dhammayut ${tl(l0, 'leadDham')}; the 10 asterisked Mahanikaya ${tl(st0, 'leadMaha')}, Dhammayut ${tl(st0, 'leadDham')}`);
check(tl(l6, 'leadMaha') === '16/30/3' && tl(l6, 'leadDham') === '13/29/7' && tl(st6, 'leadMaha') === '5/5/0' && tl(st6, 'leadDham') === '2/4/4',
  `true tithi at 06:00, ahead/same/behind: all 49 Mahanikaya ${tl(l6, 'leadMaha')}, Dhammayut ${tl(l6, 'leadDham')}; the 10 asterisked Mahanikaya ${tl(st6, 'leadMaha')}, Dhammayut ${tl(st6, 'leadDham')} (my guess before the run, Mahanikaya ahead on all 10 and Dhammayut on none, was wrong)`);

const mv = (h) => { const v = D02.moves(h); return `${v.fixed}/${v.stillEarly}/${v.madeLate}/${v.same}/${v.other}`; };
check(mv(0) === '6/2/1/1/0' && mv(6) === '3/2/4/1/0',
  `the 10 moved days, fixed/still early/made late/no change/other: at 00:00 ${mv(0)}, at 06:00 ${mv(6)}`);
const miss02 = fm02.filter((x) => x.missDham !== 0);
check(miss02.length === 5 && miss02.every((x) => !x.star && x.missDham < 0),
  `the ${miss02.length} full moons the Dhammayut day misses are days both orders share, and on all of them the sky is full after the day ends`);

// --- the face carries this file, not an older copy of it ---
const { inlined } = await import('./make-demo.mjs');
const { readFileSync } = await import('node:fs');
const face = readFileSync(new URL('./demo.html', import.meta.url), 'utf8');
check(face.includes(inlined()), 'demo.html carries the current wanphra.mjs (run make-demo.mjs if not)');
check(face.includes(C.faceLine()), 'demo.html carries the current count line from count.mjs (run make-demo.mjs if not)');
check(face.includes(T54.faceLine1954()), 'demo.html carries the current 1954 line from tithi1954.mjs (run make-demo.mjs if not)');
check(face.includes(D02.faceLine2002()), 'demo.html carries the current 2002 line from dhammayut2002.mjs (run make-demo.mjs if not)');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
