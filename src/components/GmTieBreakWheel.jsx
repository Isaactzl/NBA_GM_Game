import { useEffect, useMemo, useState } from 'react';
import { playArcadeSound } from '../utils/soundEngine.js';

const SPIN_DURATION_MS = 2500;
const SPIN_TICK_MS = 95;
const LANDING_HOLD_MS = 1300;

export function GmTieBreakWheel({ candidates, unwantedPlayerName, reason, soundEnabled, soundVolume, onComplete }) {
  const [phase, setPhase] = useState('spinning');
  const [displayName, setDisplayName] = useState(candidates[0]?.name ?? 'Selecting...');
  const [selectedWinnerId] = useState(() => {
    if (!candidates.length) {
      return null;
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    return selected?.id ?? null;
  });

  const winnerIndex = useMemo(
    () => Math.max(0, candidates.findIndex((gm) => gm.id === selectedWinnerId)),
    [candidates, selectedWinnerId],
  );

  const winner = useMemo(
    () => candidates[winnerIndex] ?? candidates[0] ?? null,
    [candidates, winnerIndex],
  );

  const candidateNames = useMemo(
    () => candidates.map((gm) => gm.name).join(' • '),
    [candidates],
  );

  useEffect(() => {
    let tickInterval = null;
    let stopTimer = null;
    let revealTimer = null;
    let cancelled = false;
    let tickCount = 0;

    const run = () => {
      playArcadeSound('wheelStart', { enabled: soundEnabled, volume: soundVolume });

      tickInterval = window.setInterval(() => {
        if (cancelled) {
          return;
        }

        const next = candidates[Math.floor(Math.random() * candidates.length)] ?? winner;
        setDisplayName(next?.name ?? 'Selecting...');
        tickCount += 1;

        if (tickCount % 2 === 0) {
          playArcadeSound('wheelTick', { enabled: soundEnabled, volume: soundVolume * 0.78 });
        }
      }, SPIN_TICK_MS);

      stopTimer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        window.clearInterval(tickInterval);
        setDisplayName(winner?.name ?? 'Unknown GM');
        playArcadeSound('wheelStop', { enabled: soundEnabled, volume: soundVolume });
        setPhase('landed');

        revealTimer = window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          playArcadeSound('revealHit', { enabled: soundEnabled, volume: soundVolume });
          setPhase('revealed');
        }, LANDING_HOLD_MS);
      }, SPIN_DURATION_MS);
    };

    run();

    return () => {
      cancelled = true;
      if (tickInterval) {
        window.clearInterval(tickInterval);
      }
      if (stopTimer) {
        window.clearTimeout(stopTimer);
      }
      if (revealTimer) {
        window.clearTimeout(revealTimer);
      }
    };
  }, [candidates, winner, soundEnabled, soundVolume]);

  return (
    <div className="gm-wheel-overlay-fullscreen">
      <p className="gm-wheel-title">Wheel of Misfortune</p>
      <p className="gm-wheel-reason">{reason || 'Tie on roster count: wheel decides who gets the player.'}</p>

      <div className={`gm-wheel-card gm-wheel-card-fullscreen ${phase !== 'spinning' ? 'is-landed' : ''}`}>
        <p className="eyebrow">GM Tie-Break Wheel</p>
        <strong>{displayName}</strong>
        <span className="gm-wheel-phase-line">
          {phase === 'spinning'
            ? 'Spinning through tied GMs...'
            : phase === 'landed' && winner
            ? `Locked on ${winner.name}...`
            : winner
            ? `${winner.name} gets ${unwantedPlayerName}.`
            : 'Winner selected.'}
        </span>
        <p className="gm-wheel-candidates-line">Included GMs: {candidateNames || 'None'}</p>

        {phase === 'revealed' && winner && (
          <button className="primary-btn gm-wheel-confirm-btn" onClick={() => onComplete(winner.id)}>
            Return To Draft
          </button>
        )}
      </div>
    </div>
  );
}
