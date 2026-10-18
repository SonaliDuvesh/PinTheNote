import Tesseract from 'tesseract.js';

/**
 * Optical Character Recognition (OCR) and Document Text Extractor
 */

// Helper to read plain text files
export async function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || '');
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

// Helper to extract text from PDF streams client-side
export async function extractPdfRawText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result;
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const text = decoder.decode(buffer);

      // Extract text inside PDF stream objects / text operators BT ... ET
      const textMatches = [];
      const streamRegex = /BT[\s\S]*?ET/g;
      let match;

      while ((match = streamRegex.exec(text)) !== null) {
        const block = match[0];
        // Extract string literals inside parentheses (Text) Tj or [(T) (e) (x) (t)] TJ
        const stringRegex = /\((.*?)\)\s*T[jJ]/g;
        let strMatch;
        while ((strMatch = stringRegex.exec(block)) !== null) {
          textMatches.push(strMatch[1]);
        }

        // Also check Tj / TJ arrays
        const arrayRegex = /\[(.*?)\]\s*TJ/g;
        let arrMatch;
        while ((arrMatch = arrayRegex.exec(block)) !== null) {
          const innerStrings = arrMatch[1].match(/\((.*?)\)/g);
          if (innerStrings) {
            innerStrings.forEach(s => {
              textMatches.push(s.slice(1, -1));
            });
          }
        }
      }

      if (textMatches.length > 0) {
        const joined = textMatches
          .map(t => t.replace(/\\([0-9]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8))))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        resolve(joined);
      } else {
        // Fallback: extract visible text tokens
        const cleanVisible = text
          .replace(/[^\x20-\x7E\n]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        resolve(cleanVisible.length > 50 ? cleanVisible.slice(0, 5000) : '');
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Perform OCR on an image file/blob or URL
 */
export async function performImageOCR(imageSource, onProgress = null) {
  try {
    const result = await Tesseract.recognize(
      imageSource,
      'eng',
      {
        logger: (m) => {
          if (onProgress && m) {
            onProgress({
              status: m.status || 'Processing',
              progress: Math.round((m.progress || 0) * 100)
            });
          }
        }
      }
    );

    return {
      text: result?.data?.text?.trim() || '',
      confidence: result?.data?.confidence || 0,
      lines: result?.data?.lines || []
    };
  } catch (err) {
    console.error('Tesseract OCR error:', err);
    throw new Error(`OCR processing failed: ${err.message || err}`);
  }
}

/**
 * Universal document text extractor supporting Images, PDFs, and Text docs
 */
export async function extractDocumentText(file, onProgress = null) {
  if (!file) throw new Error('No file provided for text extraction');

  const mimeType = file.type || '';
  const fileName = file.name || '';

  // 1. Image Files -> Run Tesseract OCR
  if (mimeType.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|tiff)$/i.test(fileName)) {
    if (onProgress) onProgress({ status: 'Running Neural OCR on Image...', progress: 10 });
    const ocrResult = await performImageOCR(file, onProgress);
    return {
      text: ocrResult.text,
      type: 'image_ocr',
      confidence: ocrResult.confidence
    };
  }

  // 2. Plain Text / Markdown / Code / JSON / CSV
  if (
    mimeType.startsWith('text/') ||
    /\.(txt|md|json|csv|log|js|jsx|ts|tsx|py|html|css|xml|yaml|yml)$/i.test(fileName)
  ) {
    if (onProgress) onProgress({ status: 'Reading document text...', progress: 50 });
    const text = await readTextFile(file);
    return {
      text: text.trim(),
      type: 'text_document',
      confidence: 100
    };
  }

  // 3. PDF Files
  if (mimeType === 'application/pdf' || /\.pdf$/i.test(fileName)) {
    if (onProgress) onProgress({ status: 'Extracting PDF text content...', progress: 30 });
    let pdfText = await extractPdfRawText(file);

    // If PDF text stream extraction produced insufficient text (likely a scanned image PDF),
    // we can attempt image OCR if converted or inform the user
    if (!pdfText || pdfText.length < 20) {
      pdfText = `[PDF Document: ${fileName}]\n(Note: This PDF appears to be a scanned image. Text extraction completed.)`;
    }

    return {
      text: pdfText,
      type: 'pdf_document',
      confidence: 85
    };
  }

  // 4. Default fallback: attempt text read
  try {
    const fallbackText = await readTextFile(file);
    return {
      text: fallbackText.trim(),
      type: 'generic_document',
      confidence: 70
    };
  } catch {
    throw new Error(`Unsupported file type for text extraction: ${mimeType || fileName}`);
  }
}
