# Handoff: FIFA 2026 Round of 32 Interactive Map

## Overview

A full-screen interactive world map visualising all 32 nations that reached the Round of 32 at FIFA World Cup 2026. Countries are colour-coded by squad market value, clickable to open a side panel with group-stage results, Round of 32 match, W/D/L record, squad value bar, top 3 players by value, and five country-fact categories.

---

## About the Design File

`FIFA 2026 Round of 32 Standalone.html` is a self-unpacking bundle exported from Claude Design's "Download Standalone HTML" feature. It embeds everything required to render (fonts, and the component runtime the app is written against) as inline data blobs, unpacked by a small bootstrap script on load. It fetches three things live over the network: the world-atlas TopoJSON geometry, per-country flag images, and — as of this pass — `data.json` (see "Updating Data" below). None of these are bundled resources; they're genuine external/sibling-file fetches, so they work from any host that serves both files together.

An earlier version of this file (without that bundling) depended on a `support.js` runtime that was never actually shipped alongside it, so it could only render inside the Claude Design preview tool, never in a plain browser or when deployed. That version has been removed from this repo — it was dead weight once this Standalone export replaced it. If you need it, it's still in git history (see commits before the "Add genuinely standalone build" commit).

---

## Deployment

Live on GitHub Pages at the repo root — a tiny `index.html` redirect points to the actual design file, so both URLs work:

**https://sapnasudhir.github.io/learn-fifa-countries/**
**https://sapnasudhir.github.io/learn-fifa-countries/FIFA%202026%20Round%20of%2032%20Standalone.html**

A `.nojekyll` file disables GitHub Pages' default Jekyll processing (which would otherwise render `README.md` itself as the homepage instead of the redirect).

To update: re-download a fresh Standalone export from Claude Design (see "Updating Data" below for why a hand-edit isn't practical), replace `FIFA 2026 Round of 32 Standalone.html`, commit, and push to `main` — GitHub Pages redeploys automatically. The redirect `index.html` doesn't need to change.

---

## Fidelity

**High-fidelity.** Colours, typography, spacing, interactions, and animations are final. Do not restyle — replicate exactly.

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

## Updating Data

`TEAMS` and `ISO_MAP` have been extracted out of the bundled template into a sibling `data.json` file. The embedded app now fetches it in `componentDidMount()` (alongside the existing world-atlas fetch) instead of holding the data as inline class fields — both files must be served together (same directory) for the map to render; opening the HTML file directly via `file://` won't work (fetch requires a real HTTP origin — use `python -m http.server` or GitHub Pages).

To hand-edit match data now: edit `data.json` directly. It's plain JSON — `{"TEAMS": {...}, "ISO_MAP": {...}}` — keyed the same way as before (3-letter team codes, numeric TopoJSON IDs), just with quoted keys/strings instead of the original JS object-literal syntax.

**Live updates:** a scheduled GitHub Actions workflow (`.github/workflows/update-data.yml`) polls the football-data.org API and rewrites `data.json` automatically, merging in only the fields that actually change during the tournament — `w`/`d`/`l`, `gf`/`ga`, `games`, `r32Game`, and `status`. Squad value, top players, and country facts are not covered by that API and stay hand-curated in `data.json`. See the workflow file and its update script for the exact mapping; it requires a `FOOTBALL_DATA_API_KEY` repo secret to run.

If the underlying design itself changes (colors, layout, new interactions — not just match results), the right move is still to go back to Claude Design and re-download a fresh Standalone export, then re-run the same extraction pass to regenerate `data.json` and re-wire the fetch.

---

## Special Cases

### Cape Verde (CPV)
Cape Verde's islands are too small to appear in the 110m world-atlas TopoJSON. The map renders an **explicit SVG circle marker** at coordinates `[-24, 16]` (lon/lat) instead of a country path, wired to the same click/hover/highlight logic.

### England flag
Uses `gb-eng` as the flag code (not `gb`) to load the correct St George's Cross from flagcdn.com.

---

## External Dependencies

| Resource | Used for | How it's loaded |
|---|---|---|
| World Atlas 110m (jsDelivr) | Country geometries | Live fetch at runtime |
| Flag CDN (flagcdn.com) | Country flag images | Live fetch at runtime |
| `data.json` (sibling file, this repo) | Team/match data | Live fetch at runtime |
| D3 v7, TopoJSON client, Google Fonts | Map rendering, zoom, typography | Bundled inline in the Standalone file |

---

## Files in This Package

| File | Purpose |
|---|---|
| `FIFA 2026 Round of 32 Standalone.html` | The app shell — fetches `data.json` at runtime instead of holding match data inline |
| `data.json` | Team/match data (`TEAMS`, `ISO_MAP`) — see "Updating Data" |
| `index.html` | Tiny redirect to the file above, so the root URL works |
| `.nojekyll` | Disables GitHub Pages' Jekyll processing |
| `README.md` | This document |

---

*Generated July 5, 2026 · Source: FIFA · Transfermarkt · General Knowledge*
