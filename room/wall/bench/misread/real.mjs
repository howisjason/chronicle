// real.mjs: misread's first real page. A Nantucket bank account book, 1829–31
// (Internet Archive, "MS10 Account Books Collection, AB 438 Bank account book",
// Public Domain Mark), image n12, the book's own page 8: one account, Dr and Cr,
// two blocks on each side, four written totals.
//
// KEY is my reading of it, made before any AI reader ran, from crops at full size
// (3033 × 4565) off the archive's image server. Every amount is in cents. Labels
// are dates only: the page's account name and the initials in its rows are left out.
// Run: node real.mjs (prints the four checks of the key; test.mjs runs the rest).

export const SOURCE = {
  title: 'MS10 Account Books Collection, AB 438 Bank account book',
  item: 'https://archive.org/details/ab438',
  image: 'https://archive.org/download/ab438/page/n12.jpg',
  page: 'the book\'s page 8 (image n12)',
};

// Each block: its lines (date, cents) and the total the writer put under it.
export const KEY = {
  'Dr, first block': {
    lines: [['brought from 64', 1470], ['1830 May 15', 735], ['Jul 20', 735], ['Sep 25', 735], ['Nov 13', 735], ['1831 Jan 25', 735]],
    total: 5145,
  },
  'Cr, first block': {
    lines: [['1830 May 1', 3789], ['1831 Feb 5', 1356]],
    total: 5145,
  },
  'Dr, second block': {
    lines: [['1831 Mar 11', 735], ['May 10', 735], ['Jul 11', 735], ['Jul 12', 204689], ['Aug 16', 11447], ['Sep 6', 735],
      ['Oct 28', 280000], ['Oct 28', 2500], ['Nov 1', 735], ['Nov 2', 7725], ['Nov 4', 21945], ['Nov 5', 50000],
      ['Nov 8', 1000], ['Nov 10', 5000], ['Nov 10', 30000], ['Nov 14', 7163], ['Nov 15', 37364], ['Nov 16', 6693],
      ['Nov 18', 6000], ['Nov 18', 2576], ['Nov 23', 11250], ['Nov 23', 12422], ['Nov 24', 1650], ['Nov 29', 1800],
      ['Nov 30', 700], ['Dec 2', 2250], ['Dec 3', 9425], ['Dec 5', 2100], ['Dec 5', 56822], ['Dec 5', 850],
      ['Dec 8', 1100], ['Dec 8', 500], ['Dec 12', 1337]],
    total: 779983,
  },
  // The last line is the writer's own subtraction, the balance carried to page 438
  // of the next book. It still has to meet the written total, but it was worked out.
  'Cr, second block': {
    lines: [['1831 May 27', 1470], ['Jul 9', 193400], ['Jul 12', 14812], ['Sep 7', 9394], ['Oct 27', 300000],
      ['Nov 3', 60000], ['Nov 9', 144258], ['balance to page 438', 56649]],
    total: 779983,
  },
};

export const cells = () => Object.values(KEY).reduce((n, b) => n + b.lines.length + 1, 0);

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [name, b] of Object.entries(KEY)) {
    const sum = b.lines.reduce((s, [, c]) => s + c, 0);
    console.log(`${name}: ${b.lines.length} lines come to ${(sum / 100).toFixed(2)}, written ${(b.total / 100).toFixed(2)}${sum === b.total ? ', meets' : ', MISSES'}`);
  }
  console.log(`${cells()} numbers in all, totals included`);
}
