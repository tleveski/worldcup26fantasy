// ─── API-FOOTBALL INTEGRATION ─────────────────────────────────────────────────
// Calls Netlify serverless function to avoid CORS issues
// Free tier: 100 calls/day
// Call runApiUpdate() from the admin panel

import { db } from './firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const WC_LEAGUE = 1;
const WC_SEASON = 2026;

// ── Player name → our player ID ───────────────────────────────────────────────
const PLAYER_NAME_MAP = {
  'Ousmane Dembélé':'dembele','Ousmane Dembele':'dembele','O. Dembélé':'dembele',
'Mohamed Salah':'salah','M. Salah':'salah',
  'Lionel Messi':'messi','L. Messi':'messi',
  'Jérémy Doku':'doku','Jeremy Doku':'doku','J. Doku':'doku',
  'Alphonso Davies':'davies','A. Davies':'davies',
  'Erling Haaland':'haaland','E. Haaland':'haaland',
  'Lautaro Martínez':'lautaro','Lautaro Martinez':'lautaro','L. Martínez':'lautaro',
  'Ferran Torres':'ferran','F. Torres':'ferran',
  'Pedri':'pedri','Pedro González':'pedri',
  'Désiré Doué':'doue','Desire Doue':'doue','D. Doué':'doue',
  'Kingsley Coman':'coman','K. Coman':'coman',
  'Bukayo Saka':'saka','B. Saka':'saka',
  'Rayan Cherki':'cherki','R. Cherki':'cherki',
  'Cucho Hernández':'cucho','Cucho Hernandez':'cucho','J. Hernández':'cucho',
  'Lamine Yamal':'yamal','L. Yamal':'yamal',
  'Martin Ødegaard':'odegaard','Martin Odegaard':'odegaard','M. Ødegaard':'odegaard',
  'Folarin Balogun':'balogun','F. Balogun':'balogun',
  'Cristiano Ronaldo':'ronaldo','C. Ronaldo':'ronaldo',
  'Bradley Barcola':'barcola','B. Barcola':'barcola',
  'Jefferson Lerma':'lerma','J. Lerma':'lerma',
  'Mikel Oyarzabal':'oyarzabal','M. Oyarzabal':'oyarzabal',
  'Cody Gakpo':'gakpo','C. Gakpo':'gakpo',
  'Kai Havertz':'havertz','K. Havertz':'havertz',
  'Harry Kane':'kane','H. Kane':'kane',
  'Luis Díaz':'luisdiaz','Luis Diaz':'luisdiaz','L. Díaz':'luisdiaz',
  'Endrick':'endrick','Endrick Felipe':'endrick',
  'Raphinha':'raphinha','Raphael Dias':'raphinha',
  'Antoine Semenyo':'semenyo','A. Semenyo':'semenyo',
  'Abde Ezzalzouli':'abde','A. Ezzalzouli':'abde',
  'Vinícius Júnior':'vinicius','Vinicius Junior':'vinicius','V. Júnior':'vinicius',
  'Michael Olise':'olise','M. Olise':'olise',
  'Federico Valverde':'valverde','F. Valverde':'valverde',
  'Jude Bellingham':'bellingham','J. Bellingham':'bellingham',
  'Julián Álvarez':'alvarez','Julian Alvarez':'alvarez','J. Álvarez':'alvarez',
  'Marcus Rashford':'rashford','M. Rashford':'rashford',
  'Kylian Mbappé':'mbappe','Kylian Mbappe':'mbappe','K. Mbappé':'mbappe',
  'Neymar':'neymar','Neymar Jr':'neymar',
  'Eberechi Eze':'eze','E. Eze':'eze',
  'Florian Wirtz':'wirtz','F. Wirtz':'wirtz',
  'Christian Pulisic':'pulisic','C. Pulisic':'pulisic',
  'Sadio Mané':'mane','Sadio Mane':'mane','S. Mané':'mane',
};

// ── Team name → our team ID ───────────────────────────────────────────────────
const TEAM_NAME_MAP = {
  'France':'FRA','Spain':'ESP','Argentina':'ARG','England':'ENG',
  'Portugal':'POR','Brazil':'BRA','Netherlands':'NED','Morocco':'MAR',
  'Belgium':'BEL','Germany':'GER','Croatia':'CRO','Colombia':'COL',
  'Senegal':'SEN','Mexico':'MEX','United States':'USA','Uruguay':'URU',
  'Japan':'JPN','Switzerland':'SUI','Iran':'IRN','Austria':'AUT',
  'Ecuador':'ECU','South Korea':'KOR','Australia':'AUS','Egypt':'EGY',
  'Canada':'CAN','Ivory Coast':'CIV','Qatar':'QAT','Algeria':'ALG',
  'Sweden':'SWE','Tunisia':'TUN','Czech Republic':'CZE','Czechia':'CZE',
  'Turkey':'TUR','Norway':'NOR','Scotland':'SCO','DR Congo':'DRC',
  'Bosnia':'BIH','Panama':'PAN','Saudi Arabia':'KSA','South Africa':'RSA',
  'Iraq':'IRQ','Ghana':'GHA','Paraguay':'PAR','New Zealand':'NZL',
  'Jordan':'JOR','Haiti':'HTI','Cape Verde':'CPV','Cabo Verde':'CPV',
  'Uzbekistan':'UZB','Curacao':'CUW','Curaçao':'CUW',
};

// ── Fetch via Netlify proxy ───────────────────────────────────────────────────
async function apiFetch(endpoint) {
  try {
    const res  = await fetch(`/.netlify/functions/api-football?endpoint=${encodeURIComponent(endpoint)}`);
    const data = await res.json();
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('[API] Error:', data.errors);
      return null;
    }
    return data.response || [];
  } catch (err) {
    console.error('[API] Fetch failed:', err);
    return null;
  }
}

// ── Fetch completed fixtures for a date ───────────────────────────────────────
export async function fetchCompletedFixtures(date) {
  const d = date || new Date().toISOString().split('T')[0];
  console.log(`[API] Fetching fixtures for ${d}`);
  const response = await apiFetch(
    `/fixtures?league=${WC_LEAGUE}&season=${WC_SEASON}&date=${d}&status=FT`
  );
  if (!response) return [];
  return response.map(f => ({
    fixtureId: f.fixture.id,
    homeTeam:  TEAM_NAME_MAP[f.teams.home.name] || f.teams.home.name,
    awayTeam:  TEAM_NAME_MAP[f.teams.away.name] || f.teams.away.name,
    homeScore: f.goals.home ?? 0,
    awayScore: f.goals.away ?? 0,
  }));
}

// ── Fetch goal/assist events for a fixture ────────────────────────────────────
export async function fetchFixtureEvents(fixtureId) {
  const response = await apiFetch(`/fixtures/events?fixture=${fixtureId}`);
  if (!response) return { goals: [], assists: [] };

  const goals = [], assists = [];
  response.forEach(e => {
    if (e.type !== 'Goal' || e.detail === 'Missed Penalty' || e.detail === 'Own Goal') return;
    const playerId = PLAYER_NAME_MAP[e.player?.name];
    if (playerId) goals.push(playerId);
    else console.log(`[API] Unmatched scorer: "${e.player?.name}"`);
    const assistId = PLAYER_NAME_MAP[e.assist?.name];
    if (assistId) assists.push(assistId);
    else if (e.assist?.name) console.log(`[API] Unmatched assist: "${e.assist?.name}"`);
  });
  return { goals, assists };
}

// ── Main update — call this from your admin panel ─────────────────────────────
export async function runApiUpdate(date) {
  console.log('[API] Starting update...');

  const fixtures = await fetchCompletedFixtures(date);
  if (!fixtures.length) {
    console.log('[API] No completed fixtures found');
    return { updated: 0, message: 'No completed fixtures found' };
  }

  console.log(`[API] Found ${fixtures.length} completed fixture(s)`);

  const pstatsRef  = doc(db, 'league', 'pstats');
  const scoresRef  = doc(db, 'league', 'scores');
  const pstatsSnap = await getDoc(pstatsRef);
  const scoresSnap = await getDoc(scoresRef);

  const playerStats = pstatsSnap.exists() ? pstatsSnap.data() : {};
  const matchScores = scoresSnap.exists()  ? scoresSnap.data() : {};

  let updatedCount = 0;

  for (const fixture of fixtures) {
    const key = `${fixture.homeTeam}_${fixture.awayTeam}`;

    if (matchScores[key]?.processed) {
      console.log(`[API] Already processed: ${key}`);
      continue;
    }

    console.log(`[API] Processing ${fixture.homeTeam} ${fixture.homeScore}-${fixture.awayScore} ${fixture.awayTeam}`);

    matchScores[key] = {
      homeTeam:  fixture.homeTeam,
      awayTeam:  fixture.awayTeam,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      played:    true,
      processed: true,
    };

    const { goals, assists } = await fetchFixtureEvents(fixture.fixtureId);

    goals.forEach(id => {
      if (!playerStats[id]) playerStats[id] = { goals: 0, assists: 0, cleanSheets: 0 };
      playerStats[id].goals += 1;
    });

    assists.forEach(id => {
      if (!playerStats[id]) playerStats[id] = { goals: 0, assists: 0, cleanSheets: 0 };
      playerStats[id].assists += 1;
    });

    updatedCount++;
  }

  await setDoc(pstatsRef, playerStats);
  await setDoc(scoresRef, matchScores);

  console.log(`[API] Done — ${updatedCount} fixture(s) processed`);
  return { updated: updatedCount, message: `${updatedCount} fixture(s) processed successfully` };
}
