import React, { useState, useEffect, useRef } from 'react';
import { 
  Pin, Star, Trash2, CheckCircle, Circle, Archive, 
  Search, Plus, ChevronDown, Check, X, FileText, Image, Mic, Clock, ShieldAlert,
  Sparkles, Wand2, Bot, Send, Copy, ArrowRight, ArrowLeft, RefreshCw, Layers, CheckSquare, 
  Globe, AlignLeft, Lightbulb, Zap, SplitSquareVertical, Eye, Edit3, Columns,
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered,
  Code, Quote, Table, Minus, Link2, CheckSquare as TaskIcon, Highlighter,
  Download, Printer, FileDown
} from 'lucide-react';
import { db } from '../utils/db';
import { 
  exportNoteAsMarkdown, 
  exportNoteAsText, 
  exportNoteAsHtml, 
  exportNoteAsJson, 
  exportNoteAsImage,
  printNoteOrPdf 
} from '../utils/export';
import { 
  aiSummarizeNote, aiPolishNote, aiExtractActionItems, 
  aiBrainstormIdeas, aiSuggestTitleAndCategory, aiTranslateNote, 
  callOpenRouterAI, getAIConfig 
} from '../utils/ai';
import MarkdownRenderer from './MarkdownRenderer';
import AudioPlayerItem from './AudioPlayerItem';

// Canvas renderer for drawing preview and thumbnails with bounding box auto-fit
function DrawingCanvasPreview({ strokes, className = "", onCanvasReady }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    if (!strokes || !Array.isArray(strokes) || strokes.length === 0) {
      canvas.width = 200 * dpr;
      canvas.height = 150 * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#f8f6f0';
      ctx.fillRect(0, 0, 200, 150);
      ctx.fillStyle = '#999999';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Empty Drawing', 100, 75);
      return;
    }

    // Compute bounding box of all strokes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let validPointsCount = 0;

    strokes.forEach(s => {
      if (s && Array.isArray(s.points)) {
        s.points.forEach(pt => {
          if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
            minX = Math.min(minX, pt.x);
            minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x);
            maxY = Math.max(maxY, pt.y);
            validPointsCount++;
          }
        });
      }
    });

    if (validPointsCount === 0 || !isFinite(minX)) {
      minX = 0; minY = 0; maxX = 300; maxY = 200;
    }

    const margin = 24;
    const rawW = Math.max(10, maxX - minX);
    const rawH = Math.max(10, maxY - minY);
    const totalW = rawW + margin * 2;
    const totalH = rawH + margin * 2;

    canvas.width = Math.ceil(totalW * dpr);
    canvas.height = Math.ceil(totalH * dpr);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalW, totalH);

    ctx.save();
    ctx.translate(-minX + margin, -minY + margin);

    const drawBezier = (pts) => {
      if (!pts || pts.length === 0) return;
      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, Math.max(0.5, (ctx.lineWidth || 2) / 2), 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 2) {
        ctx.lineTo(pts[1].x, pts[1].y);
      } else {
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      }
      ctx.stroke();
    };

    strokes.forEach(stroke => {
      if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) return;
      ctx.save();
      ctx.strokeStyle = stroke.color || '#d27d56';
      ctx.fillStyle = stroke.color || '#d27d56';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.width || 4;
      ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 1.0;

      if (stroke.type === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        drawBezier(stroke.points);
      } else if (stroke.type === 'pencil') {
        ctx.lineWidth = Math.max(1, (stroke.width || 4) * 0.9);
        ctx.globalAlpha = 0.75 * (stroke.opacity || 1);
        drawBezier(stroke.points);
        if (stroke.points.length > 1) {
          ctx.lineWidth = Math.max(0.8, (stroke.width || 4) * 0.5);
          ctx.globalAlpha = 0.35 * (stroke.opacity || 1);
          const offsetPts = stroke.points.map((pt, i) => ({
            x: pt.x + (i % 2 === 0 ? 0.6 : -0.6),
            y: pt.y + (i % 2 === 0 ? -0.4 : 0.4)
          }));
          drawBezier(offsetPts);
        }
      } else if (stroke.type === 'marker') {
        ctx.lineWidth = Math.max(6, (stroke.width || 4) * 2.2);
        ctx.lineCap = 'square';
        ctx.lineJoin = 'bevel';
        ctx.globalAlpha = 0.5 * (stroke.opacity || 1);
        drawBezier(stroke.points);
      } else if (stroke.type === 'calligraphy') {
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
        ctx.globalAlpha = 0.9 * (stroke.opacity || 1);
        if (stroke.points.length === 1) {
          ctx.beginPath();
          ctx.arc(stroke.points[0].x, stroke.points[0].y, Math.max(1, (stroke.width || 4) / 2), 0, Math.PI * 2);
          ctx.fill();
        } else {
          const angle = Math.PI / 4;
          const halfW = Math.max(2, ((stroke.width || 4) * 1.6) / 2);
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
        ctx.fillStyle = stroke.color || '#d27d56';
        ctx.globalAlpha = 0.75 * (stroke.opacity || 1);
        ctx.beginPath();
        stroke.points.forEach(pt => {
          if (pt.particles && pt.particles.length > 0) {
            pt.particles.forEach(p => {
              const pRadius = (p.size || 1.4) / 2;
              ctx.moveTo(pt.x + p.dx + pRadius, pt.y + p.dy);
              ctx.arc(pt.x + p.dx, pt.y + p.dy, pRadius, 0, Math.PI * 2);
            });
          } else {
            const r = Math.max(1, (stroke.width || 4) / 3);
            ctx.moveTo(pt.x + r, pt.y);
            ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          }
        });
        ctx.fill();
      } else if (stroke.type === 'blur' || stroke.type === 'glow') {
        ctx.lineWidth = (stroke.width || 4) * 2.4;
        ctx.globalAlpha = 0.2 * (stroke.opacity || 1);
        ctx.shadowColor = stroke.color || '#d27d56';
        ctx.shadowBlur = (stroke.width || 4) * 1.5;
        drawBezier(stroke.points);
        ctx.lineWidth = stroke.width || 4;
        ctx.globalAlpha = 0.75 * (stroke.opacity || 1);
        ctx.shadowBlur = 0;
        drawBezier(stroke.points);
      } else {
        drawBezier(stroke.points);
      }
      ctx.restore();
    });

    ctx.restore();

    // Solid clean background behind drawing
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (onCanvasReady) {
      onCanvasReady(canvas);
    }
  }, [strokes]);

  return <canvas ref={canvasRef} className={className} />;
}

export default function NotesSection({ 
  notes, 
  setNotes, 
  currentNoteId, 
  setCurrentNoteId, 
  onSaveNote, 
  darkMode, 
  activeTheme,
  setActiveTab
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('updated'); // updated, created, oldest, alpha
  const [showDeleteModal, setShowDeleteModal] = useState(null); // noteId to delete
  const [saveStatus, setSaveStatus] = useState('Saved'); // Saved, Saving, draft...
  const [allDrawings, setAllDrawings] = useState([]);
  const [allAudios, setAllAudios] = useState([]);
  const [previewDrawing, setPreviewDrawing] = useState(null); // drawing to view in modal

  // Editor View Mode: 'split' (side-by-side live preview), 'edit' (full editor), 'preview' (full markdown preview)
  const [editorMode, setEditorMode] = useState('split');

  // Mobile View state: 'list' (notes browser) or 'editor' (active note editor)
  const [mobileView, setMobileView] = useState(currentNoteId ? 'editor' : 'list');

  useEffect(() => {
    if (currentNoteId) {
      setMobileView('editor');
    }
  }, [currentNoteId]);

  // AI State
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [showSideCopilot, setShowSideCopilot] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingAction, setAiLoadingAction] = useState('');
  const [aiResultModal, setAiResultModal] = useState(null); // { title, content, type }
  const [copiedResult, setCopiedResult] = useState(false);
  const [showTranslatePicker, setShowTranslatePicker] = useState(false);
  const [showTonePicker, setShowTonePicker] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // In-line Copilot Chat State
  const [copilotMessages, setCopilotMessages] = useState([
    { role: 'assistant', content: 'Hi! I am your Nemotron 550B editor copilot. How can I assist with this note?' }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const copilotEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Filter categories
  const categories = ['All', 'Work', 'Personal', 'Study', 'Ideas', 'Completed'];

  // Load IndexedDB items to link/view attachments
  const loadAttachments = async () => {
    try {
      const draws = await db.getAllDrawings();
      const recs = await db.getAllAudios();
      setAllDrawings(draws);
      setAllAudios(recs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [currentNoteId, notes]);

  const activeNote = notes.find(n => n.id === currentNoteId) || null;

  // Debounce saving
  const saveTimeoutRef = useRef(null);

  const handleTextChange = (field, value) => {
    if (!activeNote) return;

    setSaveStatus('Saving...');

    // Update state immediately
    const updatedNotes = notes.map(n => {
      if (n.id === activeNote.id) {
        return {
          ...n,
          [field]: value,
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });
    setNotes(updatedNotes);

    // Save with debounce
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem('floatingNotes', JSON.stringify(updatedNotes));
      setSaveStatus('Saved');
      if (onSaveNote) onSaveNote('note_saved');
    }, 1000);
  };

  // Immediate save for quick toggles (pin, star, complete)
  const saveNotesImmediately = (updatedNotes) => {
    setNotes(updatedNotes);
    localStorage.setItem('floatingNotes', JSON.stringify(updatedNotes));
    setSaveStatus('Saved');
    if (onSaveNote) onSaveNote('note_saved');
  };

  const createNewNote = () => {
    const newNote = {
      id: 'note_' + Date.now(),
      title: 'Untitled Note',
      content: '',
      category: 'Work',
      pinned: false,
      starred: false,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      focusTime: 0, // minutes spent focusing on this note
      drawingIds: [],
      audioIds: []
    };
    const updated = [newNote, ...notes];
    saveNotesImmediately(updated);
    setCurrentNoteId(newNote.id);
    setMobileView('editor');
  };

  const togglePin = (id) => {
    const updated = notes.map(n => n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n);
    saveNotesImmediately(updated);
  };

  const toggleStar = (id) => {
    const updated = notes.map(n => n.id === id ? { ...n, starred: !n.starred, updatedAt: new Date().toISOString() } : n);
    saveNotesImmediately(updated);
  };

  const toggleCompleted = (id) => {
    const updated = notes.map(n => n.id === id ? { ...n, completed: !n.completed, updatedAt: new Date().toISOString() } : n);
    saveNotesImmediately(updated);
  };

  const handleDeleteClick = (id) => {
    setShowDeleteModal(id);
  };

  const confirmDelete = () => {
    if (showDeleteModal) {
      const updated = notes.filter(n => n.id !== showDeleteModal);
      saveNotesImmediately(updated);
      if (currentNoteId === showDeleteModal) {
        setCurrentNoteId(updated.length > 0 ? updated[0].id : null);
      }
      setShowDeleteModal(null);
    }
  };

  const updateCategory = (id, cat) => {
    const updated = notes.map(n => n.id === id ? { ...n, category: cat, updatedAt: new Date().toISOString() } : n);
    saveNotesImmediately(updated);
  };

  const unlinkAttachment = (noteId, type, itemId) => {
    const updated = notes.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          drawingIds: type === 'drawing' ? (n.drawingIds || []).filter(id => id !== itemId) : (n.drawingIds || []),
          audioIds: type === 'audio' ? (n.audioIds || []).filter(id => id !== itemId) : (n.audioIds || []),
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });
    saveNotesImmediately(updated);
  };

  // Helper to insert markdown syntax at cursor
  const insertMarkdown = (prefix, suffix = '', defaultText = '') => {
    if (!activeNote) return;
    const textarea = textareaRef.current;
    if (!textarea) {
      handleTextChange('content', `${activeNote.content || ''}\n${prefix}${defaultText}${suffix}`);
      return;
    }
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = activeNote.content || '';
    const selected = text.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    handleTextChange('content', newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 30);
  };

  // Interactive toggle checklist in note content directly from preview
  const handleToggleCheckboxInNote = (lineIndex, isChecked) => {
    if (!activeNote) return;
    const lines = (activeNote.content || '').split('\n');
    if (lineIndex < lines.length) {
      const line = lines[lineIndex];
      lines[lineIndex] = isChecked 
        ? line.replace(/^(\s*[-\*]\s+)\[\s*\]/, '$1[x]')
        : line.replace(/^(\s*[-\*]\s+)\[[xX]\]/, '$1[ ]');
      const newContent = lines.join('\n');
      handleTextChange('content', newContent);
    }
  };

  // --- AI HANDLERS ---
  const handleAiSummarize = async () => {
    if (!activeNote || !activeNote.content.trim()) return;
    setShowAiDropdown(false);
    setAiLoading(true);
    setAiLoadingAction('Summarizing Note with Nemotron 550B...');
    try {
      const res = await aiSummarizeNote(activeNote.content, activeNote.title);
      setAiResultModal({
        title: 'Executive AI Summary',
        content: res,
        type: 'summary'
      });
    } catch (err) {
      alert(`AI Error: ${err.message}`);
    } finally {
      setAiLoading(false);
      setAiLoadingAction('');
    }
  };

  const handleAiExtractTasks = async () => {
    if (!activeNote || !activeNote.content.trim()) return;
    setShowAiDropdown(false);
    setAiLoading(true);
    setAiLoadingAction('Extracting Action Items & Checklists...');
    try {
      const res = await aiExtractActionItems(activeNote.content, activeNote.title);
      setAiResultModal({
        title: 'Action Items & Checklist',
        content: res,
        type: 'tasks'
      });
    } catch (err) {
      alert(`AI Error: ${err.message}`);
    } finally {
      setAiLoading(false);
      setAiLoadingAction('');
    }
  };

  const handleAiBrainstorm = async () => {
    if (!activeNote) return;
    setShowAiDropdown(false);
    setAiLoading(true);
    setAiLoadingAction('Brainstorming Creative Angles...');
    try {
      const res = await aiBrainstormIdeas(activeNote.content, activeNote.title);
      setAiResultModal({
        title: 'AI Brainstorming & Angles',
        content: res,
        type: 'brainstorm'
      });
    } catch (err) {
      alert(`AI Error: ${err.message}`);
    } finally {
      setAiLoading(false);
      setAiLoadingAction('');
    }
  };

  const handleAiPolish = async (style = 'polish') => {
    if (!activeNote || !activeNote.content.trim()) return;
    setShowAiDropdown(false);
    setShowTonePicker(false);
    setAiLoading(true);
    setAiLoadingAction(`Polishing Note (${style})...`);
    try {
      const res = await aiPolishNote(activeNote.content, style);
      setAiResultModal({
        title: `Polished Note (${style.replace('_', ' ')})`,
        content: res,
        type: 'polish'
      });
    } catch (err) {
      alert(`AI Error: ${err.message}`);
    } finally {
      setAiLoading(false);
      setAiLoadingAction('');
    }
  };

  const handleAiAutoCategorize = async () => {
    if (!activeNote || !activeNote.content.trim()) return;
    setShowAiDropdown(false);
    setAiLoading(true);
    setAiLoadingAction('Generating Title & Category...');
    try {
      const res = await aiSuggestTitleAndCategory(activeNote.content);
      if (res && res.title) {
        const updated = notes.map(n => {
          if (n.id === activeNote.id) {
            return {
              ...n,
              title: res.title || n.title,
              category: res.category || n.category,
              updatedAt: new Date().toISOString()
            };
          }
          return n;
        });
        saveNotesImmediately(updated);
      }
    } catch (err) {
      alert(`AI Error: ${err.message}`);
    } finally {
      setAiLoading(false);
      setAiLoadingAction('');
    }
  };

  const handleAiTranslate = async (lang) => {
    if (!activeNote || !activeNote.content.trim()) return;
    setShowTranslatePicker(false);
    setShowAiDropdown(false);
    setAiLoading(true);
    setAiLoadingAction(`Translating into ${lang}...`);
    try {
      const res = await aiTranslateNote(activeNote.content, lang);
      setAiResultModal({
        title: `Translation (${lang})`,
        content: res,
        type: 'translation'
      });
    } catch (err) {
      alert(`AI Error: ${err.message}`);
    } finally {
      setAiLoading(false);
      setAiLoadingAction('');
    }
  };

  const handleApplyAiResult = (mode) => {
    if (!aiResultModal || !activeNote) return;

    if (mode === 'replace') {
      handleTextChange('content', aiResultModal.content);
    } else if (mode === 'append') {
      const newContent = activeNote.content ? `${activeNote.content}\n\n---\n### ${aiResultModal.title}\n${aiResultModal.content}` : aiResultModal.content;
      handleTextChange('content', newContent);
    } else if (mode === 'new') {
      const newNote = {
        id: 'note_' + Date.now(),
        title: `${aiResultModal.title}: ${activeNote.title || 'Untitled'}`,
        content: aiResultModal.content,
        category: activeNote.category || 'Ideas',
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
      saveNotesImmediately(updated);
      setCurrentNoteId(newNote.id);
    }

    setAiResultModal(null);
  };

  // In-line Copilot Send
  const handleSendCopilot = async (e) => {
    e?.preventDefault();
    if (!copilotInput.trim() || copilotLoading || !activeNote) return;

    const newMsgs = [...copilotMessages, { role: 'user', content: copilotInput.trim() }];
    setCopilotMessages(newMsgs);
    setCopilotInput('');
    setCopilotLoading(true);

    try {
      const systemPrompt = `You are a concise in-editor writing assistant for the user's active note.
Active Note Title: "${activeNote.title}"
Category: "${activeNote.category}"
Active Note Content:
"""
${activeNote.content || '(empty)'}
"""

Provide crisp, structured advice or generated content formatted in clean Markdown. When outputting text meant to be inserted into the note, make it ready to use.`;

      const response = await callOpenRouterAI({
        messages: newMsgs.slice(-8),
        systemPrompt
      });

      setCopilotMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
    } catch (err) {
      setCopilotMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${err.message}` }]);
    } finally {
      setCopilotLoading(false);
      setTimeout(() => {
        copilotEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Filter notes
  const filteredNotes = (notes || []).filter(note => {
    if (!note) return false;
    const title = (note.title || '').toLowerCase();
    const content = (note.content || '').toLowerCase();
    const query = (searchQuery || '').toLowerCase();
    const matchQuery = title.includes(query) || content.includes(query);
    
    if (selectedCategory === 'All') return matchQuery;
    if (selectedCategory === 'Completed') return note.completed && matchQuery;
    return note.category === selectedCategory && !note.completed && matchQuery;
  });

  // Sort notes
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (sortBy === 'updated') {
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    }
    if (sortBy === 'created') {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    }
    if (sortBy === 'alpha') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });

  // Split pinned and unpinned
  const pinnedNotes = sortedNotes.filter(n => n.pinned);
  const unpinnedNotes = sortedNotes.filter(n => !n.pinned);
  const finalDisplayNotes = [...pinnedNotes, ...unpinnedNotes];

  // Colors and styling based on active theme
  const isBlush = activeTheme === 'calm_light' || activeTheme === 'calm_dark';
  const isLiving = activeTheme === 'living_light' || activeTheme === 'living_dark';
  const isDark = activeTheme && activeTheme.includes('dark');

  const getNotesThemeClasses = () => {
    switch (activeTheme) {
      case 'calm_light':
        return {
          listContainer: 'bg-white/40 backdrop-blur-md border border-white/70 shadow-lg shadow-pink-100/50 rounded-[24px] font-nunito',
          searchBg: 'bg-white/80 border-2 border-pink-200 rounded-full text-[#4B0082] placeholder-[#6A4C93]/60 focus:ring-4 focus:ring-blush-pink/40 focus:border-hot-pink',
          searchIcon: 'text-hot-pink',
          catActive: 'bg-gradient-to-r from-hot-pink to-blush-pink text-white font-caveat text-base font-bold pink-glow',
          catInactive: 'bg-white/70 text-hot-pink border border-pink-200 font-caveat text-base font-bold hover:bg-white',
          cardActive: 'blob-card pink-glow border-2 border-hot-pink/70 bg-gradient-to-br from-white to-baby-pink/40 shadow-sm relative',
          cardInactive: 'blob-card blob-card-2 bg-white/70 border border-pink-200/70 hover:bg-white/95 hover:border-pink-300 shadow-sm relative',
          titleActive: 'text-hot-pink font-fredoka font-bold text-sm',
          titleInactive: 'text-plum-mauve font-fredoka font-bold text-sm',
          textBody: 'text-plum-mauve/80 text-xs font-nunito',
          tagPill: 'ribbon-tag-pink text-[11px] font-caveat font-bold',
          tagActive: 'text-rose-gold',
          editorContainer: 'page-frame-pink border-2 border-dashed border-[#D2B48C] bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg shadow-pink-100',
          titleInput: 'ghost-input w-full font-fredoka text-2xl font-bold text-hot-pink placeholder-hot-pink/40 pb-2',
          accentBtn: 'bg-gradient-to-r from-hot-pink to-blush-pink text-white rounded-full font-fredoka pink-glow hover:scale-105 transition-transform'
        };
      case 'calm_dark':
        return {
          listContainer: 'bg-[#2A1B29]/70 backdrop-blur-md border border-[#D9A6C4]/20 shadow-xl shadow-black/30 rounded-[24px] font-nunito',
          searchBg: 'bg-[#3C2740]/80 border-2 border-[#D9A6C4]/30 rounded-full text-[#E8D9E5] placeholder-[#B497AC] focus:ring-2 focus:ring-[#FF6FB0]/40 focus:border-[#FF6FB0]',
          searchIcon: 'text-[#FF6FB0]',
          catActive: 'bg-gradient-to-r from-[#FF6FB0] to-[#B026FF] text-white font-caveat text-base font-bold magenta-glow border border-[#FF6FB0]/50',
          catInactive: 'bg-[#5C3A57] text-[#FF6FB0] border border-[#D9A6C4]/30 font-caveat text-base font-bold hover:bg-[#3C2740]',
          cardActive: 'blob-card magenta-glow border-2 border-[#FF6FB0] bg-[#4A3350] shadow-md relative',
          cardInactive: 'blob-card blob-card-2 bg-[#3C2740]/80 border border-[#D9A6C4]/20 hover:bg-[#3C2740] shadow-sm relative',
          titleActive: 'text-[#FCE8F3] font-fredoka font-bold text-sm',
          titleInactive: 'text-[#FCE8F3] font-fredoka font-bold text-sm',
          textBody: 'text-[#E8D9E5]/80 text-xs font-nunito',
          tagPill: 'ribbon-tag-dark text-[11px] font-caveat font-bold',
          tagActive: 'text-[#FF6FB0]',
          editorContainer: 'page-frame-dark border-2 border-dashed border-[#D9A6C4] bg-[#3C2740]/80 backdrop-blur-sm rounded-[24px] shadow-xl shadow-black/40',
          titleInput: 'ghost-input-dark w-full font-fredoka text-2xl font-bold text-[#FCE8F3] placeholder-[#B497AC] pb-2',
          accentBtn: 'bg-gradient-to-r from-[#FF6FB0] to-[#B026FF] text-white rounded-full font-fredoka magenta-glow hover:scale-105 transition-transform border border-[#FF6FB0]/50'
        };
      case 'living_light':
        return {
          listContainer: 'bg-[#FBF3E7] border border-[#E5D5C5] shadow-panel rounded-2xl font-plus-jakarta',
          searchBg: 'bg-[#FFFBF5] border border-[#E5D5C5] rounded-lg text-[#5A4636] shadow-seal focus:border-[#4A2C1D] placeholder:text-[#5A4636]/50',
          searchIcon: 'text-[#B0764A]',
          catActive: 'bg-[#4A2C1D] text-white font-outfit text-xs font-bold uppercase rounded-md shadow-sm',
          catInactive: 'bg-[#FFFBF5] border border-[#E5D5C5] text-[#5A4636] font-outfit text-xs font-bold uppercase rounded-md shadow-seal hover:bg-[#B0764A]/10',
          cardActive: 'bg-[#FFFBF5] border-2 border-[#4A2C1D] p-4 rounded-xl shadow-card-cozy relative',
          cardInactive: 'bg-[#FFFBF5] border border-[#E5D5C5] p-4 rounded-xl shadow-card-cozy hover:border-[#B0764A] relative',
          titleActive: 'text-[#3B2418] font-lora font-bold text-sm',
          titleInactive: 'text-[#3B2418] font-lora font-bold text-sm',
          textBody: 'text-[#5A4636] text-xs font-plus-jakarta',
          tagPill: 'bg-[#B0764A]/15 text-[#3B2418] border border-[#B0764A]/25 px-2 py-0.5 rounded font-outfit font-bold text-[10px] uppercase shadow-seal',
          tagActive: 'text-[#3B2418]',
          editorContainer: 'bg-[#FFFBF5] border border-[#E5D5C5] rounded-2xl shadow-card-cozy p-6 font-plus-jakarta',
          titleInput: 'font-lora text-2xl font-bold text-[#3B2418] border-none outline-none pb-2 bg-transparent',
          accentBtn: 'bg-[#4A2C1D] text-white font-outfit font-semibold px-4 py-1.5 rounded border border-[#4A2C1D] hover:bg-[#3B2418] shadow-plush'
        };
      case 'living_dark':
      default:
        return {
          listContainer: 'bg-[#2A1D15] border border-[#4A362A] shadow-panel rounded-2xl font-plus-jakarta',
          searchBg: 'bg-[#3A2A1E] border border-[#4A362A] rounded-full text-[#F2E6D3] placeholder-[#A8927A] focus:border-[#C9975C]',
          searchIcon: 'text-[#A8927A]',
          catActive: 'bg-[#C9975C] text-[#2A1D15] font-outfit text-xs font-bold uppercase rounded-md shadow-sm',
          catInactive: 'bg-[#3A2A1E] border border-[#4A362A] text-[#D8B98A] font-outfit text-xs font-bold uppercase rounded-md shadow-seal hover:border-[#C9975C]',
          cardActive: 'bg-[#3A2A1E] border-2 border-[#C9975C] p-4 rounded-xl shadow-panel relative',
          cardInactive: 'bg-[#3A2A1E] border border-[#4A362A] p-4 rounded-xl shadow-panel hover:border-[#C9975C] relative',
          titleActive: 'text-[#F2E6D3] font-lora font-bold text-sm',
          titleInactive: 'text-[#F2E6D3] font-lora font-bold text-sm',
          textBody: 'text-[#D9C7AE] text-xs font-plus-jakarta',
          tagPill: 'bg-[#D8B98A]/20 text-[#D8B98A] border border-[#D8B98A]/30 px-2 py-0.5 rounded font-outfit font-bold text-[10px] uppercase shadow-seal',
          tagActive: 'text-[#D8B98A]',
          editorContainer: 'bg-[#2A1D15] border border-[#4A362A] rounded-2xl shadow-panel p-6 font-plus-jakarta',
          titleInput: 'font-lora text-2xl font-bold text-[#F2E6D3] border-none outline-none pb-2 bg-transparent',
          accentBtn: 'bg-[#C9975C] text-[#2A1D15] font-outfit font-bold px-4 py-1.5 rounded border border-[#C9975C] hover:opacity-90 shadow-md'
        };
    }
  };

  const ntc = getNotesThemeClasses();
  const textTitle = ntc.titleActive || (isDark ? 'text-[#eeebe6]' : 'text-[#3B2418]');
  const textSub = isBlush
    ? (activeTheme === 'calm_light' ? 'text-[#6A4C93]' : 'text-[#B497AC]')
    : (activeTheme === 'living_light' ? 'text-[#5A4636]' : 'text-[#D9C7AE]');
  const cardBg = ntc.editorContainer;
  const inputBg = ntc.searchBg;

  return (
    <div className="flex h-full md:h-[calc(100vh-140px)] gap-3 md:gap-5 relative">
      {/* LEFT LIST PANEL */}
      <div className={`${mobileView === 'editor' ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col p-3 md:p-4 shrink-0 overflow-hidden ${ntc.listContainer}`}>
        {/* Search */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder={isBlush ? "Search my diary..." : "Search entries..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 text-xs outline-none transition-all ${ntc.searchBg}`}
          />
          <Search size={15} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${ntc.searchIcon}`} />
        </div>

        {/* Categories Bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 whitespace-nowrap transition-all ${
                selectedCategory === cat ? ntc.catActive : ntc.catInactive
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Action Header in list */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className={`text-[11px] font-bold uppercase tracking-wider opacity-70`}>
            {finalDisplayNotes.length} {finalDisplayNotes.length === 1 ? 'Note' : 'Notes'}
          </span>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`text-xs py-1 px-2 rounded-lg border outline-none bg-transparent opacity-75`}
            >
              <option value="updated">Recent</option>
              <option value="created">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="alpha">A-Z</option>
            </select>
            <button
              onClick={createNewNote}
              className={`p-1.5 rounded-lg transition-transform hover:scale-105 shadow-sm text-white ${
                isBlush ? 'bg-hot-pink' : activeTheme === 'living_light' ? 'bg-[#4A2C1D]' : 'bg-[#C9975C] text-[#2A1D15]'
              }`}
              title="Create new note"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        {/* Notes Scrollable List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
          {finalDisplayNotes.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center p-4 opacity-50">
              <FileText size={28} className="mb-2" />
              <p className="text-xs font-medium">No notes found</p>
            </div>
          ) : (
            finalDisplayNotes.map(note => {
              const isSelected = activeNote && activeNote.id === note.id;
              const hasDrawings = note.drawingIds && note.drawingIds.length > 0;
              const hasAudios = note.audioIds && note.audioIds.length > 0;

              return (
                <div
                  key={note.id}
                  onClick={() => {
                    setCurrentNoteId(note.id);
                    setMobileView('editor');
                  }}
                  className={`cursor-pointer select-none transition-all ${
                    isSelected ? ntc.cardActive : ntc.cardInactive
                  } ${note.completed ? 'opacity-50' : ''}`}
                >
                  {/* Washi tape on selected Blush card */}
                  {isBlush && isSelected && (
                    <div className={activeTheme === 'calm_light' ? 'washi-tape-pink' : 'washi-tape-dark'} />
                  )}

                  {/* Content Container - shifted right on Blush themes for oval padding safety */}
                  <div className={`w-full relative z-10 transition-all ${isBlush ? 'pl-3.5 pr-2.5 py-0.5' : ''}`}>
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <h4 className={`truncate flex-1 ${isSelected ? ntc.titleActive : ntc.titleInactive}`}>
                        {note.title || 'Untitled Note'}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        {note.pinned && (
                          <Pin
                            size={13}
                            className={isBlush ? 'text-hot-pink fill-hot-pink' : activeTheme === 'living_light' ? 'text-[#4A2C1D] fill-[#4A2C1D]' : 'text-[#C9975C] fill-[#C9975C]'}
                          />
                        )}
                        {note.starred && <Star size={13} className="text-amber-400 fill-amber-400" />}
                      </div>
                    </div>

                    <p className={`line-clamp-2 mb-2 ${ntc.textBody}`}>
                      {note.content || 'Empty note...'}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className={ntc.tagPill}>
                        {note.category}
                      </span>
                      <div className="flex items-center gap-1.5 opacity-60">
                        {hasDrawings && <Image size={11} />}
                        {hasAudios && <Mic size={11} />}
                        {note.focusTime > 0 && <Clock size={11} />}
                        <span className="text-[9px]">
                          {new Date(note.updatedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT EDITOR PANEL */}
      <div className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 overflow-hidden ${ntc.editorContainer}`}>
        {activeNote ? (
          <div className="flex-1 flex flex-col p-3 sm:p-5 overflow-hidden relative">
            {/* Editor Header / Toolbars */}
            <div className="flex flex-wrap items-center justify-between border-b pb-3.5 mb-3 gap-2 border-black/10 dark:border-white/10 relative z-30">
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                {/* Back to list button on mobile (< md) */}
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  title="Back to notes list"
                >
                  <ArrowLeft size={14} />
                  <span>Notes</span>
                </button>

                {/* Complete checkbox */}
                <button
                  onClick={() => toggleCompleted(activeNote.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    activeNote.completed 
                      ? 'text-sage hover:bg-sage/10' 
                      : `${textSub} hover:text-textCharcoal hover:bg-gray-100 dark:hover:bg-[#3d3a37]`
                  }`}
                  title={activeNote.completed ? "Mark incomplete" : "Mark as completed"}
                >
                  {activeNote.completed ? <CheckCircle size={18} className="stroke-sage fill-sage/20" /> : <Circle size={18} />}
                </button>

                {/* Category select */}
                <div className="relative">
                  <select
                    value={activeNote.category}
                    onChange={(e) => updateCategory(activeNote.id, e.target.value)}
                    className={`appearance-none pl-2.5 pr-7 py-1 rounded-lg border outline-none font-bold text-xs uppercase tracking-wider ${inputBg}`}
                  >
                    {categories.filter(c => c !== 'All' && c !== 'Completed').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>

                {/* View Mode Switcher: Edit / Split / Preview */}
                <div className={`flex items-center p-0.5 rounded-lg border ${isDark ? 'bg-[#22201e] border-[#383532]' : 'bg-[#f2ece1] border-[#e2dacb]'}`}>
                  <button
                    onClick={() => setEditorMode('edit')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                      editorMode === 'edit'
                        ? 'bg-terracotta text-white shadow-xs'
                        : `${textSub} hover:text-inherit`
                    }`}
                    title="Edit Only (Focus Mode)"
                  >
                    <Edit3 size={12} />
                    <span className="hidden sm:inline">Write</span>
                  </button>
                  <button
                    onClick={() => setEditorMode('split')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                      editorMode === 'split'
                        ? 'bg-terracotta text-white shadow-xs'
                        : `${textSub} hover:text-inherit`
                    }`}
                    title="Split Live Preview Mode"
                  >
                    <Columns size={12} />
                    <span className="hidden sm:inline">Split Live</span>
                  </button>
                  <button
                    onClick={() => setEditorMode('preview')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                      editorMode === 'preview'
                        ? 'bg-terracotta text-white shadow-xs'
                        : `${textSub} hover:text-inherit`
                    }`}
                    title="Rendered Markdown Preview"
                  >
                    <Eye size={12} />
                    <span className="hidden sm:inline">Preview</span>
                  </button>
                </div>

                {/* AI MAGIC TOOLS BUTTON */}
                <div className="relative">
                  <button
                    onClick={() => setShowAiDropdown(!showAiDropdown)}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-terracotta to-[#e28a63] hover:from-[#c26e47] hover:to-terracotta text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm shadow-terracotta/20 disabled:opacity-50"
                    title="AI Magic Tools (Nemotron 550B)"
                  >
                    {aiLoading ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    <span>AI Magic</span>
                    <ChevronDown size={11} />
                  </button>

                  {/* AI Dropdown Menu */}
                  {showAiDropdown && (
                    <div className={`absolute left-0 mt-2 w-56 rounded-2xl border shadow-xl py-2 z-40 animate-in fade-in zoom-in-95 duration-150 ${
                      isDark ? 'bg-[#292725] border-[#44413e] text-gray-200' : 'bg-white border-gray-200 text-textCharcoal'
                    }`}>
                      <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-terracotta flex items-center justify-between">
                        <span>AI Nemotron Tools</span>
                        <Zap size={11} />
                      </div>

                      <button
                        onClick={handleAiSummarize}
                        className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                      >
                        <FileText size={14} className="text-terracotta" />
                        <span>Executive Summary</span>
                      </button>

                      <button
                        onClick={handleAiExtractTasks}
                        className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                      >
                        <CheckSquare size={14} className="text-sage" />
                        <span>Extract Action Tasks</span>
                      </button>

                      <button
                        onClick={handleAiBrainstorm}
                        className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                      >
                        <Lightbulb size={14} className="text-softYellow" />
                        <span>Brainstorm Ideas & Angles</span>
                      </button>

                      <button
                        onClick={() => setShowTonePicker(!showTonePicker)}
                        className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Wand2 size={14} className="text-purple-400" />
                          <span>Polish & Rewrite Tone</span>
                        </div>
                        <ArrowRight size={12} className="opacity-50" />
                      </button>

                      {showTonePicker && (
                        <div className="pl-6 pr-2 py-1 space-y-1 bg-black/5 dark:bg-white/5">
                          {[
                            { id: 'polish', label: '✨ General Polish' },
                            { id: 'fix_grammar', label: '🔤 Fix Grammar & Typos' },
                            { id: 'professional', label: '💼 Professional Tone' },
                            { id: 'academic', label: '🎓 Academic Style' },
                            { id: 'bullet_points', label: '📑 Convert to Bullets' },
                            { id: 'concise', label: '✂️ Make Concise' },
                            { id: 'expand', label: '📖 Elaborate & Expand' }
                          ].map(t => (
                            <button
                              key={t.id}
                              onClick={() => handleAiPolish(t.id)}
                              className="w-full text-left text-[11px] py-1 px-2 rounded hover:bg-terracotta hover:text-white transition-colors"
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={handleAiAutoCategorize}
                        className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                      >
                        <Zap size={14} className="text-amber-500" />
                        <span>Auto-Title & Categorize</span>
                      </button>

                      <button
                        onClick={() => setShowTranslatePicker(!showTranslatePicker)}
                        className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Globe size={14} className="text-blue-400" />
                          <span>Translate Note</span>
                        </div>
                        <ArrowRight size={12} className="opacity-50" />
                      </button>

                      {showTranslatePicker && (
                        <div className="pl-6 pr-2 py-1 space-y-1 bg-black/5 dark:bg-white/5">
                          {['Spanish', 'French', 'German', 'Japanese', 'Hindi', 'Chinese'].map(lang => (
                            <button
                              key={lang}
                              onClick={() => handleAiTranslate(lang)}
                              className="w-full text-left text-[11px] py-1 px-2 rounded hover:bg-terracotta hover:text-white transition-colors"
                            >
                              {lang}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Copilot Sidebar Toggle */}
                <button
                  onClick={() => setShowSideCopilot(!showSideCopilot)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    showSideCopilot 
                      ? 'bg-sage text-white border-sage shadow-sm' 
                      : `${inputBg} hover:border-sage`
                  }`}
                  title="Toggle In-Editor AI Copilot Drawer"
                >
                  <Bot size={13} />
                  <span>AI Copilot</span>
                </button>

                {/* Saved status indicator */}
                <span className={`text-[10px] italic font-semibold ${
                  saveStatus === 'Saving...' ? 'text-terracotta' : 'text-sage'
                }`}>
                  {saveStatus}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                {/* Export Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      showExportDropdown 
                        ? 'bg-terracotta text-white border-terracotta shadow-sm' 
                        : `hover:bg-gray-100 dark:hover:bg-[#3d3a37] ${textSub}`
                    }`}
                    title="Export Note (PDF, Image, HTML, MD, TXT, JSON)"
                  >
                    <Download size={14} />
                    <span>Export</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showExportDropdown && (
                    <>
                      {/* Invisible backdrop to dismiss on click outside */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowExportDropdown(false)} 
                      />

                      <div 
                        className={`absolute left-0 top-full mt-2 w-56 rounded-2xl shadow-2xl border p-1.5 z-50 animate-fadeIn origin-top-left ${
                          isDark ? 'bg-[#292725] border-[#44413e] text-[#eeebe6]' : 'bg-white border-[#e9e4db] text-textCharcoal'
                        }`}
                      >
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-terracotta">
                          Export Document
                        </div>

                        <button
                          onClick={() => {
                            setShowExportDropdown(false);
                            printNoteOrPdf(activeNote);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          <Printer size={15} className="text-terracotta shrink-0" />
                          <div>
                            <div className="font-semibold">Print / Save as PDF</div>
                            <div className="text-[10px] opacity-60">Formatted preview layout</div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setShowExportDropdown(false);
                            exportNoteAsImage(activeNote);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          <Image size={15} className="text-pink-500 shrink-0" />
                          <div>
                            <div className="font-semibold">Export as Image (.png)</div>
                            <div className="text-[10px] opacity-60">High-res PNG snapshot card</div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setShowExportDropdown(false);
                            exportNoteAsHtml(activeNote);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          <FileText size={15} className="text-blue-500 shrink-0" />
                          <div>
                            <div className="font-semibold">Export as HTML (.html)</div>
                            <div className="text-[10px] opacity-60">Rendered styled webpage</div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setShowExportDropdown(false);
                            exportNoteAsMarkdown(activeNote);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          <Code size={15} className="text-purple-500 shrink-0" />
                          <div>
                            <div className="font-semibold">Markdown (.md)</div>
                            <div className="text-[10px] opacity-60">Raw markdown file</div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setShowExportDropdown(false);
                            exportNoteAsText(activeNote);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          <FileDown size={15} className="text-emerald-500 shrink-0" />
                          <div>
                            <div className="font-semibold">Plain Text (.txt)</div>
                            <div className="text-[10px] opacity-60">Simple text document</div>
                          </div>
                        </button>

                        <div className="h-[1px] bg-current opacity-10 my-1" />

                        <button
                          onClick={() => {
                            setShowExportDropdown(false);
                            exportNoteAsJson(activeNote);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          <Layers size={15} className="text-amber-500 shrink-0" />
                          <div>
                            <div className="font-semibold">JSON Data (.json)</div>
                            <div className="text-[10px] opacity-60">Full metadata & properties</div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => togglePin(activeNote.id)}
                  className={`p-1.5 rounded-xl transition-all ${
                    activeNote.pinned 
                      ? 'bg-terracotta/10 text-terracotta' 
                      : `hover:bg-gray-100 dark:hover:bg-[#3d3a37] ${textSub}`
                  }`}
                  title={activeNote.pinned ? "Unpin note" : "Pin note to top"}
                >
                  <Pin size={16} className={activeNote.pinned ? "fill-terracotta" : ""} />
                </button>

                <button
                  onClick={() => toggleStar(activeNote.id)}
                  className={`p-1.5 rounded-xl transition-all ${
                    activeNote.starred 
                      ? 'bg-softYellow/10 text-softYellow' 
                      : `hover:bg-gray-100 dark:hover:bg-[#3d3a37] ${textSub}`
                  }`}
                  title={activeNote.starred ? "Remove bookmark" : "Add to bookmarks"}
                >
                  <Star size={16} className={activeNote.starred ? "fill-softYellow" : ""} />
                </button>

                <button
                  onClick={() => handleDeleteClick(activeNote.id)}
                  className={`p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-all`}
                  title="Delete note"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* FLOATING / DOCKED MARKDOWN FORMATTING TOOLBAR */}
            {editorMode !== 'preview' && (
              <div className={`mb-3 px-2 py-1.5 rounded-xl border flex items-center gap-1 overflow-x-auto no-scrollbar shadow-xs shrink-0 ${
                isDark ? 'bg-[#201e1c] border-[#363330]' : 'bg-[#faf7f2] border-[#e9e3d6]'
              }`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta px-1">MD:</span>

                <button
                  onClick={() => insertMarkdown('**', '**', 'bold text')}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                  title="Bold (**text**)"
                >
                  <Bold size={13} />
                </button>

                <button
                  onClick={() => insertMarkdown('*', '*', 'italic text')}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                  title="Italic (*text*)"
                >
                  <Italic size={13} />
                </button>

                <button
                  onClick={() => insertMarkdown('~~', '~~', 'strikethrough')}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                  title="Strikethrough (~~text~~)"
                >
                  <Strikethrough size={13} />
                </button>

                <button
                  onClick={() => insertMarkdown('==', '==', 'highlight')}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-amber-500"
                  title="Highlight (==text==)"
                >
                  <Highlighter size={13} />
                </button>

                <div className="w-[1px] h-3.5 bg-current opacity-20 mx-0.5" />

                <button
                  onClick={() => insertMarkdown('# ', '', 'Heading 1')}
                  className="px-1.5 py-0.5 text-[11px] font-bold rounded hover:bg-black/10 dark:hover:bg-white/10"
                  title="Heading 1 (# Heading)"
                >
                  H1
                </button>

                <button
                  onClick={() => insertMarkdown('## ', '', 'Heading 2')}
                  className="px-1.5 py-0.5 text-[11px] font-bold rounded hover:bg-black/10 dark:hover:bg-white/10"
                  title="Heading 2 (## Heading)"
                >
                  H2
                </button>

                <button
                  onClick={() => insertMarkdown('### ', '', 'Heading 3')}
                  className="px-1.5 py-0.5 text-[11px] font-bold rounded hover:bg-black/10 dark:hover:bg-white/10"
                  title="Heading 3 (### Heading)"
                >
                  H3
                </button>

                <div className="w-[1px] h-3.5 bg-current opacity-20 mx-0.5" />

                <button
                  onClick={() => insertMarkdown('- ', '', 'List item')}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                  title="Bullet List (- item)"
                >
                  <List size={13} />
                </button>

                <button
                  onClick={() => insertMarkdown('1. ', '', 'Numbered item')}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                  title="Numbered List (1. item)"
                >
                  <ListOrdered size={13} />
                </button>

                <button
                  onClick={() => insertMarkdown('- [ ] ', '', 'Task item')}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-sage"
                  title="Checklist Task (- [ ] task)"
                >
                  <TaskIcon size={13} />
                </button>

                <div className="w-[1px] h-3.5 bg-current opacity-20 mx-0.5" />

                <button
                  onClick={() => insertMarkdown('`', '`', 'code')}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 font-mono text-xs"
                  title="Inline Code (`code`)"
                >
                  <Code size={13} />
                </button>

                <button
                  onClick={() => insertMarkdown('```javascript\n', '\n```', '// code')}
                  className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded hover:bg-black/10 dark:hover:bg-white/10"
                  title="Code Block (```lang)"
                >
                  {'```'}
                </button>

                <button
                  onClick={() => insertMarkdown('> ', '', 'Quote')}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                  title="Blockquote (> quote)"
                >
                  <Quote size={13} />
                </button>

                <button
                  onClick={() => insertMarkdown('| Feature | Description |\n|---|---|\n| Item 1 | Details 1 |\n')}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                  title="Markdown Table"
                >
                  <Table size={13} />
                </button>

                <button
                  onClick={() => insertMarkdown('[', '](https://example.com)', 'Link title')}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-blue-400"
                  title="Link ([title](url))"
                >
                  <Link2 size={13} />
                </button>

                <button
                  onClick={() => insertMarkdown('\n---\n')}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                  title="Horizontal Rule (---)"
                >
                  <Minus size={13} />
                </button>
              </div>
            )}

            {/* AI Loading Banner */}
            {aiLoading && (
              <div className="mb-3 p-3 rounded-xl bg-terracotta/10 border border-terracotta/30 flex items-center justify-between text-xs animate-pulse text-terracotta">
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  <span className="font-semibold">{aiLoadingAction || 'AI Nemotron 550B Processing...'}</span>
                </div>
                <span className="text-[10px] font-mono">OpenRouter Powered</span>
              </div>
            )}

            {/* Note Fields & Modes */}
            <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
              <input
                type="text"
                value={activeNote.title || ''}
                placeholder="Note Title"
                onChange={(e) => handleTextChange('title', e.target.value)}
                className={ntc.titleInput}
              />

              {/* Main Content Areas based on editorMode */}
              <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-4 overflow-hidden">
                {/* 1. TEXTAREA (Visible in Edit and Split mode) */}
                {editorMode !== 'preview' && (
                  <div className={`flex-1 flex flex-col h-full overflow-hidden ${editorMode === 'split' ? 'border-b md:border-b-0 md:border-r border-black/10 dark:border-white/10 pb-2 md:pb-0 md:pr-3' : ''}`}>
                    <textarea
                      ref={textareaRef}
                      value={activeNote.content || ''}
                      placeholder="Start typing in Markdown... (e.g. # Heading, - [ ] Task, **bold**)..."
                      onChange={(e) => handleTextChange('content', e.target.value)}
                      className={`w-full h-full resize-none border-none outline-none bg-transparent text-sm leading-relaxed ${
                        isBlush ? 'font-nunito' : 'font-plus-jakarta'
                      } ${
                        isDark ? 'text-[#eeebe6]' : 'text-[#3B2418]'
                      }`}
                    />
                  </div>
                )}

                {/* 2. LIVE MARKDOWN PREVIEW (Visible in Split and Preview mode) */}
                {editorMode !== 'edit' && (
                  <div className="flex-1 h-full overflow-y-auto pr-1">
                    <div className={`mb-2 text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1 ${
                      isBlush ? (activeTheme === 'calm_light' ? 'text-hot-pink' : 'text-[#FF6FB0]') : (activeTheme === 'living_light' ? 'text-[#B0764A]' : 'text-[#C9975C]')
                    }`}>
                      <Sparkles size={11} /> Live Markdown Preview
                    </div>
                    <MarkdownRenderer 
                      content={activeNote.content} 
                      darkMode={isDark} 
                      onToggleCheckbox={handleToggleCheckboxInNote}
                    />
                  </div>
                )}
              </div>

              {/* Attachments & Integrations Panel */}
              <div className="border-t pt-3 mt-1 space-y-3 border-black/10 dark:border-white/10 shrink-0">
                {/* Focus sessions */}
                {activeNote.focusTime > 0 && (
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    isDark ? 'bg-[#312f2c] border-[#44413e]' : 'bg-[#f7f5ef] border-[#ece6d9]'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-terracotta" />
                      <span className="font-semibold">Focused Pomodoro Time</span>
                    </div>
                    <span className="font-bold text-terracotta">{activeNote.focusTime} mins focused</span>
                  </div>
                )}

                {/* Linked Drawings */}
                {activeNote.drawingIds && activeNote.drawingIds.length > 0 && (
                  <div className="space-y-1">
                    <h5 className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${textSub}`}>
                      <Image size={12} /> Linked Drawings ({activeNote.drawingIds.length})
                    </h5>
                    <div className="flex gap-2.5 flex-wrap">
                      {activeNote.drawingIds.map(drawId => {
                        const drawingObj = allDrawings.find(d => d.id === drawId);
                        
                        return (
                          <div 
                            key={drawId}
                            onClick={async () => {
                              if (drawingObj) {
                                setPreviewDrawing(drawingObj);
                              } else {
                                const fetched = await db.getDrawing(drawId);
                                if (fetched) setPreviewDrawing(fetched);
                              }
                            }}
                            className={`p-1.5 rounded-xl border relative group/draw flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-md ${
                              isDark ? 'bg-[#312f2c] border-[#44413e] hover:border-terracotta' : 'bg-[#fffdfa] border-[#e9e4db] hover:border-terracotta'
                            }`}
                            style={{ width: '110px' }}
                            title="Click to view / open drawing"
                          >
                            <div className="w-24 h-16 bg-white dark:bg-gray-900 rounded-lg overflow-hidden relative border border-black/5 dark:border-white/5 flex items-center justify-center">
                              {drawingObj ? (
                                <DrawingCanvasPreview strokes={drawingObj.strokes} className="w-full h-full object-contain" />
                              ) : (
                                <div className="text-[10px] text-gray-400 flex flex-col items-center justify-center gap-1">
                                  <Image size={14} className="text-terracotta" />
                                  <span>Load</span>
                                </div>
                              )}
                              
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/draw:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white">
                                <Eye size={13} />
                                <span className="text-[10px] font-bold">View</span>
                              </div>
                            </div>
                            
                            <div className="w-full flex items-center justify-between mt-1 px-1">
                              <span className="text-[9px] font-semibold truncate text-textCharcoal dark:text-gray-200">
                                {drawingObj?.strokes ? `${drawingObj.strokes.length} strokes` : 'Drawing'}
                              </span>
                              <span className="text-[8px] text-terracotta font-bold flex items-center gap-0.5">
                                <Eye size={8} /> Open
                              </span>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                unlinkAttachment(activeNote.id, 'drawing', drawId);
                              }}
                              className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover/draw:opacity-100 transition-opacity shadow-sm z-10"
                              title="Unlink drawing from note"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Linked Voice Recordings */}
                {activeNote.audioIds && activeNote.audioIds.length > 0 && (
                  <div className="space-y-1.5">
                    <h5 className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${textSub}`}>
                      <Mic size={12} /> Voice Recordings ({activeNote.audioIds.length})
                    </h5>
                    <div className="space-y-2">
                      {activeNote.audioIds.map(audId => {
                        const audioObj = allAudios.find(a => a.id === audId);
                        if (!audioObj) return null;

                        return (
                          <AudioPlayerItem
                            key={audId}
                            audio={audioObj}
                            onDelete={() => unlinkAttachment(activeNote.id, 'audio', audId)}
                            darkMode={isDark}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <FileText size={48} className={`mb-3 opacity-30 ${textSub}`} />
            <h3 className={`font-bold text-lg mb-1 ${textTitle}`}>No Note Selected</h3>
            <p className={`text-sm max-w-xs ${textSub}`}>
              Select an existing note from the list, or create a brand new one to get started.
            </p>
            <button
              onClick={createNewNote}
              className="mt-4 flex items-center gap-1.5 bg-terracotta hover:bg-[#be6e47] text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md"
            >
              <Plus size={16} /> Create Note
            </button>
          </div>
        )}

        {/* IN-LINE SIDE COPILOT DRAWER */}
        {showSideCopilot && activeNote && (
          <div className={`fixed inset-y-0 right-0 z-40 w-full sm:w-80 md:static border-l flex flex-col h-full shrink-0 shadow-2xl md:shadow-none ${
            isDark ? 'bg-[#22201e] border-[#383532]' : 'bg-[#fbf9f4] border-[#ece6d9]'
          }`}>
            <div className="p-3 border-b border-inherit flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-sage" />
                <span className="text-xs font-bold">In-Editor Copilot</span>
              </div>
              <button
                onClick={() => setShowSideCopilot(false)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>

            {/* Quick Copilot Chips */}
            <div className="p-2 border-b border-inherit flex gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCopilotInput('Can you organize this note into numbered sections with headings?')}
                className="text-[10px] px-2 py-1 rounded-lg border whitespace-nowrap opacity-80 hover:opacity-100 bg-black/5 dark:bg-white/5"
              >
                📑 Organize
              </button>
              <button
                onClick={() => setCopilotInput('What are the key questions or missing details in this note?')}
                className="text-[10px] px-2 py-1 rounded-lg border whitespace-nowrap opacity-80 hover:opacity-100 bg-black/5 dark:bg-white/5"
              >
                ❓ Find Gaps
              </button>
              <button
                onClick={() => setCopilotInput('Turn this note into a step-by-step action plan with checkboxes.')}
                className="text-[10px] px-2 py-1 rounded-lg border whitespace-nowrap opacity-80 hover:opacity-100 bg-black/5 dark:bg-white/5"
              >
                🎯 Plan
              </button>
            </div>

            {/* Copilot Messages with rich Markdown */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {copilotMessages.map((m, idx) => (
                <div key={idx} className={`text-xs p-2.5 rounded-xl ${
                  m.role === 'user' 
                    ? 'bg-terracotta text-white ml-4' 
                    : isDark ? 'bg-[#2e2c29] border border-[#44413e] mr-2 text-[#eeebe6]' : 'bg-[#eee9de] border border-[#e0dad0] mr-2 text-textCharcoal'
                }`}>
                  {m.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  ) : (
                    <MarkdownRenderer content={m.content} darkMode={isDark} />
                  )}

                  {m.role !== 'user' && idx > 0 && (
                    <div className="mt-2 pt-2 border-t border-inherit/30 flex gap-2 justify-end">
                      <button
                        onClick={() => navigator.clipboard.writeText(m.content)}
                        className="text-[10px] flex items-center gap-1 opacity-70 hover:opacity-100 font-semibold"
                      >
                        <Copy size={11} /> Copy
                      </button>
                      <button
                        onClick={() => {
                          const newContent = activeNote.content ? `${activeNote.content}\n\n${m.content}` : m.content;
                          handleTextChange('content', newContent);
                        }}
                        className="text-[10px] flex items-center gap-1 text-terracotta hover:underline font-bold"
                      >
                        <ArrowRight size={11} /> Insert to Note
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {copilotLoading && (
                <div className="flex items-center gap-2 text-xs opacity-60 p-2 italic">
                  <RefreshCw size={12} className="animate-spin text-terracotta" />
                  <span>Nemotron is thinking...</span>
                </div>
              )}
              <div ref={copilotEndRef} />
            </div>

            {/* Copilot Input */}
            <form onSubmit={handleSendCopilot} className="p-2 border-t border-inherit flex gap-2">
              <input
                type="text"
                placeholder="Ask about this note..."
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                className={`flex-1 px-3 py-1.5 text-xs rounded-xl outline-none border ${inputBg}`}
              />
              <button
                type="submit"
                disabled={copilotLoading || !copilotInput.trim()}
                className="p-2 bg-sage hover:bg-[#7b9087] text-white rounded-xl disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* AI RESULT PREVIEW & ACTION MODAL WITH DIRECT MARKDOWN RENDER */}
      {aiResultModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-[#292725] border-[#44413e] text-[#eeebe6]' : 'bg-[#fffdfa] border-[#e9e4db] text-textCharcoal'
          }`}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-inherit flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-terracotta/20 text-terracotta flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{aiResultModal.title}</h4>
                  <span className="text-[10px] text-terracotta font-mono font-bold">Nvidia Nemotron 550B Output • Rendered Preview</span>
                </div>
              </div>
              <button
                onClick={() => setAiResultModal(null)}
                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Rendered Preview */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed ${
                isDark ? 'bg-[#1f1d1b] border-[#383532]' : 'bg-[#faf8f4] border-[#e8e2d7]'
              }`}>
                <MarkdownRenderer content={aiResultModal.content} darkMode={isDark} />
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="px-6 py-4 border-t border-inherit flex flex-wrap items-center justify-between gap-3 bg-black/5 dark:bg-white/5">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(aiResultModal.content);
                  setCopiedResult(true);
                  setTimeout(() => setCopiedResult(false), 2000);
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5"
              >
                {copiedResult ? <Check size={14} className="text-sage" /> : <Copy size={14} />}
                <span>{copiedResult ? 'Copied' : 'Copy Markdown'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApplyAiResult('new')}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-sage hover:bg-[#7b9087] text-white transition-all shadow-sm flex items-center gap-1"
                >
                  <Plus size={14} /> Save as New Note
                </button>

                <button
                  onClick={() => handleApplyAiResult('append')}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-terracotta text-terracotta hover:bg-terracotta/10 transition-all flex items-center gap-1"
                >
                  <ArrowRight size={14} /> Append to Note
                </button>

                <button
                  onClick={() => handleApplyAiResult('replace')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-terracotta hover:bg-[#c26e47] text-white transition-all shadow-sm"
                >
                  Replace Note Content
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-[#292725] border-[#44413e]' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center gap-3 text-red-500 mb-3">
              <ShieldAlert size={36} className="shrink-0" />
              <div>
                <h4 className={`font-bold text-base ${textTitle}`}>Delete Note</h4>
                <p className={`text-xs ${textSub}`}>This action cannot be undone.</p>
              </div>
            </div>
            <p className={`text-sm mb-4 leading-relaxed ${isDark ? 'text-gray-300' : 'text-textCharcoal'}`}>
              Are you sure you want to delete this note? It will permanently remove it from your workspace.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteModal(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isDark ? 'bg-[#3d3a37] text-gray-300 hover:bg-[#484542]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LINKED DRAWING PREVIEW MODAL */}
      {previewDrawing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border p-4 sm:p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 ${
            isDark ? 'bg-[#252220] border-[#44413e] text-white' : 'bg-white border-gray-200 text-textCharcoal'
          }`}>
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-terracotta/15 text-terracotta">
                  <Image size={20} />
                </div>
                <div>
                  <h4 className={`font-bold text-base ${textTitle}`}>Linked Drawing</h4>
                  <p className={`text-xs ${textSub}`}>
                    {previewDrawing.updatedAt ? new Date(previewDrawing.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Saved sketch'} • {previewDrawing.strokes ? `${previewDrawing.strokes.length} strokes` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDrawing(null)}
                className={`p-1.5 rounded-lg border hover:bg-gray-100 dark:hover:bg-[#3d3a37] ${textSub}`}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawing Preview Screen */}
            <div className="w-full h-64 sm:h-80 bg-white dark:bg-[#1a1817] rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden flex items-center justify-center p-3 relative shadow-inner">
              <DrawingCanvasPreview strokes={previewDrawing.strokes} className="w-full h-full object-contain" />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-2 gap-2">
              <button
                onClick={() => {
                  unlinkAttachment(activeNote.id, 'drawing', previewDrawing.id);
                  setPreviewDrawing(null);
                }}
                className="text-xs text-red-400 hover:text-red-500 hover:underline flex items-center gap-1.5 font-semibold"
              >
                <Trash2 size={13} />
                <span>Unlink Drawing</span>
              </button>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                {/* Download PNG Button */}
                <button
                  onClick={() => {
                    const canvas = document.querySelector('.h-80 canvas');
                    if (canvas) {
                      const link = document.createElement('a');
                      link.download = `drawing-${previewDrawing.id}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isDark ? 'bg-[#3d3a37] text-gray-200 hover:bg-[#484542]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Download drawing as PNG image"
                >
                  <Download size={13} />
                  <span>Download Image</span>
                </button>

                {/* Open in Ambient Canvas Button */}
                <button
                  onClick={() => {
                    const draft = {
                      strokes: previewDrawing.strokes || [],
                      linkedNoteId: activeNote?.id || ''
                    };
                    localStorage.setItem('ambientCanvasDraft', JSON.stringify(draft));
                    setPreviewDrawing(null);
                    if (setActiveTab) {
                      setActiveTab('drawing');
                    }
                  }}
                  className="px-4 py-2 bg-terracotta hover:bg-[#be6e47] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                  title="Open and edit in Ambient Canvas"
                >
                  <Edit3 size={13} />
                  <span>Open in Canvas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
