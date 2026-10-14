// rows.mjs: every number the ledger uses, where it is printed, and by which road I read it.
//
// road 'print': I read it on the page image myself (archive.org's scan, leaf n<k>).
// road 'ocr':   it came through archive.org's OCR text of the scan, by way of a
//               summarising page reader. Not seen on the page; its quote keeps the
//               OCR's own slips ("Zdalo", "76.40/0"), and "…" marks words left out.
//
// The quotes are the report's own words around the number, cut back so that no
// person's name is in them. Nothing here names a pupil, a teacher or a doctor.

export const REPORTS = {
  '1926/27': 'jbc.bj.uj.edu.pl.0002_NDIGCZAS031123_89470149',
  '1927/28': 'jbc.bj.uj.edu.pl.0003_NDIGCZAS031123_89470152',
  '1928/29': 'jbc.bj.uj.edu.pl.0004_NDIGCZAS031123_89470156',
  '1929/30': 'jbc.bj.uj.edu.pl.0005_NDIGCZAS031123_89470159',
  '1930/31': 'jbc.bj.uj.edu.pl.0006_NDIGCZAS031123_89470162',
};

// A leaf link opens the scan at that page; with no leaf, the item.
export const link = (report, leaf) =>
  `https://archive.org/details/${REPORTS[report]}` + (leaf != null ? `/page/n${leaf}/mode/1up` : '');

// The ten-year table, 1928/29 report, printed page 5 (leaf n6), road print.
// "Pod wrażeniem dziesięciolecia podajemy jedynie zestawienie ilości uczniów w każdem z tych lat."
// Columns: klasa wstępna (preparatory), I to IX, the soldiers' matura course, then Razem (total).
// null is a printed dash. 1913/14 and 1918/19 are the two Prussian years the table gives for comparison.
export const TABLE_SOURCE = { report: '1928/29', page: 5, leaf: 6, road: 'print' };
export const TABLE_COLUMNS = ['prep', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'course'];
export const TABLE = [
  ['1913/14', [null, 94, 88, 86, 84, 75, 80, 59, 46, 39, null], 651],
  ['1918/19', [null, 108, 95, 93, 98, 90, 101, 82, 54, 20, 48], 789],
  ['1919/20', [33, 176, 150, 112, 110, 85, 91, 60, 44, null, 25], 865],
  ['1920/21', [31, 185, 151, 139, 104, 87, 89, 56, 50, null, 29], 921],
  ['1921/22', [null, 79, 86, 64, 78, 59, 80, 54, 44, null, 28], 572],
  ['1922/23', [null, 91, 66, 90, 75, 69, 54, 75, 55, null, null], 575],
  ['1923/24', [null, 152, 69, 68, 94, 61, 57, 50, 65, null, null], 616],
  ['1924/25', [null, 104, 108, 62, 58, 77, 59, 50, 51, null, null], 569],
  ['1925/26', [null, 81, 111, 71, 60, 47, 75, 59, 50, null, null], 554],
  ['1926/27', [null, 79, 95, 86, 72, 47, 45, 73, 51, null, null], 548],
  ['1927/28', [null, 65, 85, 90, 68, 55, 45, 40, 66, null, null], 514],
  ['1928/29', [null, 54, 63, 78, 81, 45, 53, 35, 36, null, null], 445],
];
// The sentence above the table, same page: "(z 651 na 789)".
export const TABLE_TEXT = { from: 651, to: 789, quote: 'wzrosła tak znacznie liczba uczniów (z 651 na 789)' };

// A number in a report: value, where, road, and its own words.
const n = (value, report, page, leaf, road, quote) => ({ value, report, page, leaf, road, quote });

// Each year's own counts.
export const YEARS = {
  '1926/27': {
    start: n(544, '1926/27', null, null, 'ocr', 'Na początku roku szkolnego było 544 uczniów.'),
    came: n(4, '1926/27', null, null, 'ocr', 'W ciągu roku”przybyli jeszcze 4.'),
    doctor: n(548, '1926/27', null, null, 'ocr', 'W ciagu roku za$ zbadal 548 uczniów dwukrottnie'),
    groups: n([80, 230, 238], '1926/27', null, null, 'ocr', 'Do 1-ej należało uczniów 80, do 2-giej 230, do 3-ciej wreszcie 238'),
  },
  '1927/28': {
    start: n(510, '1927/28', 4, 5, 'print', 'Na początku roku szkolnego było uczniów 510.'),
    came: n(4, '1927/28', 4, 5, 'print', 'W ciągu roku przybyło jeszcze 4.'),
    doctor: n(510, '1927/28', 26, 27, 'print', 'W ciągu roku zaś zbadał 510 uczniów dwukrotnie'),
    groups: n([90, 210, 210], '1927/28', 26, 27, 'print', 'Do I-ej zaliczył uczniów 90, … do II-giej 210 …, do III-ciej wreszcie również 210'),
    // A second three-way split of the same pupils, further down the same page.
    split2: n([311, 113, 86], '1927/28', 26, 27, 'print', 'było uczniów 311, … było 113, … 86'),
  },
  '1928/29': {
    start: n(442, '1928/29', 9, 18, 'print', 'Na początku roku szkolnego było uczniów 442.'),
    classes: n(16, '1928/29', 9, 18, 'print', 'Umieściło się ich w 16 klasach tak, że każda klasa miała po 2 oddziały.'),
    doctor: n(445, '1928/29', null, null, 'ocr', 'W ciągu roku zbadał dwukrotnie 445 uczniów'),
  },
  '1929/30': {
    start: n(422, '1929/30', 6, 7, 'print', 'Na początku roku szkolnego było uczniów 422,'),
    fewer: n(20, '1929/30', 6, 7, 'print', 'w porównaniu z rokiem poprzednim o 20 mniej.'),
    doctor: n(425, '1929/30', null, null, 'ocr', 'W ciągu roku zbadał dwukrotnie 425 uczniów'),
    groups: n([77, 162, 186], '1929/30', null, null, 'ocr', 'Do I-szej zaliczył uczniów 77, do II-giej 162 …, do III-ciej 186'),
  },
  '1930/31': {
    doctor: n(455, '1930/31', null, null, 'ocr', 'zbadał dwukrotnie u 455 uczniów'),
    groups: n([75, 158, 222], '1930/31', null, null, 'ocr', 'Do I-szej zaliczył uczniów 75, … do II-giej — 158 …, do III-ciej 222'),
  },
};

// The entrance exam to class I, each year: examined, passed, and the percentage the
// report prints beside them, with the decimals it prints.
export const ENTRANCE = [
  { year: '1926/27', examined: 103, passed: 74, pct: 82.5, decimals: 1, page: 3, leaf: 2, road: 'print',
    quote: 'Egzaminowano 103 kandydatów. Egzamin zdało pomyślnie 74 (82,5 %).' },
  { year: '1927/28', examined: 72, passed: 55, pct: 76.4, decimals: 1, page: null, leaf: null, road: 'ocr',
    quote: 'Egzaminowano 72 kandydatów. Egzamin zdało pomyślnie 55 (76.40/0).' },
  { year: '1928/29', examined: 97, passed: 49, pct: 62, decimals: 0, page: 9, leaf: 18, road: 'print',
    quote: 'Egzaminowano 97 kandydatów. Egzamin zdało pomyślnie 49 (62 %).' },
  { year: '1929/30', examined: 62, passed: 43, pct: 69, decimals: 0, page: null, leaf: null, road: 'ocr',
    quote: 'Egzaminowano 62 kandydatów. Zdalo egzamin pomyślnie 43 (69%).' },
];

// 1926/27: of those who passed, 66 entered class I, and with 12 repeaters made two divisions.
export const DIVISIONS_1926 = { entered: 66, repeaters: 12, divisions: [40, 38], page: 3, leaf: 2, road: 'print',
  quote: 'Z nich weszło do klasy I. tylko 66 i ci wraz z 12 powtarzającymi klasę dali materjał na dwa oddziały (40+38).' };

// 1929/30 matura: admitted from the two eighth classes, and how many wrote each of two papers.
export const MATURA_1930 = { admitted: [17, 15], paperA: [17, 15], paperB: [10, 22], road: 'ocr',
  quote: 'Dopuszczeni byli do niego wszyscy (17--15) uczniowie klas ósmych.' };
