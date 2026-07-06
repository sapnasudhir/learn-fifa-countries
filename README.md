# Handoff: FIFA 2026 Round of 32 Interactive Map

## Overview

A full-screen interactive world map visualising all 32 nations that reached the Round of 32 at FIFA World Cup 2026. Countries are colour-coded by **qualification stage reached** (Round of 32 exit → Round of 16 → Quarterfinal → Semifinal → Final/Champion), clickable to open a side panel with group-stage results, full knockout-stage progression, W/D/L record, squad value bar with a star rating, top 3 players by value, and five country-fact categories.

Visual identity is a playful "sticker album" theme aimed at younger readers — turf-green/gold/pink/sky palette, emoji stamps on results (✅/🤝/❌), star ratings, and sticker-style chrome (dashed borders, a peel-corner accent on the side panel, perforated-looking section dividers).

---

## About the Design File

`FIFA 2026 Round of 32 Standalone.html` is a self-unpacking bundle exported from Claude Design's "Download Standalone HTML" feature. It embeds everything required to render (fonts, and the component runtime the app is written against) as inline data blobs, unpacked by a small bootstrap script on load. It fetches three things live over the network: the world-atlas TopoJSON geometry, per-country flag images, and `data.json` (see "Updating Data" below). None of these are bundled resources; they're genuine external/sibling-file fetches, so they work from any host that serves both files together.

An earlier version of this file (without that bundling) depended on a `support.js` runtime that was never actually shipped alongside it, so it could only render inside the Claude Design preview tool, never in a plain browser or when deployed. That version has been removed from this repo — it was dead weight once this Standalone export replaced it. If you need it, it's still in git history (see commits before the "Add genuinely standalone build" commit).

**Editing the bundle directly:** the app's markup/CSS/JS lives inside a `<script type="__bundler/template">` tag as a JSON-encoded string (fonts and other binary assets live in a sibling `<script type="__bundler/manifest">` tag, keyed by UUID). To hand-edit visual/logic changes without re-exporting from Claude Design: `json.loads()` the template tag's text content to get the real decoded HTML/JS, edit the decoded text, `json.dumps()` it back, then replace every literal `</` with `<\/` before writing it back — skipping that last step lets a raw `</script` truncate the outer tag early. New fonts or images can be added to the manifest the same way: base64-encode the file, add `{"mime": ..., "compressed": false, "data": "<base64>"}` under a fresh UUID key, then reference that UUID in a `url("<uuid>")` inside the template's CSS. This is how the current sticker-album redesign (including the added Baloo 2 display font) was applied in place.

---

## Deployment

Live on GitHub Pages at the repo root — a tiny `index.html` redirect points to the actual design file, so both URLs work:

**https://sapnasudhir.github.io/learn-fifa-countries/**
**https://sapnasudhir.github.io/learn-fifa-countries/FIFA%202026%20Round%20of%2032%20Standalone.html**

A `.nojekyll` file disables GitHub Pages' default Jekyll processing (which would otherwise render `README.md` itself as the homepage instead of the redirect).

To update the design: either re-download a fresh Standalone export from Claude Design, or hand-edit the bundle in place (see "Editing the bundle directly" above) — commit and push to `main`, GitHub Pages redeploys automatically. The redirect `index.html` doesn't need to change.

---

## Fidelity

The current palette, typography, and interactions reflect a deliberate redesign pass (2026-07-06) — treat *this* version as the high-fidelity baseline going forward. If you're asked to restyle again, that's an intentional, explicit request, not something to do incidentally while fixing something else.

---

## Design Tokens

| Token | Value | Meaning |
|---|---|---|
| Background / map ocean | `#0d1b14` | Base "night pitch" background |
| Country (non-qualifier) | `#16261f` | Countries not in the 32-team dataset |
| Country stroke | `#0f2018` | Border between countries |
| Foil Gold (accent) | `#ffd666` | Header title, buttons, borders, Final tier |

**Map fill — by furthest qualification stage reached** (a team's furthest stage is `eliminatedIn` if `status` is `"OUT"`, otherwise `status` itself):

| Stage | Color |
|---|---|
| Out in Round of 32 | `#3e6b52` (muted moss) |
| Round of 16 | `#5ad0f0` (sky) |
| Quarterfinal | `#ff7fa3` (bubblegum) |
| Semifinal | `#ff8c61` (sunset orange) |
| Final / Champion | `#ffd666` / `#ffee8c` (foil gold) |
| Selected country | `#ffffff` fill, dashed `#ffd666` outline |

**Squad value ramp** (side panel only — value bar, top players, facts accent; kept visually distinct from the stage colors above so the two metrics don't collide):

| Bracket | Color |
|---|---|
| ≥ €500M | `#ffd666` |
| ≥ €200M | `#f0a83d` |
| ≥ €100M | `#c97c2e` |
| < €100M | `#8a5a28` |

**W/D/L**: Win `#3ddc84` (✅), Draw `#ffd666` (🤝), Loss `#ff7fa3` (❌) — color and emoji both encode the result.

**Fonts**: Baloo 2 (hero title, country name — used sparingly for personality), Barlow Condensed (labels, data), Barlow (body copy). All bundled inline; Baloo 2 was added as two new manifest resources (weights 700/800) during the redesign.

---

## Updating Data

`TEAMS` and `ISO_MAP` live in a sibling `data.json` file, fetched by the app in `componentDidMount()` (alongside the world-atlas fetch) instead of being held as inline class fields — both files must be served together (same directory) for the map to render; opening the HTML file directly via `file://` won't work (fetch requires a real HTTP origin — use `python -m http.server` or GitHub Pages).

To hand-edit match data: edit `data.json` directly. It's plain JSON — `{"TEAMS": {...}, "ISO_MAP": {...}}` — keyed the same way as before (3-letter team codes, numeric TopoJSON IDs).

**Knockout progression schema:** each team's bracket results live in a `knockout` array, one entry per stage played so far — `{"stage": "R32"|"R16"|"QF"|"SF"|"F", "opp": ..., "gf": ..., "ga": ..., "note"?: "AET"|"pens"}`, in chronological order. `status` is one of: the stage a team has *advanced to* (`"R16"` means "won Round of 32, now in Round of 16", etc.), `"OUT"` (eliminated — see `eliminatedIn` for which stage), or `"CHAMPION"` (won the Final). The side panel renders the whole `knockout` array as a "KNOCKOUT STAGE" list, so a team eliminated in the Round of 16 shows both its Round-of-32 win and Round-of-16 loss. **The map's fill color is derived from this same `status`/`eliminatedIn` pair** (see Design Tokens above) — don't add a new field for "stage reached," it already exists.

**Live updates:** a scheduled GitHub Actions workflow (`.github/workflows/update-data.yml`) polls the football-data.org API and rewrites `data.json` automatically, merging in only the fields that actually change during the tournament — group-stage `w`/`d`/`l`/`gf`/`ga`/`games`, and the `knockout`/`status`/`eliminatedIn` fields above. Squad value, top players, and country facts are not covered by that API and stay hand-curated in `data.json`. It's scheduled every 2 hours, 11am–9pm CDT, and auto-stops after the July 19 Final. See the workflow file and its update script for the exact mapping; it requires a `FOOTBALL_DATA_API_KEY` repo secret to run.

football-data.org's `stage` values confirmed via live runs: `R32 = LAST_32`, `R16 = LAST_16`, `QF = QUARTER_FINALS`. The SF/F stage names in the script are still unconfirmed guesses (`LAST_4`/`SEMI_FINALS`, `FINAL`) since no matches had reached those rounds yet when last checked — the script logs a per-stage match-count diagnostic on every run specifically so a wrong guess is easy to catch.

---

## Special Cases

### Cape Verde (CPV)
Cape Verde's islands are too small to appear in the 110m world-atlas TopoJSON. The map renders an **explicit SVG circle marker** at coordinates `[-24, 16]` (lon/lat) instead of a country path, wired to the same click/hover/highlight logic and colored the same way (by furthest stage reached) as every other country.

### England flag
Uses `gb-eng` as the flag code (not `gb`) to load the correct St George's Cross from flagcdn.com.

---

## External Dependencies

| Resource | Used for | How it's loaded |
|---|---|---|
| World Atlas 110m (jsDelivr) | Country geometries | Live fetch at runtime |
| Flag CDN (flagcdn.com) | Country flag images | Live fetch at runtime |
| `data.json` (sibling file, this repo) | Team/match data | Live fetch at runtime |
| D3 v7, TopoJSON client, Google Fonts (Barlow, Barlow Condensed, Baloo 2) | Map rendering, zoom, typography | Bundled inline in the Standalone file |

---

## Files in This Package

| File | Purpose |
|---|---|
| `FIFA 2026 Round of 32 Standalone.html` | The app shell — fetches `data.json` at runtime instead of holding match data inline |
| `data.json` | Team/match data (`TEAMS`, `ISO_MAP`) — see "Updating Data" |
| `scripts/update-data.js` | Pulls live scores from football-data.org, merges into `data.json` |
| `.github/workflows/update-data.yml` | Scheduled job that runs the script above and commits `data.json` if it changed |
| `index.html` | Tiny redirect to the Standalone file, so the root URL works |
| `.nojekyll` | Disables GitHub Pages' Jekyll processing |
| `README.md` | This document |

---

*Last updated 2026-07-06 · Source: FIFA · Transfermarkt · General Knowledge*
