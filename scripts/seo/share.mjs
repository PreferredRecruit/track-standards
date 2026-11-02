/* "Post your ranking" kit (Ryan 2026-11-02: "if a school wanted to post our rankings is the site conducive"). One design source for
   three cards: the link preview (og:image, 1200x630 PNG rendered here with resvg), and the Instagram post (1080x1350) and story
   (1080x1920), written as SVG that the school page turns into a PNG in the visitor's browser (app.js rankShare), so a deploy
   doesn't carry thousands of PNGs. Inter (OFL, scripts/seo/fonts) is the only font, so server and browser draw the same card. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONTS = ["SemiBold", "Bold", "ExtraBold", "Black"].map(w => path.join(HERE, "fonts", `Inter-${w}.ttf`));
const INK = "#12111A", MUTE = "#6B6A7B", LINE = "#ECEAF3", PURPLE = "#6C47FF", PURPLE_D = "#5B3BE0";
const TG = { a: ["#FFE58A", "#C98A00", "#2A1B00"], b: ["#9C82FF", "#4B2BD6", "#fff"], c: ["#7FB4FF", "#1D5BBF", "#fff"], d: ["#C9C8D3", "#8A8999", "#fff"] };   /* same tiers as the badge */
const tier = o => o == null ? "d" : o >= 90 ? "a" : o >= 80 ? "b" : o >= 70 ? "c" : "d";
const x = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/* Inter advance widths, roughly, in em: good enough to shrink a long school name to fit */
const W = { 600: 0.97, 700: 1, 800: 1.03, 900: 1.07 };
const est = (s, size, wt = 800) => [...String(s)].reduce((a, c) => a + (/[ilj.,'’:;!|]/.test(c) ? 0.27 : /[ frtI()\-]/.test(c) ? 0.36 : /[MWmw@]/.test(c) ? 0.86 : /[A-Z]/.test(c) ? 0.69 : /\d/.test(c) ? 0.63 : 0.57), 0) * size * W[wt];
let MEAS = null;   /* exact widths from resvg once renderer() has loaded (the build); the estimate above is the fallback */
const textW = (s, size, wt = 800) => MEAS ? MEAS(s, size, wt) : est(s, size, wt);
const fit = (s, max, size, min, wt = 800) => { let z = size; while (z > min && textW(s, z, wt) > max) z -= 2; let t = s; while (textW(t, z, wt) > max && t.length > 4) t = t.slice(0, -2).trimEnd() + "…"; return [t, z]; };

const font = `font-family="Inter"`;
const kicker = (X, Y, z = 24) => `<text x="${X}" y="${Y}" ${font} font-size="${z}" font-weight="800" letter-spacing="${z * 0.16}" fill="${PURPLE}">TRACK &amp; FIELD POWER RANKINGS</text>`;
/* school logo on a white tile; programs without a reliable logo get their initial on the school color */
const logoTile = (X, Y, z, c) => `<rect x="${X}" y="${Y}" width="${z}" height="${z}" rx="${z * 0.22}" fill="#fff" stroke="${LINE}" stroke-width="2"/>`
  + (c.logo ? `<image href="${x(c.logo)}" x="${X + z * 0.12}" y="${Y + z * 0.12}" width="${z * 0.76}" height="${z * 0.76}" preserveAspectRatio="xMidYMid meet"/>`
    : `<rect x="${X + z * 0.12}" y="${Y + z * 0.12}" width="${z * 0.76}" height="${z * 0.76}" rx="${z * 0.16}" fill="${x(c.col)}"/><text x="${X + z / 2}" y="${Y + z * 0.66}" ${font} font-size="${z * 0.42}" font-weight="900" text-anchor="middle" fill="#fff">${x(c.nm[0])}</text>`);
const ovrTile = (X, Y, w, h, o, id) => { const t = TG[tier(o)];
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset="1" stop-color="${t[1]}"/></linearGradient></defs>`
    + `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="${h * 0.24}" fill="url(#${id})"/><g ${font} text-anchor="middle" fill="${t[2]}"><text x="${X + w / 2}" y="${Y + h * 0.6}" font-size="${h * 0.46}" font-weight="900">${o}</text><text x="${X + w / 2}" y="${Y + h * 0.84}" font-size="${h * 0.13}" font-weight="800" letter-spacing="${h * 0.025}">OVR</text></g>`; };
const gWord = g => g === "m" ? "Men's" : "Women's";
/* "#2 of 11 in the Mountain West" only when it flatters (top 10 in the conference) */
const confLine = (c, y) => y.crank && y.crank <= 10 ? `#${y.crank}${y.cof ? ` of ${y.cof}` : ""} in the ${c.conf}` : "";
const pill = (X, Y, t, z, max) => { const [s, f] = fit(t, max - z * 1.4, z, z * 0.7, 700), w = textW(s, f, 700) + f * 1.4, h = f * 1.9;
  return `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="${h / 2}" fill="#F1EDFF"/><text x="${X + f * 0.7}" y="${Y + h * 0.66}" ${font} font-size="${f}" font-weight="700" fill="${PURPLE_D}">${x(s)}</text>`; };

/* Instagram post (1080x1350) or story (1080x1920) for one gender. c = { nm, col, logo, conf, d, label, upd }, y = { rank, of, crank, cof, ovr } */
export function igCard(c, g, y, kind = "post") {
  const S = kind === "story", H = S ? 1920 : 1350, top = S ? 250 : 84, L = 84, Wd = 1080 - 2 * L;
  /* the school name on one line, or two balanced lines when it won't fit at 64px */
  let [nm, nz] = fit(c.nm, Wd, S ? 92 : 84, 64), lines = [nm];
  if (nm !== c.nm) { const w = c.nm.split(" "); let best = null;
    for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(" "), b = w.slice(i).join(" "), m = Math.max(textW(a, 1), textW(b, 1)); if (!best || m < best[2]) best = [a, b, m]; }
    if (best) { nz = Math.max(52, Math.min(S ? 92 : 80, Math.floor(Wd / best[2]))); lines = [fit(best[0], Wd, nz, nz)[0], fit(best[1], Wd, nz, nz)[0]]; } }
  const extra = (lines.length - 1) * nz * 1.08;
  const rk = String(y.rank), big = Math.min(S ? 420 : 380, Math.floor((Wd - 40) / (0.66 * 1.07 * (rk.length + 0.55))));
  const yName = top + (S ? 330 : 290) + extra, yBig = yName + (S ? 120 : 95) + big * 0.74, yOf = yBig + (S ? 96 : 80), yPill = yOf + 44;
  const cl = confLine(c, y), footY = S ? 1500 : H - 150, tops = (y.top || []).slice(0, 3);
  let gx = L; const gp = tops.map(t => { const w = textW(t, 32, 700) + 44, o = gx + w > 1080 - L ? "" : `<rect x="${gx}" y="${(cl ? yPill + 96 : yPill)}" width="${w}" height="60" rx="30" fill="#fff" stroke="${LINE}" stroke-width="2"/><text x="${gx + 22}" y="${(cl ? yPill + 96 : yPill) + 41}" ${font} font-size="32" font-weight="700" fill="${INK}">${x(t)}</text>`; gx += w + 14; return o; }).join("");
  const bottom = (cl ? yPill + 72 : yOf) + (gp ? (cl ? 96 : 0) + 60 : 0), band = S ? footY - 70 : footY, shift = Math.max(0, Math.round(((top + 196 + band - 40) / 2 - (yName - extra - nz + bottom) / 2)));   /* centre the block between the header and the footer band */
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${H}" viewBox="0 0 1080 ${H}">`
    + `<rect width="1080" height="${H}" fill="#fff"/><rect x="0" y="0" width="1080" height="${S ? 14 : 12}" fill="${x(c.col)}"/>`
    + logoTile(L, top, 148, c) + kicker(L + 180, top + 62, 24) + `<text x="${L + 180}" y="${top + 112}" ${font} font-size="34" font-weight="600" fill="${MUTE}">${x(c.label)}</text>`
    + (y.ovr != null ? ovrTile(1080 - L - 150, top - 4, 150, 156, y.ovr, "ov") : "")
    + `<g transform="translate(0 ${shift})">`
    + lines.map((t, i) => `<text x="${L}" y="${yName - (lines.length - 1 - i) * nz * 1.08}" ${font} font-size="${nz}" font-weight="800" letter-spacing="${-nz * 0.02}" fill="${INK}">${x(t)}</text>`).join("")
    + `<text x="${L}" y="${yName + 62}" ${font} font-size="42" font-weight="600" fill="${MUTE}">${gWord(g)} Track &amp; Field</text>`
    + `<text x="${L - big * 0.04}" y="${yBig}" ${font} font-weight="900" letter-spacing="${-big * 0.03}" fill="${INK}"><tspan font-size="${big * 0.55}" fill="${PURPLE}" dy="${-big * 0.36}">#</tspan><tspan font-size="${big}" dy="${big * 0.36}">${rk}</tspan></text>`
    + `<text x="${L}" y="${yOf}" ${font} font-size="46" font-weight="700" fill="${INK}">in ${x(c.d)}${y.of ? `<tspan font-weight="600" fill="${MUTE}">\u00a0· of ${y.of} programs</tspan>` : ""}</text>`
    + (cl ? pill(L, yPill, cl, 38, Wd) : "") + gp + `</g>`
    + (S ? `<rect x="0" y="${footY - 70}" width="1080" height="${H - footY + 70}" fill="${INK}"/><rect x="0" y="${footY - 70}" width="1080" height="10" fill="${x(c.col)}"/>`
      + `<text x="540" y="${footY + 20}" ${font} font-size="40" font-weight="800" text-anchor="middle" fill="#fff">trackandfieldstandards.com</text><text x="540" y="${footY + 74}" ${font} font-size="28" font-weight="600" text-anchor="middle" fill="#B9B8C6">PR Power Index · updated ${x(c.upd)}</text>`
      : `<rect x="0" y="${footY}" width="1080" height="150" fill="${INK}"/><rect x="0" y="${footY}" width="1080" height="10" fill="${x(c.col)}"/>`
      + `<text x="${L}" y="${footY + 92}" ${font} font-size="36" font-weight="800" fill="#fff">trackandfieldstandards.com</text><text x="${1080 - L}" y="${footY + 92}" ${font} font-size="26" font-weight="600" text-anchor="end" fill="#B9B8C6">PR Power Index · ${x(c.upd)}</text>`)
    + `</svg>`;
}

/* link preview (1200x630): the school and one card per ranked gender */
export function ogCard(c, rows) {
  const L = 72, [nm, nz] = fit(c.nm, 1200 - L - 64, 64, 40);
  const n = rows.length, gap = 24, cw = (1200 - 2 * L - gap * (n - 1)) / n, cy = 318, ch = 214;
  const card = ([g, y], i) => { const X = L + i * (cw + gap), rk = `#${y.rank}`, bz = n === 1 ? 128 : 112, cl = confLine(c, y);
    const sub = [y.of ? `of ${y.of} in ${c.d}` : `in ${c.d}`, cl && n === 1 ? cl : ""].filter(Boolean).join(" · ");
    return `<rect x="${X}" y="${cy}" width="${cw}" height="${ch}" rx="26" fill="#F7F6FB" stroke="${LINE}" stroke-width="2"/>`
      + `<text x="${X + 30}" y="${cy + 46}" ${font} font-size="20" font-weight="800" letter-spacing="3" fill="${MUTE}">${g === "m" ? "MEN" : "WOMEN"}</text>`
      + `<text x="${X + 26}" y="${cy + 46 + bz * 0.86}" ${font} font-size="${bz}" font-weight="900" letter-spacing="${-bz * 0.03}" fill="${INK}">${rk}</text>`
      + (([t, z]) => `<text x="${X + 30}" y="${cy + ch - 26}" ${font} font-size="${z}" font-weight="600" fill="${MUTE}">${x(t)}</text>`)(fit(n > 1 && cl ? `${sub} · ${cl.replace(/ of \d+/, "")}` : sub, cw - 60, 24, 19, 600))
      + (y.ovr != null ? ovrTile(X + cw - 30 - 104, cy + 30, 104, 108, y.ovr, "o" + i) : ""); };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#fff"/><rect width="1200" height="12" fill="${x(c.col)}"/>`
    + logoTile(L, 56, 112, c) + kicker(L + 140, 104, 22) + `<text x="${L + 140}" y="${148}" ${font} font-size="28" font-weight="600" fill="${MUTE}">${x(c.label)} · updated ${x(c.upd)}</text>`
    + `<text x="${L}" y="${262}" ${font} font-size="${nz}" font-weight="800" letter-spacing="${-nz * 0.02}" fill="${INK}">${x(nm)}</text>`
    + rows.map(card).join("")
    + `<text x="${L}" y="${598}" ${font} font-size="22" font-weight="700" fill="${PURPLE}">trackandfieldstandards.com</text></svg>`;
}

/* renderer for the link previews: resvg with the Inter files; logos are WebP, which resvg can't read, so sharp turns each into a PNG first */
export async function renderer() {
  const { Resvg } = await import("@resvg/resvg-js"), sharp = (await import("sharp")).default, opt = { font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Inter" } }, M = new Map();
  MEAS = (s, size, wt) => { const k = `${wt}|${s}`; if (!M.has(k)) { const b = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="200"><text x="0" y="150" font-family="Inter" font-size="100" font-weight="${wt}" xml:space="preserve">${x(s)}</text></svg>`, opt).getBBox(); M.set(k, b ? b.width / 100 : est(s, 1, wt)); } return M.get(k) * size; };
  return {
    async logo(file) { try { return "data:image/png;base64," + (await sharp(file).resize(160, 160, { fit: "inside" }).png().toBuffer()).toString("base64"); } catch { return null; } },
    png(svg) { return new Resvg(svg, opt).render().asPng(); },
    small(buf) { return sharp(buf).png({ palette: true, quality: 92, compressionLevel: 9, effort: 8 }).toBuffer(); },   /* ~50 KB -> ~15 KB a card */
    fonts: () => FONTS.map(f => [path.basename(f), fs.readFileSync(f)]),
  };
}

/* build step (prerender.mjs, after the school pages): /share/<slug>.png link preview, /share/<slug>-<m|w>-<post|story>.svg for the
   browser, /share/index.json (what the school view shows) and the Inter files the browser embeds when it draws a card */
export async function writeShare(out, jobs) {
  const R = await renderer(), dir = path.join(out, "share"), fdir = path.join(out, "fonts", "share");
  fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(fdir, { recursive: true });
  for (const [n, b] of R.fonts()) fs.writeFileSync(path.join(fdir, n), b);
  let brand = {}; try { brand = JSON.parse(fs.readFileSync(path.join(out, "brand", "brand.json"), "utf8")); } catch { }
  const upd = v => { const d = new Date(String(v || "").slice(0, 10) + "T12:00:00Z"); return isNaN(d) ? String(v || "") : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }); };
  const idx = {}; let n = 0;
  for (const j of jobs) {
    const b = brand[j.slug] || {}, lg = b.logo && b.conf !== "low" ? b.logo : null;
    const c = { nm: j.nm, col: b.primary || PURPLE, conf: j.conf, d: j.d, label: j.label, upd: upd(j.upd) };
    const png = lg ? await R.logo(path.join(out, lg)) : null;
    fs.writeFileSync(path.join(dir, j.slug + ".png"), await R.small(R.png(ogCard({ ...c, logo: png }, Object.entries(j.g)))));
    for (const [g, y] of Object.entries(j.g)) for (const k of ["post", "story"]) fs.writeFileSync(path.join(dir, `${j.slug}-${g}-${k}.svg`), igCard({ ...c, logo: lg }, g, y, k));
    idx[j.slug] = { nm: j.nm, conf: j.conf, d: j.d, label: j.label, upd: c.upd, g: j.g }; n++;
  }
  fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify(idx));
  console.log(`ranking share cards: ${n} schools`);
}
