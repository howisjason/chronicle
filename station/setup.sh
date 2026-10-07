#!/usr/bin/env bash
# setup.sh: installs Kokoro, the channel's voice. Run once per session by STATION.md step 1.
# Needs outbound access to pypi.org and huggingface.co (the model weights come from there)
# and ffmpeg. Exits non-zero if anything is missing; the session then ships without audio.
set -euo pipefail
command -v ffmpeg >/dev/null || { echo "setup: ffmpeg is missing" >&2; exit 1; }
if ! command -v espeak-ng >/dev/null; then
  (apt-get install -y -qq espeak-ng >/dev/null 2>&1) || echo "setup: espeak-ng not installed (only needed for words Kokoro does not know)" >&2
fi
python3 -m pip install -q --extra-index-url https://download.pytorch.org/whl/cpu torch 'kokoro>=0.9.4' soundfile numpy
# Fetch the model now so a network block shows up here, not half way through voicing.
python3 - <<'PY'
from kokoro import KPipeline
KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
print("setup: Kokoro ready")
PY
