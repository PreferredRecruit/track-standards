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
HEAD = re.compile(r"\bhead\b[^|]{0,40}\b(coach|track|cross)|director of (track|cross|men's and women's track)|director of (men's |women's )?(track|cross)|(track|cross country)[^,/]{0,30}\bdirector\b|\bhead coach\b", re.I)
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
        title = next((c for c in cells if accept(c)), None)
        name = next((c for c in cells if NAME.match(c) and not HEAD.search(c) and not BADNAME.search(c)), None)
        if title and name: out.append([name, title])
    if not out:   # card layouts: a title element with the person's name in one of the few elements just before it
        txt = [t for t in (clean(x) for x in re.split(r"<(?:/?div|/?h\d|/?p|/?span|/?a|br)[^>]*>", h)) if t]
        for j, t in enumerate(txt):
            if len(t) < 120 and accept(t):
                nm = next((txt[k] for k in range(j - 1, max(-1, j - 5), -1) if NAME.match(txt[k]) and not BADNAME.search(txt[k]) and not accept(txt[k])), None)
                if nm: out.append([nm, t])
    seen, res = set(), []
    for n, t in out:
        if n.lower() not in seen: seen.add(n.lower()); res.append([n, t])
    res.sort(key=rank)
    return res[:3]

MARK = re.compile(r"\bdirector of (men's |women's |men's and women's |women's and men's )?(track|cross)|(track|cross country)[^,]{0,30}\bdirector\b|\bhead\b.{0,90}?\b(coach|track|cross)", re.I)
NOTW = re.compile(r"assistant|ass?oc?s?c?iate|graduate|volunteer|athletic trainer|strength|operations|recruiting coordinator|director of athletics|athletic director|football|basketball|soccer|swim|volleyball|baseball|softball|golf|tennis|lacrosse|wrestling|hockey|rowing", re.I)
BADNAME = re.compile(r"\b(staff|roster|videos?|all|coaches|coaching|directory|schedule|news|interview|more|view|full|bio|email|phone)\b", re.I)

def accept(t):
    """a head coach or director of track / cross country: a head marker that comes before any assistant / other-sport wording"""
    if not t or len(t) > 140 or re.search(r"postgame|interview|video|\s[–—]\s", t, re.I): return False
    if re.search(r"operations|external|internal|communications|compliance officer|equipment|nutrition", t, re.I) and not re.search(r"\bcoach\b", t, re.I): return False
    o, tr = re.search(r"football|basketball|soccer|swim|volleyball|baseball|softball|golf|tennis|lacrosse|wrestling|hockey|rowing", t, re.I), re.search(r"track|cross|\bxc\b|t&f", t, re.I)
    if o and (not tr or o.start() < tr.start()): return False   # another sport's head coach, even if track is mentioned later
    m = MARK.search(t)
    if not m: return False
    n = NOTW.search(t)
    return not n or n.start() > m.start()

def rank(c):
    t = c[1]
    xc_only = bool(re.search(r"cross country|\bxc\b", t, re.I)) and not re.search(r"track", t, re.I)
    return (xc_only, 0 if re.search(r"director", t, re.I) else 1 if not re.search(r"\b(men's|women's|women|men)\b", t, re.I) else 2)

SPORTS = ("track-and-field", "mens-track-and-field", "womens-track-and-field", "xctrack", "track", "track-field", "xc-track", "mtrack", "wtrack", "m-track", "w-track", "mens-track", "womens-track", "cross-country-track-and-field")

def urls(s):
    U = []
    rs, ws = s.get("rs") or "", (s.get("ws") or "").rstrip("/")
    if re.search(r"/roster/?$", rs): U.append(re.sub(r"/roster/?$", "/coaches", rs))
    if ws:
        for sp in SPORTS: U.append(f"{ws}/sports/{sp}/coaches")
    if rs: U.append(rs)                                      # many roster pages carry the coaching staff too
    return list(dict.fromkeys(U))

def one(s):
    for u in urls(s):
        h = get(u)
        if h:
            c = heads(h)
            if c: return s["n"], {"url": u, "coaches": c, "checked": datetime.date.today().isoformat()}
            # a page that links to its coaching staff (roster pages, sport home pages)
            for l in dict.fromkeys(re.findall(r'href="([^"]*/(?:coaches|coaching-staff|staff)(?:/|\.aspx)?)"', h)):
                if not re.search(r"track|cross|xc", l, re.I): continue
                lu = l if l.startswith("http") else re.match(r"https?://[^/]+", u).group(0) + (l if l.startswith("/") else "/" + l)
                hc = get(lu); c = heads(hc) if hc else []
                if c: return s["n"], {"url": lu, "coaches": c, "checked": datetime.date.today().isoformat()}
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
