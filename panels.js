// panels.js: everything on the page around the TV that is filled from the show's
// own data: the lower third, the ticker, the network panel, on now and up next,
// the schedule (from shows.json, the lineup the station reads too), coming up,
// the shows, the cast's faces, the replays list, the full screen button and the
// Ask the desk forms. The layout copies PNN's page section by section (J's call,
// 8 Oct 2026); the code is our own. It only reads what player.js already worked
// out (viewAt's answer and the loaded hours), so it can never disagree with the
// picture.
import { layout, HOUR } from './timing.js';
import { drawStage, W, H } from './people.js';

const $ = (id) => document.getElementById(id);
const WHO = { march: ['March', 'Host'], narrator: ['The Narrator', 'Storyteller'] };
// The small server door for questions, letters and the viewer count (door/ in
// this repo, its own worker). Empty means not connected.
export const DOOR = 'https://chronicle-door.jaceebo.workers.dev';

// Chiang Mai is a fixed +07:00, so its wall clock is UTC shifted by seven hours.
const cm = (ms) => new Date(ms + 7 * HOUR);
const clock = (ms) => {
  const d = cm(ms), h = d.getUTCHours(), m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
};
const hourName = (h) => {
  const hh = Math.floor(h) % 24, m = Math.round((h % 1) * 60);
  return `${hh % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${hh < 12 ? 'AM' : 'PM'}`;
};
const hours = (s) => `${hourName(s.start)}–${hourName(s.end)}`;
const span = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m < 1 ? 'under a minute' : `${m}m`; };
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

// --- the lineup ---
let SHOWS = [];
// The first show whose hours hold the moment wins; short shows are listed first
// (the station's show_at reads the same file the same way).
export function showAt(ms) {
  const d = cm(ms), h = d.getUTCHours() + d.getUTCMinutes() / 60;
  return SHOWS.find((s) => s.start <= h && h < s.end) || null;
}
// The next few show changes after ms, found by stepping a minute at a time
// through the next day (1,440 cheap checks, done twice a second at most).
function showChanges(ms, n) {
  const out = [];
  let cur = showAt(ms);
  const t0 = Math.ceil(ms / 60000) * 60000;
  for (let t = t0; t < t0 + 24 * HOUR && out.length < n; t += 60000) {
    const s = showAt(t);
    if (s && s !== cur) { out.push({ show: s, at: t }); cur = s; }
  }
  return out;
}

// --- the faces ---
// Cut from the stage itself, drawn once at rest, so a change to a character in
// people.js shows up here with no second drawing to keep in step. The boxes are
// the head and shoulders around each head's top-left (25,22) and (89,20).
// Drawn at t = 1000 because t = 0 falls inside March's blink (grader, 8 Oct 2026).
const CROP = { march: [19, 18], narrator: [83, 16] };
export function drawFaces(root = document) {
  const stage = document.createElement('canvas');
  stage.width = W; stage.height = H;
  const rest = { mood: 'neutral', action: 'none', mouth: 'closed' };
  drawStage(stage.getContext('2d'), 1000, { talker: null, march: rest, narrator: rest });
  for (const c of root.querySelectorAll('canvas[data-portrait]')) {
    const [x, y] = CROP[c.dataset.portrait];
    c.getContext('2d').drawImage(stage, x, y, 26, 26, 0, 0, 26, 26);
  }
  const brand = root.querySelector('#brandArt');
  if (brand) { brand.width = W; brand.height = H; brand.getContext('2d').drawImage(stage, 0, 0); }
}

export async function loadShows() {
  try { SHOWS = (await (await fetch('shows.json', { cache: 'no-cache' })).json()).shows; } catch { SHOWS = []; }
  return SHOWS;
}

const CREW = '<ul class="crew"><li><canvas data-portrait="march" width="26" height="26"></canvas><strong>March</strong>Host</li>'
  + '<li><canvas data-portrait="narrator" width="26" height="26"></canvas><strong>The Narrator</strong>Storyteller</li></ul>';

function drawGuide() {
  $('guideTimes').innerHTML = [0, 3, 6, 9, 12, 15, 18, 21].map((h) =>
    `<span style="left:${(h / 24) * 100}%">${h % 12 || 12}${h < 12 ? 'a' : 'p'}</span>`).join('');
  const long = SHOWS.filter((s) => !s.kind), short = SHOWS.filter((s) => s.kind);
  $('guideShows').insertAdjacentHTML('afterbegin', long.map((s) =>
    `<a class="g-show" data-id="${s.id}" href="show.html?id=${s.id}" style="left:${(s.start / 24) * 100}%;width:${((s.end - s.start) / 24) * 100}%">`
    + `<span class="tag">On now</span><strong>${esc(s.name)}</strong><em>${hours(s)}</em><p>${esc(s.blurb)}</p></a>`).join(''));
  $('guideShorts').innerHTML = short.map((s) =>
    `<a class="g-short" data-id="${s.id}" href="show.html?id=${s.id}" style="left:${(s.start / 24) * 100}%">${esc(s.name)}<small>${hourName(s.start)}</small></a>`).join('');
  $('castShows').innerHTML = SHOWS.slice().sort((a, b) => a.start - b.start).map((s) =>
    `<li class="team" data-id="${s.id}"><span class="badge">ON NOW</span><div><h3><a href="show.html?id=${s.id}">${esc(s.name)}</a></h3>`
    + `<p class="role">${hours(s)}</p><p class="post">${esc(s.blurb)}</p></div>${CREW}</li>`).join('');
}

// --- replays: every scene of the last seven days, from day/replays.json ---
async function drawReplays() {
  let list = [];
  try { list = await (await fetch('day/replays.json', { cache: 'no-cache' })).json(); } catch { /* none yet */ }
  if (!list.length) { $('replayList').innerHTML = '<li><a>No replays yet.</a></li>'; return; }
  const byDay = {};
  for (const r of list) (byDay[cm(Date.parse(r.startAt)).toISOString().slice(0, 10)] ||= []).push(r);
  const days = Object.keys(byDay).sort().reverse();
  const name = (s) => SHOWS.find((x) => x.id === s)?.name || 'Chronicle';
  const show = (day) => {
    for (const b of $('replayDays').children) b.classList.toggle('on', b.dataset.day === day);
    $('replayList').innerHTML = byDay[day].map((r) =>
      `<li><a href="?replay=${encodeURIComponent(r.id)}"><span class="when">${clock(Date.parse(r.startAt))}</span>`
      + `<span>${esc(r.title)}</span><span class="show">${esc(name(r.show))}</span></a></li>`).join('');
  };
  $('replayDays').innerHTML = days.map((d) =>
    `<button data-day="${d}">${new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })} · ${byDay[d].length}</button>`).join('');
  $('replayDays').addEventListener('click', (e) => { if (e.target.dataset.day) show(e.target.dataset.day); });
  show(days[0]);
}

// --- Ask the desk: a question, or a letter to one of them ---
function setupAsk() {
  const status = (t) => { $('askStatus').textContent = t; };
  for (const b of document.querySelectorAll('.ask-modes .chain')) {
    b.addEventListener('click', () => {
      for (const x of document.querySelectorAll('.ask-modes .chain')) x.classList.toggle('on', x === b);
      $('askForm').hidden = b.dataset.mode !== 'question';
      $('letterForm').hidden = b.dataset.mode !== 'letter';
      status('');
    });
  }
  $('letterText').addEventListener('input', () => {
    $('letterCount').textContent = `${$('letterText').value.length} / 400. Your letter and name may be read on air.`;
  });
  const send = async (kind, body, form) => {
    if (!DOOR) { status('Not connected yet.'); return; }
    status('Sending…');
    try {
      const r = await fetch(`${DOOR}/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { form.reset(); status('Sent. It is waiting at the desk; airing questions and letters is not switched on yet.'); }
      else status(j.error || 'That did not go through. Try again in a minute.');
    } catch { status('That did not go through. Try again in a minute.'); }
  };
  $('askForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('askTopic').value.trim();
    if (text) send('ask', { text }, $('askForm'));
  });
  $('letterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('letterText').value.trim();
    if (text) send('letter', { text, name: $('letterName').value.trim(), to: $('letterTo').value }, $('letterForm'));
  });
}

// --- the viewer count: a ping a minute with a random id kept for this tab ---
function setupViewers() {
  if (!DOOR) return;
  const id = Math.random().toString(36).slice(2, 12);
  const ping = async () => {
    try {
      const j = await (await fetch(`${DOOR}/watch?v=${id}`)).json();
      if (Number.isFinite(j.watching)) {
        $('viewers').textContent = `${j.watching} watching`;
        $('viewers').className = 'viewers';
      }
    } catch { /* the count is a nicety; the show plays without it */ }
  };
  ping();
  setInterval(ping, 60 * 1000);
}

export async function setupPanels() {
  drawFaces();
  const screen = $('screen');
  $('fullBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else (screen.requestFullscreen || screen.webkitRequestFullscreen)?.call(screen);
  });
  setupAsk();
  setupViewers();
  await loadShows();
  drawGuide();
  drawFaces();
  drawReplays();
}

// What comes after the scene on air, with the time each would start. Live, only
// scenes already written are known (the station writes about 25 minutes ahead),
// each at its real start; on replay the loaded hours loop, so the list wraps round.
export function upcoming(d, at, t, n = 4) {
  const segs = d.segments || [];
  const i = segs.findIndex((s) => s.id === at.segment.id);
  let start = t - at.msIntoSegment + layout(at.segment).totalMs;
  const out = [];
  for (let k = 1; k <= n && segs.length > 1; k++) {
    const j = i + k;
    if (j >= segs.length && !at.replay) break;
    const s = segs[j % segs.length];
    if (!at.replay && s.startAt) start = Date.parse(s.startAt);
    out.push({ seg: s, title: s.title, startMs: start });
    start += layout(s).totalMs;
  }
  return out;
}

// The panels change slowly, so they are redrawn twice a second, not fifty times;
// the lower third follows the talker on every tick.
let lastSlow = 0, lastTicker = '';
export function updatePanels(v, d, t) {
  const { at } = v;
  const speaking = at.phase !== 'lead' ? WHO[at.line.speaker] : null;
  $('lowerThird').dataset.on = speaking ? '1' : '0';
  if (speaking) { $('ltName').textContent = speaking[0]; $('ltRole').textContent = speaking[1]; }
  $('capName').textContent = WHO[at.line.speaker]?.[0] || '';
  $('lamp').dataset.live = at.replay ? '0' : '1';

  if (t - lastSlow < 500) return;
  lastSlow = t;
  // The show on air: the one the scene was written for, else the clock's.
  const now = SHOWS.find((s) => s.id === at.segment.show) || showAt(t);
  const showName = now ? now.name : 'Chronicle';
  $('ltTab').textContent = showName;
  const next = upcoming(d, at, t);
  const n0 = next[0];
  $('netNow').textContent = $('nowTitle').textContent = at.segment.title;
  $('netShow').textContent = `${showName}, with March and the narrator`;
  $('netLive').textContent = at.replay ? 'REPLAY' : 'LIVE';
  $('netNext').textContent = $('nextTitle').textContent = n0 ? n0.title : 'Being written now';
  $('netNextWhen').textContent = $('nextWhen').textContent = n0 ? `in ${span(n0.startMs - t)}` : '';
  $('nowStarted').textContent = `${span(at.msIntoSegment)} ago`;
  $('nowEnds').textContent = span(layout(at.segment).totalMs - at.msIntoSegment);

  const clockShow = showAt(t);
  $('nowShow').textContent = clockShow ? clockShow.name : 'Chronicle';
  $('nowHours').textContent = clockShow ? hours(clockShow) : '';
  $('nowTag').textContent = clockShow ? clockShow.blurb : '';
  const changes = showChanges(t, 4);
  $('comingUp').innerHTML = changes.map((c) =>
    `<li><span class="when">${clock(c.at)}</span><div><strong><a href="show.html?id=${c.show.id}">${esc(c.show.name)}</a></strong><small>${esc(c.show.blurb)}</small></div></li>`).join('');
  for (const el of document.querySelectorAll('.g-show, .g-short, .team')) el.classList.toggle('now', el.dataset.id === clockShow?.id);

  const c = cm(t);
  $('guideClock').textContent = clock(t);
  $('guideDate').textContent = c.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).toUpperCase();
  $('guideNeedle').style.left = `${((c.getUTCHours() * 60 + c.getUTCMinutes()) / 1440) * 100}%`;

  // The ticker: set only when its words change, so the scroll never restarts mid-run.
  const notes = (at.segment.notes || []).join(' and ');
  const bits = [`NOW ON ${showName.toUpperCase()}: ${at.segment.title}`];
  if (n0) bits.push(`UP NEXT: ${n0.title}`);
  if (notes) bits.push(`FROM HIS NOTES: ${notes}`);
  if (changes[0]) bits.push(`COMING UP AT ${clock(changes[0].at)}: ${changes[0].show.name}`);
  bits.push('EVERY LINE POINTS AT A PASSAGE OF HIS NOTES, LISTED UNDER SOURCES');
  const text = bits.join('   •   ');
  if (text !== lastTicker) { lastTicker = text; $('tickerText').textContent = text; }
}
