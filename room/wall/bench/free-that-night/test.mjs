// test.mjs: runs the engine inside demo.html (its <script id="core">) in a node vm and
// checks what it says, then runs the face's own script against a small stand-in page and
// presses its buttons. One copy of the code: the face's. `node test.mjs`
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('./demo.html', import.meta.url), 'utf8');
const script = (id) => html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`))[1];
const ctx = vm.createContext({});
vm.runInContext(script('core') + '\nthis.F = FreeThatNight;', ctx);
const F = ctx.F;

let pass = 0, fail = 0;
const check = (say, ok, seen) => {
  if (ok) { pass++; console.log('ok   ' + say); }
  else { fail++; console.log('FAIL ' + say + (seen !== undefined ? '  (saw ' + JSON.stringify(seen) + ')' : '')); }
};
const said = (r) => r.findings.concat(r.guest).map((f) => (f.text ? '«' + f.text + '» ' : '') + f.say).join('\n');
const has = (r, re) => re.test(said(r));
const today = F.dn(2026, 10, 20);
const BOOK = F.SAMPLES[0].book;
const run = (reply, msg, book = BOOK) => F.check(book, reply, msg || '', { today });

// The calendar itself.
check('13 Nov 2026 is a Friday, 13 Nov 2027 a Saturday', F.wdOf(F.dn(2026, 11, 13)) === 5 && F.wdOf(F.dn(2027, 11, 13)) === 6);

// The book.
{ const B = F.parseBook(BOOK);
  check('book: three rooms, today 20 Oct 2026, weekend Fri and Sat', B.rooms.length === 3 && B.today === today && B.weekend.join() === '5,6' && B.problems.length === 0, B.problems);
  check('book: Room 1 is booked the nights of 13 and 14 Nov, not 15', B.byId['1'].booked[F.dn(2026, 11, 13)] && B.byId['1'].booked[F.dn(2026, 11, 14)] && !B.byId['1'].booked[F.dn(2026, 11, 15)]);
  check('book: Twin 800, weekend 1000; Family has no weekend rate', B.byId['2'].rate === 800 && B.byId['2'].wk === 1000 && B.byId['3'].wk === null); }
{ const B = F.parseBook('Room 1 Double 900, weekend 1100\nsomething else', today);
  check('book: a weekend rate with no weekend line is said, and Fri and Sat are taken', B.weekend.join() === '5,6' && B.problems.some((p) => /no line saying which nights/.test(p)), B.problems);
  check('book: no today line is said', B.problems.some((p) => /no today line/.test(p)), B.problems);
  check('book: a line it can\'t read is said, not dropped quietly', B.problems.some((p) => /something else/.test(p)), B.problems); }

// The three samples.
const [s0, s1, s2] = F.SAMPLES.map((s) => F.check(s.book, s.reply, s.msg, { today }));
check('careful reply: nothing wrong', s0.wrong === 0, said(s0));
check('careful reply: the guest\'s slip named, with three readings, the third a year out', has(s0, /13 Nov 2026 is a Friday\. They could mean Fri 13 Nov \(the date as written\), Sat 14 Nov \(the weekday\), or Sat 13 Nov 2027/), said(s0));
check('careful reply: it asks, and answers for both', has(s0, /asks which they meant\. It answers for both/), said(s0));
check('careful reply: "Saturday is the 14th" is read as a claim on 14 Nov', has(s0, /Saturday 14 Nov 2026: right/), said(s0));
check('careful reply: fully booked Sat 14 → Mon 16 is right (every room has a booked night)', has(s0, /Every room has a booked night among the nights of 14, 15 Nov: right/), said(s0));
check('wrong reply: six things', s1.wrong === 6, s1.wrong);
check('wrong reply: Saturday 13 is the guest\'s weekday carried over', has(s1, /13 Nov 2026 is a Friday, not a Saturday\. That's the guest's weekday, carried over/), said(s1));
check('wrong reply: Monday 15 is the guest\'s calendar carried on', has(s1, /15 Nov 2026 is a Sunday, not a Monday\. That's the guest's calendar carried on/), said(s1));
check('wrong reply: the Double is booked both nights', has(s1, /Room 1 \(Double\) is booked on the nights of 13, 14 Nov\./), said(s1));
check('wrong reply: 900 a night and 1800 are the weekday rate on Friday and Saturday nights', has(s1, /900 a night isn't .* That's the weekday rate \(900\) on Friday and Saturday nights/) && has(s1, /1800 as the total .* 2200/), said(s1));
check('wrong reply: it quietly took the date', has(s1, /quietly took the date \(Fri 13 Nov\)/), said(s1));
check('New Year: four things', s2.wrong === 4, s2.wrong);
check('New Year: 2568 is a year behind and the weekday says so', has(s2, /2568 \(2025\) puts 30 Dec in the past: a year behind.*Wednesday is right for 2026, so the year is the slip/), said(s2));
check('New Year: 1 ม.ค. 2569 is a year behind too (it\'s 2570)', has(s2, /2569 \(2026\) puts 1 Jan in the past.*2570 \(2027\)/), said(s2));
check('New Year: 3 nights is the check-out day counted, and so is 4500', has(s2, /3 nights, but Wed 30 Dec → Fri 1 Jan is 2 nights.*check-out day was counted/) && has(s2, /4500 .* 3000 .* That's 3 nights: the check-out day counted/), said(s2));
check('New Year: the guest\'s "คืนวันที่ ๓๐ และ ๓๑" is read as two listed nights', has(s2, /The guest asked for 2 nights; the reply's Wed 30 Dec → Fri 1 Jan is 2/), said(s2));

// Eight real replies (readings/): Haiku and Sonnet, 3 in English and 1 in Thai each, 20 Oct 2026,
// the book above and a guest who wrote Saturday 13 November. All eight were right; the page should say so.
const EN = F.SAMPLES[0].msg, TH = 'สวัสดีค่ะ มีห้องว่างสำหรับ 2 คน 2 คืน ตั้งแต่วันเสาร์ที่ 13 พ.ย. ไหมคะ ราคาเท่าไหร่คะ';
for (const f of ['haiku-en-1', 'haiku-en-2', 'haiku-en-3', 'sonnet-en-1', 'sonnet-en-2', 'sonnet-en-3', 'haiku-th', 'sonnet-th']) {
  const r = run(readFileSync(new URL(`./readings/${f}.txt`, import.meta.url), 'utf8'), f.endsWith('th') ? TH : EN);
  check(`${f}: nothing wrong, the slip named and asked about, Twin free Fri 13 → Sun 15 for 2000`, r.wrong === 0 && has(r, /and asks which they meant/) && has(r, /Room 2 \(Twin\) is free on the nights of 13, 14 Nov: right/) && has(r, /2000: right/), said(r));
}

// Dates and years.
{ const r = run('ห้อง 2 ว่างค่ะ วันศุกร์ที่ ๑๓ พ.ย. ๖๙ ถึง ๑๕ พ.ย. ๖๙'); check('Thai digits and a two-digit Buddhist year (๖๙ = 2569)', r.wrong === 0 && has(r, /Friday 13 Nov 2026: right/), said(r)); }
{ const r = run('Room 2 is free from Friday 13 November 3112 to 15 November 3112'); check('3112: 543 added twice', has(r, /3112 is 2026 with 543 added twice/), said(r)); }
{ const r = run('Room 2 is free from Friday 13 November 1483 to 15 November 1483'); check('1483: 543 taken off a Common year', has(r, /1483 is 2026 with 543 taken off/), said(r)); }
{ const r = run('Room 2 is free on 31 November.'); check('31 November: no such date', has(r, /There is no 31 Nov/), said(r)); }
{ const r = run('Room 2 is free from 13 Nov to 15 Nov.'); check('no year: the next 13 Nov on or after today (2026)', r.wrong === 0 && has(r, /Fri 13 Nov → Sun 15 Nov is 2 nights/), said(r)); }
{ const r = run('Room 2 is free from Wednesday 30 Dec to Saturday 2 Jan, 3 nights.'); check('across the year\'s end: 30 Dec → 2 Jan is 3 nights, Saturday 2 Jan 2027', r.wrong === 0 && has(r, /Saturday 2 Jan 2027: right/) && has(r, /is 3 nights \(Wed, Thu, Fri\)/), said(r)); }
{ const r = run('Room 2 is free on Thursday 13 November.'); check('Thursday 13 Nov: last year\'s calendar is named among the fits', has(r, /not a Thursday\..*13 Nov 2025, last year's calendar/), said(r)); }
{ const r = run('Room 2: nights of 20 and 21 Nov are free.'); check('"nights of 20 and 21" is a stay of two listed nights', has(r, /Fri 20 Nov → Sun 22 Nov is 2 nights/), said(r)); }
{ const r = run('Room 2 is free for 2 nights from 20 Nov.'); check('a start and a count: 20 Nov for 2 nights', has(r, /Fri 20 Nov → Sun 22 Nov is 2 nights/), said(r)); }

// Nights, rooms and prices.
{ const r = run('Room 2 is free from 20 Nov to 22 Nov, 3 nights.'); check('3 nights for 20 → 22: the check-out day counted', r.wrong === 1 && has(r, /check-out day was counted as a night/), said(r)); }
{ const r = run('Room 1 is free from 13 Nov to 15 Nov.'); check('free over a booked night is wrong', r.wrong === 1 && has(r, /Room 1 \(Double\) is booked on the nights of 13, 14 Nov\./), said(r)); }
{ const r = run('Sorry, Room 2 is fully booked from 20 Nov to 22 Nov.'); check('full over free nights is a note: a lost sale', r.wrong === 0 && r.findings.some((f) => f.kind === 'note' && /A lost sale/.test(f.say)), said(r)); }
{ const r = run('Room 2 from Thu 19 Nov to Sat 21 Nov: 800 + 1000 = 1800 baht total.'); check('a weekday and a weekend night: 1800', r.wrong === 0 && has(r, /1800: right, 800 \+ 1000/), said(r)); }
{ const r = run('Room 2 from Thu 19 Nov to Sat 21 Nov, 2000 baht total.'); check('2000 for Thu and Fri: the weekend rate on every night', has(r, /weekend rate \(1000\) on every night/), said(r)); }
{ const r = run('Room 2 from 20 Nov to 22 Nov, 2800 baht total.'); check('2800 for Fri and Sat: Sunday 22 added at 800, the check-out day counted', has(r, /That's 3 nights: the check-out day counted/), said(r)); }
{ const r = run('Room 2 from 20 Nov to 22 Nov, 3000 baht total.'); check('3000 for Fri and Sat: 3 nights at the weekend rate, the check-out day counted', has(r, /That's 3 nights at one rate: the check-out day counted/), said(r)); }
{ const r = run('Room 2 from 20 Nov to 22 Nov, 2200 baht total.'); check('2200 for the Twin\'s weekend: the Double\'s price', has(r, /what Room 1 \(Double\) would cost/), said(r)); }
{ const r = run('Room 3 from 20 Nov to 22 Nov is 3000 baht, it is free.'); check('a price and a free claim in one sentence', r.wrong === 0 && has(r, /3000: right/) && has(r, /Room 3 \(Family\) is free/), said(r)); }
{ const r = run('Let me double-check: Room 2 from 20 Nov to 22 Nov is 2000 baht.'); check('"double-check" isn\'t the Double room', r.wrong === 0 && !has(r, /Room 1/), said(r)); }

// The guest.
{ const r = run('Yes, Room 2 is free from Saturday 14 Nov to 16 Nov!', 'Can I have 2 nights from Saturday 13 November?');
  check('quietly took the weekday', has(r, /quietly took the weekday \(Sat 14 Nov\)/), said(r)); }
{ const r = run('13 November is a Friday. Room 2 is free 13-15 Nov.', 'Can I have 2 nights from Saturday 13 November?');
  check('named it but didn\'t ask: a note', r.guest.some((f) => f.kind === 'note' && /doesn't ask/.test(f.say)), said(r)); }
{ const r = run('Room 2 is free from 20 Nov to 22 Nov.', 'Can I have 2 nights from 13 Nov?');
  check('a stay that starts on no day the guest asked for is wrong', r.guest.some((f) => f.kind === 'wrong' && /No stay in the reply starts on Fri 13 Nov/.test(f.say)), said(r)); }

// The ask.
check('the ask says weekday and year on every date, ask when they don\'t agree, nights, each night\'s price', /weekday and year/.test(F.ASK) && /ask which they meant/.test(F.ASK) && /number of nights/.test(F.ASK) && /price of each night/.test(F.ASK) && /อย่าเลือกเอง/.test(F.ASK), F.ASK);

// The face, on a stand-in page: load runs sample 0, the buttons load the others.
{
  const els = {};
  const el = (id) => (els[id] = els[id] || { id, value: '', innerHTML: '', textContent: '', onclick: null });
  const fctx = vm.createContext({ document: { getElementById: el } });
  vm.runInContext(script('core') + '\n' + script('face'), fctx);
  check('face: opens on the wrong reply, six things, with the guest section', /6 things/.test(els.out.innerHTML) && /✗/.test(els.out.innerHTML) && /Against the guest's message/.test(els.out.innerHTML), els.out.innerHTML.slice(0, 200));
  els.s0.onclick();
  check('face: the careful-reply button', /Everything I could check/.test(els.out.innerHTML), els.out.innerHTML.slice(0, 200));
  els.s2.onclick();
  check('face: the New Year button', /2568/.test(els.out.innerHTML));
  els.msg.value = ''; els.reply.value = 'Room 3 is free from 20 Nov to 22 Nov, 3000 baht.'; els.go.onclick();
  check('face: Check runs on what is typed', /Everything I could check/.test(els.out.innerHTML), els.out.innerHTML);
  check('face: the ask is shown', /weekday and year/.test(els.ask.textContent));
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
