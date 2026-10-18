import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, Bot, User, Trash2, Copy, Check, Plus, 
  Settings, Key, Cpu, Zap, RefreshCw, X, MessageSquare,
  FileText, ShieldCheck, AlertCircle, ArrowRight
} from 'lucide-react';
import { 
  callOpenRouterAI, getAIConfig, saveAIConfig, AVAILABLE_MODELS, DEFAULT_AI_CONFIG 
} from '../utils/ai';
import MarkdownRenderer from './MarkdownRenderer';

export default function AIAssistantModal({ 
  isOpen, 
  onClose, 
  activeNote, 
  onCreateNoteFromAI, 
  onInsertToActiveNote,
  darkMode, 
  activeTheme,
  addToast
}) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'settings'
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your **PinTheNote AI Copilot** powered by **Nvidia Nemotron-3 Ultra 550B**. How can I help boost your productivity today? You can ask me to draft notes, summarize documents, brainstorm ideas, or analyze your current workspace."
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Settings State
  const [aiConfig, setAiConfig] = useState(getAIConfig());
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState(null); // 'success', 'error', null

  const messagesEndRef = useRef(null);

  const isBlush = activeTheme === 'calm_light' || activeTheme === 'calm_dark';
  const isLiving = activeTheme === 'living_light' || activeTheme === 'living_dark';
  const isDark = activeTheme && activeTheme.includes('dark');

  const modalBg = activeTheme === 'calm_light'
    ? 'page-frame-pink bg-white/95 border-2 border-dashed border-[#D2B48C] text-[#4B0082] shadow-2xl shadow-pink-200 rounded-[28px]'
    : activeTheme === 'calm_dark'
    ? 'page-frame-dark bg-[#3C2740]/95 border-2 border-dashed border-[#D9A6C4] text-[#FCE8F3] shadow-2xl shadow-black/60 rounded-[28px]'
    : activeTheme === 'living_light'
    ? 'bg-[#FFFBF5] border border-[#E5D5C5] text-[#5A4636] shadow-plush rounded-2xl'
    : 'bg-[#211610] border border-[#4A362A] text-[#F2E6D3] shadow-panel rounded-2xl';

  const chatBubbleUser = activeTheme === 'calm_light'
    ? 'bg-gradient-to-r from-hot-pink to-blush-pink text-white font-fredoka'
    : activeTheme === 'calm_dark'
    ? 'bg-gradient-to-r from-[#FF6FB0] to-[#B026FF] text-white font-fredoka'
    : activeTheme === 'living_light'
    ? 'bg-[#4A2C1D] text-white font-outfit'
    : 'bg-[#C9975C] text-[#2A1D15] font-outfit font-bold';

  const chatBubbleAI = activeTheme === 'calm_light'
    ? 'bg-white/80 border border-pink-200 text-[#4B0082]'
    : activeTheme === 'calm_dark'
    ? 'bg-[#2A1B29] border border-[#D9A6C4]/30 text-[#E8D9E5]'
    : activeTheme === 'living_light'
    ? 'bg-[#FBF3E7] border border-[#E5D5C5] text-[#5A4636]'
    : 'bg-[#3A2A1E] border border-[#4A362A] text-[#D9C7AE]';

  const inputBg = activeTheme === 'calm_light'
    ? 'bg-white border border-pink-200 text-[#4B0082]'
    : activeTheme === 'calm_dark'
    ? 'bg-[#2A1B29] border border-[#D9A6C4]/30 text-[#FCE8F3]'
    : activeTheme === 'living_light'
    ? 'bg-[#FFFBF5] border border-[#E5D5C5] text-[#5A4636]'
    : 'bg-[#2A1D15] border border-[#4A362A] text-[#F2E6D3]';

  useEffect(() => {
    if (isOpen) {
      const conf = getAIConfig();
      setAiConfig(conf);
      setApiKeyInput(conf.apiKey || '');
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSendMessage = async (customPrompt) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const newMessages = [
      ...messages,
      { role: 'user', content: textToSend.trim() }
    ];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      let systemPrompt = `You are an elite, thoughtful AI copilot inside the PinTheNote digital workspace.
Model: ${aiConfig.model}
You are helpful, insightful, and structure your responses with clean Markdown, bullet points, and code blocks where helpful.`;

      if (activeNote) {
        systemPrompt += `\n\nActive Note Context:
Title: "${activeNote.title || 'Untitled'}"
Category: "${activeNote.category || 'General'}"
Content:
"""
${activeNote.content ? activeNote.content.substring(0, 3000) : '(Empty note)'}
"""`;
      }

      const response = await callOpenRouterAI({
        messages: newMessages.slice(-10), // send last 10 messages for context
        systemPrompt
      });

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: response.content }
      ]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **AI Request Error**: ${error.message || 'Unable to connect to OpenRouter'}. Please verify your API key or model in Settings.`
        }
      ]);
      if (addToast) {
        addToast('AI Error', error.message || 'Connection failed', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
    if (addToast) addToast('Copied', 'Content copied to clipboard', 'info');
  };

  const handleSaveSettings = () => {
    const updated = {
      ...aiConfig,
      apiKey: apiKeyInput.trim()
    };
    setAiConfig(updated);
    saveAIConfig(updated);
    if (addToast) addToast('Settings Saved', 'AI configuration updated successfully', 'success');
  };

  const handleTestConnection = async () => {
    setIsTestingKey(true);
    setKeyTestStatus(null);
    try {
      const originalConf = getAIConfig();
      saveAIConfig({ ...originalConf, apiKey: apiKeyInput.trim() });

      const testRes = await callOpenRouterAI({
        messages: [{ role: 'user', content: 'Respond with "Connected successfully."' }],
        systemPrompt: 'Keep answer to 2 words.'
      });

      if (testRes.content) {
        setKeyTestStatus('success');
        if (addToast) addToast('Connected!', `OpenRouter model ${aiConfig.model} verified.`, 'success');
      }
    } catch (err) {
      setKeyTestStatus('error');
      if (addToast) addToast('Connection Failed', err.message, 'error');
    } finally {
      setIsTestingKey(false);
    }
  };

  const quickPrompts = [
    { label: '📝 Summarize Note', prompt: 'Please summarize the currently active note in 3 key takeaways and bullet points.' },
    { label: '💡 Brainstorm Ideas', prompt: 'Brainstorm 5 innovative ideas and action steps related to my current note topic.' },
    { label: '🎯 Study / Action Plan', prompt: 'Create a 3-step actionable study and execution plan based on this note.' },
    { label: '✍️ Polish Tone', prompt: 'Rewrite the active note content to sound more polished, professional, and clear.' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className={`w-full max-w-3xl h-[94vh] sm:h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 animate-softGlow ${modalBg}`}>
        
        {/* MODAL HEADER */}
        <div className="flex flex-wrap items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-inherit shrink-0 gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-terracotta/15 flex items-center justify-center text-terracotta">
              <Sparkles size={22} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">PinTheNote AI Copilot</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage/20 text-sage font-mono font-semibold">
                  Nemotron 550B
                </span>
              </div>
              <p className="text-xs opacity-60">
                {activeNote ? `Context: "${activeNote.title || 'Untitled'}"` : 'General Workspace Mode'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className={`flex rounded-xl p-1 border text-xs font-semibold ${isDark ? 'bg-[#1a1816] border-[#383532]' : 'bg-[#eee9df] border-[#e0dad0]'}`}>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'chat' ? 'bg-terracotta text-white shadow-sm' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <MessageSquare size={13} /> Chat
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === 'settings' ? 'bg-terracotta text-white shadow-sm' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Settings size={13} /> Settings
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Quick Action Chips */}
            {activeNote && (
              <div className="px-6 py-2.5 border-b border-inherit flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 bg-black/5 dark:bg-white/5">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 whitespace-nowrap">
                  Quick Actions:
                </span>
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qp.prompt)}
                    disabled={isLoading}
                    className={`text-xs px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all font-medium flex items-center gap-1 ${
                      isDark 
                        ? 'bg-[#2e2c29] border-[#44413e] hover:border-terracotta' 
                        : 'bg-[#faf7f2] border-[#e5dfd5] hover:border-terracotta'
                    }`}
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={idx}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-terracotta/20 text-terracotta flex items-center justify-center shrink-0 mt-1">
                        <Bot size={18} />
                      </div>
                    )}

                    <div className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isUser ? chatBubbleUser : `${chatBubbleAI} border shadow-sm`
                    }`}>
                      {isUser ? (
                        <div className="whitespace-pre-wrap font-sans">
                          {msg.content}
                        </div>
                      ) : (
                        <MarkdownRenderer content={msg.content} darkMode={isDark} />
                      )}

                      {/* AI Action footer */}
                      {!isUser && idx > 0 && (
                        <div className="mt-3 pt-3 border-t border-inherit/40 flex items-center justify-between gap-2 opacity-80">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => copyToClipboard(msg.content, idx)}
                              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                              title="Copy response"
                            >
                              {copiedIndex === idx ? <Check size={13} className="text-sage" /> : <Copy size={13} />}
                              {copiedIndex === idx ? 'Copied' : 'Copy'}
                            </button>

                            {onCreateNoteFromAI && (
                              <button
                                onClick={() => {
                                  onCreateNoteFromAI(msg.content);
                                  if (addToast) addToast('Note Created', 'Saved AI response into a new workspace note!', 'success');
                                }}
                                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1 text-[11px] font-semibold text-sage"
                                title="Create new note from this response"
                              >
                                <Plus size={13} /> Save to New Note
                              </button>
                            )}

                            {onInsertToActiveNote && activeNote && (
                              <button
                                onClick={() => {
                                  onInsertToActiveNote(msg.content);
                                  if (addToast) addToast('Inserted', 'Added AI response to current note', 'success');
                                }}
                                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1 text-[11px] font-semibold text-terracotta"
                                title="Append to active note"
                              >
                                <FileText size={13} /> Insert in Note
                              </button>
                            )}
                          </div>

                          <span className="text-[10px] font-mono opacity-50">
                            {aiConfig.model.split('/')[1]?.split(':')[0] || 'Nemotron 550B'}
                          </span>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-sage/20 text-sage flex items-center justify-center shrink-0 mt-1">
                        <User size={18} />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3 justify-start items-center">
                  <div className="w-8 h-8 rounded-xl bg-terracotta/20 text-terracotta flex items-center justify-center shrink-0 animate-pulse">
                    <Sparkles size={18} />
                  </div>
                  <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${chatBubbleAI}`}>
                    <div className="w-2 h-2 rounded-full bg-terracotta animate-ping" />
                    <span className="italic">Nvidia Nemotron 550B is thinking and formulating response...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-2.5 sm:p-4 border-t border-inherit shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={activeNote ? `Ask AI about "${activeNote.title || 'Untitled'}" or give instructions...` : "Ask AI anything, brainstorm, generate plans..."}
                    className={`w-full pl-4 pr-10 py-3 rounded-2xl border outline-none text-xs sm:text-sm font-medium transition-all ${inputBg} focus:ring-2 focus:ring-terracotta`}
                    disabled={isLoading}
                  />
                  {inputMessage && (
                    <button
                      type="button"
                      onClick={() => setInputMessage('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-terracotta hover:bg-[#c26e47] text-white p-3 rounded-2xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center justify-center shrink-0"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* SETTINGS TAB */
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-5 sm:space-y-6">
            <div>
              <h4 className="text-lg font-bold mb-1">AI Engine & Model Configuration</h4>
              <p className="text-xs opacity-70">
                PinTheNote connects directly to OpenRouter.ai to power smart writing, summaries, and assistants.
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Key size={14} className="text-terracotta" /> OpenRouter API Key
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className={`w-full px-4 py-2.5 rounded-xl border outline-none font-mono text-xs ${inputBg} focus:ring-2 focus:ring-terracotta`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold opacity-60 hover:opacity-100"
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>

                <button
                  onClick={handleTestConnection}
                  disabled={isTestingKey || !apiKeyInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-sage hover:bg-[#7b9087] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isTestingKey ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                  Test Ping
                </button>
              </div>

              {keyTestStatus === 'success' && (
                <div className="p-3 rounded-xl bg-sage/15 text-sage border border-sage/30 flex items-center gap-2 text-xs font-semibold">
                  <ShieldCheck size={16} /> API Key is active and successfully connected to OpenRouter!
                </div>
              )}
              {keyTestStatus === 'error' && (
                <div className="p-3 rounded-xl bg-red-500/15 text-red-500 border border-red-500/30 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle size={16} /> Connection failed. Please check your API key and connection.
                </div>
              )}
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Cpu size={14} className="text-terracotta" /> Default AI Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_MODELS.map(model => {
                  const isSelected = aiConfig.model === model.id;
                  return (
                    <div
                      key={model.id}
                      onClick={() => {
                        const updated = { ...aiConfig, model: model.id };
                        setAiConfig(updated);
                        saveAIConfig(updated);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-terracotta bg-terracotta/10 shadow-sm' 
                          : isDark ? 'bg-[#292725] border-[#3d3a37] hover:border-gray-500' : 'bg-[#f7f5ef] border-[#ece6d9] hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">{model.provider}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-terracotta/20 text-terracotta">
                          {model.tag}
                        </span>
                      </div>
                      <h5 className="font-semibold text-xs tracking-tight">{model.name}</h5>
                      <span className="text-[10px] font-mono opacity-50 block mt-1 truncate">{model.id}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold uppercase tracking-wider">Creativity (Temperature)</label>
                <span className="font-mono font-bold text-terracotta">{aiConfig.temperature || 0.7}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.2"
                step="0.1"
                value={aiConfig.temperature || 0.7}
                onChange={(e) => {
                  const updated = { ...aiConfig, temperature: parseFloat(e.target.value) };
                  setAiConfig(updated);
                  saveAIConfig(updated);
                }}
                className="w-full accent-terracotta cursor-pointer"
              />
              <div className="flex justify-between text-[10px] opacity-60">
                <span>0.1 (Strict & Precise)</span>
                <span>0.7 (Balanced)</span>
                <span>1.2 (Creative & Expressive)</span>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex items-center justify-between border-t border-inherit">
              <button
                onClick={() => {
                  setAiConfig(DEFAULT_AI_CONFIG);
                  setApiKeyInput(DEFAULT_AI_CONFIG.apiKey);
                  saveAIConfig(DEFAULT_AI_CONFIG);
                  if (addToast) addToast('Reset', 'Restored default Nemotron-3 550B configuration', 'info');
                }}
                className="text-xs font-semibold opacity-60 hover:opacity-100 underline"
              >
                Reset to Default (Nemotron 550B)
              </button>

              <button
                onClick={handleSaveSettings}
                className="bg-terracotta hover:bg-[#c26e47] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
