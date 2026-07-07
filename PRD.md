# PRD: FIFA 2026 Round of 32 Interactive Map

*Status: Draft · Source: derived from README.md and current implementation · 2026-07-07*

## 1. Summary

An interactive, full-screen world map that teaches younger readers about the 32 nations that reached the Round of 32 at FIFA World Cup 2026. Users explore a color-coded map, click into any qualifying country, and see its tournament journey, squad info, and fun facts in a "sticker album" themed side panel. Data refreshes automatically as real match results come in.

## 2. Problem / Opportunity

Following a 32-team World Cup knockout bracket is hard to do casually, especially for younger or casual fans — box-score tables and bracket graphics are dense and not engaging. A playful, geography-anchored, click-to-explore map lowers the barrier to following the tournament and turns it into a lightweight learning tool (geography + sport + numbers).

## 3. Goals

- Let anyone identify, at a glance, how far each of the 32 qualifying countries has progressed in the knockout stage.
- Make drilling into a single country's results, squad value, and trivia fast and fun (one click, one panel).
- Keep the dashboard current automatically through the tournament without manual data entry for match results.
- Present the experience in a visual style aimed at younger readers (playful "sticker album" aesthetic) without sacrificing legibility of real data.

## 4. Non-Goals

- Not a full World Cup coverage app — only the Round of 32 qualifiers and their onward knockout path are in scope (no group-stage-only teams, no non-qualifiers beyond map "greyed out" context).
- Not a live score/commentary product — updates run on a schedule (every 2 hours, 11am–9pm CDT), not real-time push.
- Not editable/interactive data entry by end users — data is curated + pulled from football-data.org, not user-submitted.
- Not optimized as a native mobile app — it's a single-page, browser-based dashboard.
- Squad value, top players, and country facts are not automated — these stay hand-curated and are explicitly out of scope for the live-update pipeline.

## 5. Target Users

- Casual/young World Cup fans who want a fun, visual way to follow which countries are still in the tournament.
- The site owner (sapnasudhir), who also curates and hand-updates content (facts, squad values) between automated syncs.

## 6. Key Features

### 6.1 World Map
- Full-screen map (D3 + TopoJSON world-atlas) showing all countries; the 32 qualifiers are color-coded by furthest knockout stage reached, non-qualifiers rendered in a muted neutral fill.
- Stage color ramp: Round of 32 exit (moss) → Round of 16 (sky) → Quarterfinal (bubblegum) → Semifinal (sunset orange) → Final/Champion (foil gold).
- Clicking a country highlights it (white fill, dashed gold outline) and opens its side panel.
- Special-cased marker for Cape Verde (too small for the base map geometry) rendered as an explicit circle at its coordinates, with full click/hover parity to real country paths.

### 6.2 Country Side Panel
On selecting a qualifying country, show:
- Group-stage record: wins/draws/losses, goals for/against, with win/draw/loss emoji stamps (✅/🤝/❌).
- Full knockout-stage progression as a chronological list (stage, opponent, score, notes like AET/pens), plus a "NEXT" chip showing the upcoming opponent (or "TBD" if not yet known).
- Squad value bar with a star rating, using a value-based color ramp distinct from the map's stage colors.
- Top 3 players by market value.
- Five country-fact categories for light trivia/learning content.

### 6.3 Automatic Data Updates
- A scheduled GitHub Actions workflow polls the football-data.org API every 2 hours (11am–9pm CDT) during the tournament window and merges live changes (group-stage W/D/L/GF/GA, knockout stage/status/eliminatedIn) into `data.json`, committing only if something changed.
- The workflow auto-stops after the July 19 Final.
- Hand-curated fields (squad value, top players, country facts) are preserved across automated merges.

### 6.4 Deployment / Distribution
- Hosted on GitHub Pages, served as a static site (root `index.html` redirects to the standalone design file so both URLs resolve).
- Fully self-contained HTML bundle (fonts, D3, TopoJSON client, runtime all inlined) except for three live fetches: world-atlas geometry, flag images (flagcdn.com), and the sibling `data.json`.

## 7. Design Principles

- "Sticker album" visual identity: turf-green/gold/pink/sky palette, dashed borders, peel-corner accents, perforated-looking dividers — playful and aimed at younger readers, per the 2026-07-06 redesign (current high-fidelity baseline; further restyles should be explicit, not incidental).
- Two independent, visually distinct color systems: knockout-stage progression (map) vs. squad value (side panel) — intentionally kept apart so they don't visually collide.
- Typography: Baloo 2 for hero moments (title, country name), Barlow Condensed for labels/data, Barlow for body copy.

## 8. Data Model (current)

- `TEAMS` and `ISO_MAP` live in a sibling `data.json`, fetched at runtime (requires a real HTTP origin, not `file://`).
- Each team has a `knockout` array of stage entries (`{stage, opp, gf, ga, note?}`), a `status` (stage advanced to, `"OUT"`, or `"CHAMPION"`), and `eliminatedIn` when applicable. Map fill color derives directly from `status`/`eliminatedIn` — no separate "stage reached" field.
- `nextOpponent` is optional, populated when a real upcoming matchup is known.

## 9. Success Metrics (proposed — not yet instrumented)

- Qualitative: dashboard stays visually correct and current through each round of the live tournament with no manual intervention beyond curated content.
- Engagement (if analytics are added later): country-panel open rate, session length, return visits during tournament windows.
- Data reliability: automated workflow runs succeed (no failed syncs) and per-stage match counts logged by the update script match expectations (flagging any wrong football-data.org stage-name guesses for SF/F early).

## 10. Open Questions

- football-data.org stage names for Semifinal/Final (`LAST_4`/`SEMI_FINALS`, `FINAL`) are unconfirmed guesses in the update script — need to verify once matches reach those rounds.
- No current mechanism to populate `nextOpponent` automatically — is this meant to be added to the update script, or stay manual?
- No analytics/instrumentation currently exists to measure the success metrics above — worth deciding if that's in scope before/after the tournament ends.
- Post-tournament plan: does the dashboard get archived as-is, or repurposed/reset for a future tournament?

## 11. Risks

- External dependency on football-data.org's API shape; an incorrect stage-name guess could silently misclassify knockout progress until caught by the diagnostic logging.
- External dependency on jsDelivr (world-atlas) and flagcdn.com at runtime — an outage there degrades the map/flags with no fallback described.
- Squad value/top players/facts are hand-curated and could go stale relative to real-world transfers or news without a re-curation cadence.
