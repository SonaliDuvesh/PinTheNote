import React, { useState, useEffect, useRef } from 'react';
import { Clock, Play, Pause, RotateCcw, X } from 'lucide-react';
import { playAlarmSound } from '../utils/alarmSounds';

export default function QuickTimer({ darkMode, activeTheme }) {
  const [isOpen, setIsOpen] = useState(false);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [initialTotal, setInitialTotal] = useState(300); // 5 mins in secs

  const timerRef = useRef(null);

  const isDark = activeTheme && activeTheme.includes('dark');
  const widgetBg = isDark ? 'bg-[#292725] border-[#44413e] text-white' : 'bg-white border-gray-200 text-textCharcoal';
  const inputBg = isDark ? 'bg-[#312f2c] border-[#44413e] text-white' : 'bg-[#faf7f2] border-[#e3ded5] text-textCharcoal';

  const minutesRef = useRef(minutes);
  useEffect(() => {
    minutesRef.current = minutes;
  }, [minutes]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSeconds(prevSecs => {
          const currentMins = minutesRef.current;
          if (prevSecs > 0) {
            return prevSecs - 1;
          } else if (currentMins > 0) {
            setMinutes(m => m - 1);
            return 59;
          } else {
            setIsActive(false);
            clearInterval(timerRef.current);
            playAlarmSound('gentle_chime');
            alert("Quick Timer finished! ⏰");
            return 0;
          }
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive]);

  const handleStart = () => {
    if (!isActive && minutes === 0 && seconds === 0) return;
    if (!isActive) {
      setInitialTotal(minutes * 60 + seconds);
    }
    setIsActive(true);
  };

  const handlePause = () => setIsActive(false);
  const handleReset = () => {
    setIsActive(false);
    setMinutes(5);
    setSeconds(0);
  };

  // SVG Circular progress math
  const currentTotalSecs = minutes * 60 + seconds;
  const pct = initialTotal > 0 ? (currentTotalSecs / initialTotal) * 100 : 0;
  const strokeDashoffset = 113 - (113 * pct) / 100; // 2 * pi * r = 2 * 3.14 * 18 = 113

  return (
    <div className="fixed bottom-24 left-6 z-40 pointer-events-auto">
      {/* Floating Mini Timer Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-full border shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-115 hover:rotate-12 ${isActive
          ? 'bg-terracotta border-terracotta text-white animate-pulse'
          : isDark ? 'bg-[#3d3a37] border-[#484542] text-white hover:bg-[#484542]' : 'bg-[#faf8f4] border-[#e9e4db] text-textCharcoal hover:bg-[#f0ece3]'
          }`}
        title="Quick Timer Widget"
      >
        {isActive ? (
          <div className="relative w-7 h-7 flex items-center justify-center">
            {/* Circular progress loader */}
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="14" cy="14" r="12" stroke={isDark ? '#444' : '#eee'} strokeWidth="2.5" fill="transparent" />
              <circle
                cx="14" cy="14" r="12"
                stroke="#fff" strokeWidth="2.5" fill="transparent"
                strokeDasharray="75.3"
                strokeDashoffset={75.3 - (75.3 * pct) / 100}
              />
            </svg>
            <span className="absolute text-[8px] font-mono font-bold">
              {minutes}m
            </span>
          </div>
        ) : (
          <Clock size={20} />
        )}
      </button>

      {/* Widget Popover Panel */}
      {isOpen && (
        <div className={`absolute bottom-14 left-0 w-60 rounded-2xl border p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-300 ${widgetBg}`}>
          <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-terracotta flex items-center gap-1">
              <Clock size={13} /> Quick Timer
            </span>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>

          <div className="text-center py-2">
            {isActive ? (
              <span className="text-3xl font-black font-mono text-sage">
                {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </span>
            ) : (
              <div className="flex justify-center items-center gap-1.5 text-lg font-bold">
                <input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`w-14 px-2 py-1 border rounded-lg text-center outline-none text-sm font-semibold ${inputBg}`}
                />
                <span className="font-bold">:</span>
                <input
                  type="number"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  className={`w-14 px-2 py-1 border rounded-lg text-center outline-none text-sm font-semibold ${inputBg}`}
                />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2 justify-center mt-3 pt-2 border-t border-gray-50 dark:border-gray-800">
            {isActive ? (
              <button
                onClick={handlePause}
                className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="px-3.5 py-1.5 bg-sage hover:bg-[#7b9087] text-white rounded-lg text-xs font-bold transition-all"
              >
                Start
              </button>
            )}
            <button
              onClick={handleReset}
              className={`p-1.5 rounded-lg border hover:bg-gray-100 dark:hover:bg-[#3d3a37] text-gray-400`}
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
