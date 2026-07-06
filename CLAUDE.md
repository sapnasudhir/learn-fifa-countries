# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A single-file interactive world map visualizing the 32 nations that reached the FIFA World Cup 2026 Round of 32. Countries are color-coded by squad market value; clicking a country opens a side panel with group-stage results, the Round of 32 match, W/D/L record, a squad-value bar, top 3 players by value, and country-fact categories.

This is a design-reference deliverable, not a running app with a build pipeline — there is no `package.json`, no git repo, and no test suite. `README.md` is a detailed handoff doc for the next engineer/agent picking this up; read it before making changes, but verify its claims against the actual HTML (see caveat below).

## Files

- `FIFA 2026 Round of 32.html` — the app shell: markup, styles, and logic. Match data is no longer inline — it's fetched from `data.json` at startup.
- `data.json` — all match/team data (`meta`, `teams`, `isoMap`), extracted from the HTML. Edit this file to update results; no HTML changes needed.
- `README.md` — handoff doc: design tokens, data schema, and remaining follow-up task.

## Important caveat: this is not plain D3/vanilla JS

The README describes the file as "no framework, no build step," but the markup actually uses a custom component DSL:
- `<x-dc>` root wrapper, `<helmet>` for head content
- Template bindings (`{{ zoomIn }}`, `{{ tierColor }}`) and directives (`sc-if`, `sc-for`)
- `<script src="./support.js">` — a runtime this file depends on to interpret the DSL, but `support.js` is **not present in this directory**
- The actual logic lives in `<script type="text/x-dc" data-dc-script">` (starting ~line 193) as `class Component extends DCLogic { ... }`

Consequence: the HTML file will **not** render standalone by double-clicking it in a browser — it needs the `support.js` runtime supplied by whatever tool produced it. Don't assume "open in browser" works without that dependency; if you need a truly standalone version, that conversion (stripping the DSL to vanilla JS/D3) is real work, not a given.

## Architecture of the Component class (in the `data-dc-script` block)

- `state = { selected: null }` — currently selected country drives the side panel.
- `TEAMS` / `ISO_MAP` / `META` — start empty (`{}`), populated by `componentDidMount()` from `data.json`. `TEAMS` is per-country data keyed by 3-letter code (e.g. `ARG`, `AUS`); fields: `name`, `flag`, `iso2`, `group`, `pos`, `w/d/l`, `gf/ga`, `val`/`vLabel` (squad value), `status` (`"R16"` or `"OUT"`), `games` (group stage), `r32Game` (Round of 32 result, optional `note` for `"AET"` or pens), `players` (top 3 by value), `facts` (capital/geo/history/society/cuisine). `ISO_MAP` maps numeric TopoJSON country IDs to team codes. `META` holds `highestSquadValueM`/`highestSquadValueLabel` (used for the squad-value bar's 100% reference and footer line) and `lastUpdated`.
- `componentDidMount()` — `Promise.all`s a `fetch('./data.json')` alongside the world-atlas TopoJSON via D3, assigns `TEAMS`/`ISO_MAP`/`META`, then calls `renderMap()`; wires a resize listener. Requires the page be served over HTTP — `fetch` of a local file fails under `file://`.
- `renderMap()` — draws/updates the D3 map, including the special-case Cape Verde marker (islands too small for the 110m atlas — rendered as an explicit SVG circle at `[-24, 16]`).
- `renderVals()` — renders the squad-value bar chart and side-panel fields, including `highestValueLine` (bound to the footer text, driven by `META.highestSquadValueLabel`).

## Design tokens (must be preserved — treat as high-fidelity, do not restyle)

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
| Win / Draw / Loss | `#4ade80` / `#facc15` / `#f87171` |
| Fonts | Barlow Condensed (headings), Barlow (body) — Google Fonts |

## External dependencies (all loaded at runtime, no npm/bundler)

| Resource | Used for |
|---|---|
| D3 v7 (`d3js.org`) | Map rendering, zoom, DOM |
| TopoJSON client (jsDelivr) | Decoding world atlas |
| World Atlas 110m (jsDelivr) | Country geometries |
| flagcdn.com | Country flag images (note: England uses `gb-eng`, not `gb`) |

## Planned follow-up work (per README)

1. ~~**Extract data**~~ — done. `TEAMS`/`ISO_MAP` now live in `data.json`, loaded via `fetch` in `componentDidMount`; the squad-value bar and footer line read `META.highestSquadValueM`/`highestSquadValueLabel` instead of a hardcoded `1520`.
2. **Automate updates** (not yet done): add `.github/workflows/update-data.yml` (cron every 30 min during the tournament) running `scripts/build_data.py`, which fetches results from the football-data.org API (competition ID `2000`) and merges them into `data.json` — preserving `facts`/`players`/`val`/`iso2` fields the API doesn't provide. Requires a `FOOTBALL_DATA_API_KEY` repo secret. See `README.md` for the full script and the `tlaMap` normalization caveat (football-data.org TLA codes can differ from the keys used in `data.json`, e.g. `CPV` vs `CV`).
3. **Deploy**: push `FIFA 2026 Round of 32.html` (as `index.html`) + `data.json` to GitHub Pages or Vercel so `fetch('./data.json')` actually resolves — see caveat above about `file://` not working.
