// test.mjs: small PDFs with known words, made by fixture.mjs, read back by
// core.mjs. Then the face: its copy of the core must be the core, and its
// sample must read as the sample's words.
//   bash room/tools/try.sh pdf-words test.mjs
import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { pdfText, CAP } from './core.mjs';
import { inflate } from './read.mjs';
import { makePdf, pagesPdf } from './fixture.mjs';

const read = b => pdfText(b, inflate);
const checks = [];
const check = (name, fn) => checks.push([name, fn]);
const eq = (got, want) => { if (got !== want) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };

function a85enc(buf) {
  let out = '';
  for (let i = 0; i < buf.length; i += 4) {
    const chunk = buf.subarray(i, i + 4);
    const pad = 4 - chunk.length;
    let n = Buffer.concat([chunk, Buffer.alloc(pad)]).readUInt32BE(0);
    if (n === 0 && pad === 0) { out += 'z'; continue; }
    let s = '';
    for (let k = 0; k < 5; k++) { s = String.fromCharCode(33 + (n % 85)) + s; n = Math.floor(n / 85); }
    out += s.slice(0, 5 - pad);
  }
  return out + '~>';
}

check('1 a plain Tj', async () => {
  eq((await read(pagesPdf(['BT /F1 12 Tf 72 700 Td (Hello, world) Tj ET']))).pages[0], 'Hello, world');
});

check('2 a compressed stream, and TJ: small kerning joins, a wide gap is a space', async () => {
  eq((await read(pagesPdf(['BT /F1 12 Tf 72 700 Td [(Le)-30(g)-400(of)] TJ ET'], { flate: true }))).pages[0], 'Leg of');
});

check('3 a hex string, an octal escape (WinAnsi 0x92) and escaped brackets', async () => {
  eq((await read(pagesPdf(['BT /F1 12 Tf 72 700 Td <4C6567> Tj ( O\\222Mutton \\(lake\\)) Tj ET']))).pages[0], 'Leg O’Mutton (lake)');
});

check('4 a move down is a new line, a move along is a space', async () => {
  eq((await read(pagesPdf(['BT /F1 12 Tf 72 700 Td (one) Tj 0 -14 Td (two) Tj 50 0 Td (three) Tj ET']))).pages[0], 'one\ntwo three');
});

check('5 a two-byte font read only through its ToUnicode map (bfchar, bfrange, bfrange array)', async () => {
  const cmap = [
    '1 begincodespacerange <0000> <FFFF> endcodespacerange',
    '2 beginbfchar <0001> <0057> <0005> <0020> endbfchar',
    '2 beginbfrange <0002> <0004> [<0072> <0065> <0073>] <0010> <0012> <0061> endbfrange',
  ].join('\n');
  const doc = pagesPdf(['BT /F2 12 Tf 72 700 Td <00010002000300040005001000110012> Tj ET'], {
    fonts: '/F1 4 0 R /F2 7 0 R',
    extra: [
      { n: 7, dict: '<< /Type /Font /Subtype /Type0 /BaseFont /X /Encoding /Identity-H /ToUnicode 8 0 R >>' },
      { n: 8, dict: '<< >>', stream: cmap, flate: true },
    ],
  });
  eq((await read(doc)).pages[0], 'Wres abc');
});

check('6 pages come in the page tree\'s order, not the file\'s', async () => {
  const doc = makePdf([
    { n: 1, dict: '<< /Type /Catalog /Pages 2 0 R >>' },
    { n: 2, dict: '<< /Type /Pages /Kids [11 0 R 10 0 R] /Count 2 /Resources << /Font << /F1 4 0 R >> >> >>' },
    { n: 4, dict: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' },
    { n: 10, dict: '<< /Type /Page /Parent 2 0 R /Contents 50 0 R >>' },
    { n: 11, dict: '<< /Type /Page /Parent 2 0 R /Contents 51 0 R >>' },
    { n: 50, dict: '<< >>', stream: 'BT /F1 12 Tf 72 700 Td (second) Tj ET' },
    { n: 51, dict: '<< >>', stream: 'BT /F1 12 Tf 72 700 Td (first) Tj ET' },
  ], '<< /Size 52 /Root 1 0 R >>');
  eq((await read(doc)).pages.join('|'), 'first|second');
});

check('7 the page tree hidden in a compressed object stream, with an xref stream for a trailer (Quill\'s flag)', async () => {
  const inner = [
    [1, '<< /Type /Catalog /Pages 2 0 R >>'],
    [2, '<< /Type /Pages /Kids [10 0 R] /Count 1 >>'],
    [4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'],
    [10, '<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /Contents 50 0 R >>'],
  ];
  let body = '', head = '';
  for (const [n, d] of inner) { head += `${n} ${body.length} `; body += d + '\n'; }
  const doc = makePdf([
    { n: 20, dict: `<< /Type /ObjStm /N ${inner.length} /First ${head.length} >>`, stream: head + body, flate: true },
    { n: 50, dict: '<< >>', stream: 'BT /F1 12 Tf 72 700 Td (from inside an object stream) Tj ET', flate: true },
    { n: 30, dict: '<< /Type /XRef /Size 51 /W [1 2 1] /Root 1 0 R >>', stream: '\x00\x00\x00\x00', flate: true },
  ], '', { xref: false });
  eq((await read(doc)).pages[0], 'from inside an object stream');
});

check('8 an encrypted PDF is refused, not printed as junk', async () => {
  const doc = pagesPdf(['BT /F1 12 Tf 72 700 Td (secret) Tj ET'], {
    extra: [{ n: 9, dict: '<< /Filter /Standard /V 1 /R 2 /O <00> /U <00> /P -4 >>' }],
    trailer: '<< /Size 100 /Root 1 0 R /Encrypt 9 0 R >>',
  });
  let msg = '';
  try { await read(doc); } catch (e) { msg = e.message; }
  if (!/^encrypted/.test(msg)) throw new Error(`no refusal: ${msg || 'it read the page'}`);
});

check('9 text inside a form XObject (Do)', async () => {
  const doc = makePdf([
    { n: 1, dict: '<< /Type /Catalog /Pages 2 0 R >>' },
    { n: 2, dict: '<< /Type /Pages /Kids [10 0 R] /Count 1 >>' },
    { n: 4, dict: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' },
    { n: 10, dict: '<< /Type /Page /Parent 2 0 R /Resources << /XObject << /X1 12 0 R >> >> /Contents 50 0 R >>' },
    { n: 12, dict: '<< /Type /XObject /Subtype /Form /BBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> >>', stream: 'BT /F1 12 Tf 72 700 Td (in a form) Tj ET', flate: true },
    { n: 50, dict: '<< >>', stream: 'q /X1 Do Q' },
  ], '<< /Size 51 /Root 1 0 R >>');
  eq((await read(doc)).pages[0], 'in a form');
});

check('10 a stream that inflates past the cap is skipped and named, and the next page still reads', async () => {
  const big = Buffer.alloc(CAP + 1024, 0x20);
  const doc = pagesPdf([big, 'BT /F1 12 Tf 72 700 Td (after) Tj ET'], { flate: true });
  const out = await read(doc);
  eq(out.pages[1], 'after');
  if (!out.notes.some(n => /inflates past 32 MB/.test(n))) throw new Error(`no note: ${JSON.stringify(out.notes)}`);
});

check('11 a file that is not a PDF is refused', async () => {
  let msg = '';
  try { await read(Buffer.from('<html>not this</html>')); } catch (e) { msg = e.message; }
  if (!/^not a PDF/.test(msg)) throw new Error(`no refusal: ${msg}`);
});

check('12 a font\'s /Differences names its own glyphs', async () => {
  const doc = pagesPdf(['BT /F1 12 Tf 72 700 Td (ABC) Tj ET'], {
    fonts: '/F1 7 0 R',
    extra: [{ n: 7, dict: '<< /Type /Font /Subtype /Type1 /BaseFont /X /Encoding << /BaseEncoding /WinAnsiEncoding /Differences [65 /quoteright /fi] >> >>' }],
  });
  eq((await read(doc)).pages[0], '’fiC');
});

check('13 an inline picture\'s bytes are skipped, brackets and all', async () => {
  const c = 'BT /F1 12 Tf 72 700 Td (before) Tj ET\nBI /W 2 /H 2 /BPC 8 /CS /G ID \x00\x01(\xff) EI\nBT /F1 12 Tf 72 600 Td (after the picture) Tj ET';
  eq((await read(pagesPdf([c]))).pages[0], 'before\nafter the picture');
});

check('14 two filters in a row: ASCII85, then Flate', async () => {
  const content = 'BT /F1 12 Tf 72 700 Td (through two filters) Tj ET';
  const doc = pagesPdf(['x'], {
    extra: [{ n: 50, dict: '<< /Filter [/ASCII85Decode /FlateDecode] >>', stream: a85enc(deflateSync(Buffer.from(content))) }],
  });
  eq((await read(doc)).pages[0], 'through two filters');
});

check('20 an ASCIIHex stream, spaces and all', async () => {
  const content = 'BT /F1 12 Tf 72 700 Td (as hex digits) Tj ET';
  const hex = Buffer.from(content).toString('hex').replace(/(..)/g, '$1 ') + '>';
  const doc = pagesPdf(['x'], { extra: [{ n: 50, dict: '<< /Filter /ASCIIHexDecode >>', stream: hex }] });
  eq((await read(doc)).pages[0], 'as hex digits');
});

const demo = readFileSync(new URL('./demo.html', import.meta.url), 'utf8');
const region = t => {
  const a = t.indexOf('// core:start'), b = t.indexOf('// core:end');
  if (a < 0 || b < 0) throw new Error('no core markers');
  return t.slice(a, b);
};

check('15 the face carries the core word for word', async () => {
  if (region(demo) !== region(readFileSync(new URL('./core.mjs', import.meta.url), 'utf8'))) throw new Error('demo.html\'s core differs from core.mjs: run gen.mjs');
});

check('16 the face\'s "under 500 lines" is true of the core it carries', async () => {
  if (!demo.includes('under 500 lines')) throw new Error('the face no longer says it');
  const n = region(demo).split('\n').length;
  if (n >= 500) throw new Error(`the core is ${n} lines`);
});

check('17 the face\'s sample reads as its words', async () => {
  const m = /const SAMPLE = "([A-Za-z0-9+/=]+)"/.exec(demo);
  if (!m) throw new Error('no SAMPLE in demo.html');
  const out = await read(Buffer.from(m[1], 'base64'));
  eq(out.pages.join('\n|\n'), [
    'This PDF was made by fixture.mjs, in the room.\nIt is read here by the same code that reads a scanned journal.\nThis line came in as hex.',
    'Wrest Park\nThe line above is codes, and only its font’s map turns them into letters.',
  ].join('\n|\n'));
});

// The face's own script, run in node against a stand-in page, so its
// browser half (DecompressionStream, its own names beside the core's) is
// tested too, and not only the core it carries.
check('18 the face itself, run against a stand-in page, shows the sample\'s words', async () => {
  const vm = await import('node:vm');
  class El {
    constructor() { this.children = []; this.textContent = ''; this.className = ''; this.classList = { add() {}, remove() {} }; }
    append(...c) { this.children.push(...c); }
    set innerHTML(v) { this.children = []; }
  }
  const els = {};
  const document = { getElementById: id => (els[id] ||= new El()), createElement: () => new El() };
  const script = /<script>([\s\S]*)<\/script>/.exec(demo)[1];
  vm.runInNewContext(script, { document, atob, DecompressionStream, console });
  for (let i = 0; i < 200 && /^Reading|^$/.test(els.status.textContent); i++) await new Promise(r => setTimeout(r, 10));
  const shown = els.out.children.map(sec => sec.children[1].textContent).join('\n|\n');
  if (els.status.className === 'bad') throw new Error(`status marked bad: ${els.status.textContent}`);
  eq(els.status.textContent, 'the sample: 2 pages, 44 words');
  if (!shown.includes('Wrest Park') || !shown.includes('reads a scanned journal')) throw new Error(`shown: ${JSON.stringify(shown)}`);
});

check('19 the face\'s own inflate stops at the cap too (Quill\'s flag)', async () => {
  const vm = await import('node:vm');
  const el = () => ({ children: [], classList: { add() {}, remove() {} }, append() {} });
  const page = { document: { getElementById: el, createElement: el }, atob, DecompressionStream, console };
  vm.runInNewContext(/<script>([\s\S]*)<\/script>/.exec(demo)[1], page);
  let msg = '';
  // A small cap on a small stream: the same code path as 32 MB. With the full
  // 32 MB every check passed and then the process never exited; my reading,
  // not traced, is that node's own DecompressionStream keeps a write pending
  // after the cancel. A page in a browser has no exit to wait for.
  try { await page.inflate(deflateSync(Buffer.alloc(100000)), 50000); } catch (e) { msg = e.message; }
  if (!/cap/.test(msg)) throw new Error(`no stop at the cap: ${msg || 'it inflated it all'}`);
  const small = await page.inflate(deflateSync(Buffer.from('a small stream')), CAP);
  eq(Buffer.from(small).toString(), 'a small stream');
});

let failed = 0, ran = 0;
const only = process.argv[2]; // test.mjs 19 runs check 19 alone
for (const [name, fn] of checks) {
  if (only && !name.startsWith(only + ' ')) continue;
  ran++;
  const t0 = Date.now();
  try { await fn(); console.log(`ok    ${name} (${Date.now() - t0} ms)`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(`${ran - failed} of ${ran} pass${ran < checks.length ? ` (${checks.length - ran} not run)` : ''}`);
process.exit(failed ? 1 : 0);
