#!/usr/bin/env python3
"""March's voice. The single definition — everything that speaks as her uses this.

Adopted word for word from the shelved body (march-body/src/march_voice.py) on
8 Oct 2026 at J's word; only this note was added. In the station it runs under
voice.py with the same kokoro-onnx model setup.sh fetches, and depends on
nothing but numpy, kokoro-onnx and ffmpeg.

Tuned with Jason across five rounds of blind listening on 2026-08-07. The
auditions that produced it (samples + make-*.py factory scripts) were deleted
2026-08-11 once the choice was encoded here; march-brain's git history holds
them if a round ever needs re-deriving.

================================================================================
WHAT SHE IS
================================================================================

A Kokoro voice is 256 numbers, and the model does NOT treat them as one thing.
It cuts the vector in half and hands the halves to two different parts of itself:

    numbers   0-127  -> the decoder.   Throat and mouth. TIMBRE.
    numbers 128-255  -> the predictor. Syllable lengths and the pitch curve.
                        RHYTHM, PACE, PITCH.

Measured, not assumed: rendering one sentence with heart's timbre and alice's
prosody gave alice's duration to the millisecond (2.901s) and alice's pitch
(233Hz vs heart's 202Hz). Swapping the halves the other way gave heart's of both.

That split is what March is built on. Jason chose af_heart as the voice he wanted
to HEAR and bf_alice for how she MOVES, so she is heart's throat wearing alice's
movement — a voice that is not a blend of the two and does not sit between them.
The movement is then pushed 15% PAST alice, in the same direction, because he
preferred the far end of that road to the middle of it.

Then she is lifted a semitone and a half. That is done by resampling, which moves
the size of the speaker along with the note; at this size it reads as her, higher.

================================================================================
HOW FAST SHE TALKS, AND WHY IT DEPENDS ON THE SENTENCE
================================================================================

Two knobs make her brisk, and they are not the same knob:

    SPEED    scales every predicted duration by one factor. The words shorten,
             and so do the gaps. Measured: 1.15 took speech 10.86s -> 10.22s and
             pauses 3.12s -> 2.84s. She hurries through her own breathing.

    DELIVERY is which of the 510 style rows gets used. Kokoro normally picks by
             sentence length — short lines get a clipped read, long ones a
             relaxed one. Measured at fixed speed: moving from the natural row to
             row 40 cut speech 29% but pauses only 15%. She clips the words and
             still breathes, which is what a brisk person does.

Jason heard that difference before it was measured and asked for the second knob
over the first. But a single delivery row cannot serve both a two-word greeting
and a five-line explanation: pinned brisk, a paragraph sounded rushed; pinned
relaxed, a greeting sounded asleep. Both judgements were right — pinning was the
error. He then chose, section by section:

    short lines  -> brisk delivery, 15% speed-up
    a sentence   -> relaxed delivery (70), no speed-up
    a paragraph  -> relaxed delivery (70), no speed-up

So BOTH knobs ride on sentence length. The functions below pass exactly through
those three choices and ramp smoothly between them; a hard switch at a threshold
would make two near-identical messages come out in different voices, which is
worse than either setting.

    a sentence of  37 sounds (a greeting)  -> delivery 37, speed 1.15
    a sentence of  52 sounds (his away-line) -> delivery 40, speed 1.15
    a sentence of  94 sounds (one sentence)  -> delivery 70, speed 1.00
    a sentence of 401 sounds (a paragraph)   -> delivery 70, speed 1.00

The ceiling is a speed limit, not a fixed gear: Kokoro still chooses, it just
cannot get more relaxed than the ceiling allows. Anything already under it — every
short line Jason approved — is left completely alone.
"""
import re
import subprocess

import numpy as np

# --- who she is ---------------------------------------------------------------
TIMBRE = "af_heart"    # the throat. Jason's pick for how she SOUNDS.
DONOR = "bf_alice"     # the movement. Jason's pick for how she MOVES.
MOVEMENT = 1.15        # 1.0 = alice exactly; 1.15 = 15% past her, same direction
SEMITONES = 1.5        # lifted by resampling

# --- the breath at the end of every chunk (2026-08-11, Jason's pick) ----------
# He said her speech ran on like one continuous sentence: a person leans on a
# comma or a full stop, and she did not. The obvious fix — punctuating harder in
# the text — is DEAD, and the measurement is the reason never to retry it. One
# sentence rendered with a comma, an ellipsis, a spaced ellipsis, a full stop, a
# hyphen, an em dash, a semicolon and a newline came out at 1.97, 1.97, 1.97,
# 2.01, 1.99, 1.99, 2.01 and 1.97 seconds. Kokoro's phonemizer flattens every
# punctuation mark to the same near-nothing pause, so no amount of rewriting the
# text buys a breath.
#
# So the silence is INSERTED, not requested. Four takes of one paragraph were
# rendered for his ears and he chose "a breath at each seam": her existing
# chunks, unchanged, with real silence appended to each. What he compared was
# 19.9s (today, no gaps), 20.9s (this), 21.7s (one utterance per sentence) and
# 26.2s (split at commas too). Both bigger takes re-cut her audio at finer
# grain — which is exactly what produced the metronome the batcher was built to
# cure — while this one adds silence and changes nothing about where she is cut.
#
# It rides the END of a chunk rather than the start of the next one so this file
# needs no idea of ordering: chunks play back to back, so a tail on each is a gap
# between each. The final chunk of a turn gets one too — inaudible, and cheaper
# than the state it would take to avoid.
#
# Note for `sentence_batcher.py`: every chunk now plays LONGER than
# CHARS_PER_SECOND models it, so her real lead is bigger than the allowance
# arithmetic believes. That is the safe direction — it can only make a chunk
# smaller than it could have been, never leave her running dry.
SEAM_PAUSE = 0.35      # seconds of silence after every rendered chunk

# The seam pause is where this ends, and 2026-08-20 is the second time reality
# said so. Jason asked again for real pauses INSIDE a sentence — at commas, em
# dashes, colons — because an em dash currently reads faster than a plain space.
# Two ways were built and rendered for him: splicing extra silence into the
# quiet dip Kokoro already leaves at each mark (one continuous render, her
# cadence untouched), and the old cut-at-commas take with every fragment pinned
# to the parent sentence's delivery row. His verdict on all four takes, in one
# word: "horrendous" — the default beat every one of them, and he declined to
# iterate. The splice approach also has a hard ceiling worth recording: where
# Kokoro leaves no dip at all (the second dash of "somebody — us —", his own
# example) there is nothing to widen, so the cut lands mid-sound and clicks.
# DO NOT REBUILD THIS. Mid-sentence pauses are closed.

# --- questions go up at the end (2026-08-20, Jason's pick) --------------------
# He asked why a question mark sounds identical to a full stop, and it does:
# rendered both ways, "You went to the store?" ends LOWER than the statement.
# The mark reaches the model intact (the phonemizer keeps it), the model just
# does not act on it. Bending the finished audio was tried first and is DEAD —
# resampling moves the size of the speaker with the note, so a real rise turns
# her into a chipmunk, and the formant-preserving shifter is not installed.
#
# The rise instead comes from Kokoro's own melody. Sweeping one question across
# all 510 delivery rows (2026-08-20): 490 of them END A QUESTION FALLING, by a
# flat ~90Hz from row 50 to row 510 — there is no band of "question rows" in
# the table. The lift lives only where the row is far BELOW the sentence's own
# length, i.e. in the squeeze itself, peaking around a third.
#
# So the row is a FRACTION of the sentence rather than a fixed number, which is
# also why a fixed row could never work: row 20 is a squeeze for a 60-sound
# question and a stretch for a 15-sound one.
#
# NOT COMPENSATED, and that was a real fork. The squeeze also speeds the line up
# ~25%, and the pace knob can give the time back to within a hundredth of a
# second (measured). Jason heard four long questions both ways on 2026-08-20 and
# liked them equally, so the simpler one ships — and a question being a little
# brisk is what people actually do.
#
# HONEST LIMIT, in his words: "it works sometimes, which is better than the
# default, which is it works never." Some questions still land flat. Do not
# chase universality here — the settings that force the stubborn ones up are the
# same settings that wreck the ones already working.
QUESTION_SQUEEZE = 0.35
QUESTION_FLOOR = 6     # below this the row stops meaning anything

# Any sentence-ending mark other than the final one: see is_lone_question.
_MID_SENTENCE_END = re.compile(r"[.!?]")

# --- how the two speed knobs follow sentence length ---------------------------
# The anchors are the longest line Jason approved as "short" and the shortest he
# approved as "long". Between them the settings ramp; outside them they hold.
SHORT_AT = 52
LONG_AT = 94
CEILING_SHORT, CEILING_LONG = 40, 70
SPEED_SHORT, SPEED_LONG = 1.15, 1.00


def _length_mix(n_sounds: int) -> float:
    """0.0 for anything short, 1.0 for anything long, a ramp in between."""
    if n_sounds <= SHORT_AT:
        return 0.0
    if n_sounds >= LONG_AT:
        return 1.0
    return (n_sounds - SHORT_AT) / (LONG_AT - SHORT_AT)


def settings_for(n_sounds: int) -> tuple[int, float]:
    """The delivery row and speed for a sentence of this many sounds."""
    mix = _length_mix(n_sounds)
    ceiling = CEILING_SHORT + mix * (CEILING_LONG - CEILING_SHORT)
    speed = SPEED_SHORT + mix * (SPEED_LONG - SPEED_SHORT)
    return min(n_sounds, int(round(ceiling))), speed


def build_style(kokoro) -> np.ndarray:
    """Heart's throat, alice's movement, pushed past her. Built once, reused."""
    heart = kokoro.get_voice_style(TIMBRE)
    alice = kokoro.get_voice_style(DONOR)
    movement = heart[:, :, 128:] * (1 - MOVEMENT) + alice[:, :, 128:] * MOVEMENT
    return np.concatenate([heart[:, :, :128], movement], axis=-1)


def _lift(samples: np.ndarray, rate: int, semitones: float) -> np.ndarray:
    """Raise the note without changing how long the line takes.

    asetrate replays the samples on a faster clock — pitch and formants rise
    together, and the line gets shorter — then atempo puts the length back.

    An earlier version tried to avoid this subprocess by asking Kokoro for a
    proportionally slower render and letting the resample bring it home. That is
    wrong, and measurably so: Kokoro's speed input is not linear. Asking for 0.90
    instead of 1.00 buys only 5.5% more time, not 11%, so the trick landed the
    long paragraph 3.6% fast — on the exact axis Jason rejected as rushed. This
    chain is the one that produced the clips he approved, so this chain ships.
    Cost is a few milliseconds against a render measured in whole seconds.
    """
    factor = 2 ** (semitones / 12)
    audio = np.ascontiguousarray(samples, dtype=np.float32)
    # Raw float in, raw float out: no WAV headers to disagree about, and no
    # temporary files on the speaking path.
    done = subprocess.run(
        ["ffmpeg", "-loglevel", "error",
         "-f", "f32le", "-ar", str(rate), "-ac", "1", "-i", "pipe:0",
         "-af", f"asetrate={rate}*{factor:.6f},aresample={rate},"
                f"atempo={1 / factor:.6f}",
         "-f", "f32le", "pipe:1"],
        input=audio.tobytes(), stdout=subprocess.PIPE, check=True,
    )
    return np.frombuffer(done.stdout, dtype=np.float32)


def is_lone_question(text: str) -> bool:
    """A chunk that is exactly one question and nothing else.

    The squeeze below clips the WHOLE chunk, and the batcher hands this
    function up to four sentences at a time. Squeezing "It ran. It ran fine.
    Want me to check?" would clip all three to get a lilt on the last one, so
    the rule only fires when there is nothing else in the chunk to damage.
    """
    body = (text or "").strip()
    return body.endswith("?") and not _MID_SENTENCE_END.search(body[:-1])


# Kokoro's hard ceiling is 510 phonemes; past it the tokenizer RAISES and the
# whole chunk renders as nothing. On 2026-08-20 that silently swallowed two
# entire paragraphs of a stress test — the words were on Jason's screen, the
# audio was zero seconds long, and the window skipped them without a sound.
# The batcher caps a BATCH at 450 characters, but one sentence longer than that
# is emitted whole and sails straight past the cap, which is exactly what a
# deliberately monstrous sentence is. So the guard lives HERE, at the last
# place before the engine, where nothing can route around it.
#
# A split costs a restarted pitch arc at the seam — the metronome effect the
# batcher exists to avoid — so it is done only when unavoidable, and at the
# most natural break available: a clause boundary, longest-first, so the pieces
# come out as close to even as they can.
PHONEME_CEILING = 480     # 510 with headroom for the phonemizer's own variance
CLAUSE_PAUSE = 0.24       # what a comma is worth in her voice, measured


def _sounds(kokoro, text: str) -> int:
    """How many phonemes this text is, measured the way the engine measures it.

    Counts the PHONEME STRING rather than the token list, because
    `tokenizer.tokenize()` is exactly what raises on anything over the ceiling
    — asking it how long a too-long sentence is throws the error we are here to
    avoid. The check inside the library is `len(phonemes) > 510` on this same
    string, so this is its own yardstick, not an approximation.
    """
    return len(kokoro.tokenizer.phonemize(text, "en-us"))


def split_to_fit(kokoro, text: str) -> list[str]:
    """One rendering-sized piece per element, splitting only if forced."""
    if _sounds(kokoro, text) <= PHONEME_CEILING:
        return [text]
    # Clause marks first, then any space, because a piece that still does not
    # fit is worse than an ugly break.
    for pattern in (r"(?<=[;:])\s+", r"(?<=,)\s+", r"\s+"):
        parts, buf = [], ""
        for bit in re.split(pattern, text):
            candidate = f"{buf} {bit}".strip() if buf else bit
            if buf and _sounds(kokoro, candidate) > PHONEME_CEILING:
                parts.append(buf)
                buf = bit
            else:
                buf = candidate
        if buf:
            parts.append(buf)
        if all(_sounds(kokoro, p) <= PHONEME_CEILING for p in parts):
            return parts
    return parts


def speak(kokoro, style: np.ndarray, text: str) -> tuple[np.ndarray, int]:
    """One sentence in March's voice. Returns samples and sample rate."""
    pieces = split_to_fit(kokoro, text)
    if len(pieces) > 1:
        out, rate = [], 24000
        for i, piece in enumerate(pieces):
            samples, rate = _render_one(kokoro, style, piece)
            if i < len(pieces) - 1:
                # Trim this piece's own seam tail and give it a comma instead;
                # the full seam pause belongs at the end of the whole chunk.
                samples = samples[:-int(SEAM_PAUSE * rate)]
                samples = np.concatenate(
                    [samples, np.zeros(int(CLAUSE_PAUSE * rate), dtype=samples.dtype)]
                )
            out.append(samples)
        return np.concatenate(out), rate
    return _render_one(kokoro, style, text)


def _render_one(kokoro, style: np.ndarray, text: str) -> tuple[np.ndarray, int]:
    """One piece that is known to fit inside the engine's ceiling."""
    sounds = _sounds(kokoro, text)
    row, speed = settings_for(sounds)
    if is_lone_question(text):
        row, speed = max(QUESTION_FLOOR, int(round(QUESTION_SQUEEZE * sounds))), 1.0

    # Every row set to the chosen one, so whatever length Kokoro thinks it has,
    # this is the delivery it gets.
    pinned = np.repeat(style[row:row + 1], style.shape[0], axis=0)

    samples, rate = kokoro.create(text, voice=pinned, speed=speed, lang="en-us")
    lifted = _lift(samples, rate, SEMITONES)

    # The breath. Appended after the lift so the pause is exactly SEAM_PAUSE
    # seconds — _lift resamples, and padding before it would be stretched too.
    tail = np.zeros(int(SEAM_PAUSE * rate), dtype=lifted.dtype)
    return np.concatenate([lifted, tail]), rate
