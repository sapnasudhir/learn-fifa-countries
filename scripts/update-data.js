// Refreshes the "live" fields in data.json (scores/results/status) from the
// football-data.org API, without touching the static fields (name, flag,
// iso2, group, pos, val, vLabel, players, facts) that API doesn't provide.
//
// Requires FOOTBALL_DATA_API_KEY in the environment. Run with: node scripts/update-data.js
//
// NOTE: football-data.org's `stage` value for the World Cup 2026 Round of 32
// was confirmed via a live run (2026-07-06) to be `LAST_16`, not
// `LAST_32`/`ROUND_OF_32` as originally guessed with no API key available --
// if their naming changes again, check the "Unrecognized stage values" log.

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');
const COMPETITION_CODE = 'WC'; // football-data.org code for FIFA World Cup (confirmed on free tier)
const API_BASE = 'https://api.football-data.org/v4';

const GROUP_STAGE_NAMES = ['GROUP_STAGE'];
const R32_STAGE_NAMES = ['LAST_16'];

// Our TEAMS keys vs. football-data.org's team `name`/`shortName` don't always
// match by naive substring -- seed known mismatches here. Left side is our
// data.json key, right side is the exact API team name to match against.
// Confirmed against a live run (2026-07-06); COD ('Congo DR') and ZAF/USA
// need no override since they already match data.json's own `name` field.
const NAME_OVERRIDES = {
  BIH: 'Bosnia-Herzegovina',
  CIV: 'Ivory Coast',
};

function normalize(s) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]/g, '');
}

function buildTeamMatcher(teams) {
  const byNormalizedName = new Map();
  for (const [code, team] of Object.entries(teams)) {
    const target = NAME_OVERRIDES[code] || team.name;
    byNormalizedName.set(normalize(target), code);
  }
  return (apiTeam) => {
    const candidates = [apiTeam.name, apiTeam.shortName].filter(Boolean).map(normalize);
    for (const c of candidates) {
      if (byNormalizedName.has(c)) return byNormalizedName.get(c);
    }
    return null;
  };
}

async function fetchMatches(apiKey) {
  const res = await fetch(`${API_BASE}/competitions/${COMPETITION_CODE}/matches`, {
    headers: { 'X-Auth-Token': apiKey },
  });
  if (!res.ok) {
    throw new Error(`football-data.org request failed: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.matches || [];
}

function resultNote(match) {
  if (match.score.duration === 'PENALTY_SHOOTOUT') return 'pens';
  if (match.score.duration === 'EXTRA_TIME') return 'AET';
  return undefined;
}

function applyLiveData(teams, matches, matchTeam) {
  const unrecognizedStages = new Set();
  const unmatchedTeams = new Set();
  // Group-stage results are staged here, keyed by our team code, and only
  // written into `teams` for codes that actually had a finished match this
  // run -- so a team we fail to match (bad override, API hiccup, whatever)
  // keeps its last-known-good data instead of being silently zeroed out.
  const groupResults = new Map();

  function groupResultFor(code) {
    if (!groupResults.has(code)) {
      groupResults.set(code, { games: [], w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    }
    return groupResults.get(code);
  }

  for (const match of matches) {
    if (match.status !== 'FINISHED') continue;

    const homeCode = matchTeam(match.homeTeam);
    const awayCode = matchTeam(match.awayTeam);
    if (!homeCode) unmatchedTeams.add(match.homeTeam.name);
    if (!awayCode) unmatchedTeams.add(match.awayTeam.name);
    if (!homeCode && !awayCode) continue;

    const home = match.score.fullTime.home;
    const away = match.score.fullTime.away;

    if (GROUP_STAGE_NAMES.includes(match.stage)) {
      if (homeCode && teams[homeCode]) {
        const g = groupResultFor(homeCode);
        g.games.push({ opp: match.awayTeam.name, gf: home, ga: away });
        g.gf += home; g.ga += away;
        if (home > away) g.w++; else if (home < away) g.l++; else g.d++;
      }
      if (awayCode && teams[awayCode]) {
        const g = groupResultFor(awayCode);
        g.games.push({ opp: match.homeTeam.name, gf: away, ga: home });
        g.gf += away; g.ga += home;
        if (away > home) g.w++; else if (away < home) g.l++; else g.d++;
      }
    } else if (R32_STAGE_NAMES.includes(match.stage)) {
      const note = resultNote(match);
      // `winner` is authoritative (covers AET/penalties); fall back to fullTime score only if absent.
      const winnerSide = match.score.winner || (home > away ? 'HOME' : away > home ? 'AWAY' : null);

      if (homeCode && teams[homeCode]) {
        teams[homeCode].r32Game = { opp: match.awayTeam.name, gf: home, ga: away, ...(note ? { note } : {}) };
        teams[homeCode].status = winnerSide === 'HOME' ? 'R16' : winnerSide === 'AWAY' ? 'OUT' : teams[homeCode].status;
      }
      if (awayCode && teams[awayCode]) {
        teams[awayCode].r32Game = { opp: match.homeTeam.name, gf: away, ga: home, ...(note ? { note } : {}) };
        teams[awayCode].status = winnerSide === 'AWAY' ? 'R16' : winnerSide === 'HOME' ? 'OUT' : teams[awayCode].status;
      }
    } else {
      unrecognizedStages.add(match.stage);
    }
  }

  for (const [code, g] of groupResults) {
    Object.assign(teams[code], g);
  }

  const staleTeams = Object.keys(teams).filter((code) => !groupResults.has(code));
  if (staleTeams.length) {
    console.warn('No finished group-stage matches found this run for (left unchanged):', staleTeams);
  }
  if (unrecognizedStages.size) {
    console.warn('Unrecognized stage values (matches skipped):', [...unrecognizedStages]);
  }
  if (unmatchedTeams.size) {
    console.warn('API teams that did not match any data.json team (add to NAME_OVERRIDES):', [...unmatchedTeams]);
  }
}

async function main() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.error('FOOTBALL_DATA_API_KEY is not set');
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);

  const matchTeam = buildTeamMatcher(data.TEAMS);
  const matches = await fetchMatches(apiKey);
  applyLiveData(data.TEAMS, matches, matchTeam);

  const updated = JSON.stringify(data, null, 2) + '\n';
  if (updated === raw) {
    console.log('No changes.');
    return;
  }
  fs.writeFileSync(DATA_PATH, updated, 'utf8');
  console.log('data.json updated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
