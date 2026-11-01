"""Conference championship meet results from TFRRS (Ryan 2026-10-31: "conference results should be just how we show conference meets
in the results tab", i.e. the same way the national championship shows there). Same polite fetcher and parser as scrape_champs.py
(3 s per page, cached). For each conference list in a season's results file, searches TFRRS for that conference's championship
meet and accepts a meet only when most of its teams are teams on that conference's list (so a look-alike meet can't slip in).
Output: conf_champs/<year>/<season>/<div>/<conference slug>.json, same shape as champs/ plus "conf" (the list label).
Usage: python3 scrape_conf_champs.py <rank dir> <year>[,<year>] [indoor|outdoor] [d1,d2,d3,naia]"""
import gzip, json, os, re, sys
from scrape_champs import get, clean, parse_event, event_key
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("TFRRS_CONF_CHAMPS", os.path.join(HERE, "conf_champs"))
RETRY = os.environ.get("CONF_RETRY") == "1"   # second pass: search again for conferences an earlier run marked missing
SKIP = re.compile(r"region|qualif|ecac|ic4a|neicaaa|outdoor list|indoor list|division|championship|rankings|performance list|hbcu|frozen|^\s*diii\b|^mets$", re.I)
BAD = re.compile(r"ncaa|naia national|region|invitational|invite|open\b|last chance|combined events|multi|heptathlon|decathlon|pentathlon|cross country|\bxc\b|high school|hs\b", re.I)
MONTHS = {"indoor": range(1, 4), "outdoor": range(4, 7)}

def fnorm(x):
    x = x.lower().replace("&", " and ")
    x = re.sub(r"\(([a-z]+)\.?\)", r"\1", x)
    return re.sub(r"[^a-z0-9]+", " ", re.sub(r"\buniv\.?\b", "university", re.sub(r"\bst\.", "state", x))).strip()

# TFRRS meet names that don't contain the list label (Ryan 2026-11-01: fill the missed conference meets)
ALIAS = {"Ivy League Conference": ["Heptagonal", "Ivy League"], "Northern Sun": ["NSIC"], "Northeast Conference": ["NEC"], "Northwest Conference": ["NWC"],
         "Michigan Intercollegiate": ["MIAA"], "American Midwest": ["American Midwest Conference", "AMC"], "Ohio Valley OVC": ["OVC", "Ohio Valley Conference"],
         "The Summit League": ["Summit League"], "GLVC": ["Great Lakes Valley"], "American Rivers": ["American Rivers Conference", "A-R-C"], "Great Northeast": ["GNAC"],
         "Chicagoland Collegiate": ["CCAC", "Chicagoland"], "River States": ["River States Conference", "RSC"], "Pac 12": ["Pac-12", "Pac 12"], "CCAA": ["California Collegiate"],
         "PacWest": ["Pacific West", "PacWest"], "American Southwest": ["American Southwest Conference", "ASC"], "Appalachian AC": ["Appalachian Athletic", "AAC"],
         "Heart of America AC": ["Heart of America", "Heart"], "Little East": ["Little East", "LEC"], "Continental AC": ["Continental Athletic", "Continental"],
         "Gulf South": ["Gulf South", "GSC"], "Great American": ["Great American Conference", "GAC"], "North Atlantic Conference": ["North Atlantic", "NAC"],
         "North Coast AC": ["NCAC", "North Coast"], "Cascade Conference": ["Cascade", "CCC"], "Sun Conference": ["Sun Conference"], "The Sun Conference": ["Sun Conference"],
         "North Star": ["North Star", "NSAA"], "Peach Belt": ["Peach Belt", "PBC"], "Great Plains AC": ["GPAC", "Great Plains"], "Conference USA": ["C-USA", "Conference USA"],
         "Mountain East": ["Mountain East", "MEC"], "South Atlantic": ["South Atlantic", "SAC"], "Presidents AC": ["Presidents' Athletic", "PAC"], "Coast to Coast": ["C2C", "Coast-To-Coast"],
         "Atlantic 10": ["Atlantic 10", "A-10"], "Great Midwest": ["G-MAC", "Great Midwest"], "G MAC": ["G-MAC", "Great Midwest"], "Missouri Valley MVC": ["MVC", "Missouri Valley"],
         "Southern States AC": ["Southern States", "SSAC"], "Golden State AC": ["Golden State", "GSAC"], "Frontier Conference": ["Frontier"], "Mid South": ["Mid-South"],
         "The American": ["American Athletic", "AAC"], "Crossroads League": ["Crossroads"], "BIG EAST": ["Big East"], "Middle Atlantic Conference": ["MAC Freedom", "MAC Commonwealth", "Middle Atlantic"],
         "Southern Conference": ["SoCon", "Southern Conference"], "Sooner AC": ["Sooner", "SAC"], "Atlantic East": ["Atlantic East"], "Big 12": ["Big 12"], "Big West": ["Big West"],
         "Horizon League": ["Horizon League"], "Big Sky": ["Big Sky"], "Southland Conference": ["Southland"], "Midwest Conference": ["Midwest Conference"],
         "Centennial Conference": ["Centennial"], "UMAC": ["UMAC", "Upper Midwest"], "SAA": ["SAA", "Southern Athletic"], "MPSF": ["MPSF", "Mountain Pacific"]}

def queries(label):
    q = list(ALIAS.get(label.strip(), [])) + [label]
    m = re.match(r"^(.*?)\s+([A-Z]{2,6})$", label)          # "Mid American MAC", "Missouri Valley MVC", "CAA Colonial"
    if m: q += [m.group(1), m.group(2)]
    m = re.match(r"^([A-Z]{2,6})\s+(.*)$", label)
    if m: q += [m.group(1), m.group(2)]
    return list(dict.fromkeys(x for x in q if x))

def search(q, season, year, phr):
    out = []; rows = []
    for page in (1, 2, 3):   # a bare conference name lists every year's meets, newest first, ~30 a page
        h = get("https://tf.tfrrs.org/results_search_page.html?search_query=" + (q + phr.format(S=season.title(), Y=year)).replace(" ", "+").replace("&", "%26") + "&with_sports=track" + (f"&page={page}" if page > 1 else ""))
        r = re.findall(r"<tr[^>]*>(.*?)</tr>", h, re.S); rows += r
        if len(r) < 25: break
    for row in rows:
        cells = [clean(c) for c in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
        link = re.search(r'href="(/results/\d+/[^"]+)"', row)
        if not link or len(cells) < 2: continue
        date, name = cells[0], cells[1]
        dm = re.match(r"(\d{2})/", date); yy = re.findall(r"(\d{2})$", date)
        if not yy or 2000 + int(yy[0]) != year or not dm: continue
        n = name.lower()
        if BAD.search(name) or not re.search(r"champ|track|t&f|t & f|indoor|outdoor", n): continue
        other = "indoor" if season == "outdoor" else "outdoor"
        if other in n: continue
        if season not in n and int(dm.group(1)) not in MONTHS[season]: continue
        out.append({"meet": name, "url": "https://tf.tfrrs.org" + link.group(1), "date": date, "champ": "champ" in n})
    return sorted(out, key=lambda c: not c["champ"])

def meet_teams(h):
    return {fnorm(clean(t)) for t in re.findall(r'href="[^"]*/teams/[^"]+"[^>]*>(.*?)</a>', h, re.S) if clean(t)}

def main(rank_dir, years, seasons, divs):
    for year in years:
        for season in seasons:
            for div in divs:
                f = os.path.join(rank_dir, f"{year}-{season}-{div}.dat")
                if not os.path.exists(f): continue
                D = json.loads(gzip.open(f).read())
                isconf = lambda L: not (L.get("nat") or L.get("champ") or L.get("region") or SKIP.search(L["label"]))
                if not any(isconf(L) for L in D["lists"]):
                    # TFRRS published no conference lists before 2020 (Ryan 2026-11-01, Eureka): take the conferences and their teams
                    # from the nearest later season that has them; the team-match check still has to pass for that year's meet
                    # (the one with the most conferences: 2020-21 lost some to COVID-19)
                    best = None
                    for y2 in range(year + 1, year + 7):
                        f2 = os.path.join(rank_dir, f"{y2}-{season}-{div}.dat")
                        if not os.path.exists(f2) or (y2 == 2020 and season == "outdoor"): continue
                        D2 = json.loads(gzip.open(f2).read()); n = sum(isconf(L) for L in D2["lists"])
                        if n and (not best or n > best[0]): best = (n, y2, D2)
                    if best: D = best[2]; print(f"  {year} {season} {div}: conferences from {best[1]}", flush=True)
                for L in D["lists"]:
                    if not isconf(L): continue
                    slug = re.sub(r"[^a-z0-9]+", "-", L["label"].lower()).strip("-")
                    out_p = os.path.join(OUT, str(year), season, div, slug + ".json")
                    if os.path.exists(out_p):
                        prev = json.load(open(out_p))
                        if prev.get("complete") is not None and not (RETRY and prev.get("missing") and not prev.get("retried")): continue
                    conf = {fnorm(re.sub(r" \([B-H]\)$", "", D["teams"][r[3]])) for g in L["g"].values() for rows in g.values() for r in rows}
                    pick, seen = None, set()
                    best = None; small = len(conf) < 6
                    for q, phr in [(q, phr) for phr in ("", " {S}", " Championship", " {S} Championships", " {Y} {S}", " Track") for q in queries(L["label"])]:
                        try: cands = search(q, season, year, phr)
                        except Exception as e: print("  search failed", q, e, flush=True); continue
                        for c in cands:
                            if c["url"] in seen: continue
                            seen.add(c["url"])
                            try: mt = meet_teams(get(c["url"]))
                            except Exception: continue
                            hit = len(mt & conf)
                            if not best or hit > best[1]: best = (c["meet"], hit, len(mt))
                            # most of the meet's teams are this conference's; small conferences (under 6 teams on the list) need 3
                            if len(mt) >= 3 and hit >= (3 if small else 4) and hit / len(mt) >= 0.6: pick = (c, hit, len(mt)); break
                        if pick: break
                    os.makedirs(os.path.dirname(out_p), exist_ok=True)
                    if not pick:
                        json.dump({"conf": L["label"], "complete": False, "missing": True, "retried": RETRY, "best": best}, open(out_p, "w")); print(f"  {year} {season} {div} {L['label']}: no meet found (closest {best})", flush=True); continue
                    M, hit, nt = pick
                    h = get(M["url"]); mid = re.search(r"/results/(\d+)/", M["url"]).group(1)
                    evs = sorted(set(re.findall(r'href="(https://tf\.tfrrs\.org/results/' + mid + r'/\d+/[^"]+)"', h)))
                    data = {"conf": L["label"], "meet": M["meet"], "url": M["url"], "date": M["date"], "events": {}}
                    failed = 0
                    for u in evs:
                        try: rounds = parse_event(get(u))
                        except Exception as e: print("    FAILED event", u, e, flush=True); failed += 1; continue
                        for r in rounds:
                            g, ev, rnd = event_key(r["title"])
                            data["events"].setdefault(ev, {}).setdefault(g, []).append({"round": rnd, "wind": r["wind"], "rows": r["rows"]})
                    data["complete"] = failed == 0 and bool(evs)
                    json.dump(data, open(out_p, "w"), indent=0)
                    print(f"  {year} {season} {div} {L['label']}: {M['meet']} ({hit}/{nt} teams match), {len(evs)} events", flush=True)

if __name__ == "__main__":
    a = sys.argv[1:]
    main(a[0], [int(y) for y in a[1].split(",")], [a[2]] if len(a) > 2 else ["outdoor", "indoor"], a[3].split(",") if len(a) > 3 else ["d1", "d2", "d3", "naia"])
