import React, { useState, useEffect } from 'react';
import { Activity, Clock, Award, Star, FileText, Image, Trash2, Plus } from 'lucide-react';

export default function ActivitySection({ notes, activeTheme }) {
  const isBlush = activeTheme === 'calm_light' || activeTheme === 'calm_dark';
  const isLiving = activeTheme === 'living_light' || activeTheme === 'living_dark';
  const isDark = activeTheme && activeTheme.includes('dark');

  const cardBg = activeTheme === 'calm_light'
    ? 'page-frame-pink border-2 border-dashed border-[#D2B48C] bg-white/75 backdrop-blur-sm rounded-[24px] shadow-lg shadow-pink-100'
    : activeTheme === 'calm_dark'
    ? 'page-frame-dark border-2 border-dashed border-[#D9A6C4] bg-[#3C2740]/80 backdrop-blur-sm rounded-[24px] shadow-xl shadow-black/40'
    : activeTheme === 'living_light'
    ? 'bg-[#FFFBF5] border border-[#E5D5C5] shadow-card-cozy rounded-2xl'
    : 'bg-[#2A1D15] border border-[#4A362A] shadow-panel rounded-2xl';

  const inputBg = activeTheme === 'calm_light'
    ? 'bg-white/80 border-2 border-pink-200 text-[#4B0082]'
    : activeTheme === 'calm_dark'
    ? 'bg-[#3C2740] border border-[#D9A6C4]/40 text-[#FCE8F3]'
    : activeTheme === 'living_light'
    ? 'bg-[#FFFBF5] border border-[#E5D5C5] text-[#5A4636] shadow-seal'
    : 'bg-[#3A2A1E] border border-[#4A362A] text-[#F2E6D3]';

  const textTitle = activeTheme === 'calm_light'
    ? 'text-hot-pink font-fredoka'
    : activeTheme === 'calm_dark'
    ? 'text-[#FCE8F3] font-fredoka'
    : activeTheme === 'living_light'
    ? 'text-[#3B2418] font-lora'
    : 'text-[#F2E6D3] font-lora';

  const textSub = activeTheme === 'calm_light'
    ? 'text-[#6A4C93]'
    : activeTheme === 'calm_dark'
    ? 'text-[#B497AC]'
    : activeTheme === 'living_light'
    ? 'text-[#5A4636]'
    : 'text-[#D9C7AE]';

  const [pomoHistory, setPomoHistory] = useState([]);
  const [totalDrawingsCount, setTotalDrawingsCount] = useState(0);

  // Time category tracker state
  const [categoryLogs, setCategoryLogs] = useState(() => {
    return JSON.parse(localStorage.getItem('categoryLogs')) || {
      Coding: 0,
      Study: 0,
      Reading: 0,
      Writing: 0,
      Other: 0
    };
  });
  const [logMins, setLogMins] = useState(15);
  const [logCat, setLogCat] = useState('Study');

  // Load history & drawings count
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('pomoHistory')) || [];
    setPomoHistory(history);

    // Get IndexedDB drawings count safely
    const req = indexedDB.open('PinTheNoteDB', 1);
    req.onsuccess = (e) => {
      const db = e.target.result;
      if (db.objectStoreNames.contains('drawings')) {
        const trans = db.transaction('drawings', 'readonly');
        const store = trans.objectStore('drawings');
        const countReq = store.count();
        countReq.onsuccess = () => {
          setTotalDrawingsCount(countReq.result);
        };
      }
    };
  }, []);

  const handleAddCategoryLog = (e) => {
    e.preventDefault();
    const updated = {
      ...categoryLogs,
      [logCat]: categoryLogs[logCat] + parseInt(logMins)
    };
    setCategoryLogs(updated);
    localStorage.setItem('categoryLogs', JSON.stringify(updated));
  };

  const handleResetCategoryLogs = () => {
    const cleared = { Coding: 0, Study: 0, Reading: 0, Writing: 0, Other: 0 };
    setCategoryLogs(cleared);
    localStorage.setItem('categoryLogs', JSON.stringify(cleared));
  };

  const handleClearHistory = () => {
    setPomoHistory([]);
    localStorage.removeItem('pomoHistory');
  };

  // Calculations
  const totalNotes = notes.length;
  const completedNotes = notes.filter(n => n.completed).length;
  const starredNotes = notes.filter(n => n.starred).length;
  
  const totalFocusMins = Object.values(categoryLogs).reduce((a, b) => a + b, 0) + 
                         pomoHistory.reduce((acc, curr) => acc + curr.duration, 0);

  const maxVal = Math.max(...Object.values(categoryLogs), 1); // Avoid division by zero

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-140px)] gap-4 lg:gap-6 overflow-y-auto lg:overflow-hidden">
      {/* LEFT COLUMN: QUICK STATS */}
      <div className={`w-full lg:w-80 flex flex-col rounded-2xl border p-3.5 sm:p-4 ${cardBg} shrink-0`}>
        <h3 className={`font-bold text-sm mb-4 uppercase tracking-wider ${textTitle} flex items-center gap-1.5`}>
          <Activity size={16} /> Productivity Stats
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={`p-3 rounded-xl border text-center ${
            isDark ? 'bg-[#312f2c] border-[#44413e]' : 'bg-[#faf8f4] border-[#f0ece3]'
          }`}>
            <FileText size={18} className="mx-auto text-terracotta mb-1" />
            <span className={`text-xl font-black block ${textTitle}`}>{totalNotes}</span>
            <span className={`text-[10px] ${textSub}`}>Total Notes</span>
          </div>

          <div className={`p-3 rounded-xl border text-center ${
            isDark ? 'bg-[#312f2c] border-[#44413e]' : 'bg-[#faf8f4] border-[#f0ece3]'
          }`}>
            <Award size={18} className="mx-auto text-sage mb-1" />
            <span className={`text-xl font-black block ${textTitle}`}>{completedNotes}</span>
            <span className={`text-[10px] ${textSub}`}>Completed</span>
          </div>

          <div className={`p-3 rounded-xl border text-center ${
            isDark ? 'bg-[#312f2c] border-[#44413e]' : 'bg-[#faf8f4] border-[#f0ece3]'
          }`}>
            <Star size={18} className="mx-auto text-softYellow mb-1" />
            <span className={`text-xl font-black block ${textTitle}`}>{starredNotes}</span>
            <span className={`text-[10px] ${textSub}`}>Bookmarked</span>
          </div>

          <div className={`p-3 rounded-xl border text-center ${
            isDark ? 'bg-[#312f2c] border-[#44413e]' : 'bg-[#faf8f4] border-[#f0ece3]'
          }`}>
            <Image size={18} className="mx-auto text-lavender mb-1" />
            <span className={`text-xl font-black block ${textTitle}`}>{totalDrawingsCount}</span>
            <span className={`text-[10px] ${textSub}`}>Drawings</span>
          </div>
        </div>

        {/* Focus Timer Overview */}
        <div className={`p-4 rounded-xl border ${
          isDark ? 'bg-[#312f2c] border-[#44413e]' : 'bg-[#faf8f4] border-[#f0ece3]'
        }`}>
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-terracotta">
            <Clock size={15} />
            <span>Total Focus Time</span>
          </div>
          <p className={`text-2xl font-black ${textTitle}`}>
            {Math.floor(totalFocusMins / 60)}h {totalFocusMins % 60}m
          </p>
          <p className={`text-[10px] mt-1 ${textSub}`}>
            Including Pomodoro sprints and custom tracker entries.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: DETAILED CHARTS & TRACKER */}
      <div className={`flex-1 rounded-2xl border p-3.5 sm:p-5 overflow-y-auto space-y-6 ${cardBg}`}>
        
        {/* TIME CATEGORIES LOGGER */}
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Time Categories Tracker</h4>
            <button
              onClick={handleResetCategoryLogs}
              className="text-[10px] font-bold text-red-400 hover:text-red-500 uppercase"
            >
              Reset Logs
            </button>
          </div>

          {/* Quick logger form */}
          <form onSubmit={handleAddCategoryLog} className="flex gap-2 items-center flex-wrap">
            <select
              value={logCat}
              onChange={(e) => setLogCat(e.target.value)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold outline-none ${inputBg}`}
            >
              {['Coding', 'Study', 'Reading', 'Writing', 'Other'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="number"
              value={logMins}
              onChange={(e) => setLogMins(Math.max(1, parseInt(e.target.value) || 1))}
              className={`w-20 px-2.5 py-1.5 rounded-lg border text-center text-xs outline-none ${inputBg}`}
            />
            <span className={`text-xs font-semibold ${textSub}`}>minutes</span>
            <button
              type="submit"
              className="bg-terracotta hover:bg-[#be6e47] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1"
            >
              <Plus size={13} /> Add Entry
            </button>
          </form>

          {/* Simple CSS Horizontal Bar Chart */}
          <div className="space-y-3 pt-2">
            {Object.entries(categoryLogs).map(([cat, mins]) => {
              const pct = (mins / maxVal) * 100;
              const barColors = {
                Coding: 'bg-terracotta',
                Study: 'bg-sage',
                Reading: 'bg-lavender',
                Writing: 'bg-softYellow',
                Other: 'bg-warmBlue'
              };

              return (
                <div key={cat} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className={textTitle}>{cat}</span>
                    <span className={textSub}>{Math.floor(mins / 60)}h {mins % 60}m</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${barColors[cat] || 'bg-gray-400'}`}
                      style={{ width: `${mins === 0 ? 0 : pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* POMODORO HISTORY */}
        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Focus Log History</h4>
            {pomoHistory.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-[10px] font-bold text-red-400 hover:text-red-500 uppercase flex items-center gap-0.5"
              >
                <Trash2 size={11} /> Clear History
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {pomoHistory.length === 0 ? (
              <p className={`text-xs italic opacity-50 ${textSub}`}>No sessions recorded in focus logs yet.</p>
            ) : (
              pomoHistory.map(item => (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    isDark ? 'bg-[#312f2c] border-[#44413e]' : 'bg-[#fffdfa] border-[#e9e4db]'
                  }`}
                >
                  <div>
                    <span className={`font-bold block ${textTitle}`}>{item.noteTitle}</span>
                    <span className={`text-[10px] ${textSub}`}>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  <span className="font-bold text-sage">+{item.duration} mins</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
