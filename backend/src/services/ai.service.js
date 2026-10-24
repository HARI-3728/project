const logger = require('../utils/logger');

// System prompt for the healthcare AI assistant
const SYSTEM_PROMPT = `You are MediCare+, a helpful healthcare information assistant. 

Your role is to:
- Answer general healthcare educational questions
- Explain basic medical terminology in simple language
- Provide general preventive health information
- Help users understand and navigate MediCare+ app features
- Provide general food, nutrition, and hydration information
- Encourage professional medical consultation when appropriate

IMPORTANT RESTRICTIONS - You MUST follow these:
1. Do NOT diagnose any medical condition
2. Do NOT prescribe medication or recommend specific dosages
3. Do NOT advise starting, stopping, or changing any prescription medication
4. Do NOT claim that your answers are medically verified or replace a doctor's advice
5. Do NOT fabricate medical studies, statistics, or clinical evidence
6. For any emergency or urgent symptoms, always advise: "Please call emergency services (112 in India) or go to the nearest hospital immediately."
7. Always remind users that your information is educational only and they should consult a qualified healthcare professional for medical advice.

You are friendly, empathetic, and clear in your communication. Keep responses concise and helpful.`;

/**
 * Call the configured LLM provider.
 * Returns { reply: string } or throws an error.
 */
const callLLM = async (messages) => {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;

  if (!apiKey) {
    throw new Error('LLM_API_KEY is not configured. Please add your AI API key to the .env file.');
  }

  if (provider === 'gemini') {
    return callGemini(messages, apiKey, model || 'gemini-1.5-flash');
  } else if (provider === 'openai') {
    return callOpenAI(messages, apiKey, model || 'gpt-4o-mini');
  } else {
    throw new Error(`Unsupported LLM provider: ${provider}. Use 'gemini' or 'openai'.`);
  }
};

const callGemini = async (messages, apiKey, model) => {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({ model });

  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chat = genModel.startChat({
    history,
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await chat.sendMessage(lastMessage.content);
  const reply = result.response.text();
  return { reply };
};

const callOpenAI = async (messages, apiKey, model) => {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    max_tokens: 1024,
    temperature: 0.7,
  });

  const reply = response.choices[0]?.message?.content;
  if (!reply) throw new Error('Empty response from OpenAI');
  return { reply };
};

/**
 * Send a chat message to the AI and get a response.
 */
const chat = async (userMessage, conversationHistory = []) => {
  // Build messages array (do not include sensitive patient medical data)
  const messages = [
    ...conversationHistory.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const result = await callLLM(messages);
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('AI service timed out. Please try again.');
    }
    logger.error(`AI service error: ${error.message}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { chat };
