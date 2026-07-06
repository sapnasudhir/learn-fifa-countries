# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A single-file interactive world map visualizing the 32 nations that reached the FIFA World Cup 2026 Round of 32. Countries are color-coded by squad market value; clicking a country opens a side panel with group-stage results, the Round of 32 match, W/D/L record, a squad-value bar, top 3 players by value, and country-fact categories.

This is a design-reference deliverable, not a running app with a build pipeline — there is no `package.json` and no test suite. `README.md` is a detailed handoff doc for the next engineer/agent picking this up; read it before making changes.

Live deployment: `https://sapnasudhir.github.io/learn-fifa-countries/FIFA%202026%20Round%20of%2032%20Standalone.html` (GitHub Pages, `main` branch, root path — note the repo root itself has no `index.html`, so the bare root URL 404s by design).

## Files

- `FIFA 2026 Round of 32 Standalone.html` — the entire app. This is the only file in the project; it's committed and deployed as-is, with no build step.
- `README.md` — handoff doc: design tokens, deployment, and the data-update situation.

## How this file is structured: a self-unpacking bundle

This is a Claude Design "Standalone HTML" export, not a hand-written static page. Structurally:

- A visible `<div id="__bundler_thumbnail">` SVG placeholder and `Unpacking...` status text show briefly on load.
- A real `<script>` (not a custom type — this one actually executes) reads two sibling script tags: `script[type="__bundler/manifest"]` (a JSON object mapping resource UUIDs to `{mime, compressed, data}` blobs — fonts, images, and the app's own JS runtime) and `script[type="__bundler/template"]` (the real page's HTML, JSON-encoded as a string, with UUID placeholders standing in for resource URLs).
- The bootstrap script converts each manifest entry to a blob URL, substitutes the placeholders into the template string, and injects the reconstructed page into the document, replacing the loading placeholder.

The reconstructed page is a `class Component extends DCLogic` app using a custom template DSL (`<x-dc>` root wrapper, `{{ }}` bindings, `sc-if`/`sc-for` directives) — confirmed via string search that this exact class/pattern is embedded in the template. An **earlier version** of this file referenced its runtime via `<script src="./support.js">`, a relative path that was never actually present, so it only ever rendered inside the Claude Design preview tool. This Standalone export fixes that by bundling the runtime itself as one of the manifest resources instead of a missing relative file — confirmed working when served over GitHub Pages (see README's Deployment section).

**Practical implication:** don't try to hand-edit the app logic or match data directly in this file. It's JSON-escaped text nested inside JSON-escaped text (the template string inside the manifest/template JSON), not directly editable source. See README's "Updating Data" section for the actual update path.

## Architecture of the embedded Component class

(Reconstructed from what's visible in the template string — same shape as the earlier non-bundled version of this design.)

- `state = { selected: null }` — currently selected country drives the side panel.
- `TEAMS` / `ISO_MAP` — inline data objects (not fetched — no `data.json` in this project). `TEAMS` is keyed by 3-letter code (e.g. `ARG`, `USA`); fields: `name`, `flag`, `iso2`, `group`, `pos`, `w/d/l`, `gf/ga`, `val`/`vLabel` (squad value), `status` (`"R16"` or `"OUT"`), `games` (group stage), `r32Game` (Round of 32 result, optional `note` for `"AET"` or pens), `players` (top 3 by value), `facts` (capital/geo/history/society/cuisine). `ISO_MAP` maps numeric TopoJSON country IDs to team codes.
- `componentDidMount()` — loads the world-atlas TopoJSON via D3 (live fetch, see README's External Dependencies), then calls `renderMap()`.
- `renderMap()` — draws/updates the D3 map, including the special-case Cape Verde marker (islands too small for the 110m atlas — rendered as an explicit SVG circle at `[-24, 16]`).
- `renderVals()` — renders the squad-value bar chart and side-panel fields.
- `tierColor`/`hoverColor` — map squad value (`val`, in millions EUR) to the 4-tier fill colors in README's Design Tokens table.

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
| Fonts | Barlow Condensed (headings), Barlow (body) — Google Fonts, bundled inline |

## External dependencies

| Resource | Used for | How it's loaded |
|---|---|---|
| World Atlas 110m (jsDelivr) | Country geometries | Live fetch at runtime |
| flagcdn.com | Country flag images (England uses `gb-eng`, not `gb`) | Live fetch at runtime |
| D3 v7, TopoJSON client, Google Fonts | Map rendering, zoom, typography | Bundled inline (manifest resources) |

## Updating match data / future automation

There's no `data.json` in this project — match data is inline inside the bundled template (see above). To change results, re-export a fresh Standalone HTML from Claude Design and replace this file; don't hand-edit the JSON-escaped template text.

A previous session extracted `TEAMS`/`ISO_MAP` into a `data.json` and wired a `fetch()`-based loader, intending to set up GitHub Actions automation (football-data.org API) on top of it. That was against the **old, non-bundled** file and was reverted — this bundle format doesn't have an equivalent extraction yet. If automating live score updates comes up again, that extraction needs to be redone against this file's embedded template, not copied from git history as-is.
