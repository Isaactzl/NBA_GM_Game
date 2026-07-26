import { useMemo } from 'react';
import { getGradeClassToken, getGradeValue } from '../utils/gradeUtils.js';

const ATTRIBUTE_ORDER = ['size', 'shooting', 'finishing', 'playmaking', 'iq', 'defense', 'rebounding', 'athleticism'];
const CATEGORY_LABEL = {
  size: 'Size',
  shooting: 'Shooting',
  finishing: 'Finishing',
  playmaking: 'Playmaking',
  iq: 'IQ',
  defense: 'Defense',
  rebounding: 'Rebounding',
  athleticism: 'Athleticism',
};
const RANK_BADGE = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4th'];

export function ResultsScreen({ standings, gameMode, onPlayAgain }) {
  const isFrankenstein = gameMode === 'frankenstein';

  const categoryRows = useMemo(() => {
    if (!isFrankenstein) return [];
    return ATTRIBUTE_ORDER.map((category) => {
      const entries = standings.map((gm) => {
        const player = gm.roster.find((p) => p.assignedCategory === category);
        const grade = player?.attributes?.[category] ?? null;
        return { gm, player, grade, value: grade ? getGradeValue(grade) : 0 };
      });
      const best = Math.max(...entries.map((e) => e.value));
      return { category, entries, best };
    });
  }, [standings, isFrankenstein]);

  return (
    <div className="results-screen">
      <header className="results-topbar">
        <div className="brand">
          <p className="eyebrow">Hardwood Hustle · Draft Complete</p>
          <h1>Final Results</h1>
        </div>
        <button className="primary-btn results-again-btn" onClick={onPlayAgain}>
          Play Again
        </button>
      </header>

      <div className="results-mode-pill">
        {isFrankenstein ? 'Frankenstein' : 'The Franchise'} Mode
      </div>

      {/* Podium */}
      <section className="results-podium">
        {standings.map((gm, index) => (
          <div
            key={gm.id}
            className={`results-podium-card ${index === 0 ? 'is-champion' : ''}`}
            style={{ '--gm-color': gm.color }}
          >
            <div className="results-podium-badge">
              {RANK_BADGE[index] ?? `${index + 1}th`}
            </div>
            <p className="results-podium-name">{gm.name}</p>
            <div className="results-score-big">{gm.teamScore}</div>
            <p className="results-score-label">points</p>
            <div className="results-podium-meta">
              <div>
                <span className="results-meta-label">Synergy</span>
                <span className="results-meta-val">{gm.synergyScore}</span>
              </div>
              <div>
                <span className="results-meta-label">Budget left</span>
                <span className="results-meta-val">${gm.budget}</span>
              </div>
              <div>
                <span className="results-meta-label">Players</span>
                <span className="results-meta-val">{gm.roster.length}</span>
              </div>
            </div>

            <div className="results-roster-list">
              {gm.roster.map((player) => (
                <div key={player.id} className="results-player-row">
                  <span className="results-player-name">{player.name}</span>
                  {player.assignedPosition && (
                    <span className="results-player-pos">
                      {player.assignedPosition}
                    </span>
                  )}
                  {player.assignedCategory && (
                    <span className="results-player-cat">
                      {CATEGORY_LABEL[player.assignedCategory] ?? player.assignedCategory}
                    </span>
                  )}
                  <span className={`tier-badge tier-${player.tier}`}>{player.tier}</span>
                </div>
              ))}
            </div>

            {isFrankenstein && (
              <div className="results-slot-grid">
                {ATTRIBUTE_ORDER.map((category) => {
                  const assignedPlayer = gm.roster.find((player) => player.assignedCategory === category);

                  return (
                    <div key={`${gm.id}-${category}`} className={`results-slot-card ${assignedPlayer ? 'filled' : ''}`}>
                      <span className="results-slot-label">{CATEGORY_LABEL[category]}</span>
                      <strong>{assignedPlayer?.name ?? 'Open'}</strong>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Category Showdown — Frankenstein only */}
      {isFrankenstein && (
        <section className="panel results-comparison-section">
          <div className="panel-heading">
            <h2>Category Showdown</h2>
            <span className="spotlight-tag">Gold = category winner</span>
          </div>

          <div className="results-comparison-scroll">
            <table className="results-cmp-table">
              <thead>
                <tr>
                  <th className="results-cmp-head-cat">Category</th>
                  {standings.map((gm) => (
                    <th
                      key={gm.id}
                      className="results-cmp-head-gm"
                      style={{ '--gm-color': gm.color }}
                    >
                      {gm.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categoryRows.map(({ category, entries, best }) => (
                  <tr key={category}>
                    <td className="results-cmp-cat-cell">
                      {CATEGORY_LABEL[category]}
                    </td>
                    {entries.map(({ gm, player, grade, value }) => (
                      <td
                        key={gm.id}
                        className={[
                          'results-cmp-data-cell',
                          value === best && best > 0 ? 'results-cmp-winner' : '',
                          !player ? 'results-cmp-empty' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{ '--gm-color': gm.color }}
                      >
                        <span className="results-cmp-player">{player?.name ?? '—'}</span>
                        <span className={`results-cmp-grade grade-${getGradeClassToken(grade)}`}>
                          {grade ?? '—'}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="results-footer">
        <button className="primary-btn" onClick={onPlayAgain}>
          Start New Draft
        </button>
      </div>
    </div>
  );
}
