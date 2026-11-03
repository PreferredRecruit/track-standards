# trackandfieldstandards.com: rules for UI work

Read before changing anything a visitor can see.

- **Design system:** `DESIGN.md` (direction, tokens, components, what's not allowed). Values live in `src/standards/ui.css`,
  loaded last by the app and linked by every prerendered guide page. Use its tokens (`--fs-*`, `--r-*`, `--sh-*`, `--dur-*`,
  `--ease-*`, colour vars); never add a new radius, shadow, font size, breakpoint or accent colour.
- **Quality gate:** `docs/design/QUALITY-CHECKLIST.md`. A UI change is done only when `npm run build`, `npm run design:check`
  and `npm run design:shots` pass and you have looked at the 375 px and desktop screenshots in `design-shots/`.
- **Guidelines:** `docs/design/vercel-web-interface-guidelines.md` (pinned copy, MIT). House overrides at the top win.
- **No runtime UI dependencies.** The app renders HTML strings in `src/standards/*.js`; no Tailwind, shadcn, Radix, Motion, GSAP,
  Lenis or WebGL here. Playwright for `design:shots` comes from the editing folder's node_modules (dev only).
- **Copy:** plain words for parents, sentence case, never-hater framing, "…" in loading text, straight quotes inside marks.
- Business rules (data sources, pop-ups, accounts, deploys) are in the editing folder's skills: `seo-aeo-growth` and its
  `references/track-standards.md`.
