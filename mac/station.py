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
import json, os, subprocess, sys, time
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
TZ = timezone(timedelta(hours=7))  # Chiang Mai, no daylight saving
MODEL = 'claude-haiku-5-5'
EFFORT = 'low'  # thinking was two thirds of the first test's cost
GAPS = {'firstLeadMs': 1000, 'leadMs': 200, 'holdMs': 600}

args = [a for a in sys.argv[1:] if not a.startswith('--')]
ONCE = '--once' in sys.argv
DATE = args[0] if args else datetime.now(TZ).date().isoformat()
AHEAD = int(args[1]) if len(args) > 1 else 20
DAY = f'day/{DATE}.json'
INBOX = f'inbox/{DATE}'


def read(p, default=''):
    try:
        return open(p).read()
    except FileNotFoundError:
        return default


def ask(system, user, label):
    """One plain model call. Returns its text; logs its cost."""
    r = subprocess.run(
        ['claude', '-p', '--model', MODEL, '--effort', EFFORT, '--system-prompt', system,
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

WRITER = f"""You write ONE segment of a channel that tells J's real day as an epic, as data.
Output ONLY one JSON object: {{"title": "...", "sources": [{{"kind": "commit|day-note|note", "repo": "...", "text": "..."}}], "lines": [{{"speaker": "...", "text": "...", "emotion": "...", "action": "...", "source": 0}}]}}
- About 18 lines. Speakers: narrator, march. Emotions: neutral, happy, dry, surprised. Actions: none, point, facepalm; the narrator's action is always none.
- sources: one entry per inbox item used, its text copied WORD FOR WORD from the inbox. Every line has a source index.
- Never invent an event. The telling may make the day feel big; it never says he did a thing he did not do.
- NO NUMBERS AT ALL: no digits and no number words (not one, two, three, first, second, twice, a pair, a dozen). Say 'again', 'another', 'more' instead.
- Tell events only in the order the record gives; never say what came first unless the source says it. No names of people other than J. No clients, money, health, visa, family.
- Short sentences, plain words. One or two sentences a line.

# March
{read('station/march.md')}
# The narrator
{read('station/narrator.md')}
# Forbidden
{read('forbidden.md')}"""


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
    used, titles, tail = told(day)
    new = [l for l in INBOX_TEXT.splitlines() if l.strip() and not l.startswith('##') and not any(l.strip('- ').strip() in u or u in l for u in used)]
    quiet = not new
    if quiet and day['segments'] and day['segments'][-1].get('quiet'):
        return 'nothing new, and the last segment was already a quiet one'
    ask_for = ('Nothing in the inbox is new. Write a QUIET segment: on one of the notes, or a short beat that says '
               'plainly the day has been quiet and looks back on one thing already told, in new words.' if quiet
               else 'Write the next segment, about inbox items NOT already told.')
    user = (f"The inbox:\n{INBOX_TEXT}\n\nAlready told today (titles): {titles}\n"
            f"Inbox items already used: {used}\nThe last two lines on air: {json.dumps(tail)}\n\n{ask_for}")
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
            return trial
        # Cut the flagged lines rather than rewrite: a cut can only remove a
        # claim, never add one, so it needs no second truth check. Rewrites
        # kept trading one small stretch for another (8 Oct 2026, four tries).
        import re
        bad = {int(m) for m in re.findall(r'line (\d+)', verdict)}
        kept = [l for i, l in enumerate(seg['lines']) if i not in bad]
        if bad and len(kept) >= 12:
            seg['lines'] = kept
            trial = dict(day, segments=day['segments'] + [seg])
            json.dump(trial, open(DAY, 'w'), indent=1, ensure_ascii=False)
            if validate()[0]:
                print(f'station: cut {len(bad)} flagged line(s): {verdict[:300]}', flush=True)
                return trial
        print(f'station: try {attempt + 1} flagged by the truth check: {verdict[:300]}', flush=True)
        feedback = f'\n\nA fresh reader flagged these lines against the record. Rewrite or cut them:\n{verdict}'
    json.dump(day, open(DAY, 'w'), indent=1, ensure_ascii=False)  # put the day back as it was
    return f'four tries refused; last finding: {feedback.strip()[:400]}'


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
    subprocess.run(['git', 'pull', '-q', '--rebase', '--autostash'], check=True)
    made = 0
    while True:
        day = load_day()
        end = day_end(day)
        if end and end > datetime.now(TZ) + timedelta(minutes=AHEAD):
            print(f'station: ahead of the clock; the day ends {end:%H:%M}'); break
        result = one_segment(day)
        if isinstance(result, str):
            print(f'station: stopped, {result}'); break
        publish(1)
        made += 1
        print(f'station: segment {made} on air, "{result["segments"][-1]["title"]}"', flush=True)
        if ONCE:
            break
    print(f'station: {made} segment(s) made')


if __name__ == '__main__':
    main()
