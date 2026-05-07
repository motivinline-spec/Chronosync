export interface Label {
  id: string;
  name: string;
  duration: number;
  vibrationId: string;
  soundId: string;
}

export interface StopwatchAlert {
  id: string;
  name: string;
  timeSecs: number;
  soundId: string;
  vibrationId: string;
}

export interface EventLabel {
  id: string;
  name: string;
  duration: number;
  soundId: string;
  vibrationId: string;
}

export interface TaskEvent {
  id: string;
  name: string;
  labels: EventLabel[];
  loops: number;
}

export type Tab = 'stopwatch' | 'timer' | 'events';

export const SOUNDS = [
  { id: 'sine', name: 'Sine', frequency: 440 },
  { id: 'square', name: 'Square', frequency: 300 },
  { id: 'sawtooth', name: 'Sawtooth', frequency: 200 },
  { id: 'triangle', name: 'Triangle', frequency: 600 },
  { id: 'high', name: 'High Pitch', frequency: 1000 },
];

export const VIBRATIONS = [
  { id: 'short', name: 'Short Pulse', pattern: '100' },
  { id: 'long', name: 'Long Pulse', pattern: '500' },
  { id: 'double', name: 'Double Pulse', pattern: '100,50,100' },
  { id: 'triple', name: 'Triple Pulse', pattern: '100,50,100,50,100' },
  { id: 'heartbeat', name: 'Heartbeat', pattern: '100,100,300' },
  { id: 'rapid', name: 'Rapid', pattern: '50,50,50,50,50' },
  { id: 'heavy', name: 'Heavy', pattern: '1000' },
  { id: 'stutter', name: 'Stutter', pattern: '100,10,100,10,100' },
  { id: 'SOS', name: 'S.O.S', pattern: '100,100,100,300,300,300,100,100,100' },
  { id: 'ramp', name: 'Ramp Up', pattern: '50,100,200,400' },
];
