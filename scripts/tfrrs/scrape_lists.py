#!/usr/bin/env python3
"""Pull TFRRS NCAA D1 outdoor conference performance lists (Ryan 2026-10-13: written consent on file to collect public TFRRS data;
public pages only, no API). Polite: 3 s between requests, identifies itself, caches every page so nothing is fetched twice.
Usage: python3 social/standards/tfrrs/scrape_lists.py 2026 [2025 ...]
Output: social/standards/tfrrs/<year>/<conference>_<m|f>.json
  {"conference","gender","season","source","events":{"100 Meters":[{"place","athlete","year","team","mark","conv","meet","date","wind","links"}]}}"""
import html, json, os, re, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
UA = "PreferredRecruit-standards/1.0 (+https://trackandfieldstandards.com)"
CACHE = os.path.join(HERE, "cache"); os.makedirs(CACHE, exist_ok=True)
last = [0.0]

def get(url, fresh=False):
    key = os.path.join(CACHE, re.sub(r"[^A-Za-z0-9]+", "_", url)[-180:] + ".html")
    if os.path.exists(key) and not fresh: return open(key, encoding="utf-8").read()
    wait = 3 - (time.time() - last[0])
    if wait > 0: time.sleep(wait)
    # curl, not urllib: this Mac's python.org Python has no CA bundle installed
    while subprocess.run(["curl", "-sfI", "--max-time", "15", "https://tf.tfrrs.org/"], capture_output=True).returncode != 0: time.sleep(60)  # wait out Wi-Fi drops
    body = subprocess.run(["curl", "-sfL", "--max-time", os.environ.get("TFRRS_MAXTIME", "60"), "-A", UA, url], capture_output=True, check=True).stdout.decode("utf-8", "replace")
    last[0] = time.time(); open(key, "w", encoding="utf-8").write(body); return body

def txt(s): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()

def parse(page):
    events = {}
    for sec in re.split(r'<a id="event\d+" name="event\d+" ></a>', page)[1:]:
        h = re.search(r'<h3 class="font-weight-500">(.*?)</h3>', sec, re.S)
        if not h: continue
        rows = []
        for r in re.split(r'<div class="performance-list-row', sec)[1:]:
            cells = {lab: txt(c) for lab, c in re.findall(r'data-label="([^"]+)">(.*?)</div>', r, re.S)}
            if not cells.get("Place"): continue
            markkey = next((k for k in ("Time", "Mark", "Points") if k in cells), None)
            links = {kind: url for url, kind in re.findall(r'href="(https://tf\.tfrrs\.org/(athletes|teams)/[^"]+)"', r)}
            meet = re.search(r'href="(https://tf\.tfrrs\.org/results/\d+/[^/"]+)"', r)
            if meet: links["meet"] = meet.group(1)
            rows.append({"place": int(re.sub(r"\D", "", cells["Place"]) or 0), "athlete": cells.get("Athlete", ""),
                         "year": cells.get("Year", ""), "team": cells.get("Team", ""), "mark": cells.get(markkey, ""),
                         "conv": cells.get("Conv", ""), "meet": cells.get("Meet", ""), "date": cells.get("Meet Date", ""),
                         "wind": cells.get("Wind", ""), "links": links})
        events[txt(h.group(1))] = rows
    return events

def by_event(url, g, limit, fresh=False):
    """Full-depth fallback (Ryan 2026-10-22): TFRRS times out (504) building the biggest lists in one page (D1/D3/NAIA national
    women), so fetch them one event at a time with the list's own event filter (event_type) and merge."""
    opts = re.findall(r'<option value="(\d+)"\s*>\s*([^<]+?)\s*</option>', re.search(r'(?s)name="event_type".*?</select>', get(f"{url}?gender={g}", fresh)).group(0))
    events = {}
    for v, name in opts:
        ev = parse(get(f"{url}?gender={g}&limit={limit}&event_type={v}", fresh))
        events.update(ev)
    return events

DIVISIONS = ["d1", "d2", "d3", "naia", "njcaa", "nccaa", "nwac", "uscaa"]

def main(years, divisions=DIVISIONS, seasons=("outdoor", "indoor"), fresh=False, limit=None, root="lists"):
    """Every list (conference, region, national) for every division/season/year.
    Output: lists/<year>/<season>/<division>/<list name>_<m|f>.json. fresh=True refetches (daily current-season run).
    limit=10000 + root="lists_full" (Ryan 2026-10-22: "everything should be in there from every year back until 2016"): TFRRS
    lists default to ~25-100 per event; ?limit= returns every athlete with a mark (D1 2026 men's 1500m: 3,099)."""
    for year in years:
        for season in seasons:
            for div in divisions:
                try: d = get(f"https://tf.tfrrs.org/directory_tab.html?outdoor={1 if season == 'outdoor' else 0}&tab={div}&year={year}", fresh)
                except Exception as e: print("FAILED directory", year, season, div, e, flush=True); continue
                lists = sorted(set(re.findall(r'href="(https://tf\.tfrrs\.org/lists/\d+/([^"?]+))"', d)))
                out_dir = os.path.join(HERE, root, year, season, div); os.makedirs(out_dir, exist_ok=True)
                print(f"{year} {season} {div}: {len(lists)} lists", flush=True)
                for url, name in lists:
                    for g in ("m", "f"):
                        out = os.path.join(out_dir, f"{name[:120]}_{g}.json")
                        if os.path.exists(out) and not fresh: continue
                        try:
                            # national lists are too big for TFRRS to build in one page at full depth: go event by event
                            if limit and re.search(r"Qualifying|Indoor_List|Outdoor_List|Rankings|All_Schools", name): ev = by_event(url, g, limit, fresh)
                            else: ev = parse(get(f"{url}?gender={g}" + (f"&limit={limit}" if limit else "&limit=500" if div == "njcaa" else ""), fresh))  # NJCAA standards use the 150th national mark
                        except Exception as e:
                            if not limit: print("  FAILED", name, g, e, flush=True); continue
                            try: ev = by_event(url, g, limit, fresh); print(f"  {name} {g}: fetched event by event", flush=True)
                            except Exception as e2: print("  FAILED", name, g, e2, flush=True); continue
                        json.dump({"list": name.replace("_", " "), "division": div, "season": season, "year": year, "gender": g,
                                   "source": f"{url}?gender={g}", "limit": limit, "events": ev}, open(out, "w"))
                        print(f"  {name} {g}: {sum(len(v) for v in ev.values())} marks", flush=True)

if __name__ == "__main__":
    args = sys.argv[1:]
    fresh = "--fresh" in args
    full = "--full" in args
    years = [a for a in args if a.isdigit()] or ["2026"]
    main(years, fresh=fresh, limit=10000 if full else None, root="lists_full" if full else "lists")
