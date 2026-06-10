import { SCORING } from '../data/rosters.js';

export function calcTeamPoints(teamId, matches, advancements) {
  let pts = 0;
  matches.forEach(m => {
    if (!m.played) return;
    const isHome = m.homeId === teamId;
    const isAway = m.awayId === teamId;
    if (!isHome && !isAway) return;
    const mine   = isHome ? m.homeScore : m.awayScore;
    const theirs = isHome ? m.awayScore : m.homeScore;
    if (mine > theirs)      pts += SCORING.team.win;
    else if (mine === theirs) pts += SCORING.team.draw;
  });
  const adv = advancements[teamId] || {};
  if (adv.ro16)     pts += SCORING.team.ro16;
  if (adv.qf)       pts += SCORING.team.qf;
  if (adv.sf)       pts += SCORING.team.sf;
  if (adv.champion) pts += SCORING.team.champion;
  return pts;
}

export function calcPlayerPoints(playerId, playerStats) {
  const s = playerStats[playerId] || { goals: 0, assists: 0, cleanSheets: 0 };
  return (
    s.goals       * SCORING.player.goal +
    s.assists     * SCORING.player.assist +
    s.cleanSheets * SCORING.player.cleanSheet
  );
}

export function calcRosterPoints(roster, matches, advancements, playerStats) {
  const teamPts   = roster.teams.reduce((sum, t) => sum + calcTeamPoints(t.id, matches, advancements), 0);
  const playerPts = roster.players.reduce((sum, p) => sum + calcPlayerPoints(p.id, playerStats), 0);
  return teamPts + playerPts;
}
