#!/bin/bash
# Copies curl.svg and leaf-pair.svg into tokens.css as data-URI mask tokens (--curl-tl ... --leaf-mark),
# because Chrome will not load mask FILES on a double-clicked page. Run after editing a mark: bash kit/marks/embed.sh
cd "$(dirname "$0")" && python3 - <<'PY'
import re, urllib.parse as u
def uri(svg): return 'url("data:image/svg+xml,' + u.quote(re.sub(r'\s+', ' ', re.sub(r'<!--.*?-->', '', svg, flags=re.S)).replace('"', "'").strip(), safe=" =:/',.()-;") + '")'
curl = open('curl.svg').read(); views = dict(re.findall(r'<view id="([\w-]+)" viewBox="([^"]+)"/>', curl)); bare = re.sub(r'\s*<view [^>]*/>', '', curl)
lines = [f'  --curl-{k}: {uri(re.sub(r"viewBox=\"[^\"]+\"", f"viewBox=\"{v}\"", bare, count=1))};' for k, v in views.items()] + [f'  --leaf-mark: {uri(open("leaf-pair.svg").read())};']
t = open('../tokens.css').read(); a, b = '  /* marks:begin (written by marks/embed.sh, do not edit by hand) */\n', '  /* marks:end */'
open('../tokens.css', 'w').write(t[:t.index(a) + len(a)] + '\n'.join(lines) + '\n' + t[t.index(b):])
print(len(lines), 'mark tokens written')
PY
