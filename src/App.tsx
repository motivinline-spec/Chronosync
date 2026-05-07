import React, { useState } from 'react';
import { Timer, Tag, ListChecks } from 'lucide-react';
import { Tab } from './types';
import LabelsTab from './components/LabelsTab';
import EventsTab from './components/EventsTab';
import StopwatchTab from './components/StopwatchTab';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('stopwatch');

  return (
    <div className="min-h-screen bg-[#0a0f18] text-white flex flex-col font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="px-6 pt-8 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter flex items-center gap-1">
            Chrono<span className="text-blue-500">Sync</span>
          </h1>
          <p className="text-[10px] tracking-[0.2em] font-bold text-gray-500 uppercase">Precision Timing</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Icons removed as per request */}
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="px-6 py-4">
        <div className="bg-[#161d2b] p-1 rounded-2xl flex gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('stopwatch')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'stopwatch' ? 'bg-[#1e293b] text-blue-500 shadow-md' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Timer className="w-4 h-4" /> Stopwatch
          </button>
          <button
            onClick={() => setActiveTab('timer')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'timer' ? 'bg-[#1e293b] text-blue-500 shadow-md' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Tag className="w-4 h-4" /> Timer
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'events' ? 'bg-[#1e293b] text-blue-500 shadow-md' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <ListChecks className="w-4 h-4" /> Events
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-24">
        <div className="max-w-md mx-auto h-full">
          {activeTab === 'stopwatch' && <StopwatchTab />}
          {activeTab === 'timer' && <LabelsTab />}
          {activeTab === 'events' && <EventsTab />}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-[10px] text-gray-600 font-medium uppercase tracking-wider">
        © 2026 ChronoSync • Time Management Made Simple
      </footer>
    </div>
  );
};

export default App;
