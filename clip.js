// clip.js: the Clip button. It records the next thirty seconds of what the
// viewer is watching, in the viewer's own browser (no server, no cost): the
// pixel stage scaled up, the scene title, the caption typed out, and a
// "Watch live" mark, plus whatever sound is playing (the real voice or the
// blips). Every clip carries the address, so every share points back here.
// The idea is PNN's; the code is our own.
//
// Why forward and not "the last thirty seconds": a rolling buffer means
// recording all the time and cutting a video mid-stream, which MediaRecorder
// cannot do cleanly. Recording forward from the press is simple and reliable.

const LIVE_URL = 'howisjason.github.io/chronicle';
const CLIP_MS = 30 * 1000;
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

// One frame of the clip, drawn from the page's own stage canvas and state.
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

// Wire the button. getState() returns { title, speaker, shown }; getAudio()
// returns a MediaStream of the page's sound (or null), making it if needed.
export function setupClip({ button, out, stage, getState, getAudio }) {
  const type = pickType();
  if (!type || !HTMLCanvasElement.prototype.captureStream) { button.hidden = true; return; }
  const canvas = document.createElement('canvas');
  canvas.width = CW; canvas.height = CH;
  const g = canvas.getContext('2d');
  let rec = null;

  button.addEventListener('click', () => {
    if (rec) { rec.stop(); return; } // a second press ends the clip early
    out.innerHTML = '';
    const stream = canvas.captureStream(25);
    const audio = getAudio();
    if (audio) audio.getAudioTracks().forEach((t) => stream.addTrack(t));
    const chunks = [];
    rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2_500_000 });
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const started = performance.now();
    const draw = () => drawFrame(g, stage, getState());
    draw();
    const timer = setInterval(() => {
      draw();
      const sec = Math.floor((performance.now() - started) / 1000);
      button.textContent = `Clipping... ${sec}s (tap to stop)`;
      if (performance.now() - started >= CLIP_MS && rec.state === 'recording') rec.stop();
    }, 40);
    rec.onstop = () => {
      clearInterval(timer);
      stream.getVideoTracks().forEach((t) => t.stop());
      rec = null;
      button.textContent = 'Clip';
      const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
      const file = new File(chunks, `chronicle-clip-${Date.now()}.${ext}`, { type: type.split(';')[0] });
      handOver(file, out);
    };
    rec.start(1000);
    button.textContent = 'Clipping... 0s (tap to stop)';
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
