// supp.mjs: read the paper's two supplementary files (a .docx and an .ods, both
// zip files) with no outside packages, because the hour has no unzip.
//   node supp.mjs <file> list     the zip's entries
//   node supp.mjs <file> rows     an .ods: every row of every sheet, cells joined by tabs
//   node supp.mjs <file> text     a .docx: every paragraph, one per line
//   node supp.mjs <file> species  supp 2 only: writes its species columns to supp2.txt
//   node supp.mjs <file> ptkey    supp 1 only: writes its genus key's halves to supp1-endings.txt
// The file is passed in as a path and only read. Inflating is capped at 2 MB a
// part (Quill's flag at the build door: a small zip can unpack to something huge).
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const CAP = 2 * 1024 * 1024;

export function entries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip: no end of central directory');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let k = 0; k < count; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(`bad central entry ${k}`);
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    out.push({ name, method, csize, usize, local });
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

export function part(buf, name) {
  const e = entries(buf).find((x) => x.name === name);
  if (!e) throw new Error(`no ${name} in the zip`);
  if (e.usize > CAP) throw new Error(`${name} unpacks to ${e.usize} bytes, over the cap`);
  const p = e.local;
  if (buf.readUInt32LE(p) !== 0x04034b50) throw new Error(`bad local header for ${name}`);
  const start = p + 30 + buf.readUInt16LE(p + 26) + buf.readUInt16LE(p + 28);
  const raw = buf.subarray(start, start + e.csize);
  const data = e.method === 0 ? raw : e.method === 8 ? inflateRawSync(raw, { maxOutputLength: CAP }) : null;
  if (!data) throw new Error(`${name}: compression method ${e.method} not handled`);
  if (data.length !== e.usize) throw new Error(`${name}: got ${data.length} bytes, the zip says ${e.usize}`);
  return data.toString('utf8');
}

const unxml = (s) => s.replace(/<text:s(?: text:c="(\d+)")?\/>/g, (_, n) => ' '.repeat(+n || 1))
  .replace(/<text:tab\/>/g, ' ').replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// An .ods sheet as rows of cell strings. A repeated cell or row is written out
// once per repeat, except the long blank runs a spreadsheet pads its end with.
export function odsRows(xml) {
  const sheets = [];
  for (const t of xml.matchAll(/<table:table [^>]*table:name="([^"]*)"[^>]*>([\s\S]*?)<\/table:table>/g)) {
    const rows = [];
    for (const r of t[2].matchAll(/<table:table-row([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-row>)/g)) {
      const cells = [];
      for (const c of (r[2] || '').matchAll(/<table:(?:covered-)?table-cell([^>]*?)(?:\/>|>([\s\S]*?)<\/table:(?:covered-)?table-cell>)/g)) {
        const rep = +((c[1].match(/table:number-columns-repeated="(\d+)"/) || [])[1] || 1);
        const ps = [...(c[2] || '').matchAll(/<text:p[^>]*?(?:\/>|>([\s\S]*?)<\/text:p>)/g)].map((m) => unxml(m[1] || ''));
        const v = ps.join(' / ');
        for (let i = 0; i < (v ? rep : Math.min(rep, 1)); i++) cells.push(v);
      }
      while (cells.length && cells[cells.length - 1] === '') cells.pop();
      const rep = +((r[1].match(/table:number-rows-repeated="(\d+)"/) || [])[1] || 1);
      for (let i = 0; i < (cells.length ? rep : 0); i++) rows.push(cells);
    }
    sheets.push({ name: t[1], rows });
  }
  return sheets;
}

export function docxParas(xml) {
  return [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)]
    .map((m) => [...m[0].matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>|<w:tab\/>/g)].map((t) => t[1] === undefined ? '\t' : unxml(t[1])).join(''));
}

if (process.argv[1] && process.argv[1].endsWith('supp.mjs')) {
  const [file, mode] = process.argv.slice(2);
  const buf = readFileSync(file);
  if (mode === 'list') for (const e of entries(buf)) console.log(`${e.name}\t${e.method}\t${e.csize}\t${e.usize}`);
  else if (mode === 'rows') for (const s of odsRows(part(buf, 'content.xml'))) {
    console.log(`== sheet ${s.name}: ${s.rows.length} rows`);
    s.rows.forEach((r, i) => console.log(`${i + 1}\t${r.join('\t')}`));
  }
  else if (mode === 'species') {
    // Only the taxon columns go public (Quill's flag): the sheet's columns 1 and 3
    // are species, 2 and 4 the references for them, which stay out.
    const [sheet] = odsRows(part(buf, 'content.xml'));
    const head = sheet.rows[1].join('|');
    if (head !== 'Species|Reference|Species|Reference') throw new Error(`header is ${head}`);
    const sp = [];
    for (const r of sheet.rows.slice(2)) for (const i of [0, 2]) if (r[i] && r[i].trim()) sp.push({ col: i / 2 + 1, name: r[i].trim() });
    const lines = ['# The species column of the paper\'s Supplementary file 2 (an .ods, sheet "Planilha1"),',
      '# extracted by supp.mjs on 15 Oct 2026. Its row 1: "' + sheet.rows[0][0] + '"',
      '# The references beside each species are left out here. CC BY 4.0, Gama, Skelley & Vaz-de-Mello 2026,',
      '# https://europeanjournaloftaxonomy.eu/index.php/ejt/article/download/3175/14119',
      '# sheet column (1 = left pair, 2 = right pair) | species', ...sp.map((s) => `${s.col}|${s.name}`)];
    writeFileSync('supp2.txt', lines.join('\n') + '\n');
    console.log(`wrote supp2.txt: ${sp.length} species`);
  }
  else if (mode === 'ptkey') {
    // supp 1 only: the endings of its genus key ("Chave para os gêneros"), up to
    // the first species key, written to supp1-endings.txt. A half's last tab field
    // is a couplet number or a genus with its author; the genus is its first word.
    const ps = docxParas(part(buf, 'word/document.xml'));
    const a = ps.findIndex((p) => p.startsWith('Chave para os gêneros'));
    const b = ps.findIndex((p, i) => i > a && p.startsWith('Chave para'));
    const out = [];
    let n = 0;
    for (const p of ps.slice(a + 1, b)) {
      const m = p.match(/^\s*(?:(\d+)\.|–)/);
      if (!m) throw new Error(`not a half: ${p.slice(0, 40)}`);
      const half = m[1] ? (n = +m[1], `${n}a`) : `${n}b`;
      const last = p.split('\t').map((s) => s.trim()).filter(Boolean).pop();
      out.push(/^\d+$/.test(last) ? `${half}|->${last}` : `${half}|${last.split(' ')[0]}`);
    }
    writeFileSync('supp1-endings.txt', ['# The genus key of the paper\'s Supplementary file 1 (a .docx, the key in Portuguese),',
      '# each half and where it leads, extracted by supp.mjs on 15 Oct 2026. CC BY 4.0,',
      '# Gama, Skelley & Vaz-de-Mello 2026, https://europeanjournaloftaxonomy.eu/index.php/ejt/article/download/3175/14117',
      '# half | ->couplet, or the genus it ends in, as spelled there', ...out].join('\n') + '\n');
    console.log(`wrote supp1-endings.txt: ${out.length} halves`);
  }
  else if (mode === 'text') docxParas(part(buf, 'word/document.xml')).forEach((p, i) => console.log(`${i + 1}\t${p}`));
  else { console.log('usage: node supp.mjs <file> list|rows|text|species|ptkey'); process.exit(2); }
}
