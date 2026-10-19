// records.js: the records page (records.html). Each section is drawn on its own, so one
// broken file says so in its own section and the others still draw.
import { loadAll, render, el } from './cards.js';

const SECTIONS = { log: () => render.log(), quill: () => render.quill({ full: true }), desk: () => render.desk({ history: true }) };
(async () => {
  await loadAll();
  for (const [id, make] of Object.entries(SECTIONS)) {
    const h = document.getElementById(id), sec = h && h.parentElement;
    if (!sec) continue;
    let r;
    try { r = make(); } catch (e) { console.warn(id, e); r = { count: '', node: el('p', { class: 'bad' }, 'this could not be drawn') }; }
    h.querySelector('.meta').textContent = r.count;
    sec.querySelector('.body').replaceChildren(r.node);
  }
  // a link from the room's card lands on its section once the lists are drawn
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
})();
