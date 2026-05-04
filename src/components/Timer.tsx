import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Bell, BellOff, Volume2 } from 'lucide-react';

type SoundType = 'sine' | 'square' | 'triangle' | 'sawtooth' | 'pulse';

export const Timer: React.FC = () => {
  const [inputHours, setInputHours] = useState(0);
  const [inputMinutes, setInputMinutes] = useState(0);
  const [inputSeconds, setInputSeconds] = useState(0);
  
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState<SoundType>(() => {
    return (localStorage.getItem('timer_sound_type') as SoundType) || 'sine';
  });
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem('timer_sound_type', soundType);
  }, [soundType]);

  const playAlarm = (type: SoundType) => {
    if (!isSoundEnabled) return;
    
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const playTone = (freq: number, start: number, duration: number, waveType: OscillatorType) => {
        const osc = audioCtx.current!.createOscillator();
        const gain = audioCtx.current!.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.current!.destination);
        osc.type = waveType;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = audioCtx.current.currentTime;
      const wave = type === 'pulse' ? 'square' : type;
      
      // Play a triple beep for timer completion
      playTone(523.25, now, 0.3, wave); // C5
      playTone(659.25, now + 0.3, 0.3, wave); // E5
      playTone(783.99, now + 0.6, 0.5, wave); // G5
      
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } catch (e) {
      console.error("Audio failed", e);
    }
  };

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setIsFinished(true);
      playAlarm(soundType);
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft, soundType]);

  const startTimer = () => {
    if (timeLeft === 0) {
      const totalSeconds = inputHours * 3600 + inputMinutes * 60 + inputSeconds;
      if (totalSeconds > 0) {
        setTimeLeft(totalSeconds);
        setIsRunning(true);
        setIsFinished(false);
      }
    } else {
      setIsRunning(true);
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(0);
    setIsFinished(false);
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return {
      h: h.toString().padStart(2, '0'),
      m: m.toString().padStart(2, '0'),
      s: s.toString().padStart(2, '0'),
    };
  };

  const t = formatTime(timeLeft);

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-xl transition-all">
      {/* Sound Settings */}
      <div className="w-full bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
            <Volume2 size={14} /> Alarm Sound
          </label>
          <button 
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${isSoundEnabled ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-gray-200 text-gray-400 dark:bg-gray-600'}`}
          >
            {isSoundEnabled ? <Bell size={14} /> : <BellOff size={14} />}
            {isSoundEnabled ? 'ON' : 'MUTED'}
          </button>
        </div>
        <select 
          value={soundType}
          onChange={(e) => setSoundType(e.target.value as SoundType)}
          className="w-full bg-white dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="sine">Soft (Sine)</option>
          <option value="square">Digital (Square)</option>
          <option value="triangle">Retro (Triangle)</option>
          <option value="sawtooth">Sharp (Sawtooth)</option>
          <option value="pulse">Robot (Pulse)</option>
        </select>
      </div>

      {timeLeft === 0 && !isRunning && !isFinished ? (
        <div className="flex flex-col items-center space-y-6 w-full">
          <div className="flex space-x-4">
            {[
              { label: 'Hours', val: inputHours, set: setInputHours, max: 99 },
              { label: 'Minutes', val: inputMinutes, set: setInputMinutes, max: 59 },
              { label: 'Seconds', val: inputSeconds, set: setInputSeconds, max: 59 }
            ].map((col) => (
              <div key={col.label} className="flex flex-col items-center">
                <span className="text-xs font-semibold text-gray-500 mb-1">{col.label}</span>
                <input
                  type="number"
                  min="0"
                  max={col.max}
                  value={col.val}
                  onChange={(e) => col.set(Math.min(col.max, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-16 h-16 text-center text-2xl font-bold bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all outline-none"
                />
              </div>
            ))}
          </div>
          <button
            onClick={startTimer}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            Start Countdown
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-8 w-full">
          <div className={`text-6xl md:text-7xl font-mono font-bold tracking-tight tabular-nums transition-all ${isFinished ? 'text-red-500 animate-pulse scale-110' : 'text-gray-800 dark:text-white'}`}>
            <span>{t.h}:</span>
            <span>{t.m}:</span>
            <span>{t.s}</span>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={resetTimer}
              className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
            >
              <RotateCcw size={28} />
            </button>
            
            {!isFinished && (
              <button
                onClick={isRunning ? pauseTimer : startTimer}
                className={`p-4 rounded-full transition-all transform hover:scale-105 shadow-xl ${
                  isRunning 
                    ? 'bg-red-500 text-white shadow-red-200' 
                    : 'bg-blue-600 text-white shadow-blue-200'
                }`}
              >
                {isRunning ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" />}
              </button>
            )}

            {isFinished && (
              <div className="flex items-center space-x-2 text-red-500 font-bold animate-bounce bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full">
                <Bell size={24} />
                <span>Time's up!</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
