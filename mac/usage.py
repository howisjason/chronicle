#!/usr/bin/env python3
"""usage.py: today's plan usage by the station, from its own log (inbox/costs.tsv).
The figure is Claude Code's API-equivalent cost of each call, the closest number
a script can read to what the calls take from his plan. Used by the button."""
import glob, json, os
from datetime import datetime, timedelta, timezone
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TZ = timezone(timedelta(hours=7))


def line():
    day = datetime.now(TZ).date().isoformat()
    spent, calls = 0.0, 0
    p = os.path.join(ROOT, 'inbox', 'costs.tsv')
    if os.path.exists(p):
        for l in open(p):
            f = l.rstrip('\n').split('\t')
            if f[0].startswith(day) and len(f) > 2:
                try:
                    spent += float(f[2]); calls += 1
                except ValueError:
                    pass
    try:
        cap = float(open(os.path.join(ROOT, 'inbox', 'daily-cap.txt')).read().strip())
    except (FileNotFoundError, ValueError):
        cap = 2.00
    # Today's scenes live in one file per hour, day/<date>/<HH>.json (8 Oct 2026).
    scenes = 0
    for p in glob.glob(os.path.join(ROOT, 'day', day, '[0-2][0-9].json')):
        scenes += sum(1 for s in json.load(open(p))['segments'] if s.get('notes'))
    return f'Today: ${spent:.2f} of the ${cap:.2f} daily cap, {scenes} scenes from the notes.'


if __name__ == '__main__':
    print(line())
