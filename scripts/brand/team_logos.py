#!/usr/bin/env python3
"""
Logos for ranked teams that have no school page (2026-11-03, Ryan: "need those logos" for the JUCO rankings).

NWAC colleges are ranked in the Power Rankings but are not in db.json, so harvest.py never sees them. This script maps each
TFRRS team spelling to its college, finds the college's official website through Wikipedia -> Wikidata (P856), and runs
harvest.py's own logo + colour extraction on it (same rules: official site only, no sponsor/conference marks, never works
around a bot challenge). Output:
    public/brand/logos/team-<div>-<slug>.webp
    public/brand/teams.json   {"<DIV>|<TFRRS team name>": {"logo", "primary", "src", "conf"}}
rankings.mjs uses teams.json for any ranked team without a school record.

Usage (from sites/track-standards/):  python3 scripts/brand/team_logos.py
"""
import importlib.util
import json
import os
import re
import subprocess
import time
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
UA = "PreferredRecruit-standards/1.0 (logo lookup; ryanapsearl@gmail.com)"

# division -> college (Wikipedia title) -> every TFRRS spelling of that team
TEAMS = {
    "NWAC": {
        "Chemeketa Community College": ["Chemeketa CC", "Chemeketa (Ore.) CC"],
        "Clackamas Community College": ["Clackamas CC"],
        "Clark College": ["Clark College"],
        "Edmonds College": ["Edmonds College"],
        "Everett Community College": ["Everett CC", "Everett Community College"],
        "Green River College": ["Green River", "Green River CC", "Green River College"],
        "Lane Community College": ["Lane CC"],
        "Mt. Hood Community College": ["Mt. Hood CC"],
        "Olympic College": ["Olympic College"],
        "Pierce College (Washington)": ["Pierce College (WA)"],
        "Rogue Community College": ["Rogue CC"],
        "Southwestern Oregon Community College": ["SW Oregon CC"],
        "Skagit Valley College": ["Skagit Valley"],
        "Spokane Community College": ["Spokane CC"],
        "Treasure Valley Community College": ["Treasure Valley CC"],
        "Umpqua Community College": ["Umpqua CC"],
    },
}


def get_json(url):
    for _ in range(3):
        r = subprocess.run(["curl", "-sL", "--max-time", "25", "-A", UA, "-w", "\n%{http_code}", url], capture_output=True, text=True)
        body, _, code = r.stdout.rpartition("\n")
        time.sleep(3)
        if code == "200":
            try:
                return json.loads(body)
            except ValueError:
                return None
        time.sleep(15)
    return None


def official_site(title):
    j = get_json("https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&format=json&redirects=1&titles=" + urllib.parse.quote(title))
    try:
        qid = next(iter(j["query"]["pages"].values()))["pageprops"]["wikibase_item"]
    except (KeyError, TypeError, StopIteration):
        return None
    e = get_json(f"https://www.wikidata.org/wiki/Special:EntityData/{qid}.json")
    try:
        cl = e["entities"][qid]["claims"].get("P856", [])
        return cl[0]["mainsnak"]["datavalue"]["value"] if cl else None
    except (KeyError, TypeError, IndexError):
        return None


def main():
    spec = importlib.util.spec_from_file_location("harvest", os.path.join(HERE, "harvest.py"))
    hv = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(hv)
    out_path = os.path.join(ROOT, "public", "brand", "teams.json")
    out = hv.load_json(out_path, {})
    for div, colleges in TEAMS.items():
        for title, names in colleges.items():
            slug = "team-" + div.lower() + "-" + re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
            ws = official_site(title)
            rec = {"logo": None, "primary": None, "src": None, "conf": None}
            if ws:
                r, dbg = hv.harvest_one({"n": title, "ws": ws}, slug)
                rec = {k: r.get(k) for k in ("logo", "primary", "src", "conf")}
            print(f"{title[:40]:40} {ws or '-':42} logo={bool(rec['logo'])} conf={rec['conf']}", flush=True)
            for n in names:
                out[f"{div}|{n}"] = rec
    hv.write_json(out_path, out, indent=1, sort_keys=True)


if __name__ == "__main__":
    main()
