#!/usr/bin/env python3
"""Team pages (Ryan 2026-10-20: "a comprehensive results page similar to TFRRS ... team results organized by event, full athlete
rosters, and individual performance history"). Builds one gzip JSON per D1 program from the TFRRS data we already collect
(written consent on file):
  rosters/<season>/*.json      (scrape_rosters.py)          -> full roster per season, with class year
  cache/..teams_tf_<team>..    (team pages, every season)   -> TFRRS team "top marks" per season
  cache/..athletes_<id>..      (fetch_roster_athletes.py)   -> every athlete's college bests + full meet history
Output: public/data/roster/<TFRRS base slug>.dat (gzip JSON) + public/data/roster/index.json.
Base slug = TFRRS team slug without the gender, e.g. AL_college_Auburn (matches db.json "u").
Re-run any time; it uses whatever is cached (athletes without a cached page get roster + bests from lists only)."""
import glob, gzip, html, json, os, re, collections
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TF = os.path.join(SITE, "..", "..", "social", "standards", "tfrrs")
CACHE = os.path.join(TF, "cache")
OUT = os.path.join(SITE, "public", "data", "roster"); os.makedirs(OUT, exist_ok=True)
key = lambda u: os.path.join(CACHE, re.sub(r"[^A-Za-z0-9]+", "_", u)[-180:] + ".html")
txt = lambda s: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()
MON = {m: i for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), 1)}
INDOOR_ONLY = {"60", "60H", "55", "55H", "Pent", "WT", "DMR", "SMR", "600y", "4x440y", "4x880y", "300", "500", "600", "1000", "4x200"}
OUTDOOR_ONLY = {"100", "100H", "110H", "400H", "3000S", "2000S", "HT", "DT", "JT", "Hep", "Dec", "10,000", "4x100"}

def season_of(date, ev):
    m = re.match(r"([A-Z][a-z]{2})\s*(\d+)", date); y = re.search(r"(\d{4})\s*$", date)
    if not m or not y: return None
    mo, d, yr = MON.get(m.group(1), 0), int(m.group(2)), int(y.group(1))
    if mo == 12: return f"{yr+1}-indoor"
    if ev in INDOOR_ONLY: return f"{yr}-indoor"
    if ev in OUTDOOR_ONLY: return f"{yr}-outdoor"
    if mo <= 2 or (mo == 3 and d <= 15): return f"{yr}-indoor"
    if mo <= 8: return f"{yr}-outdoor"
    return None

def flip(n):
    a, _, b = n.partition(", ")
    return f"{b} {a}".strip() if b else n

def athlete(page):
    b = re.sub(r"(?is)<script.*?</script>|<style.*?</style>", "", page)
    bests = []
    m = re.search(r'(?is)<table class="table bests" id="all_bests">(.*?)</table>', b)
    if m:
        for ev, cell in re.findall(r'(?is)<td class="panel-heading-text[^"]*"[^>]*>(.*?)</td>\s*<td class="panel-heading-normal-text[^"]*"[^>]*>(.*?)</td>', m.group(1)):
            ev, mk = txt(ev), re.search(r"(?is)<a[^>]*>(.*?)</a>", cell)
            if ev and ev != "\xa0" and mk: bests.append([ev, txt(mk.group(1))])
    hist = []
    for t in re.findall(r'(?is)<table class="table table-hover >">(.*?)</table>', b):
        mt = re.search(r'(?is)<th[^>]*>\s*<a[^>]*>(.*?)</a>\s*<span[^>]*>(.*?)</span>', t)
        if not mt: continue
        meet, date = txt(mt.group(1)), txt(mt.group(2))
        for ev, mk, pl in re.findall(r'(?is)<td class="panel-heading-text" width="27%">(.*?)</td>\s*<td class="panel-heading-normal-text"[^>]*>(.*?)</td>\s*<td class="panel-heading-text"[^>]*>(.*?)</td>', t):
            ev = txt(ev); a = re.search(r"(?is)<a[^>]*>(.*?)</a>", mk); mark = txt(a.group(1)) if a else txt(mk).split("(")[0].strip()
            w = re.search(r"\(\s*([+-]?\d+(?:\.\d+)?)\s*\)", txt(mk)); s = season_of(date, ev)
            if not mark or mark in ("DNS", "DNF", "DQ", "NH", "ND", "FOUL", "SCR", "NT", "NM"): continue
            hist.append([s, date, meet, ev, mark, w.group(1) if w else "", txt(pl).replace(" (P)", " · Prelim").replace(" (F)", " · Final")])
    return bests, hist

def topmarks(page):
    m = re.search(r'(?is)<h3[^>]*>\s*TOP MARKS\s*</h3>(.*?)</table>', page)
    if not m: return []
    out = []
    for row in re.findall(r"(?is)<tr[^>]*>(.*?)</tr>", m.group(1)):
        c = [txt(x) for x in re.findall(r"(?is)<td[^>]*>(.*?)</td>", row)]
        if len(c) >= 4 and c[0] and c[3]: out.append([c[0], flip(c[1]), c[2], c[3]])
    return out

def config_label(page):
    m = re.search(r'(?is)<option value="\d+"\s+selected[^>]*>\s*([^<]+)', page)
    return txt(m.group(1)) if m else None

def skey(label):   # "2026 Outdoor" -> "2026-outdoor"
    m = re.match(r"(\d{4}) (Outdoor|Indoor)", label or "")
    return f"{m.group(1)}-{m.group(2).lower()}" if m else None

teams = collections.defaultdict(lambda: {"g": {}})
for season_dir in sorted(glob.glob(os.path.join(TF, "rosters", "*"))):
    label = os.path.basename(season_dir)
    rk = label.split()[0] + ("-xc" if "XC" in label else "")
    for f in glob.glob(os.path.join(season_dir, "*.json")):
        r = json.load(open(f)); slug = os.path.basename(f)[:-5]
        g = "m" if "_college_m_" in slug else "w"; base = slug.replace("_college_m_", "_college_").replace("_college_f_", "_college_")
        teams[base]["g"].setdefault(g, {"url": r["url"].replace("/teams/xc/", "/teams/tf/"), "ro": {}})["ro"][rk] = r["athletes"]

idx, total, withh = {}, 0, 0
for base, T in sorted(teams.items()):
    A, aid, M, mid = [], {}, [], {}
    def meet_i(n):
        if n not in mid: mid[n] = len(M); M.append(n)
        return mid[n]
    out = {"n": None, "g": {}}
    for g, G in T["g"].items():
        ro = {}
        for rk, ath in G["ro"].items():
            ids = []
            for a in ath:
                if a["id"] not in aid:
                    aid[a["id"]] = len(A); p = key(a["url"]); rec = {"i": a["id"], "n": flip(a["name"]), "g": g, "y": {}, "u": a["url"].split("/athletes/")[1].replace(".html", "")}
                    if os.path.exists(p):
                        b, h = athlete(open(p, errors="ignore").read()); rec["b"] = b
                        rec["h"] = [[s, d, meet_i(mn), e, mk, w, pl] for s, d, mn, e, mk, w, pl in h]; withh += 1
                    A.append(rec); total += 1
                A[aid[a["id"]]]["y"][rk] = a["year"]; ids.append(aid[a["id"]])
            ro[rk] = ids
        top = {}
        for p in glob.glob(key(G["url"])[:-5] + "*.html"):
            pg = open(p, errors="ignore").read(); k = skey(config_label(pg))
            if not out["n"]:
                h3 = re.search(r'(?is)<h3[^>]*id="team-name"[^>]*>(.*?)</h3>', pg) or re.search(r"(?is)<h3[^>]*>\s*([^<]+?)\s*</h3>", pg)
                out["n"] = base.split("_college_")[1].replace("_", " ")
            if k: top[k] = topmarks(pg)
        out["g"][g] = {"url": G["url"], "ro": ro, "top": top}
    out["A"], out["M"] = A, M
    json.dump(out, gzip.open(os.path.join(OUT, base + ".dat"), "wt", compresslevel=9), separators=(",", ":"))
    idx[base] = [out["n"], sum(len(v) for G in out["g"].values() for v in G["ro"].values() if v)]
json.dump({"built": __import__("datetime").date.today().isoformat(), "teams": idx}, open(os.path.join(OUT, "index.json"), "w"), separators=(",", ":"))
print(len(idx), "teams,", total, "athletes,", withh, "with meet history")
