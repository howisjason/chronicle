// show.mjs: prints what the page says for its three samples and the eight real replies. `node show.mjs`
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('./demo.html', import.meta.url), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(html.match(/<script id="core">([\s\S]*?)<\/script>/)[1] + '\nthis.F = FreeThatNight;', ctx);
const F = ctx.F;
const MARK = { ok: '✓', wrong: '✗', note: '?' };
const print = (name, r) => {
  console.log(`\n== ${name}\n${r.summary}`);
  for (const f of r.findings.concat(r.guest)) console.log(`${MARK[f.kind]} ${f.text ? '«' + f.text + '» ' : ''}${f.say}`);
};
const today = F.dn(2026, 10, 20);
F.SAMPLES.forEach((s) => print(s.name, F.check(s.book, s.reply, s.msg, { today })));
const en = F.SAMPLES[0].msg, th = 'สวัสดีค่ะ มีห้องว่างสำหรับ 2 คน 2 คืน ตั้งแต่วันเสาร์ที่ 13 พ.ย. ไหมคะ ราคาเท่าไหร่คะ';
for (const f of ['haiku-en-1', 'haiku-en-2', 'haiku-en-3', 'sonnet-en-1', 'sonnet-en-2', 'sonnet-en-3', 'haiku-th', 'sonnet-th']) {
  const reply = readFileSync(new URL(`./readings/${f}.txt`, import.meta.url), 'utf8');
  print(f, F.check(F.SAMPLES[0].book, reply, f.endsWith('th') ? th : en, { today }));
}
