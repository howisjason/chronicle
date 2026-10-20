// score.mjs: the five AI readings of the 1829–31 bank page (readings/, names and
// initials taken out, every number cell exactly as each reader gave it), scored
// against my key (real.mjs), and each put through misread's own engine as a ledger
// page with the cents ruled off. Run: node score.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { KEY } from './real.mjs';

const html = readFileSync(new URL('./demo.html', import.meta.url), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(html.match(/<script id="core">([\s\S]*?)<\/script>/)[1] + '\nthis.Misread = Misread;', ctx);
const M = ctx.Misread;

// sonnet2: Sonnet again, given the ask with its new line about money ruled into two columns.
export const READERS = ['haiku', 'sonnet', 'opus', 'fable', 'sonnet2'];
export const reading = (who) => readFileSync(new URL(`./readings/${who}.txt`, import.meta.url), 'utf8');

// Opus set the two sides side by side, one row of the page per line, Dr's amount in its
// fourth cell and Cr's in its seventh. For the score (and only here) its two sides are
// taken apart into one line each, in the order Opus wrote them; the cells are untouched.
export function unfold(text) {
  const dr = [], cr = [];
  for (const line of text.split('\n')) {
    const p = line.split('|').map((s) => s.trim());
    if (p.length < 7) { dr.push(line); continue; }
    const total = /total/i.test(p[0]);
    if (p[3] && p[3] !== '-') dr.push(`${total ? 'Total' : p[1] || 'line'} | ${p[3]}`);
    if (p[6] && p[6] !== '-') cr.push(`${total ? 'Total' : p[4] || 'line'} | ${p[6]}`);
    if (total) { dr.push(...cr); cr.length = 0; }
  }
  return dr.join('\n');
}
export const pasted = (who) => (who === 'opus' ? unfold(reading(who)) : reading(who));

// What each reader's numbers say, cell by cell, against the key: a ledger read the
// engine's own way (last number on a line, a "total" line closes a block, "7 35" is 7.35).
const cents = (k) => Math.round(Number(k.digits) * 10 ** (2 - k.dec));
export function score(who) {
  const res = M.check(pasted(who), { ledger: true, ruled: true });
  const blocks = []; let cur = [];
  res.rows.forEach((r, ri) => {
    const k = r.cells[0];
    if (res.totalRows.includes(ri)) { blocks.push({ lines: cur, total: k }); cur = []; } else cur.push(k);
  });
  // Line up each block with the key's block by edit distance: an extra line (a year,
  // a pencil note) is an insertion, a wrong number a substitution. Readers list the
  // blocks in different orders, so each reader block goes to the key block it fits best.
  const out = { digits: 0, cents: 0, extra: 0, missing: 0, wrong: [] };
  const same = (x, k) => cents(k) === x;
  const near = (x, k) => same(x, k) || Number(k.digits) === x;
  const cost = (x, k) => (same(x, k) ? 0 : near(x, k) ? 0.5 : 1);
  const align = (kb, rb) => {
    const a = kb.lines.map(([, c]) => c), b = rb.lines;
    const D = [...Array(a.length + 1)].map(() => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) D[i][0] = i;
    for (let j = 0; j <= b.length; j++) D[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + cost(a[i - 1], b[j - 1]));
    const pairs = [];
    for (let i = a.length, j = b.length; i || j;) {
      if (i && j && D[i][j] === D[i - 1][j - 1] + cost(a[i - 1], b[j - 1])) { pairs.push([i - 1, j - 1]); i--; j--; }
      else if (j && D[i][j] === D[i][j - 1] + 1) { pairs.push([-1, j - 1]); j--; }
      else { pairs.push([i - 1, -1]); i--; }
    }
    return { cost: D[a.length][b.length] + (rb.total ? cost(kb.total, rb.total) : 1), pairs: pairs.reverse(), a, b };
  };
  const kbs = Object.values(KEY), perms = (xs) => (xs.length ? xs.flatMap((x, i) => perms(xs.filter((_, j) => j !== i)).map((p) => [x, ...p])) : [[]]);
  const idx = [...Array(Math.max(blocks.length, kbs.length)).keys()];
  let bestP = null, bestC = Infinity;
  for (const p of perms(idx)) {
    const c = kbs.reduce((s, kb, bi) => s + align(kb, blocks[p[bi]] || { lines: [], total: null }).cost, 0);
    if (c < bestC) { bestC = c; bestP = p; }
  }
  kbs.forEach((kb, bi) => {
    const rb = blocks[bestP[bi]] || { lines: [], total: null };
    const { pairs, a, b } = align(kb, rb);
    const tally = (x, k, where) => {
      if (same(x, k)) return;
      // The same digits, only the cents line in another place: 19 34 for 1934.00, 735 for 7.35.
      const bare = (s) => s.replace(/^0+/, '').replace(/0+$/, '');
      const digitsOk = bare(k.digits) === bare(String(x));
      if (digitsOk) out.cents++; else out.digits++;
      out.wrong.push(`${where}: read ${k.text}, page ${(x / 100).toFixed(2)}${digitsOk ? ' (the cents line)' : ''}`);
    };
    for (const [i, j] of pairs) {
      if (i < 0) { out.extra++; out.wrong.push(`${Object.keys(KEY)[bi]}: an extra line, ${b[j].text}`); continue; }
      if (j < 0) { out.missing++; out.wrong.push(`${Object.keys(KEY)[bi]}, ${kb.lines[i][0]}: left out`); continue; }
      tally(a[i], b[j], `${Object.keys(KEY)[bi]}, ${kb.lines[i][0]}`);
    }
    if (rb.total) tally(kb.total, rb.total, `${Object.keys(KEY)[bi]}, its total`);
  });
  return { res, ...out };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const who of READERS) {
    const s = score(who), r = s.res;
    console.log(`\n== ${who}: ${s.digits} digit slips, ${s.cents} cents-line slips, ${s.extra} extra lines, ${s.missing} left out`);
    for (const w of s.wrong) console.log('   ' + w);
    if (r.error) { console.log('   misread: ' + r.error); continue; }
    console.log(`   misread: ${r.misses} of ${r.checks.length} checks miss`);
    for (const c of r.checks) if (c.gap) console.log(`     ${c.name}: ${r.fmt(c.sum)} against ${r.fmt(c.total)}`);
    for (const f of r.found) console.log(`     fits, in ${f.block}: ${f.where}: ${f.kind}${f.read ? ', read ' + f.read : ''}${f.page ? ', page ' + f.page : ''}${f.say ? ' (' + f.say + ')' : ''}`);
    for (const n of r.notes) console.log(`     note: ${JSON.stringify(n.kind === 'cents' ? { block: n.block, size: n.size, ways: n.ways, movable: n.movable, sure: n.where.map((w) => w.read + '→' + w.page), split: n.split.map((s) => s.map((w) => w.read + '→' + w.page)) } : n)}`);
  }
}
