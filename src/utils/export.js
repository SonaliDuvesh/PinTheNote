/**
 * Export helpers for Notes and Documents with full Markdown-to-HTML rendering
 */
import html2canvas from 'html2canvas';

/**
 * Converts Markdown text into styled HTML elements
 */
export function markdownToHtml(md) {
  if (!md) return '';

  const lines = md.split('\n');
  const out = [];
  let i = 0;

  // Inline formatting parser
  function parseInline(text) {
    if (!text) return '';
    let result = escapeHtml(text);

    // Links [text](url)
    result = result.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">$1</a>');
    
    // Bold **text**
    result = result.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:700;color:#b85d43;">$1</strong>');
    
    // Italic *text*
    result = result.replace(/\*(.*?)\*/g, '<em style="font-style:italic;">$1</em>');
    
    // Strikethrough ~~text~~
    result = result.replace(/~~(.*?)~~/g, '<del style="text-decoration:line-through;opacity:0.6;">$1</del>');
    
    // Highlight ==text==
    result = result.replace(/==(.*?)==/g, '<mark style="background:#fef08a;padding:2px 4px;border-radius:4px;color:#1e1c1a;">$1</mark>');
    
    // Inline code `code`
    result = result.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.06);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;color:#b85d43;border:1px solid rgba(0,0,0,0.08);">$1</code>');

    return result;
  }

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      i++; // skip closing ```
      out.push(`
        <div style="margin:16px 0;border-radius:8px;overflow:hidden;background:#1e1c1a;color:#eeebe6;font-family:monospace;font-size:13px;border:1px solid #3d3a37;">
          ${lang ? `<div style="padding:6px 12px;background:#292724;border-bottom:1px solid #3d3a37;font-size:11px;color:#a8a29e;text-transform:uppercase;font-weight:bold;">${escapeHtml(lang)}</div>` : ''}
          <pre style="padding:14px;margin:0;overflow-x:auto;line-height:1.5;"><code>${codeLines.join('\n')}</code></pre>
        </div>
      `);
      continue;
    }

    // 2. Table
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 1) {
        const headerRow = tableLines[0].split('|').map(s => s.trim()).filter(Boolean);
        let dataRows = tableLines.slice(1);
        if (dataRows.length > 0 && dataRows[0].includes('---')) {
          dataRows = dataRows.slice(1);
        }
        let tableHtml = `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;border:1px solid #e5e0d8;">`;
        tableHtml += `<thead style="background:#f5f0e6;font-weight:bold;"><tr>`;
        headerRow.forEach(h => {
          tableHtml += `<th style="padding:8px 12px;border:1px solid #e5e0d8;text-align:left;">${parseInline(h)}</th>`;
        });
        tableHtml += `</tr></thead><tbody>`;
        dataRows.forEach((r, rIdx) => {
          const cells = r.split('|').map(s => s.trim()).filter(Boolean);
          const bg = rIdx % 2 === 0 ? '#fff' : '#faf7f2';
          tableHtml += `<tr style="background:${bg};">`;
          cells.forEach(c => {
            tableHtml += `<td style="padding:8px 12px;border:1px solid #e5e0d8;">${parseInline(c)}</td>`;
          });
          tableHtml += `</tr>`;
        });
        tableHtml += `</tbody></table>`;
        out.push(tableHtml);
      }
      continue;
    }

    // 3. Headings
    if (line.startsWith('#')) {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const headingStyles = {
          1: 'font-size:24px;font-weight:800;color:#b85d43;margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid #e8e2d8;',
          2: 'font-size:20px;font-weight:700;color:#2b2927;margin:20px 0 8px;',
          3: 'font-size:17px;font-weight:700;color:#6b8e23;margin:16px 0 6px;',
          4: 'font-size:15px;font-weight:600;color:#2b2927;margin:14px 0 4px;',
          5: 'font-size:13px;font-weight:600;color:#78716c;margin:12px 0 4px;text-transform:uppercase;',
          6: 'font-size:12px;font-weight:600;color:#a8a29e;margin:10px 0 2px;text-transform:uppercase;'
        };
        out.push(`<h${level} style="${headingStyles[level] || ''}">${parseInline(text)}</h${level}>`);
        i++;
        continue;
      }
    }

    // 4. Blockquote
    if (line.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`
        <blockquote style="margin:14px 0;padding:10px 16px;border-left:4px solid #b85d43;background:rgba(184,93,67,0.06);border-radius:0 8px 8px 0;font-style:italic;color:#44403c;">
          ${quoteLines.map(q => `<p style="margin:4px 0;">${parseInline(q)}</p>`).join('')}
        </blockquote>
      `);
      continue;
    }

    // 5. Horizontal Rule
    if (/^(\-{3,}|\*{3,}|\_{3,})$/.test(line.trim())) {
      out.push(`<hr style="margin:20px 0;border:none;border-top:1px solid #e5e0d8;" />`);
      i++;
      continue;
    }

    // 6. Interactive / Formatted Task list
    const taskMatch = line.match(/^(\s*)[-\*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[2].toLowerCase() === 'x';
      const taskText = taskMatch[3];
      const indent = taskMatch[1].length;
      out.push(`
        <div style="display:flex;align-items:flex-start;margin:6px 0;padding-left:${indent * 16}px;font-size:14px;">
          <span style="display:inline-block;margin-top:2px;margin-right:8px;font-size:15px;color:${isChecked ? '#6b8e23' : '#a8a29e'};">
            ${isChecked ? '☑' : '☐'}
          </span>
          <span style="${isChecked ? 'text-decoration:line-through;opacity:0.6;' : ''}">${parseInline(taskText)}</span>
        </div>
      `);
      i++;
      continue;
    }

    // 7. Unordered list
    if (/^(\s*)[-\*]\s+(.*)$/.test(line)) {
      const match = line.match(/^(\s*)[-\*]\s+(.*)$/);
      const indent = match[1].length;
      out.push(`
        <div style="display:flex;align-items:flex-start;margin:4px 0;padding-left:${indent * 16 + 4}px;font-size:14px;">
          <span style="color:#b85d43;margin-right:8px;font-size:12px;line-height:1.6;">•</span>
          <span style="flex:1;">${parseInline(match[2])}</span>
        </div>
      `);
      i++;
      continue;
    }

    // 8. Ordered list
    if (/^(\s*)(\d+)\.\s+(.*)$/.test(line)) {
      const match = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      const num = match[2];
      const indent = match[1].length;
      out.push(`
        <div style="display:flex;align-items:flex-start;margin:4px 0;padding-left:${indent * 16 + 4}px;font-size:14px;">
          <span style="color:#6b8e23;font-weight:700;font-family:monospace;margin-right:8px;min-width:18px;">${num}.</span>
          <span style="flex:1;">${parseInline(match[3])}</span>
        </div>
      `);
      i++;
      continue;
    }

    // 9. Blank line
    if (!line.trim()) {
      out.push(`<div style="height:10px;"></div>`);
      i++;
      continue;
    }

    // 10. Paragraph
    out.push(`<p style="margin:8px 0;line-height:1.6;font-size:14px;">${parseInline(line)}</p>`);
    i++;
  }

  return out.join('\n');
}

export function exportNoteAsMarkdown(note) {
  const title = note.title || 'Untitled';
  const content = `# ${title}\n\n**Category:** ${note.category || 'General'} | **Updated:** ${new Date(note.updatedAt || Date.now()).toLocaleString()}\n\n---\n\n${note.content || ''}`;
  
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `${sanitizeFilename(title)}.md`);
}

export function exportNoteAsText(note) {
  const title = note.title || 'Untitled';
  const content = `${title.toUpperCase()}\nCategory: ${note.category || 'General'}\nDate: ${new Date(note.updatedAt || Date.now()).toLocaleString()}\n\n${note.content || ''}`;
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${sanitizeFilename(title)}.txt`);
}

export function exportNoteAsJson(note) {
  const title = note.title || 'Untitled';
  const data = JSON.stringify(note, null, 2);
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `${sanitizeFilename(title)}.json`);
}

export function exportAllNotesAsJson(notes) {
  const data = JSON.stringify({ notes, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `PinTheNote_backup_${new Date().toISOString().slice(0, 10)}.json`);
}

export function exportNoteAsHtml(note) {
  const title = note.title || 'Untitled';
  const renderedContent = markdownToHtml(note.content || '');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      max-width: 820px;
      margin: 40px auto;
      padding: 0 20px;
      color: #2b2927;
      background: #faf8f5;
    }
    .document-card {
      background: #fff;
      padding: 36px 40px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #e9e4db;
    }
    .header {
      border-bottom: 2px solid #e8e2d8;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .badge {
      display: inline-block;
      background: #b85d43;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 10px;
      border-radius: 20px;
      margin-bottom: 12px;
    }
    h1 {
      color: #1e1c1a;
      font-size: 28px;
      font-weight: 800;
      margin: 0 0 10px;
      line-height: 1.25;
    }
    .meta {
      font-size: 13px;
      color: #78716c;
    }
    .content-body {
      color: #2b2927;
      font-size: 15px;
    }
    @media (max-width: 640px) {
      body { margin: 15px auto; padding: 0 10px; }
      .document-card { padding: 20px; }
      h1 { font-size: 22px; }
    }
  </style>
</head>
<body>
  <div class="document-card">
    <div class="header">
      <div class="badge">${escapeHtml(note.category || 'General')}</div>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">
        <strong>Last Updated:</strong> ${new Date(note.updatedAt || Date.now()).toLocaleString()}
      </div>
    </div>
    <div class="content-body">
      ${renderedContent || '<p style="opacity:0.5;font-style:italic;">(No content)</p>'}
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, `${sanitizeFilename(title)}.html`);
}

export async function exportNoteAsImage(note) {
  const title = note.title || 'Untitled';
  const renderedContent = markdownToHtml(note.content || '');

  // Create a styled offscreen container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '750px';
  container.style.background = '#faf8f5';
  container.style.padding = '36px';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  container.style.color = '#2b2927';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  container.innerHTML = `
    <div style="background:#ffffff;padding:36px 40px;border-radius:18px;border:1px solid #e9e4db;box-shadow:0 8px 30px rgba(0,0,0,0.06);box-sizing:border-box;">
      <div style="border-bottom:2px solid #e8e2d8;padding-bottom:18px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <span style="display:inline-block;background:#b85d43;color:#ffffff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;">
            ${escapeHtml(note.category || 'General')}
          </span>
          <span style="font-size:11px;font-weight:700;color:#a8a29e;letter-spacing:0.5px;text-transform:uppercase;">
            PinTheNote
          </span>
        </div>
        <h1 style="color:#1e1c1a;font-size:26px;font-weight:800;margin:0 0 8px;line-height:1.25;">
          ${escapeHtml(title)}
        </h1>
        <div style="font-size:12px;color:#78716c;">
          <strong>Updated:</strong> ${new Date(note.updatedAt || Date.now()).toLocaleString()}
        </div>
      </div>
      <div style="color:#2b2927;font-size:15px;line-height:1.6;">
        ${renderedContent || '<p style="opacity:0.5;font-style:italic;">(No content)</p>'}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#faf8f5',
      logging: false
    });

    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${sanitizeFilename(title)}.png`);
      }
    }, 'image/png');
  } catch (err) {
    console.error('Failed to export note as image:', err);
    alert('Failed to export note as image. Please try again.');
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export function printNoteOrPdf(note) {
  const title = note.title || 'Untitled';
  const renderedContent = markdownToHtml(note.content || '');

  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (!printWindow) {
    alert('Please allow popups to export as PDF or Print');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(title)}</title>
        <style>
          @page { margin: 18mm 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1a1a1a;
            line-height: 1.6;
            margin: 0;
            padding: 24px;
            font-size: 13.5px;
          }
          .header {
            border-bottom: 2px solid #b85d43;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .category-tag {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #b85d43;
            margin-bottom: 4px;
          }
          h1 {
            color: #1a1a1a;
            font-size: 24px;
            font-weight: 800;
            margin: 0 0 6px 0;
          }
          .meta {
            font-size: 12px;
            color: #666;
          }
          .content-body {
            margin-top: 16px;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="category-tag">${escapeHtml(note.category || 'General')}</div>
          <h1>${escapeHtml(title)}</h1>
          <div class="meta">
            Updated: ${new Date(note.updatedAt || Date.now()).toLocaleString()}
          </div>
        </div>
        <div class="content-body">
          ${renderedContent || '<p><em>(No content)</em></p>'}
        </div>
        <script>
          window.onload = function() {
            window.focus();
            window.print();
            setTimeout(function() { window.close(); }, 750);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function sanitizeFilename(name) {
  return (name || 'note').replace(/[^a-z0-9_\-\u00C0-\u017F]/gi, '_').toLowerCase();
}

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
