/* Pre-build step (Ryan 2026-10-16 coach portal): pull the admin-approved coach standards into public/data/coach-standards.json.
   prerender.mjs merges them into the schools as official, staff-verified standards. If the portal can't be reached, the last
   saved file is kept so a network hiccup never wipes published standards. */
import fs from "node:fs";
const F = "public/data/coach-standards.json";
try {
  const r = await fetch("https://airqmzyuxyyiqjaocwmk.supabase.co/functions/v1/portal/public/standards", { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json(); if (!Array.isArray(j)) throw new Error("bad feed");
  fs.writeFileSync(F, JSON.stringify(j)); console.log(`coach standards: ${j.length} approved schools`);
} catch (e) { console.warn("coach standards feed unavailable, keeping last file:", e.message); if (!fs.existsSync(F)) fs.writeFileSync(F, "[]"); }
