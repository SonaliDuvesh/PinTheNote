/**
 * Alarm Sound Presets and Custom Audio Engine
 * Supports Web Audio API synthesized melodies and custom uploaded audio (MP3/WAV/OGG/etc.)
 */

export const ALARM_SOUND_PRESETS = [
  {
    id: 'gentle_chime',
    name: 'Gentle Chime',
    icon: '🔔',
    description: 'Soft dual-tone ambient chime'
  },
  {
    id: 'marimba',
    name: 'Cozy Marimba',
    icon: '🎹',
    description: 'Warm 4-note ascending kalimba arpeggio'
  },
  {
    id: 'zen_bell',
    name: 'Zen Singing Bowl',
    icon: '🧘',
    description: 'Deep resonant meditative harmonic bell'
  },
  {
    id: 'birds_chirp',
    name: 'Morning Forest Birds',
    icon: '🐦',
    description: 'Playful chirps and woodland melody'
  },
  {
    id: 'sparkle_harp',
    name: 'Celestial Harp',
    icon: '✨',
    description: 'Dreamy ascending fairy chime chords'
  },
  {
    id: 'cozy_guitar',
    name: 'Warm Acoustic Pluck',
    icon: '🎸',
    description: 'Soothing fingerpicked acoustic harmony'
  },
  {
    id: 'retro_beep',
    name: 'Digital Watch Beep',
    icon: '⏰',
    description: 'Classic 8-bit digital watch triple-pulse'
  },
  {
    id: 'custom',
    name: 'Custom Music / Audio',
    icon: '🎵',
    description: 'Upload your own MP3, WAV, or song file'
  }
];

let currentAudioElement = null;
let currentAudioContext = null;

export function stopAnyActiveAlarmSound() {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch (e) {
      // ignore
    }
    currentAudioElement = null;
  }
  if (currentAudioContext) {
    try {
      currentAudioContext.close();
    } catch (e) {
      // ignore
    }
    currentAudioContext = null;
  }
}

export function playAlarmSound(soundId = 'gentle_chime', customAudioData = null) {
  stopAnyActiveAlarmSound();

  if (soundId === 'custom' && customAudioData) {
    try {
      const audio = new Audio(customAudioData);
      currentAudioElement = audio;
      audio.play().catch(err => {
        console.warn('Custom audio playback failed:', err);
      });
      return audio;
    } catch (e) {
      console.warn('Failed to initialize custom audio:', e);
    }
  }

  // Synthesize using Web Audio API
  try {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtxClass) return null;
    const ctx = new AudioCtxClass();
    currentAudioContext = ctx;

    const now = ctx.currentTime;

    switch (soundId) {
      case 'marimba': {
        // 4-note ascending kalimba/marimba: C5, E5, G5, C6
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const t = now + idx * 0.16;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.28, t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.5);
        });
        break;
      }

      case 'zen_bell': {
        // Tibetan Singing Bowl with overtones (432Hz base + harmonics)
        const fundamental = 432;
        const overtones = [
          { freq: fundamental, gainVal: 0.28, decay: 2.2 },
          { freq: fundamental * 2.01, gainVal: 0.15, decay: 1.8 },
          { freq: fundamental * 3.03, gainVal: 0.08, decay: 1.4 },
          { freq: fundamental * 4.76, gainVal: 0.04, decay: 1.0 }
        ];

        overtones.forEach(({ freq, gainVal, decay }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(gainVal, now + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + decay);
        });
        break;
      }

      case 'birds_chirp': {
        const createChirp = (startTime, startFreq, peakFreq, endFreq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(startFreq, startTime);
          osc.frequency.exponentialRampToValueAtTime(peakFreq, startTime + 0.06);
          osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + 0.14);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.18);
        };

        createChirp(now, 2400, 3600, 2800);
        createChirp(now + 0.18, 2800, 4200, 3100);
        createChirp(now + 0.38, 2600, 4000, 3400);
        createChirp(now + 0.52, 3200, 4600, 3600);
        break;
      }

      case 'sparkle_harp': {
        const harpNotes = [329.63, 415.30, 493.88, 659.25, 830.61, 987.77, 1318.51];
        harpNotes.forEach((freq, idx) => {
          const t = now + idx * 0.08;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.65);
        });
        break;
      }

      case 'cozy_guitar': {
        const chord = [220, 329.63, 440, 554.37, 659.25];
        chord.forEach((freq, idx) => {
          const t = now + idx * 0.09;
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1200, t);
          filter.frequency.exponentialRampToValueAtTime(400, t + 0.5);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.85);
        });
        break;
      }

      case 'retro_beep': {
        const beeps = [
          { t: now, f: 880, d: 0.08 },
          { t: now + 0.12, f: 880, d: 0.08 },
          { t: now + 0.24, f: 1174.66, d: 0.16 }
        ];
        beeps.forEach(({ t, f, d }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'square';
          osc.frequency.setValueAtTime(f, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.18, t + 0.01);
          gain.gain.setValueAtTime(0.18, t + d - 0.01);
          gain.gain.linearRampToValueAtTime(0, t + d);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + d + 0.02);
        });
        break;
      }

      case 'gentle_chime':
      default: {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.15);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.05);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.2);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.55);
        break;
      }
    }

    return ctx;
  } catch (err) {
    console.error('Audio Context error:', err);
    return null;
  }
}
