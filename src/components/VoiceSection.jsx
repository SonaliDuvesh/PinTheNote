import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Square, Trash2, Link, Save, Play, Pause, Disc, 
  Sparkles, RefreshCw, FileText, Check, Plus, Bot, Volume2 
} from 'lucide-react';
import { db } from '../utils/db';
import { aiGenerateVoiceNoteSummary } from '../utils/ai';
import AudioPlayerItem from './AudioPlayerItem';

export default function VoiceSection({ 
  notes, 
  setNotes, 
  onCelebration, 
  darkMode, 
  activeTheme 
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudios, setRecordedAudios] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [aiProcessingId, setAiProcessingId] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const recordedMimeRef = useRef('audio/webm');

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

  // Load previously saved audios
  const loadSavedAudios = async () => {
    try {
      const all = await db.getAllAudios();
      setRecordedAudios(all);
    } catch (e) {
      console.error('Failed loading saved audios from DB:', e);
    }
  };

  useEffect(() => {
    loadSavedAudios();
  }, []);

  // Visualizer loop
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      if (!isRecording && !analyserRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteTimeDomainData(dataArray);

      ctx.fillStyle = darkMode ? '#1f1d1c' : '#fbf9f5';
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#d27d56'; // Terracotta wave
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      setRecordingSeconds(0);

      // Setup Web Audio for waveform
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Determine supported mime type
      let selectedMime = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          selectedMime = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          selectedMime = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          selectedMime = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          selectedMime = 'audio/aac';
        } else {
          selectedMime = '';
        }
      }
      recordedMimeRef.current = selectedMime || 'audio/webm';

      const mediaRecorder = selectedMime 
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const finalType = mediaRecorder.mimeType || recordedMimeRef.current || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalType });
        const recordId = 'audio_' + Date.now();
        await db.saveAudio(recordId, audioBlob, null);
        loadSavedAudios();

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };

      mediaRecorder.start(100); // chunk every 100ms
      setIsRecording(true);
      drawWaveform();

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);

      if (onCelebration) onCelebration('recording_started');
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Could not access microphone. Please ensure microphone permissions are allowed in your browser.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const handleDeleteAudio = async (id) => {
    await db.deleteAudio(id);
    loadSavedAudios();

    // Remove from notes
    const updatedNotes = notes.map(n => {
      const auds = n.audioIds || [];
      if (auds.includes(id)) {
        return {
          ...n,
          audioIds: auds.filter(aId => aId !== id),
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });
    setNotes(updatedNotes);
    localStorage.setItem('floatingNotes', JSON.stringify(updatedNotes));
  };

  const handleLinkAudio = async (audioId) => {
    if (!selectedNoteId) return;

    try {
      const updatedNotes = notes.map(n => {
        if (n.id === selectedNoteId) {
          const prevAudios = n.audioIds || [];
          if (!prevAudios.includes(audioId)) {
            return {
              ...n,
              audioIds: [...prevAudios, audioId],
              updatedAt: new Date().toISOString()
            };
          }
        }
        return n;
      });

      setNotes(updatedNotes);
      localStorage.setItem('floatingNotes', JSON.stringify(updatedNotes));

      // Update in DB with linked note
      const audioObj = recordedAudios.find(a => a.id === audioId);
      if (audioObj) {
        await db.saveAudio(audioId, audioObj.blob, selectedNoteId);
      }

      loadSavedAudios();
      setSaveStatus('Linked Successfully to Note!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus('Linking Failed');
    }
  };

  // AI Voice Summary & Note Creation
  const handleAiFormatVoiceNote = async (audio) => {
    setAiProcessingId(audio.id);
    try {
      const linkedNote = notes.find(n => n.id === audio.noteId);
      const generatedMarkdown = await aiGenerateVoiceNoteSummary(30, linkedNote?.title);

      const newNote = {
        id: 'note_' + Date.now(),
        title: `🎙️ Voice Note (${new Date(audio.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        content: generatedMarkdown,
        category: 'Ideas',
        pinned: false,
        starred: false,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        focusTime: 0,
        drawingIds: [],
        audioIds: [audio.id]
      };

      const updated = [newNote, ...notes];
      setNotes(updated);
      localStorage.setItem('floatingNotes', JSON.stringify(updated));

      // Also link to this audio in IndexedDB
      await db.saveAudio(audio.id, audio.blob, newNote.id);
      loadSavedAudios();

      setSaveStatus('✨ AI Structured Note Created!');
      setTimeout(() => setSaveStatus(''), 3000);
      if (onCelebration) onCelebration('note_saved');
    } catch (err) {
      alert(`AI Error: ${err.message}`);
    } finally {
      setAiProcessingId(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-140px)] gap-4 lg:gap-6 overflow-y-auto lg:overflow-hidden">
      {/* LEFT RECORDER PANEL */}
      <div className={`w-full lg:w-80 flex flex-col rounded-2xl border p-3.5 sm:p-4 ${cardBg} shrink-0`}>
        <h3 className={`font-bold text-sm mb-4 uppercase tracking-wider ${textTitle} flex items-center gap-1.5`}>
          <Mic size={16} /> Voice Notes Studio
        </h3>

        {/* Waveform Visualizer Display */}
        <div className="flex-1 min-h-[160px] overflow-hidden relative rounded-xl border border-gray-200 dark:border-[#3d3a37] mb-4 bg-gray-50 dark:bg-[#1f1d1c] flex flex-col items-center justify-center">
          {isRecording ? (
            <>
              <canvas ref={canvasRef} width="280" height="130" className="w-full h-full block" />
              <div className="absolute bottom-2 px-3 py-1 bg-black/70 rounded-full text-white text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>{Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}</span>
              </div>
            </>
          ) : (
            <div className="text-center p-4">
              <Disc size={36} className={`mx-auto mb-2 text-terracotta/40 ${isRecording ? 'animate-spin' : ''}`} />
              <p className={`text-xs font-semibold ${textTitle}`}>Ready to Record</p>
              <p className={`text-[11px] mt-1 ${textSub}`}>Click the button below to capture voice thoughts</p>
            </div>
          )}
        </div>

        {/* Record control button */}
        <button
          onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
          className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-terracotta hover:bg-[#be6e47] text-white shadow-terracotta/20'
          }`}
        >
          {isRecording ? <Square size={14} fill="currentColor" /> : <Mic size={14} />}
          <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
        </button>

        {isRecording && (
          <p className="text-center text-[11px] font-bold text-red-500 mt-2 animate-pulse">
            🔴 Recording in progress... Speak now!
          </p>
        )}
      </div>

      {/* RIGHT DISPLAY PANEL (RECORDINGS LIST & LINKING) */}
      <div className={`flex-1 min-h-[340px] lg:min-h-0 rounded-2xl border p-3.5 sm:p-5 flex flex-col justify-between overflow-hidden ${cardBg}`}>
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="flex justify-between items-center pb-2 border-b border-black/10 dark:border-white/10">
            <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>
              Audio Recordings ({recordedAudios.length})
            </span>
            <span className="text-[10px] text-terracotta font-bold flex items-center gap-1">
              <Sparkles size={11} /> AI Voice Structuring Enabled
            </span>
          </div>

          {recordedAudios.length === 0 ? (
            <div className="text-center py-24 text-xs italic opacity-50 flex flex-col items-center justify-center">
              <Mic size={36} className="mb-2 opacity-30" />
              <span>No recordings captured yet. Use the tool on the left to start.</span>
            </div>
          ) : (
            <div className="space-y-3.5">
              {recordedAudios.map(audio => {
                const isLinked = audio.noteId !== null && audio.noteId !== undefined;
                const linkedNote = notes.find(n => n.id === audio.noteId);
                const isAiBusy = aiProcessingId === audio.id;

                const extraActions = (
                  <>
                    {isLinked && (
                      <span className="text-[10px] px-2 py-0.5 bg-sage/20 text-sage rounded-md font-bold">
                        Linked: {linkedNote?.title || 'Note'}
                      </span>
                    )}

                    {/* AI Format button */}
                    <button
                      onClick={() => handleAiFormatVoiceNote(audio)}
                      disabled={isAiBusy}
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-terracotta to-[#e28a63] hover:from-[#c26e47] hover:to-terracotta text-white text-[10px] font-bold flex items-center gap-1 shadow-xs disabled:opacity-50"
                      title="Generate structured AI note from this recording"
                    >
                      {isAiBusy ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                      <span>{isAiBusy ? 'Processing...' : 'AI Make Note'}</span>
                    </button>

                    {/* Linking action */}
                    {!isLinked && (
                      <div className="flex items-center gap-1 text-[10px]">
                        <select
                          value={selectedNoteId}
                          onChange={(e) => setSelectedNoteId(e.target.value)}
                          className={`px-2 py-1 rounded-lg border outline-none text-[10px] ${inputBg}`}
                        >
                          <option value="">Link to Note...</option>
                          {notes.map(n => (
                            <option key={n.id} value={n.id}>{n.title}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleLinkAudio(audio.id)}
                          className="bg-sage hover:bg-[#7b9087] text-white p-1 rounded-lg transition-colors"
                          title="Save Link"
                        >
                          <Link size={12} />
                        </button>
                      </div>
                    )}
                  </>
                );

                return (
                  <AudioPlayerItem
                    key={audio.id}
                    audio={audio}
                    onDelete={handleDeleteAudio}
                    extraActions={extraActions}
                    darkMode={isDark}
                  />
                );
              })}
            </div>
          )}
        </div>

        {saveStatus && (
          <div className="text-center text-xs font-bold text-sage italic mt-3 bg-sage/10 py-1.5 rounded-xl">
            {saveStatus}
          </div>
        )}
      </div>
    </div>
  );
}
