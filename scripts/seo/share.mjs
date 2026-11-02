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

/* Leaderboard cards (Ryan 2026-11-02: "it needs to show like the top 10 list ... the whole list ... better for social media and incentive
   post"). The division's top 10 with logos, the school's own row lit up in white; a school outside the top 10 gets the top 7, a gap and
   its own spot with the teams either side. L = { d, g, label, upd, items: [{ rank, nm, conf, ovr, logo, col, me } | { gap: true }] } */
const BG = "#0E0D15", ROW = "#1A1926", SUB = "#9A99AB", MEDAL = { 1: "#FFD66B", 2: "#DCDFE8", 3: "#E8A877" };
export function pick(rows, rank, n = 10) {
  if (!rank || rank <= n) return rows.slice(0, n);
  const i = rows.findIndex(r => r.rank === rank), a = Math.max(n - 3, Math.min(i - 1, rows.length - 3));
  return [...rows.slice(0, n - 3), { gap: true }, ...rows.slice(a, a + 3)];
}
const circle = (X, Y, z, t) => `<circle cx="${X + z / 2}" cy="${Y + z / 2}" r="${z / 2}" fill="#fff"/>`
  + (t.logo ? `<image href="${x(t.logo)}" x="${X + z * 0.16}" y="${Y + z * 0.16}" width="${z * 0.68}" height="${z * 0.68}" preserveAspectRatio="xMidYMid meet"/>`
    : `<circle cx="${X + z / 2}" cy="${Y + z / 2}" r="${z * 0.4}" fill="${x(t.col || PURPLE)}"/><text x="${X + z / 2}" y="${Y + z * 0.64}" ${font} font-size="${z * 0.38}" font-weight="900" text-anchor="middle" fill="#fff">${x(t.nm[0])}</text>`);
/* one leaderboard row; s = scale (post 1, story 1.08, preview 0.56) */
function row(t, X, Y, W, h, s, id) {
  if (t.gap) return `<g fill="${SUB}">${[0, 1, 2].map(k => `<circle cx="${X + 46 * s + k * 16 * s}" cy="${Y + h / 2}" r="${4 * s}"/>`).join("")}</g>`;
  const me = t.me, ink = me ? INK : "#fff", sub = me ? MUTE : SUB, rz = 38 * s, lz = 56 * s, ow = 92 * s;
  const lx = X + 96 * s, nx = lx + lz + 20 * s, nmax = W - (nx - X) - ow - 34 * s, [nm, nz] = fit(t.nm, nmax, 32 * s, 22 * s);
  return `<rect x="${X}" y="${Y}" width="${W}" height="${h}" rx="${h * 0.26}" fill="${me ? "#fff" : ROW}"${me ? ` stroke="${x(t.col || PURPLE)}" stroke-width="${4 * s}"` : ""}/>`
    + (me ? `<rect x="${X}" y="${Y + h * 0.2}" width="${8 * s}" height="${h * 0.6}" rx="${4 * s}" fill="${x(t.col || PURPLE)}"/>` : "")
    + `<text x="${X + 52 * s}" y="${Y + h / 2 + rz * 0.36}" ${font} font-size="${rz}" font-weight="900" text-anchor="middle" letter-spacing="${-rz * 0.03}" fill="${me ? INK : MEDAL[t.rank] || "#fff"}">${t.rank}</text>`
    + (me ? "" : "") + circle(lx, Y + (h - lz) / 2, lz, t).replace('fill="#fff"/>', me ? `fill="#fff" stroke="${LINE}" stroke-width="${2 * s}"/>` : 'fill="#fff"/>')
    + `<text x="${nx}" y="${Y + h / 2 - 2 * s}" ${font} font-size="${nz}" font-weight="800" letter-spacing="${-nz * 0.015}" fill="${ink}">${x(nm)}</text>`
    + `<text x="${nx}" y="${Y + h / 2 + 26 * s}" ${font} font-size="${20 * s}" font-weight="600" fill="${sub}">${x(t.conf || "")}</text>`
    + (t.ovr != null ? ovrTile(X + W - ow - 18 * s, Y + (h - 62 * s) / 2, ow, 62 * s, t.ovr, id) : ""); }
const lb = (L, X, Y, W, h, gap, s) => { let y = Y; return L.items.map((t, i) => { const o = row(t, X, y, t.gap ? W : W, t.gap ? h * 0.42 : h, s, "r" + i); y += (t.gap ? h * 0.42 : h) + gap; return o; }).join(""); };
const top10 = L => !L.items.some(t => t.gap), title = L => `${L.d} ${L.g === "m" ? "Men's" : "Women's"} ${top10(L) ? "Top 10" : "Rankings"}`;
const glow = (W, H) => `<defs><radialGradient id="gl" cx=".5" cy="0" r=".8"><stop offset="0" stop-color="#6C47FF" stop-opacity=".42"/><stop offset="1" stop-color="#6C47FF" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="${BG}"/><rect width="${W}" height="${H * 0.6}" fill="url(#gl)"/>`;

/* Instagram post (1080x1350) or story (1080x1920) */
export function igCard(L, kind = "post") {
  const S = kind === "story", H = S ? 1920 : 1350, top = S ? 250 : 76, X = 64, W = 1080 - 2 * X, s = S ? 1 : 0.94, h = S ? 84 : 80, gp = 10;
  const me = L.items.find(t => t.me), cta = me ? `${me.nm} is #${me.rank}. Where does your team rank?` : "Where does your team rank?";
  const listY = top + (S ? 210 : 196), listH = L.items.reduce((a, t) => a + (t.gap ? h * 0.42 : h) + gp, 0), foot = Math.max(listY + listH + (S ? 40 : 22), S ? 1500 : H - 112);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${H}" viewBox="0 0 1080 ${H}">${glow(1080, H)}`
    + `<text x="${X}" y="${top + 26}" ${font} font-size="24" font-weight="800" letter-spacing="3.8" fill="#A98BFF">TRACK &amp; FIELD POWER RANKINGS</text>`
    + `<text x="${X}" y="${top + 104}" ${font} font-size="${S ? 76 : 70}" font-weight="900" letter-spacing="-2" fill="#fff">${x(title(L))}</text>`
    + `<text x="${X}" y="${top + 152}" ${font} font-size="30" font-weight="600" fill="${SUB}">${x(L.label)} · updated ${x(L.upd)}</text>`
    + lb(L, X, listY, W, h, gp, s)
    + `<text x="${X}" y="${foot + 34}" ${font} font-size="${S ? 34 : 30}" font-weight="800" fill="#fff">${x(fit(cta, W, S ? 34 : 30, 22)[0])}</text>`
    + `<text x="${X}" y="${foot + (S ? 82 : 74)}" ${font} font-size="${S ? 30 : 27}" font-weight="700" fill="#A98BFF">trackandfieldstandards.com</text></svg>`;
}

/* link preview (1200x630): title and the school's spot on the left, the leaderboard on the right */
export function ogCard(L) {
  const me = L.items.find(t => t.me), X = 530, W = 1200 - X - 40, n = L.items.length, h = 46, gp = 5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">${glow(1200, 630)}`
    + `<text x="56" y="86" ${font} font-size="19" font-weight="800" letter-spacing="3" fill="#A98BFF">TRACK &amp; FIELD POWER RANKINGS</text>`
    + `<text x="56" y="152" ${font} font-size="50" font-weight="900" letter-spacing="-1.4" fill="#fff">${x(L.d)}</text><text x="56" y="210" ${font} font-size="50" font-weight="900" letter-spacing="-1.4" fill="#fff">${L.g === "m" ? "Men's" : "Women's"} ${top10(L) ? "Top 10" : "Rankings"}</text>`
    + `<text x="56" y="252" ${font} font-size="24" font-weight="600" fill="${SUB}">${x(L.label)} · updated ${x(L.upd)}</text>`
    + (me ? circle(56, 330, 92, me) + `<text x="168" y="368" ${font} font-size="${fit(me.nm, 330, 34, 22)[1]}" font-weight="800" fill="#fff">${x(fit(me.nm, 330, 34, 22)[0])}</text><text x="168" y="414" ${font} font-size="38" font-weight="900" fill="#fff">#${me.rank}<tspan font-size="24" font-weight="600" fill="${SUB}">\u00a0in the nation</tspan></text>` : "")
    + `<text x="56" y="584" ${font} font-size="22" font-weight="700" fill="#A98BFF">trackandfieldstandards.com</text>`
    + lb(L, X, (630 - (n * (h + gp) - gp)) / 2 + (L.items.some(t => t.gap) ? 10 : 0), W, h, gp, 0.56) + `</svg>`;
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
   browser, /share/index.json (what the school view shows, with the same list) and the Inter files the browser embeds when it draws a card */
export async function writeShare(out, jobs) {
  const R = await renderer(), dir = path.join(out, "share"), fdir = path.join(out, "fonts", "share"), SUF = { "NCAA D1": "d1", "NCAA D2": "d2", "NCAA D3": "d3", NAIA: "naia" };
  fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(fdir, { recursive: true });
  for (const [n, b] of R.fonts()) fs.writeFileSync(path.join(fdir, n), b);
  const upd = v => { const d = new Date(String(v || "").slice(0, 10) + "T12:00:00Z"); return isNaN(d) ? String(v || "") : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }); };
  const PW = new Map(), LG = new Map();
  const season = key => { if (!PW.has(key)) { let J = null; try { J = JSON.parse(fs.readFileSync(path.join(out, "data", "power", key + ".json"), "utf8")); } catch { } PW.set(key, J); } return PW.get(key); };
  const pngLogo = async f => { if (!f) return null; if (!LG.has(f)) LG.set(f, await R.logo(path.join(out, f))); return LG.get(f); };
  const idx = {}; let n = 0;
  for (const j of jobs) {
    const key = `${j.label.toLowerCase().replace(" ", "-")}-${SUF[j.d]}`, P = season(key); if (!P) continue;
    const lists = {};
    for (const g of Object.keys(j.g)) {
      const rows = (P[g] || []).map(r => { const t = P.teams[r[0]] || [r[0], "", null, null, null]; return { rank: r[1], nm: t[0], conf: t[1], ovr: r[2], logo: t[3], col: t[4], me: (t[2] || "").endsWith("/" + j.slug) }; });
      if (!rows.some(r => r.me)) continue;
      lists[g] = { d: j.d, g, label: j.label, upd: upd(j.upd), items: pick(rows, j.g[g].rank) };
    }
    const G = Object.keys(lists); if (!G.length) continue;
    const best = G.sort((a, b) => j.g[a].rank - j.g[b].rank)[0], L = lists[best];
    const Lp = { ...L, items: await Promise.all(L.items.map(async t => t.gap ? t : { ...t, logo: await pngLogo(t.logo) })) };
    fs.writeFileSync(path.join(dir, j.slug + ".png"), await R.small(R.png(ogCard(Lp))));
    for (const g of G) for (const k of ["post", "story"]) fs.writeFileSync(path.join(dir, `${j.slug}-${g}-${k}.svg`), igCard(lists[g], k));
    idx[j.slug] = { nm: j.nm, conf: j.conf, d: j.d, label: j.label, upd: upd(j.upd), g: Object.fromEntries(G.map(g => [g, { ...j.g[g], list: lists[g].items.map(t => t.gap ? 0 : [t.rank, t.nm, t.ovr, t.me ? 1 : 0]) }])) }; n++;
  }
  fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify(idx));
  console.log(`ranking share cards: ${n} schools`);
}
