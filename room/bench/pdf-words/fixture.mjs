// fixture.mjs: makes small PDFs with known words in them, for test.mjs and
// for the sample on the face. Each object is { n, dict, stream?, flate? }.
import { deflateSync } from 'node:zlib';

export function makePdf(objs, trailer, { xref = true } = {}) {
  const parts = [];
  let len = 0;
  const off = {};
  const push = b => {
    const u = typeof b === 'string' ? Buffer.from(b, 'latin1') : Buffer.from(b);
    parts.push(u);
    len += u.length;
  };
  push('%PDF-1.5\n%\xE2\xE3\xCF\xD3\n');
  for (const o of objs) {
    off[o.n] = len;
    if (o.stream != null) {
      let data = typeof o.stream === 'string' ? Buffer.from(o.stream, 'latin1') : Buffer.from(o.stream);
      let dict = o.dict;
      if (o.flate) { data = deflateSync(data); dict = dict.replace(/>>\s*$/, ' /Filter /FlateDecode >>'); }
      dict = dict.replace(/>>\s*$/, ` /Length ${data.length} >>`);
      push(`${o.n} 0 obj\n${dict}\nstream\n`);
      push(data);
      push('\nendstream\nendobj\n');
    } else push(`${o.n} 0 obj\n${o.dict}\nendobj\n`);
  }
  if (xref) {
    const max = Math.max(...objs.map(o => o.n));
    const at = len;
    let t = `xref\n0 ${max + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= max; i++) t += off[i] != null ? `${String(off[i]).padStart(10, '0')} 00000 n \n` : '0000000000 65535 f \n';
    push(t);
    push(`trailer\n${trailer}\nstartxref\n${at}\n%%EOF\n`);
  } else push('%%EOF\n');
  return Buffer.concat(parts);
}

// One page per content string, all with Helvetica as /F1.
export function pagesPdf(contents, { flate = false, extra = [], fonts = '/F1 4 0 R', trailer = '<< /Size 100 /Root 1 0 R >>' } = {}) {
  const objs = [
    { n: 1, dict: '<< /Type /Catalog /Pages 2 0 R >>' },
    { n: 2, dict: `<< /Type /Pages /Kids [${contents.map((_, i) => `${10 + i} 0 R`).join(' ')}] /Count ${contents.length} /Resources << /Font << ${fonts} >> >> >>` },
    { n: 4, dict: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>' },
  ];
  contents.forEach((c, i) => {
    objs.push({ n: 10 + i, dict: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${50 + i} 0 R >>` });
    objs.push({ n: 50 + i, dict: '<< >>', stream: c, flate });
  });
  return makePdf([...objs, ...extra], trailer);
}

// The face's sample: two pages, one compressed, one with a font that needs
// its ToUnicode map to be read at all.
export function samplePdf() {
  const cmap = [
    '/CIDInit /ProcSet findresource begin 12 dict begin begincmap',
    '1 begincodespacerange <0000> <FFFF> endcodespacerange',
    '6 beginbfchar <0001> <0057> <0002> <0020> <0003> <0073> <0004> <0074> <0005> <0050> <0006> <006B> endbfchar',
    '2 beginbfrange <0010> <0019> <0061> <0020> <0020> [<0072>] endbfrange',
    'endcmap CMapName currentdict /CMap defineresource pop end end',
  ].join('\n');
  const p1 = [
    'BT /F1 14 Tf 72 720 Td (This PDF was made by fixture.mjs, in the room.) Tj',
    '0 -20 Td [(It is read here by the same code that reads)-250(a scanned journal.)] TJ',
    `0 -20 Td <${Buffer.from('This line came in as hex.').toString('hex')}> Tj ET`,
  ].join('\n');
  // "Wrest Park", in codes: 0x10-0x19 are a-j, 0x20 is r, the rest are bfchar.
  const p2 = [
    'BT /F2 14 Tf 72 720 Td <0001002000140003000400020005001000200006> Tj',
    '0 -20 Td /F1 14 Tf (The line above is codes, and only its font\\222s map turns them into letters.) Tj ET',
  ].join('\n');
  return makePdf([
    { n: 1, dict: '<< /Type /Catalog /Pages 2 0 R >>' },
    { n: 2, dict: '<< /Type /Pages /Kids [10 0 R 11 0 R] /Count 2 /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> >>' },
    { n: 4, dict: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>' },
    { n: 5, dict: '<< /Type /Font /Subtype /Type0 /BaseFont /Sample /Encoding /Identity-H /ToUnicode 6 0 R >>' },
    { n: 6, dict: '<< >>', stream: cmap, flate: true },
    { n: 10, dict: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 50 0 R >>' },
    { n: 11, dict: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 51 0 R >>' },
    { n: 50, dict: '<< >>', stream: p1, flate: true },
    { n: 51, dict: '<< >>', stream: p2 },
  ], '<< /Size 52 /Root 1 0 R >>');
}
