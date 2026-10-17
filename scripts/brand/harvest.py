#!/usr/bin/env python3
"""
School brand harvester for trackandfieldstandards.com.

For every school in public/data/db.json that has an official athletics site (`ws`),
find the athletics logo + primary/secondary brand colours, normalise the logo to a
160x160 WebP and write public/brand/brand.json. See scripts/brand/README.md.

Usage (from sites/track-standards/):
    python3 scripts/brand/harvest.py                 # resume: only schools not yet done
    python3 scripts/brand/harvest.py --force         # redo everything
    python3 scripts/brand/harvest.py --only <slug> [<slug> ...]   # redo just these
    python3 scripts/brand/harvest.py --retry-failed  # redo schools that errored / found nothing
    python3 scripts/brand/harvest.py --merge-only    # just re-apply overrides.json -> brand.json

Requires: Pillow (python3 -m pip install --user pillow), /opt/homebrew/bin/cwebp,
macOS `qlmanage` (SVG rasterising) and `sips`.
"""
import argparse
import colorsys
import gzip
import zlib
import concurrent.futures as cf
import html
import io
import json
import os
import re
import shutil
import ssl
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

try:
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required:  python3 -m pip install --user pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
DB = os.path.join(ROOT, "public", "data", "db.json")
OUT_DIR = os.path.join(ROOT, "public", "brand")
LOGO_DIR = os.path.join(OUT_DIR, "logos")
BRAND_JSON = os.path.join(OUT_DIR, "brand.json")
STATE_JSON = os.path.join(HERE, "harvest-state.json")
OVERRIDES = os.path.join(HERE, "overrides.json")

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36")
TIMEOUT = 10
MAX_WORKERS = 8           # one request at a time per worker => max 8 concurrent
MAX_BYTES = 6_000_000
SIZE = 160                # output canvas
PAD = 12                  # transparent padding inside canvas
CWEBP = shutil.which("cwebp") or "/opt/homebrew/bin/cwebp"

_SSL_OK = ssl.create_default_context()
_SSL_LAX = ssl.create_default_context()
_SSL_LAX.check_hostname = False
_SSL_LAX.verify_mode = ssl.CERT_NONE


# ----------------------------------------------------------------------------- utils
class BlockedError(Exception):
    pass


def slug_of(name):
    s = re.sub(r"[^a-z0-9 -]", "", name.lower())
    s = s.replace(" ", "-")
    s = re.sub(r"-+", "-", s)
    return s + "-track-standards"


def school_slug(s):
    return (s.get("os") and s["os"][0]) or slug_of(s["n"])


def fetch(url, accept="*/*", limit=MAX_BYTES):
    """GET url -> (final_url, content_type, bytes). Raises on failure."""
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": accept,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
    })
    last = None
    for ctx in (_SSL_OK, _SSL_LAX):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as r:
                data = r.read(limit + 1)
                if len(data) > limit:
                    raise ValueError("too large")
                enc = (r.headers.get("Content-Encoding") or "").lower()
                if "gzip" in enc or data[:2] == b"\x1f\x8b":
                    try:
                        data = gzip.decompress(data)
                    except Exception:
                        pass
                elif "deflate" in enc:
                    try:
                        data = zlib.decompress(data)
                    except Exception:
                        data = zlib.decompress(data, -15)
                if r.headers.get("x-amzn-waf-action") or (r.status == 202 and (not data or b"awsWaf" in data[:4000])) \
                        or (len(data) < 6000 and re.search(rb"cf-challenge|challenge-platform|captcha", data[:6000], re.I)):
                    # AWS WAF / bot challenge: respect it, do not try to get around it
                    raise BlockedError("bot challenge (WAF / captcha page)")
                return r.geturl(), (r.headers.get("Content-Type") or "").lower(), data
        except urllib.error.URLError as e:
            last = e
            if isinstance(getattr(e, "reason", None), ssl.SSLError) or "CERTIFICATE" in str(e).upper():
                continue
            raise
        except ssl.SSLError as e:
            last = e
            continue
    raise last


def absurl(base, u):
    u = html.unescape((u or "").strip())
    if not u or u.startswith("data:"):
        return None
    return urllib.parse.urljoin(base, u)


def unwrap_sidearm(u):
    """images.sidearmdev.com/crop?url=<real>&... -> real url (full size)."""
    try:
        p = urllib.parse.urlparse(u)
        if "sidearmdev.com" in p.netloc:
            q = urllib.parse.parse_qs(p.query)
            if q.get("url"):
                return q["url"][0]
    except Exception:
        pass
    return u


def attrs(tag):
    return {k.lower(): html.unescape(v) for k, v in
            re.findall(r'([a-zA-Z_:-]+)\s*=\s*["\']([^"\']*)["\']', tag)}


# ----------------------------------------------------------------------------- colour maths
def hex_to_rgb(h):
    h = h.lstrip("#")
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h[:3])
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb_to_hex(c):
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(round(v)))) for v in c[:3])


def lum(c):
    def ch(v):
        v /= 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = c[:3]
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def hls(c):
    return colorsys.rgb_to_hls(*(v / 255.0 for v in c[:3]))


def is_neutral(c, sat_min=0.18):
    """True for white / black / grey-ish colours (not usable as a brand colour)."""
    h, l, s = hls(c)
    mx, mn = max(c[:3]), min(c[:3])
    if mx - mn < 28:
        return True
    if l > 0.94 or l < 0.06:
        return True
    return s < sat_min and (mx - mn) < 45


def near_white_or_black(c):
    h, l, s = hls(c)
    return l > 0.9 or l < 0.08


def dist(a, b):
    # weighted RGB distance ("redmean"), ~0..765
    rm = (a[0] + b[0]) / 2
    dr, dg, db = a[0] - b[0], a[1] - b[1], a[2] - b[2]
    return ((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db) ** 0.5


def make_ink(c):
    """Same hue, darkened (or lightened) until >= 4.5:1 on white."""
    white = (255, 255, 255)
    if contrast(c, white) >= 4.5:
        return rgb_to_hex(c)
    h, l, s = hls(c)
    while l > 0:
        l = max(0.0, l - 0.01)
        hx = rgb_to_hex(tuple(v * 255 for v in colorsys.hls_to_rgb(h, l, s)))
        if contrast(hex_to_rgb(hx), white) >= 4.5:  # test the rounded hex we actually output
            return hx
    return "#000000"


def make_on(c):
    white, ink = (255, 255, 255), (11, 11, 15)
    return "#ffffff" if contrast(c, white) >= contrast(c, ink) else "#0b0b0f"


# ----------------------------------------------------------------------------- image handling
def load_image(data, ctype, url, tmpdir):
    """bytes -> RGBA PIL image (rasterises SVG via qlmanage). None if not an image."""
    head = data[:512].lstrip().lower()
    is_svg = ("svg" in ctype) or url.lower().split("?")[0].endswith(".svg") or head.startswith(b"<svg") \
        or (head.startswith(b"<?xml") and b"<svg" in data[:2048].lower())
    if is_svg:
        p = os.path.join(tmpdir, "logo.svg")
        with open(p, "wb") as f:
            f.write(data)
        try:
            subprocess.run(["qlmanage", "-t", "-s", "512", "-o", tmpdir, p],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
        except Exception:
            return None, True
        png = p + ".png"
        if not os.path.exists(png):
            return None, True
        im = Image.open(png).convert("RGBA")
        im.load()
        return knock_out_white(im), True
    if head.startswith(b"<") or "text/html" in ctype:
        return None, False
    try:
        im = Image.open(io.BytesIO(data))
        if im.format == "ICO":
            # pick the largest embedded size
            sizes = sorted(im.info.get("sizes", []) or [im.size], key=lambda s: s[0] * s[1])
            try:
                im.size = sizes[-1]
            except Exception:
                pass
        im = im.convert("RGBA")
        im.load()
        return im, False
    except Exception:
        # sips fallback for odd formats
        p = os.path.join(tmpdir, "raw.bin")
        o = os.path.join(tmpdir, "raw.png")
        with open(p, "wb") as f:
            f.write(data)
        r = subprocess.run(["sips", "-s", "format", "png", p, "--out", o],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if r.returncode == 0 and os.path.exists(o):
            im = Image.open(o).convert("RGBA")
            im.load()
            return im, False
    return None, False


def knock_out_white(im):
    """Make near-white background connected to the image edges transparent."""
    w, h = im.size
    a = im.getchannel("A")
    if a.getextrema()[0] < 250:  # already has transparency
        return im
    corners = [im.getpixel(p) for p in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))]
    if not all(min(c[:3]) > 235 for c in corners):
        return im
    rgb = im.convert("RGB")
    sentinel = (1, 254, 3)
    for p in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if rgb.getpixel(p) != sentinel:
            ImageDraw.floodfill(rgb, p, sentinel, thresh=40)
    px = rgb.load()
    m = Image.new("L", (w, h), 255)
    mp = m.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] == sentinel:
                mp[x, y] = 0
    out = im.copy()
    out.putalpha(m)
    return out


def content_bbox(im):
    """Bounding box of visible, non-background content."""
    a = im.getchannel("A")
    if a.getextrema()[0] < 250:
        return a.point(lambda v: 255 if v > 24 else 0).getbbox()
    # opaque: trim a uniform border colour
    bg = im.getpixel((0, 0))
    diff = Image.new("RGBA", im.size, bg)
    from PIL import ImageChops
    d = ImageChops.difference(im.convert("RGB"), diff.convert("RGB")).convert("L")
    return d.point(lambda v: 255 if v > 24 else 0).getbbox()


def image_stats(im):
    """Return dict(w,h,aspect,alpha_frac,top_cov,ncolors) on the content box."""
    bb = content_bbox(im) or (0, 0, im.size[0], im.size[1])
    c = im.crop(bb)
    w, h = c.size
    small = c.copy()
    small.thumbnail((96, 96))
    px = list(small.get_flattened_data() if hasattr(small, "get_flattened_data") else small.getdata())
    opaque = [p for p in px if p[3] > 200]
    alpha_frac = 1 - len(opaque) / max(1, len(px))
    buckets = {}
    for p in opaque:
        k = (p[0] >> 4, p[1] >> 4, p[2] >> 4)
        buckets[k] = buckets.get(k, 0) + 1
    tops = sorted(buckets.values(), reverse=True)
    top_cov = sum(tops[:12]) / max(1, len(opaque))
    inked = sum(1 for p in opaque if (max(p[:3]) - min(p[:3]) > 60) or max(p[:3]) < 170)
    ink_frac = inked / max(1, len(opaque))
    return dict(w=w, h=h, aspect=max(w, h) / max(1, min(w, h)), alpha_frac=alpha_frac,
                top_cov=top_cov, ncolors=len(buckets), full=im.size, ink_frac=ink_frac)


def looks_like_logo(st, transparent):
    if st["w"] < 40 or st["h"] < 40:
        return False
    if transparent or st["alpha_frac"] > 0.05:
        return st["top_cov"] > 0.45
    return st["top_cov"] > 0.70 and st["ncolors"] < 700


def logo_colours(im, k=4):
    """Dominant non-neutral colours of the logo, most common first."""
    s = im.copy()
    s.thumbnail((128, 128))
    buckets = {}
    tot = 0
    for p in (s.get_flattened_data() if hasattr(s, "get_flattened_data") else s.getdata()):
        if p[3] < 200:
            continue
        tot += 1
        if is_neutral(p, 0.22):
            continue
        key = (p[0] >> 3, p[1] >> 3, p[2] >> 3)
        b = buckets.setdefault(key, [0, 0, 0, 0])
        b[0] += 1; b[1] += p[0]; b[2] += p[1]; b[3] += p[2]
    cols = sorted(((v[0], (v[1] / v[0], v[2] / v[0], v[3] / v[0])) for v in buckets.values()), reverse=True)
    out = []  # merge similar
    for n, c in cols:
        for o in out:
            if dist(o[1], c) < 70:
                o[0] += n
                break
        else:
            out.append([n, c])
    out.sort(key=lambda x: -x[0])
    return [(n / max(1, tot), c) for n, c in out[:k] if n / max(1, tot) > 0.03]


def save_webp(im, dest, tmpdir):
    bb = content_bbox(im)
    if bb:
        im = im.crop(bb)
    inner = SIZE - 2 * PAD
    w, h = im.size
    sc = inner / max(w, h)
    nw, nh = max(1, round(w * sc)), max(1, round(h * sc))
    im = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    canvas.paste(im, ((SIZE - nw) // 2, (SIZE - nh) // 2), im)
    png = os.path.join(tmpdir, "out.png")
    canvas.save(png)
    for q in (82, 70, 55):
        r = subprocess.run([CWEBP, "-quiet", "-q", str(q), "-alpha_q", "90", "-m", "6",
                            "-exact", png, "-o", dest + ".tmp"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) if os.path.exists(CWEBP) else None
        if r is None or r.returncode != 0:
            canvas.save(dest + ".tmp", "WEBP", quality=q, method=6)
        if os.path.getsize(dest + ".tmp") < 15_000:
            break
    os.replace(dest + ".tmp", dest)
    return canvas


# ----------------------------------------------------------------------------- page parsing
LOGO_BAD = re.compile(r"(static logo|big-?12|big-?ten|mpsf|nchc|kfb|farm-?bureau|bank|credit-?union|insurance|toyota|ford|chevrolet|coca|pepsi|ncaa|naia|njcaa|nccaa|conference|sponsor|partner|learfield|sidearm_logo|"
                      r"sidearmsports_logo|powered|footer_logo_(ncaa|naia|conf)|/opponents?/|"
                      r"twitter|facebook|instagram|youtube|tiktok|apple|google|app-?store|"
                      r"ticket|nil|store|shop|adidas|nike|under-?armour|placeholder|blank|pixel)", re.I)


# conference / governing-body marks that sit in athletics headers (matched as whole filename words)
CONF_BAD = re.compile(r"(?<![a-z])(sciac|nescac|uaa|ncac|odac|miac|wiac|iiac|cciw|nacc|liberty[-_ ]?league|"
                      r"centennial|landmark|mascac|nac|cac|skyline|empire8|e8|sunyac|little[-_ ]?east|"
                      r"gnac|gliac|gac|glvc|gmac|lsc|mec|nsic|pacwest|psac|rmac|sac|siac|ciaa|ccaa|"
                      r"sec|acc|big[-_ ]?east|big[-_ ]?sky|big[-_ ]?south|big[-_ ]?west|pac[-_ ]?12|wac|mvc|caa|"
                      r"maac|mac|meac|swac|asun|ovc|socon|summit|horizon|ivy|patriot|aac|cusa|"
                      r"mountain[-_ ]?west|sun[-_ ]?belt|a10|atlantic[-_ ]?10|nec|wcc|conference|conf|"
                      r"njcaa|naia|ncaa|nccaa|uscaa)(?![a-z])", re.I)


def _decoded_tail(u):
    """imgproxy-style URLs hide the source path in base64; decode it for keyword checks."""
    import base64
    out = []
    for seg in re.findall(r"/([A-Za-z0-9_-]{24,})(?:\.[a-z]{3,4})?(?=$|[/?])", u):
        try:
            out.append(base64.urlsafe_b64decode(seg + "=" * (-len(seg) % 4)).decode("utf-8", "ignore"))
        except Exception:
            pass
    return " ".join(out)


STOP = {"university", "college", "state", "community", "the", "of", "and", "at", "institute", "technology",
        "saint", "school", "christian", "county", "north", "south", "east", "west", "central", "northern",
        "southern", "eastern", "western", "athletics", "sports"}


def find_candidates(page_url, text, name_tokens=()):
    """Ordered list of (kind, url, base_conf) logo candidates."""
    c = []
    origin = "{0.scheme}://{0.netloc}".format(urllib.parse.urlparse(page_url))
    head = text[:200_000]
    is_sidearm = ("sidearm" in text[:400_000].lower())
    # 1. Sidearm canonical site logo
    if is_sidearm or "/images/logos/site/site.png" in text:
        c.append(("sidearm-site", origin + "/images/logos/site/site.png", "high"))
    # 2. header logo images (svg/png)
    tags = re.findall(r"<img\b[^>]*>", head, re.I)
    hdr = []
    alts = {}
    for i, t in enumerate(tags[:60]):
        a = attrs(t)
        src = a.get("src") or a.get("data-src") or ""
        blob = " ".join([src, a.get("class", ""), a.get("alt", ""), a.get("id", "")]).lower()
        if "logo" not in blob:
            continue
        fname = urllib.parse.urlparse(unwrap_sidearm(src)).path.rsplit("/", 1)[-1]
        if LOGO_BAD.search(src) or LOGO_BAD.search(a.get("alt", "")) or LOGO_BAD.search(_decoded_tail(src)) \
                or CONF_BAD.search(fname) or CONF_BAD.search(a.get("alt", "")):
            continue
        # Sidearm opponent logos live in /images/logos/<team>.png -> skip those (site/ is fine)
        if re.search(r"/images/logos/(?!site/)", unwrap_sidearm(src)):
            continue
        u = absurl(page_url, unwrap_sidearm(src))
        if not u:
            continue
        score = 0
        if re.search(r"main[-_]?nav[-_]?logo|logo[-_]?main|header|site[-_]?logo|primary", blob):
            score += 2
        if "footer" in blob:
            score -= 1
        hdr.append((score, i, u))
        alts[u] = a.get("alt", "").lower()
    hdr.sort(key=lambda x: (-x[0], x[1]))
    for s, i, u in hdr[:3]:
        if s >= 2:
            c.append(("header-img", u, "high"))
    weak_hdr = [("header-img", u, "medium") for s, i, u in hdr[:3]
                if s < 2 and (not name_tokens or any(t in urllib.parse.urlparse(u).path.lower() or t in alts.get(u, "")
                                                     for t in name_tokens))]
    # 3. apple-touch-icon / large icons
    for t in re.findall(r"<link\b[^>]*>", head, re.I):
        a = attrs(t)
        rel = a.get("rel", "").lower()
        href = absurl(page_url, a.get("href"))
        if not href:
            continue
        if "apple-touch-icon" in rel:
            c.append(("apple-touch-icon", href, "medium"))
        elif "icon" in rel:
            sz = a.get("sizes", "")
            m = re.match(r"(\d+)x", sz)
            if (m and int(m.group(1)) >= 96) or href.lower().split("?")[0].endswith(".svg"):
                c.append(("icon", href, "medium"))
    c.append(("apple-touch-icon", origin + "/apple-touch-icon.png", "medium"))
    c.extend(weak_hdr)
    # 4. og:image (only accepted if square & logo-like)
    for t in re.findall(r"<meta\b[^>]*>", head, re.I):
        a = attrs(t)
        if a.get("property", "").lower() in ("og:image", "og:image:url") or a.get("name", "").lower() == "twitter:image":
            u = absurl(page_url, unwrap_sidearm(a.get("content", "")))
            if u:
                c.append(("og-image", u, "low"))
    # 5. favicon
    for t in re.findall(r"<link\b[^>]*>", head, re.I):
        a = attrs(t)
        if "icon" in a.get("rel", "").lower():
            href = absurl(page_url, a.get("href"))
            if href:
                c.append(("favicon", href, "low"))
    c.append(("favicon", origin + "/favicon.ico", "low"))
    seen, out = set(), []
    for k, u, cf_ in c:
        if u not in seen:
            seen.add(u)
            out.append((k, u, cf_))
    return out


VAR_PRIMARY = re.compile(
    r"--(?:s-)?(?:color-)?(?:brand-)?(?:theme-)?primary(?:-color)?(?:-brand)?\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b")
VAR_SECONDARY = re.compile(
    r"--(?:s-)?(?:color-)?(?:brand-)?(?:theme-)?secondary(?:-color)?(?:-brand)?\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b")
VAR_WP_PRIMARY = re.compile(r"--wp--preset--color--(?:primary|brand)[a-z-]*\s*:\s*(#[0-9a-fA-F]{6})", re.I)
VAR_WP_SECONDARY = re.compile(r"--wp--preset--color--secondary[a-z-]*\s*:\s*(#[0-9a-fA-F]{6})", re.I)
HEX_DECL = re.compile(r"(?:background(?:-color)?|color|border(?:-[a-z]+)?-color|fill)\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b", re.I)


def meta_colours(text):
    out = {}
    for t in re.findall(r"<meta\b[^>]*>", text[:200_000], re.I):
        a = attrs(t)
        n = a.get("name", "").lower()
        v = a.get("content", "").strip()
        if not re.fullmatch(r"#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?", v):
            continue
        if n == "theme-color":
            out.setdefault("theme", hex_to_rgb(v))
        elif n == "msapplication-tilecolor":
            out.setdefault("tile", hex_to_rgb(v))
    return out


def css_urls(page_url, text):
    urls = []
    for t in re.findall(r"<link\b[^>]*>", text, re.I):
        a = attrs(t)
        if "stylesheet" not in a.get("rel", "").lower():
            continue
        u = absurl(page_url, a.get("href"))
        if not u:
            continue
        lu = u.lower()
        if any(x in lu for x in ("fonts.", "typekit", "htlbid", "slick", "cdnjs", "bootstrap", "font-awesome",
                                 "fontawesome", "swiper", "jquery", "googleapis", "sidearm_font", "advert")):
            continue
        same = urllib.parse.urlparse(u).netloc.split(":")[0].endswith(
            ".".join(urllib.parse.urlparse(page_url).netloc.split(".")[-2:]))
        prio = 0 if "entry" in lu else (1 if ("site" in lu or "theme" in lu or "main" in lu or "style" in lu) else 2)
        if same or "sidearm" in lu or "cloudfront" in lu:
            urls.append((prio, u))
    urls.sort()
    return [u for _, u in urls[:3]]


def css_colours(texts):
    """Extract (primary, secondary, source, freq_list) from CSS custom properties / declarations."""
    p = s = None
    src = None
    freq = {}
    for t in texts:
        if p is None:
            m = VAR_PRIMARY.search(t) or VAR_WP_PRIMARY.search(t)
            if m:
                p, src = hex_to_rgb(m.group(1)), "css-var"
        if s is None:
            m = VAR_SECONDARY.search(t) or VAR_WP_SECONDARY.search(t)
            if m:
                s = hex_to_rgb(m.group(1))
        for h in HEX_DECL.findall(t):
            c = hex_to_rgb(h)
            if is_neutral(c, 0.25):
                continue
            k = rgb_to_hex(c)
            freq[k] = freq.get(k, 0) + 1
    fl = sorted(((n, hex_to_rgb(k)) for k, n in freq.items()), reverse=True)
    return p, s, src, fl


# ----------------------------------------------------------------------------- per-school
def harvest_one(school, slug):
    ws = school.get("ws")
    rec = {"logo": None, "primary": None, "secondary": None, "ink": None, "on": None,
           "src": None, "conf": None}
    dbg = {"ws": ws, "t": int(time.time())}
    if not ws:
        dbg["status"] = "no-ws"
        return rec, dbg
    if not ws.startswith("http"):
        ws = "https://" + ws
    tries = [ws]
    host = urllib.parse.urlparse(ws).netloc
    if host.startswith(("static.", "www.")):
        tries.append(ws.replace(host, host.split(".", 1)[1], 1))
    elif host.count(".") == 1:
        tries.append(ws.replace(host, "www." + host, 1))
    page_url = None
    for u in tries:
        try:
            page_url, ctype, data = fetch(u, accept="text/html,application/xhtml+xml,*/*;q=0.8")
            break
        except BlockedError as e:
            dbg["status"] = "blocked"
            dbg["err"] = str(e)
            return rec, dbg
        except Exception as e:
            dbg["err"] = str(e)[:200]
    if page_url is None:
        dbg["status"] = "fetch-error"
        return rec, dbg
    text = data.decode("utf-8", "replace")
    rec["src"] = page_url
    dbg["page"] = page_url

    tmpdir = tempfile.mkdtemp(prefix="brand_")
    logo_im = None
    logo_kind = None
    logo_conf = None
    try:
        # ---------------- logo
        tried = []
        host = urllib.parse.urlparse(page_url).netloc.lower().replace("www.", "")
        toks = {w for w in re.findall(r"[a-z]{4,}", (school.get("n", "") + " " + school.get("t", "")).lower())
                if w not in STOP}
        toks |= {host.split(".")[0][:6]}
        for kind, url, base in find_candidates(page_url, text, sorted(toks)):
            if len(tried) >= 8:
                break
            try:
                fu, ct, b = fetch(url, accept="image/svg+xml,image/png,image/webp,image/*,*/*;q=0.5", limit=3_000_000)
            except Exception as e:
                tried.append([kind, url, "err"])
                continue
            im, was_svg = load_image(b, ct, fu, tmpdir)
            if im is None:
                tried.append([kind, url, "not-image"])
                continue
            st = image_stats(im)
            transparent = st["alpha_frac"] > 0.02
            ok = looks_like_logo(st, transparent)
            if not ok and kind == "sidearm-site" and st["w"] >= 40 and st["h"] >= 40:
                # Sidearm's /images/logos/site/site.png is by definition the site logo; detailed
                # mascot art just has more colours than the generic photo test allows.
                ok = st["top_cov"] >= (0.2 if transparent else 0.4)
            reason = None
            if not ok:
                reason = "photo-like"
            elif transparent and st["ink_frac"] < 0.12:
                ok, reason = False, "white-logo"  # reverse/white version: invisible on white
            elif kind in ("og-image",) and (st["aspect"] > 1.25 or "logo" not in (url + fu).lower() and st["top_cov"] < 0.85):
                ok, reason = False, "og-not-logo"
            elif kind == "header-img" and st["aspect"] > 2.4:
                ok, reason = False, "too-wide"
            elif kind in ("favicon", "icon", "apple-touch-icon") and min(st["full"]) < 64:
                ok, reason = False, "too-small"
            elif kind == "sidearm-site" and min(st["full"]) < 48:
                ok, reason = False, "too-small"
            tried.append([kind, url, reason or "ok", st["w"], st["h"], round(st["top_cov"], 2),
                          round(st["ink_frac"], 2)])
            if ok:
                logo_im, logo_kind, logo_conf = im, kind, base
                if kind == "header-img" and st["aspect"] > 1.6:
                    logo_conf = "medium"
                dbg["logo_url"] = fu
                break
        dbg["tried"] = tried

        lc = logo_colours(logo_im) if logo_im is not None else []
        dbg["logo_colours"] = [[round(f, 3), rgb_to_hex(c)] for f, c in lc]
        if logo_im is not None:
            dest = os.path.join(LOGO_DIR, slug + ".webp")
            save_webp(logo_im, dest, tmpdir)
            rec["logo"] = "/brand/logos/%s.webp" % slug
            dbg["logo_kind"] = logo_kind

        # ---------------- colours
        mc = meta_colours(text)
        css_texts = [text]
        for cu in css_urls(page_url, text):
            try:
                _, _, cb = fetch(cu, accept="text/css,*/*;q=0.1", limit=4_000_000)
                css_texts.append(cb.decode("utf-8", "replace"))
            except Exception:
                pass
        cp, cs, csrc, freq = css_colours(css_texts)
        dbg["meta"] = {k: rgb_to_hex(v) for k, v in mc.items()}
        dbg["css"] = {"primary": cp and rgb_to_hex(cp), "secondary": cs and rgb_to_hex(cs),
                      "freq": [[n, rgb_to_hex(c)] for n, c in freq[:6]]}

        def matches_logo(c, tol=110):
            return any(dist(c, lc_) < tol for _, lc_ in lc)

        primary = secondary = None
        pconf = None
        if cp is not None and not is_neutral(cp):
            primary, pconf = cp, ("high" if (not lc or matches_logo(cp)) else "medium")
        elif any(k in mc and not is_neutral(mc[k]) for k in ("theme", "tile")):
            m = mc["theme"] if ("theme" in mc and not is_neutral(mc["theme"])) else mc["tile"]
            primary, pconf = m, ("high" if matches_logo(m) else "medium")
            # theme-color is often the accent: if the logo is dominated by another brand colour
            # and the meta colour is only a minor logo colour, swap them.
            if lc and lc[0][0] >= 0.3 and dist(lc[0][1], m) >= 110:
                minor = [f for f, c in lc[1:] if dist(c, m) < 110]
                if minor and minor[0] < 0.2:
                    primary, pconf = lc[0][1], "high"
        else:
            # frequent saturated CSS colour that also appears in the logo
            for n, c in freq[:8]:
                if n >= 3 and lc and matches_logo(c, 90):
                    primary, pconf = c, "medium"
                    break
            if primary is None and lc:
                primary, pconf = lc[0][1], ("medium" if lc[0][0] > 0.15 else "low")
            if primary is None and freq and freq[0][0] >= 5:
                primary, pconf = freq[0][1], "low"

        if primary is not None:
            # secondary: CSS var (if not neutral and distinct), theme/tile meta, then logo
            cands = []
            if cs is not None:
                cands.append(cs)
            for k in ("theme", "tile"):
                if k in mc:
                    cands.append(mc[k])
            cands += [c for f, c in lc if f >= 0.08]
            for c in cands:
                if near_white_or_black(c) or dist(c, primary) < 90:
                    continue
                if is_neutral(c) and c is not cs:
                    continue
                secondary = c
                break

        if primary is not None:
            rec["primary"] = rgb_to_hex(primary)
            rec["ink"] = make_ink(primary)
            rec["on"] = make_on(primary)
        if secondary is not None:
            rec["secondary"] = rgb_to_hex(secondary)

        # ---------------- confidence
        levels = {"high": 3, "medium": 2, "low": 1, None: 0}
        lv = [levels[x] for x in (logo_conf, pconf) if x]
        if rec["logo"] is None and rec["primary"] is None:
            rec["conf"] = None
            rec["src"] = None
            dbg["status"] = "nothing"
        else:
            score = min(lv) if len(lv) == 2 else min(lv[0], 2) if lv else 0
            rec["conf"] = {3: "high", 2: "medium", 1: "low"}.get(score, "low")
            dbg["status"] = "ok"
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
    return rec, dbg


# ----------------------------------------------------------------------------- driver
def load_json(p, default):
    try:
        with open(p) as f:
            return json.load(f)
    except Exception:
        return default


def write_json(p, obj, **kw):
    tmp = p + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, **kw)
    os.replace(tmp, p)


def merge_and_write(state, schools):
    overrides = load_json(OVERRIDES, {})
    brand = {}
    for s in schools:
        slug = school_slug(s)
        rec = dict((state.get(slug) or {}).get("rec") or
                   {"logo": None, "primary": None, "secondary": None, "ink": None, "on": None,
                    "src": None, "conf": None})
        if rec.get("primary"):
            rec["ink"] = make_ink(hex_to_rgb(rec["primary"]))
            rec["on"] = make_on(hex_to_rgb(rec["primary"]))
        ov = overrides.get(slug)
        if ov:
            hide = ov.get("hide_logo")
            for k, v in ov.items():
                if k in ("hide_logo", "_note"):
                    continue
                rec[k] = v
            if "primary" in ov and ov["primary"]:
                c = hex_to_rgb(ov["primary"])
                rec["primary"] = rgb_to_hex(c)
                rec.setdefault("ink", None)
                if "ink" not in ov:
                    rec["ink"] = make_ink(c)
                if "on" not in ov:
                    rec["on"] = make_on(c)
            if "primary" in ov and not ov["primary"]:
                rec["ink"] = rec["on"] = None
            if hide:
                rec["logo"] = None
                f = os.path.join(LOGO_DIR, slug + ".webp")
                if os.path.exists(f):
                    os.remove(f)
            if "conf" not in ov:
                rec["conf"] = "high"
            rec["src"] = rec.get("src") or "override"
        brand[slug] = {k: rec.get(k) for k in ("logo", "primary", "secondary", "ink", "on", "src", "conf")}
    write_json(BRAND_JSON, brand, separators=(",", ":"), sort_keys=True)
    return brand


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true", help="re-harvest every school")
    ap.add_argument("--only", nargs="+", metavar="SLUG", help="re-harvest only these slugs")
    ap.add_argument("--retry-failed", action="store_true", help="re-harvest schools with errors / nothing found")
    ap.add_argument("--merge-only", action="store_true", help="only merge state + overrides into brand.json")
    ap.add_argument("--limit", type=int, default=0, help="stop after N schools (testing)")
    args = ap.parse_args()

    os.makedirs(LOGO_DIR, exist_ok=True)
    schools = json.load(open(DB))["schools"]
    state = load_json(STATE_JSON, {})

    if not args.merge_only:
        todo = []
        for s in schools:
            slug = school_slug(s)
            st = state.get(slug)
            if args.only:
                if slug in args.only:
                    todo.append((s, slug))
                continue
            if args.force or st is None:
                todo.append((s, slug))
            elif args.retry_failed and st.get("dbg", {}).get("status") in ("fetch-error", "nothing", "blocked", "crash"):
                todo.append((s, slug))
        if args.limit:
            todo = todo[:args.limit]
        print(f"{len(todo)} schools to harvest ({MAX_WORKERS} workers)", flush=True)
        lock = threading.Lock()
        done = [0]

        def work(item):
            s, slug = item
            try:
                rec, dbg = harvest_one(s, slug)
            except Exception as e:  # never let one school kill the run
                rec = {"logo": None, "primary": None, "secondary": None, "ink": None, "on": None,
                       "src": None, "conf": None}
                dbg = {"status": "crash", "err": repr(e)[:300], "ws": s.get("ws")}
            if rec["logo"] is None:
                f = os.path.join(LOGO_DIR, slug + ".webp")
                if os.path.exists(f):
                    os.remove(f)
            with lock:
                state[slug] = {"name": s["n"], "d": s.get("d"), "rec": rec, "dbg": dbg}
                done[0] += 1
                if done[0] % 25 == 0:
                    write_json(STATE_JSON, state, indent=1, sort_keys=True)
                    print(f"  {done[0]}/{len(todo)}", flush=True)
            return slug

        with cf.ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
            list(ex.map(work, todo))
        write_json(STATE_JSON, state, indent=1, sort_keys=True)

    brand = merge_and_write(state, schools)
    vals = list(brand.values())
    n_logo = sum(1 for v in vals if v["logo"])
    n_col = sum(1 for v in vals if v["primary"])
    confs = {}
    for v in vals:
        confs[v["conf"]] = confs.get(v["conf"], 0) + 1
    print(f"brand.json: {len(vals)} schools | logos {n_logo} | primary colours {n_col} | conf {confs}")


if __name__ == "__main__":
    main()
