import { useState, useEffect, useCallback } from 'react';
import { ROSTERS, ALL_TEAMS, GROUP_STAGE, SCORING, ADMIN_PASSWORD } from './data/rosters.js';
import { calcTeamPoints, calcPlayerPoints, calcRosterPoints } from './utils/scoring.js';
import { db } from './firebase.js';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { runApiUpdate } from './api.js';
import { MatchDayLogger } from './MatchDayLogger.jsx';

// ─── FIRESTORE HELPERS ────────────────────────────────────────────────────────
const DOCS = {
  meta:   () => doc(db, 'league', 'meta'),
  scores: () => doc(db, 'league', 'scores'),
  adv:    () => doc(db, 'league', 'adv'),
  pstats: () => doc(db, 'league', 'pstats'),
};

async function loadState() {
  try {
    const [meta, scores, adv, pstats] = await Promise.all([
      getDoc(DOCS.meta()),
      getDoc(DOCS.scores()),
      getDoc(DOCS.adv()),
      getDoc(DOCS.pstats()),
    ]);
    const init = buildInitialState();
    return {
      teamNames:    meta.exists()   ? meta.data()   : init.teamNames,
      matches:      scores.exists() ? mergeMatches(init.matches, scores.data()) : init.matches,
      advancements: adv.exists()    ? adv.data()    : {},
      playerStats:  pstats.exists() ? pstats.data() : {},
    };
  } catch (err) {
    console.error('[loadState] failed:', err);
    return buildInitialState();
  }
}

function mergeMatches(initial, saved) {
  return initial.map(m => saved[m.id] ? { ...m, ...saved[m.id] } : m);
}

async function saveState(newState) {
  try {
    const matchMap = {};
    newState.matches.forEach(m => {
      matchMap[m.id] = {
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        played:    m.played,
      };
    });
    // Only save plain serializable data — no Firestore objects
    const teamNames    = JSON.parse(JSON.stringify(newState.teamNames));
    const advancements = JSON.parse(JSON.stringify(newState.advancements));
    const playerStats  = JSON.parse(JSON.stringify(newState.playerStats));
    await Promise.all([
      setDoc(DOCS.meta(),   teamNames),
      setDoc(DOCS.scores(), matchMap),
      setDoc(DOCS.adv(),    advancements),
      setDoc(DOCS.pstats(), playerStats),
    ]);
  } catch (err) {
    console.error('[saveState] failed:', err);
  }
}

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
function buildInitialState() {
  return {
    teamNames:    Object.fromEntries(ROSTERS.map(r => [r.slot, `Slot ${r.slot}`])),
    matches:      GROUP_STAGE.map(m => ({ ...m, homeId: m.home, awayId: m.away, homeScore: 0, awayScore: 0, played: false })),
    advancements: {},
    playerStats:  {},
  };
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  bg: '#07080f', surface: '#0f1623', card: '#111d2e', card2: '#162030',
  border: '#1e2d42', dim: '#2a3a52', accent: '#00c8ff', gold: '#f5c400',
  green: '#22c55e', red: '#f43f5e', text: '#dde4f0', muted: '#4d6070',
  teamBg: '#05111f', plyBg: '#140f05',
};

const css = `
  .app { display:flex; flex-direction:column; min-height:100vh; }

  /* Header */
  .hdr { background:${S.surface}; border-bottom:1px solid ${S.border}; padding:0 20px;
    height:54px; display:flex; align-items:center; gap:14px; position:sticky; top:0; z-index:200; }
  .logo { font-family:'Bebas Neue',sans-serif; font-size:26px; letter-spacing:2px; color:${S.accent}; }
  .logo span { color:${S.gold}; }
  .logo-sub { font-size:11px; color:${S.muted}; font-weight:600; letter-spacing:1px; margin-top:2px; }
  .nav { display:flex; gap:3px; margin-left:auto; }
  .nav-btn { background:none; border:none; color:${S.muted}; padding:7px 14px; border-radius:6px;
    font-size:13px; font-weight:500; cursor:pointer; transition:all .15s; white-space:nowrap; }
  .nav-btn:hover { color:${S.text}; background:${S.card2}; }
  .nav-btn.on { color:${S.accent}; background:rgba(0,200,255,.1); }

  /* Page */
  .page { max-width:1200px; margin:0 auto; padding:24px 16px 80px; }
  .ttl { font-family:'Bebas Neue',sans-serif; font-size:28px; letter-spacing:1px; margin-bottom:4px; }
  .sub { color:${S.muted}; font-size:13px; margin-bottom:22px; }

  /* Cards */
  .card { background:${S.card}; border:1px solid ${S.border}; border-radius:10px; padding:18px; margin-bottom:14px; }
  .card-ttl { font-family:'Bebas Neue',sans-serif; font-size:16px; letter-spacing:1px;
    color:${S.accent}; margin-bottom:12px; }

  /* Buttons */
  .btn { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:7px;
    font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all .15s; }
  .btn-p { background:${S.accent}; color:#000; }
  .btn-p:hover { background:#33d4ff; }
  .btn-g { background:none; color:${S.muted}; border:1px solid ${S.border}; }
  .btn-g:hover { border-color:${S.accent}; color:${S.accent}; }
  .btn-r { background:none; color:${S.red}; border:1px solid ${S.red}; }
  .btn-r:hover { background:rgba(244,63,94,.1); }
  .btn-gold { background:none; color:${S.gold}; border:1px solid ${S.gold}; }
  .btn-gold:hover { background:rgba(245,196,0,.1); }
  .btn-sm { padding:5px 11px; font-size:12px; }

  /* Inputs */
  .inp { background:${S.card2}; border:1px solid ${S.border}; color:${S.text};
    border-radius:7px; padding:7px 11px; font-size:13px; width:100%; transition:border .15s; }
  .inp:focus { outline:none; border-color:${S.accent}; }
  .inp-sm { width:56px; text-align:center; }
  .inp-name { background:transparent; border:none; border-bottom:1px dashed ${S.dim};
    color:${S.text}; font-size:15px; font-weight:700; font-family:'Bebas Neue',sans-serif;
    letter-spacing:1px; padding:2px 4px; width:100%; }
  .inp-name:focus { outline:none; border-bottom-color:${S.accent}; }
  .inp-name:read-only { cursor:default; }
  select.inp { cursor:pointer; }

  /* Grids */
  .g2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .g3 { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:12px; }
  @media(max-width:640px) { .g2{grid-template-columns:1fr} .nav{display:none} }

  /* Roster cards */
  .roster-card { background:${S.card}; border:1px solid ${S.border}; border-radius:10px; padding:16px; }
  .roster-hdr { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px; }
  .roster-slot { font-size:10px; color:${S.muted}; font-weight:600; letter-spacing:1px; }
  .roster-pts { font-family:'Bebas Neue',sans-serif; font-size:32px; color:${S.accent}; line-height:1; }
  .roster-pts-lbl { font-size:9px; color:${S.muted}; text-align:right; }
  .pick-row { display:flex; align-items:center; gap:8px; border-radius:6px; padding:7px 10px;
    margin-bottom:5px; font-size:12px; }
  .pick-team { background:${S.teamBg}; }
  .pick-ply  { background:${S.plyBg}; }
  .badge { display:inline-block; font-size:9px; font-weight:700; letter-spacing:.5px;
    padding:2px 5px; border-radius:3px; flex-shrink:0; }
  .b-t { background:rgba(0,200,255,.12); color:${S.accent}; }
  .b-p { background:rgba(245,196,0,.12); color:${S.gold}; }
  .pick-pts { margin-left:auto; font-weight:700; font-size:13px; color:${S.green}; flex-shrink:0; }
  .edit-icon { background:none; border:none; color:${S.muted}; cursor:pointer; font-size:13px;
    padding:2px 4px; border-radius:4px; flex-shrink:0; }
  .edit-icon:hover { color:${S.accent}; }

  /* Leaderboard */
  .lb-row { display:flex; align-items:center; gap:14px; background:${S.card};
    border:1px solid ${S.border}; border-radius:9px; padding:12px 16px; margin-bottom:7px;
    cursor:pointer; transition:border-color .15s; }
  .lb-row:hover, .lb-row.open { border-color:${S.accent}; }
  .lb-rank { font-family:'Bebas Neue',sans-serif; font-size:28px; width:30px; flex-shrink:0; }
  .lb-rank.g{color:${S.gold}} .lb-rank.s{color:#b0c4d8} .lb-rank.b{color:#cd7f32}
  .lb-name { font-family:'Bebas Neue',sans-serif; font-size:20px; letter-spacing:.5px; flex:1; min-width:0; }
  .lb-picks { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
  .lb-pick-chip { font-size:11px; color:${S.muted}; white-space:nowrap; }
  .lb-pts { font-family:'Bebas Neue',sans-serif; font-size:32px; color:${S.accent}; line-height:1; }
  .lb-pts-lbl { font-size:9px; color:${S.muted}; text-align:right; }
  .expand-icon { color:${S.muted}; font-size:11px; flex-shrink:0; }
  .detail-box { background:${S.card2}; border:1px solid ${S.dim}; border-top:none;
    border-radius:0 0 9px 9px; padding:14px 16px; margin-top:-7px; margin-bottom:7px; }

  /* Results */
  .match-row { display:grid; grid-template-columns:1fr auto 1fr; align-items:center;
    gap:10px; background:${S.card2}; border:1px solid ${S.border}; border-radius:7px;
    padding:10px 14px; margin-bottom:6px; }
  .m-team { display:flex; align-items:center; gap:7px; font-weight:600; font-size:13px; }
  .m-team.away { flex-direction:row-reverse; text-align:right; }
  .m-score { display:flex; align-items:center; gap:6px; font-family:'Bebas Neue',sans-serif; font-size:20px; }
  .adv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:6px; margin-top:10px; }
  .adv-item { display:flex; align-items:center; gap:7px; background:${S.card2};
    border:1px solid ${S.border}; border-radius:7px; padding:7px 10px; }
  .tog { width:34px; height:18px; border-radius:9px; border:none; cursor:pointer;
    position:relative; transition:background .2s; flex-shrink:0; }
  .tog.on { background:${S.green}; } .tog.off { background:${S.dim}; }
  .tog::after { content:''; position:absolute; width:12px; height:12px; border-radius:50%;
    background:#fff; top:3px; transition:left .18s; }
  .tog.on::after { left:19px; } .tog.off::after { left:3px; }
  .stat-hdr { display:grid; grid-template-columns:1fr 64px 64px 90px; gap:4px;
    font-size:10px; color:${S.muted}; font-weight:700; letter-spacing:.5px;
    text-transform:uppercase; padding:0 8px 8px; }
  .stat-row { display:grid; grid-template-columns:1fr 64px 64px 90px; align-items:center;
    gap:4px; padding:7px 8px; border-bottom:1px solid ${S.dim}; }
  .stat-row:last-child { border-bottom:none; }

  /* Notices */
  .notice { background:rgba(0,200,255,.07); border:1px solid rgba(0,200,255,.25);
    border-radius:8px; padding:11px 15px; font-size:13px; color:${S.accent}; margin-bottom:14px; }
  .warn { background:rgba(245,196,0,.07); border:1px solid rgba(245,196,0,.25);
    border-radius:8px; padding:11px 15px; font-size:13px; color:${S.gold}; margin-bottom:14px; }
  .success { background:rgba(34,197,94,.07); border:1px solid rgba(34,197,94,.25);
    border-radius:8px; padding:11px 15px; font-size:13px; color:${S.green}; margin-bottom:14px; }
  .error { background:rgba(244,63,94,.07); border:1px solid rgba(244,63,94,.25);
    border-radius:8px; padding:11px 15px; font-size:13px; color:${S.red}; margin-bottom:14px; }

  /* Admin */
  .admin-badge { background:rgba(244,63,94,.15); color:${S.red}; border:1px solid ${S.red};
    border-radius:5px; font-size:10px; font-weight:700; letter-spacing:1px; padding:2px 7px; }

  /* Score ref */
  .score-ref { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .score-item { display:flex; justify-content:space-between; font-size:12px;
    padding:4px 0; border-bottom:1px solid ${S.dim}; }
  .score-item:last-child { border-bottom:none; }

  /* Mobile nav */
  .mob-bar { display:none; }
  @media(max-width:640px) {
    .mob-bar { display:flex; position:fixed; bottom:0; left:0; right:0; background:${S.surface};
      border-top:1px solid ${S.border}; z-index:200; }
    .mob-tab { flex:1; display:flex; flex-direction:column; align-items:center;
      padding:9px 4px 5px; font-size:9px; color:${S.muted}; border:none; background:none; cursor:pointer; gap:2px; }
    .mob-tab.on { color:${S.accent}; }
    .mob-icon { font-size:17px; }
    .page { padding-bottom:76px; }
  }

  /* Admin modal */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:500;
    display:flex; align-items:center; justify-content:center; }
  .modal { background:${S.card}; border:1px solid ${S.border}; border-radius:12px;
    padding:24px; width:340px; max-width:90vw; }
  .modal-ttl { font-family:'Bebas Neue',sans-serif; font-size:20px; color:${S.accent}; margin-bottom:16px; }

  /* Group label */
  .grp-lbl { font-size:10px; font-weight:700; color:${S.muted}; letter-spacing:1px;
    text-transform:uppercase; margin:12px 0 5px; }

  /* Tab pills */
  .tab-pills { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; }

  /* API panel */
  .api-panel { background:${S.card}; border:1px solid ${S.border}; border-radius:10px;
    padding:18px; margin-bottom:20px; }
  .api-panel-ttl { font-family:'Bebas Neue',sans-serif; font-size:16px; letter-spacing:1px;
    color:${S.gold}; margin-bottom:10px; }
`;

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,        setTab]        = useState('standings');
  const [state,      setState]      = useState(buildInitialState);
  const [isAdmin,    setIsAdmin]    = useState(false);
  const [showLogin,  setShowLogin]  = useState(false);
  const [pwInput,    setPwInput]    = useState('');
  const [pwError,    setPwError]    = useState('');
  const [expanded,   setExpanded]   = useState(null);
  const [stageTab,   setStageTab]   = useState('ro16');
  const [resultTab,  setResultTab]  = useState('matches');
  const [mSearch,    setMSearch]    = useState('');
  const [pSearch,    setPSearch]    = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [apiStatus,  setApiStatus]  = useState('');
  const [apiDate,    setApiDate]    = useState(new Date().toISOString().split('T')[0]);
  const [apiLoading, setApiLoading] = useState(false);

  // Load from Firestore on mount + subscribe to real-time updates
  useEffect(() => {
    loadState().then(saved => { if (saved) setState(saved); });

    // Real-time listener on pstats (player stats update most frequently)
    const unsub = onSnapshot(doc(db, 'league', 'pstats'), snap => {
      if (snap.exists()) {
        setState(prev => ({ ...prev, playerStats: snap.data() }));
      }
    });
    return unsub;
  }, []);

  // Persist state changes to Firestore
  const persist = useCallback(async (newState) => {
    setState(newState);
    setSaveStatus('saving…');
    await saveState(newState);
    setSaveStatus('saved ✓');
    setTimeout(() => setSaveStatus(''), 2000);
  }, []);

  // ── API Update handler ─────────────────────────────────────────────────────
  async function handleApiUpdate() {
    setApiLoading(true);
    setApiStatus('');
    try {
      const result = await runApiUpdate(apiDate);
      if (result.updated > 0) {
        // Reload state from Firestore to reflect new data
        const fresh = await loadState();
        setState(fresh);
        setApiStatus(`✅ ${result.message}`);
      } else {
        setApiStatus(`ℹ️ ${result.message}`);
      }
    } catch (err) {
      console.error('[API] Update failed:', err);
      setApiStatus(`❌ Update failed: ${err.message}`);
    }
    setApiLoading(false);
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const sorted = [...ROSTERS].sort((a, b) =>
    calcRosterPoints(b, state.matches, state.advancements, state.playerStats) -
    calcRosterPoints(a, state.matches, state.advancements, state.playerStats)
  );

  function rPts(roster) {
    return calcRosterPoints(roster, state.matches, state.advancements, state.playerStats);
  }

  function teamPts(teamId) {
    return calcTeamPoints(teamId, state.matches, state.advancements);
  }

  function playerPts(playerId) {
    return calcPlayerPoints(playerId, state.playerStats);
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  function tryLogin() {
    if (pwInput === ADMIN_PASSWORD) {
      setIsAdmin(true); setShowLogin(false); setPwInput(''); setPwError('');
    } else {
      setPwError('Incorrect password.');
    }
  }

  // ── State mutators ─────────────────────────────────────────────────────────
  function setTeamName(slot, name) {
    persist({ ...state, teamNames: { ...state.teamNames, [slot]: name } });
  }

  function updateScore(matchId, field, val) {
    const matches = state.matches.map(m =>
      m.id === matchId ? { ...m, [field]: Math.max(0, parseInt(val) || 0), played: true } : m
    );
    persist({ ...state, matches });
  }

  function toggleAdv(teamId, stage) {
    const prev = state.advancements[teamId] || {};
    persist({
      ...state,
      advancements: {
        ...state.advancements,
        [teamId]: { ...prev, [stage]: !prev[stage] },
      },
    });
  }

  function updateStat(playerId, stat, val) {
    const prev = state.playerStats[playerId] || { goals: 0, assists: 0, cleanSheets: 0 };
    persist({
      ...state,
      playerStats: {
        ...state.playerStats,
        [playerId]: { ...prev, [stat]: Math.max(0, parseInt(val) || 0) },
      },
    });
  }

  const TABS = [
    { id: 'standings', l: 'Standings', ic: '🏆' },
    { id: 'rosters',   l: 'Rosters',   ic: '🗂️' },
    { id: 'results',   l: 'Results',   ic: '⚽' },
    { id: 'scoring',   l: 'Scoring',   ic: '📋' },
    { id: 'logger',    l: 'Logger',    ic: '📝' },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* ── Header ── */}
        <header className="hdr">
          <div>
            <div className="logo">WC26 <span>⚽</span> FANTASY</div>
            <div className="logo-sub">13-TEAM LEAGUE</div>
          </div>
          <nav className="nav">
            {TABS.map(t => (
              <button key={t.id} className={`nav-btn${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
                {t.l}
              </button>
            ))}
          </nav>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveStatus && <span style={{ fontSize: 11, color: S.muted }}>{saveStatus}</span>}
            {isAdmin ? (
              <button className="btn btn-sm btn-r" onClick={() => setIsAdmin(false)}>
                🔓 Admin — Sign Out
              </button>
            ) : (
              <button className="btn btn-sm btn-g" onClick={() => setShowLogin(true)}>
                🔒 Admin
              </button>
            )}
          </div>
        </header>

        {/* ── Pages ── */}
        <div className="page">

          {/* ── Admin API Panel (shown on all tabs when admin) ── */}
          {isAdmin && (
            <div className="api-panel">
              <div className="api-panel-ttl">⚡ API-Football Auto-Update</div>
              <p style={{ fontSize: 12, color: S.muted, marginBottom: 12 }}>
                Pull today's completed World Cup matches and automatically update scores and player stats.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  className="inp"
                  style={{ width: 160 }}
                  value={apiDate}
                  onChange={e => setApiDate(e.target.value)}
                />
                <button
                  className="btn btn-gold"
                  onClick={handleApiUpdate}
                  disabled={apiLoading}
                >
                  {apiLoading ? '⏳ Fetching…' : '🔄 Fetch & Update'}
                </button>
              </div>
              {apiStatus && (
                <div style={{ marginTop: 10, fontSize: 13,
                  color: apiStatus.startsWith('✅') ? S.green : apiStatus.startsWith('❌') ? S.red : S.gold }}>
                  {apiStatus}
                </div>
              )}
            </div>
          )}

          {tab === 'standings' && (
            <StandingsTab
              sorted={sorted} state={state} isAdmin={isAdmin}
              rPts={rPts} teamPts={teamPts} playerPts={playerPts}
              expanded={expanded} setExpanded={setExpanded}
              setTeamName={setTeamName}
            />
          )}
          {tab === 'rosters' && (
            <RostersTab
              state={state} isAdmin={isAdmin}
              teamPts={teamPts} playerPts={playerPts} rPts={rPts}
              setTeamName={setTeamName}
            />
          )}
          {tab === 'results' && (
            <ResultsTab
              state={state} isAdmin={isAdmin}
              resultTab={resultTab} setResultTab={setResultTab}
              stageTab={stageTab} setStageTab={setStageTab}
              mSearch={mSearch} setMSearch={setMSearch}
              pSearch={pSearch} setPSearch={setPSearch}
              updateScore={updateScore} toggleAdv={toggleAdv} updateStat={updateStat}
            />
          )}
          {tab === 'scoring' && <ScoringTab />}
          {tab === 'logger' && (
            <MatchDayLogger
              state={state}
              isAdmin={isAdmin}
              persist={persist}
            />
          )}
        </div>

        {/* ── Mobile nav ── */}
        <nav className="mob-bar">
          {TABS.map(t => (
            <button key={t.id} className={`mob-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
              <span className="mob-icon">{t.ic}</span>{t.l}
            </button>
          ))}
        </nav>

        {/* ── Admin login modal ── */}
        {showLogin && (
          <div className="modal-overlay" onClick={() => setShowLogin(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-ttl">🔒 Admin Login</div>
              <p style={{ fontSize: 12, color: S.muted, marginBottom: 16 }}>
                Enter the admin password to unlock score entry and team renaming.
              </p>
              <input
                className="inp" type="password" placeholder="Password"
                value={pwInput} onChange={e => setPwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && tryLogin()}
                autoFocus
                style={{ marginBottom: 8 }}
              />
              {pwError && <p style={{ color: S.red, fontSize: 12, marginBottom: 8 }}>{pwError}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn-p" style={{ flex: 1 }} onClick={tryLogin}>Sign In</button>
                <button className="btn btn-g" onClick={() => { setShowLogin(false); setPwInput(''); setPwError(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── STANDINGS TAB ────────────────────────────────────────────────────────────
function StandingsTab({ sorted, state, isAdmin, rPts, teamPts, playerPts, expanded, setExpanded, setTeamName }) {
  const rankClass = i => ['g', 's', 'b'][i] || '';

  return (
    <div>
      <div className="ttl">Live Standings</div>
      <div className="sub">Tap any row to expand picks and point breakdown.</div>
      {sorted.map((roster, rank) => {
        const pts  = rPts(roster);
        const name = state.teamNames[roster.slot] || `Slot ${roster.slot}`;
        const open = expanded === roster.slot;
        const adv  = state.advancements;
        return (
          <div key={roster.slot}>
            <div className={`lb-row${open ? ' open' : ''}`} onClick={() => setExpanded(open ? null : roster.slot)}>
              <div className={`lb-rank ${rankClass(rank)}`}>{rank + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {isAdmin ? (
                  <input
                    className="inp-name" value={name}
                    onChange={e => setTeamName(roster.slot, e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="lb-name">{name}</div>
                )}
                <div className="lb-picks" style={{ marginTop: 3 }}>
                  {roster.teams.map(t => (
                    <span key={t.id} className="lb-pick-chip">{t.flag} {t.name}</span>
                  ))}
                  {roster.players.map(p => (
                    <span key={p.id} className="lb-pick-chip">· {p.name}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="lb-pts">{pts}</div>
                <div className="lb-pts-lbl">PTS</div>
              </div>
              <span className="expand-icon">{open ? '▲' : '▼'}</span>
            </div>
            {open && (
              <div className="detail-box">
                <div className="g2">
                  <div>
                    <div style={{ fontSize: 11, color: S.accent, fontWeight: 700, letterSpacing: '.5px', marginBottom: 8 }}>TEAMS</div>
                    {roster.teams.map(t => {
                      const tp = teamPts(t.id);
                      const a  = adv[t.id] || {};
                      return (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: 12 }}>
                          <span style={{ fontSize: 16 }}>{t.flag}</span>
                          <span style={{ flex: 1, fontWeight: 600 }}>{t.name}</span>
                          <span style={{ fontSize: 10, color: S.green, display: 'flex', gap: 4 }}>
                            {a.ro16 && <span>R16</span>}{a.qf && <span>QF</span>}
                            {a.sf && <span>SF</span>}{a.champion && <span>🏆</span>}
                          </span>
                          <span style={{ color: S.green, fontWeight: 700, minWidth: 36, textAlign: 'right' }}>{tp} pts</span>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: S.gold, fontWeight: 700, letterSpacing: '.5px', marginBottom: 8 }}>PLAYERS</div>
                    {roster.players.map(p => {
                      const pp = playerPts(p.id);
                      const s  = state.playerStats[p.id] || { goals: 0, assists: 0, cleanSheets: 0 };
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: 12 }}>
                          <span style={{ fontSize: 16 }}>{p.flag}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: S.muted }}>{s.goals}G · {s.assists}A · {s.cleanSheets}CS</div>
                          </div>
                          <span style={{ color: S.green, fontWeight: 700, minWidth: 36, textAlign: 'right' }}>{pp} pts</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ROSTERS TAB ──────────────────────────────────────────────────────────────
function RostersTab({ state, isAdmin, teamPts, playerPts, rPts, setTeamName }) {
  return (
    <div>
      <div className="ttl">All Rosters</div>
      <div className="sub">
        3 national teams + 3 players per slot.
        {isAdmin && <span style={{ color: S.gold }}> Admin: click any team name to rename.</span>}
      </div>
      <div className="g3">
        {ROSTERS.map(roster => {
          const pts  = rPts(roster);
          const name = state.teamNames[roster.slot] || `Slot ${roster.slot}`;
          return (
            <div key={roster.slot} className="roster-card">
              <div className="roster-hdr">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="roster-slot">SLOT {roster.slot} · DRAFT SPOT #{roster.draftSpot}</div>
                  {isAdmin ? (
                    <input
                      className="inp-name" value={name}
                      onChange={e => setTeamName(roster.slot, e.target.value)}
                      style={{ marginTop: 2 }}
                    />
                  ) : (
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: '.5px', marginTop: 2 }}>
                      {name}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', marginLeft: 8 }}>
                  <div className="roster-pts">{pts}</div>
                  <div className="roster-pts-lbl">PTS</div>
                </div>
              </div>
              {roster.teams.map(t => {
                const tp = teamPts(t.id);
                return (
                  <div key={t.id} className="pick-row pick-team">
                    <span className="badge b-t">TEAM</span>
                    <span style={{ fontSize: 17 }}>{t.flag}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</span>
                    <span style={{ fontSize: 10, color: S.muted }}>Grp {t.group}</span>
                    <span className="pick-pts">+{tp}</span>
                  </div>
                );
              })}
              {roster.players.map(p => {
                const pp = playerPts(p.id);
                return (
                  <div key={p.id} className="pick-row pick-ply">
                    <span className="badge b-p">PLAYER</span>
                    <span style={{ fontSize: 17 }}>{p.flag}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                    <span style={{ fontSize: 10, color: S.muted }}>{p.pos}</span>
                    <span className="pick-pts">+{pp}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RESULTS TAB ──────────────────────────────────────────────────────────────
function ResultsTab({
  state, isAdmin, resultTab, setResultTab, stageTab, setStageTab,
  mSearch, setMSearch, pSearch, setPSearch,
  updateScore, toggleAdv, updateStat,
}) {
  const STAGES = [
    { id: 'ro16', l: 'Round of 16' }, { id: 'qf', l: 'Quarterfinals' },
    { id: 'sf',   l: 'Semifinals' },  { id: 'champion', l: 'Champion' },
  ];

  const allPlayers = ROSTERS.flatMap(r => r.players)
    .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);

  const filteredMatches = state.matches.filter(m => {
    if (!mSearch) return true;
    const s  = mSearch.toLowerCase();
    const hn = ALL_TEAMS.find(t => t.id === m.homeId)?.name || '';
    const an = ALL_TEAMS.find(t => t.id === m.awayId)?.name || '';
    return hn.toLowerCase().includes(s) || an.toLowerCase().includes(s) || `group ${m.group}`.toLowerCase().includes(s);
  });

  const filteredPlayers = allPlayers.filter(p =>
    !pSearch || p.name.toLowerCase().includes(pSearch.toLowerCase())
  );

  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];

  return (
    <div>
      <div className="ttl">Results & Stats</div>
      <div className="sub">
        {isAdmin
          ? 'Admin mode — enter scores, advancements, and player stats below.'
          : 'View-only mode. Sign in as admin to enter results.'}
      </div>
      {!isAdmin && (
        <div className="notice">🔒 Results are entered by the league admin. Check back for live updates.</div>
      )}

      <div className="tab-pills">
        {[{ id: 'matches', l: '⚽ Scores' }, { id: 'adv', l: '🏆 Advancements' }, { id: 'players', l: '👤 Player Stats' }]
          .map(t => (
            <button key={t.id} className={`btn btn-sm ${resultTab === t.id ? 'btn-p' : 'btn-g'}`}
              onClick={() => setResultTab(t.id)}>{t.l}</button>
          ))}
      </div>

      {/* ── Scores ── */}
      {resultTab === 'matches' && (
        <div>
          <input className="inp" placeholder="Search by team or group…" value={mSearch}
            onChange={e => setMSearch(e.target.value)} style={{ marginBottom: 14 }} />
          {groups.map(grp => {
            const gms = filteredMatches.filter(m => m.group === grp);
            if (!gms.length) return null;
            return (
              <div key={grp}>
                <div className="grp-lbl">Group {grp}</div>
                {gms.map(m => {
                  const H = ALL_TEAMS.find(t => t.id === m.homeId);
                  const A = ALL_TEAMS.find(t => t.id === m.awayId);
                  return (
                    <div key={m.id} className="match-row">
                      <div className="m-team">
                        <span style={{ fontSize: 18 }}>{H?.flag}</span>
                        <span>{H?.name}</span>
                      </div>
                      <div className="m-score">
                        <input className="inp inp-sm" type="number" min="0" value={m.homeScore}
                          onChange={e => isAdmin && updateScore(m.id, 'homeScore', e.target.value)}
                          readOnly={!isAdmin} />
                        <span style={{ color: S.muted }}>–</span>
                        <input className="inp inp-sm" type="number" min="0" value={m.awayScore}
                          onChange={e => isAdmin && updateScore(m.id, 'awayScore', e.target.value)}
                          readOnly={!isAdmin} />
                      </div>
                      <div className="m-team away">
                        <span style={{ fontSize: 18 }}>{A?.flag}</span>
                        <span>{A?.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Advancements ── */}
      {resultTab === 'adv' && (
        <div>
          <div className="tab-pills">
            {STAGES.map(s => (
              <button key={s.id} className={`btn btn-sm ${stageTab === s.id ? 'btn-p' : 'btn-g'}`}
                onClick={() => setStageTab(s.id)}>{s.l}</button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: S.muted, marginBottom: 12 }}>
            Toggle on for each team that advances to this round. +1pt R16, +1pt QF, +2pts SF, +3pts Champion.
          </p>
          <div className="adv-grid">
            {ALL_TEAMS.map(t => (
              <div key={t.id} className="adv-item">
                <span style={{ fontSize: 17 }}>{t.flag}</span>
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{t.name}</span>
                <button
                  className={`tog ${state.advancements[t.id]?.[stageTab] ? 'on' : 'off'}`}
                  onClick={() => isAdmin && toggleAdv(t.id, stageTab)}
                  disabled={!isAdmin}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Player Stats ── */}
      {resultTab === 'players' && (
        <div>
          <input className="inp" placeholder="Search player…" value={pSearch}
            onChange={e => setPSearch(e.target.value)} style={{ marginBottom: 12 }} />
          <div className="stat-hdr">
            <span>Player</span><span>Goals</span><span>Assists</span><span>CS / Total</span>
          </div>
          {filteredPlayers.map(p => {
            const s   = state.playerStats[p.id] || { goals: 0, assists: 0, cleanSheets: 0 };
            const pts = s.goals * 5 + s.assists * 3 + s.cleanSheets * 3;
            return (
              <div key={p.id} className="stat-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 15 }}>{p.flag}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: S.muted }}>{p.team} · {p.pos}</div>
                  </div>
                </div>
<input className="inp inp-sm" type="number" min="0" value={s.goals}
                  onChange={e => isAdmin && updateStat(p.id, 'goals', e.target.value)}
                  readOnly={!isAdmin} />
                <input className="inp inp-sm" type="number" min="0" value={s.assists}
                  onChange={e => isAdmin && updateStat(p.id, 'assists', e.target.value)}
                  readOnly={!isAdmin} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input className="inp inp-sm" type="number" min="0" value={s.cleanSheets}
                    onChange={e => isAdmin && updateStat(p.id, 'cleanSheets', e.target.value)}
                    readOnly={!isAdmin} />
                  <span style={{ fontSize: 11, color: S.green, fontWeight: 700 }}>=<b>{pts}</b>p</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SCORING TAB ──────────────────────────────────────────────────────────────
function ScoringTab() {
  return (
    <div>
      <div className="ttl">Scoring Rules</div>
      <div className="sub">How points are calculated throughout the tournament.</div>
      <div className="g2">
        <div className="card">
          <div className="card-ttl">TEAM POINTS</div>
          <div className="score-ref" style={{ gridTemplateColumns: '1fr' }}>
            {[
              ['Win a match', '+3'],
              ['Draw a match', '+1'],
              ['Advance to Round of 16', '+1'],
              ['Advance to Quarterfinals', '+1'],
              ['Advance to Semifinals', '+2'],
              ['Win the World Cup', '+3'],
            ].map(([l, v]) => (
              <div key={l} className="score-item">
                <span style={{ color: S.muted }}>{l}</span>
                <span style={{ color: S.green, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '10px 12px', background: S.card2, borderRadius: 7, fontSize: 12, color: S.muted }}>
            <strong style={{ color: S.text }}>Example:</strong> Team wins 3 group games + reaches QF = 9 (wins) + 1 (R16) + 1 (QF) = <strong style={{ color: S.green }}>11 pts</strong>
          </div>
        </div>
        <div className="card">
          <div className="card-ttl">PLAYER POINTS</div>
          <div className="score-ref" style={{ gridTemplateColumns: '1fr' }}>
            {[
              ['Goal scored', '+5'],
              ['Assist', '+3'],
              ['Goalkeeper clean sheet', '+3'],
            ].map(([l, v]) => (
              <div key={l} className="score-item">
                <span style={{ color: S.muted }}>{l}</span>
                <span style={{ color: S.green, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '10px 12px', background: S.card2, borderRadius: 7, fontSize: 12, color: S.muted }}>
            <strong style={{ color: S.text }}>Example:</strong> Mbappé scores 6G + 2A in tournament = 30 + 6 = <strong style={{ color: S.green }}>36 pts</strong>
          </div>
          <div className="notice" style={{ marginTop: 12, marginBottom: 0 }}>
            💡 <strong>Stacking tip:</strong> Drafting both a player and his national team multiplies value — team wins and player goals score simultaneously.
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-ttl">THE 13 ROSTERS AT A GLANCE</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Slot', 'Draft Spot', 'Team 1', 'Team 2', 'Team 3', 'Player 1', 'Player 2', 'Player 3'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: S.muted,
                    fontSize: 10, fontWeight: 700, letterSpacing: '.5px', borderBottom: `1px solid ${S.border}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROSTERS.map((r, i) => (
                <tr key={r.slot} style={{ background: i % 2 === 0 ? S.card2 : 'transparent' }}>
                  <td style={{ padding: '6px 8px', fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: S.accent }}>{r.slot}</td>
                  <td style={{ padding: '6px 8px', color: S.muted }}>#{r.draftSpot}</td>
                  {r.teams.map(t => (
                    <td key={t.id} style={{ padding: '6px 8px' }}>{t.flag} {t.name}</td>
                  ))}
                  {r.players.map(p => (
                    <td key={p.id} style={{ padding: '6px 8px' }}>{p.flag} {p.name}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
