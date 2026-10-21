"""check_art.py ART.png [SLOT_ID] [--slots state/slots.json] [--pal art/pal_base.json]: the picture check for one new
thing in March's room (room/STYLE.md, "How to add one thing"). It FAILS (exit 1) when:
  - a pixel is half see-through (alpha must be 0 or 255: the engine draws whole pixels only);
  - an opaque pixel is not one of the approved colours (art/pal_base.json, exactly; no near misses);
  - an opaque pixel is green-cast (green above both red and blue by more than 6: J's no-green rule);
  - with a slot: the picture is bigger than the slot's box (the engine would leave it out).
It prints one line per problem and 'ok' when there is none. Run it from the room folder (chronicle/room)."""
import sys, json
from PIL import Image
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = {sys.argv[i][2:]: sys.argv[i + 1] for i in range(1, len(sys.argv) - 1) if sys.argv[i].startswith('--')}
args = [a for a in args if a not in opt.values()]
art, slot = args[0], (args[1] if len(args) > 1 else None)
pal = {tuple(c) for c in json.load(open(opt.get('pal', 'art/pal_base.json')))}
im = Image.open(art).convert('RGBA'); w, h = im.size; px = im.load(); bad = []
half = off = green = 0
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if 0 < a < 255: half += 1; continue
        if a == 0: continue
        if (r, g, b) not in pal: off += 1
        if g > r + 6 and g > b + 6: green += 1
if half: bad.append(f'{half} half see-through pixels (alpha must be 0 or 255)')
if off: bad.append(f'{off} pixels outside the palette (snap it: every colour must be in art/pal_base.json)')
if green: bad.append(f'{green} green-cast pixels (no green, ever)')
if slot:
    s = next((s for s in json.load(open(opt.get('slots', 'state/slots.json'))) if s['id'] == slot), None)
    if not s: bad.append(f'there is no slot {slot}')
    else:
        x0, y0, x1, y1 = s['box']
        if w > x1 - x0 + 1 or h > y1 - y0 + 1: bad.append(f'{w}x{h} is bigger than slot {slot} ({x1 - x0 + 1}x{y1 - y0 + 1})')
print('\n'.join(bad) if bad else f'ok: {art} {w}x{h}' + (f' fits {slot}' if slot else ''))
sys.exit(1 if bad else 0)
