import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Plus, Trash2, Clock, 
  Check, Bell, Globe, Activity, Award, Compass,
  Music, Upload, Volume2, VolumeX
} from 'lucide-react';
import { ALARM_SOUND_PRESETS, playAlarmSound, stopAnyActiveAlarmSound } from '../utils/alarmSounds';

const pomoSettings = {
  work: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60
};


export default function WatchSection({ 
  notes, 
  setNotes, 
  onCelebration, 
  darkMode, 
  activeTheme,
  
  // Stopwatch
  stopwatchTime,
  setStopwatchTime,
  stopwatchActive,
  setStopwatchActive,
  laps,
  setLaps,
  
  // Countdown
  countdownMinutes,
  setCountdownMinutes,
  countdownSeconds,
  setCountdownSeconds,
  countdownActive,
  setCountdownActive,
  customPresets,
  setCustomPresets,
  
  // Pomodoro Focus
  pomoMode,
  setPomoMode,
  pomoTimeLeft,
  setPomoTimeLeft,
  pomoActive,
  setPomoActive,
  selectedNoteId,
  setSelectedNoteId,
  pomoHistory,
  setPomoHistory,
  
  // Alarms
  alarms,
  setAlarms,
  activeAlarmTriggered,
  setActiveAlarmTriggered,
  triggerSound
}) {
  const [subTab, setSubTab] = useState('pomodoro'); // pomodoro, timers, alarms, worldclock
  
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

  // --- STOPWATCH LOGIC ---
  const handleStopwatchStart = () => setStopwatchActive(true);
  const handleStopwatchPause = () => setStopwatchActive(false);
  const handleStopwatchReset = () => {
    setStopwatchActive(false);
    setStopwatchTime(0);
    setLaps([]);
  };
  const handleStopwatchLap = () => {
    setLaps([...laps, stopwatchTime]);
  };

  const formatStopwatch = (timeMs) => {
    const hours = Math.floor(timeMs / 3600000);
    const mins = Math.floor((timeMs % 3600000) / 60000);
    const secs = Math.floor((timeMs % 60000) / 1000);
    const centis = Math.floor((timeMs % 1000) / 10);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  // --- COUNTDOWN TIMER LOGIC ---
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetMins, setNewPresetMins] = useState(25);

  const handleCountdownStart = () => setCountdownActive(true);
  const handleCountdownPause = () => setCountdownActive(false);
  const handleCountdownReset = () => {
    setCountdownActive(false);
    setCountdownMinutes(10);
    setCountdownSeconds(0);
  };
  const setPresetCountdown = (mins) => {
    setCountdownActive(false);
    setCountdownMinutes(mins);
    setCountdownSeconds(0);
  };

  const handleSavePreset = (e) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    const newPresets = [...customPresets, { name: newPresetName, duration: newPresetMins }];
    setCustomPresets(newPresets);
    localStorage.setItem('countdownPresets', JSON.stringify(newPresets));
    setNewPresetName('');
  };

  const handleDeletePreset = (index) => {
    const newPresets = customPresets.filter((_, i) => i !== index);
    setCustomPresets(newPresets);
    localStorage.setItem('countdownPresets', JSON.stringify(newPresets));
  };

  // --- POMODORO FOCUS LOGIC ---
  const formatPomoTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- ALARMS LOGIC ---
  const [alarmHour, setAlarmHour] = useState(7);
  const [alarmMin, setAlarmMin] = useState(0);
  const [alarmPeriod, setAlarmPeriod] = useState('AM');
  const [alarmLabel, setAlarmLabel] = useState('Wake Up');
  const [alarmDays, setAlarmDays] = useState([]); // Array of strings (Mon, Tue, etc.)
  const [alarmSound, setAlarmSound] = useState('gentle_chime');
  const [customAudioData, setCustomAudioData] = useState(null);
  const [customAudioName, setCustomAudioName] = useState('');
  const [previewingSoundId, setPreviewingSoundId] = useState(null);
  const customFileInputRef = useRef(null);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleAlarmDay = (day) => {
    if (alarmDays.includes(day)) {
      setAlarmDays(alarmDays.filter(d => d !== day));
    } else {
      setAlarmDays([...alarmDays, day]);
    }
  };

  const handleCustomAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Please select a valid audio file (.mp3, .wav, .m4a, .ogg, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      setCustomAudioData(base64Data);
      setCustomAudioName(file.name);
      setAlarmSound('custom');
    };
    reader.readAsDataURL(file);
  };

  const handlePreviewSound = (soundId, audioData = null) => {
    if (previewingSoundId === soundId) {
      stopAnyActiveAlarmSound();
      setPreviewingSoundId(null);
    } else {
      stopAnyActiveAlarmSound();
      setPreviewingSoundId(soundId);
      const dataToPlay = soundId === 'custom' ? (audioData || customAudioData) : null;
      playAlarmSound(soundId, dataToPlay);
      setTimeout(() => {
        setPreviewingSoundId(prev => prev === soundId ? null : prev);
      }, 4500);
    }
  };

  const handleAddAlarm = (e) => {
    e.preventDefault();
    const preset = ALARM_SOUND_PRESETS.find(p => p.id === alarmSound);
    const soundDisplayName = alarmSound === 'custom' 
      ? (customAudioName ? `Custom: ${customAudioName}` : 'Custom Audio')
      : (preset?.name || 'Gentle Chime');

    const newAlarm = {
      id: 'alarm_' + Date.now(),
      hour: alarmHour,
      minute: alarmMin,
      period: alarmPeriod,
      label: alarmLabel,
      days: alarmDays.length === 0 ? ['Once'] : alarmDays,
      sound: alarmSound,
      soundName: soundDisplayName,
      customAudioData: alarmSound === 'custom' ? customAudioData : null,
      enabled: true
    };
    const updated = [...alarms, newAlarm];
    setAlarms(updated);
    try {
      localStorage.setItem('alarms', JSON.stringify(updated));
    } catch (err) {
      console.warn('Storage quota exceeded, storing lightweight alarms list:', err);
      const lightweight = updated.map(a => ({ ...a, customAudioData: null }));
      localStorage.setItem('alarms', JSON.stringify(lightweight));
    }
    setAlarmLabel('Wake Up');
    setAlarmDays([]);
  };

  const handleDeleteAlarm = (id) => {
    const updated = alarms.filter(a => a.id !== id);
    setAlarms(updated);
    localStorage.setItem('alarms', JSON.stringify(updated));
  };

  const toggleAlarmEnabled = (id) => {
    const updated = alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
    setAlarms(updated);
    localStorage.setItem('alarms', JSON.stringify(updated));
  };


const DEFAULT_CITIES = [
  { id: 'city_local', name: 'Local', tz: null, label: 'Device Default Time' },
  { id: 'city_delhi', name: 'New Delhi (IST)', tz: 'Asia/Kolkata', label: 'India Standard Time (UTC+5:30)' },
  { id: 'city_london', name: 'London (GMT)', tz: 'Europe/London', label: 'Greenwich Mean Time (UTC+0/+1)' },
  { id: 'city_ny', name: 'New York (EST)', tz: 'America/New_York', label: 'Eastern Time (UTC-5/-4)' },
  { id: 'city_tokyo', name: 'Tokyo (JST)', tz: 'Asia/Tokyo', label: 'Japan Standard Time (UTC+9)' }
];

const AVAILABLE_TIMEZONES = [
  { name: 'UTC / GMT', tz: 'UTC', desc: 'Coordinated Universal Time (UTC+0)' },
  { name: 'London (GMT/BST)', tz: 'Europe/London', desc: 'United Kingdom (UTC+0/+1)' },
  { name: 'Paris (CET/CEST)', tz: 'Europe/Paris', desc: 'France (UTC+1/+2)' },
  { name: 'Berlin (CET/CEST)', tz: 'Europe/Berlin', desc: 'Germany (UTC+1/+2)' },
  { name: 'Rome (CET/CEST)', tz: 'Europe/Rome', desc: 'Italy (UTC+1/+2)' },
  { name: 'Madrid (CET/CEST)', tz: 'Europe/Madrid', desc: 'Spain (UTC+1/+2)' },
  { name: 'Amsterdam (CET/CEST)', tz: 'Europe/Amsterdam', desc: 'Netherlands (UTC+1/+2)' },
  { name: 'Zurich (CET/CEST)', tz: 'Europe/Zurich', desc: 'Switzerland (UTC+1/+2)' },
  { name: 'Stockholm (CET/CEST)', tz: 'Europe/Stockholm', desc: 'Sweden (UTC+1/+2)' },
  { name: 'Athens (EET/EEST)', tz: 'Europe/Athens', desc: 'Greece (UTC+2/+3)' },
  { name: 'Istanbul (TRT)', tz: 'Europe/Istanbul', desc: 'Turkey (UTC+3)' },
  { name: 'Moscow (MSK)', tz: 'Europe/Moscow', desc: 'Russia (UTC+3)' },
  { name: 'Dubai (GST)', tz: 'Asia/Dubai', desc: 'United Arab Emirates (UTC+4)' },
  { name: 'Riyadh (AST)', tz: 'Asia/Riyadh', desc: 'Saudi Arabia (UTC+3)' },
  { name: 'Cairo (EET)', tz: 'Africa/Cairo', desc: 'Egypt (UTC+2)' },
  { name: 'Johannesburg (SAST)', tz: 'Africa/Johannesburg', desc: 'South Africa (UTC+2)' },
  { name: 'Nairobi (EAT)', tz: 'Africa/Nairobi', desc: 'Kenya (UTC+3)' },
  { name: 'New Delhi (IST)', tz: 'Asia/Kolkata', desc: 'India (UTC+5:30)' },
  { name: 'Mumbai (IST)', tz: 'Asia/Kolkata', desc: 'India (UTC+5:30)' },
  { name: 'Karachi (PKT)', tz: 'Asia/Karachi', desc: 'Pakistan (UTC+5)' },
  { name: 'Dhaka (BST)', tz: 'Asia/Dhaka', desc: 'Bangladesh (UTC+6)' },
  { name: 'Kathmandu (NPT)', tz: 'Asia/Kathmandu', desc: 'Nepal (UTC+5:45)' },
  { name: 'Bangkok (ICT)', tz: 'Asia/Bangkok', desc: 'Thailand (UTC+7)' },
  { name: 'Jakarta (WIB)', tz: 'Asia/Jakarta', desc: 'Indonesia (UTC+7)' },
  { name: 'Singapore (SGT)', tz: 'Asia/Singapore', desc: 'Singapore (UTC+8)' },
  { name: 'Hong Kong (HKT)', tz: 'Asia/Hong_Kong', desc: 'Hong Kong (UTC+8)' },
  { name: 'Beijing / Shanghai (CST)', tz: 'Asia/Shanghai', desc: 'China (UTC+8)' },
  { name: 'Taipei (CST)', tz: 'Asia/Taipei', desc: 'Taiwan (UTC+8)' },
  { name: 'Manila (PHT)', tz: 'Asia/Manila', desc: 'Philippines (UTC+8)' },
  { name: 'Seoul (KST)', tz: 'Asia/Seoul', desc: 'South Korea (UTC+9)' },
  { name: 'Tokyo (JST)', tz: 'Asia/Tokyo', desc: 'Japan (UTC+9)' },
  { name: 'Sydney (AEST/AEDT)', tz: 'Australia/Sydney', desc: 'Australia Eastern (UTC+10/+11)' },
  { name: 'Melbourne (AEST/AEDT)', tz: 'Australia/Melbourne', desc: 'Australia Eastern (UTC+10/+11)' },
  { name: 'Brisbane (AEST)', tz: 'Australia/Brisbane', desc: 'Australia (UTC+10)' },
  { name: 'Adelaide (ACST/ACDT)', tz: 'Australia/Adelaide', desc: 'Australia Central (UTC+9:30/+10:30)' },
  { name: 'Perth (AWST)', tz: 'Australia/Perth', desc: 'Australia Western (UTC+8)' },
  { name: 'Auckland (NZST/NZDT)', tz: 'Pacific/Auckland', desc: 'New Zealand (UTC+12/+13)' },
  { name: 'Fiji (FJT)', tz: 'Pacific/Fiji', desc: 'Fiji (UTC+12)' },
  { name: 'Honolulu (HST)', tz: 'Pacific/Honolulu', desc: 'Hawaii (UTC-10)' },
  { name: 'Anchorage (AKST/AKDT)', tz: 'America/Anchorage', desc: 'Alaska (UTC-9/-8)' },
  { name: 'Los Angeles (PST/PDT)', tz: 'America/Los_Angeles', desc: 'Pacific US (UTC-8/-7)' },
  { name: 'San Francisco (PST/PDT)', tz: 'America/Los_Angeles', desc: 'Pacific US (UTC-8/-7)' },
  { name: 'Vancouver (PST/PDT)', tz: 'America/Vancouver', desc: 'Pacific Canada (UTC-8/-7)' },
  { name: 'Denver (MST/MDT)', tz: 'America/Denver', desc: 'Mountain US (UTC-7/-6)' },
  { name: 'Phoenix (MST)', tz: 'America/Phoenix', desc: 'Arizona (UTC-7)' },
  { name: 'Chicago (CST/CDT)', tz: 'America/Chicago', desc: 'Central US (UTC-6/-5)' },
  { name: 'Mexico City (CST)', tz: 'America/Mexico_City', desc: 'Mexico (UTC-6)' },
  { name: 'New York (EST/EDT)', tz: 'America/New_York', desc: 'Eastern US (UTC-5/-4)' },
  { name: 'Toronto (EST/EDT)', tz: 'America/Toronto', desc: 'Eastern Canada (UTC-5/-4)' },
  { name: 'Bogota (COT)', tz: 'America/Bogota', desc: 'Colombia (UTC-5)' },
  { name: 'Lima (PET)', tz: 'America/Lima', desc: 'Peru (UTC-5)' },
  { name: 'Santiago (CLT)', tz: 'America/Santiago', desc: 'Chile (UTC-4/-3)' },
  { name: 'Buenos Aires (ART)', tz: 'America/Argentina/Buenos_Aires', desc: 'Argentina (UTC-3)' },
  { name: 'São Paulo (BRT)', tz: 'America/Sao_Paulo', desc: 'Brazil (UTC-3)' }
];

  // --- WORLD CLOCK STATE ---
  const [worldCities, setWorldCities] = useState(() => {
    try {
      const saved = localStorage.getItem('userWorldCities');
      return saved ? JSON.parse(saved) : DEFAULT_CITIES;
    } catch {
      return DEFAULT_CITIES;
    }
  });
  const [worldTimes, setWorldTimes] = useState([]);
  const [showAddCity, setShowAddCity] = useState(false);
  const [selectedTz, setSelectedTz] = useState(AVAILABLE_TIMEZONES[0].tz);
  const [customCityName, setCustomCityName] = useState('');

  const handleAddCity = (e) => {
    e.preventDefault();
    const tzObj = AVAILABLE_TIMEZONES.find(t => t.tz === selectedTz) || AVAILABLE_TIMEZONES[0];
    const name = customCityName.trim() || tzObj.name;
    const newCity = {
      id: 'city_' + Date.now(),
      name: name,
      tz: tzObj.tz,
      label: tzObj.desc
    };
    const updated = [...worldCities, newCity];
    setWorldCities(updated);
    localStorage.setItem('userWorldCities', JSON.stringify(updated));
    setCustomCityName('');
    setShowAddCity(false);
  };

  const handleRemoveCity = (id) => {
    const updated = worldCities.filter(c => c.id !== id);
    setWorldCities(updated);
    localStorage.setItem('userWorldCities', JSON.stringify(updated));
  };

  const handleResetCities = () => {
    setWorldCities(DEFAULT_CITIES);
    localStorage.setItem('userWorldCities', JSON.stringify(DEFAULT_CITIES));
  };

  useEffect(() => {
    const updateWorldTimes = () => {
      const times = worldCities.map(city => {
        const options = {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        };
        if (city.tz) options.timeZone = city.tz;
        try {
          const timeStr = new Intl.DateTimeFormat('en-US', options).format(new Date());
          return { id: city.id, name: city.name, label: city.label, time: timeStr, tz: city.tz };
        } catch {
          return { id: city.id, name: city.name, label: city.label, time: '--:--:--', tz: city.tz };
        }
      });
      setWorldTimes(times);
    };

    updateWorldTimes();
    const clockInterval = setInterval(updateWorldTimes, 1000);
    return () => clearInterval(clockInterval);
  }, [worldCities]);

  return (
    <div className="flex flex-col md:flex-row h-full md:h-[calc(100vh-140px)] gap-3 md:gap-6 overflow-y-auto md:overflow-hidden">
      {/* LEFT NAVIGATION COLUMN */}
      <div className={`w-full md:w-64 flex flex-row md:flex-col overflow-x-auto no-scrollbar shrink-0 rounded-2xl border p-2 md:p-4 gap-1.5 ${cardBg}`}>
        <h3 className={`font-bold text-sm mb-0 md:mb-4 uppercase tracking-wider ${textTitle} hidden md:flex items-center gap-1.5 shrink-0`}>
          <Clock size={16} /> Time Center
        </h3>
        
        <div className="flex flex-row md:flex-col gap-1.5 w-full shrink-0">
          <button
            onClick={() => setSubTab('pomodoro')}
            className={`whitespace-nowrap px-3 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-between gap-2 shrink-0 md:w-full ${
              subTab === 'pomodoro' 
                ? 'bg-terracotta text-white shadow-sm' 
                : isDark ? 'text-gray-300 hover:bg-[#3d3a37]' : 'text-textCharcoal hover:bg-[#faf7f2]'
            }`}
          >
            <span>Focus Pomodoro</span>
            <Activity size={14} className="hidden sm:inline" />
          </button>

          <button
            onClick={() => setSubTab('timers')}
            className={`whitespace-nowrap px-3 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-between gap-2 shrink-0 md:w-full ${
              subTab === 'timers' 
                ? 'bg-terracotta text-white shadow-sm' 
                : isDark ? 'text-gray-300 hover:bg-[#3d3a37]' : 'text-textCharcoal hover:bg-[#faf7f2]'
            }`}
          >
            <span>Timers & Stopwatch</span>
            <Compass size={14} className="hidden sm:inline" />
          </button>

          <button
            onClick={() => setSubTab('alarms')}
            className={`whitespace-nowrap px-3 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-between gap-2 shrink-0 md:w-full ${
              subTab === 'alarms' 
                ? 'bg-terracotta text-white shadow-sm' 
                : isDark ? 'text-gray-300 hover:bg-[#3d3a37]' : 'text-textCharcoal hover:bg-[#faf7f2]'
            }`}
          >
            <span>Alarms</span>
            <Bell size={14} className="hidden sm:inline" />
          </button>

          <button
            onClick={() => setSubTab('worldclock')}
            className={`whitespace-nowrap px-3 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-between gap-2 shrink-0 md:w-full ${
              subTab === 'worldclock' 
                ? 'bg-terracotta text-white shadow-sm' 
                : isDark ? 'text-gray-300 hover:bg-[#3d3a37]' : 'text-textCharcoal hover:bg-[#faf7f2]'
            }`}
          >
            <span>World Clocks</span>
            <Globe size={14} className="hidden sm:inline" />
          </button>
        </div>
      </div>

      {/* RIGHT DISPLAY PANEL */}
      <div className={`flex-1 rounded-2xl border p-3.5 sm:p-5 overflow-y-auto ${cardBg}`}>
        
        {/* --- POMODORO SECTION --- */}
        {subTab === 'pomodoro' && (
          <div className="space-y-6 max-w-xl mx-auto text-center py-6">
            {/* Mode Selectors */}
            <div className="flex gap-2 justify-center">
              {['work', 'short_break', 'long_break'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setPomoMode(mode)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    pomoMode === mode
                      ? 'bg-terracotta text-white shadow-sm'
                      : isDark ? 'bg-[#312f2c] text-gray-300' : 'bg-gray-100 text-textCharcoal hover:bg-gray-200'
                  }`}
                >
                  {mode.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>

            {/* Time display */}
            <div className="py-6">
              <span className={`text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-wider ${
                pomoMode === 'work' ? 'text-terracotta' : 'text-sage'
              }`}>
                {formatPomoTime(pomoTimeLeft)}
              </span>
              <p className={`text-xs mt-1 uppercase tracking-wider font-semibold ${textSub}`}>
                {pomoMode === 'work' ? 'Time to Focus' : 'Take a break'}
              </p>
            </div>

            {/* Link note option */}
            {pomoMode === 'work' && (
              <div className="max-w-xs mx-auto">
                <label className={`block text-xs font-bold mb-1.5 uppercase ${textSub}`}>
                  Associate Focus Session:
                </label>
                <select
                  value={selectedNoteId}
                  onChange={(e) => setSelectedNoteId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${inputBg}`}
                >
                  <option value="">General Focus / No Note</option>
                  {notes.map(n => (
                    <option key={n.id} value={n.id}>{n.title || 'Untitled Note'}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Focus Controls */}
            <div className="flex gap-3 justify-center items-center">
              <button
                onClick={() => setPomoActive(!pomoActive)}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all ${
                  pomoActive 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-sage hover:bg-[#7b9087] text-white'
                }`}
              >
                {pomoActive ? 'Pause' : 'Start Focus'}
              </button>
              <button
                onClick={() => {
                  setPomoTimeLeft(pomoSettings[pomoMode]);
                  setPomoActive(true);
                }}
                className={`p-2.5 rounded-xl border hover:bg-gray-100 dark:hover:bg-[#312f2c] transition-all ${textSub}`}
                title="Restart timer"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Focus Session History */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 text-left">
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${textSub} flex items-center gap-1.5`}>
                <Award size={14} className="text-softYellow" /> Session History
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {pomoHistory.length === 0 ? (
                  <p className={`text-xs italic ${textSub}`}>No focus sessions logged yet. Get working!</p>
                ) : (
                  pomoHistory.map((item) => (
                    <div 
                      key={item.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isDark ? 'bg-[#312f2c] border-[#44413e]' : 'bg-[#faf8f4] border-[#f0ece3]'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-textCharcoal dark:text-white block">{item.noteTitle}</span>
                        <span className={`text-[10px] ${textSub}`}>
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <span className="font-bold text-terracotta">+{item.duration}m focused</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TIMER & STOPWATCH SECTION --- */}
        {subTab === 'timers' && (
          <div className="grid md:grid-cols-2 gap-8 divide-x-0 md:divide-x divide-gray-200 dark:divide-gray-700">
            {/* COUNTDOWN TIMER */}
            <div className="space-y-5 pr-0 md:pr-4 text-center">
              <h3 className={`text-sm font-bold uppercase tracking-wider text-left ${textSub} flex items-center gap-1.5`}>
                <Compass size={14} /> Countdown Timer
              </h3>

              <div className="py-4">
                <span className={`text-4xl sm:text-5xl font-black font-mono tracking-wider text-terracotta`}>
                  {countdownMinutes.toString().padStart(2, '0')}:{countdownSeconds.toString().padStart(2, '0')}
                </span>
              </div>

              {/* Set Time Inputs */}
              <div className="flex gap-2 items-center justify-center max-w-xs mx-auto">
                <input
                  type="number"
                  placeholder="Min"
                  value={countdownMinutes}
                  onChange={(e) => setCountdownMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={countdownActive}
                  className={`w-20 px-3 py-1.5 rounded-lg border text-center text-sm font-semibold outline-none ${inputBg}`}
                />
                <span className="font-bold">:</span>
                <input
                  type="number"
                  placeholder="Sec"
                  value={countdownSeconds}
                  onChange={(e) => setCountdownSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  disabled={countdownActive}
                  className={`w-20 px-3 py-1.5 rounded-lg border text-center text-sm font-semibold outline-none ${inputBg}`}
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <p className={`text-[10px] font-bold uppercase text-left ${textSub}`}>Quick Presets:</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {[5, 10, 15, 25, 30, 45, 60].map(mins => (
                    <button
                      key={mins}
                      onClick={() => setPresetCountdown(mins)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                        isDark 
                          ? 'bg-[#312f2c] border-[#44413e] text-white hover:bg-[#3d3a37]' 
                          : 'bg-[#faf7f2] border-[#e3ded5] text-textCharcoal hover:bg-[#f0ece3]'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Countdown controls */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setCountdownActive(!countdownActive)}
                  className="px-4 py-2 bg-sage hover:bg-[#7b9087] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  {countdownActive ? 'Pause' : 'Start'}
                </button>
                <button
                  onClick={handleCountdownReset}
                  className={`p-2 rounded-xl border hover:bg-gray-100 dark:hover:bg-[#312f2c] transition-all ${textSub}`}
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Custom Presets */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 text-left">
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSub}`}>Custom Presets</h4>
                
                {/* Form to add */}
                <form onSubmit={handleSavePreset} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="E.g., Read Book"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className={`flex-1 px-2.5 py-1.5 rounded-lg border text-xs outline-none ${inputBg}`}
                  />
                  <input
                    type="number"
                    value={newPresetMins}
                    onChange={(e) => setNewPresetMins(Math.max(1, parseInt(e.target.value) || 1))}
                    className={`w-14 px-2 py-1.5 rounded-lg border text-center text-xs outline-none ${inputBg}`}
                  />
                  <button
                    type="submit"
                    className="bg-terracotta text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                  >
                    Save
                  </button>
                </form>

                {/* Preset List */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {customPresets.map((preset, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 dark:border-[#3d3a37] text-xs">
                      <button 
                        onClick={() => setPresetCountdown(preset.duration)}
                        className={`font-semibold transition-all hover:text-terracotta ${textTitle}`}
                      >
                        {preset.name} ({preset.duration}m)
                      </button>
                      <button 
                        onClick={() => handleDeletePreset(idx)}
                        className="text-red-400 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* STOPWATCH */}
            <div className="space-y-5 pl-0 md:pl-6 text-center">
              <h3 className={`text-sm font-bold uppercase tracking-wider text-left ${textSub} flex items-center gap-1.5`}>
                <Compass size={14} /> Stopwatch
              </h3>

              <div className="py-4">
                <span className={`text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-wider text-sage break-all sm:break-normal`}>
                  {formatStopwatch(stopwatchTime)}
                </span>
              </div>

              {/* Controls */}
              <div className="flex gap-2 justify-center">
                {stopwatchActive ? (
                  <button
                    onClick={handleStopwatchPause}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={handleStopwatchStart}
                    className="px-4 py-2 bg-sage hover:bg-[#7b9087] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    Start
                  </button>
                )}
                
                {stopwatchActive && (
                  <button
                    onClick={handleStopwatchLap}
                    className={`px-4 py-2 rounded-xl border hover:bg-gray-100 dark:hover:bg-[#312f2c] transition-all text-xs font-bold ${textSub}`}
                  >
                    Lap
                  </button>
                )}

                <button
                  onClick={handleStopwatchReset}
                  className={`p-2 rounded-xl border hover:bg-gray-100 dark:hover:bg-[#312f2c] transition-all ${textSub}`}
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Lap times lists */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 text-left">
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSub}`}>Lap Logs</h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {laps.length === 0 ? (
                    <p className={`text-xs italic ${textSub}`}>No laps logged</p>
                  ) : (
                    laps.map((lapTime, i) => (
                      <div key={i} className="flex justify-between p-2 rounded-lg border border-gray-100 dark:border-[#3d3a37] text-xs font-mono">
                        <span className={textSub}>Lap {i + 1}</span>
                        <span className="font-bold text-sage">{formatStopwatch(lapTime)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- ALARMS SECTION --- */}
        {subTab === 'alarms' && (
          <div className="space-y-6 max-w-xl mx-auto">
            {/* Create Alarm Form */}
            <form onSubmit={handleAddAlarm} className={`p-4 rounded-xl border space-y-4 ${cardBg}`}>
              <h4 className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Create New Alarm</h4>
              
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center">
                {/* Time picker */}
                <div className="flex gap-1.5 items-center flex-1">
                  <select
                    value={alarmHour}
                    onChange={(e) => setAlarmHour(parseInt(e.target.value))}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-bold ${inputBg}`}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="font-bold">:</span>
                  <select
                    value={alarmMin}
                    onChange={(e) => setAlarmMin(parseInt(e.target.value))}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-bold ${inputBg}`}
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map(m => (
                      <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select
                    value={alarmPeriod}
                    onChange={(e) => setAlarmPeriod(e.target.value)}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-bold ${inputBg}`}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>

                {/* Alarm Label */}
                <input
                  type="text"
                  placeholder="Alarm label..."
                  value={alarmLabel}
                  onChange={(e) => setAlarmLabel(e.target.value)}
                  className={`flex-1 px-3 py-1.5 rounded-lg border text-xs outline-none ${inputBg}`}
                />
              </div>

              {/* Repeat Options */}
              <div className="space-y-1.5">
                <label className={`block text-[10px] font-bold uppercase ${textSub}`}>Repeat Days (optional):</label>
                <div className="flex flex-wrap gap-1">
                  {daysOfWeek.map(day => {
                    const isSelected = alarmDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleAlarmDay(day)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-terracotta border-terracotta text-white'
                            : isDark
                              ? 'bg-[#312f2c] border-[#44413e] text-gray-300'
                              : 'bg-white border-gray-200 text-textCharcoal hover:bg-gray-50'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sound & Music Selection */}
              <div className="space-y-2 pt-2 border-t border-current/10">
                <div className="flex items-center justify-between">
                  <label className={`text-[10px] font-bold uppercase ${textSub} flex items-center gap-1.5`}>
                    <Music size={12} className="text-terracotta" />
                    <span>Alarm Sound & Music:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handlePreviewSound(alarmSound, customAudioData)}
                    className="flex items-center gap-1 text-[11px] font-bold text-terracotta hover:underline px-2 py-0.5 rounded-lg bg-terracotta/10"
                    title="Test / Preview sound"
                  >
                    {previewingSoundId === alarmSound ? (
                      <>
                        <VolumeX size={12} className="animate-pulse" />
                        <span>Stop Preview</span>
                      </>
                    ) : (
                      <>
                        <Volume2 size={12} />
                        <span>Preview Sound</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Preset Sound Buttons Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {ALARM_SOUND_PRESETS.map((preset) => {
                    const isSelected = alarmSound === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setAlarmSound(preset.id);
                          if (preset.id !== 'custom') {
                            handlePreviewSound(preset.id);
                          }
                        }}
                        className={`p-2 rounded-xl border text-left transition-all relative ${
                          isSelected
                            ? 'bg-terracotta text-white border-terracotta shadow-sm font-bold ring-2 ring-terracotta/30'
                            : isDark
                              ? 'bg-[#312f2c] border-[#44413e] text-gray-300 hover:bg-[#3d3a37]'
                              : 'bg-white border-gray-200 text-textCharcoal hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{preset.icon}</span>
                          <span className="text-[11px] font-semibold truncate leading-tight">{preset.name}</span>
                        </div>
                        <div className={`text-[9px] mt-0.5 line-clamp-1 ${isSelected ? 'text-white/80' : 'opacity-60'}`}>
                          {preset.description}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Audio Upload Area */}
                {alarmSound === 'custom' && (
                  <div className={`p-3 rounded-xl border border-dashed flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn ${
                    isDark ? 'bg-[#3a3530]/50 border-terracotta/40' : 'bg-terracotta/5 border-terracotta/30'
                  }`}>
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-terracotta/20 flex items-center justify-center text-terracotta shrink-0">
                        <Upload size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-terracotta truncate">
                          {customAudioName || 'No audio file uploaded yet'}
                        </div>
                        <div className={`text-[10px] ${textSub}`}>
                          Supports MP3, WAV, AAC, M4A, OGG
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="file"
                        ref={customFileInputRef}
                        accept="audio/*"
                        onChange={handleCustomAudioUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => customFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-terracotta hover:bg-[#a04e36] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <Upload size={12} />
                        <span>{customAudioData ? 'Change Audio' : 'Upload Music'}</span>
                      </button>

                      {customAudioData && (
                        <button
                          type="button"
                          onClick={() => handlePreviewSound('custom', customAudioData)}
                          className="px-2.5 py-1.5 rounded-lg border border-terracotta/40 text-terracotta text-xs font-bold hover:bg-terracotta/10 transition-all flex items-center gap-1"
                          title="Preview uploaded song"
                        >
                          {previewingSoundId === 'custom' ? <VolumeX size={13} /> : <Volume2 size={13} />}
                          <span>{previewingSoundId === 'custom' ? 'Stop' : 'Play'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-sage hover:bg-[#7b9087] text-white py-2 rounded-xl text-xs font-bold shadow-md transition-all"
              >
                Set Alarm
              </button>
            </form>

            {/* Alarm Lists */}
            <div className="space-y-3">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Active Alarms</h4>
              
              {alarms.length === 0 ? (
                <p className={`text-xs italic ${textSub}`}>No alarms set</p>
              ) : (
                <div className="space-y-2">
                  {alarms.map(alarm => (
                    <div 
                      key={alarm.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                        alarm.enabled
                          ? isDark ? 'bg-[#312f2c] border-[#44413e]' : 'bg-[#fffdfa] border-[#e9e4db]'
                          : 'opacity-40 bg-transparent'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className={`text-lg font-bold font-mono ${textTitle}`}>
                            {alarm.hour}:{alarm.minute.toString().padStart(2, '0')} {alarm.period}
                          </span>
                          <span className="text-xs font-bold text-terracotta">{alarm.label}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-medium ${textSub}`}>
                            Repeat: {alarm.days.join(', ')}
                          </span>
                          <span className="text-[10px] opacity-40">•</span>
                          <span className="text-[10px] font-bold text-terracotta flex items-center gap-1">
                            <Music size={10} />
                            <span>{alarm.soundName || 'Gentle Chime'}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Sound test button */}
                        <button
                          type="button"
                          onClick={() => handlePreviewSound(alarm.sound || 'gentle_chime', alarm.customAudioData)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            previewingSoundId === (alarm.sound || 'gentle_chime')
                              ? 'text-terracotta bg-terracotta/15'
                              : 'text-gray-400 hover:text-terracotta'
                          }`}
                          title="Listen to this alarm's sound"
                        >
                          {previewingSoundId === (alarm.sound || 'gentle_chime') ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        </button>
                        {/* Toggle switch */}
                        <button
                          onClick={() => toggleAlarmEnabled(alarm.id)}
                          className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 ${
                            alarm.enabled ? 'bg-sage' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                            alarm.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </button>

                        <button 
                          onClick={() => handleDeleteAlarm(alarm.id)}
                          className="text-red-400 hover:text-red-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- WORLD CLOCK SECTION --- */}
        {subTab === 'worldclock' && (
          <div className="space-y-4 max-w-lg mx-auto">
            {/* Header with Title and Add (+) Button */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>World Cities Clocks</h4>
                <p className={`text-[11px] ${textSub} opacity-80`}>Track time across custom global zones</p>
              </div>
              <button
                onClick={() => setShowAddCity(!showAddCity)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl shadow-sm transition-all ${
                  showAddCity
                    ? isDark ? 'bg-[#312f2c] text-white border border-[#44413e]' : 'bg-gray-200 text-textCharcoal'
                    : isBlush
                      ? 'bg-hot-pink text-white hover:opacity-90 shadow-pink-200'
                      : 'bg-terracotta text-white hover:bg-[#b0533c]'
                }`}
                title="Add a new city / timezone"
              >
                <Plus size={15} className={`transition-transform duration-200 ${showAddCity ? 'rotate-45' : ''}`} />
                <span>{showAddCity ? 'Close' : 'Add Timezone'}</span>
              </button>
            </div>

            {/* Add City / Timezone Drawer / Form */}
            {showAddCity && (
              <form 
                onSubmit={handleAddCity} 
                className={`p-4 rounded-2xl border space-y-3.5 animate-fadeIn ${
                  isDark ? 'bg-[#312f2c]/90 border-[#44413e]' : 'bg-[#fffcf7] border-[#e6ded3] shadow-md'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-200/40 dark:border-gray-700/40">
                  <span className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>
                    Select Timezone
                  </span>
                  <span className={`text-[10px] ${textSub}`}>
                    {AVAILABLE_TIMEZONES.length} locations available
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-1 ${textSub}`}>
                      Choose City / Region:
                    </label>
                    <select
                      value={selectedTz}
                      onChange={(e) => {
                        setSelectedTz(e.target.value);
                        const match = AVAILABLE_TIMEZONES.find(t => t.tz === e.target.value);
                        if (match) setCustomCityName(match.name);
                      }}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${inputBg}`}
                    >
                      {AVAILABLE_TIMEZONES.map((item, idx) => (
                        <option key={idx} value={item.tz}>
                          {item.name} — {item.desc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-1 ${textSub}`}>
                      Display Name (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Paris Studio, Mom's House..."
                      value={customCityName}
                      onChange={(e) => setCustomCityName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className={`flex-1 py-2 text-xs font-bold rounded-xl text-white shadow-sm transition-all ${
                      isBlush ? 'bg-hot-pink hover:opacity-90' : 'bg-sage hover:bg-[#7b9087]'
                    }`}
                  >
                    Add to Clocks
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCity(false)}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${textSub}`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Clock List */}
            <div className="space-y-2.5">
              {worldTimes.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-xs italic ${textSub} mb-2`}>No clocks in your list.</p>
                  <button
                    onClick={handleResetCities}
                    className="text-xs font-bold text-terracotta underline"
                  >
                    Reset to Default Clocks
                  </button>
                </div>
              ) : (
                worldTimes.map((clock, index) => (
                  <div 
                    key={clock.id || index}
                    className={`p-3.5 rounded-xl border flex justify-between items-center transition-all group ${
                      index === 0
                        ? isDark ? 'bg-terracotta/10 border-terracotta/40' : 'bg-[#fbf9f5] border-terracotta/35'
                        : isDark ? 'bg-[#312f2c] border-[#44413e]' : 'bg-[#fffdfa] border-[#e9e4db]'
                    }`}
                  >
                    <div className="flex-1 pr-2">
                      <span className={`font-bold text-sm block ${textTitle}`}>
                        {clock.name}
                      </span>
                      <span className={`text-[10px] block mt-0.5 ${textSub}`}>
                        {clock.label || (clock.tz ? `Timezone (${clock.tz})` : 'Device Default Time')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-mono font-bold ${
                        isBlush ? 'text-hot-pink' : 'text-terracotta'
                      }`}>
                        {clock.time}
                      </span>
                      
                      {/* Delete / Remove button */}
                      <button
                        onClick={() => handleRemoveCity(clock.id)}
                        className={`p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-all text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40`}
                        title={`Remove ${clock.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer reset option */}
            {worldTimes.length > 0 && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleResetCities}
                  className={`text-[10px] font-medium opacity-60 hover:opacity-100 transition-opacity underline ${textSub}`}
                >
                  Reset to default timezones
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
