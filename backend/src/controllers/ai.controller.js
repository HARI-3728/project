const aiService = require('../services/ai.service');
const { sendSuccess, sendError } = require('../utils/response');

// Curated evidence-based preventive health tips
const HEALTH_TIPS = [
  {
    category: 'Hydration',
    tip: 'Aim for 2.5 to 3 liters of water daily to maintain optimal organ function, skin health, and energy levels.',
  },
  {
    category: 'Sleep Hygiene',
    tip: 'Consistent sleep timing helps maintain circadian rhythms. Try turning off screens 45 minutes before sleep.',
  },
  {
    category: 'Heart Health',
    tip: '30 minutes of moderate aerobic exercise 5 days a week substantially reduces hypertension and cardiac risks.',
  },
  {
    category: 'Nutrition',
    tip: 'Incorporate vibrant leafy greens, pulses, and whole grains into your meals for sustained energy and gut microbiome diversity.',
  },
  {
    category: 'Mental Wellness',
    tip: 'Practice mindful breathing for 5 minutes during high-stress periods to trigger parasympathetic relaxation.',
  },
  {
    category: 'Preventive Care',
    tip: 'Schedule annual routine blood panels and blood pressure screenings to detect health changes early.',
  },
];

// @desc   Healthcare AI Chatbot conversation
// @route  POST /api/v1/ai/chat
// @access Private
const chat = async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return sendError(res, 400, 'Please provide a valid text message.');
    }

    const cleanMessage = message.trim();
    const cleanHistory = Array.isArray(history) ? history : [];

    try {
      const aiResult = await aiService.chat(cleanMessage, cleanHistory);
      return sendSuccess(res, 200, 'AI response received', {
        reply: aiResult.reply,
        disclaimer: 'This information is educational only and does not substitute professional medical advice, diagnosis, or treatment.',
        timestamp: new Date().toISOString(),
      });
    } catch (llmError) {
      const isConfigError = llmError.message.includes('LLM_API_KEY is not configured');
      if (isConfigError) {
        return sendError(res, 503, 'AI responses are unavailable because the server AI provider is not configured.');
      }
      throw llmError;
    }
  } catch (error) {
    next(error);
  }
};

// @desc   Ask the AI about a specific uploaded document
// @route  POST /api/v1/ai/chat/document
// @access Private
const chatWithDocument = async (req, res, next) => {
  try {
    const { documentId, documentType, message, history } = req.body;

    if (!documentId || !documentType) {
      return sendError(res, 400, 'Please specify the document to ask about.');
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return sendError(res, 400, 'Please provide a valid text message.');
    }

    let document;
    try {
      document = await aiService.loadDocument(documentId, documentType);
    } catch (loadError) {
      return sendError(res, 400, loadError.message);
    }
    if (!document) {
      return sendError(res, 404, 'Document not found.');
    }

    // Authorization: patients see their own documents; doctors see prescriptions
    // they issued; hospital role and explicitly shared users are also allowed.
    if (!aiService.canViewDocument(document, req.user)) {
      return sendError(res, 403, 'Access denied to this document.');
    }

    // If the document has not been processed yet, attempt extraction now.
    if (document.processingStatus !== 'completed' || !document.extractedText) {
      try {
        const DocumentModel =
          documentType === 'prescription' ? require('../models/Prescription') : require('../models/HealthRecord');
        document = await aiService.ensureDocumentProcessed(DocumentModel, document._id);
      } catch (processError) {
        return sendError(res, 500, 'Document processing failed. Please try again later.');
      }
    }

    // If there is no readable text, do not call the AI at all: report clearly instead.
    if (!document.extractedText || !document.extractedText.trim()) {
      return sendSuccess(res, 200, 'AI response received', {
        reply: `I couldn't read any text from "${document.fileName || 'this document'}", so I can't answer questions about its contents. The document may be scanned, image-based, corrupted, or not yet processed. You can retry document processing on its details page, or ask a healthcare professional about it directly.`,
        noContent: true,
        source: {
          documentId: document._id,
          fileName: document.fileName,
          documentType,
        },
        disclaimer:
          'This information is educational only and does not substitute professional medical advice, diagnosis, or treatment.',
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const aiResult = await aiService.chatWithDocument({
        message: message.trim(),
        history: Array.isArray(history) ? history : [],
        document: {
          id: document._id,
          documentType,
          fileName: document.fileName,
          extractedText: document.extractedText || '',
          doctorName: document.doctor && document.doctor.name ? document.doctor.name : document.doctorName,
          hospitalName: document.hospitalName,
          uploadDate: document.createdAt,
          recordDate: document.recordDate,
          prescriptionDate: document.prescriptionDate,
          processingStatus: document.processingStatus,
          ocrNote: document.ocrNote,
        },
      });

      return sendSuccess(res, 200, 'AI response received', {
        reply: aiResult.reply,
        noContent: aiResult.noContent === true,
        source: {
          documentId: document._id,
          fileName: document.fileName,
          documentType,
        },
        disclaimer:
          'This information is educational only, is generated from the uploaded document text, and does not substitute professional medical advice, diagnosis, or treatment.',
        timestamp: new Date().toISOString(),
      });
    } catch (llmError) {
      const isConfigError = llmError.message.includes('LLM_API_KEY is not configured');
      if (isConfigError) {
        return sendError(res, 503, 'AI responses are unavailable because the server AI provider is not configured.');
      }
      throw llmError;
    }
  } catch (error) {
    next(error);
  }
};

// @desc   Get curated daily wellness tips
// @route  GET /api/v1/ai/health-tips
// @access Public / Private
const getHealthTips = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Daily health tips', HEALTH_TIPS);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  chat,
  chatWithDocument,
  getHealthTips,
};
