let audioContext = null;

const ensureAudioContext = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
};

const playTone = (context, frequency, startTime, duration, gainValue, type = 'square') => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainValue), startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
};

export const playArcadeSound = (type, { enabled = true, volume = 0.65 } = {}) => {
  if (!enabled || volume <= 0) {
    return;
  }

  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const base = Math.max(0.02, Math.min(1, volume)) * 0.16;

  switch (type) {
    case 'bid':
      playTone(context, 520, now, 0.06, base * 0.95, 'square');
      playTone(context, 760, now + 0.05, 0.07, base * 0.7, 'triangle');
      break;
    case 'tick':
      playTone(context, 900, now, 0.04, base * 0.55, 'square');
      break;
    case 'finalTick':
      playTone(context, 780, now, 0.08, base * 0.95, 'square');
      playTone(context, 1040, now + 0.06, 0.1, base * 0.8, 'triangle');
      break;
    case 'auctionWin':
      playTone(context, 420, now, 0.08, base * 0.8, 'triangle');
      playTone(context, 620, now + 0.06, 0.1, base * 0.95, 'triangle');
      playTone(context, 860, now + 0.13, 0.12, base * 0.85, 'triangle');
      break;
    case 'wheelStart':
      playTone(context, 220, now, 0.2, base * 0.65, 'sawtooth');
      playTone(context, 260, now + 0.08, 0.18, base * 0.52, 'sawtooth');
      break;
    case 'wheelTick':
      playTone(context, 1200, now, 0.03, base * 0.5, 'square');
      break;
    case 'wheelStop':
      playTone(context, 260, now, 0.08, base * 0.9, 'sawtooth');
      playTone(context, 180, now + 0.06, 0.1, base * 0.72, 'triangle');
      break;
    case 'revealHit':
      playTone(context, 980, now, 0.05, base * 0.95, 'square');
      playTone(context, 1280, now + 0.03, 0.08, base * 0.8, 'triangle');
      playTone(context, 420, now + 0.08, 0.12, base * 0.6, 'sawtooth');
      break;
    default:
      playTone(context, 600, now, 0.05, base * 0.5, 'square');
      break;
  }
};
