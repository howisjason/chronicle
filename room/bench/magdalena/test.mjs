// test.mjs: the checks. Run: bash room/tools/try.sh magdalena test.mjs
// Every number the README says is asserted here; the misses are asserted as misses.
import { readFileSync, existsSync } from 'node:fs';
import { TABLE, YEARS, ENTRANCE, REPORTS } from './rows.mjs';
import { checks, roadOf, neighbourSwaps, swapsThatMeet, pctOf } from './ledger.mjs';

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`);
}

// The helpers, on cases worked by hand.
check('neighbourSwaps(97) is [79]; 103 gives only 130 (no leading zero)', neighbourSwaps(97).join() === '79' && neighbourSwaps(103).join() === '130');
check('swapsThatMeet finds 97 → 79 for 49 at 62%', swapsThatMeet({ examined: 97 }, (m) => pctOf(49, m.examined, 0) === 62).join() === 'examined: 97 → 79');

const C = checks();
console.log('');
for (const c of C) console.log(`  ${c.meets ? 'meets ' : 'MISSES'} [${roadOf(c)}] ${c.say}: ${c.a.value} | ${c.b.value}` + (c.swaps ? `  swaps: ${c.swaps.join('; ') || 'none'}` : '') + (c.readings ? `  readings: passed ${c.readings.passed.join(',') || '-'}, examined ${c.readings.examined.join(',') || '-'}` : '') + (c.note ? `  (${c.note})` : ''));
console.log('');

const misses = C.filter((c) => !c.meets);
const ids = misses.map((c) => c.id).join(' ');
check('33 checks, 29 meet and 4 miss', C.length === 33 && misses.length === 4, `${C.length} checks, ${misses.length} miss`);
check('the four misses: the 1919/20 row, the 1927/28 doctor, the 1926/27 and 1928/29 entrance exams',
  ids === 'row-1919/20 doctor-table-1927/28 entrance-1926/27 entrance-1928/29', ids);
const printed = C.filter((c) => roadOf(c) === 'print').length;
check('23 checks were read on the page on both sides, 10 came through the OCR on at least one', printed === 23 && C.length - printed === 10, `${printed} print`);
check('all four misses were read on the page, on both sides', misses.every((c) => roadOf(c) === 'print'));

// The table.
const rows = C.filter((c) => c.id.startsWith('row-'));
check('12 rows in the table, 11 add up to their printed total', rows.length === 12 && rows.filter((c) => c.meets).length === 11);
const r19 = C.find((c) => c.id === 'row-1919/20');
check('1919/20: the classes add to 886, the table prints 865, 21 apart', r19.a.value === 886 && r19.b.value === 865);
check('no swap of two neighbouring digits closes 1919/20', r19.swaps.length === 0);
check('the sentence above the table names the 651 and 789 of its first two rows', C.find((c) => c.id === 'text-1913').meets && C.find((c) => c.id === 'text-1918').meets);

// Who is counted.
check('start + those who came is the table\'s total in both years that say how many came (548, 514)',
  C.filter((c) => c.id.startsWith('start-came-')).every((c) => c.meets) && YEARS['1926/27'].start.value + 4 === 548 && YEARS['1927/28'].start.value + 4 === 514);
const doc = C.filter((c) => c.id.startsWith('doctor-table-'));
check('the doctor\'s count is the table\'s total in 1926/27 and 1928/29, but not in 1927/28',
  doc.map((c) => c.meets).join() === 'true,false,true');
const d28 = C.find((c) => c.id === 'doctor-table-1927/28');
check('1927/28: the doctor says 510, the table 514, and 510 is that year\'s start count', d28.a.value === 510 && d28.b.value === 514 && d28.note.includes('start-of-year') && d28.swaps.length === 0);
check('the doctor\'s three groups add to his total in all four years that give them', C.filter((c) => c.id.startsWith('groups-')).length === 4 && C.filter((c) => c.id.startsWith('groups-')).every((c) => c.meets));
check('1927/28\'s second split (311 + 113 + 86) is 510 too', C.find((c) => c.id === 'split2-1927/28').meets);
check('442 − 20 = 422, across two reports', C.find((c) => c.id === 'twenty-fewer').meets);
check('1928/29: 16 divisions, 8 grades in the table\'s row', C.find((c) => c.id === 'divisions-1928/29').meets);
// What isn't a check, named: the doctor's 445 and 425 sit 3 above the start counts 442 and 422,
// and no sentence I read says who the three are.
check('the doctor counts 3 more than the start in 1928/29 and in 1929/30', YEARS['1928/29'].doctor.value - YEARS['1928/29'].start.value === 3 && YEARS['1929/30'].doctor.value - YEARS['1929/30'].start.value === 3);

// The entrance exams.
const ent = (y) => C.find((c) => c.id === `entrance-${y}`);
check('1927/28 and 1929/30 percentages match their counts', ent('1927/28').meets && ent('1929/30').meets);
check('1926/27: 74 of 103 is 71.8%, printed 82,5%', ent('1926/27').a.value === 71.8 && !ent('1926/27').meets);
check('1926/27: no neighbour swap fits; only 85 passed of 103 would give 82,5%, and no number examined would with 74',
  ent('1926/27').swaps.length === 0 && ent('1926/27').readings.passed.join() === '85' && ent('1926/27').readings.examined.length === 0);
check('1928/29: 49 of 97 is 50.5%, 51 to the whole percent, printed 62%', ent('1928/29').a.value === 51 && !ent('1928/29').meets);
check('1928/29: the one swap that fits is 97 → 79; 60 passed of 97 would fit too, with no swap',
  ent('1928/29').swaps.join() === 'examined: 97 → 79' && ent('1928/29').readings.passed.join() === '60' && ent('1928/29').readings.examined.join() === '79');
const allSwaps = misses.flatMap((c) => c.swaps || []);
check('of the four misses, one swap of neighbouring digits closes one of them, and nothing else', allSwaps.length === 1, allSwaps.join('; '));
check('66 + 12 = 40 + 38 in 1926/27', C.find((c) => c.id === 'divisions-1926/27').meets);
check('1929/30 matura: both papers were written by 32, as many as were admitted', C.find((c) => c.id === 'matura-a-1929/30').meets && C.find((c) => c.id === 'matura-b-1929/30').meets);

// Nothing here names a person. The names I met on those pages are kept in the drawer
// (never public), one per line, and every file here is checked against them.
const drawer = new URL('../../drawer/magdalena-names.txt', import.meta.url);
const NAMES = existsSync(drawer) ? readFileSync(drawer, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : null;
const named = (text) => NAMES.filter((w) => text.includes(w));
if (NAMES) {
  for (const f of ['rows.mjs', 'ledger.mjs', 'gen.mjs', 'test.mjs', 'README.md']) {
    const u = new URL(f, import.meta.url);
    if (existsSync(u)) { const hit = named(readFileSync(u, 'utf8')); check(`no name from those pages in ${f}`, hit.length === 0, hit.length ? `${hit.length} found` : `(${NAMES.length} names)`); }
  }
} else console.log('     (the drawer\'s name list is not here, so the name checks are skipped)');
check('five reports, each with a link', Object.keys(REPORTS).length === 5);

// The face is made from these checks.
if (existsSync(new URL('demo.html', import.meta.url))) {
  const html = readFileSync(new URL('demo.html', import.meta.url), 'utf8');
  check('the face shows 33 checks, 4 of them misses', (html.match(/<li class="ck /g) || []).length === 33 && (html.match(/<li class="ck miss/g) || []).length === 4);
  if (NAMES) check('the face names no one either', named(html).length === 0);
} else check('demo.html exists (run gen.mjs)', false);

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
