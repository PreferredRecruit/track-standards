#!/usr/bin/env python3
"""Keep vercel.json redirects consistent with the built pages (2026-10-23 audit: the /colleges-for/ mark ladder follows the
standards data, so old consolidation redirects began hiding live pages (Vercel applies redirects before files) and pointing at
pages that no longer exist, a 404 for URLs listed in the sitemap).
  - a redirect whose source page exists again is removed
  - a redirect whose target is gone is pointed at the nearest existing /colleges-for/ page for the same event (or removed)
Run after `npm run build` whenever standards data changes: python3 scripts/seo/fix_redirects.py [--write]"""
import json, os, re, sys
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIST = os.path.join(SITE, "dist")
exists = lambda p: any(os.path.exists(DIST + x) for x in (p, p + ".html", p.rstrip("/") + "/index.html"))
LAD = re.compile(r"^/colleges-for/(.+)-(\d+)-(\d+)\.html$")
pages = {}
for f in os.listdir(os.path.join(DIST, "colleges-for")):
    m = LAD.match("/colleges-for/" + f)
    if m: pages.setdefault(m.group(1), []).append((float(f"{m.group(2)}.{m.group(3)}"), "/colleges-for/" + f))

def main(write):
    v = json.load(open(os.path.join(SITE, "vercel.json"))); out = []; dropped = moved = 0
    for r in v.get("redirects", []):
        s, d = r["source"], r["destination"]
        if ":" not in s and exists(s): dropped += 1; continue
        dp = d.split("?")[0].split("#")[0]
        if ":" not in d and not d.startswith("http") and d != "/" and not exists(dp):
            m = LAD.match(s)
            near = sorted(pages.get(m.group(1), []), key=lambda x: abs(x[0] - float(f"{m.group(2)}.{m.group(3)}"))) if m else []
            if not near: dropped += 1; continue
            r = dict(r, destination=near[0][1]); moved += 1
        out.append(r)
    print(f"{len(v.get('redirects', []))} redirects: {dropped} removed, {moved} retargeted, {len(out)} kept")
    if write: v["redirects"] = out; json.dump(v, open(os.path.join(SITE, "vercel.json"), "w"), indent=2); open(os.path.join(SITE, "vercel.json"), "a").write("\n")

if __name__ == "__main__": main("--write" in sys.argv)
