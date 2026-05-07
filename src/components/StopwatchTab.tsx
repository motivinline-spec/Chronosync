import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Bell, Plus, Trash2, FileDown, Edit2, Save } from 'lucide-react';
import { StopwatchAlert, SOUNDS, VIBRATIONS } from '../types';
import { playSound, runVibration, initAudio } from '../utils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const StopwatchTab: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // deciseconds
  const [alerts, setAlerts] = useState<StopwatchAlert[]>(() => {
    const saved = localStorage.getItem('chrono_sw_alerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelSecs, setNewLabelSecs] = useState('');
  const [newLabelSound, setNewLabelSound] = useState('sine');
  const [newLabelVibe, setNewLabelVibe] = useState('short');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const triggeredAlerts = useRef<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('chrono_sw_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTime(prev => {
          const next = prev + 1;
          checkAlerts(next);
          return next;
        });
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, alerts]);

  const checkAlerts = (currentTimeDs: number) => {
    const currentTimeSecs = Math.floor(currentTimeDs / 10);
    alerts.forEach(alert => {
      if (alert.timeSecs === currentTimeSecs && !triggeredAlerts.current.has(alert.id)) {
        playSound(alert.soundId);
        const vibe = VIBRATIONS.find(v => v.id === alert.vibrationId);
        if (vibe) runVibration(vibe.pattern);
        triggeredAlerts.current.add(alert.id);
      }
    });
  };

  const handleSaveAlert = () => {
    if (!newLabelName || !newLabelSecs) return;
    
    if (editingId) {
      setAlerts(alerts.map(a => a.id === editingId ? {
        ...a,
        name: newLabelName,
        timeSecs: parseInt(newLabelSecs),
        soundId: newLabelSound,
        vibrationId: newLabelVibe
      } : a));
      setEditingId(null);
    } else {
      const newAlert: StopwatchAlert = {
        id: Date.now().toString(),
        name: newLabelName,
        timeSecs: parseInt(newLabelSecs),
        soundId: newLabelSound,
        vibrationId: newLabelVibe
      };
      setAlerts([...alerts, newAlert]);
    }
    setNewLabelName('');
    setNewLabelSecs('');
  };

  const startEdit = (alert: StopwatchAlert) => {
    setEditingId(alert.id);
    setNewLabelName(alert.name);
    setNewLabelSecs(alert.timeSecs.toString());
    setNewLabelSound(alert.soundId);
    setNewLabelVibe(alert.vibrationId);
  };

  const removeAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const formatTime = (ds: number) => {
    const totalSecs = Math.floor(ds / 10);
    const minutes = Math.floor(totalSecs / 60);
    const seconds = totalSecs % 60;
    const deciseconds = ds % 10;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${deciseconds}0`;
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const totalTimeStr = formatTime(time);
    const totalSecs = time / 10;
    doc.setFontSize(20);
    doc.text('ChronoSync - Stopwatch Report', 14, 22);
    doc.setFontSize(12);
    doc.text(`Total Session Time: ${totalTimeStr}`, 14, 32);
    const tableData = alerts.map(alert => {
      const diff = totalSecs - alert.timeSecs;
      const status = diff >= 0 ? `Completed (+${diff.toFixed(1)}s)` : `Not Reached`;
      return [alert.name, `${alert.timeSecs}s`, status];
    });
    (doc as any).autoTable({
      startY: 40,
      head: [['Alert Label', 'Target Time', 'Result']],
      body: tableData,
    });
    doc.save(`Stopwatch_Report.pdf`);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    triggeredAlerts.current.clear();
  };

  return (
    <div className="flex flex-col gap-6 py-2 relative">
      <div className="bg-[#161d2b] p-6 rounded-[32px] border border-white/5 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Configure Alert Points</h2>
          <Bell className="w-4 h-4 text-blue-500/50" />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-blue-400">{editingId ? 'Edit Alert' : 'Add New Alert'}</span>
            {editingId && <button onClick={() => { setEditingId(null); setNewLabelName(''); setNewLabelSecs(''); }} className="text-xs text-gray-500 underline">Cancel</button>}
          </div>
          <input
            type="text"
            placeholder="Label (e.g. Lap 1)"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            className="w-full bg-[#0a0f18] border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Secs"
              value={newLabelSecs}
              onChange={(e) => setNewLabelSecs(e.target.value)}
              className="bg-[#0a0f18] border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
            <select
              value={newLabelSound}
              onChange={(e) => setNewLabelSound(e.target.value)}
              className="bg-[#0a0f18] border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none"
            >
              {SOUNDS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <select
              value={newLabelVibe}
              onChange={(e) => setNewLabelVibe(e.target.value)}
              className="flex-1 bg-[#0a0f18] border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none"
            >
              {VIBRATIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <button onClick={handleSaveAlert} className="bg-blue-600 text-white p-3 rounded-xl active:scale-95 transition-all">
              {editingId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-6xl font-black mb-12 font-mono tabular-nums">
            {formatTime(time).split('.')[0]}
            <span className="text-3xl opacity-50">.{formatTime(time).split('.')[1]}</span>
          </div>
          <div className="flex items-center gap-8">
            <button onClick={handleReset} className="p-4 bg-white/5 rounded-full text-gray-500 hover:text-white transition-all active:scale-90">
              <RotateCcw className="w-8 h-8" />
            </button>
            <button
              onClick={() => { if(!isRunning) initAudio(); setIsRunning(!isRunning); }}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-white transition-all shadow-xl active:scale-90 ${isRunning ? 'bg-red-500' : 'bg-blue-600 animate-glow'}`}
            >
              {isRunning ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
            </button>
            <button onClick={exportPDF} disabled={time === 0} className="p-4 bg-white/5 rounded-full text-gray-500 hover:text-white disabled:opacity-20 transition-all active:scale-90">
              <FileDown className="w-8 h-8" />
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 mt-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4">Stopwatch Alerts</h2>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between bg-[#0a0f18] p-3 rounded-xl border border-white/5 group">
                <div>
                  <div className="text-sm font-bold">{alert.name}</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase">{alert.timeSecs}s • {alert.soundId} • {VIBRATIONS.find(v=>v.id===alert.vibrationId)?.name}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(alert)} className="p-2 text-gray-600 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => removeAlert(alert.id)} className="text-gray-600 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StopwatchTab;
