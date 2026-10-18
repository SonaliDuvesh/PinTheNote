import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Trash2, Mic, Clock } from 'lucide-react';

export default function AudioPlayerItem({
  audio,
  onDelete = null,
  onAiSummarize = null,
  isAiBusy = false,
  extraActions = null,
  darkMode = false,
  className = ''
}) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  // Safely manage Blob URL and cleanup
  useEffect(() => {
    if (!audio || !audio.blob) return;

    let url = null;
    try {
      if (audio.blob instanceof Blob) {
        url = URL.createObjectURL(audio.blob);
      } else if (audio.blob instanceof ArrayBuffer || ArrayBuffer.isView(audio.blob)) {
        const reconstructed = new Blob([audio.blob], { type: audio.type || 'audio/webm' });
        url = URL.createObjectURL(reconstructed);
      } else if (typeof audio.blob === 'string' && audio.blob.startsWith('data:')) {
        url = audio.blob;
      }
      setObjectUrl(url);
    } catch (e) {
      console.error('Failed to create Object URL for audio:', e);
    }

    return () => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [audio?.id, audio?.blob]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error('Audio play error:', err));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      if (!isNaN(dur) && isFinite(dur)) {
        setDuration(dur);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    if (!progressRef.current || !audioRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`p-3 rounded-2xl border transition-all ${
      darkMode ? 'bg-[#292725] border-[#3e3b38] text-[#eeebe6]' : 'bg-[#fffdfa] border-[#e8e2d7] text-textCharcoal'
    } shadow-xs ${className}`}>
      {objectUrl && (
        <audio
          ref={audioRef}
          src={objectUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          preload="metadata"
          className="hidden"
        />
      )}

      {/* Main audio player controls */}
      <div className="flex items-center gap-3">
        {/* Play / Pause button */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-xl bg-terracotta hover:bg-[#c26e47] text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm"
          title={isPlaying ? 'Pause' : 'Play voice note'}
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>

        {/* Progress bar and time */}
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-[11px] font-mono opacity-80">
            <span className="font-semibold text-terracotta">{formatTime(currentTime)}</span>
            <span className="opacity-60">{formatTime(duration || audio?.duration || 0)}</span>
          </div>

          <div
            ref={progressRef}
            onClick={handleSeek}
            className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 cursor-pointer relative overflow-hidden group/bar"
          >
            <div
              className="h-full bg-gradient-to-r from-terracotta to-[#e68f68] rounded-full transition-all duration-75 relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow opacity-0 group-hover/bar:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Audio helper icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={15} className="text-red-400" /> : <Volume2 size={15} />}
          </button>

          {objectUrl && (
            <a
              href={objectUrl}
              download={`voice_note_${audio?.id || Date.now()}.webm`}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100 transition-colors"
              title="Download recording"
            >
              <Download size={15} />
            </a>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(audio.id)}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Delete recording"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Extra actions and info footer */}
      {(extraActions || audio?.createdAt) && (
        <div className="mt-2 pt-2 border-t border-inherit/40 flex items-center justify-between text-[10px] opacity-75 flex-wrap gap-2">
          <span className="flex items-center gap-1 font-mono">
            <Clock size={11} />
            {audio?.createdAt ? new Date(audio.createdAt).toLocaleString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Recorded audio'}
          </span>

          <div className="flex items-center gap-2">
            {extraActions}
          </div>
        </div>
      )}
    </div>
  );
}
