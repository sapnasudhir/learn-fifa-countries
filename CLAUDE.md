# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

An interactive world map visualizing the 32 nations that reached the FIFA World Cup 2026 Round of 32. Countries are color-coded by **qualification stage reached** (Round of 32 exit through Champion); clicking a country opens a side panel with group-stage results, full knockout-bracket progression (Round of 32 through the Final), W/D/L record, a squad-value bar with a star rating, top 3 players by value, and country-fact categories. The app itself is one HTML file that fetches its match data from a sibling `data.json`. Visual identity is a playful "sticker album" theme (turf-green/gold/pink/sky palette, emoji result stamps, star ratings) applied 2026-07-06 — see README's Design Tokens for the full palette.

This is a design-reference deliverable, not a build-pipeline app — there is no `package.json` and no test suite (the one Node script, used only by the GitHub Actions workflow, has no dependencies beyond built-ins). `README.md` is a detailed handoff doc for the next engineer/agent picking this up; read it before making changes.

Live deployment: `https://sapnasudhir.github.io/learn-fifa-countries/` (GitHub Pages, `main` branch, root path). A tiny `index.html` redirects to the actual design file; `.nojekyll` disables GitHub Pages' default Jekyll processing (which would otherwise render `README.md` as the homepage instead).

## Files

- `FIFA 2026 Round of 32 Standalone.html` — the app shell. Committed and deployed as-is, with no build step. Fetches `data.json` at runtime instead of holding match data inline (see below).
- `data.json` — `TEAMS`/`ISO_MAP` data, extracted out of the bundle. Plain JSON, hand-editable.
- `scripts/update-data.js` — pulls live scores/results from football-data.org and merges them into `data.json`. Run by the GitHub Actions workflow below; not part of the page itself.
- `.github/workflows/update-data.yml` — scheduled job (every 2 hours, 11am-9pm Central Time, auto-stops after the July 19, 2026 Final) that runs the script above and commits `data.json` if it changed. Requires a `FOOTBALL_DATA_API_KEY` repo secret.
- `index.html` — redirect shim so the bare root URL lands on the file above. Not part of the design; don't touch unless the target filename changes.
- `.nojekyll` — empty marker file, disables Jekyll on GitHub Pages.
- `README.md` — handoff doc: design tokens, deployment, and the data-update situation.

## How this file is structured: a self-unpacking bundle

This is a Claude Design "Standalone HTML" export, not a hand-written static page. Structurally:

- A visible `<div id="__bundler_thumbnail">` SVG placeholder and `Unpacking...` status text show briefly on load.
- A real `<script>` (not a custom type — this one actually executes) reads two sibling script tags: `script[type="__bundler/manifest"]` (a JSON object mapping resource UUIDs to `{mime, compressed, data}` blobs — fonts, images, and the app's own JS runtime) and `script[type="__bundler/template"]` (the real page's HTML, JSON-encoded as a string, with UUID placeholders standing in for resource URLs).
- The bootstrap script converts each manifest entry to a blob URL, substitutes the placeholders into the template string, and injects the reconstructed page into the document, replacing the loading placeholder.

The reconstructed page is a `class Component extends DCLogic` app using a custom template DSL (`<x-dc>` root wrapper, `{{ }}` bindings, `sc-if`/`sc-for` directives) — confirmed via string search that this exact class/pattern is embedded in the template. An **earlier version** of this file referenced its runtime via `<script src="./support.js">`, a relative path that was never actually present, so it only ever rendered inside the Claude Design preview tool. This Standalone export fixes that by bundling the runtime itself as one of the manifest resources instead of a missing relative file — confirmed working when served over GitHub Pages (see README's Deployment section).

**Practical implication:** don't try to hand-edit the app *logic* directly in this file — it's JSON-escaped text nested inside JSON-escaped text (the template string inside the manifest/template JSON). Match *data*, however, has been extracted out into `data.json` (see below), which is plain, directly-editable JSON.

If the app logic itself ever needs to change again (not just match data), re-run the same extraction approach used this session: `json.loads()` the `__bundler/template` script tag's content to get the real decoded HTML/JS (avoids hand-unescaping), edit the decoded text, `json.dumps()` it back, then replace every literal `</` with `/`-escaped form before writing it back — skipping that last step lets a raw `</script` end up in the file and truncates the outer `<script type="__bundler/template">` tag early. Everything outside that one script tag (manifest, ext_resources, bootstrap) is untouched by this kind of edit.

## Architecture of the embedded Component class

(Reconstructed from what's visible in the template string — same shape as the earlier non-bundled version of this design.)

- `state = { selected: null }` — currently selected country drives the side panel.
- `TEAMS` / `ISO_MAP` — class fields, default to `{}` and populated from `data.json` in `componentDidMount()`. `TEAMS` is keyed by 3-letter code (e.g. `ARG`, `USA`); fields: `name`, `flag`, `iso2`, `group`, `pos`, `w/d/l`, `gf/ga`, `val`/`vLabel` (squad value), `status` (the stage a team has advanced to — `"R32"`/`"R16"`/`"QF"`/`"SF"`/`"F"` — or `"OUT"` or `"CHAMPION"`), `eliminatedIn` (set only when `status === "OUT"`, the stage they lost in), `games` (group stage), `knockout` (array of `{stage, opp, gf, ga, note?}`, one entry per knockout round played, in order), `players` (top 3 by value), `facts` (capital/geo/history/society/cuisine). `ISO_MAP` maps numeric TopoJSON country IDs to team codes.
- `componentDidMount()` — fetches `data.json` and the world-atlas TopoJSON in parallel (`Promise.all`), assigns `this.TEAMS`/`this.ISO_MAP` from the former, then calls `renderMap()`.
- `renderMap()` — draws/updates the D3 map, including the special-case Cape Verde marker (islands too small for the 110m atlas — rendered as an explicit SVG circle at `[-24, 16]`).
- `renderVals()` — renders the squad-value bar chart (plus a `valueStars` rating derived from the same bracket as `tierColor`) and side-panel fields, including mapping `d.knockout` into a `knockoutGames` array (via `STAGE_LABELS`) that the template renders as an `sc-for` list under "KNOCKOUT STAGE", and deriving the top status badge (`badgeBg`/`badgeColor`/`badgeLabel`) from `status`/`eliminatedIn` — green "✅ STAGE · ADVANCING", pink "❌ ELIMINATED · STAGE", or gold "🏆 WORLD CHAMPIONS".
- `furthestStage(team)` — returns the furthest stage a team actually reached: `team.eliminatedIn` if `status === 'OUT'`, otherwise `team.status` directly. This is the value the **map** colors by — don't color the map by `status` alone, since every eliminated team shares `status: 'OUT'` regardless of which round knocked them out (that was a bug, fixed 2026-07-06).
- `stageColor`/`stageHoverColor` — map a `furthestStage()` result to the map's stage-tier fill colors (see README's Design Tokens table). Used for country fills, the Cape Verde marker, and hover states.
- `tierColor`/`hoverColor` — map squad value (`val`, in millions EUR) to a *separate* 4-tier amber/bronze ramp, used only for the squad-value bar, top players, and facts accent color in the side panel — not the map.

## Design tokens (current baseline as of the 2026-07-06 redesign — see README for the full rationale)

| Token | Value |
|---|---|
| Background / map ocean | `#0d1b14` |
| Country (non-qualifier) | `#16261f` |
| Map fill — by furthest stage reached | R32 out `#3e6b52` · R16 `#5ad0f0` · QF `#ff7fa3` · SF `#ff8c61` · Final/Champion `#ffd666`/`#ffee8c` |
| Selected country | `#ffffff` fill, dashed `#ffd666` outline |
| Squad-value ramp (side panel only) | ≥€500M `#ffd666` · ≥€200M `#f0a83d` · ≥€100M `#c97c2e` · <€100M `#8a5a28` |
| Win / Draw / Loss | `#3ddc84` (✅) / `#ffd666` (🤝) / `#ff7fa3` (❌) |
| Fonts | Baloo 2 (hero title, country name), Barlow Condensed (labels/data), Barlow (body) — Google Fonts, bundled inline |

Treat this as the current high-fidelity baseline — don't restyle incidentally while fixing something else. A deliberate restyle is a distinct, explicit request.

## External dependencies

| Resource | Used for | How it's loaded |
|---|---|---|
| World Atlas 110m (jsDelivr) | Country geometries | Live fetch at runtime |
| flagcdn.com | Country flag images (England uses `gb-eng`, not `gb`) | Live fetch at runtime |
| `data.json` (sibling file) | Team/match data | Live fetch at runtime |
| D3 v7, TopoJSON client, Google Fonts | Map rendering, zoom, typography | Bundled inline (manifest resources) |

**Important:** the app must be served over real HTTP (GitHub Pages, or `python -m http.server` locally) for the `data.json` fetch to succeed — opening the HTML file directly via `file://` will not render any countries, since same-origin `fetch()` doesn't work under `file://`.

## Updating match data / automation

`data.json` is plain, hand-editable JSON — edit it directly for one-off corrections. Its shape is `{"TEAMS": {...}, "ISO_MAP": {...}}`, same keys as the old inline object (3-letter team codes, numeric TopoJSON IDs), just with quoted keys/strings instead of the original JS object-literal syntax. Each team's `knockout` array holds one `{stage, opp, gf, ga, note?}` entry per round played so far, in order (`STAGE_ORDER = ['R32','R16','QF','SF','F']` in `scripts/update-data.js`).

For ongoing updates during the tournament, `scripts/update-data.js` + `.github/workflows/update-data.yml` poll football-data.org on a schedule and merge in just the fields that change from actual match results — group-stage `w`/`d`/`l`/`gf`/`ga`/`games`, and `knockout`/`status`/`eliminatedIn` for whichever knockout rounds have finished — squad value, players, and facts are left untouched since that API doesn't provide them. The script never wipes a team's existing data for a round it fails to find a match for in a given run (learned this the hard way — see git history around 2026-07-06 for a live incident where a name-matching bug briefly zeroed two teams' group-stage records).

**Stage-name mapping is only partially confirmed.** `R32 = 'LAST_32'` and `R16 = 'LAST_16'` were confirmed via live diagnostic runs on 2026-07-06 — notably, football-data.org's naming does NOT follow the pattern its own general docs suggest (`ROUND_OF_32`/`SEMI_FINALS`), and an intermediate guess of `LAST_16` for Round of 32 was briefly wrong and shipped incorrect data for 8 teams before being caught. `QF`/`SF`/`F` candidate names in `STAGE_API_NAMES` are still unconfirmed guesses. The script logs a per-stage match-count diagnostic every run specifically so this can be verified with real numbers instead of guesswork — before trusting a newly-reached round's data, check that diagnostic log for a plausible match count at that stage (e.g. 8 finished matches for a first confirmed Quarterfinal round) rather than assuming the guessed name was right.

If the app *logic* or *design* needs to change (not just match data), use the in-place bundle-editing procedure described above (`json.loads`/edit/`json.dumps`/escape `</`) — this is how the 2026-07-06 sticker-album redesign (palette, map-coloring logic, new Baloo 2 font resource) was applied, and it preserves `data.json`/the fetch wiring untouched. Re-exporting a fresh Standalone HTML from Claude Design is only needed if you're starting from a new Claude Design source file, since that would blow away the `data.json` fetch wiring and require re-running the whole extraction pass.
