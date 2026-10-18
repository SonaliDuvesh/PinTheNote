import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Clock, Layers, Image, Mic, Activity,
  Settings, Sun, Moon, Sparkles, Coffee,
  Bell, Award, Menu, X, Plus
} from 'lucide-react';

import NotesSection from './components/NotesSection';
import WatchSection from './components/WatchSection';
import FileLabSection from './components/FileLabSection';
import DrawingSection from './components/DrawingSection';
import VoiceSection from './components/VoiceSection';
import ActivitySection from './components/ActivitySection';
import LivingTheme from './components/LivingTheme';
// import QuickTimer from './components/QuickTimer';
import NotificationManager from './components/NotificationManager';
import AIAssistantModal from './components/AIAssistantModal';
import { Bot } from 'lucide-react';
import { playAlarmSound, stopAnyActiveAlarmSound } from './utils/alarmSounds';

export default function FloatingNotesApp() {
  const [activeTab, setActiveTab] = useState('notes'); // notes, watch, filelab, drawing, voice, activity
  const [activeTheme, setActiveTheme] = useState(() => {
    return localStorage.getItem('pinnedNoteTheme') || 'living_light';
  });

  const [notes, setNotes] = useState([]);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Custom toast notifications list
  const [notifications, setNotifications] = useState([]);

  // Living theme events callback ref
  const celebrationRef = useRef(null);

  // Trigger celebration animation on characters
  const triggerCelebration = (type) => {
    if (celebrationRef.current) {
      celebrationRef.current(type);
    }
  };

  // Toast trigger helper
  const addToast = (title, message, type = 'info') => {
    const id = 'toast_' + Date.now();
    setNotifications(prev => [...prev, { id, title, message, type }]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Alarm sound synthesizer & custom audio playback
  const triggerSound = (soundId = 'gentle_chime', customAudioData = null) => {
    playAlarmSound(soundId, customAudioData);
  };

  // --- LIFTED WATCH/TIMER STATES ---
  // 1. Stopwatch State
  const [stopwatchTime, setStopwatchTime] = useState(0); // in ms
  const [stopwatchActive, setStopwatchActive] = useState(false);
  const [laps, setLaps] = useState([]);
  const stopwatchIntervalRef = useRef(null);

  useEffect(() => {
    if (stopwatchActive) {
      const startTime = Date.now() - stopwatchTime;
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchTime(Date.now() - startTime);
      }, 10);
    } else {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    }
    return () => clearInterval(stopwatchIntervalRef.current);
  }, [stopwatchActive]);

  // 2. Countdown Timer State
  const [countdownMinutes, setCountdownMinutes] = useState(10);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownCompletedPopup, setCountdownCompletedPopup] = useState(false);
  const [customPresets, setCustomPresets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('countdownPresets')) || [
        { name: 'Power Nap', duration: 15 },
        { name: 'Quick Sprint', duration: 25 },
        { name: 'Study Prep', duration: 45 }
      ];
    } catch (e) {
      return [
        { name: 'Power Nap', duration: 15 },
        { name: 'Quick Sprint', duration: 25 },
        { name: 'Study Prep', duration: 45 }
      ];
    }
  });
  const countdownIntervalRef = useRef(null);

  const countdownMinutesRef = useRef(countdownMinutes);
  useEffect(() => {
    countdownMinutesRef.current = countdownMinutes;
  }, [countdownMinutes]);

  useEffect(() => {
    if (countdownActive) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdownSeconds(prevSecs => {
          const currentMins = countdownMinutesRef.current;
          if (prevSecs > 0) {
            return prevSecs - 1;
          } else if (currentMins > 0) {
            setCountdownMinutes(m => m - 1);
            return 59;
          } else {
            setCountdownActive(false);
            clearInterval(countdownIntervalRef.current);
            triggerSound();
            setCountdownCompletedPopup(true);
            return 0;
          }
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
    return () => clearInterval(countdownIntervalRef.current);
  }, [countdownActive]);

  // 3. Pomodoro Focus State
  const [pomoMode, setPomoMode] = useState('work'); // work, short_break, long_break
  const [pomoTimeLeft, setPomoTimeLeft] = useState(25 * 60); // 25 min default
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoSelectedNoteId, setPomoSelectedNoteId] = useState('');
  const [pomoHistory, setPomoHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pomoHistory')) || [];
    } catch (e) {
      return [];
    }
  });
  const pomoIntervalRef = useRef(null);
  const [pomoCompletedPopup, setPomoCompletedPopup] = useState(null); // 'work' or 'break'

  const pomoSettings = {
    work: 25 * 60,
    short_break: 5 * 60,
    long_break: 15 * 60
  };

  const pomoModeRef = useRef(pomoMode);
  useEffect(() => {
    pomoModeRef.current = pomoMode;
  }, [pomoMode]);

  const pomoSelectedNoteIdRef = useRef(pomoSelectedNoteId);
  useEffect(() => {
    pomoSelectedNoteIdRef.current = pomoSelectedNoteId;
  }, [pomoSelectedNoteId]);

  useEffect(() => {
    setPomoTimeLeft(pomoSettings[pomoMode]);
    setPomoActive(false);
  }, [pomoMode]);

  useEffect(() => {
    if (pomoActive) {
      pomoIntervalRef.current = setInterval(() => {
        setPomoTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(pomoIntervalRef.current);
            setPomoActive(false);
            triggerSound();

            const currentMode = pomoModeRef.current;
            const currentSelectedNoteId = pomoSelectedNoteIdRef.current;

            if (currentMode === 'work') {
              // Award focus time to linked note
              if (currentSelectedNoteId) {
                setNotes(prevNotes => {
                  const updated = prevNotes.map(n => {
                    if (n.id === currentSelectedNoteId) {
                      return {
                        ...n,
                        focusTime: (n.focusTime || 0) + 25,
                        updatedAt: new Date().toISOString()
                      };
                    }
                    return n;
                  });
                  localStorage.setItem('floatingNotes', JSON.stringify(updated));
                  return updated;
                });
              }

              // Update history
              setNotes(prevNotes => {
                const sessionNote = prevNotes.find(n => n.id === currentSelectedNoteId);
                const historyItem = {
                  id: 'pomo_' + Date.now(),
                  timestamp: new Date().toISOString(),
                  noteTitle: sessionNote ? sessionNote.title : 'General Session',
                  duration: 25
                };
                setPomoHistory(prevHistory => {
                  const updatedHistory = [historyItem, ...prevHistory];
                  localStorage.setItem('pomoHistory', JSON.stringify(updatedHistory));
                  return updatedHistory;
                });
                return prevNotes;
              });

              // Trigger Living characters celebration
              triggerCelebration('focus_complete');

              setPomoCompletedPopup('work');
              setPomoMode('short_break');
            } else {
              setPomoCompletedPopup('break');
              setPomoMode('work');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomoIntervalRef.current) clearInterval(pomoIntervalRef.current);
    }
    return () => clearInterval(pomoIntervalRef.current);
  }, [pomoActive]);

  // 4. Alarms State
  const [alarms, setAlarms] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('alarms')) || [];
    } catch (e) {
      return [];
    }
  });
  const [activeAlarmTriggered, setActiveAlarmTriggered] = useState(null);

  const toggleAlarmEnabledInApp = (id) => {
    const updated = alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
    setAlarms(updated);
    localStorage.setItem('alarms', JSON.stringify(updated));
  };

  useEffect(() => {
    const alarmInterval = setInterval(() => {
      if (activeAlarmTriggered) return; // one alarm at a time

      const now = new Date();
      let nowHour = now.getHours();
      const nowMin = now.getMinutes();
      const nowPeriod = nowHour >= 12 ? 'PM' : 'AM';

      nowHour = nowHour % 12;
      if (nowHour === 0) nowHour = 12;

      const dayIndex = now.getDay();
      const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const currentDay = dayMap[dayIndex];

      alarms.forEach(alarm => {
        if (!alarm.enabled) return;

        if (alarm.hour === nowHour && alarm.minute === nowMin && alarm.period === nowPeriod) {
          const matchesDay = alarm.days.includes('Once') ||
            alarm.days.includes(currentDay) ||
            (alarm.days.includes('Daily')) ||
            (alarm.days.includes('Weekdays') && ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(currentDay));

          if (matchesDay) {
            setActiveAlarmTriggered(alarm);

            if (alarm.days.includes('Once')) {
              toggleAlarmEnabledInApp(alarm.id);
            }
          }
        }
      });
    }, 15000);

    return () => clearInterval(alarmInterval);
  }, [alarms, activeAlarmTriggered]);

  // Repeating alarm sound / custom music playback
  useEffect(() => {
    let intervalId;
    let customAudio = null;

    if (activeAlarmTriggered) {
      const soundId = activeAlarmTriggered.sound || 'gentle_chime';
      const customData = activeAlarmTriggered.customAudioData || null;

      if (soundId === 'custom' && customData) {
        customAudio = new Audio(customData);
        customAudio.loop = true;
        customAudio.play().catch(e => console.warn('Custom alarm audio error:', e));
      } else {
        playAlarmSound(soundId);
        intervalId = setInterval(() => {
          playAlarmSound(soundId);
        }, 3000);
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (customAudio) {
        try {
          customAudio.pause();
          customAudio.currentTime = 0;
        } catch (e) {
          // ignore
        }
      }
      stopAnyActiveAlarmSound();
    };
  }, [activeAlarmTriggered]);

  const handleSnooze = (mins) => {
    if (activeAlarmTriggered) {
      const now = new Date();
      const snoozeTime = new Date(now.getTime() + mins * 60000);
      let snoozedHour = snoozeTime.getHours();
      const snoozedMin = snoozeTime.getMinutes();
      const snoozedPeriod = snoozedHour >= 12 ? 'PM' : 'AM';
      snoozedHour = snoozedHour % 12;
      if (snoozedHour === 0) snoozedHour = 12;

      const snoozedAlarm = {
        id: 'snooze_' + Date.now(),
        hour: snoozedHour,
        minute: snoozedMin,
        period: snoozedPeriod,
        label: `Snoozed: ${activeAlarmTriggered.label}`,
        days: ['Once'],
        enabled: true
      };

      const updatedAlarms = [...alarms, snoozedAlarm];
      setAlarms(updatedAlarms);
      localStorage.setItem('alarms', JSON.stringify(updatedAlarms));
      setActiveAlarmTriggered(null);
      addToast("Alarm Snoozed", `Alarm will trigger again in ${mins} minutes.`, 'info');
    }
  };

  // Load notes initially
  useEffect(() => {
    const stored = localStorage.getItem('floatingNotes');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.map(n => ({
            ...n,
            id: n.id || ('note_' + Date.now() + Math.random().toString(36).slice(2, 6)),
            title: typeof n.title === 'string' ? n.title : 'Untitled Note',
            content: typeof n.content === 'string' ? n.content : '',
            category: n.category || 'Work',
            pinned: Boolean(n.pinned),
            starred: Boolean(n.starred),
            completed: Boolean(n.completed),
            createdAt: n.createdAt || new Date().toISOString(),
            updatedAt: n.updatedAt || new Date().toISOString(),
            focusTime: n.focusTime || 0,
            drawingIds: Array.isArray(n.drawingIds) ? n.drawingIds : [],
            audioIds: Array.isArray(n.audioIds) ? n.audioIds : []
          }));
          setNotes(sanitized);
          if (sanitized.length > 0) {
            setCurrentNoteId(sanitized[0].id);
          }
        }
      } catch (e) {
        console.error("Failed parsing notes", e);
      }
    } else {
      // Default welcome notes
      const welcomeNotes = [
        {
          id: 'welcome_1',
          title: 'Welcome to PinTheNote 📌',
          content: `Welcome to your personal digital sanctuary!\n\nPinTheNote is designed to be a comfortable place for your thoughts, tasks, drawings, and files.\n\n✨ Key Features:\n- Notes: effortless auto-saving, category tags, pinning, and bookmarks.\n- Time Center: Pomodoro Focus cycles associated with notes, lap-stopwatches, presets, alarms (with snooze options), and world clocks.\n- File Lab: client-side image processing, compression (presets + custom size controls), upscaling, image enhancement, object/background removal, cropping and resizing.\n- Canvas: sketch, Zoom + Pan offsets, and link drawings directly to notes.\n- Voice Notes: record audio with real-time waveform visualizers, save and link them to notes.\n- Living Theme: toggle this theme below to meet the cozy interactive SVG creatures living in your workspace!\n\nFeel free to delete or edit this note.`,
          category: 'Ideas',
          pinned: true,
          starred: true,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          focusTime: 0,
          drawingIds: [],
          audioIds: []
        }
      ];
      setNotes(welcomeNotes);
      setCurrentNoteId('welcome_1');
      localStorage.setItem('floatingNotes', JSON.stringify(welcomeNotes));
    }
  }, []);

  // Sync theme to localStorage
  useEffect(() => {
    localStorage.setItem('pinnedNoteTheme', activeTheme);
  }, [activeTheme]);

  // Color and styling config helpers based on active theme
  const getThemeClasses = () => {
    switch (activeTheme) {
      case 'calm_light':
        return {
          appBg: 'bg-gradient-to-br from-[#FFD1DC] via-[#FFB7C5] to-[#E6E6FA] text-[#4B0082] font-nunito',
          sidebarBg: 'bg-gradient-to-b from-[#FF69B4] to-[#FFB7C5] border-[#FFB7C5]/60 text-white',
          sidebarBorder: 'border-[#FFB7C5]/60',
          textTitle: 'text-white',
          textSub: 'text-white/80',
          accentBg: 'bg-[#FF69B4]',
          accentText: 'text-[#FF69B4]',
          border: 'border-[#FFB7C5]',
          navActive: 'bg-white rounded-[20px] text-[#FF69B4] font-bold shadow-sm pink-glow',
          navInactive: 'text-white hover:bg-white/20 rounded-[20px] font-semibold',
          navHover: 'hover:bg-white/20',
          ctaBtn: 'w-full py-2.5 bg-white text-[#FF69B4] rounded-full font-fredoka font-bold text-xs pink-glow hover:scale-105 shadow-lg shadow-pink-200 transition-all flex items-center justify-center gap-1.5'
        };
      case 'calm_dark':
        return {
          appBg: 'bg-[#2A1B29] text-[#E8D9E5] font-nunito',
          sidebarBg: 'bg-gradient-to-b from-[#3D1F3A] to-[#2A1729] border-[#D9A6C4]/20 text-[#E8D9E5]',
          sidebarBorder: 'border-[#D9A6C4]/20',
          textTitle: 'text-[#FCE8F3]',
          textSub: 'text-[#B497AC]',
          accentBg: 'bg-[#FF6FB0]',
          accentText: 'text-[#FF6FB0]',
          border: 'border-[#D9A6C4]/30',
          navActive: 'bg-[#3C2740]/90 rounded-[20px] text-[#FF6FB0] font-bold shadow-sm border border-[#FF6FB0]/30 magenta-glow',
          navInactive: 'text-[#E8D9E5] hover:bg-white/10 rounded-[20px] font-semibold',
          navHover: 'hover:bg-white/10',
          ctaBtn: 'w-full py-2.5 bg-[#3C2740] text-[#FF6FB0] rounded-full font-fredoka font-bold text-xs magenta-glow border border-[#FF6FB0]/50 hover:scale-105 transition-all shadow-lg shadow-magenta-900/50 flex items-center justify-center gap-1.5'
        };
      case 'living_light':
        return {
          appBg: 'bg-[#FBF3E7] text-[#5A4636] font-plus-jakarta',
          sidebarBg: 'bg-[#F1E4D0] border-[#E5D5C5] text-[#5A4636] shadow-panel',
          sidebarBorder: 'border-[#E5D5C5]',
          textTitle: 'text-[#3B2418]',
          textSub: 'text-[#B0764A]',
          accentBg: 'bg-[#4A2C1D]',
          accentText: 'text-[#4A2C1D]',
          border: 'border-[#E5D5C5]',
          navActive: 'bg-[#4A2C1D] text-white rounded-xl font-outfit font-semibold shadow-plush',
          navInactive: 'text-[#5A4636] hover:bg-[#FFFBF5] hover:border-[#E5D5C5] rounded-xl font-outfit transition-all',
          navHover: 'hover:bg-[#FFFBF5]',
          ctaBtn: 'w-full h-10 bg-[#4A2C1D] text-white rounded font-outfit font-semibold text-xs border border-[#4A2C1D] hover:bg-[#3B2418] transition-all flex items-center justify-center gap-2 active:scale-95'
        };
      case 'living_dark':
      default:
        return {
          appBg: 'bg-[#2A1D15] text-[#D9C7AE] font-plus-jakarta',
          sidebarBg: 'bg-[#211610] border-[#4A362A] text-[#D9C7AE] shadow-panel',
          sidebarBorder: 'border-[#4A362A]',
          textTitle: 'text-[#F2E6D3]',
          textSub: 'text-[#A8927A]',
          accentBg: 'bg-[#C9975C]',
          accentText: 'text-[#C9975C]',
          border: 'border-[#4A362A]',
          navActive: 'bg-[#C9975C] text-[#2A1D15] rounded-sm font-outfit font-bold shadow-sm',
          navInactive: 'text-[#A8927A] hover:text-[#F2E6D3] hover:bg-[#3A2A1E]/50 rounded-sm font-outfit transition-all',
          navHover: 'hover:bg-[#3A2A1E]/50',
          ctaBtn: 'w-full bg-[#C9975C] text-[#2A1D15] border border-[#C9975C] rounded-sm py-2.5 font-outfit font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2'
        };
    }
  };

  const tc = getThemeClasses();

  // Create new note directly
  const handleCreateNewNote = () => {
    const newNote = {
      id: 'note_' + Date.now(),
      title: 'Untitled Note',
      content: '',
      category: 'Ideas',
      pinned: false,
      starred: false,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      focusTime: 0,
      drawingIds: [],
      audioIds: []
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem('floatingNotes', JSON.stringify(updated));
    setCurrentNoteId(newNote.id);
    setActiveTab('notes');
    triggerCelebration('note_saved');
  };

  // AI Note Action Handlers
  const handleCreateNoteFromAI = (content) => {
    const cleanFirstLine = content.split('\n')[0].replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const newNote = {
      id: 'note_' + Date.now(),
      title: cleanFirstLine ? (cleanFirstLine.slice(0, 35) + '...') : 'AI Generated Note',
      content: content,
      category: 'Ideas',
      pinned: false,
      starred: false,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      focusTime: 0,
      drawingIds: [],
      audioIds: []
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem('floatingNotes', JSON.stringify(updated));
    setCurrentNoteId(newNote.id);
    setActiveTab('notes');
    triggerCelebration('note_saved');
    setShowAiModal(false);
  };

  const handleInsertToActiveNote = (content) => {
    if (!currentNoteId) {
      handleCreateNoteFromAI(content);
      return;
    }
    const updated = notes.map(n => {
      if (n.id === currentNoteId) {
        return {
          ...n,
          content: n.content ? `${n.content}\n\n---\n${content}` : content,
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });
    setNotes(updated);
    localStorage.setItem('floatingNotes', JSON.stringify(updated));
    triggerCelebration('note_saved');
    setShowAiModal(false);
  };

  const isBlush = activeTheme === 'calm_light' || activeTheme === 'calm_dark';
  const isLiving = activeTheme === 'living_light' || activeTheme === 'living_dark';

  return (
    <div className={`w-full h-full flex flex-col md:flex-row overflow-hidden select-none transition-all duration-300 ${tc.appBg}`}>

      {/* MOBILE TOP NAVIGATION BAR (< md) */}
      <header className={`md:hidden flex items-center justify-between px-3 py-2.5 border-b shrink-0 z-30 ${tc.sidebarBg}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-inherit"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="PinTheNote Logo" className="w-7 h-7 rounded-full shadow-sm object-cover shrink-0" />
            <div>
              <span className="font-bold text-sm tracking-tight block leading-tight">PinTheNote</span>
              <span className="text-[10px] opacity-70 block capitalize leading-none">
                {activeTab === 'notes' ? 'Notes' : activeTab === 'watch' ? 'Time Center' : activeTab === 'filelab' ? 'File Lab' : activeTab === 'drawing' ? 'Canvas' : activeTab === 'voice' ? 'Voice' : 'Activity'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAiModal(true)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-transform active:scale-95 ${
              isBlush ? 'bg-hot-pink text-white' : activeTheme === 'living_light' ? 'bg-[#4A2C1D] text-white' : 'bg-[#C9975C] text-[#2A1D15]'
            }`}
            title="AI Copilot"
          >
            <Sparkles size={13} />
            <span className="text-[11px]">AI</span>
          </button>

          <button
            onClick={handleCreateNewNote}
            className={`p-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-transform active:scale-95 ${
              isBlush ? 'bg-hot-pink' : activeTheme === 'living_light' ? 'bg-[#4A2C1D]' : 'bg-[#C9975C] text-[#2A1D15]'
            }`}
            title="Create new note"
          >
            <Plus size={16} />
          </button>
        </div>
      </header>

      {/* MOBILE BACKDROP OVERLAY */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR NAVIGATION (DRAWER ON MOBILE, FIXED SIDEBAR ON DESKTOP) */}
      <aside className={`fixed inset-y-0 left-0 z-50 md:static w-72 md:w-64 h-full border-r flex flex-col justify-between shrink-0 p-4 transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
      } ${tc.sidebarBg}`}>

        {/* Floating sparkles for Blush themes */}
        {activeTheme === 'calm_light' && (
          <>
            <span className="material-symbols-outlined subtle-decor top-12 right-6 text-2xl sparkle-float text-white">auto_awesome</span>
            <span className="material-symbols-outlined subtle-decor bottom-32 left-4 text-xl sparkle-float text-white" style={{ animationDelay: '1s' }}>favorite</span>
            <span className="material-symbols-outlined subtle-decor top-1/2 left-8 text-sm sparkle-float text-white" style={{ animationDelay: '0.5s' }}>stars</span>
          </>
        )}
        {activeTheme === 'calm_dark' && (
          <>
            <span className="material-symbols-outlined subtle-decor top-12 right-6 text-2xl sparkle-float text-white">auto_awesome</span>
            <span className="material-symbols-outlined subtle-decor bottom-32 left-4 text-xl sparkle-float text-white" style={{ animationDelay: '1s' }}>favorite</span>
            <span className="material-symbols-outlined subtle-decor top-1/2 left-8 text-sm sparkle-float text-[#FF6FB0]" style={{ animationDelay: '0.5s' }}>stars</span>
          </>
        )}

        {/* Upper Brand Info */}
        <div className="space-y-4 relative z-10">
          
          {/* Brand Header with Close button on mobile */}
          <div className="flex items-center justify-between">
            {isBlush ? (
              <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="PinTheNote Logo" className="w-10 h-10 rounded-full shrink-0 shadow-sm object-cover" />
                <div>
                  <h1 className="text-xl font-bold tracking-wide font-fredoka leading-tight" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                    PinTheNote
                  </h1>
                  <p className="text-base font-caveat font-bold leading-none mt-0.5" style={{ fontFamily: "'Caveat', cursive" }}>
                    My Diary ✧
                  </p>
                </div>
              </div>
            ) : activeTheme === 'living_light' ? (
              <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="PinTheNote Logo" className="w-10 h-10 rounded-full shrink-0 shadow-sm object-cover" />
                <div>
                  <h1 className="font-lora text-xl font-bold text-[#3B2418] tracking-tight leading-tight">PinTheNote</h1>
                  <p className="font-outfit text-[11px] font-bold text-[#B0764A] uppercase tracking-wider">Personal Sanctuary</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="PinTheNote Logo" className="w-10 h-10 rounded-full shrink-0 shadow-sm object-cover" />
                <div>
                  <h1 className="font-lora text-xl font-bold text-[#C9975C] tracking-tight leading-tight">PinTheNote</h1>
                  <p className="font-outfit text-[11px] font-medium text-[#A8927A] uppercase tracking-wider">Personal Sanctuary</p>
                </div>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg border border-black/10 dark:border-white/10 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          </div>

          {/* CTA + New Note Button */}
          <button
            onClick={() => {
              handleCreateNewNote();
              setMobileMenuOpen(false);
            }}
            className={tc.ctaBtn}
            title="Create a new note"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>New Note</span>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-1">
            {[
              { id: 'notes', label: 'Workspace Notes', icon: 'edit_note' },
              { id: 'watch', label: 'Time Center', icon: 'schedule' },
              { id: 'filelab', label: 'File & Image Lab', icon: 'folder_open' },
              { id: 'drawing', label: 'Ambient Canvas', icon: 'palette' },
              { id: 'voice', label: 'Voice Notes', icon: 'mic' },
              { id: 'activity', label: 'Activity Tracker', icon: 'analytics' }
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs transition-all ${
                    isSelected ? tc.navActive : tc.navInactive
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {tab.icon}
                  </span>
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}

            {/* AI Copilot Launcher in Sidebar */}
            <button
              onClick={() => {
                setShowAiModal(true);
                setMobileMenuOpen(false);
              }}
              className={`w-full mt-2 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all group ${
                isBlush
                  ? activeTheme === 'calm_light'
                    ? 'bg-white/30 hover:bg-white text-white hover:text-hot-pink border border-white/40'
                    : 'bg-[#3C2740] hover:bg-[#4A3350] text-[#FF6FB0] border border-[#FF6FB0]/30 magenta-glow'
                  : activeTheme === 'living_light'
                    ? 'bg-[#4A2C1D]/10 hover:bg-[#4A2C1D] text-[#4A2C1D] hover:text-white border border-[#E5D5C5]'
                    : 'bg-[#3A2A1E] hover:bg-[#C9975C] text-[#C9975C] hover:text-[#2A1D15] border border-[#4A362A]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                <span>AI Copilot</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-black/10 dark:bg-white/10">550B</span>
            </button>
          </nav>
        </div>

        {/* Lower Themes & Info */}
        <div className="space-y-3 pt-3 border-t border-current/15 relative z-10">

          {/* Theme Selector list */}
          <div className="space-y-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider block opacity-70`}>Select Theme:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'calm_light', label: '🌸 Calm L', desc: 'Blush Diary' },
                { id: 'calm_dark', label: '✨ Calm D', desc: 'Midnight Blush' },
                { id: 'living_light', label: '☕ Living L', desc: 'Bold Cozy' },
                { id: 'living_dark', label: '🪵 Living D', desc: 'Espresso Amber' }
              ].map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setActiveTheme(theme.id)}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all text-center ${
                    activeTheme === theme.id
                      ? isBlush
                        ? activeTheme === 'calm_light'
                          ? 'bg-white text-hot-pink border-white shadow-md font-extrabold'
                          : 'bg-[#FF6FB0] text-[#2A1B29] border-[#FF6FB0] magenta-glow font-extrabold'
                        : activeTheme === 'living_light'
                          ? 'bg-[#4A2C1D] text-white border-[#4A2C1D] shadow-md font-extrabold'
                          : 'bg-[#C9975C] text-[#2A1D15] border-[#C9975C] shadow-md font-extrabold'
                      : 'bg-black/5 dark:bg-white/5 border-current/20 opacity-70 hover:opacity-100'
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

        </div>

      </aside>

      {/* MAIN SCREEN CONTENT DISPLAY */}
      <main className="flex-1 h-full p-2.5 sm:p-4 md:p-6 relative flex flex-col justify-between overflow-y-auto md:overflow-hidden">

        {/* Render actual section based on Active Tab */}
        <div className="flex-1 h-full">
          {activeTab === 'notes' && (
            <NotesSection
              notes={notes}
              setNotes={setNotes}
              currentNoteId={currentNoteId}
              setCurrentNoteId={setCurrentNoteId}
              onSaveNote={triggerCelebration}
              darkMode={activeTheme.includes('dark')}
              activeTheme={activeTheme}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'watch' && (
            <WatchSection
              notes={notes}
              setNotes={setNotes}
              onCelebration={triggerCelebration}
              darkMode={activeTheme.includes('dark')}
              activeTheme={activeTheme}
              stopwatchTime={stopwatchTime}
              setStopwatchTime={setStopwatchTime}
              stopwatchActive={stopwatchActive}
              setStopwatchActive={setStopwatchActive}
              laps={laps}
              setLaps={setLaps}
              countdownMinutes={countdownMinutes}
              setCountdownMinutes={setCountdownMinutes}
              countdownSeconds={countdownSeconds}
              setCountdownSeconds={setCountdownSeconds}
              countdownActive={countdownActive}
              setCountdownActive={setCountdownActive}
              customPresets={customPresets}
              setCustomPresets={setCustomPresets}
              pomoMode={pomoMode}
              setPomoMode={setPomoMode}
              pomoTimeLeft={pomoTimeLeft}
              setPomoTimeLeft={setPomoTimeLeft}
              pomoActive={pomoActive}
              setPomoActive={setPomoActive}
              selectedNoteId={pomoSelectedNoteId}
              setSelectedNoteId={setPomoSelectedNoteId}
              pomoHistory={pomoHistory}
              setPomoHistory={setPomoHistory}
              alarms={alarms}
              setAlarms={setAlarms}
              activeAlarmTriggered={activeAlarmTriggered}
              setActiveAlarmTriggered={setActiveAlarmTriggered}
              triggerSound={triggerSound}
            />
          )}

          {activeTab === 'filelab' && (
            <FileLabSection
              notes={notes}
              setNotes={setNotes}
              currentNoteId={currentNoteId}
              setCurrentNoteId={setCurrentNoteId}
              setActiveTab={setActiveTab}
              onCelebration={triggerCelebration}
              addToast={addToast}
              darkMode={activeTheme.includes('dark')}
              activeTheme={activeTheme}
            />
          )}

          {activeTab === 'drawing' && (
            <DrawingSection
              notes={notes}
              setNotes={setNotes}
              darkMode={activeTheme.includes('dark')}
              activeTheme={activeTheme}
            />
          )}

          {activeTab === 'voice' && (
            <VoiceSection
              notes={notes}
              setNotes={setNotes}
              onCelebration={triggerCelebration}
              darkMode={activeTheme.includes('dark')}
              activeTheme={activeTheme}
            />
          )}

          {activeTab === 'activity' && (
            <ActivitySection
              notes={notes}
              activeTheme={activeTheme}
            />
          )}
        </div>

      </main>

      {/* Ambient Quick Floating Widget (Timer) */}
      {/* <QuickTimer darkMode={activeTheme.includes('dark')} activeTheme={activeTheme} /> */}

      {/* Living Theme Interactive SVG Character Engine */}
      <LivingTheme
        activeTab={activeTab}
        onCelebrationRef={celebrationRef}
        activeTheme={activeTheme}
      />

      {/* Toast Notifications Manager Overlay */}
      <NotificationManager
        notifications={notifications}
        setNotifications={setNotifications}
      />

      {/* Alarm ringing popup screen */}
      {activeAlarmTriggered && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`w-80 p-6 rounded-2xl border text-center shadow-2xl animate-softGlow transition-all duration-300 ${activeTheme.includes('dark')
              ? 'bg-[#292725] border-[#3d3a37] text-[#eeebe6]'
              : 'bg-[#fffdfa] border-[#e9e4db] text-textCharcoal'
            }`}>
            <Bell size={48} className="mx-auto text-red-500 mb-4 animate-gentleSwing" />
            <h3 className={`text-xl font-bold mb-1 ${activeTheme.includes('dark') ? 'text-[#eeebe6]' : 'text-textHeading'
              }`}>Alarm Triggered! ⏰</h3>
            <p className="text-2xl font-black text-terracotta font-mono mb-2">
              {activeAlarmTriggered.hour.toString().padStart(2, '0')}:
              {activeAlarmTriggered.minute.toString().padStart(2, '0')} {activeAlarmTriggered.period}
            </p>
            <p className={`text-xs font-semibold ${activeAlarmTriggered.soundName ? 'mb-1' : 'mb-6'} ${activeTheme.includes('dark') ? 'text-[#b5b0a7]' : 'text-gray-500'
              }`}>{activeAlarmTriggered.label}</p>
            {activeAlarmTriggered.soundName && (
              <p className="text-[11px] font-mono font-bold text-terracotta mb-5 flex items-center justify-center gap-1">
                <span>🎵</span> {activeAlarmTriggered.soundName}
              </p>
            )}

            <div className="space-y-2">
              <button
                onClick={() => handleSnooze(5)}
                className="w-full bg-[#fceba7] hover:bg-[#ebd27a] text-textCharcoal py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Snooze 5 mins
              </button>
              <button
                onClick={() => handleSnooze(15)}
                className="w-full bg-softYellow hover:bg-[#d8b066] text-textCharcoal py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Snooze 15 mins
              </button>
              <button
                onClick={() => {
                  setActiveAlarmTriggered(null);
                  addToast("Alarm Dismissed", "Ringing stopped.", "success");
                }}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Dismiss Alarm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countdown completed popup */}
      {countdownCompletedPopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`w-80 p-6 rounded-2xl border text-center shadow-2xl animate-softGlow transition-all duration-300 ${activeTheme.includes('dark')
              ? 'bg-[#292725] border-[#3d3a37] text-[#eeebe6]'
              : 'bg-[#fffdfa] border-[#e9e4db] text-textCharcoal'
            }`}>
            <Clock size={48} className="mx-auto text-terracotta mb-4 animate-pulse" />
            <h3 className={`text-xl font-bold mb-2 ${activeTheme.includes('dark') ? 'text-[#eeebe6]' : 'text-textHeading'
              }`}>Timer Finished! ⏰</h3>
            <p className={`text-sm mb-6 ${activeTheme.includes('dark') ? 'text-[#b5b0a7]' : 'text-gray-500'
              }`}>Your countdown timer has completed.</p>
            <button
              onClick={() => setCountdownCompletedPopup(false)}
              className="w-full bg-sage hover:bg-[#7b9087] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Pomodoro completed popup */}
      {pomoCompletedPopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`w-80 p-6 rounded-2xl border text-center shadow-2xl animate-softGlow transition-all duration-300 ${activeTheme.includes('dark')
              ? 'bg-[#292725] border-[#3d3a37] text-[#eeebe6]'
              : 'bg-[#fffdfa] border-[#e9e4db] text-textCharcoal'
            }`}>
            <Award size={48} className="mx-auto text-softYellow mb-4 animate-pulse" />
            <h3 className={`text-xl font-bold mb-2 ${activeTheme.includes('dark') ? 'text-[#eeebe6]' : 'text-textHeading'
              }`}>
              {pomoCompletedPopup === 'work' ? 'Focus Session Done! 🎉' : 'Break Finished! 💪'}
            </h3>
            <p className={`text-sm mb-6 ${activeTheme.includes('dark') ? 'text-[#b5b0a7]' : 'text-gray-500'
              }`}>
              {pomoCompletedPopup === 'work'
                ? 'Great job focusing! Time to take a short break.'
                : "Break is over, let's get back to work!"}
            </p>
            <button
              onClick={() => setPomoCompletedPopup(null)}
              className="w-full bg-sage hover:bg-[#7b9087] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {pomoCompletedPopup === 'work' ? 'Start Break' : 'Start Focus'}
            </button>
          </div>
        </div>
      )}

      {/* Floating AI Copilot Trigger Button */}
      <button
        onClick={() => setShowAiModal(true)}
        className="fixed bottom-6 right-20 z-30 p-3.5 rounded-2xl bg-gradient-to-tr from-terracotta to-[#e68f68] hover:from-[#c26e47] hover:to-terracotta text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 group"
        title="Open AI Copilot (Nemotron 550B)"
      >
        <Sparkles size={20} className="group-hover:rotate-45 transition-transform" />
        <span className="text-xs font-bold hidden sm:inline">AI Copilot</span>
        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping hidden sm:inline" />
      </button>

      {/* Global AI Assistant Modal */}
      <AIAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        activeNote={notes.find(n => n.id === currentNoteId)}
        onCreateNoteFromAI={handleCreateNoteFromAI}
        onInsertToActiveNote={handleInsertToActiveNote}
        darkMode={activeTheme.includes('dark')}
        activeTheme={activeTheme}
        addToast={addToast}
      />

    </div>
  );
}