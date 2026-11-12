"""Full results for every meet in the athletes' meet histories (Ryan 2026-10-31: "i should be able to click into the track meets and see
the results at the meet" + "ship what i just said"). Same polite fetcher and parser as scrape_champs.py (3 s per page, cached).
Each athlete's TFRRS page (already cached by the athlete scrape) links its meets as /results/<id>/<slug>; every event page of each
meet is read (all rounds). Output: meets/<id>.json = {"id","meet","url","events": {"<event>": {"m"|"w": [{"round","wind","rows"}]}},
"complete"}, plus meets/_athletes.json = {athlete path: {meet name: id}} so the site can open the exact meet from a meet card.
Usage: python3 scrape_meets.py <site>/public/data/athletes.json <athlete page cache dir> <out dir>"""
import html, json, os, re, sys
from scrape_champs import get, parse_event, event_key

def main(ath_json, cache_dir, out):
    os.makedirs(out, exist_ok=True)
    A = json.load(open(ath_json)); idmap = {}; ids = {}
    for k in A:
        f = os.path.join(cache_dir, "https_tf_tfrrs_org_athletes_" + re.sub(r"[^A-Za-z0-9]+", "_", k) + "_html.html")
        try: h = open(f, encoding="utf8", errors="ignore").read() if os.path.exists(f) else get(f"https://tf.tfrrs.org/athletes/{k}.html")
        except Exception as e: print("  athlete failed", k, e, flush=True); continue
        seen = {}
        for m in re.finditer(r'href="https://(?:www|tf)\.tfrrs\.org/results/(\d+)/([^"/]+)">([^<]+)</a>', h):
            mid, slug, name = m.group(1), m.group(2), " ".join(m.group(3).split())
            d = re.search(r"([A-Z][a-z]{2} [\d\-]+(?:/[A-Z][a-z]{2} \d+)?, \d{4})", h[m.end():m.end() + 200])
            # Ryan 2026-11-12: TFRRS reuses meet names every season, so a meet is keyed "name|dates" (dates exactly as the meet
            # card shows them); the bare name is kept only when the athlete ran that meet in a single season
            if d: idmap.setdefault(k, {})[html.unescape(name) + "|" + d.group(1)] = int(mid)
            seen.setdefault(html.unescape(name), set()).add(int(mid)); ids[mid] = slug
        for name, s in seen.items():
            if len(s) == 1: idmap.setdefault(k, {})[name] = next(iter(s))
    json.dump(idmap, open(os.path.join(out, "_athletes.json"), "w"))
    if "--map-only" in sys.argv: print(f"meet map: {sum(len(v) for v in idmap.values())} keys for {len(idmap)} athletes"); return
    print(f"{len(ids)} meets from {len(idmap)} athletes", flush=True)
    for n, (mid, slug) in enumerate(sorted(ids.items(), key=lambda x: -int(x[0]))):
        p = os.path.join(out, mid + ".json")
        if os.path.exists(p) and json.load(open(p)).get("complete"): continue
        url = f"https://tf.tfrrs.org/results/{mid}/{slug}"
        try: h = get(url)
        except Exception as e: print("  meet failed", url, e, flush=True); continue
        title = re.search(r"<h3[^>]*>(.*?)</h3>", h, re.S)
        evs = sorted(set(re.findall(r'href="(https://tf\.tfrrs\.org/results/' + mid + r'/\d+/[^"]+)"', h)))
        data = {"id": int(mid), "meet": re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", title.group(1))).strip() if title else slug.replace("_", " "), "url": url, "events": {}}
        failed = 0
        for u in evs:
            try: rounds = parse_event(get(u))
            except Exception as e: failed += 1; print("    event failed", u, e, flush=True); continue
            for r in rounds:
                g, ev, rnd = event_key(r["title"])
                data["events"].setdefault(ev, {}).setdefault(g, []).append({"round": rnd, "wind": r["wind"], "rows": r["rows"]})
        data["complete"] = failed == 0 and bool(evs)
        json.dump(data, open(p, "w"), separators=(",", ":"))
        print(f"  [{n + 1}/{len(ids)}] {data['meet']}: {len(evs)} events", flush=True)

if __name__ == "__main__":
    main(*sys.argv[1:4])
