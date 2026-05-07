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
  totalDuration: number;
  loopCount: number; // 0 for infinite
  labels: EventLabel[];
}

export const Events: React.FC = () => {
  const [tasks, setTasks] = useState<EventTask[]>(() => {
    try {
      const saved = localStorage.getItem('chrono_events_v3');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [time, setTime] = useState(0); 
  const [isRunning, setIsRunning] = useState(false);
  const [currentLoop, setCurrentLoop] = useState(1);
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDuration, setNewDuration] = useState<number | ''>('');
  const [newLoops, setNewLoops] = useState<number>(1);
  const [tempLabels, setTempLabels] = useState<EventLabel[]>([]);
  
  const [labelName, setLabelName] = useState('');
  const [labelSec, setLabelSec] = useState<number | ''>('');
  const [labelSound, setLabelSound] = useState<SoundType>('sine');
  const [labelVib, setLabelVib] = useState<VibrationType>('short');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem('chrono_events_v3', JSON.stringify(tasks));
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
          none: [], short: [150], long: [500], double: [150, 100, 150], triple: [150, 50, 150, 50, 150]
        };
        navigator.vibrate(patterns[vib]);
      }
    } catch (e) {}
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
              setTasks(prevTasks => prevTasks.map(t => 
                t.id === activeTaskId 
                  ? { ...t, labels: t.labels.map(l => l.id === label.id ? { ...l, triggered: true } : l) }
                  : t
              ));
            }
          });

          if (nextTime >= totalMs) {
            if (task.loopCount === 0 || currentLoop < task.loopCount) {
              setCurrentLoop(prev => prev + 1);
              setTasks(prevTasks => prevTasks.map(t => 
                t.id === activeTaskId 
                  ? { ...t, labels: t.labels.map(l => ({ ...l, triggered: false })) }
                  : t
              ));
              return 0;
            } else {
              setIsRunning(false);
              triggerAlert('pulse', 'triple');
              return totalMs;
            }
          }
          return nextTime;
        });
      }, 10);
    } else { if (timerRef.current) clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, activeTaskId, currentLoop]);

  const addOrSaveLabel = () => {
    if (labelSec !== '' && labelSec > 0) {
      if (editingLabelId) {
        setTempLabels(tempLabels.map(l => l.id === editingLabelId ? { ...l, name: labelName || l.name, triggerSeconds: Number(labelSec), soundType: labelSound, vibrationType: labelVib } : l).sort((a,b) => a.triggerSeconds - b.triggerSeconds));
        setEditingLabelId(null);
      } else {
        const newL: EventLabel = { id: Math.random().toString(36).substr(2,9), name: labelName || `Label ${tempLabels.length + 1}`, triggerSeconds: Number(labelSec), soundType: labelSound, vibrationType: labelVib, triggered: false };
        setTempLabels([...tempLabels, newL].sort((a,b) => a.triggerSeconds - b.triggerSeconds));
      }
      setLabelName(''); setLabelSec('');
    }
  };

  const saveTask = () => {
    if (newName && newDuration) {
      if (editingTaskId) {
        setTasks(tasks.map(t => t.id === editingTaskId ? { ...t, name: newName, totalDuration: Number(newDuration), loopCount: newLoops, labels: tempLabels.map(l => ({...l, triggered: false})) } : t));
      } else {
        const task: EventTask = { id: Math.random().toString(36).substr(2, 9), name: newName, totalDuration: Number(newDuration), loopCount: newLoops, labels: tempLabels };
        setTasks([task, ...tasks]);
      }
      setIsCreating(false); setEditingTaskId(null); setTempLabels([]); setNewName(''); setNewDuration('');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {!isCreating && !activeTaskId && (
        <button onClick={() => {setIsCreating(true); setEditingTaskId(null); setTempLabels([]);}} className="w-full py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl text-gray-400 font-bold flex flex-col items-center gap-2 hover:border-blue-500 hover:text-blue-500 transition-all">
          <Plus size={32} /> Create Task
        </button>
      )}

      {isCreating && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl space-y-6">
          <div className="flex justify-between items-center"><h2 className="text-xl font-bold dark:text-white">{editingTaskId ? 'Edit Task' : 'New Task'}</h2><button onClick={() => setIsCreating(false)}><X className="dark:text-white"/></button></div>
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Task Name" value={newName} onChange={e => setNewName(e.target.value)} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl dark:text-white w-full" />
            <input type="number" placeholder="Total Duration (s)" value={newDuration} onChange={e => setNewDuration(Number(e.target.value))} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl dark:text-white w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Repeat size={16} className="text-gray-400" />
            <input type="number" placeholder="Loops (0 for infinite)" value={newLoops} onChange={e => setNewLoops(Number(e.target.value))} className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl dark:text-white" />
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl space-y-3">
             <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Label Name" value={labelName} onChange={e => setLabelName(e.target.value)} className="p-2 text-xs rounded-lg dark:bg-gray-800 dark:text-white" />
                <input type="number" placeholder="At (s)" value={labelSec} onChange={e => setLabelSec(Number(e.target.value))} className="p-2 text-xs rounded-lg dark:bg-gray-800 dark:text-white" />
                <select value={labelSound} onChange={e => setLabelSound(e.target.value as SoundType)} className="p-2 text-xs rounded-lg dark:bg-gray-800 dark:text-white"><option value="sine">Sine</option><option value="square">Square</option><option value="sawtooth">Sawtooth</option></select>
                <select value={labelVib} onChange={e => setLabelVib(e.target.value as VibrationType)} className="p-2 text-xs rounded-lg dark:bg-gray-800 dark:text-white"><option value="short">Short Vib</option><option value="double">Double Vib</option><option value="none">No Vib</option></select>
             </div>
             <button onClick={addOrSaveLabel} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">{editingLabelId ? 'Save Label' : 'Add Label'}</button>
             <div className="flex flex-wrap gap-2">
                {tempLabels.map(l => (
                  <div key={l.id} className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 border dark:border-gray-700 dark:text-gray-300">
                    <span onClick={() => {setEditingLabelId(l.id); setLabelName(l.name); setLabelSec(l.triggerSeconds);}} className="cursor-pointer">{l.name} ({l.triggerSeconds}s)</span>
                    <button onClick={() => setTempLabels(tempLabels.filter(tl => tl.id !== l.id))}><X size={10} /></button>
                  </div>
                ))}
             </div>
          </div>
          <button onClick={saveTask} className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200"><Save size={20} /> Save Task</button>
        </div>
      )}

      {activeTaskId && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl space-y-6 text-center border-2 border-blue-500">
          <div className="flex justify-between items-start">
            <div className="text-left"><h2 className="text-2xl font-black dark:text-white">{tasks.find(t => t.id === activeTaskId)?.name}</h2><span className="text-xs font-bold text-blue-500">LOOP {currentLoop}</span></div>
            <button onClick={() => {setActiveTaskId(null); setIsRunning(false); setTime(0);}} className="text-gray-400"><X /></button>
          </div>
          <div className="text-7xl font-mono font-black dark:text-white tabular-nums">{(time/1000).toFixed(2)}s</div>
          <div className="flex justify-center gap-6">
            <button onClick={() => setIsRunning(!isRunning)} className={`p-6 rounded-full text-white ${isRunning ? 'bg-red-500' : 'bg-blue-600'}`}>{isRunning ? <Pause size={32} /> : <Play size={32} />}</button>
          </div>
        </div>
      )}

      {!isCreating && !activeTaskId && (
        <div className="space-y-3">
          {tasks.map(t => (
            <div key={t.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex flex-col">
                <span className="font-bold dark:text-white">{t.name}</span>
                <span className="text-[10px] text-gray-400 uppercase font-bold">{t.totalDuration}s • {t.loopCount === 0 ? 'Infinite' : `${t.loopCount} Loops`} • {t.labels.length} Labels</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => {setActiveTaskId(t.id); setTime(0); setCurrentLoop(1); setIsRunning(true);}} className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><Play fill="currentColor" /></button>
                <button onClick={() => {setEditingTaskId(t.id); setNewName(t.name); setNewDuration(t.totalDuration); setNewLoops(t.loopCount); setTempLabels(t.labels); setIsCreating(true);}} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Settings2 /></button>
                <button onClick={() => setTasks(tasks.filter(tk => tk.id !== t.id))} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
