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
  getHealthTips,
};
