# School brand harvester (logos + colours)

Builds `public/brand/brand.json` and `public/brand/logos/<slug>.webp` for every school in
`public/data/db.json`. Approved by Ryan on 2026-10-16 (school logos + colours on school pages).

## Run

From `sites/track-standards/`:

```bash
python3 -m pip install --user pillow        # one-time (add --break-system-packages on Homebrew Python)
python3 scripts/brand/harvest.py            # resume: only schools not harvested yet
python3 scripts/brand/harvest.py --force    # redo every school
python3 scripts/brand/harvest.py --only university-of-alabama-track-standards dordt-track-standards
python3 scripts/brand/harvest.py --retry-failed   # redo blocked / errored / nothing-found schools
python3 scripts/brand/harvest.py --merge-only     # just re-apply overrides.json to brand.json
```

Needs macOS `qlmanage` (renders SVG logos), `sips` and `/opt/homebrew/bin/cwebp`.
A full run takes about 5 minutes: 8 parallel workers, one request at a time each (so at most 8 at once),
a 10 s timeout and a normal desktop-Chrome User-Agent. Sites behind a bot challenge (AWS WAF, captcha)
are recorded as `blocked` and skipped. The script never tries to get around a challenge.

Slugs follow the site rule: `(s.os && s.os[0]) || slugOf(s.n)`.

## Output

`public/brand/brand.json`:

```json
{ "<slug>": { "logo": "/brand/logos/<slug>.webp" | null,
              "primary": "#rrggbb" | null, "secondary": "#rrggbb" | null,
              "ink": "#rrggbb" | null,   // primary darkened, same hue, >= 4.5:1 on #ffffff (text/links)
              "on":  "#ffffff" | "#0b0b0f" | null,  // text colour on a primary-coloured band
              "src": "<page the assets came from>" | null,
              "conf": "high" | "medium" | "low" | null } }
```

Every school in db.json has an entry. Schools without `ws`, or where nothing reliable was found, get
null fields. Nothing is guessed.

`scripts/brand/harvest-state.json` is the working log: one record per school with the candidates tried,
why each was accepted or rejected, the colour sources and a status (`ok`, `no-ws`, `blocked`,
`fetch-error`, `nothing`). The resume logic reads it. Look here first when a school looks wrong.

## How it decides

**Logo**, first candidate that passes:
1. Sidearm canonical site logo `<origin>/images/logos/site/site.png` (about 90% of schools).
2. Header logo `<img>` with a strong name (`main_nav_logo`, `logo-main`, `site-logo`, `header`).
3. `apple-touch-icon` / large `link[rel=icon]` (96 px or more, or SVG), then `/apple-touch-icon.png`.
4. Other header `<img>`s with "logo" in them, only if the file name or alt text names the school.
5. `og:image` only when it's square-ish and logo-like (og:image is usually a photo), then favicon (64 px or more).

Rejected: sponsor, conference and governing-body marks (NCAA/NAIA/SCIAC/Big 12/…), Sidearm opponent logos
(`/images/logos/<team>.png`), photo-like images (too many colours, no transparency), wide wordmarks
(aspect over 2.4), tiny icons, and white "reverse" logos that would vanish on a white page.
SVGs are rasterised with `qlmanage`, white backgrounds touching the edges become transparent, the image is
trimmed, fitted into a 160×160 transparent canvas with 12 px padding and encoded with `cwebp` (under 15 KB).

**Colours:** Sidearm Nuxt CSS custom properties `--color-primary` / `--color-secondary`
(in `/_nuxt/entry.*.css`), then `meta[name=theme-color]`, `msapplication-TileColor`, then frequent
saturated colours in the site CSS that also appear in the logo, then the logo's dominant colours.
Whites, blacks and greys are never used as primary. If theme-color is only a minor logo colour and the
logo is dominated by another colour, the logo colour becomes primary and theme-color secondary.

**Confidence:** `high` = canonical/explicit logo and a colour that comes from site CSS/meta and matches
the logo. `medium` = one of the two comes from a weaker source (icon, unconfirmed colour).
`low` = colour only from CSS frequency, or logo only from favicon/og:image.

## Hand overrides

Create `scripts/brand/overrides.json`. It's merged last on every run (and with `--merge-only`):

```json
{
  "university-of-alabama-track-standards": { "primary": "#9E1B32", "secondary": "#828A8F" },
  "some-school-track-standards": { "logo": null, "_note": "wrong mascot on their site" },
  "takedown-school-track-standards": { "hide_logo": true, "_note": "takedown request 2026-11-02" }
}
```

- Any field in the brand.json schema can be set. Setting `primary` recomputes `ink` and `on` unless you set them too.
- `"hide_logo": true` removes the logo from brand.json **and deletes the webp file**, and it stays hidden
  on every later run. Use it for takedown requests.
- To supply a hand-picked logo, save a 160×160 webp as `public/brand/logos/<slug>-manual.webp` and set
  `"logo": "/brand/logos/<slug>-manual.webp"`. The harvester only writes `<slug>.webp`, so it never overwrites it.
- Overridden entries get `conf: "high"` unless you set `conf`.

## Logo use / disclaimer intent

School names, logos and colours are trademarks of their institutions. We show them only to identify the
school a page is about (nominative use), the way recruiting sites like Runcruit do. No endorsement or
affiliation is implied. The site should carry a line such as: "School names and logos are trademarks of
their respective institutions and are used for identification only. No affiliation or endorsement is
implied." Any takedown request is honoured with `hide_logo` straight away.
