// node extract.mjs <tasks dir> <map.json>
// Each model ran as a fresh agent whose whole transcript is a JSONL file. This takes
// the last thing it wrote, counts the tools it called (it was told to call none), and
// writes readings/<name>.txt. A reading already there (the first round, copied by
// hand) is checked against the transcript instead of written over. The map of names
// to agent ids lives in the drawer; it isn't needed to read the readings.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [dir, mapFile] = process.argv.slice(2);
const map = JSON.parse(readFileSync(mapFile, 'utf8'));
let wrote = 0, same = 0, bad = 0;
for (const [name, id] of Object.entries(map)) {
  const f = join(dir, id + '.output');
  if (!existsSync(f)) { console.log(`${name}: no transcript yet`); bad++; continue; }
  let text = null, tools = 0;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== 'assistant' || !Array.isArray(o.message?.content)) continue;
    for (const c of o.message.content) {
      if (c.type === 'tool_use') tools++;
      if (c.type === 'text' && c.text.trim()) text = c.text.trim();
    }
  }
  if (tools) { console.log(`${name}: called ${tools} tool(s)`); bad++; }
  if (text == null) { console.log(`${name}: no reply`); bad++; continue; }
  const out = join(HERE, 'readings', name + '.txt');
  if (existsSync(out)) {
    if (readFileSync(out, 'utf8').trim() === text) same++;
    else { console.log(`${name}: my copy differs from the transcript`); bad++; }
  } else { writeFileSync(out, text); wrote++; }
}
console.log(`${wrote} written, ${same} copies match, ${bad} problems`);
