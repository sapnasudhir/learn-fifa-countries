# Handoff: FIFA 2026 Round of 32 Interactive Map

## Overview

A full-screen interactive world map visualising all 32 nations that reached the Round of 32 at FIFA World Cup 2026. Countries are colour-coded by squad market value, clickable to open a side panel with group-stage results, Round of 32 match, W/D/L record, squad value bar, top 3 players by value, and five country-fact categories.

Built as a single self-contained HTML file using **D3 v7** (map rendering, zoom/pan) and **TopoJSON** (world-atlas 110m geometry). No framework, no build step — works as a plain static file.

---

## About the Design Files

`FIFA 2026 Round of 32.html` (in this folder) is a **high-fidelity design reference** — it is the production-ready file. Match data now lives in the sibling `data.json` file (see **Option 2**, done below) and is loaded via `fetch('./data.json')` at startup — the HTML no longer has any hardcoded team data.

**The immediate next task (Option 3)** is to automate `data.json` updates with a GitHub Actions workflow, and deploy the pair to GitHub Pages or Vercel so `fetch` actually resolves (see caveat in Option 2, Step 3).

---

## Fidelity

**High-fidelity.** Colours, typography, spacing, interactions, and animations are final. Do not restyle — replicate exactly.

---

## Architecture

```
project/
├── FIFA 2026 Round of 32.html   ← the design file (rename to index.html on deploy)
├── data.json                    ← DONE — all match/team data, fetched at startup
└── .github/
    └── workflows/
        └── update-data.yml      ← TO BE CREATED (Option 3)
```

---

## Design Tokens

| Token | Value |
|---|---|
| Background | `#06090f` |
| Map ocean | `#0c1828` |
| Country (non-qualifier) | `#101e30` |
| Gold accent | `#f0b840` |
| Tier 1 fill (≥€500M) | `#f0b840` |
| Tier 2 fill (≥€200M) | `#d07c10` |
| Tier 3 fill (≥€100M) | `#a85c18` |
| Tier 4 fill (<€100M) | `#6e3e18` |
| Selected country | `#ffd700` |
| Win green | `#4ade80` |
| Draw yellow | `#facc15` |
| Loss red | `#f87171` |
| Font primary | Barlow Condensed (Google Fonts) |
| Font secondary | Barlow (Google Fonts) |

---

## Option 2 — Extract Data to `data.json` (DONE)

`data.json` has been created and the HTML now fetches it at startup instead of hardcoding `TEAMS`/`ISO_MAP`. Schema reference, for anyone editing match results:

```jsonc
{
  "meta": {
    "lastUpdated": "2026-07-05T00:00:00Z",
    "highestSquadValueM": 1520,
    "highestSquadValueLabel": "France €1.52B"
  },
  "teams": {
    "ARG": {
      "name": "Argentina",
      "flag": "🇦🇷",
      "iso2": "ar",
      "group": "J",
      "pos": "1st",
      "w": 3, "d": 0, "l": 0,
      "gf": 8, "ga": 0,
      "val": 807,
      "vLabel": "€807M",
      "status": "R16",
      "games": [
        { "opp": "Algeria",  "gf": 3, "ga": 0 },
        { "opp": "Austria",  "gf": 2, "ga": 0 },
        { "opp": "Jordan",   "gf": 3, "ga": 1 }
      ],
      "r32Game": { "opp": "Cape Verde", "gf": 3, "ga": 2, "note": "AET" },
      "players": [
        { "name": "Enzo Fernández",  "club": "Chelsea",      "val": "€100M" },
        { "name": "Julián Álvarez",  "club": "Atl. Madrid",  "val": "€80M"  },
        { "name": "Lionel Messi",    "club": "Inter Miami",  "val": "€15M"  }
      ],
      "facts": {
        "capital":  "Buenos Aires",
        "geo":      "Patagonia region & the Andes span the country from south to north",
        "history":  "Independence declared 1816; birthplace of Che Guevara & Jorge Luis Borges",
        "society":  "Birthplace of the tango (UNESCO), Nobel Prize literature, and modern football icons",
        "cuisine":  "Asado (wood-fire BBQ), empanadas, dulce de leche & yerba mate"
      }
    }
    // ... repeat for all 32 teams
  },
  "isoMap": {
    "12":  "DZA", "32":  "ARG", "36":  "AUS", "40":  "AUT",
    "56":  "BEL", "70":  "BIH", "76":  "BRA", "124": "CAN",
    "132": "CPV", "170": "COL", "180": "COD", "191": "CRO",
    "218": "ECU", "818": "EGY", "250": "FRA", "276": "GER",
    "288": "GHA", "384": "CIV", "392": "JPN", "484": "MEX",
    "504": "MAR", "528": "NED", "578": "NOR", "600": "PAR",
    "620": "POR", "686": "SEN", "710": "ZAF", "724": "ESP",
    "752": "SWE", "756": "SUI", "826": "ENG", "840": "USA"
  }
}
```

**Key fields:**
- `status`: `"R16"` = advanced to Round of 16 · `"OUT"` = eliminated
- `val`: squad market value in millions EUR (integer) — used for tier colouring and bar chart
- `pos`: group finish — `"1st"` | `"2nd"` | `"3rd"`
- `r32Game.note`: optional string for `"AET"` (after extra time) or `"4–2 pens"` (penalty shootout)
- `meta.highestSquadValueM`: update this if France's value changes — it sets the 100% bar reference

### How the HTML loads it

`componentDidMount` now does:

```js
componentDidMount() {
  const self = this;
  Promise.all([
    fetch('./data.json').then(r => r.json()),
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
  ]).then(([data, world]) => {
    self.TEAMS  = data.teams;
    self.ISO_MAP = Object.fromEntries(
      Object.entries(data.isoMap).map(([k, v]) => [+k, v])
    );
    self.META   = data.meta;
    self.worldData = world;
    self.renderMap();
  });

  this._onResize = () => { if (this.worldData) this.renderMap(); };
  window.addEventListener('resize', this._onResize);
}
```

The squad-value bar reference uses `self.META.highestSquadValueM` instead of a hardcoded `1520`, and the footer label (`{{ highestValueLine }}`) reads `self.META.highestSquadValueLabel`.

### Step 3: Deploy to GitHub Pages or Vercel

**Note:** `fetch('./data.json')` requires the page be served over HTTP — opening the HTML directly via `file://` will fail due to browser CORS restrictions. Use a local dev server to test, or deploy:

- Push `index.html` + `data.json` to a GitHub repo
- GitHub Pages: Settings → Pages → Deploy from main branch root
- Vercel: Import repo, framework = "Other", root = `/`

**To update results:** edit `data.json`, commit, push. Both platforms auto-deploy in ~30 seconds.

---

## Option 3 — GitHub Actions Auto-Update

Once Option 2 is live, add automated data refresh using the **football-data.org** free API (covers FIFA World Cup).

### Register for a free API key

Sign up at https://www.football-data.org — the free tier includes World Cup competition data (competition ID `2000`).

### GitHub Actions workflow

Create `.github/workflows/update-data.yml`:

```yaml
name: Update FIFA 2026 match data

on:
  schedule:
    - cron: '*/30 * * * *'   # every 30 minutes during the tournament
  workflow_dispatch:          # allow manual trigger from GitHub UI

jobs:
  update:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - name: Fetch latest match data
        env:
          FD_API_KEY: ${{ secrets.FOOTBALL_DATA_API_KEY }}
        run: |
          python3 scripts/build_data.py

      - name: Commit updated data.json if changed
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data.json
          git diff --cached --quiet || git commit -m "chore: update match data $(date -u +%Y-%m-%dT%H:%M:%SZ)"
          git push
```

### Add your API key as a secret

GitHub repo → Settings → Secrets and variables → Actions → New repository secret  
Name: `FOOTBALL_DATA_API_KEY`, Value: your key from football-data.org

### Python build script

Create `scripts/build_data.py`. This fetches live results and merges them into `data.json`, preserving the `facts`, `players`, `val`, and `iso2` fields that the API doesn't provide:

```python
#!/usr/bin/env python3
"""
Fetches FIFA World Cup 2026 results from football-data.org
and merges them into data.json, updating only match results.
"""
import json, os, urllib.request, datetime

API_KEY = os.environ["FD_API_KEY"]
COMPETITION_ID = 2000   # FIFA World Cup at football-data.org

def fetch(path):
    req = urllib.request.Request(
        f"https://api.football-data.org/v4/{path}",
        headers={"X-Auth-Token": API_KEY}
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

# Load existing data.json (preserves facts, players, val, iso2 etc.)
with open("data.json") as f:
    data = json.load(f)

teams = data["teams"]

# --- Fetch standings (group stage W/D/L/GF/GA/pos) ---
standings = fetch(f"competitions/{COMPETITION_ID}/standings")
for group_obj in standings["standings"]:
    group_letter = group_obj["group"].replace("Group ", "")
    for entry in group_obj["table"]:
        tla = entry["team"]["tla"]           # 3-letter code
        if tla not in teams:
            continue
        t = teams[tla]
        t["w"]   = entry["won"]
        t["d"]   = entry["draw"]
        t["l"]   = entry["lost"]
        t["gf"]  = entry["goalsFor"]
        t["ga"]  = entry["goalsAgainst"]
        t["group"] = group_letter
        # pos: 1st/2nd/3rd based on table position
        pos_map = {1: "1st", 2: "2nd", 3: "3rd"}
        t["pos"] = pos_map.get(entry["position"], str(entry["position"]))

# --- Fetch matches (group stage + R32 scores) ---
matches = fetch(f"competitions/{COMPETITION_ID}/matches")
for m in matches["matches"]:
    if m["status"] != "FINISHED":
        continue
    stage = m["stage"]          # GROUP_STAGE or LAST_32
    home_tla = m["homeTeam"]["tla"]
    away_tla = m["awayTeam"]["tla"]
    home_score = m["score"]["fullTime"]["home"]
    away_score = m["score"]["fullTime"]["away"]
    note = ""
    if m["score"].get("winner") and m["score"]["duration"] == "EXTRA_TIME":
        note = "AET"
    elif m["score"]["duration"] == "PENALTY_SHOOTOUT":
        pen_h = m["score"]["penalties"]["home"]
        pen_a = m["score"]["penalties"]["away"]
        winner_tla = home_tla if pen_h > pen_a else away_tla
        # encode as e.g. "3–1 pens" from winner's perspective later
        note = f"{max(pen_h,pen_a)}–{min(pen_h,pen_a)} pens"

    for tla, opp_tla, gf, ga in [
        (home_tla, away_tla, home_score, away_score),
        (away_tla, home_tla, away_score, home_score),
    ]:
        if tla not in teams:
            continue
        t = teams[tla]
        opp_name = matches  # resolve via teams dict if needed
        opp_display = teams[opp_tla]["name"] if opp_tla in teams else opp_tla

        if stage == "GROUP_STAGE":
            # Update matching game entry by opponent name
            for g in t.get("games", []):
                if g["opp"] == opp_display or g["opp"] == opp_tla:
                    g["gf"] = gf
                    g["ga"] = ga
        elif stage == "LAST_32":
            t["r32Game"] = {"opp": opp_display, "gf": gf, "ga": ga}
            if note:
                t["r32Game"]["note"] = note
            # Determine status
            advanced = (gf > ga) or (note == "AET" and gf >= ga) or \
                       ("pens" in note and teams.get(opp_tla, {}).get("status") != "R16")
            t["status"] = "R16" if advanced else "OUT"

data["meta"]["lastUpdated"] = datetime.datetime.utcnow().isoformat() + "Z"

with open("data.json", "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("data.json updated:", data["meta"]["lastUpdated"])
```

> **Note:** football-data.org uses 3-letter TLA codes that may differ from the keys in `data.json` (e.g. `CPV` vs `CV`). Add a `tlaMap` dict in the script to normalise any mismatches after your first test run.

### Cron schedule recommendation

- **During group stage / knockout rounds:** `*/30 * * * *` (every 30 min)
- **Off-season / between matchdays:** `0 */6 * * *` (every 6 hours) to stay within free-tier rate limits

---

## Special Cases

### Cape Verde (CPV)
Cape Verde's islands are too small to appear in the 110m world-atlas TopoJSON. The HTML renders an **explicit SVG circle marker** at coordinates `[-24, 16]` (lon/lat) instead of a country path. This marker is already wired to the same click/hover/highlight logic. No changes needed for data updates — just keep `"CPV"` as the key in `data.json`.

### England flag
Uses `gb-eng` as `iso2` (not `gb`) to load the correct St George's Cross from flagcdn.com.

---

## External Dependencies

| Resource | URL | Used for |
|---|---|---|
| D3 v7 | `https://d3js.org/d3.v7.min.js` | Map rendering, zoom, DOM |
| TopoJSON client | `https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js` | Decoding world atlas |
| World Atlas 110m | `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json` | Country geometries |
| Flag CDN | `https://flagcdn.com/w160/{iso2}.png` | Country flags |
| Google Fonts | Barlow Condensed + Barlow | Typography |

All loaded at runtime — no npm, no bundler.

---

## Files in This Package

| File | Purpose |
|---|---|
| `FIFA 2026 Round of 32.html` | Production-ready HTML — the complete app (fetches data from `data.json`) |
| `data.json` | All match/team data — edit this to update results |
| `README.md` | This document |

---

*Generated July 5, 2026 · Source: FIFA · Transfermarkt · General Knowledge*
