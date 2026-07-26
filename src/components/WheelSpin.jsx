import { useGameContext } from '../context/GameContext.jsx';

export function WheelSpin() {
  const { wheelState, gms } = useGameContext();

  return (
    <div className="wheel-overlay">
      <div className="wheel-card">
        <p className="eyebrow">Wheel of Misfortune</p>
        <h2>{wheelState.spinning ? 'Spinning...' : 'Winner selected'}</h2>
        <p className="wheel-tied-label">
          {wheelState.tiedGms.map((gmId) => gms.find((gm) => gm.id === gmId)?.name).join(' • ')}
        </p>
        {wheelState.winnerId && (
          <p className="wheel-winner">Winner: {gms.find((gm) => gm.id === wheelState.winnerId)?.name}</p>
        )}
      </div>
    </div>
  );
}
