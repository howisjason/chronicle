#!/usr/bin/env python3
"""pool.py: the notes the channel may talk about.

The channel tells only J's Obsidian vault now (his call, 8 Oct 2026: "the only
thing that it talks about is just purely what is in my Obsidian vault"), the way
PNN tells its news feeds. The pool is every note in his Second Brain that a
blind reviewer (station/note-gate.md, a fresh Sonnet call that sees one note and
nothing else) has passed as fit for a public channel. Each verdict is kept in
inbox/pool.json with the note's fingerprint, so a note is reviewed once, and
again only when he changes it. The inbox folder is never committed.

Usage: python3 mac/pool.py          (reviews new or changed notes, prints the pool)
       from pool import notes        (the station: name -> text of passed notes)
"""
import hashlib, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VAULT = '/Users/howisjason/Projects/personal/context/obsidian/🧠 Second Brain'
CACHE = os.path.join(ROOT, 'inbox', 'pool.json')


def review(name, text):
    """True if the blind reviewer passes the whole note for a public channel."""
    sheet = (open(os.path.join(ROOT, 'station', 'note-gate.md')).read()
             + '\n\nTHE FORBIDDEN LIST:\n' + open(os.path.join(ROOT, 'forbidden.md')).read()
             + '\n\nYou are given ONE note as paragraph [0]. Answer NONE to pass it whole, or 0 to remove it whole.')
    r = subprocess.run(['claude', '-p', '--model', 'claude-sonnet-5-5', '--system-prompt', sheet, '--tools', '',
                        '--strict-mcp-config', '--setting-sources', '', '--no-session-persistence'],
                       input=f'[0] # {name}\n{text}', capture_output=True, text=True, timeout=300)
    ans = r.stdout.strip()
    if r.returncode != 0 or ans not in ('NONE', '0'):
        return None  # unclear: not in the pool, asked again next time
    return ans == 'NONE'


def refresh():
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    for f in sorted(os.listdir(VAULT)):
        if not f.endswith('.md'):
            continue
        name, text = f[:-3], open(os.path.join(VAULT, f)).read()
        sha = hashlib.sha1(text.encode()).hexdigest()
        if cache.get(name, {}).get('sha') == sha and cache[name].get('ok') is not None:
            continue
        cache[name] = {'sha': sha, 'ok': review(name, text)}
        print(f'pool: {name}: {"in" if cache[name]["ok"] else "out" if cache[name]["ok"] is False else "unclear"}', flush=True)
        json.dump(cache, open(CACHE, 'w'), indent=1, ensure_ascii=False)
    return cache


def notes():
    """Passed notes whose text has not changed since they were reviewed."""
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    out = {}
    for name, v in cache.items():
        p = os.path.join(VAULT, name + '.md')
        if v.get('ok') and os.path.exists(p):
            text = open(p).read()
            if hashlib.sha1(text.encode()).hexdigest() == v['sha']:
                out[name] = text
    return out


if __name__ == '__main__':
    refresh()
    n = notes()
    print(f'pool: {len(n)} notes in')
