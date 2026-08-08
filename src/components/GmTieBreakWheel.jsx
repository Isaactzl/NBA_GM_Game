import { useEffect, useMemo, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { playArcadeSound } from '../utils/soundEngine.js';

const BASE_SPINS = 5;
const SPIN_DURATION_SECONDS = 2.9;

const WEDGE_COLORS = ['#f59e0b', '#ef4444', '#22d3ee', '#34d399', '#a78bfa', '#fb7185', '#f97316', '#38bdf8'];

const buildWheelGradient = (count) => {
  if (count <= 1) {
    return 'conic-gradient(#f59e0b 0deg 360deg)';
  }

  const slice = 360 / count;
  const segments = Array.from({ length: count }, (_, index) => {
    const start = index * slice;
    const end = start + slice;
    const color = WEDGE_COLORS[index % WEDGE_COLORS.length];
    return `${color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${segments.join(', ')})`;
};

export function GmTieBreakWheel({ candidates, unwantedPlayerName, reason, soundEnabled, soundVolume, onComplete }) {
  const controls = useAnimation();
  const [phase, setPhase] = useState('spinning');
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

  const targetRotation = useMemo(() => {
    const slice = 360 / Math.max(1, candidates.length);
    return BASE_SPINS * 360 + winnerIndex * slice + slice / 2;
  }, [candidates.length, winnerIndex]);

  const gradient = useMemo(() => buildWheelGradient(candidates.length), [candidates.length]);

  useEffect(() => {
    let tickInterval = null;
    let cancelled = false;

    const run = async () => {
      playArcadeSound('wheelStart', { enabled: soundEnabled, volume: soundVolume });
      tickInterval = window.setInterval(() => {
        playArcadeSound('wheelTick', { enabled: soundEnabled, volume: soundVolume * 0.78 });
      }, 170);

      await controls.start({
        rotate: targetRotation,
        transition: {
          duration: SPIN_DURATION_SECONDS,
          ease: [0.11, 0.76, 0.16, 1],
        },
      });

      if (cancelled) {
        return;
      }

      window.clearInterval(tickInterval);
      playArcadeSound('wheelStop', { enabled: soundEnabled, volume: soundVolume });
      window.setTimeout(() => {
        playArcadeSound('revealHit', { enabled: soundEnabled, volume: soundVolume });
      }, 80);
      setPhase('landed');
    };

    run();

    return () => {
      cancelled = true;
      if (tickInterval) {
        window.clearInterval(tickInterval);
      }
    };
  }, [controls, targetRotation, soundEnabled, soundVolume]);

  const winner = candidates[winnerIndex] ?? candidates[0] ?? null;

  return (
    <div className="gm-wheel-overlay-fullscreen">
      <p className="gm-wheel-title">Wheel of Misfortune</p>
      <p className="gm-wheel-reason">{reason || 'Tie on roster count: wheel decides who gets the player.'}</p>

      <div className="gm-wheel-shell">
        <motion.div
          className="gm-wheel-pointer"
          animate={phase === 'spinning' ? { y: [0, -10, 0] } : { y: 0 }}
          transition={{ repeat: phase === 'spinning' ? Infinity : 0, duration: 0.22 }}
        >
          ▼
        </motion.div>

        <motion.div className="gm-wheel-disc" animate={controls} style={{ background: gradient }}>
          {candidates.map((gm, index) => {
            const angle = index * (360 / Math.max(1, candidates.length));

            return (
              <div
                key={gm.id}
                className="gm-wheel-label"
                style={{ transform: `rotate(${angle}deg) translateY(-38%)` }}
              >
                <span>{gm.name}</span>
              </div>
            );
          })}
        </motion.div>
      </div>

      {phase === 'landed' && winner && (
        <motion.div
          className="gm-wheel-result"
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.36 }}
        >
          <p className="gm-wheel-result-kicker">Penalty Enforced</p>
          <strong>{winner.name} gets {unwantedPlayerName}.</strong>
          <button className="primary-btn" onClick={() => onComplete(winner.id)}>
            Return To Draft
          </button>
        </motion.div>
      )}
    </div>
  );
}
