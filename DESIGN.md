# Track Standards design system

The one reference for how trackandfieldstandards.com looks, moves and reads. The values live in code in
`src/standards/ui.css` (loaded last by the app and linked by every prerendered guide page); this file explains them.
If the two ever disagree, `ui.css` is the truth and this file gets fixed.

Every UI change passes `docs/design/QUALITY-CHECKLIST.md` before it ships. Rules for accessibility, forms, motion and
performance come from the Vercel Web Interface Guidelines (`docs/design/vercel-web-interface-guidelines.md`), with the
house overrides listed there.

## Direction: Precision Futurism

Precision first, futurism in one place.

- **Precision** is the default everywhere: real data, tabular numerals, hairline borders, a fixed type scale, three radii,
  two shadows, one accent. Nothing decorative that the data doesn't need.
- **Futurism** is spent sparingly: the violet accent, Inter's clean geometry, and at most one orchestrated
  motion moment per screen (the result count arriving, a sheet opening). It is never glass stacks, aurora backgrounds,
  shaders, glows or 3D cards. Those read as a template and cost speed on the phones most visitors use.
- The audience is parents and high school athletes, 65% on phones, most arriving from Google. Plain words beat clever ones.

## Typography

One family: **Inter** (official variable font, Latin subset, self-hosted at `/fonts/inter-var-latin.woff2`, 48 KB,
weights 100 to 900, preloaded, `font-display: swap`). Fallback: system UI fonts.

| Token | Size | Use | Weight | Line height | Tracking |
|---|---|---|---|---|---|
| `--fs-60` | 60 | Home display headline only | 800 | `--lh-tight` | `--ls-display` |
| `--fs-44` | 44 | Page H1 | 750 | `--lh-tight` | `--ls-display` |
| `--fs-32` | 32 | Section H2 | 700 | `--lh-tight` | `--ls-head` |
| `--fs-24` | 24 | H3, card titles, big stat numbers | 700 | `--lh-snug` | `--ls-head` |
| `--fs-20` | 20 | Lead paragraph, result headline | 600 | `--lh-snug` | `--ls-body` |
| `--fs-17` | 17 | Body text, inputs | 400 | `--lh-body` | `--ls-body` |
| `--fs-15` | 15 | Buttons, controls, table cells | 600 | `--lh-snug` | 0 |
| `--fs-14` | 14 | Secondary text, nav links | 500 | `--lh-snug` | 0 |
| `--fs-13` | 13 | Meta lines, captions under numbers | 500 | `--lh-snug` | 0 |
| `--fs-12` | 12 | Table column headers, tiny labels | 600 | `--lh-snug` | .04em |

Rules:
- Times, marks, ranks and scores always use `font-variant-numeric: tabular-nums`.
- Form fields are never below 16 px on phones (iOS zooms the page otherwise).
- Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`. Keep "Track & Field" and season ranges
  ("2026-27") on one line.
- Sentence case for headings and buttons. Capitals only for table column headers (data convention).
- No accenting a single word in a different colour or weight inside a headline, except the existing home hero line.

## Colour

> Light for everyone (Ryan 2026-11-05): every page starts with `data-theme="light"` and `color-scheme: only light`.
> Premium Dark (Ryan 2026-11-12): Premium members choose Premium Dark (default) or Premium White in Settings. Dark sets `data-theme="dark"`
> on the whole site from account.js (and from `localStorage.prPT` before first paint), using the Dark column below. Any new component must
> read correctly in both columns; check it with `?demo=premium` on localhost (Settings switches the look).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--pr-ink` | #0B0B0F | #F5F5F7 | Primary text, ink buttons |
| `--pr-ink2` | #1D1D1F | #E8E8ED | Strong secondary text |
| `--pr-mute` | #4A4A52 | #C8C8D0 | Body secondary |
| `--pr-faint` | #66666F | #A3A3AC | Meta, captions (still 4.5:1) |
| `--pr-line` | #E4E3EA | #2C2B33 | Hairline borders |
| `--pr-soft` | #F3F2F7 | #18171E | Field backgrounds, quiet chips |
| `--pr-card` | #FFFFFF | #121117 | Surfaces |
| `--pr-violet` | #7A45F0 | #8F63FF | The one accent: primary action, links, focus |
| `--pr-violet-press` | #6633E0 | #7A45F0 | Hover/press of the accent |
| `--pr-t` / `--pr-r` / `--pr-w` | #16794A / #9A5200 / #0A5FB4 | #4CD38A / #F2B544 / #6BB2FF | Target / Recruit / Walk-On, and nothing else |

Rules:
- One accent. Violet means "act here". The level colours mean Target, Recruit and Walk-On only.
- School pages use the school's own colour in the band (contrast-checked to 4.5:1). Our violet stays on every evaluation button.
- Every text colour reaches 4.5:1 on its background; large text 3:1.
- No gradients on buttons, headers or text. The one allowed gradient is the Results "Best" card.

## Shape and depth

| Token | Value | Use |
|---|---|---|
| `--r-1` | 10 px | Inputs, chips, small buttons |
| `--r-2` | 14 px | Cards, fields, primary buttons |
| `--r-3` | 20 px | Large panels, sheets, hero cards |
| `--r-pill` | 999 px | Pills, segmented controls, tags |
| `--sh-1` | 1 px hairline shadow | Resting surfaces |
| `--sh-2` | soft 16/40 px drop | Raised: sheets, pop-overs, the search card |

Depth comes from a hairline border plus `--sh-1`. `--sh-2` only for things that float above the page. No glows, no
coloured shadows, no inset shine.

## Motion

| Token | Value | Use |
|---|---|---|
| `--dur-1` | 120 ms | Hover, press, colour changes |
| `--dur-2` | 200 ms | Toggles, tabs, chips, small reveals |
| `--dur-3` | 320 ms | Sheets, dialogs, the one orchestrated moment per screen |
| `--ease-out` | cubic-bezier(.2,.8,.2,1) | Things arriving |
| `--ease-in-out` | cubic-bezier(.65,0,.35,1) | Things moving between two places |

Rules:
- Animate `transform` and `opacity` only. Never `transition: all`; list the properties.
- Motion answers an action (open, switch, confirm). No entrance animation on every section, no scroll-jacking, no
  smooth-scroll libraries.
- One orchestrated moment per screen at most.
- `prefers-reduced-motion: reduce` turns all of it off (global rule in `ui.css`).
- Press feedback: `translateY(1px)` on primary buttons.

## Layout

- Content width 1040 px (header and main column). Gutters 22 px desktop, 16 px phone (14 px in the header).
- Breakpoints: **640** (phone) and **960** (tablet). Legacy 420 and 760 remain in `standards.css`; new code uses 640/960 only.
- Spacing on a 4 px grid: 4, 8, 12, 16, 20, 24, 32, 48, 64.
- Data first: on a phone the answer (the "fits 883 colleges" line, the rankings table) is on the first screen.
- One prompt at a time: evaluation pop-up, account bar, tour and sheets never overlap. The account bar outranks the evaluation pill.

## Components (one per job)

| Job | Component | Notes |
|---|---|---|
| Site frame | `.prh` header | Same on app and guide pages: logo, sections, Sign in, Free evaluation |
| Main action | Violet button (`--pr-violet`, `--r-2`) | One per view |
| Search or submit | Ink button (`--pr-black`) "Search colleges" | Same label everywhere |
| Choosing one of few | Segmented control (Men/Women, grade) | Never a dropdown for 2 to 4 options |
| Choosing one of many | Styled select (soft field, chevron) | Event, division, conference |
| Data | Table with `--fs-12` caps headers, tabular numbers, hairline rows | Right-align numbers |
| Status | Level chip (Target/Recruit/Walk-On colours) | The athlete's own row gets the violet edge |
| Loading | `.skel` rows | Never bare "Loading" text |
| Empty or error | Sentence saying what happened and the next step | Never a dead end |

## Copy

- Plain words a parent understands. Sentence case. Active voice. Specific button labels.
- Never critique an athlete; frame against the standard ("Oregon starts recruiting at 1:47.25").
- Use "…" in loading text. Straight `'` and `"` stay in marks (20' 6").
- House voice rules apply (`human-copy` skill: no em dashes in marketing copy).

## Not allowed (why)

| Pattern | Why |
|---|---|
| Glassmorphism stacks, aurora/shader backgrounds, 3D tilt cards | Template look, GPU cost on phones, hurts Core Web Vitals |
| Runtime UI libraries (shadcn, Radix, Magic UI, Aceternity, Motion, GSAP, Lenis, Three) in the standards app | The app renders HTML strings; these need a React/Tailwind rewrite and add weight. Motion libraries belong to the video pipeline |
| Spaced-out capital "eyebrow" labels above headings | Template habit; says nothing |
| A second accent colour | Dilutes "violet = act here" |
| New breakpoints, radii, shadows or font sizes outside the tokens | Drift; `npm run design:check` fails on budget overruns |
