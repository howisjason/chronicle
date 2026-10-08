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
// What the screen shows at show-clock time t, worked out from the data alone
// (no counters, no history), so the live tick and the Clip button's re-render
// of the past draw the very same picture for the same moment.
// The mouth flaps every 200 ms while a letter is typing (the old per-tick
// counter's rate, now read off the clock).
function viewAt(d, t) {
  const at = locate(d, t);
  if (!at) return null;
  const { segment, line, phase, typed, mouthOpen } = at;
  const marchLine = line.speaker === 'march';
  const talker = phase === 'speak' ? line.speaker : null;
  const m = mouthOpen ? (Math.floor(t / 200) % 2 ? 'open' : 'half') : 'closed';
  const mood = marchLine ? line.emotion : 'neutral';
  const action = marchLine && phase !== 'hold' ? line.action : 'none';
  return {
    at, title: segment.title, speaker: line.speaker, shown: line.text.slice(0, typed), mood, action,
    // people.js does bit shifts on its clock, so it gets ms into the day, not epoch ms
    stageT: t % 86400000,
    stage: {
      talker,
      march: { mood, action, mouth: talker === 'march' ? m : 'closed' },
      narrator: { mood: 'neutral', action: 'none', mouth: talker === 'narrator' ? m : 'closed' },
    },
  };
}
const stageCtx = $('march').getContext('2d');
function paintStage(v) {
  const fig = $('march');
  fig.dataset.mood = v.mood;
  fig.dataset.action = v.action;
  drawStage(stageCtx, v.stageT, v.stage);
}

// --- the stand-in voice ---
// Every live sound goes through one mix node to the speakers. The Clip button
// never touches it: it rebuilds the past's sound in its own graph (clip.js).
let audioCtx = null, mix = null;
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
// Anonymous CORS (raw.githubusercontent.com allows it) so the voice may run
// through WebAudio; without it the browser would mute it there.
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
  voice.play().catch(() => {});
  $('sound').hidden = true;
}
$('sound').addEventListener('click', startSound);

// The blip rule, shared by the live tick and the clip's sound plan: a blip each
// time the typed count moves onto a letter while a line is being spoken.
const blipDue = (at, lastTyped) => at.typed !== lastTyped && at.phase === 'speak'
  && at.line.text[at.typed - 1] && at.line.text[at.typed - 1] !== ' ';

let day = null, loadedAt = 0, lastTyped = -1, lastLineKey = '';
function tick() {
  if (!day) return;
  const t = now();
  const v = viewAt(day, t);
  if (!v) { $('caption').textContent = 'No chapters yet.'; return; }
  const { at } = v;
  const { segment, line, lineIndex, typed, replay } = at;
  const key = `${segment.id}:${lineIndex}`;
  if (key !== lastLineKey) { lastLineKey = key; lastTyped = -1; }
  syncVoice(segment, at.msIntoSegment);
  if (typed !== lastTyped) {
    if (!hasVoice(segment) && blipDue(at, lastTyped)) blip(line.speaker);
    lastTyped = typed;
  }
  $('title').textContent = segment.title;
  $('badge').textContent = replay ? 'REPLAY' : 'LIVE';
  $('badge').dataset.live = replay ? '0' : '1';
  const marchLine = line.speaker === 'march';
  $('march-caption').textContent = marchLine ? v.shown : '';
  $('caption').textContent = marchLine ? '' : v.shown;
  $('caption').dataset.on = marchLine ? '0' : '1';
  paintStage(v);
  const srcs = segment.sources || [];
  // Public sources show as they are; a day-note claim is marked as coming
  // from his own notes of the day, which are not public (the plan, step 6).
  $('sources').innerHTML = srcs.map((s, i) => {
    const label = s.kind === 'commit' ? `commit · ${s.repo || ''}` : s.kind === 'day-note' ? 'from his notes of the day' : s.kind === 'note' ? 'from his notes' : s.kind;
    return `<li${i === line.source ? ' class="now"' : ''}><span>${escapeHtml(label)}</span> ${escapeHtml(s.text)}</li>`;
  }).join('');
}

// The Clip button clips what JUST aired, like Twitch: the thirty seconds before
// the press. The show is data, so the past is re-rendered exactly as it aired
// rather than kept in a rolling recording. planClip hands clip.js the window,
// a picture function for any moment in it, and the sound to rebuild: runs of
// one scene (an MP3 slice where the scene was voiced) and blips for the rest.
const CLIP_MS = 30 * 1000;
function planClip() {
  const d = day, endMs = now(); // a snapshot: the minute poll may swap `day` mid-clip
  if (!d) return null;
  // Never before this viewer loaded the page (a clip is of what they watched)...
  let startMs = Math.max(endMs - CLIP_MS, loadedAt);
  // ...nor, when the press is live, before the station went live: the replay
  // loop that filled the gap before is not what aired.
  const atEnd = locate(d, endMs - 1);
  if (!atEnd) return null;
  const atStart = locate(d, startMs);
  if (!atEnd.replay && atStart && atStart.replay) {
    const firstLive = (d.segments || []).map((s) => Date.parse(s.startAt)).filter((s) => s >= startMs && s < endMs);
    if (firstLive.length) startMs = Math.min(...firstLive);
  }
  // Walk the window at the live tick's 50 ms step, cutting it into runs of one
  // scene played straight through, and noting where the blips would have gone.
  const runs = [];
  let run = null, key = '', typed = -1;
  for (let t = startMs; t < endMs; t += 50) {
    const at = locate(d, t);
    if (!at) continue;
    const into = at.msIntoSegment;
    if (!run || run.id !== at.segment.id || Math.abs(into - (run.intoMs + (t - startMs - run.atMs))) > 200) {
      run = { id: at.segment.id, audio: at.segment.audio || '', atMs: t - startMs, intoMs: into, durMs: 0, blips: [] };
      runs.push(run);
    }
    run.durMs = t + 50 - startMs - run.atMs;
    const k = `${at.segment.id}:${at.lineIndex}`;
    if (k !== key) { key = k; typed = -1; }
    if (blipDue(at, typed)) run.blips.push({ atMs: t - startMs, speaker: at.line.speaker });
    typed = at.typed;
  }
  return { startMs, endMs, runs, audioBase: AUDIO_BASE, viewAt: (t) => viewAt(d, t) };
}
setupClip({ button: $('clip'), out: $('clip-out'), plan: planClip });

function escapeHtml(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]); }

// The station appends scenes through the hour, so the page asks again every
// minute and swaps in the new pair quietly; a segment already playing keeps
// playing because the clock, not the file, decides what is on. When both hours
// are missing (the station is off) the replay already loaded stays.
loadDay().then((d) => {
  day = d;
  loadedAt = now();
  if (d && d.sample) $('note').textContent = 'Sample chapter, hand-written, to prove the player. Stand-in voice.';
  setInterval(tick, 50);
  tick();
  setInterval(() => loadNow().then((nd) => { if (nd && JSON.stringify(nd) !== JSON.stringify(day)) day = nd; }).catch(() => {}), 60 * 1000);
});
