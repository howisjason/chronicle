// count.mjs: turns each source into the set of temples it names, and says how
// those sets sit against each other. Run: bash room/tools/try.sh fourteen-or-fifteen count.mjs
import { TEMPLES, VARIANTS, PLACE, SOURCES } from './sources.mjs';

const IDS = Object.keys(TEMPLES);
const byJa = Object.fromEntries(IDS.map((id) => [TEMPLES[id].ja, id]));
const byEn = Object.fromEntries(IDS.map((id) => [TEMPLES[id].en, id]));

export const spell = (s) => Object.entries(VARIANTS).reduce((t, [a, b]) => t.split(a).join(b), s);
// Kana readings come in brackets (相国(しょうこく)寺) or run inline (相国寺しょうこくじ派);
// the temple names themselves have no kana, so dropping every hiragana and bracket leaves them whole.
export const unkana = (s) => s.replace(/[ぁ-ゖ()（）]/g, '');

// The temples a source names, as ids, and any it names apart from its number.
export function names(src) {
  if (src.listIn === 'quote') {
    const text = unkana(spell(src.quote));
    const found = IDS.filter((id) => text.includes(TEMPLES[id].ja));
    const apart = (src.apart || []).map((j) => byJa[spell(j)]);
    return { counted: found.filter((id) => !apart.includes(id)), apart };
  }
  if (!src.list) return { counted: null, apart: [] };
  const counted = src.list.map((n) => (src.listEn ? byEn[n] : byJa[spell(n)]));
  if (counted.some((id) => !id)) throw new Error(`${src.id}: a name I don't know`);
  return { counted, apart: [] };
}

export const S14 = ['kennin', 'tofuku', 'kencho', 'engaku', 'nanzen', 'kokutai', 'daitoku', 'kogaku', 'myoshin', 'tenryu', 'eigen', 'hoko', 'shokoku', 'buttsu'];
export const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
export const minus = (a, b) => a.filter((x) => !b.includes(x));

// One row per source: what it says, what it names, and which set that is.
export function rows() {
  return SOURCES.map((src) => {
    const { counted, apart } = names(src);
    let set = 'no list';
    if (counted) {
      if (same(counted, S14)) set = 'the fourteen';
      else if (same(counted, [...S14, 'kosho'])) set = 'the fourteen + Kōshō-ji';
      else if (same(counted, [...S14, 'manpuku'])) set = 'the fourteen + Manpuku-ji (Ōbaku)';
      else if (src.partial && minus(counted, S14).length === 0) set = `${counted.length} of the fourteen, “and so on”`;
      else set = 'something else';
    }
    return { src, counted, apart, set };
  });
}

export const kyoto = (ids) => ids.filter((id) => (PLACE[id] || '').startsWith('京都')).length;

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const r of rows()) {
    console.log(`${r.src.id.padEnd(12)} says ${String(r.src.says ?? '–').padStart(2)}  names ${r.counted ? String(r.counted.length).padStart(2) : ' –'}${r.apart.length ? ` + ${r.apart.length} apart` : ''}  ${r.set}`);
  }
}
