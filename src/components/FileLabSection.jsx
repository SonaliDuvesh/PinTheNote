import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, File, Info, Sliders, Maximize2, Trash2, 
  Crop, Sparkles, RefreshCw, Layers, Check, Download, 
  RotateCw, RefreshCcw, Eye, ArrowRight, FileText, ScanText,
  Copy, Plus, CheckCircle, Zap, ShieldCheck, HelpCircle, X
} from 'lucide-react';
import { db } from '../utils/db';
import { extractDocumentText } from '../utils/ocr';
import { aiSynthesizeDocumentNote } from '../utils/ai';
import MarkdownRenderer from './MarkdownRenderer';

export default function FileLabSection({ 
  notes = [], 
  setNotes = null, 
  currentNoteId = null, 
  setCurrentNoteId = null, 
  setActiveTab = null, 
  onCelebration = null, 
  addToast = null,
  darkMode = false, 
  activeTheme = 'calm_light' 
}) {
  const [file, setFile] = useState(null); // File object
  const [fileMetadata, setFileMetadata] = useState(null);
  const [activeTool, setActiveTool] = useState('ocr'); // ocr, compress, enhance, objects, bg, crop_resize
  
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

  // Processing States
  const [originalImageUrl, setOriginalImageUrl] = useState('');
  const [processedImageUrl, setProcessedImageUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [compareSplit, setCompareSplit] = useState(50); // percentage slider

  // OCR & AI Synthesis States
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ status: '', progress: 0 });
  const [ocrRawText, setOcrRawText] = useState('');
  const [aiSynthesizedNote, setAiSynthesizedNote] = useState('');
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrModalTab, setOcrModalTab] = useState('summary'); // 'summary' or 'raw'
  const [copiedOcr, setCopiedOcr] = useState(false);

  // Compression state
  const [compMode, setCompMode] = useState('balanced'); // lossless, balanced, maximum
  const [compQuality, setCompQuality] = useState(70);
  const [targetSizeVal, setTargetSizeVal] = useState('');
  const [targetSizeUnit, setTargetSizeUnit] = useState('KB');
  const [sizeIncreaseVal, setSizeIncreaseVal] = useState('');
  const [sizeIncreaseUnit, setSizeIncreaseUnit] = useState('KB');

  // Crop & Resize states
  const [cropAspect, setCropAspect] = useState('free'); // free, 1:1, 16:9, 4:3
  const [rotateDeg, setRotateDeg] = useState(0);
  const [resizeWidth, setResizeWidth] = useState('');
  const [resizeHeight, setResizeHeight] = useState('');
  const [lockAspect, setLockAspect] = useState(true);

  // Background removal state
  const [bgType, setBgType] = useState('transparent'); // transparent, white, black, custom_color
  const [bgCustomColor, setBgCustomColor] = useState('#ebc885');

  // Object removal mask canvas state
  const maskCanvasRef = useRef(null);
  const [isDrawingMask, setIsDrawingMask] = useState(false);
  const [brushSize, setBrushSize] = useState(15);
  const [maskHistory, setMaskHistory] = useState([]); // for undo

  // File Loader & Metadata Reader
  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      loadFile(uploadedFile);
    }
  };

  const loadFile = (uploadedFile) => {
    setFile(uploadedFile);
    setOriginalImageUrl(URL.createObjectURL(uploadedFile));
    setProcessedImageUrl('');
    setOcrRawText('');
    setAiSynthesizedNote('');
    
    const meta = {
      name: uploadedFile.name,
      size: formatBytes(uploadedFile.size),
      rawSize: uploadedFile.size,
      type: uploadedFile.type || 'Unknown'
    };

    // If PDF or Doc, default to OCR tool
    if (
      uploadedFile.type === 'application/pdf' || 
      uploadedFile.type.startsWith('text/') || 
      /\.(pdf|txt|md|csv|json)$/i.test(uploadedFile.name)
    ) {
      setActiveTool('ocr');
    } else if (uploadedFile.type.startsWith('image/')) {
      setActiveTool('ocr');
    }

    // Image details
    if (uploadedFile.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        meta.dimensions = `${img.width} x ${img.height} px`;
        meta.width = img.width;
        meta.height = img.height;
        setResizeWidth(img.width);
        setResizeHeight(img.height);
        setFileMetadata({ ...meta });
      };
      img.src = URL.createObjectURL(uploadedFile);
    } 
    // Audio/Video details
    else if (uploadedFile.type.startsWith('audio/') || uploadedFile.type.startsWith('video/')) {
      const media = document.createElement(uploadedFile.type.startsWith('audio/') ? 'audio' : 'video');
      media.src = URL.createObjectURL(uploadedFile);
      media.onloadedmetadata = () => {
        const mins = Math.floor(media.duration / 60);
        const secs = Math.floor(media.duration % 60);
        meta.duration = `${mins}:${secs.toString().padStart(2, '0')}`;
        setFileMetadata({ ...meta });
      };
    }
    // PDF details
    else if (uploadedFile.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result;
        const pageCount = (content.match(/\/Type\s*\/Page\b/g) || []).length;
        meta.pages = pageCount > 0 ? pageCount : '1+';
        setFileMetadata({ ...meta });
      };
      reader.readAsText(uploadedFile);
    } else {
      setFileMetadata(meta);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const uploadedFile = e.dataTransfer.files[0];
    if (uploadedFile) {
      loadFile(uploadedFile);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setFileMetadata(null);
    setOriginalImageUrl('');
    setProcessedImageUrl('');
    setOcrRawText('');
    setAiSynthesizedNote('');
    setShowOcrModal(false);
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // --- OCR & OPENROUTER AI NOTE SYNTHESIS ---
  const handleRunOcrAndAiSynthesis = async () => {
    if (!file) return;

    setOcrLoading(true);
    setOcrProgress({ status: 'Starting Neural OCR engine...', progress: 15 });

    try {
      // Step 1: Extract text via Tesseract OCR or PDF Text Parser
      const extraction = await extractDocumentText(file, (p) => {
        setOcrProgress({
          status: p.status || 'Extracting text...',
          progress: Math.min(85, Math.max(20, p.progress || 30))
        });
      });

      const extracted = extraction.text || '';
      setOcrRawText(extracted);

      if (!extracted.trim()) {
        throw new Error('No readable text or characters could be recognized in this file.');
      }

      // Step 2: OpenRouter AI Synthesis (Nemotron 550B)
      setOcrProgress({ status: 'Nvidia Nemotron 550B synthesizing clean Markdown note...', progress: 90 });

      const cleanNoteMarkdown = await aiSynthesizeDocumentNote(extracted, file.name);
      setAiSynthesizedNote(cleanNoteMarkdown);
      setOcrProgress({ status: 'Done!', progress: 100 });
      setShowOcrModal(true);

      if (addToast) {
        addToast('OCR Complete', 'Document analyzed & synthesized into clean note!', 'success');
      }
    } catch (err) {
      console.error('OCR Synthesis Error:', err);
      alert(`OCR & AI Processing Error: ${err.message}`);
    } finally {
      setOcrLoading(false);
    }
  };

  // Action: Add AI Synthesized Note to Workspace Notes
  const handleAddOcrNoteToWorkspace = (mode = 'new') => {
    if (!aiSynthesizedNote) return;

    const firstLine = aiSynthesizedNote.split('\n')[0].replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const noteTitle = firstLine ? (firstLine.slice(0, 35) + '...') : `OCR: ${file?.name || 'Document'}`;

    if (mode === 'new') {
      const newNote = {
        id: 'note_' + Date.now(),
        title: noteTitle,
        content: aiSynthesizedNote,
        category: 'Study',
        pinned: false,
        starred: false,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        focusTime: 0,
        drawingIds: [],
        audioIds: []
      };

      const updated = [newNote, ...(notes || [])];
      if (setNotes) setNotes(updated);
      localStorage.setItem('floatingNotes', JSON.stringify(updated));

      if (setCurrentNoteId) setCurrentNoteId(newNote.id);
      if (setActiveTab) setActiveTab('notes');
      if (onCelebration) onCelebration('note_saved');
      if (addToast) addToast('Note Created', `Saved "${noteTitle}" to your workspace!`, 'success');
    } else if (mode === 'append' && currentNoteId) {
      const updated = (notes || []).map(n => {
        if (n.id === currentNoteId) {
          return {
            ...n,
            content: n.content ? `${n.content}\n\n---\n${aiSynthesizedNote}` : aiSynthesizedNote,
            updatedAt: new Date().toISOString()
          };
        }
        return n;
      });

      if (setNotes) setNotes(updated);
      localStorage.setItem('floatingNotes', JSON.stringify(updated));
      if (setActiveTab) setActiveTab('notes');
      if (onCelebration) onCelebration('note_saved');
      if (addToast) addToast('Note Appended', 'Inserted document summary into active note!', 'success');
    }

    setShowOcrModal(false);
  };

  // --- IMAGE PROCESSING TOOL HANDLERS ---
  const handleCompress = async () => {
    if (!file || !file.type.startsWith('image/')) return;
    setProcessing(true);

    const img = new Image();
    img.src = originalImageUrl;
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const quality = compQuality / 100;
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setProcessedImageUrl(url);
        setFileMetadata(prev => ({
          ...prev,
          processedSize: formatBytes(blob.size),
          processedRawSize: blob.size
        }));
        setProcessing(false);
      }, 'image/jpeg', quality);
    };
  };

  const handleEnhance = () => {
    if (!file || !file.type.startsWith('image/')) return;
    setProcessing(true);

    const img = new Image();
    img.src = originalImageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      ctx.filter = 'contrast(1.15) saturate(1.1) brightness(1.03)';
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setProcessedImageUrl(url);
        setFileMetadata(prev => ({
          ...prev,
          processedSize: formatBytes(blob.size)
        }));
        setProcessing(false);
      }, 'image/png');
    };
  };

  const handleRemoveBackground = () => {
    if (!file || !file.type.startsWith('image/')) return;
    setProcessing(true);

    const img = new Image();
    img.src = originalImageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const targetR = data[0];
      const targetG = data[1];
      const targetB = data[2];

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const dist = Math.sqrt(Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2));

        if (dist < 32) {
          if (bgType === 'transparent') {
            data[i + 3] = 0;
          } else if (bgType === 'white') {
            data[i] = 255; data[i+1] = 255; data[i+2] = 255;
          } else if (bgType === 'black') {
            data[i] = 0; data[i+1] = 0; data[i+2] = 0;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setProcessedImageUrl(url);
        setProcessing(false);
      }, 'image/png');
    };
  };

  const handleCropResize = () => {
    if (!file || !file.type.startsWith('image/')) return;
    setProcessing(true);

    const img = new Image();
    img.src = originalImageUrl;
    img.onload = () => {
      const newW = parseInt(resizeWidth) || img.width;
      const newH = parseInt(resizeHeight) || img.height;
      const canvas = document.createElement('canvas');
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext('2d');

      if (rotateDeg !== 0) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotateDeg * Math.PI) / 180);
        ctx.drawImage(img, -newW / 2, -newH / 2, newW, newH);
      } else {
        ctx.drawImage(img, 0, 0, newW, newH);
      }

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setProcessedImageUrl(url);
        setFileMetadata(prev => ({
          ...prev,
          dimensions: `${newW} x ${newH} px`,
          processedSize: formatBytes(blob.size)
        }));
        setProcessing(false);
      }, 'image/png');
    };
  };

  const handleRotate = () => {
    setRotateDeg(prev => (prev + 90) % 360);
  };

  const triggerDownload = () => {
    if (!processedImageUrl) return;
    const a = document.createElement('a');
    a.href = processedImageUrl;
    a.download = `processed_${file?.name || 'export.png'}`;
    a.click();
  };

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-140px)] gap-4 lg:gap-6 overflow-y-auto lg:overflow-hidden">
      {/* LEFT SETTINGS & TOOLS PANEL */}
      <div className={`w-full lg:w-80 flex flex-col rounded-2xl border p-3.5 sm:p-4 overflow-y-auto ${cardBg} shrink-0`}>
        <h3 className={`font-bold text-sm mb-4 uppercase tracking-wider ${textTitle} flex items-center gap-1.5`}>
          <Layers size={16} /> File & Document Lab
        </h3>

        {!file ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <Upload size={32} className={`mb-3 opacity-30 ${textSub}`} />
            <p className={`text-xs ${textSub} mb-4`}>Upload image, PDF, audio, video, or document to start.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Metadata Info Panel */}
            <div className={`p-3 rounded-xl border space-y-2 text-xs ${
              isDark ? 'bg-[#312f2c] border-[#44413e]' : 'bg-[#faf7f2] border-[#e9e4db]'
            }`}>
              <h4 className="font-bold flex items-center gap-1.5 text-terracotta">
                <Info size={13} /> File Details
              </h4>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <span className={textSub}>Name:</span>
                <span className="font-semibold truncate text-right">{fileMetadata?.name}</span>
                <span className={textSub}>Size:</span>
                <span className="font-semibold text-right">{fileMetadata?.size}</span>
                <span className={textSub}>Format:</span>
                <span className="font-semibold text-right truncate">{fileMetadata?.type}</span>
                {fileMetadata?.dimensions && (
                  <>
                    <span className={textSub}>Dimensions:</span>
                    <span className="font-semibold text-right">{fileMetadata?.dimensions}</span>
                  </>
                )}
                {fileMetadata?.pages && (
                  <>
                    <span className={textSub}>Pages:</span>
                    <span className="font-semibold text-right">{fileMetadata?.pages}</span>
                  </>
                )}
                {fileMetadata?.processedSize && (
                  <>
                    <span className="font-bold text-sage">New Size:</span>
                    <span className="font-bold text-sage text-right">{fileMetadata?.processedSize}</span>
                  </>
                )}
              </div>
            </div>

            {/* Tool Navigation list */}
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'ocr', label: 'OCR & AI Smart Note', icon: ScanText, badge: 'Nemotron 550B' },
                ...(file.type.startsWith('image/') ? [
                  { id: 'compress', label: 'Image Compression', icon: Sliders },
                  { id: 'enhance', label: 'Enhance & Upscale', icon: Sparkles },
                  { id: 'bg', label: 'Background Cutout', icon: Layers },
                  { id: 'crop_resize', label: 'Crop & Resize', icon: Crop }
                ] : [])
              ].map(tool => {
                const Icon = tool.icon;
                const isSelected = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'bg-terracotta text-white shadow-sm' 
                        : isDark ? 'text-gray-300 hover:bg-[#3d3a37]' : 'text-textCharcoal hover:bg-[#faf7f2]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} />
                      <span>{tool.label}</span>
                    </div>
                    {tool.badge && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-terracotta/10 text-terracotta'
                      }`}>
                        {tool.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* --- OCR & AI SYNTHESIS TOOL PANEL --- */}
            {activeTool === 'ocr' && (
              <div className="space-y-3 pt-3 border-t border-black/10 dark:border-white/10">
                <div className="p-3 rounded-xl bg-terracotta/10 border border-terracotta/20 text-xs space-y-1.5">
                  <span className="font-bold text-terracotta flex items-center gap-1.5">
                    <Zap size={13} /> Intelligent Document Scanner
                  </span>
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-gray-300' : 'text-textCharcoal'}`}>
                    Performs OCR on images/PDFs and uses <strong>Nemotron 550B</strong> to synthesize an executive Markdown note instead of unreadable raw text.
                  </p>
                </div>

                <button
                  onClick={handleRunOcrAndAiSynthesis}
                  disabled={ocrLoading}
                  className="w-full bg-gradient-to-r from-terracotta to-[#e28a63] hover:from-[#c26e47] hover:to-terracotta text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {ocrLoading ? <RefreshCw size={14} className="animate-spin" /> : <ScanText size={14} />}
                  <span>{ocrLoading ? 'Scanning & Synthesizing...' : 'Run AI OCR & Note Generator'}</span>
                </button>

                {ocrLoading && (
                  <div className="space-y-1.5 p-2.5 rounded-xl border border-inherit text-xs bg-black/5 dark:bg-white/5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span>{ocrProgress.status}</span>
                      <span className="font-bold text-terracotta">{ocrProgress.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div 
                        className="h-full bg-terracotta rounded-full transition-all duration-300"
                        style={{ width: `${ocrProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {aiSynthesizedNote && !ocrLoading && (
                  <button
                    onClick={() => setShowOcrModal(true)}
                    className="w-full py-2 border border-sage text-sage hover:bg-sage/10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye size={13} />
                    <span>View Synthesized Note</span>
                  </button>
                )}
              </div>
            )}

            {/* --- COMPRESS PANEL --- */}
            {activeTool === 'compress' && file.type.startsWith('image/') && (
              <div className="space-y-4 pt-2 border-t border-black/10 dark:border-white/10">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase">Compress Mode:</label>
                  <div className="flex gap-1">
                    {['lossless', 'balanced', 'maximum'].map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setCompMode(mode);
                          setCompQuality(mode === 'lossless' ? 100 : mode === 'balanced' ? 70 : 25);
                        }}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg border uppercase ${
                          compMode === mode 
                            ? 'bg-terracotta text-white border-terracotta' 
                            : 'bg-transparent border-current opacity-60'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>Quality Slider</span>
                    <span>{compQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={compQuality}
                    onChange={(e) => setCompQuality(parseInt(e.target.value))}
                    className="w-full accent-terracotta cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleCompress}
                  disabled={processing}
                  className="w-full bg-terracotta hover:bg-[#be6e47] text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {processing ? 'Compressing...' : 'Apply Compression'}
                </button>
              </div>
            )}

            {/* --- ENHANCE PANEL --- */}
            {activeTool === 'enhance' && file.type.startsWith('image/') && (
              <div className="space-y-4 pt-2 border-t border-black/10 dark:border-white/10">
                <p className={`text-xs leading-normal ${textSub}`}>
                  Auto-adjusts contrast, vibrancy, and sharpness.
                </p>
                <button
                  onClick={handleEnhance}
                  disabled={processing}
                  className="w-full bg-terracotta hover:bg-[#be6e47] text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={13} />
                  <span>{processing ? 'Enhancing...' : 'Enhance Quality'}</span>
                </button>
              </div>
            )}

            {/* --- BACKGROUND CUTOUT PANEL --- */}
            {activeTool === 'bg' && file.type.startsWith('image/') && (
              <div className="space-y-4 pt-2 border-t border-black/10 dark:border-white/10">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase">Replace BG With:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['transparent', 'white', 'black'].map(bgt => (
                      <button
                        key={bgt}
                        type="button"
                        onClick={() => setBgType(bgt)}
                        className={`py-1 text-[10px] font-bold rounded-lg border capitalize ${
                          bgType === bgt 
                            ? 'bg-terracotta text-white border-terracotta' 
                            : 'bg-transparent border-current opacity-60'
                        }`}
                      >
                        {bgt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRemoveBackground}
                  disabled={processing}
                  className="w-full bg-terracotta hover:bg-[#be6e47] text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {processing ? 'Removing...' : 'Apply Background Cutout'}
                </button>
              </div>
            )}

            {/* --- CROP & RESIZE PANEL --- */}
            {activeTool === 'crop_resize' && file.type.startsWith('image/') && (
              <div className="space-y-4 pt-2 border-t border-black/10 dark:border-white/10">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase">Image Rotation:</label>
                  <button
                    onClick={handleRotate}
                    className={`w-full py-1.5 border rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#3d3a37] ${textSub}`}
                  >
                    <RotateCw size={13} /> Rotate 90°
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase">Resize dimensions:</label>
                  <div className="flex gap-2 items-center text-xs">
                    <input
                      type="number"
                      placeholder="W"
                      value={resizeWidth}
                      onChange={(e) => {
                        setResizeWidth(e.target.value);
                        if (lockAspect && fileMetadata?.width) {
                          const ratio = fileMetadata.height / fileMetadata.width;
                          setResizeHeight(Math.round(parseInt(e.target.value) * ratio) || '');
                        }
                      }}
                      className={`w-20 px-2.5 py-1.5 rounded-lg border text-center outline-none ${inputBg}`}
                    />
                    <span>x</span>
                    <input
                      type="number"
                      placeholder="H"
                      value={resizeHeight}
                      onChange={(e) => {
                        setResizeHeight(e.target.value);
                        if (lockAspect && fileMetadata?.height) {
                          const ratio = fileMetadata.width / fileMetadata.height;
                          setResizeWidth(Math.round(parseInt(e.target.value) * ratio) || '');
                        }
                      }}
                      className={`w-20 px-2.5 py-1.5 rounded-lg border text-center outline-none ${inputBg}`}
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockAspect}
                      onChange={(e) => setLockAspect(e.target.checked)}
                      className="accent-terracotta"
                    />
                    <span>Lock Aspect Ratio</span>
                  </label>
                </div>

                <button
                  onClick={handleCropResize}
                  disabled={processing}
                  className="w-full bg-terracotta hover:bg-[#be6e47] text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {processing ? 'Processing...' : 'Apply Resize / Rotation'}
                </button>
              </div>
            )}

            {/* Actions */}
            <button
              onClick={handleClearFile}
              className={`w-full py-1.5 border rounded-xl text-xs font-bold hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all ${textSub}`}
            >
              Clear File
            </button>
          </div>
        )}
      </div>

      {/* RIGHT PREVIEW WORKSPACE */}
      <div 
        className={`flex-1 min-h-[360px] lg:min-h-0 rounded-2xl border p-3.5 sm:p-5 flex flex-col justify-between overflow-hidden ${cardBg}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {!file ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 dark:border-[#3d3a37] rounded-xl p-8">
            <Upload size={48} className="text-terracotta/40 mb-4 animate-bounce" />
            <h3 className={`font-bold text-lg mb-1.5 ${textTitle}`}>Drag & Drop Files, PDFs, or Images Here</h3>
            <p className={`text-xs max-w-sm leading-normal mb-4 ${textSub}`}>
              Upload images, PDF documents, or text files for instant neural OCR & structured note synthesis powered by Nemotron 550B.
            </p>
            
            <label className="bg-terracotta hover:bg-[#be6e47] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-2">
              <ScanText size={14} />
              <span>Browse & Scan File</span>
              <input type="file" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        ) : (
          <>
            {/* Top Quick Actions Bar */}
            <div className="flex justify-between items-center pb-3 border-b border-black/10 dark:border-white/10 mb-3 shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>
                  Preview: {file.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* 1-Click OCR & Note Synthesizer */}
                <button
                  onClick={handleRunOcrAndAiSynthesis}
                  disabled={ocrLoading}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-terracotta to-[#e28a63] hover:from-[#c26e47] hover:to-terracotta text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                  title="Run Neural OCR & generate structured Markdown note"
                >
                  {ocrLoading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{ocrLoading ? 'Processing OCR...' : 'AI Scan to Note'}</span>
                </button>

                {processedImageUrl && (
                  <button
                    onClick={triggerDownload}
                    className="flex items-center gap-1 bg-sage hover:bg-[#7b9087] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Download size={13} /> Download Output
                  </button>
                )}
              </div>
            </div>

            {/* Core Center Display Screen */}
            <div className="flex-1 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-[#1a1817] rounded-xl relative p-4">
              
              {/* If image file loaded */}
              {file.type.startsWith('image/') && (
                <div className="relative max-w-full max-h-[420px] select-none flex items-center justify-center">
                  {processedImageUrl ? (
                    <div className="relative w-[500px] h-[350px] overflow-hidden rounded-lg shadow border border-gray-200 dark:border-gray-800">
                      <img 
                        src={originalImageUrl} 
                        className="absolute inset-0 w-full h-full object-contain" 
                        alt="Before" 
                      />
                      <div 
                        className="absolute inset-y-0 left-0 overflow-hidden"
                        style={{ width: `${compareSplit}%` }}
                      >
                        <img 
                          src={processedImageUrl} 
                          className="absolute inset-0 w-[500px] h-[350px] max-w-none object-contain" 
                          alt="After" 
                        />
                      </div>
                      <div 
                        className="absolute top-0 bottom-0 w-1 bg-terracotta cursor-ew-resize z-10"
                        style={{ left: `${compareSplit}%` }}
                      >
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-terracotta border border-white flex items-center justify-center text-white shadow">
                          <Eye size={12} />
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20 px-3 py-1 bg-black/70 text-white rounded-full flex items-center gap-2">
                        <span className="text-[10px] font-bold">Processed</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={compareSplit}
                          onChange={(e) => setCompareSplit(parseInt(e.target.value))}
                          className="w-24 h-1 bg-gray-400 rounded-lg appearance-none cursor-pointer accent-terracotta"
                        />
                        <span className="text-[10px] font-bold">Original</span>
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={originalImageUrl} 
                      className="rounded-lg shadow border border-gray-200 dark:border-gray-800 max-h-[350px] object-contain" 
                      alt="Source file" 
                    />
                  )}
                </div>
              )}

              {/* If PDF document loaded */}
              {file.type === 'application/pdf' && (
                <div className="text-center p-8 space-y-4 max-w-md">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto shadow-sm">
                    <FileText size={36} />
                  </div>
                  <div>
                    <h4 className={`font-bold text-base ${textTitle}`}>{file.name}</h4>
                    <p className={`text-xs mt-1 ${textSub}`}>
                      {fileMetadata?.size} • {fileMetadata?.pages || '1+'} Pages • PDF Document
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 text-xs text-left space-y-1">
                    <span className="font-bold text-terracotta flex items-center gap-1">
                      <Sparkles size={12} /> Ready for AI Extraction
                    </span>
                    <p className={`text-[11px] ${textSub}`}>
                      Click "AI Scan to Note" above to parse all text and create an organized workspace note.
                    </p>
                  </div>
                </div>
              )}

              {/* If Text document loaded */}
              {file.type.startsWith('text/') && (
                <div className="text-center p-8 space-y-4 max-w-md">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto shadow-sm">
                    <FileText size={36} />
                  </div>
                  <div>
                    <h4 className={`font-bold text-base ${textTitle}`}>{file.name}</h4>
                    <p className={`text-xs mt-1 ${textSub}`}>
                      {fileMetadata?.size} • Text Document
                    </p>
                  </div>
                </div>
              )}

              {/* If audio file loaded */}
              {file.type.startsWith('audio/') && (
                <div className="text-center p-6 space-y-4">
                  <File size={48} className="mx-auto text-sage" />
                  <h4 className={`font-bold text-sm ${textTitle}`}>{file.name}</h4>
                  <audio src={originalImageUrl} controls className="mx-auto" />
                </div>
              )}

              {/* If video file loaded */}
              {file.type.startsWith('video/') && (
                <video src={originalImageUrl} controls className="max-h-[350px] rounded-lg shadow" />
              )}
            </div>

            {/* Bottom notification */}
            {processedImageUrl && (
              <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between text-xs ${
                isDark ? 'bg-sage/10 border-sage/30' : 'bg-sage/5 border-sage/20'
              }`}>
                <div className="flex items-center gap-1.5 text-sage">
                  <Check size={15} />
                  <span className="font-bold">File processed and saved successfully!</span>
                </div>
                <button
                  onClick={triggerDownload}
                  className="font-bold text-terracotta hover:underline"
                >
                  Save output file
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- OCR & AI STRUCTURED NOTE PREVIEW MODAL --- */}
      {showOcrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-[#292725] border-[#44413e] text-[#eeebe6]' : 'bg-[#fffdfa] border-[#e9e4db] text-textCharcoal'
          }`}>
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-inherit flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-terracotta/20 text-terracotta flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">OCR Document Intelligence</h4>
                  <span className="text-[10px] text-terracotta font-mono font-bold">
                    Powered by Nvidia Nemotron 550B
                  </span>
                </div>
              </div>

              {/* Tab Toggle: Clean AI Note vs Raw OCR */}
              <div className={`flex items-center p-0.5 rounded-lg border text-xs ${
                isDark ? 'bg-[#1e1c1a] border-[#383532]' : 'bg-[#f4efe5] border-[#e2dacb]'
              }`}>
                <button
                  onClick={() => setOcrModalTab('summary')}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                    ocrModalTab === 'summary' ? 'bg-terracotta text-white shadow-xs' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  ✨ AI Note Summary
                </button>
                <button
                  onClick={() => setOcrModalTab('raw')}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                    ocrModalTab === 'raw' ? 'bg-terracotta text-white shadow-xs' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  📄 Raw OCR Text
                </button>
              </div>

              <button
                onClick={() => setShowOcrModal(false)}
                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 ml-2"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Preview */}
            <div className="flex-1 overflow-y-auto p-6">
              {ocrModalTab === 'summary' ? (
                <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed ${
                  isDark ? 'bg-[#1f1d1b] border-[#383532]' : 'bg-[#faf8f4] border-[#e8e2d7]'
                }`}>
                  <MarkdownRenderer content={aiSynthesizedNote} darkMode={isDark} />
                </div>
              ) : (
                <div className={`p-4 rounded-2xl border font-mono text-xs whitespace-pre-wrap ${
                  isDark ? 'bg-[#1f1d1b] border-[#383532] text-gray-300' : 'bg-[#faf8f4] border-[#e8e2d7] text-gray-700'
                }`}>
                  {ocrRawText || 'No raw text recognized.'}
                </div>
              )}
            </div>

            {/* Modal Footer Prompt & Actions */}
            <div className="px-6 py-4 border-t border-inherit flex flex-wrap items-center justify-between gap-3 bg-black/5 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(ocrModalTab === 'summary' ? aiSynthesizedNote : ocrRawText);
                    setCopiedOcr(true);
                    setTimeout(() => setCopiedOcr(false), 2000);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  {copiedOcr ? <Check size={14} className="text-sage" /> : <Copy size={14} />}
                  <span>{copiedOcr ? 'Copied' : 'Copy Markdown'}</span>
                </button>
              </div>

              {/* Add to Notes Action Prompt */}
              <div className="flex items-center gap-2">
                {currentNoteId && (
                  <button
                    onClick={() => handleAddOcrNoteToWorkspace('append')}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-terracotta text-terracotta hover:bg-terracotta/10 transition-all flex items-center gap-1"
                  >
                    <ArrowRight size={14} /> Append to Active Note
                  </button>
                )}

                <button
                  onClick={() => handleAddOcrNoteToWorkspace('new')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-terracotta hover:bg-[#c26e47] text-white transition-all shadow-md flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Add as New Workspace Note</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
