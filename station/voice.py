#!/usr/bin/env python3
"""voice.py: turns a day's chapters into one MP3 per segment.

Usage: python3 station/voice.py day/<date>.json [--budget SECONDS]
       VOICE_BACKEND=tone python3 station/voice.py day/<date>.json   (test stand-in, no model)

Segments that already have audio are skipped, and --budget stops after that
many seconds of work (the cloud's one-command wall is ten minutes), so the
station runs this in a loop until it prints "0 left". When every segment is
voiced, startAt is re-chained from the real lengths: the first segment keeps
its start, each later one starts when the one before it ends.

For each segment it speaks every line (narrator and March have their own Kokoro
voice; the model is the ONNX build fetched by setup.sh from a GitHub release,
because huggingface.co is blocked in the cloud session), lays the lines on the same timeline timing.js uses (firstLeadMs or leadMs
of silence, the speech, holdMs of silence), writes audio/<date>/<segment id>.mp3,
and writes back the segment's `audio` path and each line's real `audioMs`.
Because the gaps are baked into the MP3, the page only has to start the file at
the segment's offset on the clock.
"""
import json, math, os, subprocess, sys, tempfile, time, wave
from datetime import datetime, timedelta
import numpy as np

RATE = 24000
# Neither voice is a stock voice. March is station/march_voice.py, tuned with J
# in the body era (see its header). The narrator is J's pick from seventeen
# candidates (8 Oct 2026): Onyx's throat wearing Lewis's movement, built the
# same way hers is (Kokoro's 256-number style splits at 128: timbre first,
# rhythm and pitch second), at speed 0.92.
NARRATOR_TIMBRE, NARRATOR_DONOR, NARRATOR_SPEED = 'am_onyx', 'bm_lewis', 0.92
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import march_voice  # noqa: E402
MODEL = os.path.join('station', 'models', 'kokoro-v1.0.onnx')
VOICEBIN = os.path.join('station', 'models', 'voices-v1.0.bin')

# On a Mac the pip espeak loader's bundled data is broken (8 Oct 2026); point
# the phonemizer at Homebrew's espeak-ng instead. Linux needs nothing.
if sys.platform == 'darwin' and os.path.isdir('/opt/homebrew/share/espeak-ng-data'):
    os.environ.setdefault('ESPEAK_DATA_PATH', '/opt/homebrew/share/espeak-ng-data')
    os.environ.setdefault('PHONEMIZER_ESPEAK_LIBRARY', '/opt/homebrew/lib/libespeak-ng.1.dylib')
DEFAULT_GAPS = {'firstLeadMs': 1000, 'leadMs': 200, 'holdMs': 600}


_march_style = None
_narrator_style = None
def narrator_style(pipeline):
    timbre = pipeline.get_voice_style(NARRATOR_TIMBRE)
    donor = pipeline.get_voice_style(NARRATOR_DONOR)
    return np.concatenate([timbre[:, :, :128], donor[:, :, 128:]], axis=-1)


def speak_kokoro(pipeline, speaker, text):
    global _march_style, _narrator_style
    if speaker == 'march':
        if _march_style is None:
            _march_style = march_voice.build_style(pipeline)
        samples, rate = march_voice.speak(pipeline, _march_style, text)
    else:
        if _narrator_style is None:
            _narrator_style = narrator_style(pipeline)
        samples, rate = pipeline.create(text, voice=_narrator_style, speed=NARRATOR_SPEED, lang='en-us')
    assert rate == RATE, f'voice: Kokoro gave {rate} Hz, expected {RATE}'
    return np.asarray(samples, dtype=np.float32)


def speak_tone(_pipeline, speaker, text):
    """Test stand-in: a quiet tone as long as the text at 16 characters a second."""
    n = int(len(text) / 16 * RATE)
    t = np.arange(n) / RATE
    return (0.1 * np.sin(2 * math.pi * (660 if speaker == 'march' else 330) * t)).astype(np.float32)


def silence(ms):
    return np.zeros(int(RATE * ms / 1000), dtype=np.float32)


def write_mp3(samples, path):
    pcm = (np.clip(samples, -1, 1) * 32767).astype('<i2')
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        with wave.open(tmp.name, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm.tobytes())
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-codec:a', 'libmp3lame', '-b:a', '64k', path], check=True)


def segment_ms(seg):
    gaps = {**DEFAULT_GAPS, **(seg.get('gaps') or {})}
    n = len(seg['lines'])
    return gaps['firstLeadMs'] + gaps['leadMs'] * (n - 1) + gaps['holdMs'] * n + sum(l['audioMs'] for l in seg['lines'])


def chain_starts(day):
    t = datetime.fromisoformat(day['segments'][0]['startAt'])
    for seg in day['segments']:
        seg['startAt'] = t.isoformat(timespec='milliseconds')
        t = t + timedelta(milliseconds=segment_ms(seg))


def main(path, budget=None):
    started = time.time()
    day = json.load(open(path))
    if os.environ.get('VOICE_BACKEND') == 'tone':
        pipeline, speak = None, speak_tone
    else:
        from kokoro_onnx import Kokoro
        pipeline, speak = Kokoro(MODEL, VOICEBIN), speak_kokoro
    out_dir = os.path.join('audio', day['date'])
    os.makedirs(out_dir, exist_ok=True)
    for seg in day['segments']:
        if seg.get('audio'):
            continue
        if budget is not None and time.time() - started > budget:
            break
        gaps = {**DEFAULT_GAPS, **(seg.get('gaps') or {})}
        parts = []
        for i, line in enumerate(seg['lines']):
            samples = speak(pipeline, line['speaker'], line['text'])
            if len(samples) == 0:
                raise SystemExit(f"voice: no audio for {seg['id']} line {i}")
            line['audioMs'] = max(1, round(len(samples) / RATE * 1000))
            parts += [silence(gaps['firstLeadMs'] if i == 0 else gaps['leadMs']), samples, silence(gaps['holdMs'])]
        mp3 = os.path.join(out_dir, f"{seg['id']}.mp3")
        write_mp3(np.concatenate(parts), mp3)
        seg['audio'] = mp3.replace(os.sep, '/')
        total = sum(line['audioMs'] for line in seg['lines'])
        print(f"voice: {mp3}  {len(seg['lines'])} lines, {total / 1000:.1f}s of speech")
        json.dump(day, open(path, 'w'), indent=2, ensure_ascii=False)
        open(path, 'a').write('\n')
    left = sum(1 for s in day['segments'] if not s.get('audio'))
    if left == 0:
        chain_starts(day)
        json.dump(day, open(path, 'w'), indent=2, ensure_ascii=False)
        open(path, 'a').write('\n')
        total_s = sum(segment_ms(s) for s in day['segments']) / 1000
        print(f"voice: {len(day['segments'])} segments, {total_s / 60:.1f} minutes on air, starts re-chained from {day['segments'][0]['startAt']}")
    print(f"voice: {left} left")


if __name__ == '__main__':
    args = sys.argv[1:]
    budget = None
    if '--budget' in args:
        i = args.index('--budget'); budget = float(args[i + 1]); del args[i:i + 2]
    if len(args) != 1:
        sys.exit('usage: python3 station/voice.py day/<date>.json [--budget SECONDS]')
    main(args[0], budget)
