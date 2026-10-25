/* College standards in high school events (Ryan 2026-10-25: "high school conversion column at the top of every school and
   division table ... 1600m, 3200m, and 300m hurdles"). Same factors as the app (src/standards/app.js CONV / toHS), inverted:
     1600m = 1500m / 0.9314            3200m = 3000m / 0.9314, or 5000m / 1.7186 / 0.9314 (Riegel)
     300m hurdles = 400m hurdles / 1.41 men, / 1.45 women (same hurdle height)      boys 110mH 39" = college 42" time - 0.5 s
   Sprints, 800m, women's 100mH and field events are the same event in high school and college. Official 1600m/3200m/300mH
   marks a school publishes win over a conversion. */
export const HS_EVENTS = g => ["100m", "200m", "400m", "800m", "1600m", "3200m", g === "m" ? "110m Hurdles" : "100m Hurdles", "300m Hurdles", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Javelin"];
export const fmtHS = x => { if (x == null) return ""; if (x < 60) return x.toFixed(2); const m = Math.floor(x / 60), s = Math.round((x - m * 60) * 10) / 10; return s >= 60 ? `${m + 1}:00.0` : `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`; };
export const fmtXC = x => x == null ? "–" : `${Math.floor(x / 60)}:${String((x % 60).toFixed(1)).padStart(4, "0")}`;
/* one level, converted: [high school mark as text, how it was made] */
export function hsLevel(level, e, g, cell, parse) {
  const v = cell == null || cell === "" ? null : parse(String(cell).replace(/ est\.$/, ""), e);
  return v == null ? null : e === "1500m" ? fmtHS(v / 0.9314) : e === "3000m" ? fmtHS(v / 0.9314) : e === "5000m" ? fmtHS(v / 1.7186 / 0.9314)
    : e === "400m Hurdles" ? fmtHS(v / (g === "m" ? 1.41 : 1.45)) : e === "110m Hurdles" ? fmtHS(v - 0.5) : null;
}
/* rows [label, [target, recruit, walk-on], note] for a school or a division, from a std(g, e) -> [t, r, w] getter */
export function hsRows(get, g, parse) {
  const SRC = { "1600m": ["1600m", "1500m"], "3200m": ["3200m", "3000m", "5000m"], "300m Hurdles": ["300m Hurdles", "400m Hurdles"], "110m Hurdles": ["110m Hurdles"] };
  const rows = [];
  for (const hs of HS_EVENTS(g)) {
    const src = SRC[hs] || [hs];
    for (const e of src) {
      const t = get(g, e); if (!t) continue;
      const direct = e === hs && hs !== "110m Hurdles";
      const vals = [0, 1, 2].map(i => { if (t[i] == null || t[i] === "") return ""; if (direct) return String(t[i]); const v = hsLevel(i, e, g, t[i], parse); return v ? v + (/ est\.$/.test(t[i]) ? " est." : "") : ""; });
      if (vals.some(Boolean)) rows.push([hs === "110m Hurdles" ? '110m Hurdles (39")' : hs, vals, direct ? "" : `from the college ${e}`]);
      break;
    }
  }
  return rows;
}
