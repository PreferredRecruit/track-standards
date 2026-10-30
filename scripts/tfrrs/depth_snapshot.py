"""Weekly ranking snapshot (Ryan 2026-10-30: "weekly, monthly, yearly rankings"). Run by weekly.py after this Monday's lists are built.
Same method as scripts/seo/depth.mjs: top 50 men + top 50 women in every individual event of the national list, one entry per spot,
relays out, B/C squads count for their school, competition ranks. Appends {date, d, key, ranks: {team: rank}} for each current-season
division list to the history already on the data branch, so the site can show movement vs last week and last month."""
import datetime, gzip, json, os, re, sys, urllib.request
OUT = sys.argv[1]
DIV = {"d1": "NCAA D1", "d2": "NCAA D2", "d3": "NCAA D3", "naia": "NAIA"}
URL = "https://raw.githubusercontent.com/PreferredRecruit/track-standards/data/depth_history.json"
try: hist = json.loads(urllib.request.urlopen(URL, timeout=20).read())
except Exception as e: print("no previous depth history:", e); hist = []
today = datetime.date.today().isoformat()
hist = [h for h in hist if h["date"] != today]
for f in sorted(os.listdir(os.path.join(OUT, "rank"))):
    m = re.match(r"^(\d{4})-(indoor|outdoor)-(d1|d2|d3|naia)\.dat$", f)
    if not m: continue
    D = json.loads(gzip.open(os.path.join(OUT, "rank", f)).read())
    L = next((l for l in D.get("lists", []) if l.get("nat")), None)
    if not L: continue
    n = {}
    for g in ("m", "w"):
        for ev, rows in (L.get("g", {}).get(g) or {}).items():
            if re.search(r"relay|dmr|smr", ev, re.I): continue
            for r in rows[:50]:
                t = re.sub(r" \([B-H]\)$", "", str(D["teams"][r[3]] if r[3] < len(D["teams"]) else ""))
                if t: n[t] = n.get(t, 0) + 1
    if not n: continue
    order = sorted(n.items(), key=lambda x: (-x[1], x[0])); ranks, prev, rk = {}, None, 0
    for i, (t, v) in enumerate(order):
        if v != prev: rk, prev = i + 1, v
        ranks[t] = rk
    hist.append({"date": today, "d": DIV[m.group(3)], "key": f"{m.group(1)}-{m.group(2)}", "ranks": ranks})
cut = (datetime.date.today() - datetime.timedelta(days=800)).isoformat()   # keep about two seasons
hist = [h for h in hist if h["date"] >= cut]
json.dump(hist, open(os.path.join(OUT, "depth_history.json"), "w"), separators=(",", ":"))
print("depth snapshots:", len(hist))
