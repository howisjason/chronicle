// clip.js: the Clip button. Like Twitch, it clips what the viewer just
// watched: a press opens a strip of the last fifteen minutes (never before the
// page loaded), they drag a window of 5 to 60 seconds onto the moment, the TV
// previews the frame under the handle, and the window's lines show below so
// they can find the one they meant (J's spec, 8 Oct 2026; the first version
// took the thirty seconds before the press and clipped the wrong moment).
// Made in the viewer's own browser (no server, no cost): the pixel stage
// scaled up, the scene title, the caption typed out, and a "Watch live" mark,
// with the sound as it aired (the real voice, or the blips). Every clip
// carries the address, so every share points back here. The idea is PNN's;
// the code is our own.
//
// How the past is possible: the show is data. Every scene's lines, timing and
// start are in the hour files, so player.js can say what was on screen at any
// moment (viewAt), and the voice MP3s are on the audio branch. So nothing is
// kept while watching: on a press, the window is re-drawn moment by moment
// into a canvas nobody sees, the sound is rebuilt in a separate WebAudio graph
// that feeds only the recorder (never the speakers), and MediaRecorder films
// it. That takes real time (thirty seconds for thirty seconds), so the button
// shows progress while the live page plays on untouched.

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

const MIN_MS = 5 * 1000, MAX_MS = 60 * 1000, FIRST_MS = 30 * 1000;
const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
// "1:05" for 65 seconds.
const mmss = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

// Wire the button and the strip. range() (player.js) returns, for a press now:
// { minMs, maxMs, scenes[], viewAt(t), linesIn(a, b), preview(t), endPreview(),
// plan(startMs, endMs) }. plan returns { startMs, endMs, runs, audioBase,
// viewAt(t) }, where each run is one scene played straight through:
// { audio, atMs, intoMs, durMs, blips[] }, atMs being where in the clip it
// starts and intoMs where in its scene (and MP3).
export function setupClip({ button, strip, out, range }) {
  const type = pickType();
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!type || !HTMLCanvasElement.prototype.captureStream) { button.hidden = true; return; }
  const canvas = document.createElement('canvas');
  canvas.width = CW; canvas.height = CH;
  const g = canvas.getContext('2d');
  // The clip's own stage canvas, so drawing the past never touches the live one.
  const stage = document.createElement('canvas');
  stage.width = W; stage.height = H;
  const sg = stage.getContext('2d');
  let job = null;

  const close = () => { strip.hidden = true; strip.innerHTML = ''; button.setAttribute('aria-expanded', 'false'); };
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => {
    if (job) return; // the strip's own button stops a clip being made
    if (!strip.hidden) { close(); return; }
    const r = range();
    if (!r) return;
    strip.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    if (r.maxMs - r.minMs < MIN_MS) {
      strip.innerHTML = '<p class="cs-help">Watch a few more seconds first: a clip is made from what you watched here, at least 5 seconds of it.</p>';
      return;
    }
    openStrip(r);
  });

  // The strip: scene bands along a track of the range, a pink window with a
  // handle outside each edge (outside, so a 5-second window on a phone still
  // has two handles a thumb can tell apart), and the window's lines below.
  function openStrip(r) {
    const span = r.maxMs - r.minMs;
    const sel = { a: Math.max(r.minMs, r.maxMs - FIRST_MS), b: r.maxMs };
    const pct = (t) => `${((t - r.minMs) / span) * 100}%`;
    strip.innerHTML = `
      <p class="cs-help">Drag the pink window onto the moment, or drag its edges. A clip is 5 to 60 seconds.</p>
      <div class="cs-rail"><div class="cs-track">
        ${r.scenes.map((s, i) => `<span class="cs-scene${i % 2 ? ' odd' : ''}" title="${esc(s.title)}"
          style="left:${pct(Math.max(s.startMs, r.minMs))};right:${100 - ((Math.min(s.startMs + s.totalMs, r.maxMs) - r.minMs) / span) * 100}%"></span>`).join('')}
        <div class="cs-win"><span class="cs-h cs-a" aria-label="Start of the clip"></span><span class="cs-h cs-b" aria-label="End of the clip"></span></div>
      </div></div>
      <div class="cs-scale"><span>${mmss(span)} ago</span><span>when you pressed Clip</span></div>
      <p class="cs-len"></p>
      <ol class="cs-lines"></ol>
      <p class="cs-go"><button class="cs-make">Make the clip</button> <button class="cs-cancel">Cancel</button></p>`;
    const track = strip.querySelector('.cs-track'), win = strip.querySelector('.cs-win');
    const len = strip.querySelector('.cs-len'), lines = strip.querySelector('.cs-lines');
    const make = strip.querySelector('.cs-make');

    // The window's lines are re-read once per frame at most while dragging.
    let linesDue = false;
    const render = () => {
      win.style.left = pct(sel.a);
      win.style.width = `${((sel.b - sel.a) / span) * 100}%`;
      len.textContent = `${Math.round((sel.b - sel.a) / 1000)} seconds, from ${mmss(r.maxMs - sel.a)} to ${mmss(r.maxMs - sel.b)} before you pressed Clip`;
      if (linesDue) return;
      linesDue = true;
      requestAnimationFrame(() => {
        linesDue = false;
        lines.innerHTML = r.linesIn(sel.a, sel.b).map((l) => `<li class="${l.speaker === 'march' ? 'm' : 'n'}">${esc(l.text)}</li>`).join('');
      });
    };
    render();

    // One drag at a time: the start handle, the end handle, or the whole window.
    // The TV previews the edge being moved (the start, for the whole window).
    let drag = null;
    const begin = (e, kind) => {
      if (job) return;
      e.preventDefault();
      e.stopPropagation();
      track.setPointerCapture(e.pointerId);
      drag = { kind, x0: e.clientX, a0: sel.a, b0: sel.b, w: track.getBoundingClientRect().width };
      r.preview(kind === 'b' ? sel.b - 1 : sel.a);
    };
    strip.querySelector('.cs-a').addEventListener('pointerdown', (e) => begin(e, 'a'));
    strip.querySelector('.cs-b').addEventListener('pointerdown', (e) => begin(e, 'b'));
    win.addEventListener('pointerdown', (e) => begin(e, 'win'));
    // A tap on the bare track moves the window there (same length), then drags it.
    track.addEventListener('pointerdown', (e) => {
      if (job || drag) return;
      const rect = track.getBoundingClientRect();
      const t = r.minMs + ((e.clientX - rect.left) / rect.width) * span;
      const w = sel.b - sel.a;
      sel.a = clamp(t - w / 2, r.minMs, r.maxMs - w);
      sel.b = sel.a + w;
      render();
      begin(e, 'win');
    });
    track.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dt = ((e.clientX - drag.x0) / drag.w) * span;
      if (drag.kind === 'a') sel.a = clamp(drag.a0 + dt, Math.max(r.minMs, sel.b - MAX_MS), sel.b - MIN_MS);
      else if (drag.kind === 'b') sel.b = clamp(drag.b0 + dt, sel.a + MIN_MS, Math.min(r.maxMs, sel.a + MAX_MS));
      else {
        const w = drag.b0 - drag.a0;
        sel.a = clamp(drag.a0 + dt, r.minMs, r.maxMs - w);
        sel.b = sel.a + w;
      }
      render();
      r.preview(drag.kind === 'b' ? sel.b - 1 : sel.a);
    });
    const end = () => { if (drag) { drag = null; r.endPreview(); } };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);

    strip.querySelector('.cs-cancel').addEventListener('click', () => {
      if (job) { job.cancelled = true; job.stop(); }
      close();
    });
    make.addEventListener('click', () => {
      if (job) { job.stop(); return; } // a second press ends the clip early
      record(r.plan(sel.a, sel.b), make);
    });
  }

  // Film the window: the recorder from the first version, unchanged but for
  // where its progress shows (the strip's own button) and the strip closing
  // once the file is handed over.
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
    // Fetch and decode each voiced scene's MP3 first, so the sound is exact from
    // the first frame (an <audio> element seeking into the past would start late).
    // A scene whose MP3 is gone gets its blips instead, as the live page does.
    const buffers = await Promise.all(p.runs.map((r) => (dest && r.audio
      // A slow or hung sound file falls back to blips after ten seconds.
      ? fetch(p.audioBase + r.audio, { signal: AbortSignal.timeout(10000) }).then((res) => { if (!res.ok) throw 0; return res.arrayBuffer(); })
        .then((b) => ac.decodeAudioData(b)).catch(() => null)
      : null)));
    button.disabled = false;
    // Cancel pressed while the sound was fetched: the strip is gone, so no clip.
    if (strip.hidden) { if (ac) ac.close(); return; }

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
    if (dest) p.runs.forEach((r, i) => {
      if (buffers[i]) {
        const src = ac.createBufferSource();
        src.buffer = buffers[i];
        src.connect(dest);
        src.start(T0 + r.atMs / 1000, r.intoMs / 1000, r.durMs / 1000);
      } else r.blips.forEach((b) => {
        const o = ac.createOscillator(), gn = ac.createGain();
        o.type = 'square';
        o.frequency.value = b.speaker === 'march' ? 660 : 330;
        gn.gain.value = 0.03;
        o.connect(gn).connect(dest);
        o.start(T0 + b.atMs / 1000);
        o.stop(T0 + b.atMs / 1000 + 0.04);
      });
    });
    // Without WebAudio the picture runs on the page clock, silent.
    const t0 = performance.now() + 300;
    const elapsed = () => (ac ? (ac.currentTime - T0) * 1000 : performance.now() - t0);

    const stream = canvas.captureStream(25);
    if (dest) dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const chunks = [];
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2_500_000 });
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const draw = (ms) => {
      const t = p.startMs + Math.min(Math.max(ms, 0), durMs - 1);
      const v = p.viewAt(t);
      if (v) drawStage(sg, v.stageT, v.stage);
      drawFrame(g, stage, v || {});
    };
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
