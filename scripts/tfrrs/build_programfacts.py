#!/usr/bin/env python3
"""Program facts for every school page (Ryan 2026-10-25: "roster size, freshman/transfer counts ... the granular details families
are looking for"). From each program's TFRRS team page (men's and women's; written consent on file, cached in
social/standards/tfrrs/cache, polite 3 s per new page) and the athlete careers we already build:
  roster     athletes on the current TFRRS roster, by class (FR / SO / JR / SR, redshirts in the class TFRRS lists)
  fr         freshmen (FR-1) on the roster
  transfers  roster athletes whose TFRRS career shows an earlier season at another school
  season     the roster's season, as TFRRS labels it ("2026 Outdoor")
Output: public/data/programfacts.json {school name: {"m": {...}, "w": {...}}}
Usage: python3 scripts/tfrrs/build_programfacts.py [--cached-only]"""
import collections, gzip, json, os, re, subprocess, sys, time
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(SITE, "..", "..", "social", "standards", "tfrrs", "cache")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
CACHED_ONLY = "--cached-only" in sys.argv

def get(url):
    f = os.path.join(CACHE, re.sub(r"[^A-Za-z0-9]+", "_", url) + ".html")
    if not os.path.exists(f):
        if CACHED_ONLY: return ""
        r = subprocess.run(["curl", "-sL", "--max-time", "60", "-A", UA, "-w", "%{http_code}", "-o", f + ".part", url], capture_output=True, text=True)
        time.sleep(3)
        if not r.stdout.startswith("2"):
            if os.path.exists(f + ".part"): os.remove(f + ".part")
            return ""
        os.replace(f + ".part", f)
    return open(f, encoding="utf8", errors="ignore").read()

def roster(h):
    i, j = h.find(">ROSTER<"), h.find("LATEST RESULTS")
    if i < 0: return None, []
    sea = re.search(r"<option[^>]*selected[^>]*>\s*([^<]+?)\s*<", h)
    out = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", h[i:j if j > i else None], re.S):
        a = re.search(r'href="[^"]*/athletes/(\d+)/', row); cl = re.search(r"\b(FR|SO|JR|SR)-\d\b", row)
        if a: out.append((a.group(1), cl.group(1) if cl else ""))
    return (sea.group(1) if sea else ""), out

def main():
    d = json.load(open(os.path.join(SITE, "public", "data", "db.json")))
    CAR = {}
    for f in os.listdir(os.path.join(SITE, "public", "data", "career")):
        if f.endswith(".dat"): CAR.update(json.loads(gzip.decompress(open(os.path.join(SITE, "public", "data", "career", f), "rb").read())))
    out, n = {}, 0
    for s in d["schools"]:
        if s["d"] == "NJCAA" or not s.get("u"): continue
        F = {}
        for g, tg in (("m", "m"), ("w", "f")):
            if g in (s.get("ng") or []): continue
            url = re.sub(r"_college_[mf]_", f"_college_{tg}_", s["u"])
            sea, R = roster(get(url))
            if not R: continue
            cls = collections.Counter(c for _, c in R)
            team = s.get("t") or s["n"]
            def moved(aid):
                a = CAR.get(aid)
                if not a: return False
                teams = [x[5] for x in sorted(a["s"], key=lambda x: x[0])]
                return bool(a.get("p")) or (len(set(teams)) > 1 and teams[-1] != teams[0])
            # a near-empty or class-less TFRRS roster is an incomplete page, not a real team size: show nothing rather than a wrong number
            if len(R) < 5 or (cls["FR"] + cls["SO"] + cls["JR"] + cls["SR"]) < 0.6 * len(R): continue
            F[g] = {"roster": len(R), "fr": cls["FR"], "so": cls["SO"], "jr": cls["JR"], "sr": cls["SR"],
                    "transfers": sum(1 for aid, _ in R if moved(aid)), "season": sea}
        if F: out[s["n"]] = F; n += 1
    json.dump(out, open(os.path.join(SITE, "public", "data", "programfacts.json"), "w"), separators=(",", ":"), ensure_ascii=False)
    print(n, "programs with roster facts")

if __name__ == "__main__": main()
