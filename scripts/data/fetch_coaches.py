#!/usr/bin/env python3
"""Head coaches for every program (Ryan 2026-10-25: "Comprehensive Program Facts ... specific coach names"; Runcruit shows them).
Reads each school's own athletics site, the public track & field coaches page next to the roster page we already store
(db.json "rs" .../sports/<sport>/roster -> .../coaches; otherwise "ws" + the common Sidearm sport paths). Keeps only head
coaches and directors of track / cross country, with the page they came from. Polite: one request per site at a time,
1 s apart, 4 sites in parallel, every page cached (social/standards/coaches_cache/), so re-runs cost nothing.
Output: public/data/coaches.json {school name: {"url": page, "coaches": [[name, title], ...], "checked": date}}
Usage: python3 scripts/data/fetch_coaches.py [--limit N] [--only "School name"]"""
import concurrent.futures, datetime, html, json, os, re, subprocess, sys, time
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(SITE, "..", "..", "social", "standards", "coaches_cache"); os.makedirs(CACHE, exist_ok=True)
OUT = os.path.join(SITE, "public", "data", "coaches.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
HEAD = re.compile(r"\bhead\b[^|]{0,40}\b(coach|track|cross)|director of (track|cross|men's and women's track)|director of (men's |women's )?(track|cross)", re.I)
NOT = re.compile(r"assistant|associate|graduate|volunteer|athletic trainer|strength|operations|recruiting coordinator|director of athletics|athletic director|football|basketball|soccer|swim|volleyball|baseball|softball|golf|tennis|lacrosse|wrestling|hockey|rowing|field hockey", re.I)
NAME = re.compile(r"^[A-Z][A-Za-z.'’-]+(?: [A-Z][A-Za-z.'’-]+){1,3}$")

def get(url):
    f = os.path.join(CACHE, re.sub(r"[^A-Za-z0-9]+", "_", url)[-180:] + ".html")
    if not os.path.exists(f):
        r = subprocess.run(["curl", "-sL", "--max-time", "25", "-A", UA, "-w", "%{http_code}", "-o", f, url], capture_output=True, text=True)
        if not r.stdout.startswith("2"): open(f, "w").write(""); time.sleep(1); return ""
        time.sleep(1)
    return open(f, encoding="utf8", errors="ignore").read()

def clean(s): return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", s)).split())

def heads(h):
    """[name, title] for every head coach / director on a coaches page (Sidearm tables and cards, most other CMSs)."""
    out = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", h, re.S):
        cells = [clean(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)]
        title = next((c for c in cells if HEAD.search(c) and not NOT.search(c)), None)
        name = next((c for c in cells if NAME.match(c) and not HEAD.search(c)), None)
        if title and name: out.append([name, title])
    if not out:   # card layouts: a name element followed closely by a title element
        txt = [t for t in (clean(x) for x in re.split(r"<(?:/?div|/?h\d|/?p|/?span|/?a|br)[^>]*>", h)) if t]
        for i, t in enumerate(txt[:-1]):
            for j in (i + 1, i + 2):
                if j < len(txt) and NAME.match(t) and HEAD.search(txt[j]) and not NOT.search(txt[j]) and len(txt[j]) < 90:
                    out.append([t, txt[j]]); break
    seen, res = set(), []
    for n, t in out:
        if n.lower() not in seen: seen.add(n.lower()); res.append([n, t])
    return res[:3]

def urls(s):
    U = []
    rs, ws = s.get("rs") or "", (s.get("ws") or "").rstrip("/")
    if re.search(r"/roster/?$", rs): U.append(re.sub(r"/roster/?$", "/coaches", rs))
    if ws:
        for sp in ("track-and-field", "mens-track-and-field", "womens-track-and-field", "xctrack", "track"):
            U.append(f"{ws}/sports/{sp}/coaches")
    return list(dict.fromkeys(U))

def one(s):
    for u in urls(s):
        h = get(u)
        if h:
            c = heads(h)
            if c: return s["n"], {"url": u, "coaches": c, "checked": datetime.date.today().isoformat()}
    return s["n"], None

def main():
    d = json.load(open(os.path.join(SITE, "public", "data", "db.json")))
    S = [s for s in d["schools"] if s["d"] != "NJCAA" and urls(s)]
    if "--only" in sys.argv: S = [s for s in S if s["n"] == sys.argv[sys.argv.index("--only") + 1]]
    if "--limit" in sys.argv: S = S[:int(sys.argv[sys.argv.index("--limit") + 1])]
    old = json.load(open(OUT)) if os.path.exists(OUT) else {}
    found = 0
    with concurrent.futures.ThreadPoolExecutor(4) as ex:
        for n, r in ex.map(one, S):
            if r: old[n] = r; found += 1
            print(("OK  " if r else "--  ") + n + ("  " + "; ".join(f"{a} ({b})" for a, b in r["coaches"]) if r else ""), flush=True)
    json.dump(old, open(OUT, "w"), separators=(",", ":"), ensure_ascii=False)
    print(f"{found} of {len(S)} programs with a head coach; {len(old)} in coaches.json")

if __name__ == "__main__": main()
