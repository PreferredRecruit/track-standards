"""Monday results refresh (Ryan 2026-10-13: "i dont need tffrs everyday scraped just like mondays").
Scrapes the current season from TFRRS (performance lists + any national championship meet, decoy-safe), builds the
results files and writes them to ./out/ for the workflow to publish on the `data` branch:
  out/rank/<year>-<season>-<div>.dat   gzip JSON, same format as public/data/rank/*.dat
  out/rank_index.json                  [{key, year, season, div, n}] for this season
  out/updated.json                     {"updated": "<ISO date>"}
The site reads these first and falls back to its built-in copy in public/data/."""
import datetime, glob, gzip, json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out"); os.makedirs(os.path.join(OUT, "rank"), exist_ok=True)
sys.path.insert(0, HERE)
import scrape_lists, scrape_champs

year = datetime.date.today().year
scrape_lists.main([str(year)], fresh=True)
scrape_champs.main(year, year)
tmp = os.path.join(HERE, "rank_tmp")
subprocess.run([sys.executable, os.path.join(HERE, "build_rank.py")], check=True,
               env={**os.environ, "TFRRS_LISTS": os.path.join(HERE, "lists"), "TFRRS_CHAMPS": os.path.join(HERE, "champs"), "RANK_OUT": tmp})
idx = [x for x in json.load(open(os.path.join(tmp, "rank_index.json"))) if x["year"] == str(year)]
for x in idx:
    with open(os.path.join(tmp, x["key"] + ".json"), "rb") as a, gzip.open(os.path.join(OUT, "rank", x["key"] + ".dat"), "wb", compresslevel=9) as b:
        b.write(a.read())
json.dump(idx, open(os.path.join(OUT, "rank_index.json"), "w"))
json.dump({"updated": datetime.datetime.utcnow().isoformat(timespec="minutes") + "Z"}, open(os.path.join(OUT, "updated.json"), "w"))
print(len(idx), "result sets for", year, "·", len(glob.glob(os.path.join(OUT, "rank", "*.dat"))), "files")
