"""Official championship team scores (Ryan 2026-10-30: rankings must be indisputable). Scoring from places can't reproduce the
official totals (split ties in the high jump/pole vault, DQs, rescoring: 2026 D1 men Arkansas 58 from places vs 56 official), so the
Power Index uses the TEAM SCORES tables from each national championship's TFRRS meet page.
Writes public/data/teamscores/<year>-<season>-<div>.json {meet, source, saved, m: {team: pts}, w: {team: pts}}.
Usage: python3 fetch_teamscores.py <first_year> <last_year> [out_dir]   (weekly.py runs it for the current year)"""
import datetime, html as H, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scrape_champs as C

def scores(page):
    out = {}
    for m in re.finditer(r'<table[^>]*id="team_scores_([mfw])"[^>]*>(.*?)</table>', page, re.S):
        gen = "m" if m.group(1) == "m" else "w"
        t = {}
        for row in re.findall(r"<tr[^>]*>(.*?)</tr>", m.group(2), re.S):
            c = [" ".join(H.unescape(re.sub(r"<[^>]+>", " ", x)).split()) for x in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
            if len(c) >= 3 and re.match(r"^\d+$", c[0]):
                try: t[c[1]] = float(c[2]) if "." in c[2] else int(c[2])
                except ValueError: pass
        if t: out[gen] = t
    return out

if __name__ == "__main__":
    y0, y1 = int(sys.argv[1]), int(sys.argv[2])
    dest = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "data", "teamscores")
    os.makedirs(dest, exist_ok=True)
    for div in ("d1", "d2", "d3", "naia"):
        for season in ("outdoor", "indoor"):
            try: meets = C.find_meets(div, season, y0, y1)
            except Exception as e: print("search failed", div, season, e); continue
            for yr, M in sorted(meets.items()):
                try: s = scores(C.get(M["url"]))
                except Exception as e: print("fetch failed", yr, season, div, e); continue
                if not s.get("m") or not s.get("w"): print("no team scores", yr, season, div, M["url"]); continue
                json.dump({"meet": M["meet"], "source": M["url"], "saved": datetime.date.today().isoformat(), **s}, open(os.path.join(dest, f"{yr}-{season}-{div}.json"), "w"), indent=0)
                print(yr, season, div, len(s["m"]), "men's teams,", len(s["w"]), "women's teams", "|", M["meet"])
