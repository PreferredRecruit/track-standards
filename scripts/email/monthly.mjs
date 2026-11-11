#!/usr/bin/env node
/* Monthly standards update (Ryan 2026-11-08): an educational newsletter for parents who opted in, one a month.
   Content is written each month in scripts/email/issues/<yyyy-mm>.json and approved by Ryan before any send. The only personal
   part is the soft line at the end ("If you're looking to get Jordan a little extra help..."), built from the athlete's best mark.

   node scripts/email/monthly.mjs <yyyy-mm> --preview            write a sample HTML to the scratch dir, send nothing
   node scripts/email/monthly.mjs <yyyy-mm> --test you@x.com     send the sample (made-up athlete) to one address
   node scripts/email/monthly.mjs <yyyy-mm> --send               send to every opted-in parent (needs the service key)

   Rules: parents with email_updates = true only (the database forces athletes off), skipped if emailed in the last 25 days,
   email_last_sent_at stamped after each send, one-click unsubscribe link + List-Unsubscribe header, postal address in the footer.
   Keys come from the vault (~/.config/pr-secrets): resend-standards.env (RESEND_API_KEY) and, for --send only,
   standards-accounts.env (SUPABASE_SERVICE_ROLE_KEY for project vtbrenadwivmiursebfp). Never printed. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const SITE = "https://trackandfieldstandards.com", DB_URL = "https://vtbrenadwivmiursebfp.supabase.co";
const FROM = "Ryan Searl, Preferred Recruit <updates@trackandfieldstandards.com>", REPLY_TO = "ryanapsearl@gmail.com";
const ADDRESS = "Ryan Searl LLC, doing business as Preferred Recruit · 30 N Gould St, Ste R, Sheridan, WY 82801";
const FUNNEL = "https://app.thepreferredrecruit.com/parentfunnel/";
const FIELD = new Set(["High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Javelin", "Hammer"]);

const [issueId, ...args] = process.argv.slice(2);
const flag = (k) => args.includes(k), val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
if (!/^\d{4}-\d{2}$/.test(issueId || "")) { console.error("usage: monthly.mjs <yyyy-mm> --preview | --test <email> | --send"); process.exit(1); }
const ISSUE = JSON.parse(fs.readFileSync(path.join(HERE, "issues", issueId + ".json"), "utf8"));

function vault(file, key) {
  const p = path.join(os.homedir(), ".config/pr-secrets", file);
  if (!fs.existsSync(p)) return null;
  const line = fs.readFileSync(p, "utf8").split("\n").find((l) => l.startsWith(key + "="));
  return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : null;
}

/* fits: same thresholds as the finder embed (dist/embed-data.json, high school units) */
const EMB = JSON.parse(fs.readFileSync(path.join(ROOT, "dist/embed-data.json"), "utf8"));
function fits(g, e, v) {
  const f = FIELD.has(e), ok = (t) => t != null && (f ? v >= t - 1e-9 : v <= t + 1e-9);
  let n = 0; for (const [, t, rc, w, k] of EMB.ev[g + "|" + e] || []) if (ok(t) || ok(rc) || ok(w)) n += k;
  return n;
}
function fmtMark(e, v) {
  if (FIELD.has(e)) { const q = Math.floor((v / 0.0254) * 4) / 4, ft = Math.floor(q / 12), inch = q - ft * 12; return `${ft}' ${String(+inch.toFixed(2))}"`; }
  if (v < 60) return v.toFixed(2);
  const m = Math.floor(v / 60), s = v - m * 60; return `${m}:${s < 10 ? "0" : ""}${s.toFixed(2)}`;
}
const evName = (e) => e.replace(' (39")', "").replace(/^(\d+m)$/, "$1").replace(/Hurdles/, "hurdles").replace(/^(High|Long|Triple) Jump$/, (x) => x.toLowerCase()).replace(/^(Pole Vault|Shot Put|Discus|Javelin|Hammer)$/, (x) => x.toLowerCase());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* the soft line: best event = the one that fits the most programs */
function softLine(kid) {
  const best = (kid && kid.marks || []).map((m) => ({ ...m, n: fits(kid.gender || "m", m.event, +m.mark) })).sort((a, b) => b.n - a.n)[0];
  const u = new URL(FUNNEL);
  for (const [k, v] of [["utm_source", "email"], ["utm_medium", "newsletter"], ["utm_campaign", "standards-update"], ["utm_content", ISSUE.issue]]) u.searchParams.set(k, v);
  if (!best || !best.n) return `<p>If you're looking for a little extra help with recruiting, our team does free evaluations. <a href="${esc(u)}">Learn more</a></p>`;
  u.searchParams.set("utm_term", best.event); u.searchParams.set("pr_mark", fmtMark(best.event, +best.mark));
  const nm = esc(kid.first_name);
  return `<p>If you're looking to get ${nm} a little extra help, we noticed ${nm}'s ${esc(fmtMark(best.event, +best.mark))} in the ${esc(evName(best.event))} already fits ${best.n.toLocaleString()} college programs. <a href="${esc(u)}">See which schools</a></p>`;
}

function render(r) {
  const unsub = `${SITE}/unsubscribe.html?t=${r.token}`;
  const hi = r.parent_first ? `Hi ${esc(r.parent_first)},` : "Hi,";
  const sec = ISSUE.sections.map((s) => `<h2 style="font-size:18px;line-height:1.3;margin:28px 0 8px;color:#0B0B0F">${esc(s.h)}</h2>${s.html}`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(ISSUE.subject)}</title></head>
<body style="margin:0;background:#F6F5FA"><span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(ISSUE.preview)}</span>
<div style="max-width:600px;margin:0 auto;padding:28px 20px;font:16px/1.6 -apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#2E2E36">
<div style="background:#fff;border-radius:16px;padding:28px 24px">
<p style="margin:0 0 4px;font-size:13px;color:#6B6B75">The monthly standards update · ${esc(new Date(issueId + "-15").toLocaleString("en-US", { month: "long", year: "numeric" }))}</p>
<p>${hi}</p><p>${esc(ISSUE.intro)}</p>${sec}
<hr style="border:0;border-top:1px solid #E4E3EA;margin:28px 0">${softLine(r.kid)}
<p style="margin-top:20px">Ryan Searl<br>Preferred Recruit</p></div>
<p style="font-size:12px;color:#6B6B75;margin:18px 4px 0">You're getting this because you signed up for the monthly standards update on <a style="color:#6B6B75" href="${SITE}/">trackandfieldstandards.com</a>. <a style="color:#6B6B75" href="${unsub}">Unsubscribe</a>.<br>${esc(ADDRESS)}</p>
</div></body></html>`.replace(/<a href=/g, '<a style="color:#7A45F0" href=');
  return { html, unsub };
}

async function send(to, r) {
  const key = vault("resend-standards.env", "RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY missing in resend-standards.env");
  const { html, unsub } = render(r);
  const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject: ISSUE.subject, html, headers: { "List-Unsubscribe": `<${unsub}>` } }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Resend " + res.status + " " + (j.message || ""));
  return j.id;
}

const SAMPLE = { parent_first: "Sarah", token: "00000000-0000-0000-0000-000000000000", kid: { first_name: "Jordan", gender: "m", marks: [{ event: '110m Hurdles (39")', mark: 14.05 }] } };

if (flag("--preview")) {
  const out = path.join(os.tmpdir(), `standards-update-${issueId}.html`);
  fs.writeFileSync(out, render(SAMPLE).html); console.log("preview:", out);
} else if (flag("--test")) {
  const to = val("--test"); if (!/^\S+@\S+\.\S+$/.test(to || "")) throw new Error("--test needs an email address");
  console.log("test sent, id", await send(to, SAMPLE));
} else if (flag("--send")) {
  const sk = vault("standards-accounts.env", "SUPABASE_SERVICE_ROLE_KEY");
  if (!sk) { console.error("Missing SUPABASE_SERVICE_ROLE_KEY in ~/.config/pr-secrets/standards-accounts.env"); process.exit(1); }
  const H = { apikey: sk, Authorization: "Bearer " + sk };
  const get = async (q) => { const r = await fetch(DB_URL + "/rest/v1/" + q, { headers: H }); if (!r.ok) throw new Error("db " + r.status); return r.json(); };
  const cutoff = new Date(Date.now() - 25 * 864e5).toISOString();
  const ps = [];   /* the API returns at most 1,000 rows per request: page through every opted-in parent */
  for (let off = 0; ; off += 1000) { const pg = await get(`profiles?select=id,first_name,email_token,email_last_sent_at&role=eq.parent&email_updates=is.true&order=id&limit=1000&offset=${off}`); ps.push(...pg); if (pg.length < 1000) break; }
  let sent = 0, skipped = 0;
  for (const p of ps) {
    if (p.email_last_sent_at && p.email_last_sent_at > cutoff) { skipped++; continue; }
    const [u] = await fetch(`${DB_URL}/auth/v1/admin/users/${p.id}`, { headers: H }).then((r) => r.json()).then((x) => [x]);
    if (!u || !u.email) { skipped++; continue; }
    const ks = await get(`athletes?select=id,first_name,gender&parent_id=eq.${p.id}&order=created_at`);
    const ms = await get(`marks?select=event,mark,athlete_id&user_id=eq.${p.id}`);
    const kids = ks.map((k) => ({ ...k, marks: ms.filter((m) => m.athlete_id === k.id) })).filter((k) => k.marks.length);
    await send(u.email, { parent_first: p.first_name, token: p.email_token, kid: kids[0] || null });
    await fetch(`${DB_URL}/rest/v1/profiles?id=eq.${p.id}`, { method: "PATCH", headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ email_last_sent_at: new Date().toISOString() }) });
    sent++;
  }
  console.log(`sent ${sent}, skipped ${skipped} (emailed in the last 25 days or no email), opted in ${ps.length}`);
} else console.error("pick --preview, --test <email> or --send");
