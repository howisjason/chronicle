#!/usr/bin/env python3
"""station.py: the channel's station, run on J's Mac the way PNN runs.

What it tells (J's call, 8 Oct 2026): only the notes in his Obsidian vault, the
way PNN tells its news feeds. Each scene is one or two notes from the pool
(mac/pool.py, every note passed by a blind reviewer) seen through one angle from
his own "AI Prompts For Obsidian Notes" list ("What would happen if this idea
were merged with another one of my notes? ... infinite combinations"). No daily
progress, no commits, no session text.

How (the PNN way): one plain headless `claude -p` call writes a scene (Haiku 5.5,
no tools, no Claude Code instructions, our own sheets as the system prompt); the
checker (station/validate.mjs) and a second call, the truth check, guard it;
Kokoro voices it on the Mac; the words are committed to main forever
(day/<date>.json, the transcripts), and the sound goes to the `audio` branch,
which holds only the last hour and no history (J: keep the transcripts, not the
sound). Calls bill his plan. Measured 8 Oct 2026: about half a cent of
API-equivalent usage per clean scene.

Usage: python3 mac/station.py [MINUTES_AHEAD] [--once] [--lab]
  --lab writes text only into inbox/lab-day.json: never voiced, never pushed.
Each call's cost goes to inbox/costs.tsv (never committed).
"""
import json, os, random, re, shutil, subprocess, sys
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, 'mac'))
import pool  # noqa: E402

TZ = timezone(timedelta(hours=7))  # Chiang Mai, no daylight saving
# CHRONICLE_MODEL lets a lab round try another writer on the same sheets (8 Oct 2026).
MODEL, EFFORT = os.environ.get('CHRONICLE_MODEL', 'claude-haiku-5-5'), 'low'
# The truth check stays on Haiku whatever writes: in the 8 Oct lab an Opus truth
# check cost about 3.5 cents a scene against Haiku's 0.1, for the same job.
CHECK_MODEL = 'claude-haiku-5-5'
GAPS = {'firstLeadMs': 1000, 'leadMs': 200, 'holdMs': 600}
ANGLES_FILE = '/Users/howisjason/Projects/personal/context/obsidian/💡 Meta/⚡️ AI Prompts For Obsidian Notes.md'
AUDIO_KEEP = timedelta(hours=1)
# The daily cap, in API-equivalent dollars of plan usage (J: track it on its
# own, 8 Oct 2026). The Pro window is shared with his own work; PNN runs on
# about $3 a day. The cap lives in inbox/daily-cap.txt so it can change without
# a commit; the button shows today's spend against it.
DEFAULT_CAP = 2.00

args = [a for a in sys.argv[1:] if not a.startswith('--')]
ONCE, LAB = '--once' in sys.argv, '--lab' in sys.argv
AHEAD = int(args[0]) if args else 20
os.makedirs('inbox', exist_ok=True)


def today():
    return datetime.now(TZ).date().isoformat()


def day_path():
    return f'inbox/lab{os.environ.get("LAB_TAG", "")}-day.json' if LAB else f'day/{today()}.json'


def read(p):
    return open(p).read()


def ask(system, user, label, model=None):
    """One plain model call. Returns its text; logs its cost."""
    label = os.environ.get('LAB_TAG', '') + label
    r = subprocess.run(
        ['claude', '-p', '--model', model or MODEL, '--effort', EFFORT, '--system-prompt', system,
         '--tools', '', '--strict-mcp-config', '--setting-sources', '',
         '--no-session-persistence', '--output-format', 'json'],
        input=user, capture_output=True, text=True, timeout=300)
    d = json.loads(r.stdout)
    with open('inbox/costs.tsv', 'a') as f:
        f.write(f"{datetime.now(TZ).isoformat(timespec='seconds')}\t{label}\t{d.get('total_cost_usd')}\t"
                f"{d.get('usage', {}).get('output_tokens')}\t{d.get('duration_ms')}\n")
    if d.get('is_error'):
        raise RuntimeError(f'{label}: {d.get("result")}')
    return d['result']


def spent_today():
    day = datetime.now(TZ).date().isoformat()
    total = 0.0
    if os.path.exists('inbox/costs.tsv'):
        for line in open('inbox/costs.tsv'):
            f = line.rstrip('\n').split('\t')
            if f[0].startswith(day) and len(f) > 2:
                try:
                    total += float(f[2])
                except ValueError:
                    pass
    return total


def cap():
    try:
        return float(open('inbox/daily-cap.txt').read().strip())
    except (FileNotFoundError, ValueError):
        return DEFAULT_CAP


def as_json(text):
    return json.loads(text[text.index('{'):text.rindex('}') + 1])


def angles():
    """The angle prompts from his own list, the 'Generating New Innovative Ideas' section."""
    text = read(ANGLES_FILE)
    sec = text.split('# Generating New Innovative Ideas', 1)[1].split('\n---', 1)[0]
    return [m.strip() for m in re.findall(r'(?m)^- (.+)$', sec)]


def sheet_and_details(path):
    """A character sheet without its Details list, and the list itself: PNN hands
    its writer two random details per character each segment, so the same
    character shows a new side without the sheet growing."""
    text = read(path)
    if '## Details' not in text:
        return text, []
    head, rest = text.split('## Details', 1)
    body, _, tail = rest.partition('\n## ')
    details = re.findall(r'(?m)^- (.+)$', body)
    return head + ('## ' + tail if tail else ''), details


# CHRONICLE_SHEETS lets a lab round try another set of the three sheets (8 Oct 2026).
SHEETS = os.environ.get('CHRONICLE_SHEETS', 'station')
MARCH_SHEET, MARCH_DETAILS = sheet_and_details(f'{SHEETS}/march.md')
NARR_SHEET, NARR_DETAILS = sheet_and_details(f'{SHEETS}/narrator.md')
WRITER = '\n\n'.join([read(f'{SHEETS}/writer.md'), '# March\n' + MARCH_SHEET,
                      '# The narrator\n' + NARR_SHEET, '# Forbidden\n' + read('forbidden.md')])
# LAB_TAG keeps parallel lab rounds in their own files.
TAG = os.environ.get('LAB_TAG', '')
RUN = f'inbox/lab{TAG}-run.json' if '--lab' in sys.argv else 'inbox/run.json'
# The show's memory: at most ten lines about the show itself (the score between
# them, feuds, the image planted in a run, jokes and when they were last used),
# rewritten whole by the writer after every scene. It replaced the running-bits
# list (8 Oct 2026), which only appended and so fed the same jokes back in.
MEMORY = f'inbox/lab{TAG}-memory.json' if '--lab' in sys.argv else 'inbox/memory.json'


def kinds():
    """The segment kinds (PNN airs dozens; one kind made every scene the same
    shape): '- name: the one line handed to the writer'."""
    p = f'{SHEETS}/kinds.md'
    return dict(re.findall(r'(?m)^- (\w+): (.+)$', read(p))) if os.path.exists(p) else {}


def kind_for(run):
    """Part 1 opens, the last part is the verdict, the parts between draw from the
    rest without repeating within the run."""
    k = kinds()
    if not k:
        return None
    if run['n'] == 1:
        return 'open'
    if run['n'] == run['of']:
        return 'verdict'
    used = run.get('kinds', [])
    middle = [x for x in k if x not in ('open', 'verdict')]
    return random.choice([x for x in middle if x not in used] or middle)


def current_run(notes, recent_segs):
    """A run is the same notes told over several scenes, each through a new angle
    (PNN's shows run a topic in parts). A finished run starts a fresh pick: the
    one its verdict already teased as "up next", if those notes are still in the pool."""
    run = json.load(open(RUN)) if os.path.exists(RUN) else None
    if run and run['n'] < run['of'] and all(n in notes for n in run['notes']):
        run['n'] += 1
        left = [a for a in angles() if a not in run['angles']] or angles()
        run['angles'].append(random.choice(left))
    else:
        nxt = run.get('next') if run else None
        if nxt and all(n in notes for n in nxt[0]):
            chosen, angle = nxt
        else:
            chosen, angle = pick(notes, recent_segs)
        run = {'notes': chosen, 'n': 1, 'of': random.randint(3, 5), 'angles': [angle], 'kinds': []}
    run['kind'] = kind_for(run)
    if run['n'] == run['of'] and run['kind']:
        run['next'] = list(pick(notes, recent_segs + [{'notes': run['notes']}]))
    return run


def memory():
    return json.load(open(MEMORY)) if os.path.exists(MEMORY) else []


def load_day():
    p = day_path()
    if os.path.exists(p):
        return json.load(open(p))
    return {'date': today(), 'tz': 'Asia/Bangkok', 'segments': []}


def save(day):
    json.dump(day, open(day_path(), 'w'), indent=1, ensure_ascii=False)


def seg_ms(seg):
    return sum((GAPS['firstLeadMs'] if i == 0 else GAPS['leadMs']) + l.get('audioMs', len(l['text']) * 1000 // 16)
               + GAPS['holdMs'] for i, l in enumerate(seg['lines']))


def day_end(day):
    if not day['segments']:
        return None
    last = day['segments'][-1]
    return datetime.fromisoformat(last['startAt']) + timedelta(milliseconds=seg_ms(last))


def recent(n=60):
    """The last scenes aired, from today's and yesterday's transcripts, so the picker can avoid repeats."""
    out = []
    for d in (datetime.now(TZ).date() - timedelta(days=1), datetime.now(TZ).date()):
        p = f'day/{d.isoformat()}.json'
        if os.path.exists(p):
            out += json.load(open(p))['segments']
    return out[-n:]


def pick(notes, recent_segs):
    """One or two notes and one angle, avoiding notes and pairings used lately."""
    names = list(notes)
    used_notes = [n for s in recent_segs for n in s.get('notes', [])]
    used_pairs = {tuple(sorted(s.get('notes', []))) for s in recent_segs}
    used_angles = [s.get('angle') for s in recent_segs[-15:]]
    fresh = [n for n in names if n not in used_notes[-12:]] or names
    for _ in range(50):
        if random.random() < 0.7 and len(names) > 1:
            a = random.choice(fresh)
            b = random.choice([n for n in names if n != a])
            chosen = [a, b]
        else:
            chosen = [random.choice(fresh)]
        if tuple(sorted(chosen)) not in used_pairs:
            break
    angle_pool = [x for x in angles() if x not in used_angles] or angles()
    # His own note marks the merge prompt as the best one; with two notes it is
    # always the frame, and the angle is the extra twist.
    return chosen, random.choice(angle_pool)


def truth(seg, material):
    # The earlier scenes and the show's memory are passed too, so a callback to them
    # is not mistaken for an invented event (lab, 8 Oct 2026).
    earlier = [s['title'] for s in recent()[-8:]] + memory()
    return ask(read('station/truth-check.md'),
               f'The segment:\n{json.dumps(seg, ensure_ascii=False)}\n\nThe notes it was written from:\n{material}'
               f'\n\nEarlier scene titles and the channel memory (callbacks to these are allowed): {earlier}', 'truth', CHECK_MODEL).strip()


def one_segment(day):
    """Write, check and (if needed) repair one scene. Returns the new day, or a reason string."""
    notes = pool.notes()
    if not notes:
        return 'the pool is empty; run mac/pool.py'
    run = current_run(notes, recent() + day['segments'] if LAB else recent())
    chosen, angle = run['notes'], run['angles'][-1]
    material = '\n\n'.join(f'## NOTE: {n}\n{notes[n]}' for n in chosen)
    titles = [s['title'] for s in day['segments'][-8:]]
    # The whole previous scene, not only its last lines, so the next one can build
    # on anything in it and never repeat it (J: "things build on top of what has
    # already happened", 8 Oct 2026).
    prev = [{'speaker': l['speaker'], 'text': l['text']} for l in day['segments'][-1]['lines']] if day['segments'] else []
    frame = ('Merge these two notes: find where their ideas cross, and what the crossing shows that neither shows alone.'
             if len(chosen) == 2 else 'Take this one note deeper than it goes on its own.')
    part = (f"This is part {run['n']} of a run of {run['of']} on these notes"
            + (' (the LAST part: close the run, no hand-off question).' if run['n'] == run['of'] else '.'))
    kind = run.get('kind')
    if kind:
        part += f"\nThe kind of segment: {kinds().get(kind, '')}"
        if kind == 'verdict' and run.get('next'):
            part += f"\nUp next, to tease by name in the last line: {' and '.join(run['next'][0])}"
    # Saying the hour now and then makes a replay feel live (PNN does); only the
    # part of the day, never the place.
    h = (day_end(day) or datetime.now(TZ)).hour
    when = 'late at night' if h < 5 else 'in the morning' if h < 12 else 'in the afternoon' if h < 18 else 'in the evening' if h < 22 else 'late at night'
    part += f"\nThis scene airs {when}; mention it only if it fits naturally."
    user = (f"{material}\n\n{frame}\nThe angle for this scene: {angle}\n{part}\n\n"
            f"Two details for March this scene: {random.sample(MARCH_DETAILS, min(2, len(MARCH_DETAILS)))}\n"
            f"Two details for the narrator this scene: {random.sample(NARR_DETAILS, min(2, len(NARR_DETAILS)))}\n"
            f"The show's memory so far: {json.dumps(memory(), ensure_ascii=False)}\n\n"
            f"Recent scene titles (do not repeat them): {titles}\nThe previous scene on air, whole: {json.dumps(prev, ensure_ascii=False)}")
    feedback = ''
    for attempt in range(3):
        try:
            out = as_json(ask(WRITER, user + feedback, f'write#{attempt}'))
            # A JSON missing a part used to crash the whole run (lab, 8 Oct 2026); now it is a refused try.
            if not all(k in out for k in ('title', 'sources', 'lines')):
                raise KeyError('title, sources or lines missing')
        except (ValueError, KeyError):
            feedback = '\n\nYour last answer was not one complete JSON object with title, memory, sources and lines. Answer with only the JSON.'
            continue
        prev_end = day_end(day)
        soon = datetime.now(TZ) + timedelta(seconds=60)
        start = max(prev_end, soon) if prev_end else soon
        seg = {'id': f'{day["date"]}-{len(day["segments"]) + 1:02d}', 'title': out['title'],
               'startAt': start.isoformat(timespec='milliseconds'), 'audio': None, 'gaps': GAPS,
               'notes': chosen, 'angle': angle, 'kind': kind, 'sources': out['sources'], 'lines': out['lines']}
        trial = dict(day, segments=day['segments'] + [seg])
        save(trial)
        ok, msg = validate()
        if not ok:
            feedback = f'\n\nThe checker refused your last try. Fix these and write it again:\n{msg}'
            print(f'station: try {attempt + 1} refused by the checker: {msg[:200]}', flush=True)
            continue
        verdict = truth(seg, material)
        if verdict == 'CLEAN':
            return keep(trial, run, out.get('memory'))
        print(f'station: try {attempt + 1} flagged: {verdict[:200]}', flush=True)
        # Repair the flagged lines once; the repair is checked like a new try.
        try:
            fixed = as_json(ask(WRITER, f"{material}\n\nThis scene:\n{json.dumps(seg, ensure_ascii=False)}\n\n"
                                f"A fresh reader flagged these lines (counted from 0):\n{verdict}\n\nRewrite ONLY those "
                                "lines so they claim nothing the notes do not show, keeping the talk flowing. "
                                "Return the whole scene JSON.", f'repair#{attempt}'))
            seg2 = dict(seg, lines=fixed['lines'], sources=fixed.get('sources', seg['sources']))
            trial = dict(day, segments=day['segments'] + [seg2])
            save(trial)
            if validate()[0] and truth(seg2, material) == 'CLEAN':
                print('station: repaired', flush=True)
                return keep(trial, run, fixed.get('memory') or out.get('memory'))
        except (ValueError, KeyError, RuntimeError, subprocess.TimeoutExpired):
            pass
        feedback = f'\n\nA fresh reader flagged these lines. Write the scene again without them:\n{verdict}'
    save(day)
    if os.path.exists(RUN):
        os.remove(RUN)  # a pick that never passes ends its run
    return 'three tries refused; this pick is dropped'


def keep(trial, run, mem):
    """A scene passed: the run moves on, and the show's memory is replaced by the writer's update."""
    trial['segments'][-1]['part'] = {'n': run['n'], 'of': run['of']}
    save(trial)
    if run.get('kind'):
        run['kinds'] = run.get('kinds', []) + [run['kind']]
    json.dump(run, open(RUN, 'w'), indent=1, ensure_ascii=False)
    if isinstance(mem, list) and mem:
        json.dump([str(m).strip()[:200] for m in mem if str(m).strip()][:10], open(MEMORY, 'w'), indent=1, ensure_ascii=False)
    return trial


def validate():
    r = subprocess.run(['node', 'station/validate.mjs', day_path()], capture_output=True, text=True)
    return r.returncode == 0, (r.stdout + r.stderr).strip()


def push_audio(day):
    """The sound lives on the `audio` branch, rebuilt from nothing each time with only
    the files still on air or within the last hour, so no sound is ever kept."""
    # Yesterday's file too, so a scene still on air just after midnight keeps its sound.
    segs = list(day['segments'])
    y = f'day/{(datetime.now(TZ).date() - timedelta(days=1)).isoformat()}.json'
    if os.path.exists(y):
        segs = json.load(open(y))['segments'] + segs
    keep = [s for s in segs if s.get('audio') and
            datetime.fromisoformat(s['startAt']) + timedelta(milliseconds=seg_ms(s)) > datetime.now(TZ) - AUDIO_KEEP]
    d = 'inbox/audio-branch'
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    for s in keep:
        dst = os.path.join(d, s['audio'])
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy(s['audio'], dst)
    url = subprocess.run(['git', 'remote', 'get-url', 'origin'], capture_output=True, text=True).stdout.strip()
    g = lambda *a: subprocess.run(['git', '-C', d, *a], check=True, capture_output=True)
    g('init', '-q'); g('add', '-A'); g('commit', '-qm', 'audio: the last hour only', '--allow-empty')
    g('push', '-qf', url, 'HEAD:audio')
    # Local copies of anything older go too, and whole day folders once empty.
    keep_paths = {s['audio'] for s in keep}
    for root, _, files in os.walk('audio'):
        for f in files:
            p = os.path.join(root, f)
            if p not in keep_paths:
                os.remove(p)
    for root, dirs, _ in os.walk('audio', topdown=False):
        for x in dirs:
            if not os.listdir(os.path.join(root, x)):
                os.rmdir(os.path.join(root, x))


def publish(day):
    subprocess.run([os.path.join(ROOT, 'station/.venv/bin/python'), 'station/voice.py', day_path(), '--budget', '480'], check=True)
    ok, msg = validate()
    if not ok:
        raise RuntimeError(f'checker refused after voicing: {msg}')
    day = load_day()
    push_audio(day)  # the sound first, so it is there when the words go live
    subprocess.run(['git', 'add', day_path()], check=True)
    subprocess.run(['git', 'commit', '-qm', f'chronicle: {day["date"]}, a scene from the vault'], check=True)
    subprocess.run(['git', 'pull', '-q', '--rebase', '--autostash'], check=True)
    subprocess.run(['git', 'push', '-q'], check=True)


def main():
    if LAB and not os.path.exists(day_path()):
        json.dump({'date': today(), 'tz': 'Asia/Bangkok', 'segments': []}, open(day_path(), 'w'))
    if not LAB:
        subprocess.run(['git', 'pull', '-q', '--rebase', '--autostash'], check=True)
    made = fails = 0
    while True:
        if not LAB and spent_today() >= cap():
            print(f'station: today\'s cap reached (${spent_today():.2f} of ${cap():.2f}); the page replays until tomorrow'); break
        day = load_day()
        end = day_end(day)
        if not LAB and end and end > datetime.now(TZ) + timedelta(minutes=AHEAD):
            print(f'station: ahead of the clock; on air until {end:%H:%M}'); break
        try:
            result = one_segment(day)
        except BaseException:
            save(day)  # never leave an unchecked scene on disk
            raise
        if isinstance(result, str):
            print(f'station: {result}', flush=True)
            fails += 1
            if 'empty' in result or fails >= 3:  # three dropped picks in a row: stop, try next tick
                break
            continue
        fails = 0
        made += 1
        seg = result['segments'][-1]
        if LAB:
            print(f'\n== {seg["title"]} ==  ({" + ".join(seg["notes"])}; angle: {seg["angle"]})')
            for l in seg['lines']:
                print(f'{l["speaker"].upper():9} {l["text"]}')
            if made >= int(os.environ.get('LAB_N', '1')):
                break
            continue
        publish(result)
        print(f'station: on air, "{seg["title"]}" ({" + ".join(seg["notes"])})', flush=True)
        if ONCE:
            break
    print(f'station: {made} scene(s) made')


if __name__ == '__main__':
    main()
