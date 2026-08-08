import { useEffect } from 'react';
import { useGameContext } from '../context/GameContext.jsx';
import { playArcadeSound } from '../utils/soundEngine.js';

export function WheelSpin() {
  const { wheelState, gms, soundEnabled, soundVolume } = useGameContext();

  useEffect(() => {
    if (!wheelState.visible) {
      return;
    }

    if (wheelState.spinning) {
      playArcadeSound('wheelStart', { enabled: soundEnabled, volume: soundVolume });
      return;
    }

    if (wheelState.winnerId) {
      playArcadeSound('wheelStop', { enabled: soundEnabled, volume: soundVolume });
      playArcadeSound('auctionWin', { enabled: soundEnabled, volume: soundVolume });
    }
  }, [wheelState.visible, wheelState.spinning, wheelState.winnerId, soundEnabled, soundVolume]);

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
