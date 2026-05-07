import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Flag, Bell, BellOff, 
  Plus, X, History, Trash2, FileDown, 
  CheckCircle2, Clock, Pencil, Save
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type SoundType = 'sine' | 'square' | 'triangle' | 'sawtooth' | 'pulse';

interface AlertPoint {
  id: string;
  name: string;
  seconds: number;
  soundType: SoundType;
  triggered: boolean;
  crossedAt?: number;
  finalSessionTime?: number;
}

export const Stopwatch: React.FC = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  
  const [alerts, setAlerts] = useState<AlertPoint[]>(() => {
    try {
      const saved = localStorage.getItem('chrono_alerts_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
          return parsed.filter((a: any) => !a.crossedAt || a.crossedAt > twoDaysAgo).slice(0, 50);
        }
      }
    } catch (e) {}
    return [];
  });
  
  const [isAlertEnabled, setIsAlertEnabled] = useState(true);
  const [newAlertName, setNewAlertName] = useState('');
  const [newAlertSeconds, setNewAlertSeconds] = useState<number | ''>('');
  const [newAlertSound, setNewAlertSound] = useState<SoundType>('sine');
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem('chrono_alerts_v2', JSON.stringify(alerts));
  }, [alerts]);

  const playBeep = (type: SoundType) => {
    if (!isAlertEnabled) return;
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const oscillator = audioCtx.current.createOscillator();
      const gainNode = audioCtx.current.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.current.destination);
      oscillator.type = type === 'pulse' ? 'square' : type;
      oscillator.frequency.setValueAtTime(880, audioCtx.current.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 0.5);
      oscillator.start();
      oscillator.stop(audioCtx.current.currentTime + 0.5);
    } catch (e) {}
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime((prevTime) => {
          const nextTime = prevTime + 10;
          setAlerts(prevAlerts => {
            let changed = false;
            const updated = prevAlerts.map(a => {
              if (!a.triggered && nextTime >= a.seconds * 1000) {
                playBeep(a.soundType);
                changed = true;
                return { ...a, triggered: true, crossedAt: Date.now() };
              }
              return a;
            });
            return changed ? updated : prevAlerts;
          });
          return nextTime;
        });
      }, 10);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, isAlertEnabled]);

  const addAlert = () => {
    if (newAlertSeconds !== '' && newAlertSeconds > 0) {
      if (editingAlertId) {
        setAlerts(prev => prev.map(a => a.id === editingAlertId ? {
          ...a,
          name: newAlertName.trim() || a.name,
          seconds: Number(newAlertSeconds),
          soundType: newAlertSound,
          triggered: time >= Number(newAlertSeconds) * 1000
        } : a).sort((a, b) => a.seconds - b.seconds));
        setEditingAlertId(null);
      } else {
        if (alerts.length >= 50) return;
        const newPoint: AlertPoint = {
          id: Math.random().toString(36).substr(2, 9),
          name: newAlertName.trim() || `Point ${alerts.length + 1}`,
          seconds: Number(newAlertSeconds),
          soundType: newAlertSound,
          triggered: time >= Number(newAlertSeconds) * 1000,
          crossedAt: time >= Number(newAlertSeconds) * 1000 ? Date.now() : undefined
        };
        setAlerts(prev => [...prev, newPoint].sort((a, b) => a.seconds - b.seconds));
      }
      setNewAlertName('');
      setNewAlertSeconds('');
      setNewAlertSound('sine');
    }
  };

  const handleReset = () => {
    if (time > 0) {
      setAlerts(prev => prev.map(a => a.triggered ? { ...a, finalSessionTime: time } : a));
      setShowSummary(true);
    }
    setIsRunning(false);
    setTime(0);
    setLaps([]);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const crossed = alerts.filter(a => a.triggered);
    doc.text('ChronoSync Report', 14, 22);
    const tableData = crossed.map(a => [a.name, `${a.seconds}s`, `${((a.finalSessionTime || 0)/1000).toFixed(2)}s`]);
    autoTable(doc, { startY: 30, head: [['Name', 'Target', 'Actual']], body: tableData });
    doc.save('report.pdf');
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const rs = s % 60;
    const m = Math.floor(s / 60);
    const rm = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}.${rm.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col space-y-6 w-full max-w-lg mx-auto p-4 bg-white dark:bg-gray-800 rounded-3xl shadow-xl">
      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input type="text" placeholder="Label" value={newAlertName} onChange={e => setNewAlertName(e.target.value)} className="bg-white dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm dark:text-white" />
          <div className="flex gap-2">
            <input type="number" placeholder="Secs" value={newAlertSeconds} onChange={e => setNewAlertSeconds(e.target.value === '' ? '' : Number(e.target.value))} className="w-20 bg-white dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm dark:text-white" />
            <button onClick={addAlert} className="flex-1 bg-blue-600 text-white rounded-xl font-bold">{editingAlertId ? 'Save' : 'Add'}</button>
          </div>
        </div>
      </div>

      <div className="text-7xl font-mono font-bold text-center dark:text-white py-10 tabular-nums">
        {formatTime(time)}
      </div>

      <div className="flex justify-center space-x-6">
        <button onClick={handleReset} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full"><RotateCcw /></button>
        <button onClick={() => setIsRunning(!isRunning)} className={`p-6 rounded-full text-white ${isRunning ? 'bg-red-500' : 'bg-blue-600'}`}>
          {isRunning ? <Pause /> : <Play />}
        </button>
      </div>

      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-bold dark:text-white">Session Summary</h2>
            <button onClick={exportPDF} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">Export PDF</button>
            <button onClick={() => setShowSummary(false)} className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl font-bold">Close</button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {alerts.map(a => (
          <div key={a.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700">
            <span className="text-sm font-bold dark:text-white">{a.name} ({a.seconds}s)</span>
            <div className="flex gap-2">
              <button onClick={() => {setEditingAlertId(a.id); setNewAlertName(a.name); setNewAlertSeconds(a.seconds);}} className="text-blue-500"><Pencil size={16} /></button>
              <button onClick={() => setAlerts(alerts.filter(al => al.id !== a.id))} className="text-red-500"><X size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
