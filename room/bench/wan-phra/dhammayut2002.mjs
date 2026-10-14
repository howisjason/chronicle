// dhammayut2002.mjs: the other order's holy days, from a printed list.
// Thailand's two monastic orders keep different uposatha days. The Mahanikaya
// follow the civil lunar calendar, which is what wanphra.mjs computes. The
// Dhammayut follow Pakkhaganana, a reckoning of half-months that Rama IV devised.
// Access to Insight's list for 2002 (https://www.accesstoinsight.org/ptf/dhamma/sila/uposatha.html,
// read at the copy https://cdn.britannica.com/primary_source/gutenberg/PGCC_classics/ptf/uposatha.html;
// the live page no longer has the table) gives the Dhammayut days, "provided by
// Metta Forest Monastery and Abhayagiri Buddhist Monastery", and says: "On dates
// marked with an asterisk, followers of the Mahanikaya sect observe the Uposatha
// the preceding day." I read it twice through the summarising page reader, once
// as the cells in order and once month by month; the two readings agree.
//
// This checks the build against the Mahanikaya days the list implies, then sets
// both orders' days against the sky.
//   bash room/tools/try.sh wan-phra dhammayut2002.mjs
import * as W from './wanphra.mjs';
import * as C from './count.mjs';

// [month, day, asterisk, label], as printed, in the page's order. The columns are
// Last Quarter, New Moon, First Quarter, Full Moon, and the first cell (6 Jan) is
// a last quarter, so the phase is the row's place in that cycle of four.
export const ROWS_2002 = [
  [1, 6], [1, 13], [1, 21], [1, 28],
  [2, 5], [2, 12, '*'], [2, 20, '*'], [2, 26, '', 'Magha Puja'],
  [3, 6], [3, 13], [3, 21], [3, 28],
  [4, 5], [4, 12, '*'], [4, 20, '*'], [4, 27, '*'],
  [5, 5, '*'], [5, 11], [5, 19], [5, 26, '', 'Visakha Puja'],
  [6, 3], [6, 10, '*'], [6, 18, '*'], [6, 25, '*'],
  [7, 3, '*'], [7, 9], [7, 17], [7, 24, '', 'Asalha Puja'],
  [8, 1], [8, 8], [8, 16], [8, 23],
  [8, 31], [9, 6], [9, 14], [9, 21],
  [9, 29], [10, 6], [10, 14], [10, 21, '', 'Pavarana Day'],
  [10, 29], [11, 4], [11, 12], [11, 19, '', 'Anapanasati Day'],
  [11, 27], [12, 4], [12, 12], [12, 19],
  [12, 27],
];
const PHASES = ['last quarter', 'new moon', 'first quarter', 'full moon'];

// The list's rows with both orders' days: the printed day is the Dhammayut one,
// and an asterisk puts the Mahanikaya one the day before.
export function rows() {
  return ROWS_2002.map(([mo, d, star = '', label = ''], i) => {
    const dham = W.jdnFromYmd(2002, mo, d);
    return { i, mo, d, star: star === '*', label, phase: PHASES[i % 4], dham, maha: dham - (star === '*' ? 1 : 0) };
  });
}

// The build's own 2002, with clash 'defer' (holyDaysInYear's default, the one
// every other check here uses).
export const build2002 = () => W.holyDaysInYear(2002, 'defer').filter((h) => h.wanPhra);
const kindOf = (h) => (h.day === 8 ? 'first quarter' : h.day === 15 ? 'full moon' : h.day === 23 ? 'last quarter' : 'new moon');

// Every row against the build: the same date and the same kind of day.
export function againstBuild() {
  const b = build2002();
  const r = rows();
  const off = r.filter((x, i) => !b[i] || b[i].jdn !== x.maha || kindOf(b[i]) !== x.phase);
  return { n: r.length, built: b.length, off, days: b };
}

// The sky's full moon against each order's day: miss 0 is inside the Thai civil
// day; negative is the calendar early (the moon full after the day ends).
export function fullMoons() {
  return rows().filter((x) => x.phase === 'full moon').map((x) => {
    const m = W.missHours(x.maha), d = W.missHours(x.dham);
    return { ...x, sky: W.iso(m.jdn), hour: m.hour, missMaha: m.miss, missDham: d.miss };
  });
}

// The true tithi at an hour of each day, for both orders. 'ahead' is count.mjs's
// direction: the day's number is past the Moon's true tithi, the day is early.
// The Dhammayut day takes the same number as the build's matching day.
export function lead(hour) {
  const b = build2002();
  return rows().map((x, i) => {
    const n = b[i].day;
    const at = (jdn) => { const t = C.tithiAt(C.jdeAt(jdn, hour)); return ((n - t + 45) % 30) - 15; };
    return { ...x, n, leadMaha: at(x.maha), leadDham: at(x.dham) };
  });
}
// Row by row on the asterisked days, what the day's move did at an hour: an early
// day made right ('fixed'), one still early ('stillEarly'), a right one made late
// ('madeLate'), or no change in where it stands ('same').
export function moves(hour) {
  const r = { fixed: 0, stillEarly: 0, madeLate: 0, same: 0, other: 0 };
  for (const x of lead(hour).filter((y) => y.star)) {
    const [m, d] = [x.leadMaha, x.leadDham];
    if (m > 0 && d === 0) r.fixed++;
    else if (m > 0 && d > 0) r.stillEarly++;
    else if (m === 0 && d < 0) r.madeLate++;
    else if (m === d) r.same++;
    else r.other++;
  }
  return r;
}
export const tally =(rs, key) => ({ ahead: rs.filter((x) => x[key] > 0).length, same: rs.filter((x) => x[key] === 0).length, behind: rs.filter((x) => x[key] < 0).length });

// The line on the face, built from the run (test.mjs checks the face carries it).
export function faceLine2002() {
  const a = againstBuild();
  const f = fullMoons();
  const st = lead(6).filter((x) => x.star);
  const v = tally(st, 'leadDham');
  const nStar = rows().filter((x) => x.star).length;
  const onMaha = f.filter((x) => x.missMaha === 0).length, onDham = f.filter((x) => x.missDham === 0).length;
  const split = f.filter((x) => x.star);
  return `<b>The other order.</b> Thailand's Dhammayut monks keep their own holy days, by a reckoning Rama IV devised. Access to Insight's list for 2002 gives ${a.n} of them and marks ${nStar} as a day after the Mahanikaya's. Move those ${nStar} back a day and the list is this page's 2002, ${a.n - a.off.length} of ${a.n}. Of ${f.length} full moons, the sky is full inside the Dhammayut day ${onDham} times and inside this page's day ${onMaha} times; ${split.length === onDham - onMaha && split.every((x) => x.missDham === 0) ? `on the ${split.length} where the orders keep different days, the moon is full on the Dhammayut one` : 'they differ elsewhere too'}. It is not the true moon either: read at 06:00, its ${nStar} moved days are early on ${v.ahead} and late on ${v.behind}.`;
}

const h1 = (x) => x.toFixed(1);

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = againstBuild();
  console.log(`2002: ${a.n} Dhammayut days on the list, ${rows().filter((x) => x.star).length} with an asterisk; the build has ${a.built} wan phra.`);
  console.log(`Labels fall on full moons: ${rows().filter((x) => x.label).map((x) => `${x.label} (${x.phase})`).join(', ')}`);
  console.log(`The implied Mahanikaya days against the build: ${a.off.length ? a.off.map((x) => `${x.mo}-${x.d} ${x.phase}`).join(', ') : 'every date and kind the same'}`);
  console.log('\nFull moons (Thai time); miss in hours, negative = the day is over before the moon is full:');
  for (const f of fullMoons()) {
    console.log(`  ${f.star ? '*' : ' '} Dhammayut ${W.iso(f.dham)}  Mahanikaya ${W.iso(f.maha)}  sky ${f.sky} ${h1(f.hour)} h   miss: Maha ${h1(f.missMaha)}  Dham ${h1(f.missDham)}`);
  }
  for (const hour of [0, 6]) {
    const rs = lead(hour);
    const st = rs.filter((x) => x.star);
    const t = (k) => { const v = tally(rs, k); return `ahead ${v.ahead}, same ${v.same}, behind ${v.behind}`; };
    const s = (k) => { const v = tally(st, k); return `ahead ${v.ahead}, same ${v.same}, behind ${v.behind}`; };
    console.log(`\nThe true tithi read at ${String(hour).padStart(2, '0')}:00 Thai time:`);
    console.log(`  all ${rs.length}:         Mahanikaya ${t('leadMaha')};  Dhammayut ${t('leadDham')}`);
    console.log(`  the ${st.length} asterisked: Mahanikaya ${s('leadMaha')};  Dhammayut ${s('leadDham')}`);
    console.log(`  asterisked rows (Maha lead / Dham lead): ${st.map((x) => `${x.mo}-${x.d} ${x.leadMaha}/${x.leadDham}`).join('  ')}`);
  }
  console.log(`\nThe face's line:\n  ${faceLine2002().replace(/<\/?b>/g, '')}`);
}
