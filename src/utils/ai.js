/**
 * OpenRouter AI Integration Service for PinTheNote
 * Model: nvidia/nemotron-3-ultra-550b-a55b:free
 */

export const DEFAULT_AI_CONFIG = {
  apiKey: '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',
  model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
  customEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
  temperature: 0.7
};

export const AVAILABLE_MODELS = [
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nvidia Nemotron-3 Ultra 550B (Free)', provider: 'Nvidia', tag: 'Fast & Powerful' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta Llama 3.3 70B Instruct (Free)', provider: 'Meta', tag: 'High Precision' },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Google Gemini 2.0 Flash (Free)', provider: 'Google', tag: 'Speed & Logic' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 Reasoning (Free)', provider: 'DeepSeek', tag: 'Reasoning' }
];

export const getAIConfig = () => {
  try {
    const saved = localStorage.getItem('pinthenote_ai_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_AI_CONFIG,
        ...parsed,
        // Ensure default key & model if user cleared it or hasn't set one
        apiKey: parsed.apiKey || DEFAULT_AI_CONFIG.apiKey,
        model: parsed.model || DEFAULT_AI_CONFIG.model
      };
    }
  } catch (e) {
    console.error('Error reading AI config:', e);
  }
  return { ...DEFAULT_AI_CONFIG };
};

export const saveAIConfig = (config) => {
  try {
    localStorage.setItem('pinthenote_ai_config', JSON.stringify(config));
  } catch (e) {
    console.error('Error saving AI config:', e);
  }
};

/**
 * Core function to send chat requests to OpenRouter
 */
export async function callOpenRouterAI({
  messages = [],
  systemPrompt = 'You are the intelligent sanctuary assistant in PinTheNote, a modern minimalist notes and productivity application. Provide clear, well-structured, insightful, and beautifully formatted markdown answers.',
  temperature = 0.7,
  max_tokens = 2500,
  signal
} = {}) {
  const config = getAIConfig();
  const apiKey = config.apiKey?.trim();

  if (!apiKey) {
    throw new Error('OpenRouter API Key is missing. Please check your AI Settings in PinTheNote.');
  }

  const formattedMessages = [];
  if (systemPrompt) {
    formattedMessages.push({ role: 'system', content: systemPrompt });
  }

  messages.forEach(msg => {
    formattedMessages.push({
      role: msg.role,
      content: msg.content
    });
  });

  const body = {
    model: config.model || DEFAULT_AI_CONFIG.model,
    messages: formattedMessages,
    temperature: typeof temperature === 'number' ? temperature : config.temperature,
    max_tokens: max_tokens
  };

  const response = await fetch(config.customEndpoint || DEFAULT_AI_CONFIG.customEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
      'X-Title': 'PinTheNote'
    },
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    let errorDetails = '';
    try {
      const errJson = await response.json();
      errorDetails = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetails = await response.text();
    }
    throw new Error(`OpenRouter API Error (${response.status}): ${errorDetails || response.statusText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const replyContent = choice?.message?.content || choice?.text || '';

  return {
    content: replyContent.trim(),
    usage: data.usage || null,
    model: data.model || config.model
  };
}

/**
 * Summarize note contents
 */
export async function aiSummarizeNote(content, title = '') {
  if (!content || !content.trim()) {
    throw new Error('Note content is empty.');
  }

  const prompt = `Please summarize the following note titled "${title || 'Untitled'}". 
Provide:
1. A concise 2-sentence executive summary.
2. Key takeaways / bullet points.
3. Any immediate actions or follow-ups.

Note Content:
"""
${content}
"""`;

  const res = await callOpenRouterAI({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt: 'You are an expert executive note summarizer. Be concise, sharp, and structured.'
  });

  return res.content;
}

/**
 * Polish / Refine note text with various styles
 */
export async function aiPolishNote(content, style = 'polish') {
  if (!content || !content.trim()) {
    throw new Error('Note content is empty.');
  }

  let instruction = 'Improve readability, clarity, and tone while preserving the original intent and facts.';
  if (style === 'fix_grammar') {
    instruction = 'Correct all grammatical, spelling, and punctuation errors while maintaining the exact original voice and structure.';
  } else if (style === 'bullet_points') {
    instruction = 'Transform the text into a clean, structured bullet-point outline with clear headings.';
  } else if (style === 'professional') {
    instruction = 'Rewrite in an articulate, polished, professional business tone.';
  } else if (style === 'academic') {
    instruction = 'Rewrite with scholarly rigor, precise vocabulary, and analytical clarity.';
  } else if (style === 'expand') {
    instruction = 'Elaborate and expand upon these notes with relevant context, structured sub-points, and comprehensive explanations.';
  } else if (style === 'concise') {
    instruction = 'Condense and trim all unnecessary filler words into a high-density, crisp version.';
  }

  const prompt = `Instruction: ${instruction}

Original Note Content:
"""
${content}
"""

Provide ONLY the rewritten note content, ready to replace or use directly in the note.`;

  const res = await callOpenRouterAI({
    messages: [{ role: 'user', content: prompt }]
  });

  return res.content;
}

/**
 * Extract Action Items and To-Dos
 */
export async function aiExtractActionItems(content, title = '') {
  if (!content || !content.trim()) {
    throw new Error('Note content is empty.');
  }

  const prompt = `Analyze the note below and extract actionable tasks, to-dos, and deadlines into a checklist format using [ ] checkboxes with priorities (High/Medium/Low).

Note Title: ${title}
Note Content:
"""
${content}
"""`;

  const res = await callOpenRouterAI({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt: 'You are an elite productivity and task extraction assistant. Output clean markdown task checklists.'
  });

  return res.content;
}

/**
 * Brainstorm ideas and expand on the note topic
 */
export async function aiBrainstormIdeas(content, title = '') {
  const prompt = `Based on the following note titled "${title}", brainstorm 5 creative ideas, complementary angles, potential questions to explore, and next steps to take.

Note Content:
"""
${content || '(No content provided yet, brainstorm around the title)'}
"""`;

  const res = await callOpenRouterAI({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt: 'You are an inspiring creative strategist and brainstorming partner.'
  });

  return res.content;
}

/**
 * Auto-generate Title and Category
 */
export async function aiSuggestTitleAndCategory(content) {
  if (!content || !content.trim()) {
    throw new Error('Note content is empty.');
  }

  const prompt = `Based on this note content, provide:
1. A concise, catchy title (maximum 6 words).
2. The best matching category strictly chosen from: [Work, Personal, Study, Ideas].

Format your response EXACTLY as JSON:
{"title": "Suggested Title", "category": "Work"}

Content:
"""
${content.substring(0, 1500)}
"""`;

  const res = await callOpenRouterAI({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt: 'You are a JSON assistant. Respond strictly with valid JSON without markdown wrapping.'
  });

  try {
    const cleanJson = res.content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.warn('Failed to parse title/category JSON:', e);
    return { title: 'AI Enhanced Note', category: 'Ideas' };
  }
}

/**
 * Translate note to target language
 */
export async function aiTranslateNote(content, targetLang = 'Spanish') {
  if (!content || !content.trim()) {
    throw new Error('Note content is empty.');
  }

  const prompt = `Translate the following note accurately and naturally into ${targetLang}. Preserve formatting, bullet points, and headers.

Content:
"""
${content}
"""`;

  const res = await callOpenRouterAI({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt: `You are an expert translator specializing in ${targetLang}. Output ONLY the translated text.`
  });

  return res.content;
}

/**
 * Voice recording note generator
 */
export async function aiGenerateVoiceNoteSummary(durationSeconds, contextNoteTitle = '') {
  const prompt = `A user just recorded a voice memo in PinTheNote (${Math.round(durationSeconds)}s long) linked to "${contextNoteTitle || 'General Workspace'}".
Generate a structured voice memo template containing:
- 🎙️ Audio Memo Metadata & Timestamp
- 📝 Key Discussion Points / Transcribed Highlights placeholder
- 📌 Action Items & Commitments
- 💡 Ideas captured

Create an elegant, highly usable markdown note template ready to be edited.`;

  const res = await callOpenRouterAI({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt: 'You are a voice memo organization assistant for PinTheNote.'
  });

  return res.content;
}

/**
 * Synthesize OCR / Document raw text into a high-value structured note
 */
export async function aiSynthesizeDocumentNote(rawText, fileName = 'Uploaded Document') {
  if (!rawText || !rawText.trim()) {
    throw new Error('Extracted text is empty or could not be recognized.');
  }

  const prompt = `You are an expert document analyst and executive note writer.
I have extracted the following raw OCR / document text from a file named "${fileName}".
The raw text may have line breaks, scanner noise, OCR spelling artifacts, or unformatted fragments.

YOUR GOAL:
Transform this raw extraction into a clean, comprehensive, highly organized Markdown Note that the user can immediately save and reference in their workspace.

INSTRUCTIONS:
1. Deduce an accurate, descriptive title from the content.
2. Structure the note with clean Markdown:
   - # [Descriptive Document Title]
   - ## 📋 Executive Summary (crisp 2-3 sentence overview of what this document is about)
   - ## 💡 Key Insights & Information (structured bullet points, categorized by topic if applicable)
   - ## ✅ Action Items & Decisions (use - [ ] checkboxes for actionable takeaways or tasks mentioned)
   - ## 📊 Data & Specifications (if numbers, tables, dates, contacts, or metrics are present, format as a clean Markdown table or organized list)
   - ## 🔍 Important Excerpts (clean verbatim quotes if significant)
3. Fix typos caused by OCR, resolve broken hyphenations, and ignore repetitive headers/footers/page numbers.
4. If the document is short (e.g. a receipt, business card, or diagram), structure it cleanly to match the format.

RAW EXTRACTED TEXT:
"""
${rawText.slice(0, 15000)}
"""`;

  const res = await callOpenRouterAI({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt: 'You are an elite document intelligence copilot. Clean, synthesize, and output beautifully formatted Markdown notes with zero OCR noise.'
  });

  return res.content;
}

