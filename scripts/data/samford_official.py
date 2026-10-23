"""Samford official standards (Ryan 2026-10-22): the coaching staff's "Scholarship Structure Guidelines" (SoCon place points 1st-8th
+ walk-on standards). Women: the .docx Ryan sent; men: the same document as shown in Preferred Recruit's Instagram reel DcTYkktzXRL
(chart in use by Apr 2025, TikTok 7494063390420274478). Levels follow the site's Samford mapping: Target = 3rd place (6 pts),
Recruit = 6th place (3 pts), Walk-On = the listed walk-on standard. The full chart (all 8 places + walk-on) is kept in `off`.
Usage: python3 scripts/data/samford_official.py [--write]"""
import json, sys, re, pathlib
P = pathlib.Path(__file__).resolve().parents[2] / "public/data/db.json"
PL = ["1st (10 pts)", "2nd (8)", "3rd (6)", "4th (5)", "5th (4)", "6th (3)", "7th (2)", "8th (1)", "Walk-On"]
W = {  # event: 1st..8th, walk-on (as printed)
 "100m": "11.52 11.60 11.69 11.76 11.87 11.89 11.91 11.94 12.00", "200m": "23.60 23.95 24.00 24.24 24.42 24.53 24.63 24.72 25.00",
 "400m": "54.24 54.80 55.55 55.80 56.20 56.30 56.4 56.50 57.50", "100m Hurdles": "13.32 13.48 13.54 13.92 14.15 14.24 14.46 14.56 14.80",
 "400m Hurdles": "58.25 58.72 60.10 60.55 61.23 61.78 62.37 62.56 64.00", "300m Hurdles": "42.00 42.20 42.40 42.60 42.80 42.90 43.10 43.25 44.00",
 "800m": "2:07 2:09 2:09 2:10 2:12 2:12 2:14 2:14 2:15", "Mile": "4:45 4:47 4:48 4:49 4:52 4:55 4:56 4:59 5:05",
 "3000m": "9:27 9:32 9:52 9:59 10:00 10:06 10:09 10:10 10:45", "3000m Steeplechase": "10:13 11:01 11:03 11:07 11:20 11:22 11:24 11:45 12:20",
 "5000m": "16:26 17:07 17:09 17:17 17:20 17:22 17:26 17:34 18:30", "10000m": "33:53 35:48 38:16 38:21 38:36 38:45 38:57 39:04 40:00",
 "High Jump": "5'9 5'7 5'6 5'6 5'5 5'5 5'5 5'4 5'4", "Pole Vault": "13'6 13'0 12'6 12'6 12'3 12'0 12'0 12'0 11'6",
 "Long Jump": "20'0 19'6 19'2 19'0 18'9 18'6 18'6 18'4 18'0", "Triple Jump": "40'0 39'6 39'2 38'8 38'4 38'0 37'11 37'10 37'0",
 "Shot Put": "49'0 48'0 47'0 46'6 46'0 45'6 45'0 44'6 42'0", "Discus": "165'0 155'0 150'0 148'0 147'0 146'0 145'0 140'0 135'0",
 "Hammer": "190'0 185'0 180'0 175'0 170'0 168'0 165'0 160'0 150'0", "Javelin": "160'0 155'0 150'0 145'0 140'0 135'0 132'0 130'0 120'0",
 "Heptathlon": "5200 4850 4600 4500 4400 4300 4200 4100 4050"}
M = {
 "100m": "10.30 10.50 10.65 10.70 10.75 10.77 10.80 10.85 10.90", "200m": "21.05 21.35 21.50 21.65 21.69 21.72 21.80 21.88 21.90",
 "400m": "46.80 47.30 47.74 48.14 48.22 48.31 48.86 48.94 49.00", "110m Hurdles": "13.80 13.85 14.04 14.12 14.35 14.44 14.56 14.66 14.75",
 "400m Hurdles": "52.25 53.02 53.80 54.25 54.53 54.78 55.07 55.56 56.50", "300m Hurdles": "37.00 37.25 37.50 37.75 37.80 37.90 38.00 38.10 39.00",
 "800m": "1:50 1:50.5 1:51 1:51.5 1:52 1:52.5 1:53.5 1:54 1:55", "Mile": "4:02 4:04 4:05 4:07 4:09 4:11 4:12 4:13 4:19",
 "3000m": "8:00 8:10 8:12 8:15 8:25 8:28 8:30 8:31 9:10", "3000m Steeplechase": "8:45 9:00 9:05 9:10 9:12 9:15 9:18 9:25 9:45",
 "5000m": "14:10 14:15 14:20 14:25 14:30 14:35 14:40 14:45 15:20", "10000m": "29:30 29:45 30:00 30:10 30:25 30:40 30:50 31:00 32:00",
 "High Jump": "7'0 6'10 6'9 6'8 6'7 6'7 6'6 6'6 6'4", "Pole Vault": "18'0 17'6 17'0 16'6 16'3 16'0 15'10 15'4 14'6",
 "Long Jump": "24'6 24'0 23'9 23'6 23'3 23'0 22'10 22'9 22'0", "Triple Jump": "51'0 50'6 50'0 49'8 49'4 48'6 48'4 48'0 46'0",
 "Shot Put": "55'0 53'0 52'0 51'6 50'0 49'6 49'0 48'6 48'0", "Discus": "165'0 160'0 158'0 153'0 150'0 149'0 148'0 147'0 140'0",
 "Hammer": "200'0 195'0 190'0 185'0 180'0 173'0 165'0 160'0 155'0", "Javelin": "220'0 205'0 200'0 198'0 195'0 192'0 190'0 189'0 165'0",
 "Decathlon": "7000 6750 6700 6600 6650 6600 6500 6300 6000"}
LABEL = {"m": {"Shot Put": "Shot Put (16lb)", "Discus": "Discus (2kg)", "Hammer": "Hammer (16lb)"}, "w": {}}
def fmt(v):
    m = re.fullmatch(r"(\d+)'(\d+)", v)
    if not m: return v
    ft, inch = int(m[1]), int(m[2]); return f"{ft}'{inch}\" ({(ft * 12 + inch) * 0.0254:.2f}m)"
def main(write):
    d = json.load(open(P)); s = next(x for x in d["schools"] if x["n"] == "Samford University")
    off, om = {}, {}
    for g, T in (("m", M), ("w", W)):
        rows = []; om[g] = {}
        for e, line in T.items():
            v = [fmt(x) for x in line.split()]; assert len(v) == 9, e
            rows.append([LABEL[g].get(e, e)] + v)
            if "thlon" not in e: om[g][e] = [v[2], v[5], v[8]]
        off[g] = {"tiers": PL, "rows": rows}
    s.update(o=1, yr="2025", off=off, om=om, src="https://www.instagram.com/reel/DcTYkktzXRL/",
             via="Samford's Scholarship Structure Guidelines (coaching staff document, SoCon place points)")
    print(json.dumps(om["m"]["High Jump"]), json.dumps(om["w"]["Mile"]))
    if write: json.dump(d, open(P, "w"), ensure_ascii=False, separators=(",", ":")); print("written")
if __name__ == "__main__": main("--write" in sys.argv)
