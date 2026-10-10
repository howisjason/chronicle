// player.js: draws the page from timing.js's answer, fifty times a second.
// It knows nothing about time itself: it asks locate() where the day is and
// paints that. The stand-in voice is a blip per typed letter (WebAudio needs
// one tap before it may make a sound, hence the button). When a segment has an
// MP3 (segment.audio), that plays instead, started at the segment's offset on
// the clock; the gaps are baked into the file.
import { locate, layout, hourFile, HOUR } from './timing.js';
import { drawStage } from './people.js';
import { setupClip } from './clip.js';
import { setupPanels, updatePanels } from './panels.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
// ?at=<ISO time> moves the clock for testing; the offset is fixed at load so
// time still flows.
const atParam = params.get('at');
// A '+' in a query string arrives as a space, so '+07:00' is restored here.
const offsetMs = atParam ? Date.parse(atParam.replace(' ', '+')) - Date.now() : 0;
const now = () => Date.now() + offsetMs;
// ?replay=<scene id> plays that one scene from its start, then loops it (the
// Replays list links here). No minute poll: a replay never changes.
const REPLAY_ID = params.get('replay');

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
async function loadReplay(id) {
  const list = await (await fetch('day/replays.json', { cache: 'no-cache' })).json();
  const entry = list.find((r) => r.id === id);
  if (!entry) return null;
  const seg = ((await (await fetch(entry.file, { cache: 'no-cache' })).json()).segments || []).find((s) => s.id === id);
  // Re-timed to start as the page loads, so it plays from its first line.
  return seg ? { segments: [{ ...seg, startAt: new Date(now()).toISOString() }], replayOf: id } : null;
}
async function loadDay() {
  if (REPLAY_ID) return loadReplay(REPLAY_ID).catch(() => null);
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
  $('power').hidden = true; // the "Turn on the TV" cover over the screen
}
$('sound').addEventListener('click', startSound);

// The jingle before each scene: three square-wave notes, PNN's way.
function jingle() {
  if (!audioCtx) return;
  [523, 659, 784].forEach((f, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), at = audioCtx.currentTime + i * 0.14;
    o.type = 'square'; o.frequency.value = f; g.gain.value = 0.04;
    o.connect(g).connect(mix); o.start(at); o.stop(at + 0.12);
  });
}

// The bumper slot: the short gap the voice step leaves before each scene (four
// seconds), or any wait of up to two minutes for the next written scene. Without
// it the page filled every gap by replaying an old scene. A longer wait still
// replays: the station has fallen behind or is off.
const BUMPER_MAX = 2 * 60 * 1000;
function gapAt(d, t) {
  const segs = (d.segments || []).map((s) => ({ s, start: Date.parse(s.startAt) })).sort((a, b) => a.start - b.start);
  const next = segs.find((x) => x.start > t);
  if (!next || next.start - t > BUMPER_MAX) return null;
  const prev = segs.filter((x) => x.start <= t).pop();
  if (prev && t < prev.start + layout(prev.s).totalMs) return null; // a scene is still on
  return { next: next.s, ms: next.start - t };
}
const DISCLAIMER = 'Every word is written by AI and every voice is made by AI, from his real notes. Ideas may be stretched; his life is never invented.';
let bumperFor = '';
// quiet: a clip preview shows the card without the jingle and without marking
// the live gap as announced (the grader's catch, 10 Oct 2026).
function showBumper(g, quiet) {
  $('bumper').hidden = false;
  if (bumperFor === g.next.id) return;
  if (!quiet) bumperFor = g.next.id;
  // The first scene of an hour gets the disclaimer card (PNN's top-of-hour card).
  const top = /-\d{2}-01$/.test(g.next.id);
  $('bumperLabel').textContent = top ? 'A WORD FROM CHRONICLE' : 'UP NEXT';
  $('bumperTitle').textContent = top ? 'Real notes. AI hosts.' : g.next.title;
  $('bumperTease').textContent = top ? DISCLAIMER : (g.next.notes || []).length ? `From his notes: ${g.next.notes.join(' and ')}` : '';
  if (!quiet) jingle();
}

// The blip rule, shared by the live tick and the clip's sound plan: a blip each
// time the typed count moves onto a letter while a line is being spoken.
const blipDue = (at, lastTyped) => at.typed !== lastTyped && at.phase === 'speak'
  && at.line.text[at.typed - 1] && at.line.text[at.typed - 1] !== ' ';

function showCaption(v) {
  const marchLine = v.speaker === 'march';
  $('march-caption').textContent = marchLine ? v.shown : '';
  $('caption').textContent = marchLine ? '' : v.shown;
  $('caption').dataset.on = marchLine ? '0' : '1';
}

let day = null, loadedAt = 0, lastTyped = -1, lastLineKey = '';
function tick() {
  if (!day || previewing) return;
  const t = now();
  const g = REPLAY_ID ? null : gapAt(day, t);
  if (g) {
    showBumper(g);
    if (!voice.paused) voice.pause();
    $('lowerThird').dataset.on = '0';
    $('march-caption').textContent = '';
    $('caption').textContent = '';
    $('capName').textContent = '';
    $('badge').textContent = 'LIVE';
    return;
  }
  $('bumper').hidden = true;
  const v = viewAt(day, t);
  $('standby').hidden = !!v;
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
  const watchingReplay = !!day.replayOf;
  $('badge').textContent = watchingReplay || replay ? 'REPLAY' : 'LIVE';
  $('badge').dataset.live = watchingReplay || replay ? '0' : '1';
  // The mode notice, like PNN's: what kind of airing this is.
  const mode = watchingReplay ? 'replay' : replay ? 'off' : 'live';
  if ($('mode').dataset.mode !== mode) {
    $('mode').dataset.mode = mode;
    $('mode').innerHTML = mode === 'replay' ? 'Watching a replay · <a href="./">back to live</a>'
      : mode === 'off' ? 'Off air · replaying the last scenes' : 'Real notes. AI hosts.';
  }
  showCaption(v);
  paintStage(v);
  updatePanels(v, day, t);
  const srcs = segment.sources || [];
  // Public sources show as they are; a day-note claim is marked as coming
  // from his own notes of the day, which are not public (the plan, step 6).
  $('sources').innerHTML = srcs.map((s, i) => {
    const label = s.kind === 'viewer' ? 'from a viewer' : s.kind === 'commit' ? `commit · ${s.repo || ''}` : s.kind === 'day-note' ? 'from his notes of the day' : s.kind === 'note' ? 'from his notes' : s.kind;
    return `<li${i === line.source ? ' class="now"' : ''}><span>${escapeHtml(label)}</span> ${escapeHtml(s.text)}</li>`;
  }).join('');
}

// The Clip button opens a strip of the last fifteen minutes this viewer watched;
// they pick 5 to 60 seconds of it (clip.js). The show is data, so the past is
// re-rendered exactly as it aired rather than kept in a rolling recording.
// clipRange() takes a snapshot at the press (the minute poll may swap `day`
// while the strip is open) and hands clip.js the range, the scenes in it, a
// picture function, the captions of any window, the live-screen preview, and
// plan(startMs, endMs): the window's sound to rebuild, as runs of one scene
// (an MP3 slice where the scene was voiced) and blips for the rest.
const CLIP_BACK_MS = 15 * 60 * 1000;
function clipRange() {
  const d = day, maxMs = now();
  if (!d) return null;
  // Never before this viewer loaded the page (a clip is of what they watched)...
  let minMs = Math.max(maxMs - CLIP_BACK_MS, loadedAt);
  // ...nor, when the press is live, before the station went live: the replay
  // loop that filled the gap before is not what aired.
  const atEnd = locate(d, maxMs - 1);
  if (!atEnd) return null;
  const atStart = locate(d, minMs);
  if (!atEnd.replay && atStart && atStart.replay) {
    const firstLive = (d.segments || []).map((s) => Date.parse(s.startAt)).filter((s) => s >= minMs && s < maxMs);
    if (firstLive.length) minMs = Math.min(...firstLive);
  }
  // The scenes that aired inside the range, so the strip can show where each begins.
  const scenes = (d.segments || []).map((s) => ({ startMs: Date.parse(s.startAt), title: s.title, totalMs: layout(s).totalMs }))
    .filter((s) => s.startMs < maxMs && s.startMs + s.totalMs > minMs);
  return {
    minMs, maxMs, scenes,
    viewAt: (t) => clipView(d, t),
    // Every line heard in the window, once each, so the viewer can find the one they meant.
    linesIn(a, b) {
      const lines = [], seen = new Set();
      for (let t = a; t < b; t += 250) {
        const at = clipLocate(d, t);
        if (!at) continue;
        const k = `${at.segment.id}:${at.lineIndex}`;
        if (!seen.has(k)) { seen.add(k); lines.push({ speaker: at.line.speaker, text: at.line.text }); }
      }
      return lines;
    },
    preview: (t) => showPreview(d, t),
    endPreview,
    plan: (startMs, endMs) => planClip(d, startMs, endMs),
  };
}

// In the bumper slot between scenes the live page showed the "Up next" card, but
// locate() answers with a replay-loop scene nobody saw then; a clip took those
// seconds from that other scene (seen 10 Oct 2026, a 54-second gap filmed as
// "THE CHART THAT GOES BLANK"). So the clip reads the past through these two:
// nothing on the stage and no sound while the card was up.
const inGap = (d, t) => (REPLAY_ID ? null : gapAt(d, t));
const clipLocate = (d, t) => (inGap(d, t) ? null : locate(d, t));
const clipView = (d, t) => (inGap(d, t) ? null : viewAt(d, t));

// While a handle is dragged the TV shows that moment instead of live (the card,
// in a bumper slot); on release the tick takes the screen back.
let previewing = false;
function showPreview(d, t) {
  previewing = true;
  $('standby').hidden = true;
  $('power').hidden = true; // the cover would hide the preview
  // The name card belongs to the live line, so it hides while previewing.
  $('lowerThird').dataset.on = '0';
  $('capName').textContent = '';
  const g = inGap(d, t);
  if (g) { showBumper(g, true); showCaption({ speaker: '', shown: '' }); return; }
  $('bumper').hidden = true;
  const v = viewAt(d, t);
  if (!v) return;
  $('title').textContent = v.title;
  showCaption(v);
  paintStage(v);
}
function endPreview() {
  previewing = false;
  $('power').hidden = !!audioCtx; // the cover comes back if the TV was never turned on
  tick();
}

function planClip(d, startMs, endMs) {
  // Walk the window at the live tick's 50 ms step, cutting it into runs of one
  // scene played straight through, and noting where the blips would have gone.
  const runs = [];
  let run = null, key = '', typed = -1;
  for (let t = startMs; t < endMs; t += 50) {
    const at = clipLocate(d, t);
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
  return { startMs, endMs, runs, audioBase: AUDIO_BASE, viewAt: (t) => clipView(d, t) };
}
setupClip({ button: $('clip'), strip: $('clip-strip'), out: $('clip-out'), range: clipRange });
setupPanels();

function escapeHtml(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]); }

// The station appends scenes through the hour, so the page asks again every
// minute and swaps in the new pair quietly; a segment already playing keeps
// playing because the clock, not the file, decides what is on. When both hours
// are missing (the station is off) the replay already loaded stays.
loadDay().then((d) => {
  day = d;
  if (!d) { $('standby').hidden = false; return; }
  loadedAt = now();
  if (d && d.sample) $('note').textContent = 'Sample chapter, hand-written, to prove the player. Stand-in voice.';
  setInterval(tick, 50);
  tick();
  if (!REPLAY_ID) setInterval(() => loadNow().then((nd) => { if (nd && JSON.stringify(nd) !== JSON.stringify(day)) day = nd; }).catch(() => {}), 60 * 1000);
});
