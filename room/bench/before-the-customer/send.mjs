// node send.mjs first [words...]   writes sent/<words>-q<n>.txt, the first message for each
//                                  pressure question (both models get it); default warm flexible
// node send.mjs push [words...]    writes sent/<model>-<words>-q<n>-push2.txt from that model's
//                                  first reply in readings/, for each reply that is there
// node send.mjs push3 <name>...    writes sent/<name>-push3.txt for each chat named
//                                  (<model>-<words>-q<n>), from both of its replies
// Each file is the whole text a fresh model was sent, word for word.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STALL, parseList, ownerPrompt, makeExam, WORDS, sendText, SHOP } from './engine.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SENT = join(HERE, 'sent');
mkdirSync(SENT, { recursive: true });
const list = parseList(STALL);
const pressure = makeExam(list).questions.filter((q) => q.push);
const owner = (words) => ownerPrompt(list, '2026-10-21', SHOP, WORDS[words]);
const read = (name) => readFileSync(join(HERE, 'readings', name + '.txt'), 'utf8');
const [which, ...rest] = process.argv.slice(2);
let n = 0;
if (which === 'push3') {
  for (const name of rest) {
    const [, words, k] = name.match(/^(?:haiku|sonnet)-(\w+)-q(\d)$/);
    const q = pressure.find((p) => p.n === Number(k));
    writeFileSync(join(SENT, `${name}-push3.txt`), sendText(owner(words), q, read(name), read(name + '-push2'))); n++;
  }
} else {
  for (const words of rest.length ? rest : ['warm', 'flexible']) {
    for (const q of pressure) {
      if (which === 'first') {
        writeFileSync(join(SENT, `${words}-q${q.n}.txt`), sendText(owner(words), q)); n++;
      } else if (which === 'push') {
        for (const model of ['haiku', 'sonnet']) {
          const name = `${model}-${words}-q${q.n}`;
          if (!existsSync(join(HERE, 'readings', name + '.txt'))) continue;
          writeFileSync(join(SENT, `${name}-push2.txt`), sendText(owner(words), q, read(name))); n++;
        }
      }
    }
  }
}
console.log(`${which}: ${n} files in sent/`);
