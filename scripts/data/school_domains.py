"""School email domains for athlete verification (Ryan 2026-11-07: college athletes verify with a school email).
Source: the U.S. Department of Education IPEDS institution directory (HD file, WEBADDR = the college's official web address).
A college's email lives on its web domain or a subdomain of it (uark.edu, email.uark.edu), so the claim function accepts the
domain itself and its subdomains, never alumni.* addresses. Matched on the site's full school name + state (aliases as fallback);
schools with no confident match are left out and their athletes go to manual review.
Output: public/data/school-domains.json = {"<site school name>": "<domain>"}
Usage: python3 school_domains.py <HDyyyy.csv> <site>/public/data/db.json <out json>"""
import csv, json, re, sys

MANUAL = {   # checked by hand 2026-11-07 (site name differs from the IPEDS legal name); several domains = space-separated
    "UC Berkeley": "berkeley.edu", "Texas": "utexas.edu", "University of North Carolina": "unc.edu", "Long Beach State": "csulb.edu",
    "Indiana University": "iu.edu indiana.edu", "Arizona State University": "asu.edu", "University of Cincinnati": "uc.edu",
    "Colorado State University": "colostate.edu", "University of Michigan": "umich.edu", "University of Minnesota": "umn.edu",
    "University of Missouri": "missouri.edu umsystem.edu", "Morehead State": "moreheadstate.edu", "North Carolina A&T": "ncat.edu",
    "University of Nebraska": "unl.edu", "University of New Mexico": "unm.edu", "North Dakota": "und.edu", "North Dakota State": "ndsu.edu",
    "Ohio State University": "osu.edu", "Oklahoma State University": "okstate.edu", "Pennsylvania State University": "psu.edu",
    "Rutgers, The State University of New Jersey": "rutgers.edu", "San Diego State": "sdsu.edu", "University of South Carolina": "sc.edu",
    "South Dakota": "usd.edu", "Southern University": "subr.edu", "Stanford": "stanford.edu", "University of Tennessee": "utk.edu",
    "University of Virginia": "virginia.edu", "University of Washington": "uw.edu washington.edu"}

def norm(s):
    s = s.lower().replace("&", " and ").replace("saint ", "st ").replace("st. ", "st ")
    s = re.sub(r"\bthe\b|[^a-z0-9 ]", " ", s)
    return " ".join(s.split())

def dom(u):
    u = re.sub(r"^https?://", "", (u or "").strip().lower()).split("/")[0]
    u = re.sub(r"^www\d?\.", "", u)
    if u.endswith(".edu"): u = ".".join(u.split(".")[-2:])   # twin-cities.umn.edu -> umn.edu (email lives on the main domain)
    return u if re.fullmatch(r"[a-z0-9.-]+\.[a-z]{2,}", u) else None

def main(hd, db, out):
    by = {}
    for r in csv.DictReader(open(hd, encoding="latin-1")):
        d = dom(r["WEBADDR"])
        if not d: continue
        names = [r["INSTNM"]] + [a for a in r["IALIAS"].split("|") if a.strip()]
        for n in names: by.setdefault((norm(n), r["STABBR"]), set()).add((d, int(r["INSTSIZE"]) if r["INSTSIZE"].lstrip("-").isdigit() else 0))
    S = json.load(open(db))["schools"]
    res, miss = {}, []
    for s in S:
        cands = set()
        for n in [s["n"]] + s.get("a", []):
            cands |= by.get((norm(n), s.get("s")), set())
            if cands: break
        if False:   # prefix guesses disabled 2026-11-07: they matched branch campuses (South Dakota -> School of Mines); a wrong domain is a security hole ("Albright", "Louisiana State University") vs IPEDS legal names: unique prefix in the same state
            for n in [s["n"]] + s.get("a", []):
                k = norm(n)
                for (nm, st), ds in by.items():
                    if st == s.get("s") and (nm.startswith(k + " ") and not nm.startswith(k + " state")): cands |= ds   # "North Dakota" is not NDSU
                if cands: break
        ds = {d for d, _ in cands}
        if len(ds) > 1:   # "University of Michigan" also prefixes Dearborn and Flint: keep the one clearly largest campus (IPEDS INSTSIZE)
            top = max(z for _, z in cands); big = {d for d, z in cands if z == top}
            if len(big) == 1 and top > 0: ds = big
        if len(ds) == 1: res[s["n"]] = ds.pop()
        else: miss.append(s["n"])
    names = {s["n"] for s in S}
    for n, d in MANUAL.items():   # checked by hand 2026-11-07: site name doesn't match the IPEDS legal name
        if n in names: res[n] = d; miss = [m for m in miss if m != n]
    json.dump(res, open(out, "w"), indent=0, sort_keys=True)
    print(len(res), "schools mapped,", len(miss), "left for manual review, e.g.", miss[:8])

if __name__ == "__main__": main(*sys.argv[1:4])
