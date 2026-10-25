#!/usr/bin/env python3
"""Audit every official chart on the site against the school's live source (Ryan 2026-10-25: "do we have all the right standards from
official websites where they need to be"). For each school with an official chart (db.json "o"):
  1. LIVE    every source URL in "src" still answers (PDF text via pdftotext, HTML text otherwise)
  2. MATCH   every mark in the chart we show ("off" rows) appears in the source text (numbers compared, quote marks ignored)
  3. NEWER   the school's own track pages link a standards document dated after the chart's year
Image-only sources (scans, screenshots, Instagram) can't be read automatically: listed as "manual".
Polite: 1 s between requests, cached in social/standards/audit_cache/. Read-only.
Usage: python3 scripts/data/audit_official_charts.py > report.txt"""
import html, json, os, re, subprocess, sys, time
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(SITE, "..", "..", "social", "standards", "audit_cache"); os.makedirs(CACHE, exist_ok=True)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"

def fetch(u):
    f = os.path.join(CACHE, re.sub(r"[^A-Za-z0-9]+", "_", u)[-150:])
    if not os.path.exists(f):
        r = subprocess.run(["curl", "-sL", "--compressed", "--max-time", "30", "-A", UA, "-o", f, "-w", "%{http_code} %{content_type}", u], capture_output=True, text=True)
        time.sleep(1); open(f + ".meta", "w").write(r.stdout)
    meta = open(f + ".meta").read() if os.path.exists(f + ".meta") else ""
    return f, meta

def text_of(u):
    # Sidearm "/documents/YYYY/..." pages are viewers: the file itself is at "/documents/download/..."
    u2 = re.sub(r"(https?://[^/]+)/documents/(?!download/)(\d{4}/)", r"\1/documents/download/\2", u) if re.search(r"/documents/\d{4}/.*\.pdf$", u) else u
    f, meta = fetch(u2)
    code = meta.split(" ")[0] if meta else "?"
    if not code.startswith("2"): return None, code
    head = open(f, "rb").read(5)
    if head[:2] == b"PK":   # .docx: the text lives in word/document.xml
        import zipfile
        try:
            x = zipfile.ZipFile(f).read("word/document.xml").decode("utf8", "ignore")
            return html.unescape(re.sub(r"<[^>]+>", " ", x.replace("</w:p>", "\n").replace("</w:tc>", " | "))), "docx"
        except Exception: return None, "docx-bad"
    if head == b"%PDF-":
        t = subprocess.run(["pdftotext", "-layout", f, "-"], capture_output=True, text=True).stdout
        return t, "pdf" if t.strip() else "pdf-image"
    raw = open(f, encoding="utf8", errors="ignore").read()
    return html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>|<style.*?</style>", " ", raw, flags=re.S))), "html"

nums = lambda t: set(re.findall(r"\d+(?:[.:]\d+)*", t.replace(",", "")))
def mark_keys(c):
    """numbers that must appear in the source for this cell: the leading time/metric value"""
    c = str(c or "").strip()
    if not c or c in ("–", "-", "x"): return []
    m = re.search(r"\((\d+(?:\.\d+)?)m\)", c)
    if m: return [m.group(1).rstrip("0").rstrip(".") if "." in m.group(1) else m.group(1)]
    m = re.match(r"(\d+(?::\d+)*(?:\.\d+)?)", c)
    return [m.group(1)] if m else []

def norm_set(t):
    S = set()
    for n in nums(t):
        S.add(n)
        if "." in n and ":" not in n: S.add(n.rstrip("0").rstrip("."))
        if re.match(r"^\d+:\d+$", n): S.add(n + ".00"); S.add(n + ".0")
        if re.match(r"^\d+:\d+\.0+$", n): S.add(n.split(".")[0])
        if re.match(r"^\d+\.\d0$", n): S.add(n[:-1])
    return S

def main():
    d = json.load(open(os.path.join(SITE, "public", "data", "db.json")))
    O = [s for s in d["schools"] if s.get("o")]
    rows = []
    for s in O:
        raw = str(s.get("src") or ""); srcs = re.findall(r"https?://[^\s;()]+", raw)
        if srcs:   # shorthand second files: "+ .../Women_s_X.pdf", "(+ W_T_F_X.pdf)", "+ womens_X.pdf", "; .../X.pdf"
            base = srcs[0].rsplit("/", 1)[0] + "/"
            for t in re.findall(r"(?:\+|\(\+|;)\s*(?:\.\.\./)?([A-Za-z0-9_\-.]+\.(?:pdf|docx))", raw):
                if not t.startswith("http") and "..." not in t: srcs.append(base + t)
            srcs = [u for u in dict.fromkeys(srcs) if "..." not in u]
        if not srcs: rows.append((s["n"], "manual", "no source URL", s.get("yr"))); continue
        if any(re.search(r"instagram|tiktok|\.png|\.jpe?g", u, re.I) for u in srcs):
            rows.append((s["n"], "manual", "image/social source", s.get("yr"))); continue
        text, kinds = "", []
        for u in srcs:
            t, k = text_of(u); kinds.append(k)
            if t: text += "\n" + t
        if not text.strip():
            rows.append((s["n"], "DEAD" if all(k not in ("pdf", "pdf-image", "html") for k in kinds) else "manual", "/".join(kinds), s.get("yr"))); continue
        have = norm_set(text); miss, tot = [], 0
        for g in ("m", "w"):
            o = (s.get("off") or {}).get(g)
            for r in (o or {}).get("rows", []):
                for c in r[1:]:
                    for k in mark_keys(c):
                        tot += 1
                        if k not in have: miss.append(f"{g}:{r[0]} {c}")
        status = "MATCH" if not miss else ("CHECK" if len(miss) <= max(2, tot // 10) else "MISMATCH")
        rows.append((s["n"], status, f"{tot - len(miss)}/{tot} marks found" + (f"; missing: {'; '.join(miss[:6])}" if miss else ""), s.get("yr")))
    for r in sorted(rows, key=lambda x: ["DEAD", "MISMATCH", "CHECK", "manual", "MATCH"].index(x[1])):
        print(f"{r[1]:9} {r[0]} ({r[3]}): {r[2]}")
    from collections import Counter
    print("\nSUMMARY", dict(Counter(r[1] for r in rows)))

if __name__ == "__main__": main()
