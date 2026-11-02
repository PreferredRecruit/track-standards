"""JUCO region and NWAC championship meets (Ryan 2026-11-01: "Direct Athletics is where all the JUCO times are truly stored").
TFRRS search barely finds region meets; DirectAthletics (TFRRS's owner) has a dated meet index that lists them all, linking to
the TFRRS results page. Same polite cached fetcher and parser as scrape_conf_champs.py (3 s per page, written consent on file).
Output: conf_champs/<year>/<season>/<njcaa|nwac|nccaa|uscaa>/<slug>.json, the same shape, so add_conf_champs.py shows each as a
championship in the Results tab of that season. Meets hosted only on DirectAthletics (not TFRRS) are listed in
juco_da_only.json for a later pass (different page format).
Usage: python3 scrape_juco_regions.py <year>[,<year>] [indoor|outdoor]"""
import json, os, re, sys
from scrape_champs import get, clean, parse_event, event_key
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("TFRRS_CONF_CHAMPS", os.path.join(HERE, "conf_champs"))
DA = "https://www.directathletics.com/legacy_da/results?filterrific%5Bsearch_query%5D={q}&filterrific%5Bwith_date_from%5D={a}&filterrific%5Bwith_date_to%5D={b}&filterrific%5Bwith_sports%5D=&page={p}"
WINDOW = {"indoor": ("01-01", "03-25"), "outdoor": ("04-01", "06-15")}
QUERIES = ["NJCAA", "Region", "NWAC", "KJCCC", "NCCAA", "USCAA", "Junior College", "JUCO"]
ROMAN = r"(?:[IVX]{1,5}|\d{1,2})"
HS = re.compile(r"\buil\b|\bmsaa\b|fhsaa|cif\b|\bclass\b|district|\barea\b|high school|hsaa|cyo|\b[1-6]a\b|\bjr\.? high|middle school|youth|aau|usatf|masters|\bjv\b", re.I)
BAD = re.compile(r"multi|combined|pentathlon|heptathlon|decathlon|invit|invite|relays|open\b|qualif|last chance|challenge|\bncaa division|\bdivision i+ (south|north|east|west)|cross country|\bxc\b", re.I)

REG = {"nw": "North", "north": "North", "northern": "North", "sw": "South", "south": "South", "southern": "South", "east": "East", "eastern": "East", "ne": "East", "west": "West", "western": "West", "se": "East"}   # one name per NWAC region

def roman(x):
    """region numbers in one style (TFRRS meet names use both "Region 12" and "Region XII")"""
    if not x.isdigit(): return x.upper()
    n, out = int(x), ""
    for v, r in ((10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")):
        while n >= v: out += r; n -= v
    return out

def classify(name, tfrrs=True):
    """(division, conference label) for a JUCO / small-association championship, or None"""
    n = name.replace("&amp;", "&")
    if HS.search(n) or BAD.search(n): return None
    if re.search(r"\bnwac\b", n, re.I):
        r = re.search(r"\b(north|south|east|west|northern|southern|eastern|western|nw|sw|ne|se)\b", n, re.I)
        return ("nwac", "NWAC" + (f" {REG.get(r.group(1).lower(), r.group(1).title())} Region" if r else ""))
    for k in ("nccaa", "uscaa"):
        if re.search(rf"\b{k}\b", n, re.I):
            r = re.search(rf"\bregion(?:al)?\s+({ROMAN})\b", n, re.I)
            return (k, k.upper() + (f" Region {roman(r.group(1))}" if r else "")) if r or re.search(r"region", n, re.I) else None
    r = re.search(rf"\bregion\s+({ROMAN})\b", n, re.I)
    # a bare "Region XI" counts only on TFRRS (college results); DirectAthletics-hosted bare regions are high school meets
    if r and (re.search(r"njcaa|kjccc|juco|junior college|\bcc\b", n, re.I) or (tfrrs and not re.search(r"ncaa|naia", n, re.I))):
        return ("njcaa", f"NJCAA Region {roman(r.group(1))}")
    if re.search(r"kjccc", n, re.I): return ("njcaa", "NJCAA Region VI")
    return None

def index(year, season):
    a, b = (f"{year}-{d}" for d in WINDOW[season]); seen = {}
    for q in QUERIES:
        for p in range(1, 15):
            h = get(DA.format(q=q.replace(" ", "+"), a=a, b=b, p=p))
            rows = 0
            for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", h, re.S):
                c = [clean(x) for x in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
                link = re.search(r'href="([^"]+)"', tr)
                if len(c) < 3 or not re.match(r"\d{2}/\d{2}/\d{4}$", c[0]) or not link: continue
                rows += 1
                if c[2] not in ("TF", "Track", "T&F") and not c[2].startswith("T"): continue
                cl = classify(c[1], "tfrrs.org" in link.group(1))
                if cl and link.group(1) not in seen: seen[link.group(1)] = {"meet": c[1], "url": link.group(1), "date": c[0], "div": cl[0], "conf": cl[1]}
            if rows < 20: break
    return list(seen.values())

def main(years, seasons):
    da_only = os.path.join(HERE, "juco_da_only.json"); D = json.load(open(da_only)) if os.path.exists(da_only) else {}
    for year in years:
        for season in seasons:
            meets = index(year, season)
            print(f"{year} {season}: {len(meets)} JUCO / NWAC championship meets on DirectAthletics", flush=True)
            for M in sorted(meets, key=lambda m: (m["conf"], "champ" not in m["meet"].lower(), "njcaa" not in m["meet"].lower())):   # the real championship first when two share a region
                if "tfrrs.org/results/" not in M["url"]:
                    D[M["url"]] = {**M, "year": year, "season": season}; continue
                slug = re.sub(r"[^a-z0-9]+", "-", M["conf"].lower()).strip("-")
                out_p = os.path.join(OUT, str(year), season, M["div"], slug + ".json")
                if os.path.exists(out_p) and json.load(open(out_p)).get("complete") is not None: continue
                url = re.sub(r"^https?://(www\.)?tfrrs\.org", "https://tf.tfrrs.org", M["url"])
                try: h = get(url)
                except Exception as e: print("  failed", url, e, flush=True); continue
                mid = re.search(r"/results/(\d+)/", url).group(1)
                evs = sorted(set(re.findall(r'href="(https://tf\.tfrrs\.org/results/' + mid + r'/\d+/[^"]+)"', h)))
                data = {"conf": M["conf"], "meet": M["meet"], "url": url, "date": M["date"], "events": {}}; failed = 0
                for u in evs:
                    try: rounds = parse_event(get(u))
                    except Exception as e: print("    FAILED event", u, e, flush=True); failed += 1; continue
                    for r in rounds:
                        g, ev, rnd = event_key(r["title"])
                        data["events"].setdefault(ev, {}).setdefault(g, []).append({"round": rnd, "wind": r["wind"], "rows": r["rows"]})
                data["complete"] = failed == 0 and bool(evs)
                os.makedirs(os.path.dirname(out_p), exist_ok=True); json.dump(data, open(out_p, "w"), indent=0)
                print(f"  {M['conf']} ({M['div']}): {M['meet']}, {len(evs)} events", flush=True)
            json.dump(D, open(da_only, "w"), indent=0)

def da_meet(M):
    """a meet hosted only on DirectAthletics (older NWAC meets): event links carry the TFRRS-style event name, each event page has
    "Men ..."/"Women ..." in its title and one table per round (Place, Overall, Name, Year, Team, mark, Score)"""
    h = get(M["url"]); data = {"conf": M["conf"], "meet": M["meet"], "url": M["url"], "date": M["date"], "events": {}}; failed = 0
    for u, ev in sorted(set(re.findall(r'href="(https://www\.directathletics\.com/results/track/\d+_\d+\.html)"[^>]*>(.*?)</a>', h, re.S))):
        ev = clean(ev)
        if re.search(r"athlon", ev): continue
        try: e = get(u)
        except Exception as x: print("    FAILED event", u, x, flush=True); failed += 1; continue
        t = re.search(r"\b(Men|Women)\b[^<]{0,60}</span>", e); g = "w" if t and t.group(1) == "Women" else "m"
        # running events head each round with <b id="white">Finals:</b>; field events have a single table and no round header
        for m in re.finditer(r'<table class="tablesorter".*?</table>', e, re.S):
            tb = m.group(0); rh = re.findall(r'<b id="white">([^<]*?)</b>', e[:m.start()]); rnd = rh[-1] if rh else "Finals"
            heads = [clean(x).upper() for x in re.findall(r"<th[^>]*>(.*?)</th>", tb, re.S)]
            mi = next((i for i, x in enumerate(heads) if x in ("TIME", "MARK", "HEIGHT", "DISTANCE", "POINTS")), None)
            if mi is None or "NAME" not in heads: continue
            ni, yi, ti, wi = heads.index("NAME"), heads.index("YEAR") if "YEAR" in heads else None, heads.index("TEAM") if "TEAM" in heads else None, heads.index("WIND") if "WIND" in heads else None
            rows = []
            for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", tb, re.S):
                c = [clean(x) for x in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
                if len(c) <= mi or not c[ni]: continue
                oi = heads.index("OVERALL") if "OVERALL" in heads else 0   # timed-final heats: "Overall" is the real place
                rows.append({"place": c[oi] if oi < len(c) and c[oi] else c[0], "athlete": c[ni], "year": c[yi] if yi is not None else "", "team": c[ti] if ti is not None else c[ni],
                             "mark": c[mi].split(" ")[0], "wind": c[wi] if wi is not None and wi < len(c) else "", "athlete_url": ""})
            if rows: data["events"].setdefault(ev, {}).setdefault(g, []).append({"round": clean(rnd).rstrip(":").strip() or "Finals", "wind": "", "rows": rows})
    data["complete"] = failed == 0 and bool(data["events"])
    return data

def main_da():
    """the DirectAthletics-only meets listed by main() (juco_da_only.json)"""
    for M in json.load(open(os.path.join(HERE, "juco_da_only.json"))).values():
        slug = re.sub(r"[^a-z0-9]+", "-", M["conf"].lower()).strip("-")
        out_p = os.path.join(OUT, str(M["year"]), M["season"], M["div"], slug + ".json")
        if os.path.exists(out_p) and json.load(open(out_p)).get("complete") is not None: continue
        data = da_meet(M); os.makedirs(os.path.dirname(out_p), exist_ok=True); json.dump(data, open(out_p, "w"), indent=0)
        print(f"  {M['year']} {M['conf']} ({M['div']}, DirectAthletics): {M['meet']}, {len(data['events'])} events", flush=True)

if __name__ == "__main__" and sys.argv[1:2] == ["--da"]:
    main_da(); sys.exit()
if __name__ == "__main__":
    a = sys.argv[1:]
    main([int(y) for y in a[0].split(",")], [a[1]] if len(a) > 1 else ["outdoor", "indoor"])
