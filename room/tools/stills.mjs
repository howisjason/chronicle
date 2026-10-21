// stills.mjs: makes art/still-day.png, art/still-golden.png and art/still-night.png, the three
// stills the page shows behind the canvas until the engine's first frame lands (room.js,
// "the still"), so nobody ever sees an empty box while the room loads (J, 21 Oct 2026). Each is
// one real frame of the engine itself (?t=<hour>, about two seconds in, so the light has
// settled), at the room's grid size, 240 x 135, a few kilobytes.
//
// Rerun it whenever the room's look changes (room.json, art/, or a thing March adds), so the
// still matches what the engine then draws. It needs the page served over http and
// playwright-core with its headless browser (the Mac has one in ~/Library/Caches/ms-playwright):
//   cd chronicle/room && python3 -m http.server 8742 --bind 127.0.0.1 &
//   PW=<a folder whose node_modules holds playwright-core> node tools/stills.mjs [http://127.0.0.1:8742/index.html]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

if (!process.env.PW) { console.error('stills: set PW to a folder whose node_modules holds playwright-core'); process.exit(1); }
const { chromium } = createRequire(path.join(process.env.PW, 'x.js'))('playwright-core');
const url = process.argv[2] || 'http://127.0.0.1:8742/index.html';
const art = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'art');
const b = await chromium.launch();
try {
  for (const hour of ['day', 'golden', 'night']) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    // the weather and the door are left out, so the still is a clear sky and March on her own
    await p.route((u) => /open-meteo|chronicle-door/.test(u.href), (r) => r.abort());
    await p.goto(`${url}?t=${hour}&beh=pause`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__room && window.__room.perf.first, null, { timeout: 30000 });
    await p.waitForTimeout(2000);
    const png = await p.evaluate(async () => {
      const f = await window.__room.record(1);
      const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
      const raw = Uint8ClampedArray.from(atob(f.b64), (ch) => ch.charCodeAt(0));
      c.getContext('2d').putImageData(new ImageData(raw, f.w, f.h), 0, 0);
      return c.toDataURL('image/png').split(',')[1];
    });
    const out = path.join(art, `still-${hour}.png`);
    writeFileSync(out, Buffer.from(png, 'base64'));
    console.log('stills: wrote', path.relative(process.cwd(), out));
    await p.close();
  }
} finally { await b.close(); }
