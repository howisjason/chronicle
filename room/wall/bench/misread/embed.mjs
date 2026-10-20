// embed.mjs: copies the real readings (readings/<who>.txt) into demo.html's samples,
// so the face needs no outside file. Run after a reading changes: node embed.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const url = (p) => new URL(p, import.meta.url);
let html = readFileSync(url('./demo.html'), 'utf8');
html = html.replace(/\/\*READING:(\w+)\*\/"(?:[^"\\]|\\.)*"/g, (_, who) =>
  `/*READING:${who}*/${JSON.stringify(readFileSync(url(`./readings/${who}.txt`), 'utf8').trim()).replace(/</g, '\\u003c')}`);
writeFileSync(url('./demo.html'), html);
console.log('embedded');
