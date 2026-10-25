#!/usr/bin/env python3
"""Previous-years standards (Ryan 2026-10-25: "2024/2025 Current Standards featured prominently ... Standards from 2004-2023 compiled
as ... a 'Previous Years' section at the bottom of the page to avoid clutter while providing comparison value").
Earlier research passes (social/standards/data/*/<slug>.json) found official charts on schools' own sites that are older than 2024
or undated, transcribed and verified mark for mark against the live page (verified.status "stale"). They never set a school's levels;
this attaches them to the school as an archive:
    db.json school "arch": [{"yr": "2012" | "Undated", "src": school-site URL, "m": {"tiers", "rows"}, "w": {...}}]
Newest first. Marks go through the same cleaner as current official charts (scripts/data/clean_official_marks.py).
Usage: python3 scripts/data/import_archive_charts.py [--write]"""
import glob, json, os, re, sys
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RES = os.path.join(SITE, "..", "..", "social", "standards", "data")
P = os.path.join(SITE, "public", "data", "db.json")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clean_official_marks import clean, TYPO, FIELD
fnorm = lambda x: re.sub(r"[^a-z0-9&]+", " ", re.sub(r"\bst\.(?=\s|$)", "state", re.sub(r"\s*\([a-z.]+\)\s*$", "", str(x or "").lower()))).strip()

def year(j):
    v = j.get("verified") or {}
    if isinstance(v, dict) and str(v.get("published_year") or "").isdigit(): return str(v["published_year"])
    m = re.search(r"\b(20[0-2]\d)\b", str(j.get("doc_date") or ""))
    return m.group(1) if m and not re.match(r"(?i)\s*undated", str(j.get("doc_date") or "")) else "Undated"

def tidy(side):
    if not side or not side.get("rows"): return None
    rows = []
    for r in side["rows"]:
        r = [TYPO(x) for x in r]
        if FIELD.search(str(r[0])): r = [r[0]] + [clean(x)[0] for x in r[1:]]
        rows.append(r)
    return {"tiers": [TYPO(t) for t in side.get("tiers") or []], "rows": rows}

def main(write):
    d = json.load(open(P)); idx = {}
    for s in d["schools"]:
        if s["d"] == "NJCAA": continue
        for a in [s.get("t"), s["n"], *(s.get("a") or [])]:
            if a: idx.setdefault(fnorm(a), s)
    added, miss = [], []
    for s in d["schools"]: s.pop("arch", None)
    for f in sorted(glob.glob(os.path.join(RES, "*", "*.json"))):
        try: j = json.load(open(f))
        except Exception: continue
        if not isinstance(j, dict) or (j.get("verified") or {}).get("status") != "stale": continue
        MAP = {"University of Hawai'i at Mānoa": "University of Hawaii", "Southern Illinois University Edwardsville": "SIU Edwardsville",
               "The University of Texas Rio Grande Valley": "UT Rio Grande Valley"}   # names the research files spell differently
        s = next((x for x in d["schools"] if x["n"] == MAP.get(j.get("university"))), None) or \
            next((idx[k] for k in (fnorm(j.get("university")), fnorm(j.get("school")), fnorm(j.get("short"))) if k in idx), None)
        if not s: miss.append(j.get("university") or j.get("school")); continue
        m, w = tidy(j.get("mens")), tidy(j.get("womens"))
        if not (m or w): continue
        src = next((u for u in (j.get("verified") or {}).get("source_checked", "").split() if u.startswith("http")), None) or (j.get("source_urls") or [None])[0]
        e = {"yr": year(j), "src": src}
        if m: e["m"] = m
        if w: e["w"] = w
        s.setdefault("arch", []).append(e); added.append(f"{s['n']} ({e['yr']})")
    for s in d["schools"]:
        if s.get("arch"): s["arch"].sort(key=lambda e: e["yr"] if e["yr"].isdigit() else "0000", reverse=True)
    print(len(added), "archived charts attached:", ", ".join(added[:12]), "...")
    print("no matching school:", miss)
    if write: json.dump(d, open(P, "w"), separators=(",", ":"), ensure_ascii=False); print("written")

if __name__ == "__main__": main("--write" in sys.argv)
