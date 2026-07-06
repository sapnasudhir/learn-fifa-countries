# Handoff: FIFA 2026 Round of 32 Interactive Map

## Overview

A full-screen interactive world map visualising all 32 nations that reached the Round of 32 at FIFA World Cup 2026. Countries are colour-coded by squad market value, clickable to open a side panel with group-stage results, Round of 32 match, W/D/L record, squad value bar, top 3 players by value, and five country-fact categories.

---

## About the Design File

`FIFA 2026 Round of 32 Standalone.html` is the **only file this project needs** — a self-unpacking bundle exported from Claude Design's "Download Standalone HTML" feature. It embeds everything required to render (fonts, and the component runtime the app is written against) as inline data blobs, unpacked by a small bootstrap script on load. The only things it still fetches live over the network are the world-atlas TopoJSON geometry and per-country flag images — both genuine external resources, not local files, so they work from any host.

An earlier version of this file (without that bundling) depended on a `support.js` runtime that was never actually shipped alongside it, so it could only render inside the Claude Design preview tool, never in a plain browser or when deployed. That version, and a `data.json` extracted from it, have been removed from this repo — they were dead weight once this Standalone export replaced them. If you need them, they're still in git history (see commits before the "Add genuinely standalone build" commit).

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

Match data (the `TEAMS`/`ISO_MAP` objects — team records, players, facts) lives inline inside the app logic, which itself lives inside a JSON-encoded template string inside the bundle's `script[type="__bundler/template"]` block — not as a plain, directly-editable object at the top of the file like a typical HTML file. Hand-editing it means carefully editing JSON-escaped text inside JSON-escaped text, which is error-prone.

The practical way to update results is to go back to Claude Design, update the design there, and re-download a fresh Standalone export.

**Future option:** if this needs to update automatically (e.g. live scores during the tournament), the right move is a fresh data-extraction pass — pull `TEAMS`/`ISO_MAP` out of the bundled template into a real sibling `data.json`, same idea as before, then wire up a GitHub Actions workflow against the football-data.org API (competition ID `2000`, free tier) to refresh it on a schedule. This hasn't been attempted against this bundle format yet — the previous attempt was against the old non-bundled file and doesn't carry over as-is.

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
| D3 v7, TopoJSON client, Google Fonts | Map rendering, zoom, typography | Bundled inline in the Standalone file |

---

## Files in This Package

| File | Purpose |
|---|---|
| `FIFA 2026 Round of 32 Standalone.html` | The entire app — self-contained, deployed as-is |
| `index.html` | Tiny redirect to the file above, so the root URL works |
| `.nojekyll` | Disables GitHub Pages' Jekyll processing |
| `README.md` | This document |

---

*Generated July 5, 2026 · Source: FIFA · Transfermarkt · General Knowledge*
