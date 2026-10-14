// ledger.mjs: every place these reports say one number two ways, as a check.
// Each check has two sides (a and b), each with its road; it meets when they are equal.
// For a check that misses, swapsThatMeet() tries every swap of two neighbouring digits
// in each printed number and lists the ones that would make it meet. It says what
// would fit, not what happened.
import { TABLE, TABLE_SOURCE, TABLE_TEXT, YEARS, ENTRANCE, DIVISIONS_1926, MATURA_1930 } from './rows.mjs';

const sum = (xs) => xs.reduce((s, x) => s + (x ?? 0), 0);
export const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
export const pctOf = (p, e, d) => round((100 * p) / e, d);

// Every number made by swapping two neighbouring digits of n (no leading zero, not n itself).
export function neighbourSwaps(n) {
  const s = String(n), out = [];
  for (let i = 0; i + 1 < s.length; i++) {
    const t = s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
    if (t !== s && t[0] !== '0') out.push(Number(t));
  }
  return out;
}

// nums: {name: value}; meets(nums) -> bool. Returns ["name: 97 → 79", ...].
export function swapsThatMeet(nums, meets) {
  const found = [];
  for (const [k, v] of Object.entries(nums)) {
    for (const w of neighbourSwaps(v)) if (meets({ ...nums, [k]: w })) found.push(`${k}: ${v} → ${w}`);
  }
  return found;
}

// For a printed percentage: the pass counts, and the examined counts, that would give it.
export function readings(e) {
  const passed = [], examined = [];
  for (let p = 0; p <= e.examined; p++) if (pctOf(p, e.examined, e.decimals) === e.pct) passed.push(p);
  for (let x = e.passed; x <= 3 * e.examined; x++) if (pctOf(e.passed, x, e.decimals) === e.pct) examined.push(x);
  return { passed, examined };
}

const side = (label, value, road, where) => ({ label, value, road, where });
const src = (r) => ({ report: r.report, page: r.page, leaf: r.leaf });

export function checks() {
  const C = [];
  const add = (group, id, say, a, b, extra = {}) => C.push({ group, id, say, a, b, meets: a.value === b.value, ...extra });
  const T = TABLE_SOURCE;

  // 1. The ten-year table: each row's cells against its printed total.
  for (const [year, cells, total] of TABLE) {
    const s = sum(cells);
    add('table', `row-${year}`, `${year}: the row's classes, added, against its printed total`,
      side('classes added', s, T.road, T), side('printed total', total, T.road, T),
      s === total ? {} : { swaps: swapsThatMeet({ total, ...Object.fromEntries(cells.map((c, i) => [`col${i}`, c]).filter(([, c]) => c != null)) },
        (m) => sum(Object.entries(m).filter(([k]) => k !== 'total').map(([, v]) => v)) === m.total) });
  }
  // The sentence above the table names two of its totals.
  const row = (y) => TABLE.find((r) => r[0] === y)[2];
  add('table', 'text-1913', 'the sentence above the table, against the 1913/14 row', side('sentence', TABLE_TEXT.from, T.road, T), side('table', row('1913/14'), T.road, T));
  add('table', 'text-1918', 'the sentence above the table, against the 1918/19 row', side('sentence', TABLE_TEXT.to, T.road, T), side('table', row('1918/19'), T.road, T));

  // 2. Who is counted: start of year + those who came, against the table's year total.
  for (const y of ['1926/27', '1927/28']) {
    const Y = YEARS[y];
    add('count', `start-came-${y}`, `${y}: start of year plus those who came during it, against the table's total`,
      side(`${Y.start.value} + ${Y.came.value}`, Y.start.value + Y.came.value, Y.start.road === 'print' && Y.came.road === 'print' ? 'print' : 'ocr', src(Y.start)),
      side('table total', row(y), T.road, T));
  }
  // The doctor's count of pupils examined, against the table's year total.
  for (const y of ['1926/27', '1927/28', '1928/29']) {
    const Y = YEARS[y];
    add('count', `doctor-table-${y}`, `${y}: the school doctor's count, against the table's total`,
      side('doctor', Y.doctor.value, Y.doctor.road, src(Y.doctor)), side('table total', row(y), T.road, T),
      Y.doctor.value === row(y) ? {} : { swaps: swapsThatMeet({ doctor: Y.doctor.value, total: row(y) }, (m) => m.doctor === m.total),
        note: Y.doctor.value === Y.start.value ? `the doctor's ${Y.doctor.value} is the start-of-year count` : '' });
  }
  // The doctor's three groups, against his own total.
  for (const y of ['1926/27', '1927/28', '1929/30', '1930/31']) {
    const Y = YEARS[y];
    add('count', `groups-${y}`, `${y}: the doctor's three groups, added, against his total`,
      side(Y.groups.value.join(' + '), sum(Y.groups.value), Y.groups.road, src(Y.groups)), side('doctor', Y.doctor.value, Y.doctor.road, src(Y.doctor)));
  }
  const s2 = YEARS['1927/28'].split2;
  add('count', 'split2-1927/28', '1927/28: a second three-way split in the doctor\'s report, added, against his total',
    side(s2.value.join(' + '), sum(s2.value), s2.road, src(s2)), side('doctor', YEARS['1927/28'].doctor.value, 'print', src(YEARS['1927/28'].doctor)));
  // Across two reports: 1929/30 says it began with 20 fewer than the year before.
  const a = YEARS['1928/29'].start, b = YEARS['1929/30'].start, f = YEARS['1929/30'].fewer;
  add('count', 'twenty-fewer', '1929/30 began with "20 fewer than the year before": 1928/29\'s start, less 20, against 1929/30\'s',
    side(`${a.value} − ${f.value}`, a.value - f.value, 'print', src(a)), side('1929/30 start', b.value, b.road, src(b)));
  // 1928/29: 16 classes, two divisions each, so 8 grades; the table's row has 8 filled.
  const c = YEARS['1928/29'].classes;
  add('count', 'divisions-1928/29', '1928/29: "16 classes, each grade in 2 divisions", against the grades filled in the table\'s row',
    side('16 ÷ 2', c.value / 2, c.road, src(c)), side('grades in the row', TABLE.find((r) => r[0] === '1928/29')[1].filter((x) => x != null).length, T.road, T));

  // 3. Entrance exams: the printed percentage against passed ÷ examined.
  for (const e of ENTRANCE) {
    const got = pctOf(e.passed, e.examined, e.decimals);
    const meets = got === e.pct;
    add('exam', `entrance-${e.year}`, `${e.year}: ${e.passed} passed of ${e.examined}, against the printed ${String(e.pct).replace('.', ',')}%`,
      side(`${e.passed} ÷ ${e.examined}, rounded as printed`, got, e.road, { report: e.year, page: e.page, leaf: e.leaf }),
      side('printed %', e.pct, e.road, { report: e.year, page: e.page, leaf: e.leaf }),
      meets ? {} : { swaps: swapsThatMeet({ passed: e.passed, examined: e.examined }, (m) => pctOf(m.passed, m.examined, e.decimals) === e.pct), readings: readings(e) });
  }
  const D = DIVISIONS_1926;
  add('exam', 'divisions-1926/27', '1926/27: the 66 who entered class I and 12 repeaters, against the two divisions',
    side(`${D.entered} + ${D.repeaters}`, D.entered + D.repeaters, D.road, { report: '1926/27', page: D.page, leaf: D.leaf }),
    side(D.divisions.join(' + '), sum(D.divisions), D.road, { report: '1926/27', page: D.page, leaf: D.leaf }));
  const M = MATURA_1930;
  add('exam', 'matura-a-1929/30', '1929/30 matura: those who wrote the first paper, against those admitted',
    side(M.paperA.join(' + '), sum(M.paperA), M.road, { report: '1929/30' }), side(M.admitted.join(' + '), sum(M.admitted), M.road, { report: '1929/30' }));
  add('exam', 'matura-b-1929/30', '1929/30 matura: those who wrote the second paper, against those admitted',
    side(M.paperB.join(' + '), sum(M.paperB), M.road, { report: '1929/30' }), side(M.admitted.join(' + '), sum(M.admitted), M.road, { report: '1929/30' }));

  return C;
}

// The road of a check is its weaker side: print only if both sides were read on the page.
export const roadOf = (c) => (c.a.road === 'print' && c.b.road === 'print' ? 'print' : 'ocr');
