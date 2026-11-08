// Verified college athletes (Ryan 2026-11-07). Deployed to the track-standards-accounts project as "athlete-claim".
// The signed-in user claims a college athlete page with a school email:
//   start  {tfrrs_id, email}  -> address must be on the athlete's school domain (or a subdomain, never alumni.*); sends a 6-digit code
//   verify {claim_id, code}   -> code right + name in the address matches the athlete (and no teammate shares last name + first
//                                initial) = verified at once; otherwise the claim waits for an admin to check the school directory
//   status {}                 -> the user's latest claim and page settings
// Limits: code valid 10 min, 5 tries, 3 sends per claim per hour, 6 sends per user per day. One verified page per athlete,
// per account and per school email (unique indexes). The school email is never shown publicly. Needs secret RESEND_API_KEY.
import postgres from "npm:postgres@3.4.4";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const ORIGINS = ["https://trackandfieldstandards.com", "https://www.trackandfieldstandards.com", "https://track-standards.vercel.app", "http://localhost:8090", "http://localhost:5173"];

const plain = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z\s-]/g, "").replace(/-/g, " ").split(/\s+/).filter(Boolean);
export function nameMatch(email: string, name: string): boolean {
  const local = email.split("@")[0].toLowerCase().replace(/\+.*$/, "").replace(/[^a-z]/g, "");
  const t = plain(name); if (t.length < 2) return false;
  const first = t[0], lasts = [t[t.length - 1], t.slice(1).join("")];   // "Van Daalen" -> "daalen" or "vandaalen"
  return lasts.some(last => last.length >= 2 && (
    local === first + last || local === last + first || local === first[0] + last || local === last + first[0] ||
    new RegExp(`^${first[0]}[a-z]?${last}$`).test(local) || new RegExp(`^${first}[a-z]?${last}$`).test(local)));
}
export function domainOk(email: string, domains: string): boolean {
  const host = (email.split("@")[1] || "").toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) || /(^|\.)alumni\./.test(host)) return false;
  return domains.split(/\s+/).filter(Boolean).some(d => host === d || host.endsWith("." + d));
}
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
const hash = async (code: string, salt: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + code)));
const code6 = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");

async function sendCode(to: string, code: string, name: string) {
  const key = Deno.env.get("RESEND_API_KEY"); if (!key) return false;
  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:16px;color:#0B0B0F"><p>Your Track Standards code is</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:8px 0">${code}</p>
<p>Enter it on the site to verify that you're ${name}. It works for 10 minutes.</p>
<p style="color:#5A5A63;font-size:14px">Didn't ask for this? Ignore this email and nothing changes.</p></div>`;
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Track Standards <no-reply@trackandfieldstandards.com>", to: [to], subject: `Your code: ${code}`, html }) });
  return r.ok;
}

Deno.serve(async (req) => {
  const o = req.headers.get("origin") || "";
  const cors = { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Vary": "Origin" };
  const out = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const r = await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/user", { headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, Authorization: "Bearer " + token } });
    if (!r.ok) return out({ ok: false, error: "signin" }, 401);
    const u = await r.json();
    if (!u.email_confirmed_at) return out({ ok: false, error: "confirm_account_email" });
    const [prof] = await sql`select id from public.profiles where id = ${u.id}`;
    if (!prof) return out({ ok: false, error: "finish_account" });
    const b = await req.json().catch(() => ({}));

    if (b.action === "status") {
      const [c] = await sql`select c.id, c.status, c.tfrrs_id, a.name, a.team from public.athlete_claims c join public.claimable_athletes a using (tfrrs_id)
                            where c.user_id = ${u.id} order by c.created_at desc limit 1`;
      const [p] = await sql`select * from public.athlete_pages where user_id = ${u.id}`;
      return out({ ok: true, claim: c || null, page: p || null });
    }

    if (b.action === "start") {
      const id = String(b.tfrrs_id || ""), email = String(b.email || "").trim().toLowerCase();
      if (!/^[0-9]{3,12}$/.test(id) || !/^[^\s@]{1,64}@[^\s@]{3,190}$/.test(email)) return out({ ok: false, error: "bad_input" });
      const [a] = await sql`select * from public.claimable_athletes where tfrrs_id = ${id}`;
      if (!a) return out({ ok: false, error: "not_claimable" });
      if (!a.domains || !domainOk(email, a.domains)) return out({ ok: false, error: "wrong_domain", domains: a.domains });
      const [taken] = await sql`select 1 from public.athlete_claims where tfrrs_id = ${id} and status = 'verified' and user_id <> ${u.id}`;
      if (taken) return out({ ok: false, error: "already_verified" });
      const [mine] = await sql`select tfrrs_id, status from public.athlete_claims where user_id = ${u.id} and status in ('verified','pending_review')`;
      if (mine) return out({ ok: false, error: mine.status === "verified" ? "you_are_verified" : "pending_review" });
      const [day] = await sql`select coalesce(sum(sends),0)::int n from public.athlete_claims where user_id = ${u.id} and created_at > now() - interval '1 day'`;
      if (day.n >= 6) return out({ ok: false, error: "too_many" });
      let [c] = await sql`select * from public.athlete_claims where user_id = ${u.id} and tfrrs_id = ${id} and lower(school_email) = ${email} and status = 'code_sent' order by created_at desc limit 1`;
      if (c && c.last_sent_at && Date.now() - new Date(c.last_sent_at).getTime() < 60_000) return out({ ok: false, error: "wait" });
      if (c && c.sends >= 3 && Date.now() - new Date(c.created_at).getTime() < 3_600_000) return out({ ok: false, error: "too_many" });
      const code = code6(), salt = crypto.randomUUID(), h = salt + "$" + await hash(code, salt);
      const match = nameMatch(email, a.name);
      if (c) [c] = await sql`update public.athlete_claims set code_hash = ${h}, code_expires = now() + interval '10 minutes', attempts = 0, sends = sends + 1, last_sent_at = now(), name_match = ${match} where id = ${c.id} returning id`;
      else [c] = await sql`insert into public.athlete_claims (user_id, tfrrs_id, school_email, name_match, code_hash, code_expires, sends, last_sent_at)
                           values (${u.id}, ${id}, ${email}, ${match}, ${h}, now() + interval '10 minutes', 1, now()) returning id`;
      if (!(await sendCode(email, code, a.name))) return out({ ok: false, error: "email_unavailable" });
      return out({ ok: true, claim_id: c.id });
    }

    if (b.action === "verify") {
      const cid = Number(b.claim_id), code = String(b.code || "");
      if (!Number.isInteger(cid) || !/^[0-9]{6}$/.test(code)) return out({ ok: false, error: "bad_input" });
      const [c] = await sql`select c.*, a.ambiguous from public.athlete_claims c join public.claimable_athletes a using (tfrrs_id) where c.id = ${cid} and c.user_id = ${u.id}`;
      if (!c || c.status !== "code_sent" || !c.code_hash) return out({ ok: false, error: "no_code" });
      if (c.attempts >= 5) return out({ ok: false, error: "too_many" });
      if (new Date(c.code_expires).getTime() < Date.now()) return out({ ok: false, error: "expired" });
      const [salt, want] = String(c.code_hash).split("$");
      if (await hash(code, salt) !== want) {
        await sql`update public.athlete_claims set attempts = attempts + 1 where id = ${cid}`;
        return out({ ok: false, error: "wrong_code", left: 4 - c.attempts });
      }
      const auto = c.name_match && !c.ambiguous;
      try {
        await sql.begin(async (t) => {
          await t`update public.athlete_claims set code_hash = null, code_expires = null, email_ok_at = now(),
                  status = ${auto ? "verified" : "pending_review"}, verified_at = ${auto ? new Date() : null} where id = ${cid}`;
          if (auto) await t`insert into public.athlete_pages (user_id, tfrrs_id) values (${u.id}, ${c.tfrrs_id}) on conflict (user_id) do nothing`;
        });
      } catch (_) { return out({ ok: false, error: "already_verified" }); }   // unique index: someone else holds it, or this email/account already used
      return out({ ok: true, status: auto ? "verified" : "pending_review" });
    }
    return out({ ok: false, error: "bad_action" }, 400);
  } catch (_) { return out({ ok: false, error: "server" }, 500); }
});
