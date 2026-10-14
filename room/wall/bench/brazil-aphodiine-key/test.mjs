// test.mjs: the checks. Run: bash room/tools/try.sh brazil-aphodiine-key test.mjs
import { readFileSync } from 'node:fs';
import { readKey, readGenera, couplets, walks, isCouplet, genusName } from './lib.mjs';

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`);
}

const A = readKey('read-a.txt');
const B = readKey('read-b.txt');
const labels = [];
for (let n = 1; n <= 46; n++) labels.push(n + 'a', n + 'b');

// 1-2. Both reads have the 92 halves, in order.
check('read A has halves 1a..46b in order', A.map(h => h.label).join() === labels.join(), `(${A.length})`);
check('read B has halves 1a..46b in order', B.map(h => h.label).join() === labels.join(), `(${B.length})`);

// 3-4. The two reads agree, half by half.
const textDiff = A.filter((h, i) => h.text !== B[i].text).map(h => h.label);
const toDiff = A.filter((h, i) => h.to !== B[i].to).map(h => h.label);
check('the two reads agree on every half\'s wording', textDiff.length === 0, textDiff.length ? 'differ: ' + textDiff.join(' ') : '(92 of 92)');
check('the two reads agree on where every half leads', toDiff.length === 0, toDiff.length ? 'differ: ' + toDiff.join(' ') : '(92 of 92)');

// 5. The tree: couplets 2..46 each reached from exactly one half, never couplet 1,
// and every pointer goes forward, so there are no loops and every walk ends.
const cs = couplets(A);
const refs = A.filter(h => isCouplet(h.to)).map(h => +h.to);
const counts = {};
refs.forEach(r => counts[r] = (counts[r] || 0) + 1);
const once = [];
for (let n = 2; n <= 46; n++) if (counts[n] === 1) once.push(n);
check('couplets 2..46 are each reached from exactly one half', once.length === 45 && !counts[1], `(${once.length} of 45)`);
const backward = A.filter(h => isCouplet(h.to) && +h.to <= parseInt(h.label)).map(h => h.label);
check('every pointer goes forward (no loops)', backward.length === 0, backward.join(' '));

// 6. 46 couplets, so 47 endings.
const ws = walks(cs);
const endings = A.filter(h => !isCouplet(h.to));
check('47 endings, and 47 walks from couplet 1', endings.length === 47 && ws.length === 47, `(${endings.length} endings, ${ws.length} walks)`);

const desk = ws.filter(w => genusName(w.to) === 'Paraplesiataenius');
check('the desk beetle\'s genus is one walk of 20 choices, ending at 44b', desk.length === 1 && desk[0].path.length === 20 && desk[0].path.at(-1) === '44b',
  desk.length ? `(${desk[0].path.length}: ${desk[0].path.join(' ')})` : '');
check('nineteen of its twenty choices are the second half', desk.length === 1 && desk[0].path.filter(l => l.endsWith('b')).length === 19);
const lens = ws.map(w => w.path.length);
check('the walks run from 2 to 21 choices', Math.min(...lens) === 2 && Math.max(...lens) === 21, `(${Math.min(...lens)} to ${Math.max(...lens)})`);
check('the demo starts at couplet 1, not walked', !/\$\('desk'\)\.click\(\)/.test(readFileSync(new URL('demo.html', import.meta.url), 'utf8')));

// 7. Genera that end in two places are the ones marked "(in part)", and none ends in three.
const byGenus = {};
endings.forEach(h => (byGenus[genusName(h.to)] ||= []).push(h));
const twice = Object.keys(byGenus).filter(g => byGenus[g].length > 1).sort();
const inPart = [...new Set(endings.filter(h => h.to.includes('(in part)')).map(h => genusName(h.to)))].sort();
check('the genera that end twice are exactly the "(in part)" ones', twice.join() === inPart.join(), twice.join(', '));
check('no genus ends in more than two places', Object.values(byGenus).every(v => v.length <= 2));
const distinct = Object.keys(byGenus).length;
check('47 endings less 4 repeats is 43 genera', distinct === 43 && twice.length === 4, `(${distinct})`);

// 8. The second road: the genus set equals Plazi's list of genus treatments.
const G = readGenera();
const plazi = G.map(g => g.name).sort();
const mine = Object.keys(byGenus).sort();
check('Plazi\'s genus list has 43 names, none twice', plazi.length === 43 && new Set(plazi).size === 43, `(${plazi.length})`);
const onlyKey = mine.filter(g => !plazi.includes(g)), onlyPlazi = plazi.filter(g => !mine.includes(g));
check('the key\'s genera are Plazi\'s genera, as sets', onlyKey.length === 0 && onlyPlazi.length === 0,
  [onlyKey.length ? 'key only: ' + onlyKey : '', onlyPlazi.length ? 'Plazi only: ' + onlyPlazi : ''].join(' '));
check('every Plazi id is 32 hex digits', G.every(g => /^[0-9A-F]{32}$/.test(g.id)));
const G2 = readGenera('genera-b.txt');
const idDiff = G.filter(g => (G2.find(x => x.name === g.name) || {}).id !== g.id).map(g => g.name);
check('the two reads of the Plazi ids agree', G2.length === 43 && idDiff.length === 0, idDiff.length ? 'differ: ' + idDiff : '(43 of 43)');

// 9. The face carries its own copy of the key; it must be read A, and the genus list, exactly.
let html = '';
try { html = readFileSync(new URL('demo.html', import.meta.url), 'utf8'); } catch {}
const m = html.match(/<script id="key" type="application\/json">([\s\S]*?)<\/script>/);
const g = html.match(/<script id="genera" type="application\/json">([\s\S]*?)<\/script>/);
check('demo.html carries read A, half for half', !!m && JSON.stringify(JSON.parse(m[1])) === JSON.stringify(A));
check('demo.html carries the genus list, line for line', !!g && JSON.stringify(JSON.parse(g[1])) === JSON.stringify(G));

// 10. Press the page's buttons. The page's own script runs in node against a
// small stand-in for the DOM; the screen is read back from what it drew.
import vm from 'node:vm';
function page() {
  const els = {};
  const mk = (tag) => ({ tag, children: [], textContent: '', className: '', value: '', disabled: false,
    append(...c) { this.children.push(...c); }, replaceChildren(...c) { this.children = c; }, click() { this.onclick && this.onclick(); } });
  const document = {
    getElementById: id => els[id] ||= Object.assign(mk('#' + id),
      id === 'key' ? { textContent: m[1] } : id === 'genera' ? { textContent: g[1] } : {}),
    createElement: mk, createTextNode: t => ({ textContent: t, children: [] }),
  };
  const script = html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(script, { document, window: { scrollTo() {} }, JSON });
  const $ = id => document.getElementById(id);
  const screen = () => {
    const now = $('now').children;
    const end = now.find(c => c.className === 'end');
    return end ? end.children.find(c => c.tag === 'h2').textContent : now[0].textContent;
  };
  const choose = side => $('now').children.filter(c => c.className === 'half')[side === 'a' ? 0 : 1].click();
  return { $, screen, choose };
}
if (m && g) {
  const p = page();
  check('the page opens at couplet 1', p.screen() === 'Couplet 1 of 46');
  p.choose('b'); p.choose('b');
  check('two choices (1b, 5b) reach couplet 7', p.screen() === 'Couplet 7 of 46');
  p.$('desk').click();
  check('the desk button lands on Paraplesiataenius', p.screen() === 'Paraplesiataenius');
  p.$('back').click(); p.$('desk').click();
  check('back, then the desk button again: Paraplesiataenius (Quill\'s no)', p.screen() === 'Paraplesiataenius');
  p.$('back').click(); p.choose('a'); p.$('desk').click();
  check('back, 44a, then the desk button: still Paraplesiataenius', p.screen() === 'Paraplesiataenius');
  p.$('restart').click();
  check('start again returns to couplet 1', p.screen() === 'Couplet 1 of 46');
  // (the placeholder option is in the HTML, not made by the script, so it isn't here)
  const sel = p.$('pick'), opts = sel.children;
  const landed = opts.filter(o => { sel.value = o.value; sel.onchange(); return p.screen() === o.textContent.split(' ')[0]; });
  check('every one of the menu\'s ways lands on its genus', opts.length === 47 && landed.length === 47, `(${landed.length} of ${opts.length})`);
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
