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
  finalSessionTime?: number; // The stopwatch time when it was stopped
}

export const Stopwatch: React.FC = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  
  const [alerts, setAlerts] = useState<AlertPoint[]>(() => {
    const saved = localStorage.getItem('chrono_alerts_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
        return parsed.filter((a: any) => !a.crossedAt || a.crossedAt > twoDaysAgo).slice(0, 50);
      } catch (e) { return []; }
    }
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
      const freq = type === 'square' ? 440 : type === 'sawtooth' ? 330 : 880;
      oscillator.frequency.setValueAtTime(freq, audioCtx.current.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 0.5);
      oscillator.start();
      oscillator.stop(audioCtx.current.currentTime + 0.5);
      if ('vibrate' in navigator) navigator.vibrate(200);
    } catch (e) { console.error("Audio failed", e); }
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
          seconds: newAlertSeconds,
          soundType: newAlertSound,
          triggered: time >= newAlertSeconds * 1000,
          crossedAt: time >= newAlertSeconds * 1000 ? Date.now() : undefined
        };
        setAlerts(prev => [...prev, newPoint].sort((a, b) => a.seconds - b.seconds));
      }
      setNewAlertName('');
      setNewAlertSeconds('');
      setNewAlertSound('sine');
    }
  };

  const handleEditAlert = (alert: AlertPoint) => {
    setEditingAlertId(alert.id);
    setNewAlertName(alert.name);
    setNewAlertSeconds(alert.seconds);
    setNewAlertSound(alert.soundType);
  };

  const handleReset = () => {
    if (time > 0) {
      // Capture final times for triggered alerts in this session
      setAlerts(prev => prev.map(a => 
        a.triggered ? { ...a, finalSessionTime: time } : a
      ));
      setShowSummary(true);
    }
    setIsRunning(false);
    setTime(0);
    setLaps([]);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const crossed = alerts.filter(a => a.triggered);
    
    doc.setFontSize(20);
    doc.text('ChronoSync Stopwatch Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Date: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = crossed.map(a => {
      const target = a.seconds;
      const actual = (a.finalSessionTime || 0) / 1000;
      const diff = actual - target;
      return [
        a.name,
        `${target.toFixed(2)}s`,
        `${actual.toFixed(2)}s`,
        `+${diff.toFixed(2)}s`
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Alert Name', 'Target Time', 'Actual Time', 'Difference']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`ChronoSync_Report_${Date.now()}.pdf`);

    const shouldDelete = window.confirm("Export successful! Do you want to delete all previous records now? Click 'Cancel' to keep them.");
    if (shouldDelete) {
      setAlerts(alerts.filter(a => !a.triggered));
      setShowSummary(false);
    }
  };

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return {
      h: hours.toString().padStart(2, '0'),
      m: minutes.toString().padStart(2, '0'),
      s: seconds.toString().padStart(2, '0'),
      ms: milliseconds.toString().padStart(2, '0'),
    };
  };

  const t = formatTime(time);
  const activeCrossed = alerts.filter(a => a.triggered);

  return (
    <div className="flex flex-col space-y-6 w-full max-w-lg mx-auto p-4 md:p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-xl">
      {/* Configuration */}
      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b dark:border-gray-600 pb-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Configure Alert Points</h3>
          <button 
            onClick={() => setIsAlertEnabled(!isAlertEnabled)}
            className={`p-1.5 rounded-lg ${isAlertEnabled ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 bg-gray-100 dark:bg-gray-800'}`}
          >
            {isAlertEnabled ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            type="text"
            placeholder={editingAlertId ? "Edit Label" : "Label (e.g. Lap 1)"}
            value={newAlertName}
            onChange={(e) => setNewAlertName(e.target.value)}
            className={`bg-white dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm dark:text-white focus:ring-2 ${editingAlertId ? 'ring-2 ring-blue-400' : 'focus:ring-blue-500'}`}
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Secs"
              value={newAlertSeconds}
              onChange={(e) => setNewAlertSeconds(e.target.value === '' ? '' : parseInt(e.target.value))}
              className="w-20 bg-white dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            <select 
              value={newAlertSound}
              onChange={(e) => setNewAlertSound(e.target.value as SoundType)}
              className="flex-1 bg-white dark:bg-gray-800 border-none rounded-xl px-2 py-2 text-xs dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="sine">Sine</option>
              <option value="square">Square</option>
              <option value="triangle">Triangle</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="pulse">Pulse</option>
            </select>
            <button 
              onClick={addAlert} 
              className={`p-2 text-white rounded-xl transition-all ${editingAlertId ? 'bg-green-600 hover:bg-green-700 shadow-md shadow-green-200' : 'bg-blue-600 hover:bg-blue-700'}`}
              title={editingAlertId ? "Save Changes" : "Add Alert"}
            >
              {editingAlertId ? <Save size={20} /> : <Plus size={20} />}
            </button>
            {editingAlertId && (
              <button 
                onClick={() => { setEditingAlertId(null); setNewAlertName(''); setNewAlertSeconds(''); }}
                className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 rounded-xl hover:bg-gray-300 transition-all"
                title="Cancel Edit"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Display */}
      <div className="flex flex-col items-center py-6 text-center">
        <div className="text-7xl font-mono font-bold tracking-tighter tabular-nums dark:text-white">
          {t.h !== '00' && <span>{t.h}:</span>}
          <span>{t.m}:</span>
          <span>{t.s}</span>
          <span className="text-3xl opacity-50">.{t.ms}</span>
        </div>
        
        {/* Real-time Diffs for Crossed Alerts */}
        <div className="w-full mt-6 space-y-2">
          {alerts.filter(a => a.triggered).map(a => {
            const diff = time - (a.seconds * 1000);
            const dt = formatTime(diff);
            return (
              <div key={a.id} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl animate-in slide-in-from-left duration-300">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">{a.name}</span>
                <span className="text-sm font-mono font-bold text-blue-500">
                  +{dt.h !== '00' ? `${dt.h}:` : ''}{dt.m}:{dt.s}.{dt.ms}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center space-x-8">
        <button onClick={handleReset} className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all">
          <RotateCcw size={28} />
        </button>
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`p-6 rounded-full transition-all transform hover:scale-105 shadow-xl ${
            isRunning ? 'bg-red-500 shadow-red-100' : 'bg-blue-600 shadow-blue-100'
          } text-white`}
        >
          {isRunning ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" />}
        </button>
        <button
          onClick={() => setLaps([time, ...laps])}
          disabled={!isRunning && time === 0}
          className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-30"
        >
          <Flag size={28} />
        </button>
      </div>

      {/* Summary View / Modal Overlay */}
      {showSummary && activeCrossed.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <CheckCircle2 className="text-green-500" /> Session Summary
              </h2>
              <button onClick={() => setShowSummary(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {activeCrossed.map(a => {
                const target = a.seconds;
                const actual = (a.finalSessionTime || 0) / 1000;
                const diff = actual - target;
                return (
                  <div key={a.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border dark:border-gray-700">
                    <div>
                      <div className="text-sm font-bold dark:text-white">{a.name}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Clock size={10} /> Target: {target}s
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{actual.toFixed(2)}s</div>
                      <div className="text-[10px] font-bold text-red-500">+{diff.toFixed(2)}s extra</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    if (window.confirm("Delete all records?")) {
                      setAlerts(alerts.filter(a => !a.triggered));
                      setShowSummary(false);
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-bold hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <Trash2 size={18} /> Clear Data
                </button>
                <button 
                  onClick={exportPDF}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  <FileDown size={18} /> Export PDF
                </button>
              </div>
              <button 
                onClick={() => setShowSummary(false)}
                className="w-full py-3 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                Keep Records & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regular List (Untriggered) */}
      <div className="space-y-2 pt-4 border-t dark:border-gray-700">
        <div className="flex items-center justify-between">
           <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <History size={12} /> Pending Alerts
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {alerts.filter(a => !a.triggered).length === 0 && (
             <div className="w-full text-center py-4 text-gray-400 text-xs italic font-medium">
              No pending alerts. Add some above!
            </div>
          )}
          {alerts.filter(a => !a.triggered).map(a => (
            <div 
              key={a.id} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all group ${
                editingAlertId === a.id 
                ? 'bg-blue-100 border-blue-300 dark:bg-blue-900/40 dark:border-blue-700' 
                : 'bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600'
              }`}
            >
              <span className={`text-xs font-bold ${editingAlertId === a.id ? 'text-blue-700 dark:text-blue-300' : 'dark:text-gray-300'}`}>
                {a.name} ({a.seconds}s)
              </span>
              <div className="flex items-center gap-1 overflow-hidden w-0 group-hover:w-auto transition-all duration-300">
                <button 
                  onClick={() => handleEditAlert(a)} 
                  className="text-gray-400 hover:text-blue-500 p-0.5"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button 
                  onClick={() => setAlerts(alerts.filter(al => al.id !== a.id))} 
                  className="text-gray-400 hover:text-red-500 p-0.5"
                  title="Delete"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
