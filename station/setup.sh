#!/usr/bin/env bash
# setup.sh: installs Kokoro, the channel's voice. Run once on the Mac, inside station/.venv.
#
# Why the ONNX build and GitHub, not the pip 'kokoro' package and Hugging Face:
# the cloud session's network blocks huggingface.co (found 8 Oct 2026, first
# station run), and the proxy allows github.com. kokoro-onnx ships the same
# 82M model as a single file, hosted on a GitHub release, and runs on the
# processor with no torch. Exits non-zero if anything is missing; the session
# then ships the day without audio and says so.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v ffmpeg >/dev/null || { echo "setup: ffmpeg is missing" >&2; exit 1; }
python3 -m pip install -q kokoro-onnx soundfile numpy
# espeak-ng turns words Kokoro has not seen into sounds. The pip loader ships
# its own copy on Linux; on a Mac, Homebrew's is used (see voice.py).
if ! python3 -c "import espeakng_loader" 2>/dev/null; then
  (apt-get install -y -qq espeak-ng >/dev/null 2>&1) || echo "setup: espeak-ng not installed; unknown words may be skipped" >&2
fi
mkdir -p station/models
BASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -s "station/models/$f" ] || curl -sSL --retry 3 -o "station/models/$f" "$BASE/$f"
done
python3 - <<'PY'
from kokoro_onnx import Kokoro
k = Kokoro("station/models/kokoro-v1.0.onnx", "station/models/voices-v1.0.bin")
s, sr = k.create("Setup check.", voice="af_heart", speed=1.0, lang="en-us")
print(f"setup: Kokoro ready, {len(s)/sr:.1f}s test clip at {sr} Hz")
PY
