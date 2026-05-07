import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Bell } from 'lucide-react';

export const Timer: React.FC = () => {
  const [inputHours, setInputHours] = useState(0);
  const [inputMinutes, setInputMinutes] = useState(0);
  const [inputSeconds, setInputSeconds] = useState(0);
  
  const [timeLeft, setTimeLeft] = useState(0); 
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setIsFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, timeLeft]);

  const startTimer = () => {
    if (timeLeft === 0) {
      const total = inputHours * 3600 + inputMinutes * 60 + inputSeconds;
      if (total > 0) { setTimeLeft(total); setIsRunning(true); setIsFinished(false); }
    } else { setIsRunning(true); }
  };

  const format = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center space-y-8 w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-xl">
      {timeLeft === 0 && !isRunning && !isFinished ? (
        <div className="flex flex-col items-center space-y-6">
          <div className="flex space-x-2">
            {[setInputHours, setInputMinutes, setInputSeconds].map((set, i) => (
              <input key={i} type="number" onChange={e => set(Number(e.target.value))} className="w-16 h-16 text-center text-2xl font-bold bg-gray-50 dark:bg-gray-700 rounded-xl" placeholder="00" />
            ))}
          </div>
          <button onClick={startTimer} className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold">Start</button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-8 w-full">
          <div className={`text-6xl font-mono font-bold ${isFinished ? 'text-red-500 animate-pulse' : 'dark:text-white'}`}>{format(timeLeft)}</div>
          <div className="flex space-x-4">
            <button onClick={() => {setIsRunning(false); setTimeLeft(0); setIsFinished(false);}} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full"><RotateCcw /></button>
            {!isFinished && <button onClick={() => setIsRunning(!isRunning)} className="p-4 bg-blue-600 text-white rounded-full">{isRunning ? <Pause /> : <Play />}</button>}
            {isFinished && <div className="text-red-500 flex items-center gap-2"><Bell /> Time's up!</div>}
          </div>
        </div>
      )}
    </div>
  );
};
