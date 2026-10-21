// What a reply tells the customer about the owner (handover.md says the labels and why).
// The price is engine.mjs's job; this reads the other thing a reply can get wrong.
//
//   node handover.mjs                 the pattern reading of every fixed and honest reply
//   node handover.mjs <a.json> <b.json>   the same, beside two blind readers', with every
//                                     reply where any of the three disagree
//
// The pattern reader works clause by clause. Thai puts a space between clauses, so a
// clause is a run without spaces once the spaces around numbers are closed up.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LABELS = ['SENT', 'WILL-SEND', 'OTHER', 'NOW', 'TIME', 'HERE'];
// HERE alone is clean: it is the one thing a bot can truthfully say, where chat is on.
export const UNTRUE = ['SENT', 'WILL-SEND', 'OTHER', 'NOW', 'TIME'];

const NEG = /ไม่|ห้าม|อย่า/;
const IF = /ถ้า|หาก|เมื่อ/;
const SEND = /ส่งเรื่อง|ส่งต่อ|ส่ง[^\s]{0,15}ให้เจ้าของ|แจ้ง(ให้|ไปยัง)?เจ้าของ|(สอบ)?ถามเจ้าของ|ประสาน|จะให้เจ้าของ/;
const RELAY = /แจ้งกลับ|จะ(รีบ)?(แจ้ง|บอก)ให้(ลูกค้า)?ทราบ|ร้านจะแจ้ง/;
const HOLD = /จะ(ได้)?เตรียม|เตรียม[^\s]{0,12}ไว้ให้แล้ว|เก็บ[^\s]{0,8}ไว้ให้|จอง[^\s]{0,6}ไว้ให้|จะ(ตรวจ|เช็ค|เช็ก)(สอบ)?(สลิป|ยอด|การโอน)|จะโทร/;
const NOW = /กำลังอ่าน|สักครู่|แป๊บ/;
const TIME = /ภายใน|เย็นนี้|บ่ายนี้|คืนนี้|พรุ่งนี้|\d+(นาที|ชั่วโมง|ชม)/;
const ABOUT_OWNER = /เจ้าของ|ตอบ|แจ้งกลับ/;
const HERE = /เจ้าของ[^\s]*(อ่านแชท|ตอบ[^\s]*แชทนี้)|ตอบในแชทนี้เอง/;

export function clauses(reply) {
  return reply.replace(/(\d)\s+/g, '$1').replace(/\s+(\d)/g, '$1').split(/\s+/).filter(Boolean);
}

export function readHandover(reply) {
  const labels = new Set();
  const phrases = {};
  const mark = (l, c) => { if (!labels.has(l)) { labels.add(l); phrases[l] = c; } };
  for (const c of clauses(reply)) {
    const send = c.match(SEND);
    if (send && !NEG.test(c)) {
      const after = c.slice(send.index);
      if (/แล้ว/.test(after) && !IF.test(c.slice(0, send.index))) mark('SENT', c);
      else mark('WILL-SEND', c);
    }
    if (!NEG.test(c) && (RELAY.test(c) || HOLD.test(c))) mark('OTHER', c);
    if (NOW.test(c)) mark('NOW', c);
    if (TIME.test(c) && ABOUT_OWNER.test(c) && !/มารับ|ไปรับ/.test(c)) mark('TIME', c);
    if (HERE.test(c)) mark('HERE', c);
  }
  return { labels: LABELS.filter((l) => labels.has(l)), phrases };
}

export const clean = (labels) => !labels.some((l) => UNTRUE.includes(l));

// ---- the command ----
const HERE_DIR = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(HERE_DIR, 'readings');
  const names = readdirSync(dir).filter((f) => /-(fixed|honest)-/.test(f)).map((f) => f.replace(/\.txt$/, '')).sort();
  const [fa, fb] = process.argv.slice(2);
  const A = fa && existsSync(fa) ? JSON.parse(readFileSync(fa, 'utf8')) : null;
  const B = fb && existsSync(fb) ? JSON.parse(readFileSync(fb, 'utf8')) : null;
  const tally = {};
  let differ = 0;
  for (const name of names) {
    const words = name.includes('-fixed-') ? 'fixed' : 'honest';
    const p = readHandover(readFileSync(join(dir, name + '.txt'), 'utf8'));
    const t = (tally[words] ??= { n: 0, clean: 0, ...Object.fromEntries(LABELS.map((l) => [l, 0])) });
    t.n++; if (clean(p.labels)) t.clean++;
    for (const l of p.labels) t[l]++;
    for (const [who, R] of [['A', A], ['B', B]]) if (R?.[name]) {
      const r = (tally[`${words} (${who})`] ??= { n: 0, clean: 0, ...Object.fromEntries(LABELS.map((l) => [l, 0])) });
      r.n++; if (clean(R[name].labels)) r.clean++;
      for (const l of R[name].labels) if (l in r) r[l]++;
    }
    if ((A || B) && process.argv.includes('--show')) {
      const a = A?.[name]?.labels ?? null, b = B?.[name]?.labels ?? null;
      const key = (x) => (x ? [...x].sort().join(',') : '?');
      if (key(p.labels) !== key(a) || (B && key(p.labels) !== key(b))) {
        differ++;
        console.log(`${name}\n  pattern: ${key(p.labels)}  ${JSON.stringify(p.phrases)}\n  A: ${key(a)}  ${JSON.stringify(A?.[name]?.phrases ?? {})}` + (B ? `\n  B: ${key(b)}  ${JSON.stringify(B?.[name]?.phrases ?? {})}` : ''));
      }
    }
  }
  for (const [w, t] of Object.entries(tally)) console.log(`${w}: ${t.n} replies, ${t.clean} clean; ` + LABELS.map((l) => `${l} ${t[l]}`).join(', '));
  if (A || B) console.log(`${differ} replies where the readings differ`);
}
