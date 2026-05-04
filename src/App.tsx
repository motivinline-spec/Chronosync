import { useState } from 'react';
import { Stopwatch } from './components/Stopwatch';
import { Timer } from './components/Timer';
import { Events } from './components/Events';
import { Timer as TimerIcon, Watch, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { WatchConnect } from './components/WatchConnect';
import { MobileShare } from './components/MobileShare';

export default function App() {
  const [activeTab, setActiveTab] = useState<'stopwatch' | 'timer' | 'events'>('stopwatch');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors">
      <header className="mb-8 w-full max-w-md flex items-center justify-between">
        <div className="text-left">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Chrono<span className="text-blue-600">Sync</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Precision Timing</p>
        </div>
        <div className="flex items-center gap-2">
          <MobileShare />
          <WatchConnect />
        </div>
      </header>

      <main className="w-full max-w-md">
        <div className="flex bg-gray-200 dark:bg-gray-900 p-1 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('stopwatch')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'stopwatch'
                ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Watch size={18} />
            <span className="font-semibold text-sm">Stopwatch</span>
          </button>
          <button
            onClick={() => setActiveTab('timer')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'timer'
                ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <TimerIcon size={18} />
            <span className="font-semibold text-sm">Timer</span>
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'events'
                ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <CalendarDays size={18} />
            <span className="font-semibold text-sm">Events</span>
          </button>
        </div>

        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'stopwatch' && (
              <motion.div
                key="stopwatch"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Stopwatch />
              </motion.div>
            )}
            {activeTab === 'timer' && (
              <motion.div
                key="timer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Timer />
              </motion.div>
            )}
            {activeTab === 'events' && (
              <motion.div
                key="events"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Events />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="mt-12 text-sm text-gray-400 dark:text-gray-600">
        &copy; {new Date().getFullYear()} ChronoSync • Time Management Made Simple
      </footer>
    </div>
  );
}
