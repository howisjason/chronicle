// clip.js: the Clip button. Like Twitch, it clips what JUST happened: the
// thirty seconds before the press, made in the viewer's own browser (no
// server, no cost): the pixel stage scaled up, the scene title, the caption
// typed out, and a "Watch live" mark, with the sound as it aired (the real
// voice, or the blips). Every clip carries the address, so every share points
// back here. The idea is PNN's; the code is our own.
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

// Wire the button. plan() (player.js) returns, for a press now:
// { startMs, endMs, runs, audioBase, viewAt(t) }, where each run is one scene
// played straight through: { audio, atMs, intoMs, durMs, blips[] }, atMs being
// where in the clip it starts and intoMs where in its scene (and MP3).
export function setupClip({ button, out, plan }) {
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

  button.addEventListener('click', async () => {
    if (job) { job.stop(); return; } // a second press ends the clip early
    const p = plan();
    if (!p) return;
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
      ? fetch(p.audioBase + r.audio).then((res) => { if (!res.ok) throw 0; return res.arrayBuffer(); })
        .then((b) => ac.decodeAudioData(b)).catch(() => null)
      : null)));
    button.disabled = false;

    // Everything is placed on the audio clock from T0, and the picture reads
    // the same clock, so sound and picture cannot drift apart.
    const T0 = ac ? ac.currentTime + 0.3 : 0;
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
      job = null;
      button.textContent = 'Clip';
      if (!chunks.length) return;
      const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
      const file = new File(chunks, `chronicle-clip-${Date.now()}.${ext}`, { type: type.split(';')[0] });
      handOver(file, out);
    };
    rec.onstop = finish;
    button.textContent = `Making your clip... 0 of ${total}s (tap to stop)`;
  });
}

// Hand the file over: a Share button where the browser can share files
// (phones), and a download link always. Sharing needs a fresh tap, so it is
// its own button rather than a call made when the recording ends.
function handOver(file, out) {
  const url = URL.createObjectURL(file);
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
