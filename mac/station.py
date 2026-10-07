#!/usr/bin/env python3
"""station.py: the station, run on the Mac the way PNN runs (J's call, 8 Oct 2026).

Why this exists: a cloud agent session paid 3 to 9 cents a segment, because
every step (check, truth check, voice, push) was another agent turn re-reading
Claude Code's whole memory. PNN pays for one plain model request per segment
and does the rest with ordinary programs. This does the same: one headless
`claude -p` call writes a segment (no tools, no Claude Code instructions, our
own sheets only), one more call is the truth check, and the checker, Kokoro and
git are plain programs. The calls bill J's plan, not an API key; measured
8 Oct 2026: one segment written for $0.0032 of API-equivalent usage.

Usage: python3 mac/station.py [YYYY-MM-DD] [MINUTES_AHEAD] [--once]
Needs the inbox from mac/gather.sh. Logs each call's cost to inbox/<date>/costs.tsv
(the inbox is never committed).
"""
import hashlib, json, os, subprocess, sys, time
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
TZ = timezone(timedelta(hours=7))  # Chiang Mai, no daylight saving
MODEL = 'claude-haiku-5-5'
EFFORT = 'low'  # thinking was two thirds of the first test's cost
GAPS = {'firstLeadMs': 1000, 'leadMs': 200, 'holdMs': 600}

args = [a for a in sys.argv[1:] if not a.startswith('--')]
ONCE = '--once' in sys.argv
# --lab writes text only into a private copy of the day (never voiced, never
# pushed) so versions can be read side by side before anything airs.
LAB = '--lab' in sys.argv
PLANNER = 'claude-sonnet-5-5'  # plans the day's scenes once per run; depth where it pays
DATE = args[0] if args else datetime.now(TZ).date().isoformat()
AHEAD = int(args[1]) if len(args) > 1 else 20
INBOX = f'inbox/{DATE}'
DAY = f'{INBOX}/lab-day.json' if LAB else f'day/{DATE}.json'
ARC = f'{INBOX}/{"lab-" if LAB else ""}arc.json'


def read(p, default=''):
    try:
        return open(p).read()
    except FileNotFoundError:
        return default


def ask(system, user, label, model=MODEL):
    """One plain model call. Returns its text; logs its cost."""
    r = subprocess.run(
        ['claude', '-p', '--model', model, '--effort', EFFORT, '--system-prompt', system,
         '--tools', '', '--strict-mcp-config', '--setting-sources', '',
         '--no-session-persistence', '--output-format', 'json'],
        input=user, capture_output=True, text=True, timeout=300)
    d = json.loads(r.stdout)
    u = d.get('usage', {})
    with open(f'{INBOX}/costs.tsv', 'a') as f:
        f.write(f"{datetime.now(TZ).isoformat(timespec='seconds')}\t{label}\t{d.get('total_cost_usd')}\t"
                f"{u.get('output_tokens')}\t{d.get('duration_ms')}\n")
    if d.get('is_error'):
        raise RuntimeError(f'{label}: {d.get("result")}')
    return d['result']


def as_json(text):
    s = text[text.index('{'):text.rindex('}') + 1]
    return json.loads(s)


INBOX_TEXT = ('## commits\n' + read(f'{INBOX}/commits.md') + '\n## day-note\n' + read(f'{INBOX}/day-note.md')
              + '\n## notes\n' + read(f'{INBOX}/notes.md'))

WRITER = '\n\n'.join([read('station/writer.md'), '# March\n' + read('station/march.md'),
                       '# The narrator\n' + read('station/narrator.md'), '# Forbidden\n' + read('forbidden.md')])

PLAN_SHEET = f"""You plan the day's chapter for a channel that tells J's real day as an epic. Read the writer's sheet below, then split the inbox into SCENES: each one moment with a fight or a turn or a feeling, told close. Order them so the day has an arc: a strong opening scene, the hardest fight in the middle, an ending with meaning. Use only what the inbox shows. RANK BY DRAMA: scenes with J's own words, a real fight, a failure or a turn come first and get the most room. Machinery with no fight in it (code changes, settings, files) is merged into one short scene near the end, or skipped. Never plan a scene whose only content is a technical change.
Output ONLY JSON: {{"scenes": [{{"moment": "...", "fight": "...", "turn": "...", "quote": "J's exact words from the inbox, or empty", "meaning": "...", "callback": "an earlier scene this one can echo, or empty", "items": ["the exact inbox lines or day-note paragraphs this scene uses"]}}]}}

{read('station/writer.md')}"""


def load_day():
    if os.path.exists(DAY):
        return json.load(open(DAY))
    return {'date': DATE, 'tz': 'Asia/Bangkok', 'segments': []}


def day_end(day):
    if not day['segments']:
        return None
    last = day['segments'][-1]
    ms = sum((GAPS['firstLeadMs'] if i == 0 else GAPS['leadMs']) + l.get('audioMs', len(l['text']) * 1000 // 16)
             + GAPS['holdMs'] for i, l in enumerate(last['lines']))
    return datetime.fromisoformat(last['startAt']) + timedelta(milliseconds=ms)


def told(day):
    used = [s['text'] for seg in day['segments'] for s in seg['sources']]
    titles = [seg['title'] for seg in day['segments']]
    tail = day['segments'][-1]['lines'][-2:] if day['segments'] else []
    return used, titles, tail


def validate():
    r = subprocess.run(['node', 'station/validate.mjs', DAY], capture_output=True, text=True)
    return r.returncode == 0, (r.stdout + r.stderr).strip()


def one_segment(day):
    # The trial segment is written to disk before it is checked; any failure
    # puts the day back, or the next run would count an unchecked segment as told.
    try:
        return _one_segment(day)
    except BaseException:
        json.dump(day, open(DAY, 'w'), indent=1, ensure_ascii=False)
        raise


def plan(day):
    """The day's arc, made once by the planner and reused; made again only when
    the inbox has grown and every planned scene is told."""
    key = hashlib.sha1(INBOX_TEXT.encode()).hexdigest()
    arc = json.load(open(ARC)) if os.path.exists(ARC) else None
    if arc and (arc['next'] < len(arc['scenes']) or arc['key'] == key):
        return arc
    used, titles, _ = told(day)
    out = as_json(ask(PLAN_SHEET, f"The inbox:\n{INBOX_TEXT}\n\nAlready told today (titles): {titles}\n"
                      f"Inbox items already used, do not plan them again: {used}", 'plan', PLANNER))
    arc = {'key': key, 'next': 0, 'scenes': out['scenes']}
    json.dump(arc, open(ARC, 'w'), indent=1, ensure_ascii=False)
    return arc


def _one_segment(day):
    used, titles, tail = told(day)
    arc = plan(day)
    quiet = arc['next'] >= len(arc['scenes'])
    if quiet and day['segments'] and day['segments'][-1].get('quiet'):
        return 'nothing new, and the last segment was already a quiet one'
    scene = None if quiet else arc['scenes'][arc['next']]
    ask_for = ('Nothing in the inbox is new. Write a QUIET scene: on one of the notes, or a short beat that '
               'looks back on one thing already told, in new words.' if quiet
               else f'Write this scene, the next in the day\'s arc:\n{json.dumps(scene, ensure_ascii=False)}')
    user = (f"The inbox:\n{INBOX_TEXT}\n\nAlready told today (titles): {titles}\n"
            f"The last two lines on air: {json.dumps(tail, ensure_ascii=False)}\n\n{ask_for}")
    feedback = ''
    for attempt in range(4):
        seg = as_json(ask(WRITER, user + feedback, f'write#{attempt}'))
        n = len(day['segments']) + 1
        prev_end = day_end(day)
        start = max(prev_end, datetime.now(TZ) + timedelta(seconds=60)) if prev_end else datetime.now(TZ) + timedelta(seconds=60)
        seg = {'id': f'{DATE}-{n:02d}', 'title': seg['title'], 'startAt': start.isoformat(timespec='milliseconds'),
               'audio': None, 'gaps': GAPS, 'sources': seg['sources'], 'lines': seg['lines']}
        if quiet:
            seg['quiet'] = True
        trial = dict(day, segments=day['segments'] + [seg])
        json.dump(trial, open(DAY, 'w'), indent=1, ensure_ascii=False)
        ok, out = validate()
        if not ok:
            feedback = f'\n\nYour last try was refused by the checker. Fix these and write it again:\n{out}'
            print(f'station: try {attempt + 1} refused by the checker: {out[:300]}', flush=True)
            continue
        verdict = ask(read('station/truth-check.md'), f'The chapter:\n{json.dumps(seg, ensure_ascii=False)}\n\nThe inbox:\n{INBOX_TEXT}', f'truth#{attempt}')
        if verdict.strip() == 'CLEAN':
            return done(trial, arc, quiet)
        # Cut the flagged lines rather than rewrite: a cut can only remove a
        # claim, never add one, so it needs no second truth check. Rewrites
        # kept trading one small stretch for another (8 Oct 2026, four tries).
        import re
        bad = {int(m) for m in re.findall(r'(?m)^\S+ line (\d+):', verdict)}
        # Repair first: the writer rewrites only the flagged lines, keeping the
        # talk flowing. A plain cut left March answering a question nobody
        # asked (lab, 8 Oct 2026). The repair is checked again like a new try.
        try:
            fixed = as_json(ask(WRITER, f"The inbox:\n{INBOX_TEXT}\n\nThis segment:\n{json.dumps(seg, ensure_ascii=False)}\n\n"
                                f"A fresh reader flagged these lines (counted from 0):\n{verdict}\n\nRewrite ONLY those lines so they "
                                "claim nothing the inbox does not show, and adjust a neighbouring line only if the talk would not "
                                "flow. Return the whole segment JSON.", f'repair#{attempt}'))
            seg2 = dict(seg, lines=fixed['lines'])
            trial2 = dict(day, segments=day['segments'] + [seg2])
            json.dump(trial2, open(DAY, 'w'), indent=1, ensure_ascii=False)
            if validate()[0] and ask(read('station/truth-check.md'), f'The chapter:\n{json.dumps(seg2, ensure_ascii=False)}\n\nThe inbox:\n{INBOX_TEXT}', f'truth-repair#{attempt}').strip() == 'CLEAN':
                print(f'station: repaired {len(bad)} flagged line(s)', flush=True)
                return done(trial2, arc, quiet)
        except (ValueError, KeyError, RuntimeError, subprocess.TimeoutExpired):
            pass
        kept = [l for i, l in enumerate(seg['lines']) if i not in bad]
        if bad and len(kept) >= 12:
            seg['lines'] = kept
            trial = dict(day, segments=day['segments'] + [seg])
            json.dump(trial, open(DAY, 'w'), indent=1, ensure_ascii=False)
            if validate()[0]:
                print(f'station: cut {len(bad)} flagged line(s): {verdict[:300]}', flush=True)
                return done(trial, arc, quiet)
        print(f'station: try {attempt + 1} flagged by the truth check: {verdict[:300]}', flush=True)
        feedback = f'\n\nA fresh reader flagged these lines against the record. Rewrite or cut them:\n{verdict}'
    json.dump(day, open(DAY, 'w'), indent=1, ensure_ascii=False)  # put the day back as it was
    if not quiet:  # skip a scene that can never pass, so it cannot stall the day
        arc['next'] += 1
        json.dump(arc, open(ARC, 'w'), indent=1, ensure_ascii=False)
    return f'four tries refused, scene skipped; last finding: {feedback.strip()[:400]}'


def done(trial, arc, quiet):
    if not quiet:
        arc['next'] += 1
        json.dump(arc, open(ARC, 'w'), indent=1, ensure_ascii=False)
    return trial


def show(seg):
    print(f'\n== {seg["title"]} ==')
    for l in seg['lines']:
        print(f'{l["speaker"].upper():9} {l["text"]}')


def publish(n_new):
    subprocess.run([os.path.join(ROOT, 'station/.venv/bin/python'), 'station/voice.py', DAY, '--budget', '480'], check=True)
    ok, out = validate()
    if not ok:
        raise RuntimeError(f'checker refused after voicing: {out}')
    subprocess.run(['git', 'add', DAY, f'audio/{DATE}'], check=True)
    subprocess.run(['git', 'commit', '-qm', f'chronicle: {DATE}, {n_new} segment(s) (Mac station)'], check=True)
    subprocess.run(['git', 'pull', '-q', '--rebase', '--autostash'], check=True)
    subprocess.run(['git', 'push', '-q'], check=True)


def main():
    if not os.path.exists(f'{INBOX}/commits.md'):
        sys.exit(f'station: no inbox for {DATE}; run mac/gather.sh first')
    if LAB:
        if not os.path.exists(DAY):
            json.dump(json.load(open(f'day/{DATE}.json')) if os.path.exists(f'day/{DATE}.json') else
                      {'date': DATE, 'tz': 'Asia/Bangkok', 'segments': []}, open(DAY, 'w'))
    else:
        subprocess.run(['git', 'pull', '-q', '--rebase', '--autostash'], check=True)
    made = 0
    while True:
        day = load_day()
        end = day_end(day)
        if not LAB and end and end > datetime.now(TZ) + timedelta(minutes=AHEAD):
            print(f'station: ahead of the clock; the day ends {end:%H:%M}'); break
        result = one_segment(day)
        if isinstance(result, str):
            print(f'station: stopped, {result}'); break
        made += 1
        if LAB:
            show(result['segments'][-1])
            if made >= int(os.environ.get('LAB_N', '1')):
                break
            continue
        publish(1)
        print(f'station: segment {made} on air, "{result["segments"][-1]["title"]}"', flush=True)
        if ONCE:
            break
    print(f'station: {made} segment(s) made')


if __name__ == '__main__':
    main()
