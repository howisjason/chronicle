// lib.mjs: the bins. A tale is in exactly one (the rule is in README.md, and was
// written before any dúchas row was read).
import { BOOK } from './data.mjs';
import { DUCHAS } from './duchas.mjs';

// The page is the last number in the label: "Volume 0002, Page 122b" -> 122,
// "Imleabhar 0529, Leathanach 241" -> 241, "122b" -> 122.
export const pageNum = (label) => { const m = String(label).match(/(\d+)[a-z]?\s*$/); return m ? +m[1] : NaN; };

export function rows() {
  return BOOK.map(([n, title, county, year, vol, page, pages]) => {
    const d = DUCHAS[n] || null;
    let bin;
    if (vol == null) bin = 'no reference';
    else if (!d || !d.volumeId) bin = 'not online';
    else if (pageNum(d.label) === page) bin = 'lands';
    else if (d.next != null && pageNum(d.label) < page && page < pageNum(d.next)) bin = 'near';
    else bin = 'disagrees';
    return { n, title, county, year, vol, page, pages, d, bin };
  });
}

export const BINS = ['lands', 'near', 'disagrees', 'not online', 'no reference'];
