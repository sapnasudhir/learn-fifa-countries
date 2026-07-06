// Refreshes the "live" fields in data.json (scores/results/status) from the
// football-data.org API, without touching the static fields (name, flag,
// iso2, group, pos, val, vLabel, players, facts) that API doesn't provide.
//
// Requires FOOTBALL_DATA_API_KEY in the environment. Run with: node scripts/update-data.js
//
// Tracks the full knockout bracket (Round of 32 through the Final), not just
// Round of 32. Each team's `knockout` array holds one entry per stage it has
// played, in STAGE_ORDER; `status` is either the furthest stage the team has
// advanced TO (i.e. the next stage after their last win), `'OUT'` (with
// `eliminatedIn` set to the stage they lost in), or `'CHAMPION'` if they won
// the Final.
//
// STAGE_API_NAMES confirmed so far (via live diagnostic runs, 2026-07-06):
//   R32 = 'LAST_32', R16 = 'LAST_16'.
// QF/SF/F candidate names below are UNCONFIRMED guesses (football-data.org
// used LAST_32/LAST_16 rather than the more generic ROUND_OF_32/SEMI_FINALS
// naming their own docs suggested elsewhere, so don't assume the pattern
// continues) -- check the "Unrecognized stage values" / per-stage match
// count diagnostic log on each run and add the real names here once those
// rounds actually have finished matches.

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');
const COMPETITION_CODE = 'WC'; // football-data.org code for FIFA World Cup (confirmed on free tier)
const API_BASE = 'https://api.football-data.org/v4';

const GROUP_STAGE_NAMES = ['GROUP_STAGE'];

const STAGE_ORDER = ['R32', 'R16', 'QF', 'SF', 'F'];
const STAGE_API_NAMES = {
  R32: ['LAST_32'],
  R16: ['LAST_16'],
  QF: ['LAST_8', 'QUARTER_FINALS', 'QUARTERFINALS'],
  SF: ['LAST_4', 'SEMI_FINALS', 'SEMIFINALS'],
  F: ['FINAL'],
};

function stageForApiValue(apiStage) {
  for (const [stage, names] of Object.entries(STAGE_API_NAMES)) {
    if (names.includes(apiStage)) return stage;
  }
  return null;
}

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
  const stageCounts = new Map(); // diagnostic: every distinct stage seen among FINISHED matches involving a known team

  // Both staged separately from `teams` and only written back for codes
  // actually seen this run -- so a team we fail to match (bad override, API
  // hiccup, whatever) keeps its last-known-good data instead of being
  // silently zeroed/reset.
  const groupResults = new Map(); // code -> { games, w, d, l, gf, ga }
  const knockoutResults = new Map(); // code -> Map(stage -> entry)

  function groupResultFor(code) {
    if (!groupResults.has(code)) {
      groupResults.set(code, { games: [], w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    }
    return groupResults.get(code);
  }
  function knockoutResultFor(code) {
    if (!knockoutResults.has(code)) knockoutResults.set(code, new Map());
    return knockoutResults.get(code);
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

    if (homeCode || awayCode) {
      stageCounts.set(match.stage, (stageCounts.get(match.stage) || 0) + 1);
    }

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
      continue;
    }

    const stage = stageForApiValue(match.stage);
    if (!stage) {
      unrecognizedStages.add(match.stage);
      continue;
    }

    const note = resultNote(match);
    // The actual fullTime score is authoritative -- confirmed via a live run (2026-07-06) that
    // match.score.winner can be 'DRAW' even for a decisive, non-tied scoreline (it appears to
    // describe the 90-minute regulation result, not who actually advanced), which previously
    // caused every affected team to be wrongly marked OUT regardless of who really won. Only
    // fall back to `winner` for a genuine tie in the recorded score (shouldn't happen for a
    // finished knockout match, but kept as a safety net).
    const winnerSide = home > away ? 'HOME' : away > home ? 'AWAY'
      : (match.score.winner === 'HOME' || match.score.winner === 'AWAY' ? match.score.winner : null);

    if (homeCode && teams[homeCode]) {
      knockoutResultFor(homeCode).set(stage, {
        stage, opp: match.awayTeam.name, gf: home, ga: away, ...(note ? { note } : {}), _won: winnerSide === 'HOME',
      });
    }
    if (awayCode && teams[awayCode]) {
      knockoutResultFor(awayCode).set(stage, {
        stage, opp: match.homeTeam.name, gf: away, ga: home, ...(note ? { note } : {}), _won: winnerSide === 'AWAY',
      });
    }
  }

  for (const [code, g] of groupResults) {
    Object.assign(teams[code], g);
  }

  for (const [code, stageMap] of knockoutResults) {
    const entries = STAGE_ORDER.filter((s) => stageMap.has(s)).map((s) => stageMap.get(s));
    const furthest = entries[entries.length - 1];
    const team = teams[code];

    team.knockout = entries.map(({ _won, ...rest }) => rest);
    if (furthest._won) {
      const nextIdx = STAGE_ORDER.indexOf(furthest.stage) + 1;
      team.status = nextIdx < STAGE_ORDER.length ? STAGE_ORDER[nextIdx] : 'CHAMPION';
      delete team.eliminatedIn;
    } else {
      team.status = 'OUT';
      team.eliminatedIn = furthest.stage;
    }
  }

  const staleGroupTeams = Object.keys(teams).filter((code) => !groupResults.has(code));
  if (staleGroupTeams.length) {
    console.warn('No finished group-stage matches found this run for (left unchanged):', staleGroupTeams);
  }
  if (unrecognizedStages.size) {
    console.warn('Unrecognized stage values (matches skipped):', [...unrecognizedStages]);
  }
  if (unmatchedTeams.size) {
    console.warn('API teams that did not match any data.json team (add to NAME_OVERRIDES):', [...unmatchedTeams]);
  }
  console.log('Diagnostic -- FINISHED matches per stage (only counting ones involving a known team):', Object.fromEntries(stageCounts));
  console.log('Diagnostic -- our team codes with a knockout-stage match this run, by stage:',
    Object.fromEntries(STAGE_ORDER.map((s) => [s, [...knockoutResults].filter(([, m]) => m.has(s)).map(([code]) => code)])));
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
