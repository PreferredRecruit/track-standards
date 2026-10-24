#!/usr/bin/env python3
"""Programs on the TFRRS national lists with no school page (2026-10-24 audit: Oregon State and Washington State searches fell back to
our University of Oregon page; Ryan: "start with the missing schools like Oregon State and Washington State to reclaim that lost traffic").
Each gets a school page: conference levels when its conference has a TFRRS list on this site (North Alabama ASUN, Presbyterian Big South,
Shepherd PSAC, the Peach Belt / Gulf South / GNAC schools), otherwise its division's typical levels marked as an estimate (the site's
existing est/emdiv treatment), only for the genders and events it actually competes in (2026 outdoor national lists).
Puerto Rico programs and Cheyney are left out until their conference is confirmed. Usage: python3 scripts/data/add_missing_schools.py [--write]"""
import gzip, json, os, re, statistics, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fix_levels import val as fval, fmt as ffmt
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(SITE, "public", "data", "db.json")
EVN = {"100 Meters": "100m", "200 Meters": "200m", "400 Meters": "400m", "800 Meters": "800m", "1500 Meters": "1500m", "5000 Meters": "5000m",
       "10,000 Meters": "10000m", "100 Hurdles": "100m Hurdles", "110 Hurdles": "110m Hurdles", "400 Hurdles": "400m Hurdles",
       "3000 Steeplechase": "3000m Steeplechase", "High Jump": "High Jump", "Pole Vault": "Pole Vault", "Long Jump": "Long Jump",
       "Triple Jump": "Triple Jump", "Shot Put": "Shot Put", "Discus": "Discus", "Hammer": "Hammer", "Javelin": "Javelin"}
#        TFRRS team          full name                                   division   conference      state  TFRRS team page (m or f)
NEW = [("Oregon State",       "Oregon State University",                  "NCAA D1", "Pac 12",        "OR", "OR_college_f_Oregon_State"),
       ("Washington St.",     "Washington State University",              "NCAA D1", "Pac 12",        "WA", "WA_college_m_Washington_State"),   # short name set to "Washington State" for titles
       ("St. Mary's (Cal.)",  "Saint Mary's College of California",       "NCAA D1", "WCC",           "CA", "CA_college_m_St_Marys_CA"),
       ("Stetson",            "Stetson University",                       "NCAA D1", "ASUN",          "FL", "FL_college_m_Stetson"),
       ("Florida Gulf Coast", "Florida Gulf Coast University",            "NCAA D1", "ASUN",          "FL", "FL_college_m_Florida_Gulf_Coast"),
       ("Presbyterian",       "Presbyterian College",                     "NCAA D1", "Big South",     "SC", "SC_college_m_Presbyterian"),
       ("North Alabama",      "University of North Alabama",              "NCAA D1", "ASUN",          "AL", "AL_college_m_North_Alabama"),
       ("Georgia College",    "Georgia College & State University",       "NCAA D2", "Peach Belt",    "GA", "GA_college_m_GCSU"),
       ("Gannon",             "Gannon University",                        "NCAA D2", "PSAC",          "PA", "PA_college_m_Gannon"),
       ("Florida Tech",       "Florida Institute of Technology",          "NCAA D2", "Sunshine State","FL", "FL_college_m_Florida_Tech"),
       ("Alaska Fairbanks",   "University of Alaska Fairbanks",           "NCAA D2", "GNAC",          "AK", "AK_college_m_Alaska_Fairbanks"),
       ("Valdosta State",     "Valdosta State University",                "NCAA D2", "Gulf South",    "GA", "GA_college_m_Valdosta_State"),
       ("Shepherd",           "Shepherd University",                      "NCAA D2", "PSAC",          "WV", "WV_college_m_Shephard_University"),
       ("USC Aiken",          "University of South Carolina Aiken",       "NCAA D2", "Peach Belt",    "SC", "SC_college_f_USC_Aiken"),
       ("West Florida",       "University of West Florida",               "NCAA D2", "Gulf South",    "FL", "FL_college_m_West_Florida"),
       ("Middle Georgia State","Middle Georgia State University",         "NCAA D2", "Peach Belt",    "GA", "GA_college_f_Middle_Georgia")]
slugOf = lambda n: re.sub(r"-+", "-", re.sub(r"\s+", "-", re.sub(r"[^a-z0-9\s-]", "", n.lower()))).strip() + "-track-standards"

def main(write):
    d = json.load(open(P)); ct = d["ct"]; have = {s["n"] for s in d["schools"]}
    # division typical levels (median across conferences, estimates excluded), as in sweep_2026_10_19.py
    pool = {}
    for k, v in ct.items():
        dv = k.split("|")[0]
        for g in "mw":
            for e, row in (v.get(g) or {}).items():
                for j, c in enumerate(row or []):
                    if c and not (len(c) > 2 and c[2]):
                        x = fval(c[0], e)
                        if x: pool.setdefault((dv, g, e, j), []).append(x)
    med = {k: statistics.median(v) for k, v in pool.items() if len(v) >= 5}
    rank = {dv: json.loads(gzip.decompress(open(os.path.join(SITE, "public", "data", "rank", f"2026-outdoor-{dv[-2:].lower()}.dat"), "rb").read())) for dv in ("NCAA D1", "NCAA D2")}
    added = []
    for t, n, dv, c, st, u in NEW:
        if n in have: continue
        D = rank[dv]; ti = D["teams"].index(t); nat = next(l for l in D["lists"] if l.get("nat"))
        evs = {g: sorted({EVN[e] for e, rows in (nat["g"].get(g) or {}).items() if e in EVN and any(r[3] == ti for r in rows)}) for g in "mw"}
        s = {"n": n, "t": t, "d": dv, "c": c, "ck": "", "s": st, "a": sorted({n.lower(), t.lower(), t.lower().replace("st.", "state")}),
             "u": f"https://tf.tfrrs.org/teams/tf/{u}.html", "os": [slugOf(n)]}
        ng = [g for g in "mw" if not evs[g]]
        if ng: s["ng"] = ng
        key = f"{dv}|{c}"
        if ct.get(key) and any(ct[key].get(g) for g in "mw"): s["ck"] = key
        else:
            em = {}
            for g in "mw":
                for e in evs[g]:
                    row = []
                    for j in range(3):
                        if (d["rules"].get(dv) or [1, 1, 1])[j] is None: row.append(""); continue
                        m = med.get((dv, g, e, j)); row.append(ffmt(m, e)[0] if m else "")
                    if any(row): em.setdefault(g, {})[e] = row
            s.update(est=1, em=em, emdiv=1)
        d["schools"].append(s); added.append(f"{n} ({dv}, {c}, {'conference levels' if s['ck'] else 'division estimate'}, {'+'.join(g for g in 'mw' if evs[g])})")
    # pages that exist under another name: give them the TFRRS team name + team page so results and team pages connect
    for n, alias, u, short in [("Saint Mary's College of California", "st. mary's (cal.)", "CA_college_m_St_Marys_CA", "Saint Mary's"),
                               ("Florida Institute of Technology", "florida tech", "FL_college_m_Florida_Tech", "Florida Tech")]:
        x = next((y for y in d["schools"] if y["n"] == n), None)
        if x and alias not in x["a"]: x["a"] = sorted(set(x["a"]) | {alias, short.lower()}); x["u"] = x.get("u") or f"https://tf.tfrrs.org/teams/tf/{u}.html"; x["t"] = short; added.append(f"{n}: linked to TFRRS '{alias}'")
    d["schools"].sort(key=lambda x: x["n"].lower())
    print("\n".join(added) or "nothing to add")
    if write: json.dump(d, open(P, "w"), separators=(",", ":"), ensure_ascii=False); print("written", len(added))

if __name__ == "__main__": main("--write" in sys.argv)
