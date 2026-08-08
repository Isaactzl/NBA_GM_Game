import { PlayerRadarChart } from './PlayerRadarChart.jsx';
import { getGradeClassToken, isGodTierGrade } from '../utils/gradeUtils.js';

const ATTRIBUTE_ORDER = ['size', 'shooting', 'finishing', 'playmaking', 'iq', 'defense', 'rebounding', 'athleticism'];
const ATTRIBUTE_LABELS = {
  size: 'SIZ',
  shooting: 'SHT',
  finishing: 'FIN',
  playmaking: 'PLY',
  iq: 'IQ',
  defense: 'DEF',
  rebounding: 'REB',
  athleticism: 'ATH',
};

export function PlayerCard({ player, showStats = true, className = '', style = {} }) {
  if (!player) {
    return <div className={`player-card ${className}`.trim()}>Select a player</div>;
  }

  return (
    <div className={`player-card ${className}`.trim()} style={style}>
      <div className="player-scout-layout">
        <div className="player-scout-copy">
          <h3>{player.name}</h3>
          <p>
            {showStats ? `${player.position} • Tier ${player.tier}` : player.position}
          </p>

          {player.assignedCategory && (
            <div className="category-lock-text">Locked to {player.assignedCategory}</div>
          )}

          {showStats ? (
            <>
              <div className="player-attr-grade-grid">
                {ATTRIBUTE_ORDER.map((attributeKey) => {
                  const grade = player.attributes?.[attributeKey];
                  const isGodTier = isGodTierGrade(grade);

                  return (
                    <div key={`${player.id}-${attributeKey}`} className={`player-attr-grade-pill ${isGodTier ? 'is-god-tier' : ''}`}>
                      <span>{ATTRIBUTE_LABELS[attributeKey] ?? attributeKey}</span>
                      <strong className={`grade-${getGradeClassToken(grade)}`}>{grade ?? '-'}</strong>
                      {isGodTier && <em className="god-tier-mini-badge">God Tier</em>}
                    </div>
                  );
                })}
              </div>

              <div className="grade-summary">
                <span>Overall tier: {player.tier}</span>
                <span>Attributes: {Object.keys(player.attributes ?? {}).length}/8</span>
              </div>
            </>
          ) : (
            <div className="grade-summary">
              <span>Stats hidden for draft</span>
              <span>Reveal anytime</span>
            </div>
          )}
        </div>

        {showStats && (
          <div className="player-scout-chart-wrap">
            <div className="player-scout-chart-glow" />
            <div className="player-scout-chart-shell">
              <PlayerRadarChart attributes={player.attributes ?? {}} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
