# UI quality checklist

Every change a visitor can see passes this before it ships. Two scripts do the mechanical part in under a minute; a person (or
Claude) does the judgement part by looking at the screenshots. A "pass" needs evidence: the script output and the screenshot
names, not a feeling.

## 1. Run the scripts (both must pass)

```bash
npm run build
npm run design:check        # tokens within budget, no Vercel anti-patterns, DESIGN.md guarantees intact
npm run design:shots        # 375 px + 1280 px screenshots of the key pages, layout and form-field checks
```

`design:shots` takes a base URL and paths: `node scripts/design/shots.mjs http://localhost:8091 /schools/byu-track-standards.html`.
Add the pages your change touches. Screenshots land in `design-shots/` (not committed).

## 2. Look at every screenshot: phone (375 px) and desktop

| Area | Pass when | Evidence |
|---|---|---|
| First screen | The answer (result line, table, ranking) is visible on the phone's first screen | phone screenshot |
| Hierarchy | One clear heading, one primary action (violet), nothing competing with it | both |
| Tokens | Sizes, radii, shadows and colours come from `ui.css`; `design:check` budget unchanged or lower | script output |
| Typography | Inter, no orphan words in headings, numbers tabular and right-aligned in tables, sentence case | both |
| Colour | Violet only for actions/links/focus; level colours only for Target/Recruit/Walk-On; no gradients or glows | both |
| Motion | Only transform/opacity, tokens `--dur-*`/`--ease-*`, at most one orchestrated moment, off under reduced motion | code review |
| Layout | No sideways scroll, nothing covered by the Help or evaluation buttons, 16 px phone gutters | phone screenshot |
| Touch | Tap targets at least 40 px tall on phones; form fields at least 16 px | script + phone |
| States | Loading shows `.skel` rows; empty and error states say what happened and the next step | trigger them |
| Prompts | Only one prompt on screen at a time (pop-up, account bar, tour, sheet) | trigger them |
| Accessibility | Keyboard reaches everything with a visible focus ring; icon buttons have labels; contrast 4.5:1 | tab through once |
| Copy | Plain words, specific button labels, never-hater framing, "…" in loading text | read it aloud |
| Dark mode (app) | Same page in dark mode has no unreadable text or light boxes | one dark screenshot |
| Speed | No new runtime dependency; main bundle not bigger without a reason written in the commit | `ls -la dist/assets` |

## 3. Review against the Vercel guidelines

For any new component or form, read `docs/design/vercel-web-interface-guidelines.md` (house overrides at the top) and report
findings as `file:line - issue`. Fix errors before shipping; list anything deferred in the commit message.

## 4. Record it

The commit message names the pages checked and the screenshot files looked at. If a rule was broken on purpose, say which and why.
