// panels.js: everything on the page around the TV that is filled from the show's
// own data: the lower third, the network panel, on now and up next, coming up,
// the schedule's clock and needle, the cast's faces and the full screen button.
// The layout copies PNN's page section by section (J's call, 8 Oct 2026); the
// code is our own. It only reads what player.js already worked out (viewAt's
// answer and the loaded hours), so it can never disagree with the picture.
import { layout, HOUR } from './timing.js';
import { drawStage, W, H } from './people.js';

const $ = (id) => document.getElementById(id);
const WHO = { march: ['March', 'Host'], narrator: ['The Narrator', 'Storyteller'] };

// Chiang Mai is a fixed +07:00, so its wall clock is UTC shifted by seven hours.
const cm = (ms) => new Date(ms + 7 * HOUR);
const clock = (ms) => {
  const d = cm(ms), h = d.getUTCHours(), m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
};
const span = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m < 1 ? 'under a minute' : `${m}m`; };

// The faces are cut from the stage itself, drawn once at rest, so a change to a
// character in people.js shows up here with no second drawing to keep in step.
// The boxes are the head and shoulders around each head's top-left (25,22) and (89,20).
const CROP = { march: [19, 18], narrator: [83, 16] };
function drawFaces() {
  const stage = document.createElement('canvas');
  stage.width = W; stage.height = H;
  const rest = { mood: 'neutral', action: 'none', mouth: 'closed' };
  drawStage(stage.getContext('2d'), 0, { talker: null, march: rest, narrator: rest });
  for (const c of document.querySelectorAll('canvas[data-portrait]')) {
    const [x, y] = CROP[c.dataset.portrait];
    c.getContext('2d').drawImage(stage, x, y, 26, 26, 0, 0, 26, 26);
  }
  const brand = $('brandArt');
  brand.width = W; brand.height = H;
  brand.getContext('2d').drawImage(stage, 0, 0);
}

export function setupPanels() {
  drawFaces();
  const screen = $('screen');
  $('fullBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else (screen.requestFullscreen || screen.webkitRequestFullscreen)?.call(screen);
  });
}

// What comes after the scene on air, with the time each would start. Live, only
// scenes already written are known (the station writes about 25 minutes ahead);
// on replay the loaded hours loop, so the list wraps round.
function upcoming(d, at, t) {
  const segs = d.segments || [];
  const i = segs.findIndex((s) => s.id === at.segment.id);
  let start = t - at.msIntoSegment + layout(at.segment).totalMs;
  const out = [];
  for (let k = 1; k <= 4 && segs.length > 1; k++) {
    const j = i + k;
    if (j >= segs.length && !at.replay) break;
    const s = segs[j % segs.length];
    out.push({ title: s.title, startMs: start });
    start += layout(s).totalMs;
  }
  return out;
}

// The panels change slowly, so they are redrawn twice a second, not fifty times;
// the lower third follows the talker on every tick.
let lastSlow = 0;
export function updatePanels(v, d, t) {
  const { at } = v;
  const speaking = at.phase !== 'lead' ? WHO[at.line.speaker] : null;
  $('lowerThird').dataset.on = speaking ? '1' : '0';
  if (speaking) { $('ltName').textContent = speaking[0]; $('ltRole').textContent = speaking[1]; }
  $('capName').textContent = WHO[at.line.speaker]?.[0] || '';
  $('lamp').dataset.live = at.replay ? '0' : '1';

  if (t - lastSlow < 500) return;
  lastSlow = t;
  const next = upcoming(d, at, t);
  const n0 = next[0];
  $('netNow').textContent = $('nowTitle').textContent = at.segment.title;
  $('netLive').textContent = at.replay ? 'REPLAY' : 'LIVE';
  $('netNext').textContent = $('nextTitle').textContent = n0 ? n0.title : 'Being written now';
  $('netNextWhen').textContent = $('nextWhen').textContent = n0 ? `in ${span(n0.startMs - t)}` : '';
  $('nowStarted').textContent = `${span(at.msIntoSegment)} ago`;
  $('nowEnds').textContent = span(layout(at.segment).totalMs - at.msIntoSegment);
  $('comingUp').innerHTML = next.length
    ? next.map((s) => `<li><span class="when">${clock(s.startMs)}</span><div><strong>${esc(s.title)}</strong><small>Chronicle</small></div></li>`).join('')
    : '<li><span class="when">soon</span><div><strong>The next scene is being written</strong><small>Chronicle</small></div></li>';
  const c = cm(t);
  $('guideClock').textContent = clock(t);
  $('guideDate').textContent = c.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).toUpperCase();
  $('guideNeedle').style.left = `${((c.getUTCHours() * 60 + c.getUTCMinutes()) / 1440) * 100}%`;
}

function esc(s) { return String(s).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]); }
