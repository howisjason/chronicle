// test.mjs: runs the engine inside demo.html (its <script id="core">) in a node vm and
// checks what it says, then runs the face's own script against a small stand-in page and
// presses its buttons. One copy of the code: the face's. `node test.mjs`
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('./demo.html', import.meta.url), 'utf8');
const script = (id) => html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`))[1];
const ctx = vm.createContext({});
vm.runInContext(script('core') + '\nthis.OnTheList = OnTheList;', ctx);
const O = ctx.OnTheList;

let pass = 0, fail = 0;
const check = (say, ok, seen) => {
  if (ok) { pass++; console.log('ok   ' + say); }
  else { fail++; console.log('FAIL ' + say + (seen !== undefined ? '  (saw ' + JSON.stringify(seen) + ')' : '')); }
};
const kinds = (r) => r.findings.map((f) => f.kind);
const said = (r) => r.findings.map((f) => (f.text ? '«' + f.text + '» ' : '') + f.say).join('\n');
const has = (r, re) => re.test(said(r));
const STALL = O.SAMPLES[0].list;

// The three samples.
const [s0, s1, s2] = O.SAMPLES.map((s) => O.check(s.list, s.reply, s.msg));
check('stall: 3 ขีด priced as 3 กก. is named, 54 not 540', has(s0, /priced 3 ขีด as 3 กก\..*54, not 540/), said(s0));
check('stall: two wrong (the pork line and the total)', s0.wrong === 2, s0.wrong);
check('stall: by the list the order is 54 + 120 + 40 + 40 = 254', s0.byList === 254, s0.byList);
check('stall: "10 โมง" is not taken for money', !has(s0, /\b10\b(?! โมง)/) && !kinds(s0).includes('note'), said(s0));
check('stall: the customer\'s Thai digits ๓ ขีด meet the reply\'s 3 ขีด (no quantity complaint)', !has(s0, /asked for/), said(s0));
check('stall: "ไข่ ๑ แผง" finds ไข่ไก่ by the start of its name', !has(s0, /doesn't answer/), said(s0));
check('stall: "ส่ง" finds ค่าส่ง by its second name, so the fee was asked for', !has(s0, /didn't ask/), said(s0));
check('bakery: 35 is no price on the list, and the label claims no more than that', has(s1, /35 each isn't the list's price for Croissant \(45 each\)\. It isn't any price on the list\. An old price or a sale that has ended would look like this; so would a plain mistake/), said(s1));
check('bakery: 110 is two cinnamon rolls at Pain au chocolat\'s price', has(s1, /110 is 2 at Pain au chocolat's price/), said(s1));
check('bakery: by the list 400, the reply says 370', has(s1, /add to 370\. By the list the order comes to 400/), said(s1));
check('bakery: the phone number and "9" are left alone', s1.findings.length === 4, s1.findings.length);
check('not on the list: 22 a ขีด is 220 a กก., on the list', s2.findings[0].kind === 'ok' && /22 a ขีด: on the list/.test(s2.findings[0].say), s2.findings[0]);
check('not on the list: the shrimp at 350 a กก. is flagged', s2.findings[1].kind === 'wrong' && /กุ้ง/.test(s2.findings[1].text), s2.findings[1]);

// Quantities in three spellings land on one amount.
for (const q of ['3 ขีด', '300 กรัม', '0.3 กก.', '0.3 กิโล', '300g']) {
  const r = O.check(STALL, 'หมูสับ ' + q + ' = 54 บาท');
  check(`"${q}" of 180 a กก. comes to 54`, r.findings[0].kind === 'ok', said(r));
}
{ const r = O.check(STALL, 'หมูสับ ครึ่งโล = 90 บาท'); check('ครึ่งโล is 500 g, 90', r.findings[0].kind === 'ok', said(r)); }
{ const r = O.check('Eggs 6 each', '2 dozen eggs = ฿144'); check('2 dozen at 6 each is 144', r.findings[0].kind === 'ok', said(r)); }
{ const r = O.check('Eggs 6 each', '2 dozen eggs = ฿12'); check('2 dozen priced as 2 is named as a unit slip', /priced 2 โหล as 2 each/.test(said(r)), said(r)); }

// Units that don't meet are said, not guessed.
{ const r = O.check(STALL, 'หมูสับ 3 ขีด 54 บาท ไข่ 1 แผง 120 บาท'); check('two items on one line, amount after each name: neither steals the other\'s', r.findings.length === 3 && r.wrong === 0 && /3 ขีด × 180/.test(said(r)), said(r)); }
{ const r = O.check('Eggs 6 each\nMilk 40 each', '2 dozen eggs and 1 milk = ฿40, 1 dozen eggs = ฿72'); check('"and 1 milk", ", 1 dozen eggs": amounts lead their names after a separator', r.wrong === 0 && /1 โหล × 6 each = 72/.test(said(r)) && /1 × 40 each = 40/.test(said(r)), said(r)); }
{ const r = O.check(STALL, 'ไข่ไก่ 10 ฟอง = 40 บาท'); check('ฟอง against a list sold by the แผง: says it can\'t tell', r.findings[0].kind === 'note' && /don't know how many แผง/.test(r.findings[0].say), said(r)); }

// Names: a start shared by two items is said to be either.
{ const r = O.check(STALL, 'หมู 3 ขีด = 54 บาท'); check('"หมู" could be หมูสับ or หมูสามชั้น: not checked, both named', /any of หมูสับ, หมูสามชั้น/.test(said(r)) && r.wrong === 0, said(r)); }
{ const r = O.check(STALL, 'pork mince 3 ขีด = 54 บาท'); check('a name the list doesn\'t have is flagged as not on the list, not guessed', r.findings[0].kind === 'wrong' && /isn't on the list/.test(r.findings[0].say), said(r)); }

// Shared prices: one of a few.
{ const L = 'Latte 70 each\nMocha 70 each\nEspresso 50 each';
  const r = O.check(L, '2 x Espresso = ฿140');
  check('two items at 70: "one of a few", both named', /one of a few things on the list \(Latte, Mocha\)/.test(said(r)), said(r)); }

// Sums.
{ const r = O.check(STALL, 'ไข่ไก่ 2 แผง = 420 บาท'); check('2 แผง at 120 as 420: by the list 240, and 420 is the same digits swapped', /240; 420 is the same digits with two swapped/.test(said(r)), said(r)); }
{ const r = O.check(STALL, 'หมูสับ 1 กก. = 180 บาท\nไข่ไก่ 1 แผง = 120 บาท\nรวม 330 บาท'); check('a total 30 over its own lines', /add to 300, and it says 330 \(30 over\)/.test(said(r)), said(r)); }
{ const r = O.check(STALL, 'หมูสับ 1 กก. = 180 บาท\nไข่ไก่ 1 แผง = 120 บาท\nรวม 300 บาท'); check('a right total is ok', r.wrong === 0 && r.findings.at(-1).kind === 'ok', said(r)); }
{ const r = O.check(STALL, 'หมูสับ 1 กก. = 180 บาท\nไข่ไก่ 1 แผง = 120 บาท\nรวม 300 บาท ลดให้เหลือ 290 บาทค่ะ');
  check('a seller\'s round-down ("ลดให้เหลือ 290") is a note for the shop, not a slip', r.wrong === 0 && /brings the total down to 290 from 300/.test(said(r)), said(r));
  check('...and the รวม on that same line is read as the total (no false "gives no total")', !/gives no total/.test(said(r)) && /lines add to 300\./.test(said(r)), said(r)); }
// Quill's case at the finish door: a "ลดให้เหลือ" that charges more than the goods.
{ const r = O.check(STALL, 'หมูสับ 1 กก. = 180 บาท\nไข่ไก่ 1 แผง = 120 บาท\nรวม 330 บาท ลดให้เหลือ 320 บาท');
  check('Quill\'s case: รวม 330 over lines of 300 is a miss', /add to 300, and it says 330 \(30 over\)/.test(said(r)), said(r));
  check('Quill\'s case: "ลดให้เหลือ 320" for 300 of goods is called, not passed as a discount', /asks for 320, which is more than the order by the list, 300/.test(said(r)) && r.wrong === 2, said(r)); }
// Quill's second look: one sum on a line naming both a total and a discount is the amount to pay.
for (const t of ['Total after discount: ฿320', 'ยอดหลังลด 320 บาท', 'รวมหลังหักส่วนลด 320 บาท', 'Total with discount ฿320']) {
  const r = O.check(STALL, 'หมูสับ 1 กก. = 180 บาท\nไข่ไก่ 1 แผง = 120 บาท\n' + t);
  check(`"${t}" over 300 of goods is a miss, not a discount of 320`, r.wrong === 1 && /asks for 320, which is more than its own lines, 300/.test(said(r)) && !/A discount of 320/.test(said(r)), said(r));
}
{ const r = O.check(STALL, 'หมูสับ 1 กก. = 180 บาท\nไข่ไก่ 1 แผง = 120 บาท\nยอดหลังลด 290 บาท');
  check('"ยอดหลังลด 290" under 300 stays a note for the shop', r.wrong === 0 && /brings the total down to 290 from 300/.test(said(r)), said(r)); }
{ const r = O.check(STALL, 'หมูสับ 1 กก. = 180 บาท\nไข่ไก่ 1 แผง = 120 บาท\nส่วนลด 320 บาท');
  check('a "discount" bigger than the lines is a miss', r.wrong === 1 && /more than the reply's own lines/.test(said(r)), said(r)); }
{ const r = O.check(STALL, 'หมูสับ 1 กก. = 180 บาท\nไข่ไก่ 1 แผง = 120 บาท\nลดให้เหลือ 310 บาท');
  check('"ลดให้เหลือ 310" with no total line, over 300 of lines', /asks for 310, which is more than its own lines, 300/.test(said(r)), said(r)); }
{ const r = O.check(STALL, 'หมูสับ 1 กก. = 180 บาท\nไข่ไก่ 1 แผง = 120 บาท\nส่วนลด 20 บาท\nรวม 280 บาท');
  check('a discount of 20 then รวม 280: the total meets, the discount is a note', r.wrong === 0 && /A discount of 20/.test(said(r)), said(r)); }
{ const r = O.check(STALL, 'หมูสับ 1 กก. = 180 บาท\nไข่ไก่ 1 แผง = 120 บาท'); check('no total: says what the list makes it', /gives no total\. By the list the lines come to 300/.test(said(r)), said(r)); }
{ const r = O.check(STALL, 'หมูสับ ๑ กก. = ๑๘๐ บาท'); check('Thai digits in the reply', r.findings[0].kind === 'ok', said(r)); }
{ const r = O.check('ข้าวสาร 1,250 บาท/กระสอบ', 'ข้าวสาร 2 กระสอบ = 2,500 บาท'); check('thousands with a comma, and a unit only the list names (กระสอบ)', r.findings[0].kind === 'ok', said(r)); }

// The customer's message.
{ const r = O.check(STALL, 'หมูสับ 5 ขีด = 90 บาท', 'เอาหมูสับ 3 ขีด กับผักบุ้ง 1 กำ');
  check('quantity changed: asked 3 ขีด, reply has 5', /asked for 3 ขีด of หมูสับ, and the reply has 5 ขีด/.test(said(r)), said(r));
  check('item asked for and not answered: ผักบุ้ง', /asked for ผักบุ้ง and the reply doesn't answer it/.test(said(r)), said(r)); }
{ const r = O.check(STALL, 'หมูสับ 3 ขีด = 54 บาท\nผักบุ้ง 1 กำ = 20 บาท', 'เอาหมูสับ 3 ขีด');
  check('an item the customer didn\'t ask for is a note', /didn't ask for ผักบุ้ง/.test(said(r)) && r.findings.at(-1).kind === 'note', said(r)); }

// The list's own forms.
{ const L = O.parseList('หมูกก.ละ 180\nCroissant: 45 baht each\nค่าส่ง/ส่ง 40\n# a comment\nno price here');
  check('list: "หมูกก.ละ 180" is 180 a กก.', L.items[0].name === 'หมู' && L.items[0].unit.base === 1000, L.items[0]);
  check('list: "Croissant: 45 baht each"', L.items[1].name === 'Croissant' && L.items[1].price === 45 && L.items[1].unit.kind === 'c', L.items[1]);
  check('list: second name after a slash, flat fee', L.items[2].keys.length === 2 && L.items[2].unit.kind === 'flat', L.items[2]);
  check('list: a line with no price is said, not dropped quietly', L.problems.length === 1, L.problems); }

// Two real replies: Haiku, 20 Oct 2026, the stall's list and one customer message, once
// with the ask and once without (readings/). Both were right; the page should say so.
{ const msg = 'เอาหมูสับ 3 ขีด หมูสามชั้นครึ่งโล ไข่ 1 แผง ผักบุ้ง 2 กำ แล้วก็กุ้ง 1 โลค่ะ ส่งด้วยนะคะ';
  for (const f of ['haiku-with-ask', 'haiku-no-ask']) {
    const reply = readFileSync(new URL(`./readings/${f}.txt`, import.meta.url), 'utf8');
    const r = O.check(STALL, reply, msg);
    check(`${f}: nothing wrong, five lines on the list, 364 by the list`, r.wrong === 0 && r.findings.filter((x) => x.kind === 'ok').length === 6 && r.byList === 364, said(r));
  } }

// The ask.
check('the ask says only prices from the list, one line an item, a total, no rounding', /only the prices in the list/.test(O.ASK) && /one line/.test(O.ASK) && /รวม/.test(O.ASK) && /Don't round/.test(O.ASK), O.ASK);

// The face, on a stand-in page: load runs sample 0, the buttons load the others.
{
  const els = {};
  const el = (id) => (els[id] = els[id] || { id, value: '', innerHTML: '', textContent: '', onclick: null });
  const doc = { getElementById: el };
  const fctx = vm.createContext({ document: doc });
  vm.runInContext(script('core') + '\n' + script('face'), fctx);
  check('face: opens on the stall, its pork line marked wrong', /✗ <q>หมูสับ 3 ขีด = 540 บาท<\/q>/.test(els.out.innerHTML), els.out.innerHTML.slice(0, 200));
  els.s1.onclick();
  check('face: the bakery button', /Pain au chocolat/.test(els.out.innerHTML) && /3 things/.test(els.out.innerHTML));
  els.s2.onclick();
  check('face: the not-on-the-list button', /กุ้งสด/.test(els.out.innerHTML));
  els.msg.value = ''; els.reply.value = 'ไข่ไก่ 1 แผง = 120 บาท'; els.go.onclick();
  check('face: Check runs on what is typed', /Every price in this reply is on the list/.test(els.out.innerHTML), els.out.innerHTML);
  check('face: the ask is shown', /only the prices in the list/.test(els.ask.textContent));
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
