"""National championship meet results from TFRRS (Ryan 2026-10-13: the final performance lists close before the national meet,
so nationals marks are missing from them). Polite: 3 s per page, cached in cache_champs/. Public result pages only.
Finds each championship with TFRRS's meet search, then reads every event page (all rounds).
Output: champs/<year>/<season>/<div>.json =
  {"meet", "url", "date", "events": {"<event>": {"m"|"w": [{"round", "wind", "rows": [{place, athlete, year, team, mark, wind, athlete_url}]}]}}}
Usage: python3 scrape_champs.py [first_year] [last_year]   (default 2016 2026)"""
import json, os, re, sys, time, subprocess, html as H
HERE = os.path.dirname(os.path.abspath(__file__))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
CACHE = os.path.join(HERE, "cache_champs"); os.makedirs(CACHE, exist_ok=True)
DIVQ = {"d1": ["NCAA Division I", "NCAA DI"], "d2": ["NCAA Division II", "NCAA DII"], "d3": ["NCAA Division III", "NCAA DIII"],
        "naia": ["NAIA"], "njcaa": ["NJCAA"]}
MEETS = [(d, s) for d in ("d1", "d2", "d3", "naia", "njcaa") for s in ("outdoor", "indoor")]

def is_champ(div, season, name):
    n = " " + name.lower().replace("&", " and ") + " "
    if season not in n or "champ" not in n: return False
    if re.search(r"qualif|region|first round|preliminary round|\beast\b|\bwest\b|invitational|last chance|combined events|multi", n): return False
    if div == "naia": return "naia" in n
    if div == "njcaa": return "njcaa" in n and not re.search(r"division iii|\bdiii\b|division ii\b|\bdii\b", n)
    if "njcaa" in n or "ncaa" not in n: return False
    if div == "d3": return bool(re.search(r"division iii\b|\bdiii\b|\bd3\b", n))
    if div == "d2": return bool(re.search(r"division ii\b|\bdii\b|\bd2\b", n))
    return bool(re.search(r"division i\b|\bdi\b|\bd1\b", n))

def online():
    return subprocess.run(["curl", "-sfI", "--max-time", "15", "https://tf.tfrrs.org/"], capture_output=True).returncode == 0

def get(url):
    f = os.path.join(CACHE, re.sub(r"[^A-Za-z0-9]+", "_", url)[-180:] + ".html")
    if not os.path.exists(f):
        while not online(): time.sleep(60)
        subprocess.run(["curl", "-sfL", "--max-time", "60", "-A", UA, url, "-o", f], check=True)
        time.sleep(3)
    return open(f, encoding="utf8", errors="ignore").read()

def clean(s):
    return " ".join(H.unescape(re.sub(r"<[^>]+>", " ", s)).split())

def find_meets(div, season, y0, y1):
    out = {}
    for base in DIVQ[div]:
        for q in (f"{base} {season.title()} Championships", f"{base} {season.title()}"):
            for page in (1, 2, 3, 4):
                h = get("https://tf.tfrrs.org/results_search_page.html?search_query=" + q.replace(" ", "+") + "&with_sports=track" + (f"&page={page}" if page > 1 else ""))
                found = False
                for row in re.findall(r"<tr[^>]*>(.*?)</tr>", h, re.S):
                    cells = [clean(c) for c in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
                    link = re.search(r'href="(/results/(\d+)/[^"]+)"', row)
                    if not link or len(cells) < 2: continue
                    found = True
                    date, name = cells[0], next((c for c in cells[1:] if c), "")
                    yy = re.findall(r"(\d{2})$", date)
                    yr = 2000 + int(yy[0]) if yy else None
                    if yr and y0 <= yr <= y1 and is_champ(div, season, name) and yr not in out:
                        out[yr] = {"meet": name, "url": "https://tf.tfrrs.org" + link.group(1), "date": date}
                if not found: break
    return out

def parse_event(h):
    rounds = []
    for blk in re.split(r'<div class="custom-table-title">', h)[1:]:
        title = re.search(r"<h3[^>]*>(.*?)</h3>", blk, re.S)
        if not title: continue
        t = clean(title.group(1)); wind = re.search(r'wind-text">\s*W:\s*([-+\d.]+)', blk)
        tb = re.search(r"<table.*?</table>", blk, re.S)
        if not tb: continue
        ths = re.findall(r"<th([^>]*)>(.*?)</th>", tb.group(0), re.S)
        heads = [clean(x).upper() for _, x in ths]
        # TFRRS hides decoy columns with CSS (.round_x_y_z { display: none !important; }): only the visible one is real
        hidden = set(re.findall(r"\.([A-Za-z0-9_-]+)\s*\{\s*display:\s*none", h))
        vis = [not (re.search(r'class="([^"]+)"', a) and re.search(r'class="([^"]+)"', a).group(1) in hidden) for a, _ in ths]
        mi = next((i for i, x in enumerate(heads) if x in ("TIME", "MARK", "POINTS", "SCORE") and vis[i]), None)
        wi = next((i for i, x in enumerate(heads) if x == "WIND" and vis[i]), None)
        rows = []
        for tr in re.findall(r"<tr>(.*?)</tr>", tb.group(0), re.S):
            tds = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
            if len(tds) < 4 or mi is None or mi >= len(tds): continue
            al = re.search(r'href="([^"]*/athletes/[^"]+)"', tds[1])
            mark = (clean(tds[mi]).split(" ") or [""])[0]
            rows.append({"place": clean(tds[0]), "athlete": clean(tds[1]), "year": clean(tds[2]) if "YEAR" in heads else "",
                         "team": clean(tds[heads.index("TEAM")]) if "TEAM" in heads and heads.index("TEAM") < len(tds) else clean(tds[1]), "mark": mark,
                         "wind": clean(tds[wi]) if wi is not None and wi < len(tds) else (wind.group(1) if wind else ""),
                         "athlete_url": al.group(1) if al else ""})
        if rows: rounds.append({"title": t, "wind": wind.group(1) if wind else "", "rows": rows})
    return rounds

def event_key(title):
    g = "w" if re.match(r"women", title, re.I) else "m"
    ev = re.sub(r"^(Men's|Women's)\s+", "", title, flags=re.I)
    ev = re.sub(r"\s+(Finals?|Prelims?|Preliminaries|Semi-?finals?|Heats?|Section \d+|Flight \d+)\b.*$", "", ev, flags=re.I).strip()
    rnd = re.search(r"(Finals?|Prelims?|Semi-?finals?)", title, re.I)
    return g, ev, (rnd.group(1).title() if rnd else "Final")

def main(y0, y1):
    for div, season in MEETS:
        try: meets = find_meets(div, season, y0, y1)
        except Exception as e: print("FAILED search", div, season, e, flush=True); continue
        print(div, season, "meets:", sorted(meets), flush=True)
        for yr, M in sorted(meets.items(), reverse=True):
            out_p = os.path.join(HERE, "champs", str(yr), season, div + ".json")
            if os.path.exists(out_p) and json.load(open(out_p)).get("complete"): continue
            try: h = get(M["url"])
            except Exception as e: print("FAILED meet", M["url"], e, flush=True); continue
            mid = re.search(r"/results/(\d+)/", M["url"]).group(1)
            evs = sorted(set(re.findall(r'href="(https://tf\.tfrrs\.org/results/' + mid + r'/\d+/[^"]+)"', h)))
            data = {"meet": M["meet"], "url": M["url"], "date": M["date"], "events": {}}
            failed = 0
            for u in evs:
                try: rounds = parse_event(get(u))
                except Exception as e: print("  FAILED event", u, e, flush=True); failed += 1; continue
                for r in rounds:
                    g, ev, rnd = event_key(r["title"])
                    data["events"].setdefault(ev, {}).setdefault(g, []).append({"round": rnd, "wind": r["wind"], "rows": r["rows"]})
            data["complete"] = failed == 0 and bool(evs)
            os.makedirs(os.path.dirname(out_p), exist_ok=True)
            json.dump(data, open(out_p, "w"), indent=0)
            print(f"  {yr} {season} {div}: {len(evs)} events, {sum(len(r['rows']) for e in data['events'].values() for g in e.values() for r in g)} marks", flush=True)

if __name__ == "__main__":
    a = [int(x) for x in sys.argv[1:] if x.isdigit()]
    main(a[0] if a else 2016, a[1] if len(a) > 1 else 2026)
