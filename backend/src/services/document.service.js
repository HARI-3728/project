const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');

// Minimum characters required to consider a document's text extractable.
// Text-based PDFs usually yield far more than this; scanned/image PDFs yield none.
const MIN_TEXT_LENGTH = 40;

const UPLOAD_ROOT = path.resolve(__dirname, '..', '..', 'uploads');

/**
 * Make pdfjs-dist resolve its optional `canvas` dependency to @napi-rs/canvas
 * (already a project dependency) instead of the missing `canvas` package. This
 * keeps scanned-PDF OCR working without adding new native dependencies.
 */
const ensureCanvasShim = () => {
  const Module = require('module');
  const origResolve = Module._resolveFilename;
  const canvasResolve = require.resolve('@napi-rs/canvas');
  Module._resolveFilename = function (request, ...rest) {
    if (request === 'canvas') {
      return canvasResolve;
    }
    return origResolve.call(this, request, ...rest);
  };
};

/**
 * OCR an image file (JPEG/PNG) with tesseract.js (English trained data bundled).
 */
const ocrImageFile = async (filePath) => {
  const worker = await createWorker('eng');
  try {
    const result = await worker.recognize(filePath);
    return result.data.text || '';
  } finally {
    await worker.terminate();
  }
};

/**
 * Extract embedded text from a text-based PDF with pdf-parse.
 */
const extractPdfText = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text || '';
};

/**
 * OCR fallback for scanned/image-based PDFs: render each page via pdfjs-dist
 * onto an @napi-rs/canvas surface and OCR the rendered image.
 */
const ocrScannedPdf = async (filePath) => {
  ensureCanvasShim();
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  const { createCanvas } = require('@napi-rs/canvas');

  const dataBuffer = fs.readFileSync(filePath);
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(dataBuffer) }).promise;
  const worker = await createWorker('eng');
  let combinedText = '';
  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d', { pixelFormat: 'RGB' });
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, viewport.width, viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const pageBuffer = canvas.toBuffer('image/png');
      const result = await worker.recognize(pageBuffer);
      combinedText += `${result.data.text || ''}\n`;
    }
  } finally {
    await worker.terminate();
  }
  return combinedText;
};

/**
 * Extract text from an uploaded document file.
 * Returns { extractedText: string|null, ocrNote: string|null }.
 */
const extractDocumentText = async (filePath, mimetype) => {
  let extractedText = '';
  let ocrNote = null;

  if (mimetype.startsWith('image/')) {
    extractedText = await ocrImageFile(filePath);
  } else if (mimetype === 'application/pdf') {
    let pdfText = '';
    try {
      pdfText = await extractPdfText(filePath);
    } catch (pdfError) {
      // pdf-parse may fail on malformed or scanned PDFs; fall back to OCR below.
      pdfText = '';
    }
    extractedText = pdfText;
    if (extractedText.trim().length < MIN_TEXT_LENGTH) {
      // Likely a scanned/image-based PDF (or pdf-parse failed): attempt OCR fallback.
      try {
        const ocrText = await ocrScannedPdf(filePath);
        if (ocrText.trim().length >= MIN_TEXT_LENGTH) {
          extractedText = ocrText;
        } else {
          ocrNote = 'This appears to be a scanned or image-based PDF. Automatic OCR could not extract readable text from it in this environment.';
        }
      } catch (ocrError) {
        ocrNote = 'No embedded text was found in this PDF, and the OCR fallback could not be performed in this environment.';
      }
    }
  }

  return {
    extractedText: extractedText.trim() || null,
    ocrNote,
  };
};

/**
 * Resolve the absolute filesystem path for a stored document record.
 * fileUrl is stored as /uploads/<userId>/<filename>.
 */
const resolveDocumentFilePath = (record) => {
  if (!record || !record.fileUrl) {
    return null;
  }
  const fileName = path.basename(record.fileUrl);
  const dir = path.join(UPLOAD_ROOT, record.patient.toString());
  const filePath = path.join(dir, fileName);
  // Prevent path traversal: the resolved path must stay inside the user's upload dir.
  const realDir = path.resolve(dir);
  const realFile = path.resolve(filePath);
  if (!realFile.startsWith(realDir + path.sep) && realFile !== realDir) {
    return null;
  }
  return filePath;
};

/**
 * Process a stored document record: extract text, persist results, return the record.
 * Sets processingStatus to 'completed' or 'failed' and never throws for
 * extraction-only problems (those are recorded as completed with a note).
 */
const processDocumentRecord = async (DocumentModel, docId) => {
  const document = await DocumentModel.findById(docId);
  if (!document) {
    throw new Error('Document not found.');
  }

  document.processingStatus = 'pending';
  document.processingError = null;
  document.extractedText = null;
  document.ocrNote = null;
  await document.save();

  if (!document.fileUrl) {
    document.processingStatus = 'completed';
    document.ocrNote = 'No file was attached to this document.';
    await document.save();
    return document;
  }

  const filePath = resolveDocumentFilePath(document);
  if (!filePath || !fs.existsSync(filePath)) {
    document.processingStatus = 'failed';
    document.processingError = 'The uploaded file could not be found on the server.';
    await document.save();
    return document;
  }

  try {
    const { extractedText, ocrNote } = await extractDocumentText(filePath, document.fileType || 'application/octet-stream');
    document.extractedText = extractedText;
    document.ocrNote = ocrNote;
    document.processingStatus = extractedText ? 'completed' : 'completed';
    if (!extractedText) {
      document.ocrNote = ocrNote || 'No readable text could be extracted from this document.';
    }
    document.extractedAt = new Date();
    await document.save();
    return document;
  } catch (error) {
    document.processingStatus = 'failed';
    document.processingError = error.message || 'Document processing failed.';
    document.extractedAt = new Date();
    await document.save();
    return document;
  }
};

module.exports = {
  extractDocumentText,
  resolveDocumentFilePath,
  processDocumentRecord,
  MIN_TEXT_LENGTH,
};
