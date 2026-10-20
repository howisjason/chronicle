# Is that price on the list?

Small shops now let an AI answer customers on LINE or a web chat. The customer asks what an order comes to, and the AI drafts the reply. The shop already holds the check on that reply: its own price list. This page sets the reply against the list.

Open `demo.html` in a browser (no server, nothing fetched). Paste three things:

1. **the price list**, one item a line: a name, a price, a unit. `หมูสับ 180 บาท/กก.`, `ไข่ไก่ 120/แผง`, `Croissant 45 each`, `หมูกก.ละ 180`, `ค่าส่ง 40` (no unit: a flat fee). A slash before the price gives an item a second name: `ค่าส่ง/ส่ง 40`;
2. **the customer's message**, if you have it;
3. **the AI's reply**.

It says, line by line:

- whether each price in the reply is the list's price for that item, converted to the reply's unit (180 a กก. is 18 a ขีด);
- whether each line comes to amount × price. Weights meet across units (กก., กิโล, โล, ขีด = 100 g, กรัม, g, kg, ครึ่งโล); counts meet across each, piece, ชิ้น, อัน, ลูก, ตัว, ฟอง, ใบ and โหล or dozen = 12. Any other unit (แผง, กำ, ถุง, ห่อ, กระสอบ, pack) only meets itself. When two don't meet (ฟอง against a list sold by the แผง), it says it can't tell rather than guessing;
- whether the total is the sum of the reply's own lines, and what the order comes to by the list;
- a price on a line that names nothing on the list (the AI offering what the shop may not have);
- with the customer's message: anything asked for and not answered, an amount changed between the message and the reply, and anything priced that wasn't asked for (a note, since a delivery fee is often fine).

When a line is wrong, it says which story fits, in this order:

1. **a unit slip**: the number priced as if it were in the list's unit (3 ขีด priced as 3 กก. is ten times too much);
2. **the price quoted isn't the list's**, with the sum right for the price it quoted;
3. **another item's price**. It names which, and when a few items share that price it says "one of a few" and names them all;
4. **the arithmetic**, and whether two digits were swapped;
5. otherwise, **a price the list doesn't have**. An old price or a sale that has ended would look like this; so would a plain mistake. It can't tell which, and says so.

It reads Thai digits (๐–๙) and thousands with commas.

**The ask.** Under the boxes is a short instruction, in English and Thai, to put in front of the AI: only prices from the list, one line an item with its amount and = its price, a รวม line, nothing off the list priced, no rounding, no discounts. Replies written that way are the ones this page can check line by line.

## Against a real AI

On 20 Oct 2026 I gave Haiku the market-stall list and one customer message (`เอาหมูสับ 3 ขีด หมูสามชั้นครึ่งโล ไข่ 1 แผง ผักบุ้ง 2 กำ แล้วก็กุ้ง 1 โลค่ะ ส่งด้วยนะคะ`), once with the ask and once without (`readings/`). **Both replies were right**: 54, 110, 120, 40, 40, 364, and neither priced the shrimp, which isn't on the list. The page agrees with both. The second reply wasn't in the ask's shape (`หมูสับ 3 ขีด (300 กรัม) x 180 บาท/กก. = 54 บาท`, `รวมทั้งหมด 364 บาท ยังไม่รวมกุ้ง`), and the page read it anyway. So every wrong reply on this page is one I wrote. Two runs of one small model on one easy order show that the page doesn't cry wolf at a right answer. They show nothing about how often an AI gets an order wrong.

## Why

One Thai vendor's guide to shop chatbots: "The greatest risks for EC chatbots are inconsistencies in inventory and pricing information", and "A chatbot quoting a sale price after the sale has ended is a direct cause of refund disputes." (*How Thai E-Commerce Stores Can Automate Customer Support with AI Chatbots*, unimon.co.th.) And the 2024 British Columbia Civil Resolution Tribunal ruling against Air Canada over what its website chatbot told a passenger, as quoted by MobileSyrup ("Air Canada has to pay for chatbot mistake", 16 Feb 2024): "It makes no difference whether the information comes from a static page or a chatbot." **That case was about a refund policy, not a price, and this page would not have caught it.**

## What it doesn't do

- It checks numbers against the list. It doesn't check promises, stock, delivery times, refunds or policy.
- A number counts as money only when it carries ฿, $, £, บาท, บ., baht or THB, or follows =, @ or ละ (ขีดละ 22). So `10 โมง`, a date or a phone number is left alone. A price written as a bare number (`Croissant 45`) isn't seen.
- Items are matched by their text: a whole name or second name anywhere, or the start of one that stands alone and starts no other item's name (`ไข่ 1 แผง` finds ไข่ไก่; `หมู 3 ขีด` with หมูสับ and หมูสามชั้น on the list is said to be either, and isn't checked). A reply that calls an item by another name (`pork mince` for หมูสับ) gets that line flagged as not on the list. Give the list a second name for it.
- It reads one line at a time and cuts a line where each item's name starts. A price for something off the list, on the same line as a listed item, is taken as that item's price.
- Discounts: a discount that leaves the price at or under the reply's lines and the list is a note for the shop, whether it's an amount ("ส่วนลด 20") or the total brought down ("ลดให้เหลือ 290"). The words "after" and "หลัง" mark an amount left to pay, so a stray "หลัง 5 โมง" on a discount line could be misread (untested). An amount "left to pay" that is more than the reply's own total, or more than the order by the list, is a miss whatever it's called. One sum on a line that names both a total and a discount ("Total after discount: ฿320", "ยอดหลังลด 320") is read as that amount, and a "discount" bigger than the lines is a miss. (Quill found the hole at the finish door, twice, and was right both times. First "รวม 330 บาท ลดให้เหลือ 320 บาท" over 300 of goods came out as "the sums come out". Then, after my fix, "Total after discount: ฿320" still did.)
- Number words (หนึ่ง, สอง, "two", "a") aren't read. A thing the customer asks for with no amount in digits is only checked for having an answer.
- Rounding: a total under its lines is a note when the reply says ลดให้, ปัด or round, and a miss when it says nothing.
- The ask is mine, and one model ran it once.

## Run

- `demo.html`: the page.
- `node test.mjs`: 60 checks. It runs the page's own script in node, both real replies, and the page's buttons on a stand-in.
- `node show.mjs`: the three samples, printed.

Made by March, 20 Oct 2026. The shops and prices are invented.
