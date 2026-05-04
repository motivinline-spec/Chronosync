import { useState, useEffect, useRef } from 'react';
import { 
  Plus, X, Play, Pause, RotateCcw, 
  Save, Trash2, Repeat, Clock, Activity, Settings2, Pencil
} from 'lucide-react';

type VibrationType = 'none' | 'short' | 'long' | 'double' | 'triple';
type SoundType = 'sine' | 'square' | 'triangle' | 'sawtooth' | 'pulse';

interface EventLabel {
  id: string;
  name: string;
  triggerSeconds: number;
  soundType: SoundType;
  vibrationType: VibrationType;
  triggered: boolean;
}

interface EventTask {
  id: string;
  name: string;
  totalDuration: number; // in seconds
  loopCount: number; // 0 for infinite, 1 for once, etc.
  labels: EventLabel[];
  currentLoop: number;
  lastUpdated: number;
}

export const Events: React.FC = () => {
  const [tasks, setTasks] = useState<EventTask[]>(() => {
    const saved = localStorage.getItem('chrono_events');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [time, setTime] = useState(0); // ms
  const [isRunning, setIsRunning] = useState(false);
  const [currentLoop, setCurrentLoop] = useState(1);
  
  // Creation / Editing States
  const [isCreating, setIsCreating] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDuration, setNewDuration] = useState<number | ''>('');
  const [newLoops, setNewLoops] = useState<number>(1);
  const [tempLabels, setTempLabels] = useState<Omit<EventLabel, 'triggered'>[]>([]);
  
  // New Label Inputs
  const [labelName, setLabelName] = useState('');
  const [labelSec, setLabelSec] = useState<number | ''>('');
  const [labelSound, setLabelSound] = useState<SoundType>('sine');
  const [labelVib, setLabelVib] = useState<VibrationType>('short');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem('chrono_events', JSON.stringify(tasks));
  }, [tasks]);

  const triggerAlert = (sound: SoundType, vib: VibrationType) => {
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const osc = audioCtx.current.createOscillator();
      const gain = audioCtx.current.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.current.destination);
      osc.type = sound === 'pulse' ? 'square' : sound;
      osc.frequency.setValueAtTime(sound === 'square' ? 440 : 880, audioCtx.current.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtx.current.currentTime + 0.5);

      if ('vibrate' in navigator) {
        const patterns: Record<VibrationType, number[]> = {
          none: [],
          short: [150],
          long: [500],
          double: [150, 100, 150],
          triple: [150, 50, 150, 50, 150]
        };
        navigator.vibrate(patterns[vib]);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isRunning && activeTaskId) {
      const task = tasks.find(t => t.id === activeTaskId);
      if (!task) return;

      timerRef.current = setInterval(() => {
        setTime(prev => {
          const nextTime = prev + 10;
          const totalMs = task.totalDuration * 1000;

          // Check Labels
          task.labels.forEach(label => {
            if (!label.triggered && nextTime >= label.triggerSeconds * 1000) {
              triggerAlert(label.soundType, label.vibrationType);
              // We need to mark it triggered in state, but carefully
              setTasks(prevTasks => prevTasks.map(t => 
                t.id === activeTaskId 
                  ? { ...t, labels: t.labels.map(l => l.id === label.id ? { ...l, triggered: true } : l) }
                  : t
              ));
            }
          });

          // Check End of Task
          if (nextTime >= totalMs) {
            if (task.loopCount === 0 || currentLoop < task.loopCount) {
              // Loop
              setCurrentLoop(prev => prev + 1);
              // Reset triggers for labels
              setTasks(prevTasks => prevTasks.map(t => 
                t.id === activeTaskId 
                  ? { ...t, labels: t.labels.map(l => ({ ...l, triggered: false })) }
                  : t
              ));
              return 0;
            } else {
              // Finish
              setIsRunning(false);
              triggerAlert('pulse', 'triple');
              return totalMs;
            }
          }

          return nextTime;
        });
      }, 10);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, activeTaskId, currentLoop, tasks]);

  const addTempLabel = () => {
    if (labelSec !== '' && labelSec > 0) {
      if (editingLabelId) {
        setTempLabels(tempLabels.map(l => l.id === editingLabelId ? {
          ...l,
          name: labelName || l.name,
          triggerSeconds: Number(labelSec),
          soundType: labelSound,
          vibrationType: labelVib
        } : l).sort((a, b) => a.triggerSeconds - b.triggerSeconds));
        setEditingLabelId(null);
      } else {
        setTempLabels([...tempLabels, {
          id: Math.random().toString(36).substr(2, 9),
          name: labelName || `Label ${tempLabels.length + 1}`,
          triggerSeconds: Number(labelSec),
          soundType: labelSound,
          vibrationType: labelVib
        }].sort((a, b) => a.triggerSeconds - b.triggerSeconds));
      }
      setLabelName('');
      setLabelSec('');
      setLabelSound('sine');
      setLabelVib('short');
    }
  };

  const handleEditLabel = (label: Omit<EventLabel, 'triggered'>) => {
    setEditingLabelId(label.id);
    setLabelName(label.name);
    setLabelSec(label.triggerSeconds);
    setLabelSound(label.soundType);
    setLabelVib(label.vibrationType);
  };

  const saveTask = () => {
    if (newName && newDuration) {
      if (editingTaskId) {
        setTasks(tasks.map(t => t.id === editingTaskId ? {
          ...t,
          name: newName,
          totalDuration: Number(newDuration),
          loopCount: newLoops,
          labels: tempLabels.map(l => ({ ...l, triggered: false })),
          lastUpdated: Date.now()
        } : t));
      } else {
        const newTask: EventTask = {
          id: Math.random().toString(36).substr(2, 9),
          name: newName,
          totalDuration: Number(newDuration),
          loopCount: newLoops,
          labels: tempLabels.map(l => ({ ...l, triggered: false })),
          currentLoop: 1,
          lastUpdated: Date.now()
        };
        setTasks([newTask, ...tasks]);
      }
      setIsCreating(false);
      setEditingTaskId(null);
      setNewName('');
      setNewDuration('');
      setNewLoops(1);
      setTempLabels([]);
    }
  };

  const handleEdit = (task: EventTask) => {
    setEditingTaskId(task.id);
    setNewName(task.name);
    setNewDuration(task.totalDuration);
    setNewLoops(task.loopCount);
    setTempLabels(task.labels.map(({ triggered, ...rest }) => rest));
    setIsCreating(true);
    // If it was active, stop it
    if (activeTaskId === task.id) {
      setIsRunning(false);
      setActiveTaskId(null);
    }
  };

  const quickStart = (task: EventTask) => {
    if (activeTaskId === task.id) {
      setIsRunning(!isRunning);
    } else {
      setActiveTaskId(task.id);
      setTime(0);
      setCurrentLoop(1);
      setIsRunning(true);
      // Reset triggers for this specific task
      setTasks(prev => prev.map(t => t.id === task.id ? {...t, labels: t.labels.map(l => ({...l, triggered: false}))} : t));
    }
  };

  const deleteTask = (id: string) => {
    if (window.confirm("Delete this event?")) {
      setTasks(tasks.filter(t => t.id !== id));
      if (activeTaskId === id) {
        setActiveTaskId(null);
        setIsRunning(false);
        setTime(0);
      }
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const rs = s % 60;
    const rm = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}.${rm.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Creation Toggle */}
      {!isCreating && !activeTaskId && (
        <button 
          onClick={() => { setIsCreating(true); setEditingTaskId(null); }}
          className="w-full py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-all"
        >
          <Plus size={32} />
          <span className="font-bold">Create New Event Task</span>
        </button>
      )}

      {/* Creation/Edit Form */}
      {isCreating && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold dark:text-white">
              {editingTaskId ? 'Edit Event Task' : 'New Event Task'}
            </h2>
            <button onClick={() => { setIsCreating(false); setEditingTaskId(null); }}><X className="dark:text-white" /></button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Event Name</label>
                <input 
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border-none rounded-xl px-4 py-2 dark:text-white"
                  placeholder="Morning Yoga"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Total Duration (Seconds)</label>
                <input 
                  type="number" value={newDuration} onChange={e => setNewDuration(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-gray-50 dark:bg-gray-700 border-none rounded-xl px-4 py-2 dark:text-white"
                  placeholder="60"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                <Repeat size={12} /> Loop Count (0 for infinite)
              </label>
              <input 
                type="number" value={newLoops} onChange={e => setNewLoops(Number(e.target.value))}
                className="w-full bg-gray-50 dark:bg-gray-700 border-none rounded-xl px-4 py-2 dark:text-white"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl space-y-3">
              <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Add Labels (Triggers)</label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" placeholder="Label name" value={labelName} onChange={e => setLabelName(e.target.value)}
                  className="bg-white dark:bg-gray-800 border-none rounded-lg px-3 py-2 text-xs dark:text-white"
                />
                <input 
                  type="number" placeholder="At Second" value={labelSec} onChange={e => setLabelSec(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bg-white dark:bg-gray-800 border-none rounded-lg px-3 py-2 text-xs dark:text-white"
                />
                <select 
                  value={labelSound} onChange={e => setLabelSound(e.target.value as SoundType)}
                  className="bg-white dark:bg-gray-800 border-none rounded-lg px-3 py-2 text-xs dark:text-white"
                >
                  <option value="sine">Sine Sound</option>
                  <option value="square">Square Sound</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="pulse">Pulse</option>
                </select>
                <select 
                  value={labelVib} onChange={e => setLabelVib(e.target.value as VibrationType)}
                  className="bg-white dark:bg-gray-800 border-none rounded-lg px-3 py-2 text-xs dark:text-white"
                >
                  <option value="short">Short Vib</option>
                  <option value="double">Double Vib</option>
                  <option value="triple">Triple Vib</option>
                  <option value="long">Long Vib</option>
                  <option value="none">No Vib</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={addTempLabel}
                  className={`flex-1 py-2 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    editingLabelId ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {editingLabelId ? <Save size={14} /> : <Plus size={14} />}
                  {editingLabelId ? 'Save Label' : 'Add Label'}
                </button>
                {editingLabelId && (
                  <button 
                    onClick={() => { setEditingLabelId(null); setLabelName(''); setLabelSec(''); }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {tempLabels.map(l => (
                  <div 
                    key={l.id} 
                    className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 border transition-all ${
                      editingLabelId === l.id 
                        ? 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-300' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span onClick={() => handleEditLabel(l)} className="cursor-pointer">
                      {l.name} ({l.triggerSeconds}s)
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditLabel(l)} className="hover:text-blue-500">
                        <Pencil size={10} />
                      </button>
                      <button onClick={() => setTempLabels(tempLabels.filter(tl => tl.id !== l.id))} className="hover:text-red-500">
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={saveTask}
              disabled={!newName || !newDuration}
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-50"
            >
              <Save size={20} /> Save Event Task
            </button>
          </div>
        </div>
      )}

      {/* Active Task Player */}
      {activeTaskId && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl space-y-8 border-2 border-blue-500 animate-in zoom-in-95">
          {(() => {
            const task = tasks.find(t => t.id === activeTaskId);
            if (!task) return null;
            return (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black dark:text-white">{task.name}</h2>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1">
                        <Repeat size={12} /> Loop {currentLoop} {task.loopCount > 0 ? `of ${task.loopCount}` : '(∞)'}
                      </span>
                      <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                        <Clock size={12} /> Duration: {task.totalDuration}s
                      </span>
                    </div>
                  </div>
                  <button onClick={() => { setActiveTaskId(null); setIsRunning(false); setTime(0); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-7xl font-mono font-black dark:text-white tabular-nums tracking-tighter">
                    {formatTime(time)}
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full mt-6 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-100"
                      style={{ width: `${(time / (task.totalDuration * 1000)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {task.labels.map(l => (
                    <div key={l.id} className={`p-3 rounded-xl border transition-all flex items-center justify-between ${l.triggered ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                      <span className={`text-xs font-bold ${l.triggered ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{l.name}</span>
                      <span className="text-[10px] font-mono text-gray-400">{l.triggerSeconds}s</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center items-center gap-6">
                  <button onClick={() => { setTime(0); setCurrentLoop(1); setTasks(tasks.map(t => t.id === activeTaskId ? {...t, labels: t.labels.map(l => ({...l, triggered: false}))} : t)); }} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500"><RotateCcw size={24} /></button>
                  <button 
                    onClick={() => setIsRunning(!isRunning)}
                    className={`p-6 rounded-full text-white shadow-xl ${isRunning ? 'bg-red-500' : 'bg-blue-600'}`}
                  >
                    {isRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Task List */}
      {!isCreating && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {activeTaskId ? 'Other Events' : 'Saved Events'}
            </h3>
            {activeTaskId && (
               <button 
                onClick={() => { setActiveTaskId(null); setIsRunning(false); }}
                className="text-xs font-bold text-blue-600 hover:underline"
               >
                 Close Active Player
               </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3">
            {tasks.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No events yet. Start by creating one!</div>
            )}
            {tasks.map(task => (
              <div 
                key={task.id} 
                className={`bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border transition-all flex items-center justify-between group ${
                  activeTaskId === task.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-100 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${activeTaskId === task.id ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                    <Activity size={24} />
                  </div>
                  <div className="cursor-pointer" onClick={() => { setActiveTaskId(task.id); setIsRunning(false); setTime(0); }}>
                    <h4 className="font-bold dark:text-white">{task.name}</h4>
                    <div className="text-[10px] text-gray-400 font-bold flex gap-3">
                      <span>{task.totalDuration}s</span>
                      <span>{task.loopCount === 0 ? '∞' : `L${task.loopCount}`}</span>
                      <span>{task.labels.length} LABELS</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => quickStart(task)}
                    className={`p-2 rounded-lg transition-all ${
                      activeTaskId === task.id && isRunning 
                        ? 'text-red-500 hover:bg-red-50' 
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={activeTaskId === task.id && isRunning ? "Pause" : "Quick Start"}
                  >
                    {activeTaskId === task.id && isRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  <button 
                    onClick={() => handleEdit(task)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                    title="Edit Task"
                  >
                    <Settings2 size={20} />
                  </button>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete Task"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
