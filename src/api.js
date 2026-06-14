// ─── API-FOOTBALL INTEGRATION ─────────────────────────────────────────────────
// Uses api-football.com directly (not RapidAPI)
// Free tier: 100 calls/day
// Call runApiUpdate() from your admin panel or on a schedule

import { db } from './firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const API_KEY    = import.meta.env.VITE_API_FOOTBALL_KEY;
const BASE_URL   = 'https://v3.football.api-sports.io';
const WC_LEAGUE  = 1;
const WC_SEASON  = 2026;

// ── Player name → our player ID ───────────────────────────────────────────────
const PLAYER_NAME_MAP = {
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
  'Canada':'CAN','Ivory Coast':'CIV','Qatar':'QAT','Al
