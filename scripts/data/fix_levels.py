"""Fix broken conference levels in public/data/db.json (Ryan 2026-10-17: "yes fix any problems").
Conference levels come from conference-meet places (Target 8th, Recruit 15th, Walk-On 25th; D3/NAIA 8th/40th). In thin events the
deep places include athletes who fell, jogged in or no-heighted, which produced marks like an SEC 400mH Walk-On of 1:07.30, and some
cells are out of order (Recruit better than Target). Fixes keep the conference's own marks where possible (flag "div", shown on the site as an estimate):
  - out of order (Target must be best, then Recruit, then Walk-On): the conference's own marks are re-sorted
  - absurd vs the division (LIM1): rebuilt from a sane neighbouring level + the division's typical gap (median as last resort)
  - Walk-On far behind its own previous level (LIM2): previous level + the division's typical gap
Official school charts (om) are never touched. Usage: python3 scripts/data/fix_levels.py [--write]   (dry run by default)"""
import json, sys, statistics, pathlib
P = pathlib.Path(__file__).resolve().parents[2] / "public/data/db.json"
FIELD = {"High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin", "Weight Throw",
         "Heptathlon", "Decathlon", "Pentathlon"}
def val(s, e):
    if not s: return None
    s = str(s).strip().rstrip("m")
    try:
        if ":" in s: a, b = s.split(":"); return float(a) * 60 + float(b)
        return float(s)
    except ValueError: return None
def fmt(v, e):
    if e in FIELD:
        if "thlon" in e: return [f"{round(v)}", ""]
        inch = v / 0.0254; ft = int(inch // 12); i = round((inch - ft * 12) * 4) / 4
        if i >= 12: ft += 1; i -= 12
        i = int(i) if i == int(i) else i
        return [f"{v:.2f}m", f"{ft}' {i}\""]
    if v >= 60: m = int(v // 60); return [f"{m}:{v - m * 60:05.2f}", ""]
    return [f"{v:.2f}", ""]
# limits sit beyond the measured normal range (2026-10-17: D1 time Walk-On gap median 2%, p97 16%; D3/NAIA time median 6-7%, p97 30-37%)
LIM1 = {(False, False): .25, (False, True): .40, (True, False): .40, (True, True): .55}   # (deep division, field): worse than division median
LIM2 = {(False, False): .18, (False, True): .45, (True, False): .40, (True, True): .60}   # Walk-On behind its own previous level
def better(a, b, e):  # is a a better (or equal) mark than b
    return a >= b if e in FIELD else a <= b
def main(write):
    d = json.load(open(P)); ct = d["ct"]
    def cells():
        for k, v in ct.items():
            for g in "mw":
                for e, t in (v.get(g) or {}).items():
                    if t: yield k, k.split("|")[0], g, e, t
    est = lambda x: bool(x and len(x) > 2 and x[2])
    # division medians per level, and the typical gap between consecutive levels (from clean, non-estimated cells)
    med, gaps = {}, {}
    for k, div, g, e, t in cells():
        F = e in FIELD; n = [val(x[0], e) if x and not est(x) else None for x in t]
        for j, x in enumerate(n):
            if x: med.setdefault((div, g, e, j), []).append(x)
        for a, b in ((0, 1), (1, 2), (0, 2)):
            if len(n) > b and n[a] and n[b]:
                gap = (n[a] - n[b]) / n[a] if F else (n[b] - n[a]) / n[a]
                if gap >= 0: gaps.setdefault((div, F, a, b), []).append(gap)
    med = {k: statistics.median(v) for k, v in med.items() if len(v) >= 3}
    gap = {k: statistics.median(v) for k, v in gaps.items() if len(v) >= 5}
    step = lambda x, gp, F, down=True: (x * (1 - gp) if F else x * (1 + gp)) if down else (x / (1 - gp) if F else x / (1 + gp))
    fixes = []
    for k, div, g, e, t in cells():
        F = e in FIELD; deep = div in ("NCAA D3", "NAIA")
        n = [val(x[0], e) if x else None for x in t]
        idx = [j for j, x in enumerate(n) if x is not None]
        new = list(n); why = {}
        # 1. out of order: re-sort the conference's own marks (best = Target)
        vals = sorted((n[j] for j in idx), reverse=F)
        if [n[j] for j in idx] != vals:
            for j, x in zip(idx, vals):
                if new[j] != x: new[j] = x; why[j] = "reordered"
        # 2. absurd vs the division: rebuild from a sane neighbour + typical gap, else the division median
        for j in idx:
            m = med.get((div, g, e, j))
            if m is None: continue
            worse = (m - new[j]) / m if F else (new[j] - m) / m
            if worse > LIM1[(deep, F)]:
                nb = [a for a in idx if a != j and a not in why]
                a = min(nb, key=lambda a: abs(a - j)) if nb else None
                gp = gap.get((div, F, min(a, j), max(a, j))) if a is not None else None
                new[j] = step(new[a], gp, F, down=j > a) if gp is not None else m; why[j] = "absurd"
        # 3. Walk-On far behind its own previous level: previous level + the division's typical gap
        if len(n) > 2 and new[2] is not None:
            ref = 1 if new[1] is not None else 0
            if new[ref] is not None:
                g2 = (new[ref] - new[2]) / new[ref] if F else (new[2] - new[ref]) / new[ref]
                gp = gap.get((div, F, ref, 2))
                if g2 > LIM2[(deep, F)] and gp is not None: new[2] = step(new[ref], gp, F); why[2] = "walk-on gap"
        for j, r in why.items():
            old = t[j][0]; t[j] = fmt(new[j], e) + ["div"]
            fixes.append((k, g, e, ["Target", "Recruit", "Walk-On"][j], old, t[j][0], r))
    for f in fixes: print(" | ".join(map(str, f)))
    print(f"\n{len(fixes)} values fixed across {len({(f[0], f[1], f[2]) for f in fixes})} conference events")
    if write: json.dump(d, open(P, "w"), separators=(",", ":"), ensure_ascii=False); print("written", P)
if __name__ == "__main__": main("--write" in sys.argv)
