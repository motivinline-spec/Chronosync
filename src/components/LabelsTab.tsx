import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, X, Play, Pause, RotateCcw } from 'lucide-react';
import { Label, SOUNDS, VIBRATIONS } from '../types';
import { playSound, runVibration, initAudio } from '../utils';
import confetti from 'canvas-confetti';

const LabelsTab: React.FC = () => {
  const [labels, setLabels] = useState<Label[]>(() => {
    const saved = localStorage.getItem('chrono_timer_labels');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Label>>({
    name: '', duration: 60, vibrationId: 'short', soundId: 'sine'
  });
  
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('chrono_timer_labels', JSON.stringify(labels));
  }, [labels]);

  useEffect(() => {
    if (isRunning && activeLabelId) {
      timerRef.current = window.setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 0.1) {
            const label = labels.find(l => l.id === activeLabelId);
            if (label) {
              playSound(label.soundId);
              const vibe = VIBRATIONS.find(v => v.id === label.vibrationId);
              if (vibe) runVibration(vibe.pattern);
            }
            setIsRunning(false);
            confetti();
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, activeLabelId, labels]);

  const startLabel = (label: Label) => {
    initAudio();
    setActiveLabelId(label.id);
    setRemainingTime(label.duration);
    setIsRunning(true);
  };

  const handleSave = () => {
    if (!formData.name) return;
    if (editingId === 'new') {
      const newLabel: Label = {
        id: Date.now().toString(),
        name: formData.name!,
        duration: formData.duration || 60,
        vibrationId: formData.vibrationId || 'short',
        soundId: formData.soundId || 'sine'
      };
      setLabels([...labels, newLabel]);
    } else if (editingId) {
      setLabels(labels.map(l => l.id === editingId ? { ...l, ...formData } as Label : l));
    }
    setEditingId(null);
  };

  const formatCountdown = (sec: number) => {
    const s = Math.ceil(sec);
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {activeLabelId && (
        <div className="bg-blue-600/10 p-8 rounded-[32px] border border-blue-500/20 flex flex-col items-center shadow-xl animate-in fade-in zoom-in">
          <h3 className="text-xl font-bold text-blue-400 mb-2">{labels.find(l => l.id === activeLabelId)?.name}</h3>
          <div className="text-6xl font-black text-white mb-6 tabular-nums">{formatCountdown(remainingTime)}</div>
          <div className="flex gap-4">
            <button onClick={() => setIsRunning(!isRunning)} className={`p-4 rounded-full ${isRunning ? 'bg-red-500' : 'bg-blue-600'} text-white shadow-lg active:scale-95 transition-all`}>
              {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
            <button onClick={() => { setActiveLabelId(null); setIsRunning(false); }} className="p-4 bg-white/10 rounded-full text-white active:scale-95 transition-all">
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Timer Labels</h2>
        <button onClick={() => { setEditingId('new'); setFormData({ name: '', duration: 60, vibrationId: 'short', soundId: 'sine' }); }} className="bg-blue-600 text-white p-2 rounded-full shadow-lg active:scale-95">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {editingId && (
        <div className="bg-[#161d2b] p-6 rounded-[32px] border border-white/5 space-y-4 shadow-2xl">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-blue-400">{editingId === 'new' ? 'New Label' : 'Edit Label'}</h3>
            <button onClick={() => setEditingId(null)} className="text-gray-500"><X className="w-5 h-5" /></button>
          </div>
          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#0a0f18] border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none" placeholder="Label Name" />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 ml-1 block">Seconds</label>
              <input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })} className="w-full bg-[#0a0f18] border border-white/5 rounded-xl px-4 py-3 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 ml-1 block">Sound</label>
              <select value={formData.soundId} onChange={(e) => setFormData({ ...formData, soundId: e.target.value })} className="w-full bg-[#0a0f18] border border-white/5 rounded-xl px-4 py-3 text-sm">
                {SOUNDS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 ml-1 block">Vibration</label>
            <select value={formData.vibrationId} onChange={(e) => setFormData({ ...formData, vibrationId: e.target.value })} className="w-full bg-[#0a0f18] border border-white/5 rounded-xl px-4 py-3 text-sm">
              {VIBRATIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <button onClick={handleSave} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95">Save Label</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {labels.map(label => (
          <div key={label.id} className="bg-[#161d2b] border border-white/5 p-4 rounded-2xl flex items-center justify-between group shadow-md">
            <div className="flex-1 cursor-pointer" onClick={() => startLabel(label)}>
              <h3 className="font-bold text-white">{label.name}</h3>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2">
                <span>{label.duration}s</span>
                <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                <span>{SOUNDS.find(s => s.id === label.soundId)?.name}</span>
                <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                <span>{VIBRATIONS.find(v => v.id === label.vibrationId)?.name}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditingId(label.id); setFormData(label); }} className="p-2 text-gray-600 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => setLabels(labels.filter(l => l.id !== label.id))} className="p-2 text-gray-600 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LabelsTab;
