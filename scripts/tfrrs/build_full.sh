#!/bin/bash
# Full-depth results (Ryan 2026-10-22: "everything should be in there from every year back until 2016").
# Rebuilds public/data/rank/<year>-*.dat for the given years from the full-depth TFRRS lists (social/standards/tfrrs/lists_full,
# scrape_lists.py --full): national lists keep every athlete, conference/region lists their top 100 (CONF_CAP). Other years'
# files are left as they are. Then refreshes rank_index.json and the wind-legal bests.
# Usage: scripts/tfrrs/build_full.sh 2026 2025
set -e
SITE="$(cd "$(dirname "$0")/../.." && pwd)"; TF="$SITE/../../social/standards/tfrrs"
TMP="$(mktemp -d)"; mkdir -p "$TMP/src" "$TMP/out"
for y in "$@"; do ln -s "$TF/lists_full/$y" "$TMP/src/$y"; done
CONF_CAP=100 TFRRS_LISTS="$TMP/src" TFRRS_CHAMPS="$TF/champs" RANK_OUT="$TMP/out" python3 "$SITE/scripts/tfrrs/build_rank.py" | tail -3
for f in "$TMP"/out/*.json; do b=$(basename "$f" .json); [ "$b" = rank_index ] && continue; gzip -9 -c "$f" > "$SITE/public/data/rank/$b.dat"; done
python3 - "$SITE/public/data/rank_index.json" "$TMP/out/rank_index.json" <<'PY'
import json, sys
cur, new = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
nk = {x["key"]: x for x in new}
out = [nk.pop(x["key"], x) for x in cur] + list(nk.values())
json.dump(out, open(sys.argv[1], "w")); print(len(nk), "new keys,", len(new), "rebuilt")
PY
python3 "$SITE/scripts/tfrrs/build_legal.py" | tail -1
rm -rf "$TMP"
