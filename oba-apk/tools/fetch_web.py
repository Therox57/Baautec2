#!/usr/bin/env python3
import os, re, sys
from collections import deque
from urllib.parse import urljoin, urlsplit, unquote
from urllib.request import Request, urlopen

if len(sys.argv) != 3:
    raise SystemExit("usage: fetch_web.py <base-url> <output-dir>")

BASE = sys.argv[1].rstrip("/") + "/"
OUT = sys.argv[2]
HOST = urlsplit(BASE).netloc.lower()
MAX_FILES = 500
TEXT_EXT = {".html",".htm",".js",".mjs",".css",".json",".svg",".xml",".txt",".webmanifest"}
ATTR_RE = re.compile(r'''(?:src|href)\s*=\s*["']([^"'#]+)["']''', re.I)
QUOTED_RE = re.compile(r'''["']((?:/|\.\.?/)?[^"'\s?#]+\.(?:js|mjs|css|json|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|otf|webmanifest|map)(?:\?[^"']*)?)["']''', re.I)
ABS_ASSET_RE = re.compile(r'''(/assets/[^"'\s)]+)''', re.I)

def local_path(url):
    p = urlsplit(url)
    if p.netloc and p.netloc.lower() != HOST: return None
    path = unquote(p.path or "/")
    if path == "/": return "index.html"
    path = path.lstrip("/")
    if ".." in path.split("/"): return None
    return path

def normalize(candidate, current):
    candidate = candidate.strip()
    if not candidate or candidate.startswith(("data:","mailto:","tel:","javascript:","#")):
        return None
    absolute = urljoin(current, candidate)
    p = urlsplit(absolute)
    if p.scheme not in ("http","https") or p.netloc.lower() != HOST: return None
    return p._replace(query="", fragment="").geturl()

def should_parse(path, ctype):
    return os.path.splitext(path)[1].lower() in TEXT_EXT or ctype.startswith("text/") or "javascript" in ctype or "json" in ctype

os.makedirs(OUT, exist_ok=True)
queue, seen = deque([BASE]), set()
saved = 0

while queue and saved < MAX_FILES:
    url = queue.popleft()
    if url in seen: continue
    seen.add(url)
    path = local_path(url)
    if path is None: continue
    req = Request(url, headers={"User-Agent":"Mozilla/5.0 OBA-APK-Builder/1.0","Accept":"*/*"})
    try:
        with urlopen(req, timeout=30) as response:
            data = response.read()
            ctype = response.headers.get_content_type()
    except Exception as exc:
        print(f"WARN fetch failed {url}: {exc}", file=sys.stderr)
        continue
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "wb") as f: f.write(data)
    saved += 1
    print(f"saved {path} ({len(data)} bytes)")
    if should_parse(path, ctype):
        text = data.decode("utf-8", errors="ignore")
        candidates = ATTR_RE.findall(text) + QUOTED_RE.findall(text) + ABS_ASSET_RE.findall(text)
        for candidate in candidates:
            target = normalize(candidate, url)
            if target and target not in seen: queue.append(target)

index = os.path.join(OUT, "index.html")
if not os.path.isfile(index) or os.path.getsize(index) < 100:
    raise SystemExit("Failed to fetch a usable index.html from " + BASE)
print(f"Fetched {saved} files into {OUT}")
