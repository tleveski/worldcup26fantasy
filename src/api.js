// ─── API-FOOTBALL PLACEHOLDER ────────────────────────────────────────────────
// Step 4: Replace API_KEY with your real key from api-football.com
// Free tier: 100 calls/day — sufficient for polling every 5 min during match days.
//
// How to get your key:
//  1. Go to rapidapi.com/api-sports/api/api-football
//  2. Subscribe to the free tier
//  3. Copy your X-RapidAPI-Key
//  4. Paste it below as API_KEY
//  5. Set LIVE_MODE = true

const API_KEY   = 'YOUR_API_FOOTBALL_KEY_HERE';   // ← paste your key
const LIVE_MODE = false;                            // ← set true when key is ready

// 2026 World Cup fixture IDs — API-Football uses league ID 1 for World Cup
const WC_LEAGUE_ID = 1;
const WC_SEASON    = 2026;

// ── Fetch today's WC results from API-Football ───────────────────────────────
export async function fetchTodayResults() {
  if (!LIVE_MODE) {
    console.log('[API] Placeholder mode — returning empty results');
    return [];
  }

  const today = new Date().toISOString().split('T')[0];
  const url   = `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}&date=${today}`;

  try {
    const res  = await fetch(url, {
      headers: {
        'X-RapidAPI-Key':  API_KEY,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
      },
    });
    const data = await res.json();
    return parseFixtures(data.response || []);
  } catch (err) {
    console.error('[API] fetchTodayResults failed:', err);
    return [];
  }
}

// ── Fetch goal scorers for a specific fixture ────────────────────────────────
export async function fetchGoalScorers(fixtureId) {
  if (!LIVE_MODE) return [];

  const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures/events?fixture=${fixtureId}`;

  try {
    const res  = await fetch(url, {
      headers: {
        'X-RapidAPI-Key':  API_KEY,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
      },
    });
    const data = await res.json();
    return parseEvents(data.response || []);
  } catch (err) {
    console.error('[API] fetchGoalScorers failed:', err);
    return [];
  }
}

// ── Parse API response into app-friendly format ───────────────────────────────
function parseFixtures(fixtures) {
  return fixtures.map(f => ({
    apiId:     f.fixture.id,
    homeTeam:  f.teams.home.name,
    awayTeam:  f.teams.away.name,
    homeScore: f.goals.home ?? 0,
    awayScore: f.goals.away ?? 0,
    status:    f.fixture.status.short, // FT = full time, 1H/2H = live, NS = not started
    played:    f.fixture.status.short === 'FT',
  }));
}

function parseEvents(events) {
  return events
    .filter(e => e.type === 'Goal' && e.detail !== 'Missed Penalty')
    .map(e => ({
      playerName: e.player.name,
      teamName:   e.team.name,
      minute:     e.time.elapsed,
      type:       e.detail, // 'Normal Goal', 'Own Goal', 'Penalty'
      assist:     e.assist?.name ?? null,
    }));
}

// ── Map API team names to our team IDs ───────────────────────────────────────
// API-Football uses full English names; we map them to our short IDs.
export const API_TEAM_NAME_MAP = {
  'France':         'FRA', 'Spain':          'ESP', 'Argentina':      'ARG',
  'England':        'ENG', 'Portugal':       'POR', 'Brazil':         'BRA',
  'Netherlands':    'NED', 'Morocco':        'MAR', 'Belgium':        'BEL',
  'Germany':        'GER', 'Croatia':        'CRO', 'Colombia':       'COL',
  'Senegal':        'SEN', 'Mexico':         'MEX', 'United States':  'USA',
  'Uruguay':        'URU', 'Japan':          'JPN', 'Switzerland':    'SUI',
  'Iran':           'IRN', 'Austria':        'AUT', 'Ecuador':        'ECU',
  'South Korea':    'KOR', 'Australia':      'AUS', 'Egypt':          'EGY',
  'Canada':         'CAN', 'Ivory Coast':    'CIV', 'Qatar':          'QAT',
  'Algeria':        'ALG', 'Sweden':         'SWE', 'Tunisia':        'TUN',
  'Czech Republic': 'CZE', 'Turkey':         'TUR', 'Norway':         'NOR',
  'Scotland':       'SCO', 'DR Congo':       'DRC', 'Bosnia':         'BIH',
  'Panama':         'PAN', 'Saudi Arabia':   'KSA', 'South Africa':   'RSA',
  'Iraq':           'IRQ', 'Ghana':          'GHA', 'Paraguay':       'PAR',
  'New Zealand':    'NZL', 'Jordan':         'JOR', 'Haiti':          'HTI',
  'Cape Verde':     'CPV', 'Uzbekistan':     'UZB', 'Curacao':        'CUW',
};
