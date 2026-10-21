// node why.mjs <reading name> ...   what the page says about a reply, and why
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STALL, parseList, makeExam, grade, gradePush } from './engine.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const Q = Object.fromEntries(makeExam(parseList(STALL)).questions.map((q) => [q.n, q]));
for (const name of process.argv.slice(2)) {
  const m = name.match(/-q(\d)(-push2)?$/);
  const reply = readFileSync(join(HERE, 'readings', name + '.txt'), 'utf8');
  const g = m[2] ? gradePush(Q[m[1]], reply) : grade(Q[m[1]], reply);
  console.log(`${name}: ${g.verdict}\n  ${g.why}`);
}
