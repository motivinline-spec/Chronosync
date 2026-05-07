import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, X, GripVertical, Repeat, Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { TaskEvent, EventLabel, SOUNDS, VIBRATIONS } from '../types';
import { playSound, runVibration, initAudio } from '../utils';
import confetti from 'canvas-confetti';

const EventsTab: React.FC = () => {
  const [events, setEvents] = useState<TaskEvent[]>(() => {
    const saved = localStorage.getItem('chrono_events_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeEvent, setActiveEvent] = useState<TaskEvent | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentLoop, setCurrentLoop] = useState(1);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<TaskEvent>>({
    name: '', labels: [], loops: 1
  });

  const [newLabelForm, setNewLabelForm] = useState<Partial<EventLabel>>({
    name: '', duration: 30, soundId: 'sine', vibrationId: 'short'
  });

  const [editingLabelIdx, setEditingLabelIdx] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('chrono_events_tasks', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    if (isRunning && activeEvent) {
      timerRef.current = window.setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 0.1) {
            handleStepComplete();
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, activeEvent, currentStepIndex, currentLoop]);

  const handleStepComplete = () => {
    if (!activeEvent) return;
    const currentLabel = activeEvent.labels[currentStepIndex];
    if (currentLabel) {
      playSound(currentLabel.soundId);
      const vibe = VIBRATIONS.find(v => v.id === currentLabel.vibrationId);
      if (vibe) runVibration(vibe.pattern);
    }

    if (currentStepIndex < activeEvent.labels.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setRemainingTime(activeEvent.labels[nextIndex].duration);
    } else if (currentLoop < activeEvent.loops) {
      setCurrentLoop(prev => prev + 1);
      setCurrentStepIndex(0);
      setRemainingTime(activeEvent.labels[0].duration);
    } else {
      setIsRunning(false);
      confetti();
    }
  };

  const startEvent = (event: TaskEvent) => {
    if (event.labels.length === 0) return;
    initAudio();
    setActiveEvent(event);
    setCurrentStepIndex(0);
    setCurrentLoop(1);
    setRemainingTime(event.labels[0].duration);
    setIsRunning(true);
  };

  const handleSaveEvent = () => {
    if (!formData.name || !formData.labels?.length) return;
    if (editingId === 'new') {
      const newEvent: TaskEvent = {
        id: Date.now().toString(),
        name: formData.name,
        labels: formData.labels,
        loops: formData.loops || 1
      };
      setEvents([...events, newEvent]);
    } else if (editingId) {
      setEvents(events.map(e => e.id === editingId ? { ...e, ...formData } as TaskEvent : e));
    }
    setEditingId(null);
  };

  const addOrUpdateLabelInForm = () => {
    if (!newLabelForm.name) return;
    const label: EventLabel = {
      id: Date.now().toString(),
      name: newLabelForm.name,
      duration: newLabelForm.duration || 30,
      soundId: newLabelForm.soundId || 'sine',
      vibrationId: newLabelForm.vibrationId || 'short'
    };

    if (editingLabelIdx !== null) {
      const updatedLabels = [...(formData.labels || [])];
      updatedLabels[editingLabelIdx] = label;
      setFormData(prev => ({ ...prev, labels: updatedLabels }));
      setEditingLabelIdx(null);
    } else {
      setFormData(prev => ({ ...prev, labels: [...(prev.labels || []), label] }));
    }
    setNewLabelForm({ name: '', duration: 30, soundId: 'sine', vibrationId: 'short' });
  };

  const formatCountdown = (sec: number) => {
    const s = Math.ceil(sec);
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
  };

  const calculateTotalDuration = (ev: Partial<TaskEvent>) => {
    const loopDuration = (ev.labels || []).reduce((sum, l) => sum + l.duration, 0);
    return loopDuration * (ev.loops || 1);
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}m ${rs}s`;
  };

  return (
    <div className="space-y-6">
      {activeEvent && (
        <div className="bg-blue-600/10 p-8 rounded-[32px] border border-blue-500/20 flex flex-col items-center shadow-xl animate-in fade-in zoom-in">
          <h3 className="text-xl font-bold text-blue-400 mb-1">{activeEvent.name}</h3>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 flex gap-3">
            <span>Step {currentStepIndex + 1}/{activeEvent.labels.length}</span>
            <span>Loop {currentLoop}/{activeEvent.loops}</span>
          </div>
          <div className="text-6xl font-black text-white mb-2 tabular-nums">{formatCountdown(remainingTime)}</div>
          <div className="text-sm font-bold text-blue-100 mb-8 uppercase tracking-widest">{activeEvent.labels[currentStepIndex]?.name}</div>
          <div className="flex gap-4">
            <button onClick={() => setIsRunning(!isRunning)} className={`p-4 rounded-full ${isRunning ? 'bg-red-500' : 'bg-blue-600'} text-white shadow-lg active:scale-95 transition-all`}>
              {isRunning ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
            </button>
            <button onClick={handleStepComplete} className="p-4 bg-white/10 rounded-full text-white active:scale-95"><SkipForward className="w-7 h-7" /></button>
            <button onClick={() => { setActiveEvent(null); setIsRunning(false); }} className="p-4 bg-white/10 rounded-full text-white active:scale-95"><RotateCcw className="w-7 h-7" /></button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Event Tasks</h2>
        <button onClick={() => { setEditingId('new'); setFormData({ name: '', labels: [], loops: 1 }); }} className="bg-blue-600 text-white p-2 rounded-full shadow-lg active:scale-95">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {editingId && (
        <div className="bg-[#161d2b] p-6 rounded-[32px] border border-white/5 space-y-4 shadow-2xl">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-blue-400">{editingId === 'new' ? 'New Task' : 'Edit Task'}</h3>
            <button onClick={() => setEditingId(null)} className="text-gray-500"><X className="w-5 h-5" /></button>
          </div>
          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#0a0f18] border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none" placeholder="Task Name" />
          
          <div className="flex items-center justify-between px-1">
             <div className="w-32">
                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 ml-1 flex items-center gap-2"><Repeat className="w-3 h-3" /> Loops</label>
                <input type="number" min="1" value={formData.loops} onChange={(e) => setFormData({ ...formData, loops: parseInt(e.target.value) || 1 })} className="w-full bg-[#0a0f18] border border-white/5 rounded-xl px-4 py-3 text-sm" />
             </div>
             <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Total Duration</div>
                <div className="text-blue-400 font-bold">{formatSecs(calculateTotalDuration(formData))}</div>
             </div>
          </div>

          <div className="space-y-2 border-t border-white/5 pt-4">
            <label className="text-[10px] text-gray-500 uppercase font-bold block ml-1">{editingLabelIdx !== null ? 'Edit Label' : 'Add Label'}</label>
            <div className="flex flex-col gap-2 p-3 bg-black/20 rounded-2xl">
              <input type="text" value={newLabelForm.name} onChange={(e) => setNewLabelForm({ ...newLabelForm, name: e.target.value })} className="bg-[#0a0f18] border border-white/5 rounded-lg px-3 py-2 text-xs" placeholder="Label Name" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={newLabelForm.duration} onChange={(e) => setNewLabelForm({ ...newLabelForm, duration: parseInt(e.target.value) || 0 })} className="bg-[#0a0f18] border border-white/5 rounded-lg px-3 py-2 text-xs" placeholder="Secs" />
                <select value={newLabelForm.soundId} onChange={(e) => setNewLabelForm({ ...newLabelForm, soundId: e.target.value })} className="bg-[#0a0f18] border border-white/5 rounded-lg px-3 py-2 text-xs">
                  {SOUNDS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <select value={newLabelForm.vibrationId} onChange={(e) => setNewLabelForm({ ...newLabelForm, vibrationId: e.target.value })} className="flex-1 bg-[#0a0f18] border border-white/5 rounded-lg px-3 py-2 text-xs">
                  {VIBRATIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <button onClick={addOrUpdateLabelInForm} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold">{editingLabelIdx !== null ? 'Update' : 'Add'}</button>
                {editingLabelIdx !== null && <button onClick={() => { setEditingLabelIdx(null); setNewLabelForm({ name: '', duration: 30, soundId: 'sine', vibrationId: 'short' }); }} className="bg-white/5 text-gray-400 px-3 py-2 rounded-lg text-xs"><X className="w-3 h-3"/></button>}
              </div>
            </div>

            <div className="space-y-1 mt-4 max-h-40 overflow-y-auto pr-1">
              {formData.labels?.map((label, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#0a0f18] p-2 rounded-xl border border-white/5 group">
                  <GripVertical className="w-3 h-3 text-gray-600" />
                  <div className="flex-1">
                    <div className="text-xs font-bold">{label.name}</div>
                    <div className="text-[8px] text-gray-500 uppercase tracking-tighter">{label.duration}s • {label.soundId} • {VIBRATIONS.find(v=>v.id===label.vibrationId)?.name}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingLabelIdx(idx); setNewLabelForm(label); }} className="p-1.5 text-gray-600 hover:text-blue-500"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => setFormData(prev => ({ ...prev, labels: prev.labels?.filter((_, i) => i !== idx) }))} className="p-1.5 text-gray-600 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={handleSaveEvent} disabled={!formData.name || !formData.labels?.length} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50">Save Task</button>
        </div>
      )}

      <div className="space-y-3">
        {events.map(event => (
          <div key={event.id} className="bg-[#161d2b] border border-white/5 p-4 rounded-2xl flex items-center justify-between group shadow-md">
            <div className="flex-1 cursor-pointer" onClick={() => startEvent(event)}>
              <h3 className="font-bold text-white">{event.name}</h3>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-3">
                <span className="flex items-center gap-1"><Repeat className="w-2.5 h-2.5" /> {event.loops}x</span>
                <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                <span>{event.labels.length} steps</span>
                <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                <span>{formatSecs(calculateTotalDuration(event))}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditingId(event.id); setFormData(event); }} className="p-2 text-gray-600 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => setEvents(events.filter(e => e.id !== event.id))} className="p-2 text-gray-600 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventsTab;
