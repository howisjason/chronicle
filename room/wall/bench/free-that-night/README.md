# Is that room free that night?

Small guesthouses can let an AI draft the answer when a guest asks on LINE or by mail whether a room is free. The guesthouse already holds the check on that answer, which is its own booking book: rooms, rates, and who is in which room which night. And a booking has one more check that nobody has to write down, the calendar. Every weekday the AI puts next to a date can be checked.

Open `demo.html` in a browser (no server, nothing fetched). Paste three things:

1. **the book**, one thing a line:
   - `Today: Tuesday 20 October 2026` (or `วันนี้ 20 ต.ค. 2569`). A date without a year is placed as the next one on or after this day. With no today line, the computer's date is used, and the page says so;
   - `Weekend rate applies on Friday and Saturday nights` (any line with weekend, วันหยุด or สุดสัปดาห์ and weekdays in it). With a weekend rate but no such line, it takes Friday and Saturday nights and says so;
   - a room: `Room 1, Double: 900 baht a night, weekend 1100` or `ห้อง 1 เตียงคู่ 900 วันหยุด 1100`. Rooms need a number;
   - a booking: `Booked: Room 1, check-in 13 Nov, check-out 15 Nov` (the nights of 13 and 14), or one date for one night, or a date and `2 nights`.
2. **the guest's message**, if you have it;
3. **the AI's reply**.

It reads the reply a sentence at a time and says:

- whether a weekday said of a date is that date's weekday (`Friday 13 Nov`, `วันศุกร์ที่ 13 พ.ย.`, `13 November 2026 is a Friday`, `13 พ.ย. ตรงกับวันศุกร์`, `Saturday is the 14th`);
- the year, in either reckoning (2569 is 2026; `๖๙` is 2569). A year that puts the stay in the past is a year behind, and the page reads the date a year later from then on. A year with 543 added twice (3112) or taken off a Common year (1483) is named;
- the nights of a stay: check-in to check-out (`13-15 Nov`, `Friday 13 to Sunday 15 November`, `เข้าพัก 13 ออก 15`), nights listed (`คืนวันที่ 30 และ 31 ธ.ค.`, `nights of 20 and 21`), or a start and a count (`2 nights from 20 Nov`), across the end of a year too. A count the reply states is checked against it;
- whether the room the reply offers is free on every night (`available`, `free`, `ว่าง`, `we have our Twin room`), and whether a room it calls booked or full really has a booked night. A free room called full is a note: a lost sale. `booked from 15 Nov` is checked as a booked night;
- the price: a night's rate, weekend nights at the weekend rate, and the total as the sum of the nights.

When something is wrong, it says which story fits: the guest's weekday carried over, or the guest's calendar carried on (if the guest wrote Saturday for a Friday, the reply's Monday 15 is that calendar); a day out; last year's or next year's calendar; the year a year behind; the check-out day counted as a night (in the nights or in the price); one night short; the weekday rate on a weekend night; the weekend rate on every night; another room's price; two digits swapped.

**The guest's own slip.** When the guest's weekday and date don't agree, the page names what they could have meant: the date as written, the nearest day with that weekday, and the next year in which the date falls on that weekday (Saturday 13 November is 2027). Quill pointed out the third at the build door. Then it says whether the reply named the slip (gave the guest's date its true weekday) and asked which they meant, named it and didn't ask, or quietly took the date or the weekday. It also compares the guest's nights with each stay the reply offers.

**The ask.** Under the boxes is a short instruction, in English and Thai, to put in front of the AI: every date with its weekday and year, ask when the guest's weekday and date don't agree, check-in to check-out and the number of nights, the room, the price of each night and the total. No reply on this page was written with it.

## Against real AIs

The test was fixed before it started (the guess is below). One invented book (in `demo.html` as the samples' book), and a guest who wrote "2 nights from Saturday 13 November". 13 Nov 2026 is a Friday. The two readings get different answers from this book: Friday 13 → Sunday 15 has the Twin free at 2,000, and Saturday 14 → Monday 16 has nothing free. A fresh Haiku and a fresh Sonnet each answered 3 times in English and once in Thai, with the book, "Today is Tuesday 20 October 2026" and "output only the reply". That makes 8 replies, all in `readings/`, with the prompt word for word in `readings/prompt.txt`. The page's first sample button is `sonnet-en-1`, unchanged. The other two samples are mine.

**All 8 were right, and the page agrees with all 8.** Every reply said 13 November is a Friday, and every one asked which day the guest meant. All 8 said what both readings would mean. The four Sonnet replies gave both as two-night stays (Friday: the Twin, 2,000; Saturday: nothing free). Three Haiku replies offered the Friday stay and said the Twin is free for only one night from Saturday, since it is booked from the 15th. The fourth said a Saturday start isn't possible. They counted the nights right and used the weekend rate on both nights. The two Haiku replies that mention the other rooms called them booked, and they were. One Sonnet wrote "I've assumed you mean check-in Friday 13 Nov" and then asked "Which dates would you like?" The page counts that as asking.

The guess, written before any run:

- (a) all 8 count the nights right for whichever dates they settle on: about 80% sure. **Right.**
- (b) at least one of the 8 settles on a date without asking: about 50% sure. **Wrong: none did.**

So every wrong reply on this page is one I wrote. Eight runs of two models on one slip show that the page doesn't cry wolf at a careful answer. They show nothing about how often an AI gets a booking wrong. The prompt also handed the models today's weekday ("Tuesday 20 October"), so counting forward to a Friday needed no calendar of their own. A prompt without it is still untried.

## What it doesn't do

- It checks dates, nights, rooms and prices. It doesn't check promises, deposits, refunds, breakfast, or how many people a room sleeps.
- A weekday counts as said of a date only when it stands right next to it, or in "is a", "falls on a", "ตรงกับ", "คือ" or "จะเป็น". `Friday and Saturday nights` with no date is left alone.
- A sentence with no date of its own is read against the last stay named before it, and a room is "this room" or "it" when the sentence names none. A reply that jumps back to an earlier stay without naming its dates is read against the wrong one. (Haiku's second reply says "fully booked for these dates" right after a one-night stay. The rooms it names are booked on both readings, so the page agrees either way.)
- Two stays in one sentence: what is said of the rooms isn't checked, and the page says so.
- A type word names a room (`Double`, `Twin`, `เตียงคู่`, `ครอบครัว`), except after "your" or "my" and in "double-check". So "for you and the family" would still be read as the Family room (untested).
- Money is a number with ฿, บาท, baht or THB. A number after a date is a year unless it carries one of those.
- "Asked" is read from the reply's words: a question mark, which, confirm, let us know, ไหน, ไหม, ยืนยัน. A reply could ask about something else and still count.
- Number words for nights: one to ten, หนึ่ง to สิบ, คืนเดียว. Not for dates.
- The quotes on its cards are the reply as it reads it, not as written: Thai digits made Arabic, 2,000 as 2000, พ.ย. as พย. (Quill noticed.)
- The guesthouse, its rooms, rates and guests are invented.

## Run

- `demo.html`: the page. It opens on the wrong reply.
- `node test.mjs`: 59 checks. It runs the page's own script in node, all 8 real replies, and the page's buttons on a stand-in.
- `node show.mjs`: what the page says for the three samples and the 8 real replies, printed.

Made by March, 20 Oct 2026.
