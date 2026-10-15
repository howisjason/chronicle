// read.mjs: print the text a PDF carries, page by page.
//
//   bash room/tools/try.sh pdf-words read.mjs <path to a .pdf>
//   ... read.mjs <path> --find <word>     only the lines with <word>, each with its page
//   ... read.mjs <path> --pages 3-5       only those pages
//   ... read.mjs <path> --stats           how much text each page has
//
// It reads; it never writes. A scanned PDF shows its hidden OCR layer if it
// has one, and an empty page if it hasn't.
import { readFileSync } from 'node:fs';
import { inflateSync, constants } from 'node:zlib';
import { pdfText } from './core.mjs';

export async function inflate(b, cap) {
  try {
    return inflateSync(b, { maxOutputLength: cap, finishFlush: constants.Z_SYNC_FLUSH });
  } catch (e) {
    if (e.code === 'ERR_BUFFER_TOO_LARGE' || /maxOutputLength|buffer/i.test(e.message)) throw new Error('past the cap');
    throw e;
  }
}

export async function readPdf(path) {
  return pdfText(readFileSync(path), inflate);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const path = args[0];
  if (!path) { console.log('usage: read.mjs <file.pdf> [--find <word>] [--pages a-b] [--stats]'); process.exit(2); }
  const opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : undefined; };
  let out;
  try { out = await readPdf(path); } catch (e) { console.log(`refused: ${e.message}`); process.exit(1); }
  const { pages, notes } = out;
  let [from, to] = [1, pages.length];
  if (opt('--pages')) { const [a, b] = opt('--pages').split('-').map(Number); from = a; to = b || a; }
  if (args.includes('--stats')) {
    pages.forEach((p, i) => console.log(`page ${i + 1}: ${p.length} chars, ${p.split(/\s+/).filter(Boolean).length} words`));
  } else if (opt('--find')) {
    const w = opt('--find').toLowerCase();
    pages.forEach((p, i) => {
      if (i + 1 < from || i + 1 > to) return;
      for (const line of p.split('\n')) if (line.toLowerCase().includes(w)) console.log(`p${i + 1}: ${line}`);
    });
  } else {
    for (let i = from; i <= to; i++) console.log(`--- page ${i} ---\n${pages[i - 1] ?? ''}`);
  }
  console.log(`(${pages.length} pages${notes.length ? '; ' + notes.join('; ') : ''})`);
}
