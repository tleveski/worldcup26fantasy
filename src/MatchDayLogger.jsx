// ─── MATCH DAY LOGGER ─────────────────────────────────────────────────────────
// Drop this into App.jsx as a new tab component.
// Usage: <MatchDayLogger state={state} isAdmin={isAdmin} updateScore={updateScore} updateStat={updateStat} />

import { useState, useRef } from 'react';
import { ROSTERS, GROUP_STAGE, ALL_TEAMS } from './data/rosters.js';

// All 39 fantasy players for autocomplete priority
const FANTASY_PLAYERS = ROSTERS.flatMap(r => r.players)
  .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);

const S = {
  bg: '#07080f', surface: '#0f1623', card: '#111d2e', card2: '#162030',
  border: '#1e2d42', dim: '#2a3a52', accent: '#00c8ff', gold: '#f5c400',
  green: '#22c55e', red: '#f43f5e', text: '#dde4f0', muted: '#4d6070',
};

export function MatchDayLogger({ state, isAdmin, persist }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [homeScore, setHomeScore]         = useState(0);
  const [awayScore, setAwayScore]         = useState(0);
  const [events, setEvents]               = useState([]); // {playerName, playerId, type: 'goal'|'assist'}
  const [search, setSearch]               = useState('');
  const [saved, setSaved]                 = useState(false);
  const searchRef = useRef(null);

  // Parse date from match schedule e.g. "Jun 11"
  function matchDate(m) {
    const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6 };
    const [mon, day] = m.date.split(' ');
    return new Date(2026, months[mon], parseInt(day)).toISOString().split('T')[0];
  }

  const todayMatches = state.matches.filter(m => matchDate(m) === selectedDate);

  function openMatch(match) {
    const existing = state.matches.find(m => m.id === match.id);
    setSelectedMatch(match);
    setHomeScore(existing?.homeScore || 0);
    setAwayScore(existing?.awayScore || 0);
    // Pre-load existing player events from playerStats
    setEvents([]);
    setSaved(false);
    setSearch('');
  }

  // Autocomplete: fantasy players first, then typed name
  const fantasyMatches = search.length > 1
    ? FANTASY_PLAYERS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  function addEvent(type, playerName, playerId = null) {
    setEvents(prev => [...prev, { playerName, playerId, type }]);
    setSearch('');
    searchRef.current?.focus();
  }

  function removeEvent(idx) {
    setEvents(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    if (!selectedMatch || !isAdmin) return;

    // Update match scores
    const matches = state.matches.map(m =>
      m.id === selectedMatch.id
        ? { ...m, homeScore, awayScore, played: true }
        : m
    );

    // Tally goals and assists for fantasy players only
    const newPlayerStats = { ...state.playerStats };
    events.forEach(e => {
      if (!e.playerId) return;
      if (!newPlayerStats[e.playerId]) newPlayerStats[e.playerId] = { goals: 0, assists: 0, cleanSheets: 0 };
      if (e.type === 'goal')   newPlayerStats[e.playerId].goals   += 1;
      if (e.type === 'assist') newPlayerStats[e.playerId].assists += 1;
    });

    persist({ ...state, matches, playerStats: newPlayerStats });

    setSaved(true);
    setTimeout(() => {
      setSelectedMatch(null);
      setSaved(false);
    }, 1500);
  }

  const homeTeam = selectedMatch ? ALL_TEAMS.find(t => t.id === selectedMatch.home) : null;
  const awayTeam = selectedMatch ? ALL_TEAMS.find(t => t.id === selectedMatch.away) : null;

  return (
    <div>
      <div className="ttl">Match Logger</div>
      <div className="sub">Pick a date, select a match, log the score and goals.</div>

      {!isAdmin && (
        <div className="notice">🔒 Sign in as admin to log results.</div>
      )}

      {/* Date picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <input
          type="date"
          className="inp"
          style={{ width: 180 }}
          value={selectedDate}
          min="2026-06-11"
          max="2026-07-19"
          onChange={e => { setSelectedDate(e.target.value); setSelectedMatch(null); }}
        />
        <span style={{ fontSize: 12, color: S.muted }}>
          {todayMatches.length} match{todayMatches.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Match list */}
      {!selectedMatch && (
        <div>
          {todayMatches.length === 0 && (
            <div style={{ color: S.muted, fontSize: 13, padding: '20px 0' }}>No matches scheduled for this date.</div>
          )}
          {todayMatches.map(m => {
            const H = ALL_TEAMS.find(t => t.id === m.home);
            const A = ALL_TEAMS.find(t => t.id === m.away);
            const existing = state.matches.find(x => x.id === m.id);
            const logged = existing?.played;
            return (
              <div
                key={m.id}
                onClick={() => isAdmin && openMatch(m)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: S.card, border: `1px solid ${logged ? S.green : S.border}`,
                  borderRadius: 10, padding: '14px 18px', marginBottom: 10,
                  cursor: isAdmin ? 'pointer' : 'default',
                  opacity: isAdmin ? 1 : 0.6,
                  transition: 'border-color .15s',
                }}
              >
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{H?.flag}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{H?.name}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  {logged
                    ? <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: S.accent }}>
                        {existing.homeScore} – {existing.awayScore}
                      </span>
                    : <span style={{ fontSize: 11, color: S.muted }}>{m.time}</span>
                  }
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{A?.name}</span>
                  <span style={{ fontSize: 22 }}>{A?.flag}</span>
                </div>
                {logged && <span style={{ fontSize: 16 }}>✅</span>}
                {isAdmin && !logged && <span style={{ fontSize: 13, color: S.accent }}>▶</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Match entry form */}
      {selectedMatch && (
        <div>
          {/* Back button */}
          <button
            className="btn btn-g btn-sm"
            style={{ marginBottom: 16 }}
            onClick={() => setSelectedMatch(null)}
          >
            ← Back to matches
          </button>

          {/* Match header */}
          <div style={{
            background: S.card, border: `1px solid ${S.border}`,
            borderRadius: 12, padding: '18px 20px', marginBottom: 16,
          }}>
            <div style={{ textAlign: 'center', fontSize: 11, color: S.muted, marginBottom: 12, letterSpacing: 1 }}>
              GROUP {selectedMatch.group} · {selectedMatch.time}
            </div>

            {/* Score entry */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 28 }}>{homeTeam?.flag}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{homeTeam?.name}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => setHomeScore(s => s + 1)}
                    style={{ background: S.accent, color: '#000', border: 'none', borderRadius: 6,
                      width: 32, height: 32, fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>+</button>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, color: S.accent, lineHeight: 1 }}>
                    {homeScore}
                  </div>
                  <button onClick={() => setHomeScore(s => Math.max(0, s - 1))}
                    style={{ background: S.dim, color: S.text, border: 'none', borderRadius: 6,
                      width: 32, height: 32, fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>−</button>
                </div>

                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: S.muted }}>–</div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => setAwayScore(s => s + 1)}
                    style={{ background: S.accent, color: '#000', border: 'none', borderRadius: 6,
                      width: 32, height: 32, fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>+</button>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, color: S.accent, lineHeight: 1 }}>
                    {awayScore}
                  </div>
                  <button onClick={() => setAwayScore(s => Math.max(0, s - 1))}
                    style={{ background: S.dim, color: S.text, border: 'none', borderRadius: 6,
                      width: 32, height: 32, fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>−</button>
                </div>
              </div>

              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 28 }}>{awayTeam?.flag}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{awayTeam?.name}</div>
              </div>
            </div>
          </div>

          {/* Goal/Assist logger */}
          <div style={{
            background: S.card, border: `1px solid ${S.border}`,
            borderRadius: 12, padding: '18px 20px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: S.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
              ⚽ GOALS & ASSISTS
            </div>

            {/* Search box */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input
                ref={searchRef}
                className="inp"
                placeholder="Type player name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoComplete="off"
              />

              {/* Autocomplete dropdown */}
              {fantasyMatches.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: S.card2, border: `1px solid ${S.border}`, borderRadius: 8,
                  marginTop: 4, maxHeight: 200, overflowY: 'auto',
                }}>
                  {fantasyMatches.map(p => (
                    <div key={p.id} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${S.dim}` }}>
                      <span style={{ fontSize: 16 }}>{p.flag}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                      <span style={{ fontSize: 10, color: S.gold, marginRight: 8 }}>★ FANTASY</span>
                      <button
                        onClick={() => addEvent('goal', p.name, p.id)}
                        style={{ background: S.green, color: '#000', border: 'none', borderRadius: 5,
                          padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginRight: 4 }}>
                        ⚽ Goal
                      </button>
                      <button
                        onClick={() => addEvent('assist', p.name, p.id)}
                        style={{ background: S.accent, color: '#000', border: 'none', borderRadius: 5,
                          padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        🅰 Assist
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Non-fantasy player quick add */}
            {search.length > 1 && fantasyMatches.length === 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: S.muted, flex: 1, alignSelf: 'center' }}>
                  "{search}" (not in fantasy)
                </span>
                <button
                  onClick={() => addEvent('goal', search, null)}
                  style={{ background: S.dim, color: S.text, border: 'none', borderRadius: 5,
                    padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginRight: 4 }}>
                  ⚽ Goal
                </button>
                <button
                  onClick={() => addEvent('assist', search, null)}
                  style={{ background: S.dim, color: S.text, border: 'none', borderRadius: 5,
                    padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  🅰 Assist
                </button>
              </div>
            )}

            {search.length > 1 && fantasyMatches.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: S.muted, flex: 1, alignSelf: 'center' }}>
                  Not in list?
                </span>
                <button
                  onClick={() => addEvent('goal', search, null)}
                  style={{ background: S.dim, color: S.text, border: 'none', borderRadius: 5,
                    padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginRight: 4 }}>
                  ⚽ Non-fantasy goal
                </button>
                <button
                  onClick={() => addEvent('assist', search, null)}
                  style={{ background: S.dim, color: S.text, border: 'none', borderRadius: 5,
                    padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  🅰 Non-fantasy assist
                </button>
              </div>
            )}

            {/* Event log */}
            {events.length === 0 && (
              <div style={{ fontSize: 12, color: S.muted, padding: '10px 0' }}>
                No goals logged yet. Type a player name above.
              </div>
            )}
            {events.map((e, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 7, marginBottom: 5,
                background: e.type === 'goal' ? 'rgba(34,197,94,.1)' : 'rgba(0,200,255,.1)',
                border: `1px solid ${e.type === 'goal' ? S.green : S.accent}`,
              }}>
                <span style={{ fontSize: 16 }}>{e.type === 'goal' ? '⚽' : '🅰'}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{e.playerName}</span>
                {e.playerId && <span style={{ fontSize: 10, color: S.gold }}>★</span>}
                <span style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase' }}>{e.type}</span>
                <button
                  onClick={() => removeEvent(i)}
                  style={{ background: 'none', border: 'none', color: S.red,
                    cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Save button */}
          {saved ? (
            <div className="success" style={{ textAlign: 'center', fontSize: 16, fontWeight: 700 }}>
              ✅ Match saved!
            </div>
          ) : (
            <button
              className="btn btn-p"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
              onClick={handleSave}
              disabled={!isAdmin}
            >
              Save Match Results
            </button>
          )}
        </div>
      )}
    </div>
  );
}
