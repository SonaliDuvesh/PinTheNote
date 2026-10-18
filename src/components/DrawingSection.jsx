import React, { useState, useEffect, useRef } from 'react';
import { 
  Pen, Eraser, Grid3x3, ZoomIn, ZoomOut, RotateCcw,
  Trash2, Save, Image, Link, X, Eye, EyeOff, Undo2, Redo2, ChevronDown, ChevronUp, Maximize2, Minimize2
} from 'lucide-react';
import { db } from '../utils/db';

export default function DrawingSection({ 
  notes, 
  setNotes, 
  darkMode, 
  activeTheme 
}) {
  const canvasRef = useRef(null);
  
  // React States for UI controls
  const [drawingTool, setDrawingTool] = useState('pen'); // pen, eraser
  const [brushType, setBrushType] = useState('normal'); // normal, pencil, marker, spray, blur
  const [penSize, setPenSize] = useState(5);
  const [penColor, setPenColor] = useState('#d27d56');
  const [opacity, setOpacity] = useState(1.0);
  const [stabilizer, setStabilizer] = useState('medium'); // off, low, medium, high
  const [canvasGrid, setCanvasGrid] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const isFocusModeRef = useRef(false);
  useEffect(() => {
    isFocusModeRef.current = isFocusMode;
  }, [isFocusMode]);

  const toggleFocusMode = () => {
    const next = !isFocusMode;
    setIsFocusMode(next);
    if (next) {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleSelectBrush = (id) => {
    setBrushType(id);
    setDrawingTool('pen');
    needRedrawRef.current = true;
  };

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  
  // React states that synchronize with refs to render UI values
  const [canvasZoomState, setCanvasZoomState] = useState(1.0);
  const [strokeCount, setStrokeCount] = useState(0);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [linkedNoteId, setLinkedNoteId] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  
  // Modals confirmation
  const [showClearModal, setShowClearModal] = useState(false);

  // Mutable Refs for high frequency events (Zero React re-render overhead)
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef([]);
  const redoStrokesRef = useRef([]);
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const canvasZoomRef = useRef(1.0);
  const needRedrawRef = useRef(false);
  const cursorPosRef = useRef(null);
  const lastPointRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const spacePressedRef = useRef(false);
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

  const quickColors = isBlush
    ? ['#FF69B4', '#FFB7C5', '#FFD1DC', '#6A4C93', '#D2B48C', '#4B0082', '#E6E6FA']
    : ['#4A2C1D', '#B0764A', '#7A8B6F', '#C9975C', '#3B2418', '#5A4636', '#8FA487'];

  // Helper to convert points to Quadratic Bezier SVG path
  const pointsToPath = (pts) => {
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    if (pts.length === 2) {
      path += ` L ${pts[1].x} ${pts[1].y}`;
    } else if (pts.length > 2) {
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        path += ` Q ${pts[i].x} ${pts[i].y} ${xc} ${yc}`;
      }
      path += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    }
    return path;
  };

  // Save drawing state automatically to LocalStorage
  const saveDraft = () => {
    const draft = {
      strokes: strokesRef.current,
      linkedNoteId: linkedNoteId
    };
    localStorage.setItem('ambientCanvasDraft', JSON.stringify(draft));
  };

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem('ambientCanvasDraft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        strokesRef.current = parsed.strokes || [];
        setStrokeCount(strokesRef.current.length);
        if (parsed.linkedNoteId) {
          setLinkedNoteId(parsed.linkedNoteId);
          setSelectedNoteId(parsed.linkedNoteId);
        }
        needRedrawRef.current = true;
      } catch (err) {
        console.error("Failed to load ambient canvas draft", err);
      }
    }
  }, []);

  // Keyboard Shortcuts Listener (Ctrl+Z, Ctrl+Y, Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space key for panning
      if (e.code === 'Space') {
        const activeTag = document.activeElement.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
          e.preventDefault();
          if (!spacePressedRef.current) {
            spacePressedRef.current = true;
            updateCursor();
          }
        }
      }

      // Escape to exit focus mode
      if (e.key === 'Escape') {
        if (isFocusModeRef.current) {
          setIsFocusMode(false);
          if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }
      }

      // Undo / Redo
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (isCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        spacePressedRef.current = false;
        updateCursor();
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFocusModeRef.current) {
        setIsFocusMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [linkedNoteId]);

  // RequestAnimationFrame drawing loop with error resilience
  useEffect(() => {
    needRedrawRef.current = true;
    let animFrameId;
    const renderLoop = () => {
      if (needRedrawRef.current) {
        try {
          redrawCanvas();
        } catch (err) {
          console.error("Canvas redraw error:", err);
        }
        needRedrawRef.current = false;
      }
      animFrameId = requestAnimationFrame(renderLoop);
    };
    animFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animFrameId);
  }, [penColor, penSize, drawingTool, brushType, opacity, canvasGrid, darkMode, linkedNoteId]);

  // Instant grid toggle helper
  const toggleGrid = () => {
    setCanvasGrid(prev => !prev);
    needRedrawRef.current = true;
  };

  // Handle window and container resizing
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentNode;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }
    
    needRedrawRef.current = true;
  };

  useEffect(() => {
    resizeCanvas();
    const canvas = canvasRef.current;
    const parent = canvas?.parentNode;
    let observer;
    if (parent && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        resizeCanvas();
      });
      observer.observe(parent);
    }
    window.addEventListener('resize', resizeCanvas);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Re-size and re-render canvas immediately when focus mode is toggled
  useEffect(() => {
    const timer = setTimeout(() => {
      resizeCanvas();
    }, 60);
    return () => clearTimeout(timer);
  }, [isFocusMode]);

  // Update cursor based on tool and spacebar state
  const updateCursor = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (isPanningRef.current) {
      canvas.style.cursor = 'grabbing';
    } else if (spacePressedRef.current) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = 'crosshair';
    }
  };

  // Convert points to Bezier curves on Canvas Context
  const drawBezierPath = (ctx, points) => {
    if (!points || points.length === 0) return;
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, Math.max(0.5, (ctx.lineWidth || 2) / 2), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }
  };

  // Context drawing helper
  const drawStrokeOnContext = (ctx, stroke) => {
    if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) return;
    
    ctx.save();
    ctx.strokeStyle = stroke.color || '#d27d56';
    ctx.fillStyle = stroke.color || '#d27d56';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const strokeOpacity = stroke.opacity !== undefined ? stroke.opacity : 1.0;

    if (stroke.type === 'pencil') {
      // Textured graphite pencil
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Core graphite line
      ctx.lineWidth = Math.max(1, stroke.width * 0.9);
      ctx.globalAlpha = 0.75 * strokeOpacity;
      drawBezierPath(ctx, stroke.points);
      ctx.stroke();

      // Subtle textured graphite grain
      if (stroke.points.length > 1) {
        ctx.lineWidth = Math.max(0.8, stroke.width * 0.5);
        ctx.globalAlpha = 0.35 * strokeOpacity;
        const offsetPts = stroke.points.map((pt, i) => ({
          x: pt.x + (i % 2 === 0 ? 0.6 : -0.6),
          y: pt.y + (i % 2 === 0 ? -0.4 : 0.4)
        }));
        drawBezierPath(ctx, offsetPts);
        ctx.stroke();
      }

    } else if (stroke.type === 'marker') {
      // Broad translucent chisel marker
      ctx.lineWidth = Math.max(6, stroke.width * 2.2);
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
      ctx.globalAlpha = 0.5 * strokeOpacity;
      drawBezierPath(ctx, stroke.points);
      ctx.stroke();

    } else if (stroke.type === 'calligraphy') {
      // Dynamic 45-degree ribbon chisel pen
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.globalAlpha = 0.9 * strokeOpacity;
      
      if (stroke.points.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke.points[0].x, stroke.points[0].y, Math.max(1, stroke.width / 2), 0, Math.PI * 2);
        ctx.fill();
      } else {
        const angle = Math.PI / 4; // 45 degrees
        const halfW = Math.max(2, (stroke.width * 1.6) / 2);
        const dx = Math.cos(angle) * halfW;
        const dy = Math.sin(angle) * halfW;

        ctx.beginPath();
        for (let i = 0; i < stroke.points.length - 1; i++) {
          const p1 = stroke.points[i];
          const p2 = stroke.points[i + 1];
          ctx.moveTo(p1.x - dx, p1.y + dy);
          ctx.lineTo(p1.x + dx, p1.y - dy);
          ctx.lineTo(p2.x + dx, p2.y - dy);
          ctx.lineTo(p2.x - dx, p2.y + dy);
          ctx.closePath();
        }
        ctx.fill();
      }

    } else if (stroke.type === 'spray') {
      // Realistic airbrush spray mist
      ctx.fillStyle = stroke.color;
      ctx.globalAlpha = 0.75 * strokeOpacity;
      ctx.beginPath();
      stroke.points.forEach(pt => {
        if (pt.particles && pt.particles.length > 0) {
          pt.particles.forEach(p => {
            const pRadius = (p.size || 1.4) / 2;
            ctx.moveTo(pt.x + p.dx + pRadius, pt.y + p.dy);
            ctx.arc(pt.x + p.dx, pt.y + p.dy, pRadius, 0, Math.PI * 2);
          });
        } else {
          const r = Math.max(1, stroke.width / 3);
          ctx.moveTo(pt.x + r, pt.y);
          ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        }
      });
      ctx.fill();

    } else if (stroke.type === 'blur' || stroke.type === 'glow') {
      // Soft diffused glowing airbrush
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 1. Wide diffused halo
      ctx.lineWidth = stroke.width * 2.8;
      ctx.globalAlpha = 0.15 * strokeOpacity;
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = stroke.width * 1.5;
      drawBezierPath(ctx, stroke.points);
      ctx.stroke();

      // 2. Soft mid body
      ctx.lineWidth = stroke.width * 1.6;
      ctx.globalAlpha = 0.35 * strokeOpacity;
      ctx.shadowBlur = stroke.width * 0.8;
      drawBezierPath(ctx, stroke.points);
      ctx.stroke();

      // 3. Crisp core
      ctx.lineWidth = stroke.width * 0.8;
      ctx.globalAlpha = 0.7 * strokeOpacity;
      ctx.shadowBlur = 0;
      drawBezierPath(ctx, stroke.points);
      ctx.stroke();

    } else {
      // Normal pen
      ctx.lineWidth = stroke.width;
      ctx.globalAlpha = strokeOpacity;
      drawBezierPath(ctx, stroke.points);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Re-draw whole canvas
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Reset default transforms and clear transparently
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply High-DPI scaling
    ctx.scale(dpr, dpr);

    // Enter Camera space (zoom, pan)
    ctx.save();
    ctx.translate(panOffsetRef.current.x, panOffsetRef.current.y);
    ctx.scale(canvasZoomRef.current, canvasZoomRef.current);

    // Build list of all strokes
    const allStrokes = [...strokesRef.current];
    if (currentStrokeRef.current.length > 0) {
      allStrokes.push({
        points: currentStrokeRef.current,
        color: drawingTool === 'eraser' ? 'rgba(0,0,0,1)' : penColor,
        width: drawingTool === 'eraser' ? penSize * 3 : penSize,
        type: drawingTool === 'eraser' ? 'eraser' : brushType,
        opacity: opacity
      });
    }

    // Render strokes sequentially
    allStrokes.forEach(stroke => {
      if (stroke.type === 'eraser') {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        drawBezierPath(ctx, stroke.points);
        ctx.stroke();
        ctx.restore();
      } else {
        drawStrokeOnContext(ctx, stroke);
      }
    });

    // Render Ambient Grid behind everything using destination-over
    if (canvasGrid) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.strokeStyle = isBlush
        ? (darkMode ? 'rgba(255, 183, 197, 0.22)' : 'rgba(106, 76, 147, 0.16)')
        : (darkMode ? 'rgba(255, 255, 255, 0.16)' : 'rgba(74, 44, 29, 0.14)');
      ctx.lineWidth = Math.max(0.75, 1 / canvasZoomRef.current);
      const gridSize = 32;

      // Draw grid only inside viewport boundaries for high performance
      const minX = -panOffsetRef.current.x / canvasZoomRef.current;
      const minY = -panOffsetRef.current.y / canvasZoomRef.current;
      const maxX = (rect.width - panOffsetRef.current.x) / canvasZoomRef.current;
      const maxY = (rect.height - panOffsetRef.current.y) / canvasZoomRef.current;

      const startX = Math.floor(minX / gridSize) * gridSize - gridSize;
      const endX = Math.ceil(maxX / gridSize) * gridSize + gridSize;
      const startY = Math.floor(minY / gridSize) * gridSize - gridSize;
      const endY = Math.ceil(maxY / gridSize) * gridSize + gridSize;

      ctx.beginPath();
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw solid canvas background behind strokes & grid
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = darkMode ? '#1f1d1c' : '#fbf9f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw Brush Preview circle if hover
    if (cursorPosRef.current && !isDrawingRef.current && !isPanningRef.current) {
      ctx.save();
      ctx.strokeStyle = darkMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1 / canvasZoomRef.current;
      ctx.beginPath();
      const radius = (drawingTool === 'eraser' ? penSize * 3 : penSize) / 2;
      ctx.arc(cursorPosRef.current.x, cursorPosRef.current.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  };

  // Convert client viewport coordinates to Canvas world space
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;

    if (e.clientX !== undefined) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.nativeEvent && e.nativeEvent.clientX !== undefined) {
      clientX = e.nativeEvent.clientX;
      clientY = e.nativeEvent.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const canvasX = (x - panOffsetRef.current.x) / canvasZoomRef.current;
    const canvasY = (y - panOffsetRef.current.y) / canvasZoomRef.current;

    return { x: canvasX, y: canvasY, rawX: x, rawY: y };
  };

  // Pointer Down
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      if (e.pointerId !== undefined && canvas.setPointerCapture) {
        canvas.setPointerCapture(e.pointerId);
      }
    } catch (_) {}

    // Pan mode triggers: Middle click (button 1), Shift key, Spacebar pressed
    const triggerPan = e.button === 1 || e.shiftKey || spacePressedRef.current;
    if (triggerPan) {
      isPanningRef.current = true;
      const coords = getCanvasCoords(e);
      panStartRef.current = { x: coords.rawX - panOffsetRef.current.x, y: coords.rawY - panOffsetRef.current.y };
      updateCursor();
      return;
    }

    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPointRef.current = { x: coords.x, y: coords.y };

    let firstPoint = { x: coords.x, y: coords.y };
    if (brushType === 'spray' && drawingTool === 'pen') {
      const initialParticles = [];
      const numParticles = 24;
      const radius = penSize * 2.4;
      for (let i = 0; i < numParticles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.pow(Math.random(), 1.4) * radius;
        initialParticles.push({
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          size: Math.random() * 1.6 + 0.8
        });
      }
      firstPoint.particles = initialParticles;
    }

    currentStrokeRef.current = [firstPoint];
    needRedrawRef.current = true;
  };

  // Pointer Move
  const draw = (e) => {
    const coords = getCanvasCoords(e);
    cursorPosRef.current = { x: coords.x, y: coords.y };

    if (isPanningRef.current) {
      panOffsetRef.current = {
        x: coords.rawX - panStartRef.current.x,
        y: coords.rawY - panStartRef.current.y
      };
      needRedrawRef.current = true;
      return;
    }

    if (!isDrawingRef.current) {
      needRedrawRef.current = true; // Updates the cursor circle location
      return;
    }

    // Apply Stabilizer exponential filter
    let factor = 1.0;
    if (stabilizer === 'low') factor = 0.5;
    else if (stabilizer === 'medium') factor = 0.25;
    else if (stabilizer === 'high') factor = 0.12;

    const lastPt = lastPointRef.current || coords;
    const stabX = lastPt.x + (coords.x - lastPt.x) * factor;
    const stabY = lastPt.y + (coords.y - lastPt.y) * factor;

    lastPointRef.current = { x: stabX, y: stabY };

    if (brushType === 'spray' && drawingTool === 'pen') {
      const particles = [];
      const numParticles = 16;
      const radius = penSize * 2.4;
      for (let i = 0; i < numParticles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.pow(Math.random(), 1.4) * radius;
        particles.push({
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          size: Math.random() * 1.6 + 0.8
        });
      }
      currentStrokeRef.current.push({ x: stabX, y: stabY, particles });
    } else {
      currentStrokeRef.current.push({ x: stabX, y: stabY });
    }

    needRedrawRef.current = true;
  };

  // Pointer Up / Leave
  const stopDrawing = (e) => {
    if (canvasRef.current && e) {
      try {
        if (e.pointerId !== undefined && canvasRef.current.releasePointerCapture) {
          canvasRef.current.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      updateCursor();
      return;
    }

    if (isDrawingRef.current && currentStrokeRef.current.length > 0) {
      if (e) {
        const finalCoords = getCanvasCoords(e);
        if (finalCoords) {
          currentStrokeRef.current.push({ x: finalCoords.x, y: finalCoords.y });
        }
      }

      const path = pointsToPath(currentStrokeRef.current);
      
      const strokeObj = {
        points: [...currentStrokeRef.current],
        path: path,
        color: drawingTool === 'eraser' ? 'rgba(0,0,0,1)' : penColor,
        width: drawingTool === 'eraser' ? penSize * 3 : penSize,
        type: drawingTool === 'eraser' ? 'eraser' : brushType,
        opacity: opacity
      };

      strokesRef.current.push(strokeObj);
      setStrokeCount(strokesRef.current.length);
      redoStrokesRef.current = []; // Reset Redo stack
      currentStrokeRef.current = [];
      
      saveDraft();
    }
    isDrawingRef.current = false;
    needRedrawRef.current = true;
  };

  // Undo stroke
  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    const item = strokesRef.current.pop();
    redoStrokesRef.current.push(item);
    setStrokeCount(strokesRef.current.length);
    needRedrawRef.current = true;
    saveDraft();
  };

  // Redo stroke
  const handleRedo = () => {
    if (redoStrokesRef.current.length === 0) return;
    const item = redoStrokesRef.current.pop();
    strokesRef.current.push(item);
    setStrokeCount(strokesRef.current.length);
    needRedrawRef.current = true;
    saveDraft();
  };

  // Zoom on wheel / trackpad around focal point
  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomIntensity = 0.06;
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1 + zoomIntensity : 1 - zoomIntensity;

    const oldZoom = canvasZoomRef.current;
    const newZoom = Math.min(5.0, Math.max(0.2, oldZoom * factor));

    if (oldZoom === newZoom) return;

    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const px = cx - (cx - panOffsetRef.current.x) * (newZoom / oldZoom);
    const py = cy - (cy - panOffsetRef.current.y) * (newZoom / oldZoom);

    canvasZoomRef.current = newZoom;
    panOffsetRef.current = { x: px, y: py };
    
    setCanvasZoomState(newZoom);
    needRedrawRef.current = true;
  };

  // Zoom on buttons (focal point is viewport center)
  const handleZoomButtons = (zoomIn) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const oldZoom = canvasZoomRef.current;
    const zoomIntensity = 0.25;
    const newZoom = Math.min(5.0, Math.max(0.2, zoomIn ? oldZoom + zoomIntensity : oldZoom - zoomIntensity));

    if (oldZoom === newZoom) return;

    const px = cx - (cx - panOffsetRef.current.x) * (newZoom / oldZoom);
    const py = cy - (cy - panOffsetRef.current.y) * (newZoom / oldZoom);

    canvasZoomRef.current = newZoom;
    panOffsetRef.current = { x: px, y: py };
    
    setCanvasZoomState(newZoom);
    needRedrawRef.current = true;
  };

  // Reset View Zoom/Pan
  const resetView = () => {
    canvasZoomRef.current = 1.0;
    panOffsetRef.current = { x: 0, y: 0 };
    setCanvasZoomState(1.0);
    needRedrawRef.current = true;
  };

  // Clear Canvas trigger
  const triggerClearCanvas = () => {
    if (strokesRef.current.length === 0) {
      handleClearCanvas();
    } else {
      setShowClearModal(true);
    }
  };

  const handleClearCanvas = () => {
    strokesRef.current = [];
    redoStrokesRef.current = [];
    setStrokeCount(0);
    resetView();
    setShowClearModal(false);
    saveDraft();
  };

  // Link canvas drawing to selected note
  const handleLinkToNote = async () => {
    if (strokesRef.current.length === 0) {
      alert("Canvas is empty. Draw something first!");
      return;
    }
    if (!selectedNoteId) {
      alert("Please select a note to link this drawing to.");
      return;
    }

    setSaveStatus('Linking...');
    const drawingId = 'draw_' + Date.now();

    try {
      // 1. Save drawing in IndexedDB
      await db.saveDrawing(drawingId, strokesRef.current);

      // 2. Link in notes state
      const updatedNotes = notes.map(n => {
        if (n.id === selectedNoteId) {
          const drawIds = n.drawingIds || [];
          return {
            ...n,
            drawingIds: [...drawIds, drawingId],
            updatedAt: new Date().toISOString()
          };
        }
        return n;
      });

      setNotes(updatedNotes);
      localStorage.setItem('floatingNotes', JSON.stringify(updatedNotes));
      setLinkedNoteId(selectedNoteId);
      
      saveDraft();
      
      setSaveStatus('Linked Successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus('Linking Failed');
    }
  };

  // Find linked note name
  const linkedNote = notes.find(n => n.id === linkedNoteId);

  return (
    <div className={
      isFocusMode 
        ? "fixed inset-0 z-[100] w-screen h-screen bg-[#fbf9f5] dark:bg-[#1f1d1c] flex flex-col p-3 overflow-hidden select-none" 
        : "flex h-full md:h-[calc(100vh-140px)] gap-3 md:gap-6 relative"
    }>
      
      {/* BACKDROP OVERLAY ON MOBILE/TABLET (< lg) */}
      {!isFocusMode && mobileToolsOpen && (
        <div
          onClick={() => setMobileToolsOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* LEFT CANVAS CONTROLS - Hidden in Focus Mode; Drawer on mobile/tablet */}
      <div className={`fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] lg:static lg:w-80 flex flex-col rounded-2xl border p-4 overflow-y-auto transition-transform lg:transition-all duration-300 ${
        isFocusMode 
          ? 'hidden' 
          : mobileToolsOpen 
            ? 'translate-x-0 shadow-2xl flex' 
            : '-translate-x-full lg:translate-x-0 lg:flex'
      } ${cardBg}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-bold text-sm uppercase tracking-wider ${textTitle} flex items-center gap-2`}>
            <Image size={16} className="text-terracotta" /> Ambient Canvas
          </h3>
          <button
            onClick={() => setMobileToolsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg border border-black/10 dark:border-white/10 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close tools"
          >
            <X size={16} />
          </button>
        </div>

        {/* 1. TOOLS GROUP */}
        <div className="space-y-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Tools</label>
          <div className="flex gap-2">
            {[
              { id: 'pen', label: 'Pen', icon: Pen },
              { id: 'eraser', label: 'Eraser', icon: Eraser }
            ].map(tool => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    setDrawingTool(tool.id);
                    needRedrawRef.current = true;
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    drawingTool === tool.id
                      ? isBlush ? 'bg-hot-pink border-hot-pink text-white shadow-sm' : 'bg-terracotta border-terracotta text-white shadow-sm'
                      : isDark ? 'bg-[#312f2c] border-transparent text-white hover:bg-[#3e3a37]' : 'bg-white border-gray-200 text-textCharcoal hover:bg-gray-50'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. BRUSH TYPE (Only visible when drawingTool is pen) */}
        {drawingTool === 'pen' && (
          <div className="space-y-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-4 animate-in fade-in duration-200">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Brush Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'normal', name: 'Normal', icon: '🖊️' },
                { id: 'pencil', name: 'Pencil', icon: '✏️' },
                { id: 'marker', name: 'Marker', icon: '🖍️' },
                { id: 'calligraphy', name: 'Calligraphy', icon: '✒️' },
                { id: 'spray', name: 'Spray', icon: '💨' },
                { id: 'blur', name: 'Soft Glow', icon: '✨' }
              ].map(brush => (
                <button
                  key={brush.id}
                  onClick={() => handleSelectBrush(brush.id)}
                  className={`py-2 px-1 text-xs rounded-xl border capitalize transition-all flex flex-col items-center justify-center gap-0.5 ${
                    brushType === brush.id
                      ? isBlush ? 'bg-hot-pink border-hot-pink text-white font-bold shadow-sm' : 'bg-sage border-sage text-white font-bold shadow-sm'
                      : isDark ? 'bg-[#312f2c] border-transparent text-white hover:bg-[#3e3a37]' : 'bg-[#fbf9f5] border-gray-200 text-textCharcoal hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm">{brush.icon}</span>
                  <span className="text-[10px] leading-tight">{brush.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. STROKE SETTINGS (Size & Opacity) */}
        <div className="space-y-3 mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Stroke</label>
          
          {/* Size slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className={textSub}>Size</span>
              <span className="text-terracotta">{penSize}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={penSize}
              onChange={(e) => setPenSize(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-terracotta"
            />
          </div>

          {/* Opacity slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className={textSub}>Opacity</span>
              <span className="text-sage">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-sage"
            />
          </div>

          {/* Collapsible Advanced section (Stabilizer) */}
          <div className="pt-2">
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className={`w-full flex justify-between items-center text-xs font-bold ${textSub} hover:text-terracotta transition-colors`}
            >
              <span>ADVANCED CONTROLS</span>
              {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {advancedOpen && (
              <div className="space-y-2 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800/50 animate-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span>Stroke Stabilizer</span>
                  <span className="text-terracotta capitalize">{stabilizer}</span>
                </div>
                <div className="flex gap-1.5">
                  {['off', 'low', 'medium', 'high'].map(level => (
                    <button
                      key={level}
                      onClick={() => setStabilizer(level)}
                      className={`flex-1 py-1 text-[10px] uppercase font-bold rounded-lg border transition-all ${
                        stabilizer === level
                          ? 'bg-terracotta border-terracotta text-white shadow-sm'
                          : isDark ? 'bg-[#312f2c] border-transparent text-white' : 'bg-white border-gray-200 text-textCharcoal'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. COLOR GROUP */}
        {drawingTool === 'pen' && (
          <div className="space-y-3 mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Color</label>
            
            {/* Quick Colors Grid */}
            <div className="flex flex-wrap gap-2">
              {quickColors.map(color => (
                <button
                  key={color}
                  onClick={() => setPenColor(color)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    penColor === color ? 'border-terracotta scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Custom Color Input */}
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={penColor}
                onChange={(e) => setPenColor(e.target.value)}
                className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
              />
              <input
                type="text"
                value={penColor}
                onChange={(e) => setPenColor(e.target.value)}
                className={`flex-1 px-2.5 py-1.5 text-xs font-mono border rounded-lg outline-none ${inputBg}`}
                placeholder="#000000"
              />
            </div>
          </div>
        )}

        {/* 5. CANVAS NAVIGATION & GRID */}
        <div className="space-y-3 mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Canvas</label>
          
          {/* Ambient Grid toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Ambient Grid</span>
            <button
              onClick={toggleGrid}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                canvasGrid
                  ? isBlush ? 'bg-hot-pink border-hot-pink text-white shadow-sm' : 'bg-sage border-sage text-white shadow-sm'
                  : isDark ? 'bg-[#312f2c] border-transparent text-white hover:bg-[#3e3a37]' : 'bg-white border-gray-200 text-textCharcoal hover:bg-gray-50'
              }`}
            >
              <Grid3x3 size={13} />
              <span>{canvasGrid ? 'Grid On' : 'Grid Off'}</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex gap-2 justify-between items-center text-xs">
            <span className="font-semibold text-gray-400">Zoom: {Math.round(canvasZoomState * 100)}%</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleZoomButtons(true)}
                className={`p-1.5 rounded-lg border hover:bg-gray-100 dark:hover:bg-[#3d3a37] ${textSub}`}
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => handleZoomButtons(false)}
                className={`p-1.5 rounded-lg border hover:bg-gray-100 dark:hover:bg-[#3d3a37] ${textSub}`}
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <button
                onClick={resetView}
                className={`p-1.5 rounded-lg border hover:bg-gray-100 dark:hover:bg-[#3d3a37] ${textSub}`}
                title="Reset View"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* 6. NOTE LINKING */}
        <div className="border-t pt-3 mt-auto space-y-3 border-gray-100 dark:border-gray-800">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Note Link</label>

          {/* Link status message */}
          {linkedNoteId ? (
            linkedNote ? (
              <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-sage/10 border border-sage/20 text-xs animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <span className="text-sage font-bold truncate">Linked: {linkedNote.title || 'Untitled Note'}</span>
                  <button 
                    onClick={() => {
                      setLinkedNoteId('');
                      saveDraft();
                    }}
                    className="text-[10px] text-red-400 hover:underline"
                  >
                    Unlink
                  </button>
                </div>

                {/* If the linked note has drawings, list them to load */}
                {linkedNote.drawingIds && linkedNote.drawingIds.length > 0 && (
                  <div className="border-t border-sage/20 pt-1.5 space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Drawings in Note ({linkedNote.drawingIds.length})
                    </span>
                    <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
                      {linkedNote.drawingIds.map((id, idx) => (
                        <div key={id} className="flex justify-between items-center p-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-[11px]">
                          <span>Drawing #{idx + 1}</span>
                          <button
                            onClick={async () => {
                              const d = await db.getDrawing(id);
                              if (d && d.strokes) {
                                strokesRef.current = d.strokes;
                                setStrokeCount(d.strokes.length);
                                needRedrawRef.current = true;
                                saveDraft();
                              }
                            }}
                            className="text-terracotta hover:underline font-bold"
                          >
                            Load
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleLinkToNote}
                  className="w-full mt-1 bg-terracotta hover:bg-[#be6e47] text-white py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  <Save size={12} />
                  <span>Save New Snapshot to Note</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs animate-in fade-in duration-200">
                <span className="text-red-400 font-semibold">Linked note no longer exists.</span>
                <button 
                  onClick={() => {
                    setLinkedNoteId('');
                    saveDraft();
                  }}
                  className="text-left text-[10px] text-gray-400 hover:text-white underline"
                >
                  Choose Another Note
                </button>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <select
                value={selectedNoteId}
                onChange={(e) => setSelectedNoteId(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${inputBg}`}
              >
                <option value="">Choose a note...</option>
                {notes.map(n => (
                  <option key={n.id} value={n.id}>{n.title || 'Untitled Note'}</option>
                ))}
              </select>

              <button
                onClick={handleLinkToNote}
                className="w-full bg-terracotta hover:bg-[#be6e47] text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Save size={13} />
                <span>Save & Link Note</span>
              </button>
            </div>
          )}
          
          {saveStatus && (
            <p className="text-center text-[10px] font-bold text-sage italic">{saveStatus}</p>
          )}
        </div>
      </div>

      {/* RIGHT DISPLAY PANEL (THE CANVAS SCREEN) */}
      <div className={`flex-1 flex flex-col justify-between transition-all duration-300 ${
        isFocusMode 
          ? 'h-full w-full p-2.5 rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden' 
          : `rounded-2xl border p-3 ${cardBg}`
      }`}>
        
        {/* Canvas Toolbar Header */}
        <div className="flex flex-wrap justify-between items-center px-1.5 pb-2 border-b border-gray-100 dark:border-gray-800 mb-2 shrink-0 text-xs gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Mobile Tools Drawer Button (< lg) */}
            {!isFocusMode && (
              <button
                onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
                className={`lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                  mobileToolsOpen 
                    ? (isBlush ? 'bg-hot-pink text-white border-hot-pink' : 'bg-terracotta text-white border-terracotta')
                    : `hover:bg-gray-100 dark:hover:bg-[#3d3a37] ${textSub}`
                }`}
                title="Toggle drawing tools"
              >
                <Pen size={12} />
                <span>Tools</span>
              </button>
            )}

            <span className={`hidden sm:inline ${textSub}`}>
              Hold <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono font-bold text-[10px]">Space</kbd> or <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono font-bold text-[10px]">Shift</kbd> to pan |
            </span>
            <span className={`text-[11px] font-semibold opacity-75`}>Strokes: {strokeCount}</span>
            <div className="flex items-center gap-1 border-l pl-2 border-gray-100 dark:border-gray-800">
              <button
                onClick={handleUndo}
                disabled={strokeCount === 0}
                className={`p-1.5 rounded-lg border hover:bg-gray-100 dark:hover:bg-[#3d3a37] disabled:opacity-30 ${textSub}`}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={13} />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStrokesRef.current.length === 0}
                className={`p-1.5 rounded-lg border hover:bg-gray-100 dark:hover:bg-[#3d3a37] disabled:opacity-30 ${textSub}`}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 size={13} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Focus Canvas Button */}
            <button
              onClick={toggleFocusMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                isFocusMode
                  ? 'bg-terracotta text-white border-terracotta shadow-md hover:bg-[#a04e36]'
                  : `hover:bg-gray-100 dark:hover:bg-[#3d3a37] ${textSub}`
              }`}
              title="Toggle Fullscreen Focus Canvas (Esc)"
            >
              {isFocusMode ? (
                <>
                  <Minimize2 size={14} />
                  <span>Exit Focus (Esc)</span>
                </>
              ) : (
                <>
                  <Maximize2 size={14} />
                  <span>Focus Canvas</span>
                </>
              )}
            </button>

            <button
              onClick={triggerClearCanvas}
              className={`text-red-400 hover:text-red-500 text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/10 transition-colors`}
            >
              <Trash2 size={13} /> Clear Canvas
            </button>
          </div>
        </div>

        {/* Canvas container box */}
        <div className="flex-1 overflow-hidden relative rounded-xl border border-gray-200 dark:border-[#3d3a37] bg-[#fbf9f5] dark:bg-[#1f1d1c]">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
            style={{ touchAction: 'none' }}
          />

          {/* FOCUS MODE FLOATING COMPACT OVERLAY */}
          {isFocusMode && (
            <div className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 p-3 rounded-2xl border flex items-center gap-4 shadow-xl z-20 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300 ${
              isDark ? 'bg-[#292725]/85 border-[#44413e]/70' : 'bg-white/85 border-gray-200/70'
            }`}>
              
              {/* Tool Toggle */}
              <div className="flex gap-1 border-r pr-3 border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => {
                    setDrawingTool('pen');
                    needRedrawRef.current = true;
                  }}
                  className={`p-1.5 rounded-lg border ${
                    drawingTool === 'pen' ? (isBlush ? 'bg-hot-pink text-white border-hot-pink' : 'bg-terracotta text-white border-terracotta') : isDark ? 'text-white border-transparent' : 'text-textCharcoal border-transparent'
                  }`}
                  title="Pen"
                >
                  <Pen size={14} />
                </button>
                <button
                  onClick={() => {
                    setDrawingTool('eraser');
                    needRedrawRef.current = true;
                  }}
                  className={`p-1.5 rounded-lg border ${
                    drawingTool === 'eraser' ? (isBlush ? 'bg-hot-pink text-white border-hot-pink' : 'bg-terracotta text-white border-terracotta') : isDark ? 'text-white border-transparent' : 'text-textCharcoal border-transparent'
                  }`}
                  title="Eraser"
                >
                  <Eraser size={14} />
                </button>
              </div>

              {/* Compact Brush Selector (if Pen) */}
              {drawingTool === 'pen' && (
                <div className="flex gap-1 border-r pr-3 border-gray-100 dark:border-gray-800">
                  {[
                    { id: 'normal', name: 'Normal', icon: '🖊️' },
                    { id: 'pencil', name: 'Pencil', icon: '✏️' },
                    { id: 'marker', name: 'Marker', icon: '🖍️' },
                    { id: 'calligraphy', name: 'Callig', icon: '✒️' },
                    { id: 'spray', name: 'Spray', icon: '💨' },
                    { id: 'blur', name: 'Glow', icon: '✨' }
                  ].map(b => (
                    <button
                      key={b.id}
                      onClick={() => handleSelectBrush(b.id)}
                      className={`px-2 py-1 text-[10px] rounded-lg border capitalize font-semibold transition-all flex items-center gap-1 ${
                        brushType === b.id ? (isBlush ? 'bg-hot-pink border-hot-pink text-white shadow-sm' : 'bg-sage border-sage text-white shadow-sm') : isDark ? 'text-white border-transparent hover:bg-white/10' : 'text-textCharcoal border-transparent hover:bg-black/5'
                      }`}
                    >
                      <span>{b.icon}</span>
                      <span>{b.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Color Grid (if Pen) */}
              {drawingTool === 'pen' && (
                <div className="flex gap-1 border-r pr-3 border-gray-100 dark:border-gray-800">
                  {quickColors.slice(0, 4).map(c => (
                    <button
                      key={c}
                      onClick={() => setPenColor(c)}
                      className={`w-5 h-5 rounded-full border border-transparent transition-transform hover:scale-110 ${
                        penColor === c ? 'scale-110 ring-2 ring-terracotta' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}

              {/* Size Slider */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400">Size</span>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={penSize}
                  onChange={(e) => setPenSize(parseInt(e.target.value))}
                  className="w-20 h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-terracotta"
                />
              </div>

              {/* Grid Toggle */}
              <button
                onClick={toggleGrid}
                className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                  canvasGrid
                    ? isBlush ? 'bg-hot-pink border-hot-pink text-white shadow-sm' : 'bg-sage border-sage text-white shadow-sm'
                    : isDark ? 'text-white border-transparent hover:bg-white/10' : 'text-textCharcoal border-transparent hover:bg-black/5'
                }`}
                title="Toggle Ambient Grid"
              >
                <Grid3x3 size={14} />
              </button>

              {/* Exit Button */}
              <button
                onClick={toggleFocusMode}
                className="bg-red-500 hover:bg-red-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-colors"
                title="Exit Focus Mode (Esc)"
              >
                <Minimize2 size={13} />
                <span>Exit</span>
              </button>

            </div>
          )}

        </div>
      </div>

      {/* CLEAR CANVAS CONFIRMATION MODAL */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-[#292725] border-[#44413e]' : 'bg-white border-gray-200'
          }`}>
            <h4 className={`font-bold text-base mb-2 ${textTitle}`}>Clear Canvas?</h4>
            <p className={`text-sm mb-4 leading-relaxed ${isDark ? 'text-gray-300' : 'text-textCharcoal'}`}>
              Are you sure you want to clear the entire canvas? This will remove all your current drawings.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowClearModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isDark ? 'bg-[#3d3a37] text-gray-300 hover:bg-[#484542]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleClearCanvas}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
