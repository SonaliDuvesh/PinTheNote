import React, { useState } from 'react';
import { Copy, Check, ExternalLink, CheckSquare, Square } from 'lucide-react';

/**
 * Custom High-Performance Markdown Renderer
 * Supports: Headings (H1-H6), Code Blocks with copy, Tables, Task lists with interactive checkboxes,
 * Blockquotes, Lists (ordered & unordered), Links, Bold, Italic, Strikethrough, Highlight, Inline code.
 */
export default function MarkdownRenderer({ 
  content = '', 
  darkMode = false, 
  onToggleCheckbox = null, // (lineIndex, isChecked) => void
  className = '' 
}) {
  const [copiedBlockIndex, setCopiedBlockIndex] = useState(null);

  const handleCopyCode = (codeText, index) => {
    navigator.clipboard.writeText(codeText);
    setCopiedBlockIndex(index);
    setTimeout(() => setCopiedBlockIndex(null), 2000);
  };

  // Helper to parse inline styles (bold, italic, code, link, highlight, strikethrough)
  const renderInline = (text) => {
    if (!text) return null;

    // Tokenize inline markdown patterns
    // Regex matches: [link](url), `code`, **bold**, *italic*, ~~strike~~, ==highlight==
    const tokens = [];
    const inlineRegex = /(\[.*?\]\(.*?\)|\`[^\`]+\`|\*\*[^\*]+\*\*|\*[^\*]+\*|\~\~[^\~]+\~\~|\=\=[^\=]+\=\=)/g;
    let lastIndex = 0;
    let match;

    while ((match = inlineRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: 'text', val: text.substring(lastIndex, match.index) });
      }

      const matchStr = match[0];
      if (matchStr.startsWith('[') && matchStr.includes('](')) {
        const linkText = matchStr.substring(1, matchStr.indexOf(']('));
        const linkUrl = matchStr.substring(matchStr.indexOf('](') + 2, matchStr.length - 1);
        tokens.push({ type: 'link', text: linkText, url: linkUrl });
      } else if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
        tokens.push({ type: 'code', val: matchStr.slice(1, -1) });
      } else if (matchStr.startsWith('**') && matchStr.endsWith('**')) {
        tokens.push({ type: 'bold', val: matchStr.slice(2, -2) });
      } else if (matchStr.startsWith('*') && matchStr.endsWith('*')) {
        tokens.push({ type: 'italic', val: matchStr.slice(1, -1) });
      } else if (matchStr.startsWith('~~') && matchStr.endsWith('~~')) {
        tokens.push({ type: 'strike', val: matchStr.slice(2, -2) });
      } else if (matchStr.startsWith('==') && matchStr.endsWith('==')) {
        tokens.push({ type: 'highlight', val: matchStr.slice(2, -2) });
      }

      lastIndex = match.index + matchStr.length;
    }

    if (lastIndex < text.length) {
      tokens.push({ type: 'text', val: text.substring(lastIndex) });
    }

    return tokens.map((token, i) => {
      switch (token.type) {
        case 'bold':
          return <strong key={i} className="font-bold text-terracotta dark:text-[#f3a47e]">{token.val}</strong>;
        case 'italic':
          return <em key={i} className="italic opacity-90">{token.val}</em>;
        case 'strike':
          return <del key={i} className="line-through opacity-60">{token.val}</del>;
        case 'highlight':
          return (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/60 dark:text-yellow-100 px-1 py-0.5 rounded text-inherit">
              {token.val}
            </mark>
          );
        case 'code':
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 mx-0.5 text-[0.88em] font-mono rounded bg-black/5 dark:bg-white/10 text-terracotta dark:text-[#f3a47e] border border-black/10 dark:border-white/10"
            >
              {token.val}
            </code>
          );
        case 'link':
          return (
            <a
              key={i}
              href={token.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 font-medium"
            >
              <span>{token.text}</span>
              <ExternalLink size={10} className="opacity-70 inline" />
            </a>
          );
        default:
          return <span key={i}>{token.val}</span>;
      }
    });
  };

  // Block level parser
  const lines = (content || '').split('\n');
  const elements = [];
  let i = 0;
  let codeBlockCounter = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Block (```lang)
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      const blockIndex = codeBlockCounter++;
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const fullCode = codeLines.join('\n');

      elements.push(
        <div 
          key={`code-${blockIndex}-${i}`} 
          className="my-3 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#1e1c1a] text-[#eeebe6] shadow-sm font-mono text-xs"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#292724] border-b border-[#3d3a37] text-[11px] text-gray-400">
            <span className="font-semibold uppercase tracking-wider">{lang || 'CODE'}</span>
            <button
              onClick={() => handleCopyCode(fullCode, blockIndex)}
              className="flex items-center gap-1 hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-white/10"
              title="Copy code"
            >
              {copiedBlockIndex === blockIndex ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400 text-[10px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span className="text-[10px]">Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 overflow-x-auto text-[12px] leading-relaxed select-text">
            <code>{fullCode}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 2. Table (| col1 | col2 |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 1) {
        const headerRow = tableLines[0].split('|').map(s => s.trim()).filter(Boolean);
        let dataRows = tableLines.slice(1);
        // Skip separator row (|---|---|)
        if (dataRows.length > 0 && dataRows[0].includes('---')) {
          dataRows = dataRows.slice(1);
        }

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-xl border border-inherit">
            <table className="min-w-full text-xs text-left divide-y divide-inherit">
              <thead className="bg-black/5 dark:bg-white/5 font-bold">
                <tr>
                  {headerRow.map((cell, cIdx) => (
                    <th key={cIdx} className="px-3 py-2 border-r last:border-r-0 border-inherit">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {dataRows.map((rowStr, rIdx) => {
                  const cells = rowStr.split('|').map(s => s.trim()).filter(Boolean);
                  return (
                    <tr key={rIdx} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-1.5 border-r last:border-r-0 border-inherit">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 3. Headings (# H1, ## H2, ### H3, #### H4)
    if (line.startsWith('#')) {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const headingClasses = [
          'text-2xl font-black mt-4 mb-2 pb-1 border-b border-inherit text-terracotta dark:text-[#f3a47e]', // H1
          'text-xl font-bold mt-3 mb-1.5 text-textHeading dark:text-[#eeebe6]', // H2
          'text-lg font-bold mt-2.5 mb-1 text-sage dark:text-[#a0b8ad]', // H3
          'text-base font-semibold mt-2 mb-1', // H4
          'text-sm font-semibold mt-1.5 mb-0.5 uppercase tracking-wider', // H5
          'text-xs font-semibold mt-1 mb-0.5 uppercase text-gray-500' // H6
        ][level - 1] || 'text-base font-bold';

        elements.push(
          <div key={`h-${i}`} className={headingClasses}>
            {renderInline(text)}
          </div>
        );
        i++;
        continue;
      }
    }

    // 4. Blockquote (> text)
    if (line.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote 
          key={`quote-${i}`} 
          className="my-2.5 pl-3.5 py-1 border-l-4 border-terracotta bg-terracotta/5 dark:bg-terracotta/10 rounded-r-lg italic text-xs sm:text-sm space-y-1"
        >
          {quoteLines.map((q, qIdx) => (
            <p key={qIdx}>{renderInline(q)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 5. Horizontal Rule (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|\_{3,})$/.test(line.trim())) {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-t border-black/10 dark:border-white/10" />);
      i++;
      continue;
    }

    // 6. Interactive Task Checklist (- [ ] or - [x])
    const taskMatch = line.match(/^(\s*)[-\*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const lineIdx = i;
      const isChecked = taskMatch[2].toLowerCase() === 'x';
      const taskText = taskMatch[3];
      const indent = taskMatch[1].length;

      elements.push(
        <div 
          key={`task-${lineIdx}`} 
          className="flex items-start gap-2 py-1 text-xs sm:text-sm group/task select-text"
          style={{ paddingLeft: `${indent * 12}px` }}
        >
          <button
            type="button"
            onClick={() => onToggleCheckbox && onToggleCheckbox(lineIdx, !isChecked)}
            className={`mt-0.5 shrink-0 rounded transition-transform active:scale-90 ${
              onToggleCheckbox ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
            }`}
          >
            {isChecked ? (
              <CheckSquare size={16} className="text-sage fill-sage/20 stroke-sage" />
            ) : (
              <Square size={16} className="text-gray-400 hover:text-terracotta transition-colors" />
            )}
          </button>
          <span className={`flex-1 ${isChecked ? 'line-through opacity-50' : ''}`}>
            {renderInline(taskText)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // 7. Unordered Bullet List (- or *)
    if (/^(\s*)[-\*]\s+(.*)$/.test(line)) {
      const match = line.match(/^(\s*)[-\*]\s+(.*)$/);
      const indent = match[1].length;
      elements.push(
        <div 
          key={`ul-${i}`} 
          className="flex items-start gap-2 py-0.5 text-xs sm:text-sm"
          style={{ paddingLeft: `${indent * 12 + 4}px` }}
        >
          <span className="text-terracotta mt-1 text-[10px] leading-none">•</span>
          <span className="flex-1">{renderInline(match[2])}</span>
        </div>
      );
      i++;
      continue;
    }

    // 8. Ordered List (1. 2. 3.)
    if (/^(\s*)(\d+)\.\s+(.*)$/.test(line)) {
      const match = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      const num = match[2];
      const indent = match[1].length;
      elements.push(
        <div 
          key={`ol-${i}`} 
          className="flex items-start gap-2 py-0.5 text-xs sm:text-sm"
          style={{ paddingLeft: `${indent * 12 + 4}px` }}
        >
          <span className="text-sage font-bold font-mono text-xs">{num}.</span>
          <span className="flex-1">{renderInline(match[3])}</span>
        </div>
      );
      i++;
      continue;
    }

    // 9. Blank line
    if (!line.trim()) {
      elements.push(<div key={`blank-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // 10. Standard Paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1 text-xs sm:text-sm leading-relaxed select-text">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return (
    <div className={`markdown-body font-sans space-y-0.5 select-text ${className}`}>
      {elements.length > 0 ? elements : <p className="opacity-40 italic text-xs">No content to preview</p>}
    </div>
  );
}
