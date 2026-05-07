import { useState } from 'react';
import { Stopwatch } from './components/Stopwatch';
import { Timer } from './components/Timer';
import { Events } from './components/Events';
import { Timer as TimerIcon, Watch, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [activeTab, setActiveTab] = useState<'stopwatch' | 'timer' | 'events'>('stopwatch');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Chrono<span className="text-blue-600">Sync</span>
        </h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Precision Timing</p>
      </header>

      <main className="w-full max-w-md">
        <div className="flex bg-gray-200 dark:bg-gray-900 p-1 rounded-2xl mb-8">
          <button onClick={() => setActiveTab('stopwatch')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 ${activeTab === 'stopwatch' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400'}`}><Watch size={18} /> <span className="font-bold text-xs">Stopwatch</span></button>
          <button onClick={() => setActiveTab('timer')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 ${activeTab === 'timer' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400'}`}><TimerIcon size={18} /> <span className="font-bold text-xs">Timer</span></button>
          <button onClick={() => setActiveTab('events')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 ${activeTab === 'events' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400'}`}><CalendarDays size={18} /> <span className="font-bold text-xs">Events</span></button>
        </div>

        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'stopwatch' && (
              <motion.div key="stopwatch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Stopwatch />
              </motion.div>
            )}
            {activeTab === 'timer' && (
              <motion.div key="timer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Timer />
              </motion.div>
            )}
            {activeTab === 'events' && (
              <motion.div key="events" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Events />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
