// clip.js: the Clip button, like Twitch's clip editor. A press pauses the live
// show for this viewer and turns the TV into an editor: a player on top that
// plays the clip exactly as it will be made (picture and sound), looping, and
// below it a filmstrip of what they watched with two trim handles, 5 to 60
// seconds. They watch and hear the clip itself while trimming (J on his phone,
// 10 Oct 2026: the strip before this one had them "scrubbing through the
// transcript rather than looking at the thing", with the live show still
// talking over it; the very first version took the thirty seconds before the
// press and clipped the wrong moment).
// Made in the viewer's own browser (no server, no cost): the pixel stage
// scaled up, the scene title, the caption typed out, and a "Watch live" mark,
// with the sound as it aired (the real voice, or the blips). Every clip
// carries the address, so every share points back here. The idea is PNN's;
// the code is our own.
//
// How the past is possible: the show is data. Every scene's lines, timing and
// start are in the hour files, so player.js can say what was on screen at any
// moment (viewAt), and the voice MP3s are on the audio branch. So nothing is
// kept while watching: the window is re-drawn moment by moment into a canvas,
// and its sound is rebuilt in WebAudio from one plan. The preview plays that
// plan through the speakers; the recorder plays the same plan into a separate
// graph that feeds only MediaRecorder, which films the same canvas. So what is
// previewed is what is recorded. Recording takes real time (thirty seconds for
// thirty seconds), so the button shows progress.

import { drawStage, W, H } from './people.js';

const LIVE_URL = 'howisjason.github.io/chronicle';
const CW = 1280, STAGE_H = 720, CH = 960; // stage on top, caption band below

// The first type the browser can record wins: H.264 + AAC in MP4 plays
// everywhere a phone shares to; bare 'video/mp4' is Safari's own default.
function pickType() {
  const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus', 'video/webm'];
  return types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
}

// Wrap text to a width, keeping at most maxLines (the last lines win, so the
// newest words stay on screen while a long line types out).
function wrap(g, text, width, maxLines) {
  const lines = [];
  let cur = '';
  for (const word of text.split(' ')) {
    const next = cur ? cur + ' ' + word : word;
    if (g.measureText(next).width > width && cur) { lines.push(cur); cur = word; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(-maxLines);
}

// One frame of the clip: the stage (already drawn by people.js into the small
// canvas `stage` for this moment) and the view's title and caption.
function drawFrame(g, stage, s) {
  g.fillStyle = '#0b0b10';
  g.fillRect(0, 0, CW, CH);
  g.imageSmoothingEnabled = false;
  g.drawImage(stage, 0, 0, CW, STAGE_H);
  // the scene title, top left, on a dark strip
  g.font = '28px Georgia, serif';
  const title = (s.title || 'chronicle').toUpperCase();
  g.fillStyle = 'rgba(11,11,16,0.75)';
  g.fillRect(0, 0, Math.min(CW, g.measureText(title).width + 48), 56);
  g.fillStyle = '#e8e8f0';
  g.fillText(title, 24, 38);
  // the caption band: pink edge for March, gold for the narrator (the page's colours)
  const march = s.speaker === 'march';
  g.fillStyle = '#1c1c26';
  g.fillRect(0, STAGE_H, CW, CH - STAGE_H);
  g.fillStyle = march ? '#f4a6cf' : '#c9b26b';
  g.fillRect(0, STAGE_H, 10, CH - STAGE_H - 48);
  g.font = '34px Georgia, serif';
  g.fillStyle = march ? '#ffd9ec' : '#e8e8f0';
  wrap(g, s.shown || '', CW - 80, 4).forEach((l, i) => g.fillText(l, 40, STAGE_H + 50 + i * 44));
  // the watermark, along the bottom
  g.fillStyle = '#0b0b10';
  g.fillRect(0, CH - 48, CW, 48);
  g.font = '26px Georgia, serif';
  g.fillStyle = '#c9b26b';
  g.textAlign = 'right';
  g.fillText('Watch live: ' + LIVE_URL, CW - 24, CH - 15);
  g.textAlign = 'left';
}

// --- the one plan the preview and the recorder both follow ---

// The picture at show-clock time t: the stage drawn by people.js into the small
// canvas `stage`, then the full frame. Nothing on (the "Up next" card's
// seconds): a dark stage, not the last frame drawn.
function paint(g, sg, stage, viewAt, t) {
  const v = viewAt(t);
  if (v) drawStage(sg, v.stageT, v.stage);
  else { sg.fillStyle = '#0b0b10'; sg.fillRect(0, 0, W, H); }
  drawFrame(g, stage, v || {});
}

// One voiced scene's MP3, fetched and decoded whole, so the sound is exact from
// the first frame (an <audio> element seeking into the past would start late).
// A slow or hung sound file gives null after ten seconds, and the scene plays
// as blips instead, as the live page does when an MP3 is gone.
function loadSound(ac, url) {
  return fetch(url, { signal: AbortSignal.timeout(10000) }).then((res) => { if (!res.ok) throw 0; return res.arrayBuffer(); })
    .then((b) => ac.decodeAudioData(b)).catch(() => null);
}

// Place the window's sound on the audio clock: T0 is when the window's first
// moment plays, fromMs where in the window to begin (the preview starts
// part-way after the end handle moves). Each run is an MP3 slice where its
// buffer loaded, else its blips. Returns the nodes, so the preview can stop them.
function playRuns(ac, out, p, buffers, T0, fromMs = 0) {
  const nodes = [];
  p.runs.forEach((r, i) => {
    if (buffers[i]) {
      const skip = Math.max(0, fromMs - r.atMs);
      if (skip >= r.durMs) return;
      const src = ac.createBufferSource();
      src.buffer = buffers[i];
      src.connect(out);
      src.start(T0 + (r.atMs + skip) / 1000, (r.intoMs + skip) / 1000, (r.durMs - skip) / 1000);
      nodes.push(src);
    } else r.blips.forEach((b) => {
      if (b.atMs < fromMs) return;
      const o = ac.createOscillator(), gn = ac.createGain();
      o.type = 'square';
      o.frequency.value = b.speaker === 'march' ? 660 : 330;
      gn.gain.value = 0.03;
      o.connect(gn).connect(out);
      o.start(T0 + b.atMs / 1000);
      o.stop(T0 + b.atMs / 1000 + 0.04);
      nodes.push(o);
    });
  });
  return nodes;
}

const MIN_MS = 5 * 1000, MAX_MS = 60 * 1000, FIRST_MS = 30 * 1000;
// The timeline shows 90 seconds at a time, Twitch's amount of footage, so a
// 30-second window is a third of the track on a phone (the strip before showed
// all fifteen minutes, where 30 seconds was a sliver). Earlier and Later move
// the view a minute at a time, taking the window along.
const VIEW_MS = 90 * 1000, STEP_MS = 60 * 1000;
// After the end handle moves, play resumes this long before the end, so the
// viewer hears where the clip now stops; after any other change, from the start.
const TAIL_MS = 3 * 1000;
const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
// "1:05" for 65 seconds.
const mmss = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
// Quotes too: a scene title goes inside a title="..." attribute.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Wire the button and the editor. range() (player.js) returns, for a press now:
// { minMs, maxMs, scenes[], viewAt(t), plan(startMs, endMs) }. plan returns
// { startMs, endMs, runs, audioBase, viewAt(t) }, where each run is one scene
// played straight through: { audio, atMs, intoMs, durMs, blips[] }, atMs being
// where in the clip it starts and intoMs where in its scene (and MP3).
// live.pause() silences the live show and stops its tick; live.resume() puts it
// back on the clock.
export function setupClip({ button, strip, out, range, live }) {
  const type = pickType();
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!type || !HTMLCanvasElement.prototype.captureStream) { button.hidden = true; return; }
  // The one canvas: the editor's player shows it, and the recorder films it.
  const canvas = document.createElement('canvas');
  canvas.width = CW; canvas.height = CH;
  canvas.className = 'cs-screen';
  const g = canvas.getContext('2d');
  // The clip's own stage canvas, so drawing the past never touches the live one.
  const stage = document.createElement('canvas');
  stage.width = W; stage.height = H;
  const sg = stage.getContext('2d');
  const tv = strip.closest('.tv') || strip.parentElement;
  // The preview's sound: one context to the speakers, made inside the first
  // Clip tap (a browser only lets a tap start sound), put to sleep on close.
  let pac = null;
  let job = null, editor = null;

  const close = () => {
    if (editor) { editor.stop(); editor = null; }
    if (pac && pac.state === 'running') pac.suspend();
    strip.hidden = true; strip.innerHTML = '';
    button.setAttribute('aria-expanded', 'false');
    tv.classList.remove('clipping');
    live.resume();
  };
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => {
    if (job) return; // the editor's own button stops a clip being made
    if (!strip.hidden) { close(); return; }
    const r = range();
    if (!r) return;
    strip.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    if (r.maxMs - r.minMs < MIN_MS) {
      strip.innerHTML = '<p class="cs-help">Watch a few more seconds first: a clip is made from what you watched here, at least 5 seconds of it.</p>';
      return;
    }
    if (AC && !pac) pac = new AC();
    if (pac && pac.state === 'suspended') pac.resume();
    live.pause();
    tv.classList.add('clipping');
    editor = openEditor(r);
  });

  // The editor: the player, Play, then a filmstrip of the view with the pink
  // window and a handle outside each edge (outside, so a 5-second window on a
  // phone still has two handles a thumb can tell apart), then Earlier/Later.
  function openEditor(r) {
    const view = { a: Math.max(r.minMs, r.maxMs - VIEW_MS), b: r.maxMs };
    const sel = { a: Math.max(r.minMs, r.maxMs - FIRST_MS), b: r.maxMs };
    const more = r.maxMs - r.minMs > VIEW_MS;
    strip.innerHTML = `
      <div class="cs-player"></div>
      <div class="cs-ctl"><button class="cs-play">Play</button><span class="cs-time"></span></div>
      <p class="cs-help">Drag the pink edges to trim, or the middle to move it. A clip is 5 to 60 seconds.</p>
      <div class="cs-rail"><div class="cs-track">
        <canvas class="cs-film"></canvas><div class="cs-bands"></div>
        <span class="cs-dim cs-dl"></span><span class="cs-dim cs-dr"></span>
        <div class="cs-win"><span class="cs-h cs-a" aria-label="Start of the clip"></span><span class="cs-h cs-b" aria-label="End of the clip"></span></div>
        <span class="cs-head"></span>
      </div></div>
      <div class="cs-nav"><button class="cs-earlier"${more ? '' : ' hidden'}>&#9664; Earlier</button><span class="cs-where"></span><button class="cs-later"${more ? '' : ' hidden'}>Later &#9654;</button></div>
      <p class="cs-len"></p>
      <p class="cs-go"><button class="cs-make">Make the clip</button> <button class="cs-cancel">Cancel</button></p>`;
    strip.querySelector('.cs-player').append(canvas);
    const q = (s) => strip.querySelector(s);
    const track = q('.cs-track'), win = q('.cs-win'), film = q('.cs-film'), head = q('.cs-head');
    const len = q('.cs-len'), time = q('.cs-time'), play = q('.cs-play'), make = q('.cs-make');
    const earlier = q('.cs-earlier'), later = q('.cs-later');
    const pct = (t) => `${((t - view.a) / (view.b - view.a)) * 100}%`;

    // The view: a filmstrip of frames (cheap 128x72 stages, as many as fit the
    // track at 16:9) and a thin band per scene under them, re-drawn only when
    // the view moves.
    const thumb = document.createElement('canvas');
    thumb.width = W; thumb.height = H;
    const tg = thumb.getContext('2d');
    const drawView = () => {
      const rect = track.getBoundingClientRect();
      const n = Math.max(2, Math.round(rect.width / (rect.height * 16 / 9)));
      film.width = n * W; film.height = H;
      const fg = film.getContext('2d');
      for (let i = 0; i < n; i++) {
        const v = r.viewAt(view.a + ((i + 0.5) / n) * (view.b - view.a));
        if (v) drawStage(tg, v.stageT, v.stage);
        else {
          // The "Up next" card's seconds, which clip as a dark frame: named on
          // the strip, so they read as the break between scenes, not as broken footage.
          tg.fillStyle = '#0b0b10'; tg.fillRect(0, 0, W, H);
          tg.fillStyle = '#93a0cc'; tg.font = '11px sans-serif'; tg.textAlign = 'center';
          tg.fillText('UP NEXT', W / 2, H / 2 + 4);
          tg.textAlign = 'left';
        }
        fg.drawImage(thumb, i * W, 0);
      }
      q('.cs-bands').innerHTML = r.scenes.filter((s) => s.startMs < view.b && s.startMs + s.totalMs > view.a)
        .map((s) => `<span class="cs-scene${r.scenes.indexOf(s) % 2 ? ' odd' : ''}" title="${esc(s.title)}"
          style="left:${pct(Math.max(s.startMs, view.a))};right:${100 - ((Math.min(s.startMs + s.totalMs, view.b) - view.a) / (view.b - view.a)) * 100}%"></span>`).join('');
      q('.cs-where').textContent = `Showing ${mmss(r.maxMs - view.a)} to ${mmss(r.maxMs - view.b)} before you pressed Clip`;
      earlier.disabled = view.a <= r.minMs;
      later.disabled = view.b >= r.maxMs;
    };
    const render = () => {
      win.style.left = pct(sel.a);
      win.style.width = `${((sel.b - sel.a) / (view.b - view.a)) * 100}%`;
      q('.cs-dl').style.width = pct(sel.a);
      q('.cs-dr').style.left = pct(sel.b);
      len.textContent = `${Math.round((sel.b - sel.a) / 1000)}-second clip, from ${mmss(r.maxMs - sel.a)} to ${mmss(r.maxMs - sel.b)} before you pressed Clip`;
    };
    // Show the moment ms into the window: the frame in the player, the playhead
    // on the track, the time beside Play.
    const show = (ms) => {
      const dur = sel.b - sel.a;
      ms = clamp(ms, 0, dur - 1);
      paint(g, sg, stage, r.viewAt, sel.a + ms);
      head.style.left = pct(sel.a + ms);
      time.textContent = `${mmss(ms)} / ${mmss(dur)}`;
    };

    // The player. It reads the audio clock, as the recorder does, so picture
    // and sound cannot drift apart; without WebAudio it runs silent on the page
    // clock. The window's MP3s are kept decoded while they are in it, and
    // dropped when they leave (a decoded scene is tens of megabytes on a phone).
    const sounds = new Map();
    const pl = { token: 0, playing: false, nodes: [], at: 0 };
    const clock = () => (pac ? pac.currentTime * 1000 : performance.now());
    const hush = () => {
      pl.nodes.forEach((n) => { try { n.stop(); } catch { /* not started yet */ } n.disconnect(); });
      pl.nodes = [];
    };
    const pause = () => {
      pl.token++;
      hush();
      // Paused while the sound was still loading: no clock yet, so stay where play began
      // (the grader's catch, 10 Oct 2026: the time read NaN and Play stalled).
      if (pl.playing) pl.at = Number.isFinite(pl.T0) ? clamp(clock() - pl.T0, 0, sel.b - sel.a - 1) : pl.from;
      pl.playing = false;
      play.textContent = 'Play';
    };
    const start = async (fromMs = 0) => {
      pause();
      if (job) return;
      const tok = pl.token;
      pl.T0 = undefined;
      pl.from = fromMs;
      pl.playing = true;
      play.textContent = 'Pause';
      const p = r.plan(sel.a, sel.b), dur = p.endMs - p.startMs;
      show(fromMs);
      let buffers = [];
      if (pac) {
        const want = new Set(p.runs.filter((x) => x.audio).map((x) => p.audioBase + x.audio));
        for (const k of sounds.keys()) if (!want.has(k)) sounds.delete(k);
        for (const k of want) {
          if (sounds.has(k)) continue;
          const s = { done: false };
          s.buffer = loadSound(pac, k).then((b) => { s.done = true; return b; });
          sounds.set(k, s);
        }
        if ([...want].some((k) => !sounds.get(k).done)) time.textContent = 'Getting the sound...';
        buffers = await Promise.all(p.runs.map((x) => (x.audio ? sounds.get(p.audioBase + x.audio).buffer : null)));
        if (tok !== pl.token) return; // paused, dragged or closed while the sound loaded
      }
      pl.T0 = clock() + 50 - fromMs;
      if (pac) pl.nodes = playRuns(pac, pac.destination, p, buffers, pl.T0 / 1000, fromMs);
      const frame = () => {
        if (tok !== pl.token) return;
        let ms = clock() - pl.T0;
        // The loop: the next pass is placed on the clock where this one ends. After
        // a hidden tab (no frames, the clock ran on) it jumps whole passes at once
        // and joins the current one part-way, so passes never stack up.
        if (ms >= dur) {
          const k = Math.floor(ms / dur);
          pl.T0 += dur * k;
          ms -= dur * k;
          hush();
          if (pac) pl.nodes = playRuns(pac, pac.destination, p, buffers, pl.T0 / 1000, ms);
        }
        show(ms);
        requestAnimationFrame(frame);
      };
      frame();
    };
    play.addEventListener('click', () => {
      if (job) return;
      if (pac && pac.state === 'suspended') pac.resume();
      if (pl.playing) pause(); else start(pl.at);
    });

    // One drag at a time: the start handle, the end handle, or the whole window.
    // Dragging pauses the player and shows the frame under the edge being moved
    // (the start, for the whole window); letting go plays again.
    let drag = null;
    const begin = (e, kind) => {
      if (job) return;
      e.preventDefault();
      e.stopPropagation();
      track.setPointerCapture(e.pointerId);
      pause();
      drag = { kind, x0: e.clientX, a0: sel.a, b0: sel.b, w: track.getBoundingClientRect().width };
      show(kind === 'b' ? sel.b - sel.a - 1 : 0);
    };
    q('.cs-a').addEventListener('pointerdown', (e) => begin(e, 'a'));
    q('.cs-b').addEventListener('pointerdown', (e) => begin(e, 'b'));
    win.addEventListener('pointerdown', (e) => begin(e, 'win'));
    // A tap on the bare track moves the window there (same length), then drags it.
    track.addEventListener('pointerdown', (e) => {
      if (job || drag) return;
      const rect = track.getBoundingClientRect();
      const t = view.a + ((e.clientX - rect.left) / rect.width) * (view.b - view.a);
      const w = sel.b - sel.a;
      sel.a = clamp(t - w / 2, view.a, view.b - w);
      sel.b = sel.a + w;
      render();
      begin(e, 'win');
    });
    track.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dt = ((e.clientX - drag.x0) / drag.w) * (view.b - view.a);
      if (drag.kind === 'a') sel.a = clamp(drag.a0 + dt, Math.max(view.a, sel.b - MAX_MS), sel.b - MIN_MS);
      else if (drag.kind === 'b') sel.b = clamp(drag.b0 + dt, sel.a + MIN_MS, Math.min(view.b, sel.a + MAX_MS));
      else {
        const w = drag.b0 - drag.a0;
        sel.a = clamp(drag.a0 + dt, view.a, view.b - w);
        sel.b = sel.a + w;
      }
      render();
      show(drag.kind === 'b' ? sel.b - sel.a - 1 : 0);
    });
    const end = () => {
      if (!drag) return;
      const kind = drag.kind;
      drag = null;
      start(kind === 'b' ? Math.max(0, sel.b - sel.a - TAIL_MS) : 0);
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);

    // Earlier / Later: the view slides a minute, and the window rides along. A
    // step that would leave less than 15 seconds goes all the way to the end of
    // the range, so a press never leaves a sliver behind with the button still on
    // (seen in the test, 10 Oct 2026: 0.4 s left, Earlier still lit).
    const slide = (dir) => {
      if (job) return;
      const vs = view.b - view.a, lo = r.minMs, hi = r.maxMs - vs;
      let na = view.a + dir * STEP_MS;
      // Only the end being moved towards snaps (the grader's catch: with both
      // rules, 90 to 105 seconds watched made Earlier do nothing).
      if (dir < 0 && na - lo < 15000) na = lo;
      if (dir > 0 && hi - na < 15000) na = hi;
      const d = clamp(na, lo, hi) - view.a;
      if (!d) return;
      view.a += d; view.b += d; sel.a += d; sel.b += d;
      drawView();
      render();
      start(0);
    };
    earlier.addEventListener('click', () => slide(-1));
    later.addEventListener('click', () => slide(1));

    q('.cs-cancel').addEventListener('click', () => {
      if (job) { job.cancelled = true; job.stop(); }
      close();
    });
    make.addEventListener('click', () => {
      if (job) { job.stop(); return; } // a second press ends the clip early
      pause();
      sounds.clear(); // the recorder decodes its own copy; one at a time on a phone
      record(r.plan(sel.a, sel.b), make);
    });

    drawView();
    render();
    start(0);
    return { stop: pause };
  }

  // Film the window: the recorder from the first version, unchanged but for
  // drawing and placing the sound through the plan the preview shares, and the
  // editor closing once the file is handed over.
  async function record(p, button) {
    if (!p) return;
    // The last clip's video is let go before the next, so clips don't pile up in memory.
    if (lastClipUrl) URL.revokeObjectURL(lastClipUrl);
    out.innerHTML = '';
    const durMs = p.endMs - p.startMs;
    // Made inside the tap, so the browser lets it run; it is never connected
    // to the speakers, only to the recorder.
    const ac = AC ? new AC() : null;
    if (ac && ac.state === 'suspended') ac.resume();
    const dest = ac && ac.createMediaStreamDestination ? ac.createMediaStreamDestination() : null;
    button.disabled = true;
    button.textContent = 'Getting the sound...';
    const buffers = await Promise.all(p.runs.map((r) => (dest && r.audio ? loadSound(ac, p.audioBase + r.audio) : null)));
    button.disabled = false;
    // Cancel pressed while the sound was fetched: the editor is gone (or a new
    // one replaced it, taking this button with the old one), so no clip.
    if (strip.hidden || !button.isConnected) { if (ac) ac.close(); return; }

    // Everything is placed on the audio clock from T0, and the picture reads
    // the same clock, so sound and picture cannot drift apart.
    const T0 = ac ? ac.currentTime + 0.3 : 0;
    // A silent tone under the whole clip keeps the sound track alive: a window
    // with no voice and no blips (all inside the "Up next" card) came out with no
    // sound track and half its length (10 Oct 2026).
    if (dest) {
      const o = ac.createOscillator(), hush = ac.createGain();
      hush.gain.value = 0;
      o.connect(hush).connect(dest);
      o.start(T0);
      o.stop(T0 + durMs / 1000 + 1);
    }
    if (dest) playRuns(ac, dest, p, buffers, T0);
    // Without WebAudio the picture runs on the page clock, silent.
    const t0 = performance.now() + 300;
    const elapsed = () => (ac ? (ac.currentTime - T0) * 1000 : performance.now() - t0);

    const stream = canvas.captureStream(25);
    if (dest) dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const chunks = [];
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2_500_000 });
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const draw = (ms) => paint(g, sg, stage, p.viewAt, p.startMs + Math.min(Math.max(ms, 0), durMs - 1));
    draw(0);
    const total = Math.round(durMs / 1000);
    const timer = setInterval(() => {
      const ms = elapsed();
      if (ms < 0) return;
      // The recorder starts at T0, not at the tap, so the file opens on the
      // window's first moment rather than on the fetch wait.
      if (rec.state === 'inactive' && !chunks.length && !job.stopped) rec.start(1000);
      draw(ms);
      button.textContent = `Making your clip... ${Math.min(total, Math.floor(ms / 1000))} of ${total}s (tap to stop)`;
      if (ms >= durMs) job.stop();
    }, 40);
    job = {
      stopped: false,
      stop() {
        if (this.stopped) return;
        this.stopped = true;
        clearInterval(timer);
        if (rec.state === 'recording') rec.stop(); else finish();
      },
    };
    const finish = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (ac) ac.close();
      const cancelled = job.cancelled;
      job = null;
      button.textContent = 'Make the clip';
      // Cancel throws the clip away; a stop keeps what was made so far.
      if (!chunks.length || cancelled) return;
      const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
      const file = new File(chunks, `chronicle-clip-${Date.now()}.${ext}`, { type: type.split(';')[0] });
      handOver(file, out);
      close();
    };
    rec.onstop = finish;
    button.textContent = `Making your clip... 0 of ${total}s (tap to stop)`;
  }
}

// Hand the file over: a Share button where the browser can share files
// (phones), and a download link always. Sharing needs a fresh tap, so it is
// its own button rather than a call made when the recording ends.
let lastClipUrl = null;
function handOver(file, out) {
  const url = lastClipUrl = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = file.name; a.id = 'clip-download';
  a.textContent = `Download clip (${(file.size / 1e6).toFixed(1)} MB)`;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    const b = document.createElement('button');
    b.textContent = 'Share clip';
    b.className = 'clip-share';
    b.addEventListener('click', () => navigator.share({
      files: [file], title: 'chronicle', text: 'Watch live: https://' + LIVE_URL + '/',
    }).catch(() => {}));
    out.append(b, ' ');
  }
  out.append(a);
}
