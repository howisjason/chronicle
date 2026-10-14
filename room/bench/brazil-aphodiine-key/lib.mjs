// lib.mjs: reads the key's text files and the genus list, and makes the tree.
import { readFileSync } from 'node:fs';

function rows(file) {
  return readFileSync(new URL(file, import.meta.url), 'utf8')
    .split('\n').filter(l => l.trim() && !l.startsWith('#'));
}

// One half a line: label | text | leads to (a couplet number, or a genus).
export function readKey(file) {
  return rows(file).map(l => {
    const [label, text, to] = l.split('|');
    return { label, text, to };
  });
}

// name | Plazi treatment id
export function readGenera(file = 'genera.txt') {
  return rows(file).map(l => {
    const [name, id] = l.split('|');
    return { name, id };
  });
}

export const isCouplet = to => /^\d+$/.test(to);
export const genusName = to => to.split(' ')[0];

// { 1: {a: half, b: half}, ... }
export function couplets(halves) {
  const out = {};
  for (const h of halves) {
    const m = h.label.match(/^(\d+)([ab])$/);
    (out[m[1]] ||= {})[m[2]] = h;
  }
  return out;
}

// Every walk from couplet 1 to an ending: [{path: ['1a','5b',...], to}]
export function walks(cs, n = '1', path = []) {
  const out = [];
  for (const side of ['a', 'b']) {
    const h = cs[n][side];
    const p = [...path, n + side];
    if (isCouplet(h.to)) out.push(...walks(cs, h.to, p));
    else out.push({ path: p, to: h.to });
  }
  return out;
}
