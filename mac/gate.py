#!/usr/bin/env python3
"""gate.py: the blind reviewer. A fresh Sonnet call that never saw where the
text came from decides which parts may go on a public channel
(station/note-gate.md); everything else is removed. J's word, 8 Oct 2026: no
manual review, a blind grader instead.

Usage: python3 mac/gate.py <file> para|note
  para  splits on blank lines (the day note); note splits on "## NOTE:" headers
  (the shelf). Removed parts are kept in <file>.gate.txt so a removal can be
  traced. An unclear answer moves the file to <file>.held, so the station
  gets nothing rather than something unchecked.
"""
import os, re, subprocess, sys
path, mode = sys.argv[1], sys.argv[2]
text = open(path).read()
parts = ([x for x in re.split(r'\n\s*\n', text.strip()) if x.strip()] if mode == 'para'
         else [x for x in re.split(r'(?m)^(?=## NOTE:)', text) if x.strip()])
if not parts:
    sys.exit(0)
body = '\n\n'.join(f'[{i}] {x}' for i, x in enumerate(parts))
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sheet = open(f'{root}/station/note-gate.md').read() + '\n\nTHE FORBIDDEN LIST:\n' + open(f'{root}/forbidden.md').read()
r = subprocess.run(['claude', '-p', '--model', 'claude-sonnet-5-5', '--system-prompt', sheet, '--tools', '', '--strict-mcp-config',
                    '--setting-sources', '', '--no-session-persistence'], input=body, capture_output=True, text=True, timeout=600)
ans = r.stdout.strip()
if r.returncode != 0 or not re.fullmatch(r'NONE|\d+(\s*,\s*\d+)*', ans):
    os.replace(path, path + '.held')
    sys.exit(f'gate: no clear answer ({ans[:200]!r}); {os.path.basename(path)} is held back')
cut = set() if ans == 'NONE' else {int(x) for x in ans.split(',')}
open(path, 'w').write(('\n\n' if mode == 'para' else '\n').join(x for i, x in enumerate(parts) if i not in cut) + '\n')
open(path + '.gate.txt', 'w').write('removed: ' + ans + '\n\n' + '\n\n'.join(parts[i] for i in sorted(cut)))
print(f'gate: {os.path.basename(path)}: removed {len(cut)} of {len(parts)}')
