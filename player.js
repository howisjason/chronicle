// player.js: draws the page from timing.js's answer, fifty times a second.
// It knows nothing about time itself: it asks locate() where the day is and
// paints that. The stand-in voice is a blip per typed letter (WebAudio needs
// one tap before it may make a sound, hence the button). When a segment has an
// MP3 (segment.audio), that plays instead, started at the segment's offset on
// the clock; the gaps are baked into the file.
import { locate, hourFile, HOUR } from './timing.js';
import { drawStage } from './people.js';
import { setupClip } from './clip.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
// ?at=<ISO time> moves the clock for testing; the offset is fixed at load so
// time still flows.
const atParam = params.get('at');
// A '+' in a query string arrives as a space, so '+07:00' is restored here.
const offsetMs = atParam ? Date.parse(atParam.replace(' ', '+')) - Date.now() : 0;
const now = () => Date.now() + offsetMs;

// The transcripts are one file per hour, day/<date>/<HH>.json in Chiang Mai time
// (Asia/Bangkok has no daylight saving: fixed +07:00), filed by the hour a scene
// was WRITTEN. The station writes at most about 25 minutes ahead, so whatever
// airs now sits in this hour's file or the one before (8 Oct 2026). One file a
// day re-fetched every minute would have cost each viewer gigabytes a day at 24/7.
// 'no-cache' asks the server each time but sends the file's ETag, so an unchanged
// hour comes back as a bodiless 304; a missing hour is a small 404 (404.html).
async function fetchHour(ms) {
  const r = await fetch(hourFile(ms), { cache: 'no-cache' });
  return r.ok ? (await r.json()).segments || [] : null;
}
// Two hour files as one day for timing.js: the earlier hour first, so the replay
// loop runs in airing order.
const join = (earlier, later) => ({ segments: [...(earlier || []), ...(later || [])] });
// The minute poll: this hour and the one before. The one before is asked too
// because a scene written at 10:59 can be committed and served a few minutes
// after 11:00; once settled it costs one 304 a minute.
async function loadNow() {
  const [earlier, later] = await Promise.all([fetchHour(now() - HOUR), fetchHour(now())]);
  return earlier || later ? join(earlier, later) : null;
}
// At load with nothing in the last two hours (the station is off): walk back
// hour by hour, up to two days, and replay the newest hour that exists with the
// one before it. Done once, never in the minute poll.
async function loadDay() {
  const live = await loadNow();
  if (live) return live;
  for (let k = 2; k < 48; k++) {
    const later = await fetchHour(now() - k * HOUR);
    if (later) return join(await fetchHour(now() - (k + 1) * HOUR), later);
  }
  const r = await fetch('day/sample.json', { cache: 'no-cache' });
  return r.ok ? r.json() : null;
}

// --- March and the narrator, pixel people (people.js draws them) ---
let mouthFrame = 0;
const stageCtx = $('march').getContext('2d');
function paintStage(state) {
  const fig = $('march');
  fig.dataset.mood = state.mood;
  fig.dataset.action = state.action;
  let m = 'closed';
  if (state.mouthOpen) { mouthFrame++; m = (mouthFrame >> 2) % 2 ? 'open' : 'half'; }
  const march = { mood: state.mood, action: state.action, mouth: state.talker === 'march' ? m : 'closed' };
  const narrator = { mood: 'neutral', action: 'none', mouth: state.talker === 'narrator' ? m : 'closed' };
  drawStage(stageCtx, performance.now(), { talker: state.talker, march, narrator });
}

// --- the stand-in voice ---
// Every sound goes through one mix node, which feeds the speakers and a
// MediaStream the Clip button records from (clip.js).
let audioCtx = null, mix = null, clipAudio = null;
function blip(speaker) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = speaker === 'march' ? 660 : 330;
  g.gain.value = 0.03;
  o.connect(g).connect(mix);
  o.start();
  o.stop(audioCtx.currentTime + 0.04);
}
// The sound lives on the `audio` branch, which holds only the last hour and no
// history (J: keep the transcripts, not the sound); older scenes play as blips.
const AUDIO_BASE = 'https://raw.githubusercontent.com/howisjason/chronicle/audio/';
const voice = new Audio();
// Anonymous CORS (raw.githubusercontent.com allows it) so the voice can run
// through WebAudio into the clip; without it the browser would record silence.
voice.crossOrigin = 'anonymous';
let voiceSrc = '';
// A segment whose MP3 is gone (pruned after seven days, or never voiced)
// falls back to the blips instead of typing in silence.
const voiceBroken = new Set();
voice.addEventListener('error', () => voiceBroken.add(voiceSrc));
const hasVoice = (segment) => !!segment.audio && !voiceBroken.has(segment.audio);
// Keep the MP3 on the clock: right file, right position, playing.
function syncVoice(segment, msIntoSegment) {
  if (!audioCtx || !hasVoice(segment)) { if (!voice.paused) voice.pause(); return; }
  if (voiceSrc !== segment.audio) { voiceSrc = segment.audio; voice.src = AUDIO_BASE + segment.audio; }
  const want = msIntoSegment / 1000;
  if (voice.readyState > 0 && Math.abs(voice.currentTime - want) > 0.4) voice.currentTime = want;
  if (voice.paused) voice.play().catch(() => {});
}
function startSound() {
  // Some browsers create the context suspended; a tap must wake it (grader, 8 Oct 2026).
  if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  mix = audioCtx.createGain();
  mix.connect(audioCtx.destination);
  audioCtx.createMediaElementSource(voice).connect(mix);
  if (audioCtx.createMediaStreamDestination) {
    clipAudio = audioCtx.createMediaStreamDestination();
    mix.connect(clipAudio);
  }
  voice.play().catch(() => {});
  $('sound').hidden = true;
}
$('sound').addEventListener('click', startSound);

let day = null, lastTyped = -1, lastLineKey = '';
function tick() {
  if (!day) return;
  const at = locate(day, now());
  if (!at) { $('caption').textContent = 'No chapters yet.'; return; }
  const { segment, line, lineIndex, phase, typed, mouthOpen, replay } = at;
  const key = `${segment.id}:${lineIndex}`;
  if (key !== lastLineKey) { lastLineKey = key; lastTyped = -1; }
  const shown = line.text.slice(0, typed);
  syncVoice(segment, at.msIntoSegment);
  if (typed !== lastTyped) {
    if (!hasVoice(segment) && phase === 'speak' && line.text[typed - 1] && line.text[typed - 1] !== ' ') blip(line.speaker);
    lastTyped = typed;
  }
  $('title').textContent = segment.title;
  $('badge').textContent = replay ? 'REPLAY' : 'LIVE';
  $('badge').dataset.live = replay ? '0' : '1';
  const marchLine = line.speaker === 'march';
  clipState = { title: segment.title, speaker: line.speaker, shown };
  $('march-caption').textContent = marchLine ? shown : '';
  $('caption').textContent = marchLine ? '' : shown;
  $('caption').dataset.on = marchLine ? '0' : '1';
  paintStage({
    mood: marchLine ? line.emotion : 'neutral',
    action: marchLine && phase !== 'hold' ? line.action : 'none',
    talker: phase === 'speak' ? line.speaker : null,
    mouthOpen,
  });
  const srcs = segment.sources || [];
  // Public sources show as they are; a day-note claim is marked as coming
  // from his own notes of the day, which are not public (the plan, step 6).
  $('sources').innerHTML = srcs.map((s, i) => {
    const label = s.kind === 'commit' ? `commit · ${s.repo || ''}` : s.kind === 'day-note' ? 'from his notes of the day' : s.kind === 'note' ? 'from his notes' : s.kind;
    return `<li${i === line.source ? ' class="now"' : ''}><span>${escapeHtml(label)}</span> ${escapeHtml(s.text)}</li>`;
  }).join('');
}
let clipState = { title: '', speaker: '', shown: '' };
// The Clip button records the next thirty seconds; pressing it also turns the
// sound on, since the press is the tap WebAudio waits for.
setupClip({
  button: $('clip'), out: $('clip-out'), stage: $('march'),
  getState: () => clipState,
  getAudio: () => { startSound(); return clipAudio && clipAudio.stream; },
});

function escapeHtml(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]); }

// The station appends scenes through the hour, so the page asks again every
// minute and swaps in the new pair quietly; a segment already playing keeps
// playing because the clock, not the file, decides what is on. When both hours
// are missing (the station is off) the replay already loaded stays.
loadDay().then((d) => {
  day = d;
  if (d && d.sample) $('note').textContent = 'Sample chapter, hand-written, to prove the player. Stand-in voice.';
  setInterval(tick, 50);
  tick();
  setInterval(() => loadNow().then((nd) => { if (nd && JSON.stringify(nd) !== JSON.stringify(day)) day = nd; }).catch(() => {}), 60 * 1000);
});
