import { useGameContext } from '../context/GameContext.jsx';
import { getGradeClassToken } from '../utils/gradeUtils.js';

const ATTRIBUTE_ORDER = ['size', 'shooting', 'finishing', 'playmaking', 'iq', 'defense', 'rebounding', 'athleticism'];
const ATTRIBUTE_LABELS = {
  size: 'Size',
  shooting: 'Shooting',
  finishing: 'Finishing',
  playmaking: 'Playmaking',
  iq: 'IQ',
  defense: 'Defense',
  rebounding: 'Rebounding',
  athleticism: 'Athleticism',
};

export function RosterDashboard({ selectedGM, gms, gameMode }) {
  const { MAX_ROSTER_SIZE, draftRound, currentTurnGMId, allowFranchisePositionShifts, cycleFranchisePlayerPosition } = useGameContext();
  if (!selectedGM) {
    return <div className="roster-list">No roster selected</div>;
  }

  const boardColumnsStyle = {
    gridTemplateColumns: `repeat(${gms.length}, minmax(180px, 1fr))`,
  };

  const boardHeaderSubtitle =
    gameMode === 'frankenstein'
      ? 'All categories and budgets live'
      : 'Every roster slot live';

  return (
    <div className="roster-list split-horizon-board">
      <div className="roster-card highlight-card draft-board-header" style={{ '--gm-color': selectedGM.color }}>
        <div>
          <p className="draft-board-title">Global Draft Board</p>
          <p className="draft-board-subtitle">{boardHeaderSubtitle}</p>
        </div>
        <div className="draft-board-round-pill">Round {draftRound}</div>
      </div>

      <div className="horizon-board-scroll">
      <div className="horizon-board-grid" style={boardColumnsStyle}>
        {gms.map((gm) => {
          const isActiveGM = gm.id === currentTurnGMId;
          const slots =
            gameMode === 'frankenstein'
              ? ATTRIBUTE_ORDER.map((category) => {
                  const player = gm.roster.find((entry) => entry.assignedCategory === category);

                  return {
                    key: `${gm.id}-${category}`,
                    label: ATTRIBUTE_LABELS[category],
                    player,
                    grade: player?.attributes?.[category] ?? null,
                  };
                })
              : Array.from({ length: MAX_ROSTER_SIZE }, (_, index) => {
                  const player = gm.roster[index] ?? null;

                  return {
                    key: `${gm.id}-slot-${index + 1}`,
                    label: `Slot ${index + 1}`,
                    player,
                    grade: player?.tier ?? null,
                  };
                });

          return (
            <div
              key={gm.id}
              className={`gm-overview-card horizon-gm-column ${gm.id === selectedGM.id ? 'selected-gm-card' : ''} ${isActiveGM ? 'is-active-gm' : ''}`}
              style={{ '--gm-color': gm.color }}
            >
              <div className="horizon-gm-header">
                <div>
                  <strong>{gm.name}</strong>
                  <span>{gm.roster.length}/{MAX_ROSTER_SIZE} filled</span>
                </div>
                <div className="horizon-bank-wrap">
                  {isActiveGM && <em>On deck</em>}
                  <strong>${gm.budget}</strong>
                </div>
              </div>

              <div className="horizon-slot-stack">
                {slots.map((slot) => (
                  slot.player ? (
                    <div key={slot.key} className="horizon-slot-card filled">
                      <div className="horizon-slot-topline">
                        <span className="horizon-slot-label">{slot.label}</span>
                        {slot.grade && <span className={`horizon-slot-grade grade-${getGradeClassToken(slot.grade)}`}>{slot.grade}</span>}
                      </div>
                      <strong className="horizon-slot-name">{slot.player.name}</strong>
                      <span className="horizon-slot-subline">
                        {gameMode === 'the-franchise'
                          ? `${slot.player.assignedPosition ?? slot.player.position} • Tier ${slot.player.tier}`
                          : `${slot.player.position} • Tier ${slot.player.tier}`}
                      </span>
                      {gameMode === 'the-franchise' && (
                        <div className="franchise-slot-actions">
                          <span className="franchise-position-pill">{slot.player.assignedPosition ?? 'Unassigned'}</span>
                          {allowFranchisePositionShifts && (
                            <button
                              type="button"
                              className="franchise-shift-btn"
                              onClick={() => cycleFranchisePlayerPosition(gm.id, slot.player.id)}
                            >
                              Shift
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={slot.key} className="horizon-slot-card ghost">
                      <span className="horizon-slot-ghost-label">{slot.label}</span>
                      <strong>Open</strong>
                    </div>
                  )
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>

    </div>
  );
}
