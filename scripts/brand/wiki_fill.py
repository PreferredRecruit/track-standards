#!/usr/bin/env python3
"""
Fill school-logo gaps in public/brand/brand.json from Wikipedia (Ryan 2026-10-06: "pull the schools official
logos from wikipedia"; Ryan 2026-10-17: "Ensure we can pull official logos for every school, including LSU").
Same method as social/standards/wiki_logos.py: Wikipedia API via curl, descriptive User-Agent, ~2.5 s between
requests, retries, never works around a block.

Targets: every school whose harvested brand record has no logo, plus every school whose harvested conf is "low".

Per school:
 1. Find the institution article (TITLES override, exact-title variants of the school's names, then search) and
    validate it: infobox must be a university/college infobox, the state must match, and the name must match
    (exact-title redirect, or token match for search hits; Eastern Illinois never matches Northern Illinois).
 2. Follow the infobox's sports nickname link to the athletics article (e.g. "LSU Tigers and Lady Tigers"),
    checking its `university` field points back at the same institution. Search "<name> athletics" if needed.
 3. Logo preference: athletics article logo > university athletics_logo > university logo (not too wide) >
    university image when it's a seal/crest (marked logo_kind "seal", last resort).
 4. PNG thumbnail from Wikimedia (imageinfo iiurlwidth=320, works for SVG) -> harvest.py's 160x160 WebP
    normaliser -> public/brand/logos/<slug>-wiki.webp (own filename so harvest.py never deletes/overwrites it).
 5. Colours (only when the site gave none, or the site record is "low"): infobox school colours
    ({{color box|#...}}, expanded templates), else the logo's dominant non-neutral colour.

Results go to scripts/brand/wiki-state.json and are merged into the current brand.json (re-read right before
saving; site high/medium logos and hand edits always win). harvest.merge_and_write() also layers wiki-state in,
so a harvest re-run keeps the Wikipedia logos; overrides.json still wins over everything.

Usage (from sites/track-standards/):
    python3 scripts/brand/wiki_fill.py                 # resume: only targets without a wiki-state record
    python3 scripts/brand/wiki_fill.py --force         # redo every target
    python3 scripts/brand/wiki_fill.py --only <slug> [<slug> ...]
    python3 scripts/brand/wiki_fill.py --limit 10
    python3 scripts/brand/wiki_fill.py --merge-only    # just rebuild brand.json
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import unicodedata
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import harvest as H  # noqa: E402  (shared colour maths, image normaliser, merge)
from PIL import Image  # noqa: E402

WIKI_STATE = os.path.join(HERE, "wiki-state.json")
UA = "PreferredRecruit-standards-graphics/1.0 (internal content tool)"
API = "https://en.wikipedia.org/w/api.php?"
PACE = 2.5

# Hard cases: slug -> {"inst": institution article} and/or {"ath": athletics article}, or {"skip": "reason"}
TITLES = {
    # done by hand and live (File:LSU_Athletics_logo.svg, fitted to badge width): never touch it here
    "louisiana-state-university-track-standards": {"skip": "done by hand (LSU Athletics logo, live)"},
    # IUPUI split in 2024; the track program is now IU Indianapolis (IU Indy Jaguars)
    "indiana-university-purdue-university-indianapolis-track-standards": {
        "inst": "Indiana University Indianapolis", "ath": "IU Indy Jaguars"},
    # abbreviated names the exact-title/search step can't resolve (QA 2026-10-17)
    "california-pa-track-standards": {"inst": "PennWest California"},
    "ccbc-catonsville-track-standards": {"inst": "Community College of Baltimore County"},
    "central-christian-track-standards": {"inst": "Central Christian College of Kansas"},
    "columbia-intl-track-standards": {"inst": "Columbia International University"},
    "crowder-cc-track-standards": {"inst": "Crowder College"},
    "cui-track-standards": {"inst": "Concordia University Irvine"},
    "essex-cc-track-standards": {"inst": "Essex County College"},
    "fashion-institute-of-technolog-track-standards": {"inst": "Fashion Institute of Technology"},
    "health-sciences-and-pharmacy-track-standards": {"inst": "University of Health Sciences and Pharmacy in St. Louis"},
    "indiana-pa-track-standards": {"inst": "Indiana University of Pennsylvania"},
    "mississippi-valley-track-standards": {"inst": "Mississippi Valley State University"},
    "ncmc-track-standards": {"inst": "North Central Missouri College"},
    "new-mexico-jc-track-standards": {"inst": "New Mexico Junior College"},
    "okla-panhandle-track-standards": {"inst": "Oklahoma Panhandle State University"},
    "olive-harvey-track-standards": {"inst": "Olive–Harvey College"},
    "park-u-track-standards": {"inst": "Park University"},
    "ranger-cc-track-standards": {"inst": "Ranger College"},
    "rc-cumberland-track-standards": {"inst": "Rowan College of South Jersey"},
    "rc-gloucester-cc-track-standards": {"inst": "Rowan College of South Jersey"},
    "roane-state-track-standards": {"inst": "Roane State Community College"},
    "scad-atlanta-track-standards": {"inst": "Savannah College of Art and Design"},
    "science-arts-track-standards": {"inst": "University of Science and Arts of Oklahoma"},
    "se-missouri-track-standards": {"inst": "Southeast Missouri State University"},
    "sw-michigan-track-standards": {"inst": "Southwestern Michigan College"},
    "ua-rich-mountain-track-standards": {"inst": "University of Arkansas Rich Mountain"},
    "union-cc-track-standards": {"inst": "Union County College"},
    "vermont-state-johnson-track-standards": {"inst": "Vermont State University"},
    # "University of Hawaii" redirects to the system article; the track program is Manoa's
    "university-of-hawaii-track-standards": {
        "inst": "University of Hawaiʻi at Mānoa", "ath": "Hawaii Rainbow Warriors and Rainbow Wahine"},
}
# QA rejections: slug -> reason (logo found but wrong / unusable). Colour may still be used if "keep_colour".
REJECT = {
    "fort-hays-tech-northwest-track-standards": "infobox image is a building photo (QA 2026-10-17)",
    "usc-sumter-track-standards": "only file is a 2016 50th-anniversary mark, not the current logo (QA 2026-10-17)",
}
PHOTO_NAME = re.compile(r"building|hall\b|campus|aerial|view|library|stadium|\(\d{4}\)|anniversary", re.I)

STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado",
    "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts",
    "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana",
    "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota",
    "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming", "PR": "Puerto Rico", "BC": "British Columbia",
    "AB": "Alberta", "ON": "Ontario", "GU": "Guam", "VI": "U.S. Virgin Islands",
}
STOP = {"university", "college", "of", "the", "at", "and", "in", "a", "community", "cc", "campus", "main",
        "inc", "junior", "jc"}
TOL = {"county", "state college"}  # tokens that may differ between our name and the article
ATH_INFOBOX = re.compile(r"^(college athletics|university athletics|college sports|collegiate athletics|"
                         r"college sports team|university sports|school athletics|college athletics team|"
                         r"college athletic program|athletics program)$", re.I)
UNI_INFOBOX = re.compile(r"^(university|college|uni|university or college|community college|"
                         r"academic institution|education institution|institution)$", re.I)

_last = [0.0]
LOG = []


def log(*a):
    s = " ".join(str(x) for x in a)
    LOG.append(s)


# ----------------------------------------------------------------------------- HTTP (paced curl, like wiki_logos.py)
def curl(url, dst=None):
    wait = PACE - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    cmd = ["curl", "-sfL", "--max-time", "60", "--retry", "4", "--retry-delay", "3", "--retry-all-errors",
           "-A", UA, url] + (["-o", dst] if dst else [])
    for attempt in range(3):  # curl retries 4x itself; on a reset, back off politely and try again
        try:
            r = subprocess.run(cmd, capture_output=True)
        finally:
            _last[0] = time.time()
        if r.returncode == 0:
            return r.stdout
        time.sleep((10, 30, 0)[attempt])
    raise RuntimeError("curl rc=%d %s" % (r.returncode, url[:120]))


def api(**q):
    q.update(format="json", formatversion=2)
    d = json.loads(curl(API + urllib.parse.urlencode(q)))
    if "error" in d:
        raise RuntimeError("api error %s" % d["error"].get("code"))
    return d


def fetch_pages(titles):
    """Exact titles -> {requested_title: (final_title, section0_wikitext)} (follows redirects)."""
    out = {}
    titles = [t for t in dict.fromkeys(titles) if t and len(t) < 250][:50]
    if not titles:
        return out
    d = api(action="query", titles="|".join(titles), redirects=1, prop="revisions", rvprop="content",
            rvslots="main", rvsection=0)["query"]
    norm = {n["from"]: n["to"] for n in d.get("normalized", [])}
    red = {r["from"]: r["to"] for r in d.get("redirects", [])}
    pages = {p["title"]: p for p in d.get("pages", [])}
    for t in titles:
        f = norm.get(t, t)
        f = red.get(f, f)
        p = pages.get(f)
        if p and not p.get("missing") and p.get("revisions"):
            out[t] = (p["title"], p["revisions"][0]["slots"]["main"]["content"])
    return out


def search_pages(q, n=8):
    """Search -> [(title, section0_wikitext)] in rank order (one request)."""
    d = api(action="query", generator="search", gsrsearch=q, gsrlimit=n, prop="revisions", rvprop="content",
            rvslots="main", rvsection=0)
    pages = sorted(d.get("query", {}).get("pages", []), key=lambda p: p.get("index", 99))
    return [(p["title"], p["revisions"][0]["slots"]["main"]["content"]) for p in pages if p.get("revisions")]


# ----------------------------------------------------------------------------- wikitext parsing
def infobox(wt):
    """First {{Infobox ...}} -> (type, {param: value}) or (None, {})."""
    m = re.search(r"\{\{\s*Infobox[ _]+", wt, re.I)
    if not m:
        return None, {}
    i, depth, start = m.start(), 0, m.start()
    while i < len(wt):
        if wt.startswith("{{", i):
            depth += 1; i += 2; continue
        if wt.startswith("}}", i):
            depth -= 1; i += 2
            if depth == 0:
                break
            continue
        i += 1
    body = wt[start + 2:i - 2]
    parts, cur, d1, d2, j = [], [], 0, 0, 0
    while j < len(body):
        two = body[j:j + 2]
        if two == "{{": d1 += 1; cur.append(two); j += 2; continue
        if two == "}}": d1 -= 1; cur.append(two); j += 2; continue
        if two == "[[": d2 += 1; cur.append(two); j += 2; continue
        if two == "]]": d2 -= 1; cur.append(two); j += 2; continue
        if body[j] == "|" and d1 == 0 and d2 == 0:
            parts.append("".join(cur)); cur = []; j += 1; continue
        cur.append(body[j]); j += 1
    parts.append("".join(cur))
    kind = re.sub(r"<!--.*?-->", "", parts[0], flags=re.S)
    kind = re.sub(r"^\s*Infobox[ _]+", "", kind, flags=re.I).strip().replace("_", " ")
    params = {}
    for p in parts[1:]:
        if "=" in p:
            k, v = p.split("=", 1)
            v = re.sub(r"<!--.*?-->", "", v, flags=re.S).strip()
            params[k.strip().lower().replace(" ", "_")] = v
    return kind, params


def file_of(v):
    if not v:
        return None
    m = re.search(r"(?:\[\[)?\s*(?:File:|Image:)?\s*([^|\]\[{}<>\n=]+?\.(?:svg|png|jpe?g|gif|webp|tiff?))\b", v, re.I)
    return m.group(1).strip() if m else None


def links(v):
    return [m.group(1).strip() for m in re.finditer(r"\[\[([^|\]#]+)(?:#[^|\]]*)?(?:\|[^\]]*)?\]\]", v or "")]


def strip_paren(t):
    return re.sub(r"\s*\([^)]*\)\s*", " ", t).strip()


def tokens(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = s.replace("&", " and ").replace("'", "").replace("’", "").replace(".", " ")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    out = []
    for w in s.split():
        w = {"st": "saint", "mt": "mount", "ft": "fort", "univ": "university"}.get(w, w)
        if w not in STOP:
            out.append(w)
    return frozenset(out)


def names_match(a, b):
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return False
    if ta == tb:
        return True
    diff = ta ^ tb
    return (ta <= tb or tb <= ta) and diff <= TOL


def state_ok(st_code, params, wt):
    name = STATES.get(st_code or "")
    if not name:
        return True  # unknown state code: can't check, name match must carry it
    text = " ".join(params.get(k, "") for k in ("state", "city", "location", "address", "country",
                                                  "province", "campus"))
    sd = re.search(r"\{\{\s*short description\s*\|([^}]*)\}\}", wt, re.I)
    text += " " + (sd.group(1) if sd else "")
    if st_code == "DC":
        return bool(re.search(r"District of Columbia|Washington,? D\.?C", text))
    pat = r"(?<!West )\b%s\b" % re.escape(name) if name == "Virginia" else r"\b%s\b" % re.escape(name)
    if re.search(pat, text):
        return True
    # infoboxes sometimes give the state as the postal code
    return bool(re.search(r"(?:^|[\s,|\[])%s(?:$|[\s,\]])" % st_code, params.get("state", "")))


def name_variants(s):
    """All names we know the school by (proper case first)."""
    raw = [s["n"], s.get("t") or ""]
    raw += [m for m in re.findall(r"\(([^)]+)\)", s["n"]) if len(m) > 4 and not re.match(r"^[A-Z][a-z]*\.?$", m)]
    small = {"of", "the", "at", "and", "in", "for"}
    for a in s.get("a") or []:
        if len(a) <= 5 and " " not in a:
            raw.append(a.upper())
        else:
            raw.append(" ".join(w if (w in small and i) else w[:1].upper() + w[1:] for i, w in enumerate(a.split())))
    out = []
    for r in raw:
        r = strip_paren(r)
        for v in (r, re.sub(r"\bCC\b", "Community College", r), re.sub(r"\bSt\.\s", "Saint ", r),
                  re.sub(r"\bSt\.\s", "St ", r), r.replace("&", "and")):
            v = re.sub(r"\s+", " ", v).strip()
            if v and v not in out:
                out.append(v)
    return out


def title_variants(s):
    st = STATES.get(s.get("s") or "", "")
    out = []
    names = name_variants(s)
    for n in names:
        out += [n, "%s (%s)" % (n, st) if st else None]
    for n in names:
        if re.search(r"\b(College|University|Institute)\b", n):
            continue
        for suf in ([" Community College", " College"] if s.get("d") == "NJCAA" else [" University", " College"]):
            out += [n + suf, "%s%s (%s)" % (n, suf, st) if st else None]
    return [t for t in dict.fromkeys(out) if t][:50]


def colours_from(params, tmp_expand):
    """School colours from an infobox -> list of rgb tuples (in order)."""
    v = ""
    for k in ("colors", "colours", "color", "colour", "school_colors", "school_colours", "athletics_colors",
              "athletics_colours"):
        if params.get(k):
            v = params[k]
            break
    if not v:
        return [], None
    hexes = re.findall(r"#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b", v)
    src = "infobox"
    if not hexes and "{{" in v:
        try:
            ex = api(action="expandtemplates", text=v, prop="wikitext")["expandtemplates"]["wikitext"]
            hexes = re.findall(r"#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b", ex)
            src = "infobox-expanded"
        except Exception as e:
            log("expand-fail", e)
    cols = []
    for h in hexes:
        c = H.hex_to_rgb(h)
        if not any(H.dist(c, o) < 25 for o in cols):
            cols.append(c)
    return cols, src


# ----------------------------------------------------------------------------- institution / athletics lookup
def is_uni(kind):
    return bool(kind) and bool(UNI_INFOBOX.match(kind.strip()))


def is_ath(kind):
    return bool(kind) and bool(ATH_INFOBOX.match(kind.strip()))


def ath_points_to(params, inst_title, s):
    targets = links(params.get("university", "") + " " + params.get("school", "") + " " +
                    params.get("institution", "") + " " + params.get("college", ""))
    # Must point at the SAME article: "Providence College" and "University of Providence" share every
    # distinctive token, so name matching alone is not enough here. Links that differ are resolved via redirects.
    if not inst_title:
        return any(names_match(t, n) for t in targets for n in name_variants(s))
    t0 = lambda x: x[:1].upper() + x[1:].replace("_", " ")
    if any(t0(t) == inst_title for t in targets):
        return True
    others = [t for t in targets if t]
    if others:
        got = fetch_pages(others[:5])
        if any(v[0] == inst_title for v in got.values()):
            return True
    return False


def find_institution(s, slug):
    ov = TITLES.get(slug, {})
    if ov.get("inst"):
        r = fetch_pages([ov["inst"]])
        if r:
            title, wt = list(r.values())[0]
            log("inst-override", title)
            return title, wt, "override"
    variants = title_variants(s)
    got = fetch_pages(variants)
    hits = []
    for v in variants:  # priority order
        if v not in got:
            continue
        title, wt = got[v]
        kind, params = infobox(wt)
        if is_ath(kind):  # a name that redirects straight to the athletics article
            uni = links(params.get("university", "") + params.get("school", ""))
            if uni:
                r = fetch_pages([uni[0]])
                if r:
                    t2, wt2 = list(r.values())[0]
                    k2, p2 = infobox(wt2)
                    if is_uni(k2) and state_ok(s.get("s"), p2, wt2):
                        log("inst-via-ath-redirect", v, "->", title, "->", t2)
                        return t2, wt2, "exact"
            continue
        if not is_uni(kind):
            continue
        if not state_ok(s.get("s"), params, wt):
            log("inst-state-mismatch", v, "->", title)
            continue
        hits.append((v, title, wt))
    if hits:
        titles = list(dict.fromkeys(h[1] for h in hits))
        if len(titles) > 1:
            log("inst-multiple", titles)
            # prefer the page whose own title matches one of our names
            best = [h for h in hits if any(names_match(strip_paren(h[1]), n) for n in name_variants(s))]
            if best:
                hits = best
        v, title, wt = hits[0]
        log("inst-exact", v, "->", title)
        return title, wt, "exact"
    st = STATES.get(s.get("s") or "", "")
    seen = set()
    for q in ("%s %s" % (strip_paren(s["n"]), st), "%s %s college" % (strip_paren(s.get("t") or s["n"]), st)):
        try:
            res = search_pages(q)
        except Exception as e:
            log("search-fail", q, e)
            continue
        for title, wt in res:
            if title in seen:
                continue
            seen.add(title)
            kind, params = infobox(wt)
            if not is_uni(kind) or not state_ok(s.get("s"), params, wt):
                continue
            cand = [strip_paren(title), params.get("name", "")]
            if any(names_match(c, n) for c in cand if c for n in name_variants(s)):
                log("inst-search", q, "->", title)
                return title, wt, "search"
    return None, None, None


def find_athletics(s, inst_title, inst_params):
    ov = TITLES.get(s["_slug"], {})
    if ov.get("ath"):
        r = fetch_pages([ov["ath"]])
        if r:
            t, wt = list(r.values())[0]
            log("ath-override", t)
            return t, wt
    cands = []
    for k in ("sports_nickname", "athletics_nickname", "nickname", "athletics", "sports", "mascot",
              "sporting_affiliations", "athletic_nickname", "sports_teams", "teams"):
        for l in links(inst_params.get(k, "")):
            if not re.search(r"NCAA|NAIA|NJCAA|USCAA|NCCAA|Division|Conference|League|Association|Mascot", l):
                cands.append(l)
    cands = list(dict.fromkeys(cands))[:6]
    if cands:
        got = fetch_pages(cands)
        for c in cands:
            if c in got:
                t, wt = got[c]
                kind, params = infobox(wt)
                if is_ath(kind) and ath_points_to(params, inst_title, s):
                    log("ath-link", c, "->", t)
                    return t, wt
                log("ath-link-rejected", c, "->", t, kind)
    # search
    base = strip_paren(s.get("t") or s["n"])
    try:
        res = search_pages("%s athletics" % base, 6)
    except Exception as e:
        log("ath-search-fail", e)
        res = []
    for t, wt in res:
        kind, params = infobox(wt)
        if is_ath(kind) and ath_points_to(params, inst_title, s):
            log("ath-search", t)
            return t, wt
    return None, None


# ----------------------------------------------------------------------------- image
def file_info(names):
    names = [n for n in dict.fromkeys(names) if n]
    if not names:
        return {}
    d = api(action="query", titles="|".join("File:" + n for n in names), prop="imageinfo",
            iiprop="url|mime|size", iiurlwidth=320, redirects=1)["query"]
    norm = {x["from"]: x["to"] for x in d.get("normalized", [])}
    red = {x["from"]: x["to"] for x in d.get("redirects", [])}
    pages = {p["title"]: p for p in d.get("pages", [])}
    out = {}
    for n in names:
        t = norm.get("File:" + n, "File:" + n)
        t = red.get(t, t)
        p = pages.get(t)
        if p and p.get("imageinfo"):
            out[n] = p["imageinfo"][0]
    return out


def process_logo(info, kind, tmpdir):
    """Download thumbnail, check it, return (PIL image, stats, reason or None)."""
    url = info.get("thumburl") or info.get("url")
    p = os.path.join(tmpdir, "thumb.bin")
    curl(url, p)
    data = open(p, "rb").read()
    mime = info.get("thumbmime") or ("image/png" if info.get("thumburl") else info.get("mime")) or ""
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        mime = "image/png"
    im, _ = H.load_image(data, mime, url.split("?")[0].replace(".svg.png", ".png"), tmpdir)
    if im is None:
        return None, None, "not-image"
    if im.getchannel("A").getextrema()[0] >= 250:
        im = H.knock_out_white(im)
    st = H.image_stats(im)
    transparent = st["alpha_frac"] > 0.02
    if st["w"] < 40 or st["h"] < 40:
        return None, st, "too-small"
    if not (H.looks_like_logo(st, transparent) or st["top_cov"] >= (0.2 if transparent else 0.35)):
        return None, st, "photo-like"
    if st["ink_frac"] < 0.12:
        return None, st, "white-logo"
    # wide wordmarks are fine (scaled to ~92% of badge width in save_logo); only reject banners
    if st["aspect"] > 8 or (kind == "seal" and st["aspect"] > 1.6):
        return None, st, "too-wide"
    return im, st, None


WIDE = 1.6           # aspect (w/h) from which a logo counts as a wordmark
WIDE_W = round(H.SIZE * 0.92)


def save_logo(im, dest, tmpdir):
    """harvest.save_webp, except wide wordmarks fill ~92% of the badge width (centred) instead of the 136 px box."""
    bb = H.content_bbox(im)
    if bb:
        im = im.crop(bb)
    w, h = im.size
    if w / max(1, h) < WIDE:
        return H.save_webp(im, dest, tmpdir)
    nw, nh = WIDE_W, max(1, round(h * WIDE_W / w))
    im = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (H.SIZE, H.SIZE), (255, 255, 255, 0))
    canvas.paste(im, ((H.SIZE - nw) // 2, (H.SIZE - nh) // 2), im)
    png = os.path.join(tmpdir, "out.png")
    canvas.save(png)
    for q in (82, 70, 55):
        r = subprocess.run([H.CWEBP, "-quiet", "-q", str(q), "-alpha_q", "90", "-m", "6", "-exact", png,
                            "-o", dest + ".tmp"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if r.returncode != 0:
            canvas.save(dest + ".tmp", "WEBP", quality=q, method=6)
        if os.path.getsize(dest + ".tmp") < 15_000:
            break
    os.replace(dest + ".tmp", dest)
    return canvas


def write_brand(wstate):
    """Merge wiki records into the CURRENT brand.json (re-read right before saving, so hand edits made while we
    ran survive). Only entries without a logo or with conf low/None are filled; entries someone already set from
    Wikipedia by hand are left alone. Saved compact, like harvest.py."""
    b = H.load_json(H.BRAND_JSON, {})
    n = 0
    for slug, ws in wstate.items():
        w = ws.get("rec") or {}
        cur = b.get(slug)
        if cur is None:
            continue
        if not w.get("logo") and cur.get("logo") == "/brand/logos/%s-wiki.webp" % slug:
            # our earlier logo was dropped (QA reject / re-run found nothing): back to the harvested site record
            site = (H.load_json(H.STATE_JSON, {}).get(slug) or {}).get("rec") or {}
            b[slug] = {k: site.get(k) for k in ("logo", "primary", "secondary", "ink", "on", "src", "conf")}
            n += 1
            cur = b[slug]
        if not (w.get("logo") or w.get("primary")):
            continue
        if TITLES.get(slug, {}).get("skip"):
            continue
        mine = cur.get("logo") == w.get("logo") and cur.get("logo_src") == "wikipedia"
        weak = not cur.get("logo") or cur.get("conf") in (None, "low")
        if not (weak or mine) or (cur.get("logo_src") == "wikipedia" and not mine and cur.get("logo")):
            continue
        new = dict(cur)
        if w.get("logo"):
            new.update(logo=w["logo"], src=w.get("src"), logo_src="wikipedia")
            if w.get("logo_kind") == "seal":
                new["logo_kind"] = "seal"
            else:
                new.pop("logo_kind", None)
        if w.get("primary") and (not cur.get("primary") or cur.get("conf") in (None, "low")):
            c = H.hex_to_rgb(w["primary"])
            new.update(primary=w["primary"], secondary=w.get("secondary"), ink=H.make_ink(c), on=H.make_on(c))
        new["conf"] = w.get("conf") or "medium"
        if new != cur:
            b[slug] = new
            n += 1
    tmp = H.BRAND_JSON + ".tmp"
    with open(tmp, "w") as f:
        f.write(json.dumps(b, sort_keys=True, separators=(",", ":")))
    os.replace(tmp, H.BRAND_JSON)
    return b, n


# ----------------------------------------------------------------------------- one school
def fill_one(s, slug, site):
    LOG.clear()
    rec = {"logo": None, "primary": None, "secondary": None, "src": None, "conf": None,
           "logo_kind": None, "colour_src": None}
    dbg = {"t": int(time.time())}
    if TITLES.get(slug, {}).get("skip"):
        dbg.update(status="skip", reason=TITLES[slug]["skip"])
        return rec, dbg
    inst_title, inst_wt, how = find_institution(s, slug)
    dbg["inst"] = inst_title
    dbg["inst_how"] = how
    inst_kind, inst_p = infobox(inst_wt) if inst_wt else (None, {})
    ath_title, ath_wt = (None, None)
    if inst_title or TITLES.get(slug, {}).get("ath"):
        ath_title, ath_wt = find_athletics(s, inst_title, inst_p)
    dbg["ath"] = ath_title
    ath_kind, ath_p = infobox(ath_wt) if ath_wt else (None, {})
    if not inst_title and not ath_title:
        dbg.update(status="no-article", log=list(LOG))
        return rec, dbg

    # candidate logos in preference order: (file, kind, conf)
    cands = []
    if ath_p.get("logo"):
        cands.append((file_of(ath_p["logo"]), "athletics", "high"))
    if inst_p.get("athletics_logo"):
        cands.append((file_of(inst_p["athletics_logo"]), "athletics_logo", "high"))
    for k in ("logo", "logo_name"):
        if inst_p.get(k):
            cands.append((file_of(inst_p[k]), "logo", "medium"))
    for k in ("image", "image_name", "seal", "seal_image"):
        f = file_of(inst_p.get(k, ""))
        if f:
            cap = (inst_p.get("caption", "") + " " + inst_p.get("image_caption", "") + " " + f + " " + k).lower()
            if re.search(r"seal|crest|coat of arms|arms|emblem|shield", cap):
                cands.append((f, "seal", "medium"))
            elif "logo" in cap or "wordmark" in cap:
                cands.append((f, "logo", "medium"))
            elif not re.search(r"\.jpe?g$", f, re.I) and not PHOTO_NAME.search(f):  # unlabelled .jpg = campus photo
                cands.append((f, "image", "medium"))
    cands = [c for c in cands if c[0]]
    # plain "image" (unlabelled) only after seals; keep order otherwise
    cands = [c for c in cands if c[1] != "image"] + [c for c in cands if c[1] == "image"]
    seen, uniq = set(), []
    for c in cands:
        if c[0] not in seen:
            seen.add(c[0]); uniq.append(c)
    cands = uniq
    dbg["cands"] = [list(c) for c in cands]

    tmpdir = tempfile.mkdtemp(prefix="wiki_")
    logo_im = None
    tried = []
    try:
        infos = file_info([c[0] for c in cands]) if cands else {}
        if slug in REJECT:
            dbg["rejected"] = REJECT[slug]
            cands = []
        for f, kind, conf in cands:
            info = infos.get(f)
            if not info:
                tried.append([f, kind, "no-file"]); continue
            try:
                im, st, why = process_logo(info, kind, tmpdir)
            except Exception as e:
                tried.append([f, kind, "err %s" % e]); continue
            tried.append([f, kind, why or "ok"] + ([st["w"], st["h"], round(st["aspect"], 2),
                                                    round(st["top_cov"], 2), round(st["ink_frac"], 2)] if st else []))
            if why is None:
                logo_im = im
                dest = os.path.join(H.LOGO_DIR, slug + "-wiki.webp")
                save_logo(im, dest, tmpdir)
                rec["logo"] = "/brand/logos/%s-wiki.webp" % slug
                rec["src"] = info.get("descriptionurl") or ("https://en.wikipedia.org/wiki/File:" +
                                                             urllib.parse.quote(f.replace(" ", "_")))
                rec["logo_kind"] = "seal" if kind == "seal" else kind
                rec["conf"] = conf if how != "search" else "medium"
                rec["file"] = f
                break
        dbg["tried"] = tried

        # colours: only when the site gave none or the site record is low-confidence
        need_col = (not site.get("primary")) or site.get("conf") == "low"
        if need_col:
            cols, csrc = colours_from(ath_p, tmpdir)
            if not cols:
                cols, csrc = colours_from(inst_p, tmpdir)
            good = [c for c in cols if not H.is_neutral(c)]
            if good:
                rec["primary"] = H.rgb_to_hex(good[0])
                sec = [c for c in cols if c is not good[0] and not H.near_white_or_black(c)
                       and H.dist(c, good[0]) >= 90]
                rec["secondary"] = H.rgb_to_hex(sec[0]) if sec else None
                rec["colour_src"] = csrc
            elif logo_im is not None:
                lc = H.logo_colours(logo_im)
                if lc:
                    rec["primary"] = H.rgb_to_hex(lc[0][1])
                    sec = [c for f_, c in lc[1:] if f_ >= 0.08 and H.dist(c, lc[0][1]) >= 90]
                    rec["secondary"] = H.rgb_to_hex(sec[0]) if sec else None
                    rec["colour_src"] = "logo"
                    if rec["conf"] == "high":
                        rec["conf"] = "medium"
            dbg["colours"] = [H.rgb_to_hex(c) for c in cols]
        if rec["logo"] is None and rec["primary"] is None:
            dbg["status"] = "nothing"
        else:
            if rec["conf"] is None:
                rec["conf"] = "medium"
            dbg["status"] = "ok" if rec["logo"] else "colour-only"
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
    dbg["log"] = list(LOG)
    return rec, dbg


# ----------------------------------------------------------------------------- driver
def targets(schools, hstate):
    out = []
    for s in schools:
        slug = H.school_slug(s)
        site = (hstate.get(slug) or {}).get("rec") or {}
        if not site.get("logo") or site.get("conf") == "low":
            out.append((s, slug, site))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", nargs="+", metavar="SLUG")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--merge-only", action="store_true")
    args = ap.parse_args()
    os.makedirs(H.LOGO_DIR, exist_ok=True)
    schools = json.load(open(H.DB))["schools"]
    hstate = H.load_json(H.STATE_JSON, {})
    wstate = H.load_json(WIKI_STATE, {})
    if not args.merge_only:
        todo = []
        for s, slug, site in targets(schools, hstate):
            if args.only:
                if slug in args.only:
                    todo.append((s, slug, site))
            elif args.force or slug not in wstate:
                todo.append((s, slug, site))
        if args.only:  # allow --only on non-target slugs too
            have = {t[1] for t in todo}
            for s in schools:
                slug = H.school_slug(s)
                if slug in args.only and slug not in have:
                    todo.append((s, slug, (hstate.get(slug) or {}).get("rec") or {}))
        if args.limit:
            todo = todo[:args.limit]
        print("%d schools to look up on Wikipedia" % len(todo), flush=True)
        for i, (s, slug, site) in enumerate(todo, 1):
            s = dict(s, _slug=slug)
            try:
                rec, dbg = fill_one(s, slug, site)
            except Exception as e:
                rec = {"logo": None, "primary": None, "secondary": None, "src": None, "conf": None}
                dbg = {"status": "crash", "err": repr(e)[:300], "log": list(LOG)}
            if not rec.get("logo"):
                f = os.path.join(H.LOGO_DIR, slug + "-wiki.webp")
                if os.path.exists(f):
                    os.remove(f)
            wstate[slug] = {"name": s["n"], "d": s.get("d"), "rec": rec, "dbg": dbg}
            H.write_json(WIKI_STATE, wstate, indent=1, sort_keys=True)
            print("  %d/%d %-50s %-11s %s | %s" % (i, len(todo), slug[:50], dbg.get("status"),
                                                  rec.get("logo_kind") or "-", dbg.get("ath") or dbg.get("inst")),
                  flush=True)
    brand, n_changed = write_brand(H.load_json(WIKI_STATE, {}))
    print("brand.json entries updated from Wikipedia: %d" % n_changed)
    vals = list(brand.values())
    print("brand.json: %d schools | logos %d (wikipedia %d) | primary %d" % (
        len(vals), sum(1 for v in vals if v["logo"]), sum(1 for v in vals if v.get("logo_src") == "wikipedia"),
        sum(1 for v in vals if v["primary"])))


if __name__ == "__main__":
    main()
