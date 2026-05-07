import { SOUNDS } from './types';

let sharedAudioCtx: AudioContext | null = null;

export const initAudio = () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
};

export const playSound = (soundId: string) => {
  const sound = SOUNDS.find((s) => s.id === soundId) || SOUNDS[1];
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  const oscillator = sharedAudioCtx.createOscillator();
  const gainNode = sharedAudioCtx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(sound.frequency, sharedAudioCtx.currentTime);
  
  gainNode.gain.setValueAtTime(0.5, sharedAudioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, sharedAudioCtx.currentTime + 0.5);

  oscillator.connect(gainNode);
  gainNode.connect(sharedAudioCtx.destination);

  oscillator.start();
  oscillator.stop(sharedAudioCtx.currentTime + 0.5);
};

export const runVibration = (pattern: string) => {
  if ('vibrate' in navigator) {
    const parts = pattern.split(',').map((p) => parseInt(p.trim())).filter((p) => !isNaN(p));
    if (parts.length > 0) {
      navigator.vibrate(parts);
    }
  }
};
