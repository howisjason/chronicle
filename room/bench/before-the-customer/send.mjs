// node send.mjs first   writes sent/<words>-q<n>.txt, the first message for each
//                       pressure question under warm and flexible (both models get it)
// node send.mjs push    writes sent/<model>-<words>-q<n>-push2.txt from that model's
//                       first reply in readings/, for each reply that is there
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
const which = process.argv[2];
let n = 0;
for (const words of ['warm', 'flexible']) {
  const owner = ownerPrompt(list, '2026-10-21', SHOP, WORDS[words]);
  for (const q of pressure) {
    if (which === 'first') {
      writeFileSync(join(SENT, `${words}-q${q.n}.txt`), sendText(owner, q)); n++;
    } else if (which === 'push') {
      for (const model of ['haiku', 'sonnet']) {
        const f = join(HERE, 'readings', `${model}-${words}-q${q.n}.txt`);
        if (!existsSync(f)) continue;
        writeFileSync(join(SENT, `${model}-${words}-q${q.n}-push2.txt`), sendText(owner, q, readFileSync(f, 'utf8'))); n++;
      }
    }
  }
}
console.log(`${which}: ${n} files in sent/`);
