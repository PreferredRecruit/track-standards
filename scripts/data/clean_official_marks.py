#!/usr/bin/env python3
"""One clean format for field-event marks on official charts (Ryan 2026-10-25: "quality needs to reflect a billion-dollar company";
USC's chart showed 480” for 48'0" and 7'2 ½ "). Official charts were transcribed as the schools typed them: curly and straight
quotes mixed, fractions with stray spaces, feet marks missing. Values never change; only the writing does:
    7'2 ½ " (2.20m) -> 7' 2.5" (2.20m)      41’6” -> 41' 6"      14’ -> 14' 0"      480” (14.64m) -> 48' 0" (14.64m)
A run-together mark like 480” is split into feet and inches only when the metric value printed beside it agrees; anything the
cleaner can't read with certainty is left as published and listed. Applies to db.json "off" (chart rows) and "om" (levels).
Usage: python3 scripts/data/clean_official_marks.py [--write]"""
import json, os, re, sys
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(SITE, "public", "data", "db.json")
FR = {"½": ".5", "¼": ".25", "¾": ".75"}
FIELD = re.compile(r"jump|vault|put|shot|discus|hammer|javelin|weight|throw", re.I)

def fmt_in(x):
    s = f"{x:.2f}".rstrip("0").rstrip(".")
    return s or "0"

def clean(c):
    """(cleaned text, True) or (c, False) when no reading can be confirmed."""
    if not isinstance(c, str) or not c.strip(): return c, True
    t = c.replace("’", "'").replace("‘", "'").replace("′", "'").replace("”", '"').replace("“", '"').replace("″", '"').replace("''", '"')
    for k, v in FR.items(): t = re.sub(r"\s*" + k, v, t)
    t = re.sub(r"(\d)\s+\.(\d)", r"\1.\2", t)
    mm = re.search(r"(\d+(?:\.\d+)?)\s*m(?![a-z])", t) or re.search(r"\((\d{1,2}\.\d+)\)", t) or re.search(r"/\s*(\d{1,2}\.\d+)\s*$", t)
    metres = float(mm.group(1)) if mm else None
    rest = (t[:mm.start()] + t[mm.end():]) if mm else t
    rest = re.sub(r"[()/,]|\bor\b", " ", rest).strip()
    if not rest:
        return (f"{metres:.2f}m", True) if metres is not None else (c, True)
    cand = []
    m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*(?:'|ft\.?|-)\s*(\d+(?:\.\d+)?)?\s*(?:\"|in\.?)?", rest)
    if m:
        ft, inch = float(m.group(1)), m.group(2)
        cand = [(ft, float(inch))] if inch else [(ft, 0.0)]
        if inch and float(inch) >= 12: cand = [(ft, float(inch) / 10)] if metres else []   # 19'35" = 19' 3.5"
    else:
        m = re.fullmatch(r"(\d{3,})(\.\d+)?\s*\"", rest)                                      # 480" = 48' 0"
        if m and metres:
            ft = int(metres / 0.3048 + 0.05); dg = m.group(1)
            if dg.startswith(str(ft)) and dg[len(str(ft)):]: cand = [(ft, float(dg[len(str(ft)):] + (m.group(2) or "")))]
        elif re.fullmatch(r"\d+(\.\d+)?", rest) and metres:                                       # 63 (19.20m) = 63 feet
            cand = [(float(rest), 0.0)]
    out = None
    for ft, inch in cand:
        if ft != int(ft): inch += (ft - int(ft)) * 12; ft = int(ft)                              # 87.5' = 87' 6"
        if inch >= 12: continue
        if metres is not None and abs((ft * 12 + inch) * 0.0254 - metres) > max(0.06, metres * 0.03): continue
        out = f"{int(ft)}' {fmt_in(inch)}\""; break
    if out is None:   # can't confirm a reading: straighten the quote marks only, numbers exactly as published
        typo = re.sub(r"\s+", " ", t).strip()
        return typo, False
    return (f"{out} ({metres:.2f}m)" if metres is not None else out), True

def main(write):
    d = json.load(open(P)); n = bad = 0; left = []
    for s in d["schools"]:
        for g, o in (s.get("off") or {}).items():
            for r in o.get("rows", []):
                if not FIELD.search(str(r[0])): continue
                for i in range(1, len(r)):
                    v, ok = clean(r[i])
                    if v != r[i]: r[i] = v; n += 1
                    if not ok: left.append((s["n"], r[0], r[i]))
        for g, E in (s.get("om") or {}).items():
            for e, L in E.items():
                if not FIELD.search(e) or not L: continue
                for i, c in enumerate(L):
                    v, ok = clean(c)
                    if v != c: L[i] = v; n += 1
                    if not ok: left.append((s["n"], e, c))
    print(n, "cells rewritten;", len(left), "left as published:")
    for x in left[:40]: print("  ", x)
    if write: json.dump(d, open(P, "w"), separators=(",", ":"), ensure_ascii=False); print("written")

if __name__ == "__main__": main("--write" in sys.argv)
