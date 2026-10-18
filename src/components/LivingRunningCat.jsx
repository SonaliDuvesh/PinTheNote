import React, { useState, useEffect, useRef } from 'react';

/**
 * LivingRunningCat
 * 
 * Integrated living character for Living L and Living D themes.
 * Alternates between two separate, intact animations via randomized state management:
 * 
 * 1. Animation A — Running:
 *    - Cat patrols back and forth along its horizontal floor path.
 *    - Physical turning animation from catFlip.mp4 when reaching edges or clicked.
 *    - Click-to-reverse immediately reverses direction at current position.
 *    - Randomly runs 2–5 complete traversals before switching to Animation B.
 * 
 * 2. Animation B — Sitting and Jumping (Alternating Forward / Reverse):
 *    - Plays the original catJump.mp4 video forward from 0 to 10 seconds.
 *    - If another repetition is required, plays backward from 10 to 0 seconds.
 *    - If another repetition is required, plays forward again from 0 to 10 seconds.
 *    - Alternates direction for every repetition (Forward -> Reverse -> Forward -> Reverse).
 *    - Eliminates size and pose popping between repetitions by seamlessly connecting turnaround poses.
 *    - Random repetition count (1–4 times).
 *    - Smooth, frame-accurate 60fps canvas rendering with real-time transparent keying.
 *    - Clicking during playback does not interrupt; queues direction change for when running resumes.
 *    - Returns to Animation A once all repetitions finish.
 */
export default function LivingRunningCat({ activeTheme, isMochiVisible }) {
  const [posX, setPosX] = useState(0);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const forwardVideoRef = useRef(null);
  const reverseVideoRef = useRef(null);
  const runSheetRef = useRef(null);
  const turnSheetRef = useRef(null);
  const posterRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const lastTimeRef = useRef(null);

  // Animation States: 'RUNNING' | 'TURNING' | 'ANIMATION_B'
  const stateRef = useRef('RUNNING');
  const posXRef = useRef(0);
  const directionRef = useRef('left'); // 'left' = moving left, 'right' = moving right
  const boundsRef = useRef({ width: 800, maxX: 731 });
  const hasInitializedPosRef = useRef(false);

  // Turn tracking
  const turnStartRef = useRef(0);
  const turnFromDirRef = useRef('left');
  const nextStateAfterTurnRef = useRef('RUNNING');
  const queuedReverseRef = useRef(false);

  // Animation A: Running traversals tracking (2–5 runs)
  const getRandomRunCount = () => Math.floor(Math.random() * 4) + 2; // 2, 3, 4, or 5
  const targetRunCountRef = useRef(getRandomRunCount());
  const currentRunCountRef = useRef(0);

  // Animation B: Video repetitions tracking (1–4 times, alternating direction)
  const getRandomRepetitionCount = () => Math.floor(Math.random() * 4) + 1; // 1, 2, 3, or 4
  const targetVideoRepsRef = useRef(getRandomRepetitionCount());
  const currentVideoRepRef = useRef(0);
  const videoDirectionRef = useRef('forward'); // 'forward' | 'reverse'
  const videoEndedHandledRef = useRef(false);

  // Durations
  const turnDuration = 35 / 24; // 35 frames at 24fps = ~1.458s

  // Preload running & turning sprite sheets
  useEffect(() => {
    const runSheet = new Image();
    runSheet.src = '/assets/cat_run_hd.png';
    runSheetRef.current = runSheet;

    const turnSheet = new Image();
    turnSheet.src = '/assets/cat_turn_hd.png';
    turnSheetRef.current = turnSheet;

    const poster = new Image();
    poster.src = '/assets/cat_poster.png';
    posterRef.current = poster;
  }, []);

  // Update bounds
  useEffect(() => {
    const updateBounds = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      if (w > 80) {
        const catWidth = 69;
        const maxX = Math.max(0, w - catWidth);
        boundsRef.current = { width: w, maxX };

        if (!hasInitializedPosRef.current && maxX > 0) {
          hasInitializedPosRef.current = true;
          posXRef.current = maxX;
          setPosX(maxX);
        } else if (posXRef.current > maxX) {
          posXRef.current = maxX;
          setPosX(maxX);
        }
      }
    };

    updateBounds();
    const ro = new ResizeObserver(updateBounds);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', updateBounds);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, [isMochiVisible]);

  // Main 60fps Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const cw = canvas.width;  // 138
    const ch = canvas.height; // 120

    // Render Animation A: Running Frame
    const renderRunningFrame = (dir, time) => {
      const sheet = runSheetRef.current;
      const poster = posterRef.current;
      if (!sheet || !sheet.complete) {
        if (poster && poster.complete) {
          ctx.clearRect(0, 0, cw, ch);
          ctx.drawImage(poster, 0, 0, cw, ch);
        }
        return;
      }

      const totalFrames = 16;
      const runCycleDuration = 16 / 24;
      const progress = ((time / 1000) % runCycleDuration) / runCycleDuration;
      const frameIndex = Math.min(totalFrames - 1, Math.floor(progress * totalFrames));

      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      if (dir === 'right') {
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
      }
      const frameW = sheet.naturalWidth ? (sheet.naturalWidth / totalFrames) : 276;
      const frameH = sheet.naturalHeight || 240;
      ctx.drawImage(sheet, frameIndex * frameW, 0, frameW, frameH, 0, 0, cw, ch);
      ctx.restore();
    };

    // Render Physical Turn Frame (catFlip.mp4)
    const renderTurningFrame = (turnFromDir, elapsed) => {
      const sheet = turnSheetRef.current;
      if (!sheet || !sheet.complete) return;

      const totalFrames = 35;
      const frameIndex = Math.min(totalFrames - 1, Math.floor((elapsed / turnDuration) * totalFrames));

      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      if (turnFromDir === 'right') {
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
      }
      const frameW = sheet.naturalWidth ? (sheet.naturalWidth / totalFrames) : 276;
      const frameH = sheet.naturalHeight || 240;
      ctx.drawImage(sheet, frameIndex * frameW, 0, frameW, frameH, 0, 0, cw, ch);
      ctx.restore();
    };

    // Render Animation B: Video Frame (Forward or Reverse) with real-time transparent keying
    const renderVideoBFrame = (dir) => {
      const isFwd = videoDirectionRef.current === 'forward';
      let video = isFwd ? forwardVideoRef.current : reverseVideoRef.current;

      // Fallback if current video is buffering
      if (!video || video.readyState < 2) {
        const altVideo = isFwd ? reverseVideoRef.current : forwardVideoRef.current;
        if (altVideo && altVideo.readyState >= 2) {
          video = altVideo;
        } else if (posterRef.current && posterRef.current.complete) {
          ctx.clearRect(0, 0, cw, ch);
          ctx.save();
          if (dir === 'right') {
            ctx.translate(cw, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(posterRef.current, 0, 0, cw, ch);
          ctx.restore();
          return;
        } else {
          return;
        }
      }

      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      if (dir === 'right') {
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
      }

      // Crop box aligning cat contact floor level (y = 237 equivalent)
      ctx.drawImage(video, 460, 40, 1070, 930, 0, 0, cw, ch);

      // Real-time background transparency keying
      const imgData = ctx.getImageData(0, 0, cw, ch);
      const data = imgData.data;
      const len = data.length;
      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const dist = Math.max(Math.abs(r - 248), Math.abs(g - 248), Math.abs(b - 248));
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);

        if (dist < 12 && chroma < 8) {
          data[i + 3] = 0;
        } else if (dist < 26 && chroma < 14) {
          data[i + 3] = Math.round(((dist - 12) / 14) * 255);
        }
      }
      ctx.putImageData(imgData, 0, 0);
      ctx.restore();
    };

    // Transition helper to start Animation B (Sitting and Jumping Video)
    const startAnimationB = () => {
      stateRef.current = 'ANIMATION_B';
      targetVideoRepsRef.current = getRandomRepetitionCount(); // 1–4 times
      currentVideoRepRef.current = 0;
      videoDirectionRef.current = 'forward'; // First repetition always forward (0 -> 10s)
      videoEndedHandledRef.current = false;

      const fwd = forwardVideoRef.current;
      const rev = reverseVideoRef.current;
      if (rev) {
        rev.pause();
        rev.currentTime = 0;
      }
      if (fwd) {
        fwd.currentTime = 0;
        fwd.play().catch(e => console.warn('forward video play warning:', e));
      }
    };

    // Transition helper to return from Animation B to Animation A (Running)
    const returnToRunning = (time) => {
      forwardVideoRef.current?.pause();
      reverseVideoRef.current?.pause();

      // Reset Animation A runs
      currentRunCountRef.current = 0;
      targetRunCountRef.current = getRandomRunCount(); // 2–5 runs

      const curX = posXRef.current;
      const maxX = boundsRef.current.maxX;
      const curDir = directionRef.current;

      const needsTurn = queuedReverseRef.current ||
                        (curX <= 0 && curDir === 'left') ||
                        (curX >= maxX && curDir === 'right');

      queuedReverseRef.current = false;

      if (needsTurn) {
        stateRef.current = 'TURNING';
        turnStartRef.current = time;
        turnFromDirRef.current = curDir;
        nextStateAfterTurnRef.current = 'RUNNING';
      } else {
        stateRef.current = 'RUNNING';
      }
    };

    const loop = (time) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      const dt = Math.min(0.1, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      const maxX = boundsRef.current.maxX;
      const speed = 85; // Natural ~85px/s running speed

      // STATE 1: ANIMATION A — RUNNING
      if (stateRef.current === 'RUNNING') {
        let curX = posXRef.current;
        const dir = directionRef.current;
        let reachedEdge = false;

        if (dir === 'left') {
          curX -= speed * dt;
          if (curX <= 0) {
            curX = 0;
            reachedEdge = true;
          }
        } else {
          curX += speed * dt;
          if (curX >= maxX) {
            curX = maxX;
            reachedEdge = true;
          }
        }

        posXRef.current = curX;
        setPosX(curX);

        if (reachedEdge) {
          currentRunCountRef.current += 1;

          // Check if traversal quota (2–5 runs) is reached
          if (currentRunCountRef.current >= targetRunCountRef.current) {
            // Turn inward away from wall, then transition into Animation B
            stateRef.current = 'TURNING';
            turnStartRef.current = time;
            turnFromDirRef.current = dir;
            nextStateAfterTurnRef.current = 'START_ANIMATION_B';
          } else {
            // Normal traversal edge turn to continue running
            stateRef.current = 'TURNING';
            turnStartRef.current = time;
            turnFromDirRef.current = dir;
            nextStateAfterTurnRef.current = 'RUNNING';
          }
          renderTurningFrame(dir, 0);
        } else {
          renderRunningFrame(dir, time);
        }

      // STATE 2: PHYSICAL TURNING
      } else if (stateRef.current === 'TURNING') {
        const elapsed = (time - turnStartRef.current) / 1000;
        renderTurningFrame(turnFromDirRef.current, elapsed);

        if (elapsed >= turnDuration) {
          const nextDir = turnFromDirRef.current === 'left' ? 'right' : 'left';
          directionRef.current = nextDir;

          if (nextStateAfterTurnRef.current === 'START_ANIMATION_B') {
            startAnimationB();
          } else {
            stateRef.current = 'RUNNING';
          }
        }

      // STATE 3: ANIMATION B — SITTING & JUMPING VIDEO (ALTERNATING FORWARD / REVERSE)
      } else if (stateRef.current === 'ANIMATION_B') {
        const dir = directionRef.current;
        const isFwd = videoDirectionRef.current === 'forward';
        const currentActiveVideo = isFwd ? forwardVideoRef.current : reverseVideoRef.current;

        renderVideoBFrame(dir);

        // Check if the current 10-second playthrough has reached the end
        if (currentActiveVideo && (currentActiveVideo.ended || (currentActiveVideo.duration > 0 && currentActiveVideo.currentTime >= currentActiveVideo.duration - 0.08))) {
          if (!videoEndedHandledRef.current) {
            videoEndedHandledRef.current = true;
            currentVideoRepRef.current += 1;

            if (currentVideoRepRef.current < targetVideoRepsRef.current) {
              // Alternate direction: forward -> reverse -> forward -> reverse
              const nextDirection = isFwd ? 'reverse' : 'forward';
              videoDirectionRef.current = nextDirection;
              const nextVideo = nextDirection === 'forward' ? forwardVideoRef.current : reverseVideoRef.current;
              const prevVideo = isFwd ? forwardVideoRef.current : reverseVideoRef.current;

              if (prevVideo) {
                prevVideo.pause();
                prevVideo.currentTime = 0;
              }

              if (nextVideo) {
                nextVideo.currentTime = 0;
                nextVideo.play().then(() => {
                  videoEndedHandledRef.current = false;
                }).catch(() => {
                  videoEndedHandledRef.current = false;
                });
              } else {
                videoEndedHandledRef.current = false;
              }
            } else {
              // All 1–4 repetitions complete: return to running
              returnToRunning(time);
            }
          }
        } else {
          videoEndedHandledRef.current = false;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Click Interaction:
  // - While Running: immediately reverse direction at current position via physical turn
  // - While Turning: reverse turning direction
  // - While in Animation B (video): do NOT interrupt playback; queue direction change
  const handleCatClick = (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (stateRef.current === 'RUNNING') {
      stateRef.current = 'TURNING';
      turnStartRef.current = performance.now();
      turnFromDirRef.current = directionRef.current;
      nextStateAfterTurnRef.current = 'RUNNING';
    } else if (stateRef.current === 'TURNING') {
      turnFromDirRef.current = turnFromDirRef.current === 'left' ? 'right' : 'left';
      turnStartRef.current = performance.now();
    } else if (stateRef.current === 'ANIMATION_B') {
      // Do not interrupt the sitting/jumping video; queue direction change
      queuedReverseRef.current = !queuedReverseRef.current;
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-3 left-[272px] right-[220px] h-[64px] pointer-events-none z-20 select-none overflow-visible transition-all duration-500"
    >
      {/* Forward Video Asset (0 to 10s) */}
      <video
        ref={forwardVideoRef}
        src="/catJump.mp4"
        muted
        playsInline
        preload="auto"
        className="hidden pointer-events-none"
        aria-hidden="true"
      />

      {/* Reverse Video Asset (10 to 0s) */}
      <video
        ref={reverseVideoRef}
        src="/catJump_rev.mp4"
        muted
        playsInline
        preload="auto"
        className="hidden pointer-events-none"
        aria-hidden="true"
      />

      {/* The Cat Character */}
      <div
        onClick={handleCatClick}
        style={{
          transform: `translate3d(${posX}px, 0, 0)`,
          willChange: 'transform',
        }}
        className="absolute bottom-0 pointer-events-auto cursor-pointer select-none flex flex-col items-center justify-end"
        title="Living Sanctuary Cat • Click to turn!"
      >
        {/* 60px Tall Canvas displaying the transparent living cat */}
        <canvas
          ref={canvasRef}
          width={138}
          height={120}
          style={{ width: '69px', height: '60px' }}
          className="pointer-events-none drop-shadow-sm block"
        />
      </div>
    </div>
  );
}
