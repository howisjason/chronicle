// test.mjs: the checks. Run: bash room/tools/try.sh fourteen-or-fifteen test.mjs
// Every number the README and the face give is asserted here. Written before the
// first run, my guess: all of them pass, because count.mjs printed them already.
import { readFileSync } from 'node:fs';
import { TEMPLES, VARIANTS } from './sources.mjs';
import { rows, names, S14, same, minus, kyoto, spell, unkana } from './count.mjs';

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`);
}

const R = rows();
const row = (id) => R.find((r) => r.src.id === id);
const n = (set) => R.filter((r) => r.set === set).length;

// The readers.
check('spell() leaves every name as this build writes it, and changes only 天竜, 方廣, 仏通 and the old forms 禪, 圓, 覺, 國',
  Object.values(TEMPLES).every((t) => spell(t.ja) === t.ja) && Object.keys(VARIANTS).length === 7 && spell('天竜寺方廣寺仏通寺南禪寺圓覺寺相國寺國泰寺') === '天龍寺方広寺佛通寺南禅寺円覚寺相国寺国泰寺');
check('unkana() takes both shapes of kana reading off a name', unkana('相国寺しょうこくじ派') === '相国寺派' && unkana('興聖(こうしょう)寺派') === '興聖寺派');

// What each source says against what it names.
check('12 sources', R.length === 12, `${R.length}`);
// A number of Rinzai branches is held against the Rinzai temples a source names; Manpuku-ji is Ōbaku's.
const counts = (r) => (r.src.of === 'Rinzai branches' ? r.counted.filter((id) => id !== 'manpuku') : r.counted);
const both = R.filter((r) => r.src.says != null && r.counted);
check('all 7 sources that give a number and a list: the number is what the list counts',
  both.length === 7 && both.every((r) => counts(r).length === r.src.says), both.map((r) => `${r.src.id} ${r.src.says}/${counts(r).length}`).join(', '));
check('no source names a set other than these three, or part of the first',
  R.every((r) => r.set !== 'something else'));
check('4 count exactly the fourteen, 3 the fourteen + Kōshō-ji, 2 list the fourteen + Manpuku-ji, 1 nine of the fourteen, 2 no list',
  n('the fourteen') === 4 && n('the fourteen + Kōshō-ji') === 3 && n('the fourteen + Manpuku-ji (Ōbaku)') === 2 && n('9 of the fourteen, “and so on”') === 1 && n('no list') === 2);
check('5 sources say 14 and 4 say 15', R.filter((r) => r.src.says === 14).length === 5 && R.filter((r) => r.src.says === 15).length === 4);
check('every 15 that counts Rinzai alone is the fourteen + Kōshō-ji',
  R.filter((r) => r.src.says === 15 && r.src.of === 'Rinzai branches').every((r) => r.set === 'the fourteen + Kōshō-ji'));
check('Daijisen counts 14 and names Kōshō-ji apart from them',
  row('daijisen').set === 'the fourteen' && row('daijisen').apart.join() === 'kosho');

// The two fifteens. This follows from the set checks above; it is here because it is the point.
const council = row('council-ja').counted, wiki = row('en-rinzai').counted;
check('the Council’s fifteen and English Wikipedia’s fifteen share 14, and each has one the other lacks',
  minus(council, wiki).join() === 'manpuku' && minus(wiki, council).join() === 'kosho');

check('the Council’s Japanese and English pages name the same fifteen',
  same(council, row('council-en').counted));

// Where English Wikipedia's fifteen comes from.
check('both English pages cite the Council’s English head-temples page',
  row('en-buttsuji').src.cites === 'council-en' && row('en-rinzai').src.cites === 'council-en');
check('that cited page names no Kōshō-ji, and Kōshō-ji’s line on the Rinzai page carries refs of its own',
  !row('council-en').counted.includes('kosho') && row('en-rinzai').src.ownRefs.join() === 'kosho');
check('“8 in Kyoto” holds for the fifteen with Kōshō-ji (8), and is 7 for the fourteen',
  kyoto(wiki) === row('en-rinzai').src.kyoto && kyoto(wiki) === 8 && kyoto(S14) === 7);

// The face.
const face = readFileSync(new URL('demo.html', import.meta.url), 'utf8');
check('demo.html has a row for each of the 12 sources, and no peek line left in it',
  (face.match(/<tr class="src/g) || []).length === R.length && !face.includes('nth-child(-n+'));

console.log(`\n${pass} ok, ${fail} failed`);
if (fail) process.exit(1);
