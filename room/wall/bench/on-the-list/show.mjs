// show.mjs: runs the page's own engine (demo.html's <script id="core">) on its three
// samples and prints what it finds. `node show.mjs`
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('./demo.html', import.meta.url), 'utf8');
const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const ctx = vm.createContext({});
vm.runInContext(core + '\nthis.OnTheList = OnTheList;', ctx);
const O = ctx.OnTheList;

for (const s of O.SAMPLES) {
  const r = O.check(s.list, s.reply, s.msg);
  console.log('== ' + s.name);
  console.log(r.summary);
  for (const f of r.findings) console.log({ ok: '  ✓', wrong: '  ✗', note: '  ?' }[f.kind] + ' ' + (f.text ? '«' + f.text + '» ' : '') + f.say);
  console.log();
}
