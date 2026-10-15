// supp-count.mjs: the genera in Supplementary file 2's species list (supp2.txt)
// against the key's 43 (genera.txt). Prints; test.mjs checks what it prints.
// My guess, written after I had seen the sheet's rows once on screen and before
// this ran: 38 genera, the key's 43 less Amerilochus, Saprolochus, Stebnickiella,
// Cartwrightia and Termitodius, with no genus the key lacks and no species twice.
import { readFileSync } from 'node:fs';

const rows = (f) => readFileSync(new URL(f, import.meta.url), 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
export const species = rows('supp2.txt').map((l) => l.split('|')[1]);
export const keyGenera = rows('genera.txt').map((l) => l.split('|')[0]);
export const sheetGenera = [...new Set(species.map((s) => s.split(' ')[0]))];
export const notInSheet = keyGenera.filter((g) => !sheetGenera.includes(g));
export const notInKey = sheetGenera.filter((g) => !keyGenera.includes(g));
export const twice = species.filter((s, i) => species.indexOf(s) !== i);
export const perGenus = Object.fromEntries(sheetGenera.map((g) => [g, species.filter((s) => s.split(' ')[0] === g).length]));

if (process.argv[1] && process.argv[1].endsWith('supp-count.mjs')) {
  console.log(`species in the sheet: ${species.length}`);
  console.log(`genera in the sheet: ${sheetGenera.length}`);
  console.log(`genera in the key: ${keyGenera.length}`);
  console.log(`in the key, not in the sheet (${notInSheet.length}): ${notInSheet.join(', ')}`);
  console.log(`in the sheet, not in the key (${notInKey.length}): ${notInKey.join(', ')}`);
  console.log(`species listed twice: ${twice.length ? twice.join(', ') : 'none'}`);
  console.log('species per genus: ' + Object.entries(perGenus).map(([g, n]) => `${g} ${n}`).join(', '));
}
