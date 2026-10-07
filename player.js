// player.js: draws the page from timing.js's answer, fifty times a second.
// It knows nothing about time itself: it asks locate() where the day is and
// paints that. The stand-in voice is a blip per typed letter (WebAudio needs
// one tap before it may make a sound, hence the button). Real MP3s land in
// step 4; until then segment.audio is null.
import { locate } from './timing.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
// ?at=<ISO time> moves the clock for testing; the offset is fixed at load so
// time still flows.
const atParam = params.get('at');
// A '+' in a query string arrives as a space, so '+07:00' is restored here.
const offsetMs = atParam ? Date.parse(atParam.replace(' ', '+')) - Date.now() : 0;
const now = () => Date.now() + offsetMs;

// Today's date in Chiang Mai (Asia/Bangkok has no daylight saving: fixed +07:00).
function bangkokDate(ms) {
  return new Date(ms + 7 * 3600 * 1000).toISOString().slice(0, 10);
}
async function loadDay() {
  const today = bangkokDate(now());
  const yesterday = bangkokDate(now() - 86400 * 1000);
  for (const name of [today, yesterday, 'sample']) {
    const r = await fetch(`day/${name}.json`, { cache: 'no-store' });
    if (r.ok) return r.json();
  }
  return null;
}

// --- March, the placeholder figure (SVG parts switched by class) ---
const MOUTH = { closed: 'M-14,18 Q0,22 14,18', half: 'M-14,16 Q0,30 14,16 Q0,24 -14,16', open: 'M-14,14 Q0,40 14,14 Q0,22 -14,14' };
let mouthFrame = 0;
function paintMarch(state) {
  const fig = $('march');
  fig.dataset.mood = state.mood;
  fig.dataset.action = state.action;
  let m = 'closed';
  if (state.talking) { mouthFrame++; m = (mouthFrame >> 2) % 2 ? 'open' : 'half'; }
  $('mouth').setAttribute('d', MOUTH[m]);
}

// --- the stand-in voice ---
let audioCtx = null;
function blip(speaker) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = speaker === 'march' ? 660 : 330;
  g.gain.value = 0.03;
  o.connect(g).connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.04);
}
$('sound').addEventListener('click', () => {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  $('sound').hidden = true;
});

let day = null, lastTyped = -1, lastLineKey = '';
function tick() {
  if (!day) return;
  const at = locate(day, now());
  if (!at) { $('caption').textContent = 'No chapters yet.'; return; }
  const { segment, line, lineIndex, phase, typed, mouthOpen, replay } = at;
  const key = `${segment.id}:${lineIndex}`;
  if (key !== lastLineKey) { lastLineKey = key; lastTyped = -1; }
  const shown = line.text.slice(0, typed);
  if (typed !== lastTyped) {
    if (phase === 'speak' && line.text[typed - 1] && line.text[typed - 1] !== ' ') blip(line.speaker);
    lastTyped = typed;
  }
  $('title').textContent = segment.title;
  $('badge').textContent = replay ? 'REPLAY' : 'LIVE';
  $('badge').dataset.live = replay ? '0' : '1';
  const marchLine = line.speaker === 'march';
  $('march-caption').textContent = marchLine ? shown : '';
  $('caption').textContent = marchLine ? '' : shown;
  $('caption').dataset.on = marchLine ? '0' : '1';
  paintMarch({
    mood: marchLine ? line.emotion : 'neutral',
    action: marchLine && phase !== 'hold' ? line.action : 'none',
    talking: marchLine && mouthOpen,
  });
  const srcs = segment.sources || [];
  $('sources').innerHTML = srcs.map((s, i) => `<li${i === line.source ? ' class="now"' : ''}><span>${s.kind} · ${s.repo || ''}</span> ${escapeHtml(s.text)}</li>`).join('');
}
function escapeHtml(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]); }

loadDay().then((d) => {
  day = d;
  if (d && d.sample) $('note').textContent = 'Sample chapter, hand-written, to prove the player. Stand-in voice.';
  setInterval(tick, 50);
  tick();
});
