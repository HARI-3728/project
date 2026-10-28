const logger = require('../utils/logger');
const Prescription = require('../models/Prescription');
const HealthRecord = require('../models/HealthRecord');
const { processDocumentRecord } = require('./document.service');

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
 * System prompt used when answering questions about a specific uploaded document.
 * The {{DOCUMENT_CONTENT}} placeholder is replaced with the document's extracted
 * text right before calling the LLM.
 */
const DOCUMENT_SYSTEM_PROMPT = `You are MediCare+, a healthcare information assistant answering a user's questions about a specific document they uploaded.

GROUNDING RULES - you MUST follow these:
1. Answer ONLY using the document content provided below. Do not use outside medical knowledge.
2. Do NOT diagnose any medical condition.
3. Do NOT prescribe medication or recommend specific dosages.
4. Do NOT advise the user to start, stop, or change any prescription medication.
5. Do NOT claim your answers are medically verified or that they replace a doctor's advice.
6. Do NOT fabricate values, results, or details that are not in the document.
7. If the answer is not in the document, say so clearly instead of guessing.
8. For any emergency or urgent symptoms, advise: "Please call emergency services (112 in India) or go to the nearest hospital immediately."
9. Remind the user that this information is educational only and they should consult a qualified healthcare professional.

DOCUMENT CONTENT:
{{DOCUMENT_CONTENT}}

DOCUMENT METADATA:
- Document name: {{DOCUMENT_NAME}}
- Document type: {{DOCUMENT_TYPE}}
{{EXTRA_METADATA}}

Keep answers concise, clear, and helpful.`;

/**
 * Call the configured LLM provider with an optional system instruction override.
 * Returns { reply: string } or throws an error.
 */
const callLLMWithSystem = async (messages, apiKey, systemInstruction) => {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  const model = process.env.LLM_MODEL;

  if (provider === 'gemini') {
    return callGeminiWithSystem(messages, apiKey, model || 'gemini-1.5-flash', systemInstruction);
  } else if (provider === 'openai') {
    return callOpenAIWithSystem(messages, apiKey, model || 'gpt-4o-mini', systemInstruction);
  } else {
    throw new Error(`Unsupported LLM provider: ${provider}. Use 'gemini' or 'openai'.`);
  }
};

const callGeminiWithSystem = async (messages, apiKey, model, systemInstruction) => {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({ model });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chat = genModel.startChat({
    history,
    systemInstruction,
  });

  const result = await chat.sendMessage(lastMessage.content);
  const reply = result.response.text();
  return { reply };
};

const callOpenAIWithSystem = async (messages, apiKey, model, systemInstruction) => {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: 'system', content: systemInstruction }, ...messages],
    max_tokens: 1024,
    temperature: 0.7,
  });

  const reply = response.choices[0]?.message?.content;
  if (!reply) throw new Error('Empty response from OpenAI');
  return { reply };
};

/**
 * Build the user-visible document context block for the LLM prompt.
 */
const buildDocumentContext = (document) => {
  const lines = [];
  lines.push(`- Document name: ${document.fileName || 'Untitled document'}`);
  lines.push(`- Document type: ${document.documentType || 'Unknown'}`);
  if (document.uploadDate) lines.push(`- Upload date: ${document.uploadDate}`);
  if (document.doctorName) lines.push(`- Doctor: ${document.doctorName}`);
  if (document.hospitalName) lines.push(`- Hospital/Facility: ${document.hospitalName}`);
  if (document.recordDate) lines.push(`- Record date: ${new Date(document.recordDate).toLocaleDateString()}`);
  if (document.prescriptionDate) lines.push(`- Prescription date: ${new Date(document.prescriptionDate).toLocaleDateString()}`);
  return lines.join('\n');
};

/**
 * Send a document-grounded question to the AI.
 * document = { id, documentType, fileName, extractedText, ...metadata }
 */
const chatWithDocument = async ({ message, history = [], document }) => {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;

  if (!apiKey) {
    throw new Error('LLM_API_KEY is not configured. Please add your AI API key to the .env file.');
  }

  const extractedText = document.extractedText || '';
  if (!extractedText.trim()) {
    return {
      reply: `I couldn't read any text from "${document.fileName || 'this document'}", so I can't answer questions about its contents. The document may be scanned, image-based, corrupted, or not yet processed. You can retry document processing on its details page, or ask a healthcare professional about it directly.`,
      noContent: true,
    };
  }

  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  const systemInstruction = DOCUMENT_SYSTEM_PROMPT
    .replace('{{DOCUMENT_CONTENT}}', extractedText)
    .replace('{{DOCUMENT_NAME}}', document.fileName || 'Untitled document')
    .replace('{{DOCUMENT_TYPE}}', document.documentType || 'Unknown')
    .replace('{{EXTRA_METADATA}}', buildDocumentContext(document));

  const messages = [
    ...history.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    if (provider === 'gemini') {
      const result = await callGeminiWithSystem(messages, apiKey, model || 'gemini-1.5-flash', systemInstruction);
      return result;
    } else if (provider === 'openai') {
      const result = await callOpenAIWithSystem(messages, apiKey, model || 'gpt-4o-mini', systemInstruction);
      return result;
    } else {
      throw new Error(`Unsupported LLM provider: ${provider}. Use 'gemini' or 'openai'.`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('AI service timed out. Please try again.');
    }
    logger.error(`AI document service error: ${error.message}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Authorize the current user to read a specific document record.
 */
const canViewDocument = (document, currentUser) => {
  if (!document || !currentUser) return false;
  const userId = currentUser._id.toString();
  if (document.patient && document.patient.toString() === userId) return true;
  if (currentUser.role === 'hospital') return true;
  const doctorId = document.doctor && document.doctor._id ? document.doctor._id : document.doctor;
  if (doctorId && doctorId.toString() === userId) return true;
  if (Array.isArray(document.sharedWith) && document.sharedWith.map(String).includes(userId)) return true;
  return false;
};

/**
 * Resolve and load a document by id and type, checking it exists.
 */
const loadDocument = async (documentId, documentType) => {
  if (documentType === 'prescription') {
    return Prescription.findById(documentId).populate('doctor', 'name');
  } else if (documentType === 'health-record') {
    return HealthRecord.findById(documentId);
  } else {
    throw new Error('Invalid document type. Use "prescription" or "health-record".');
  }
};

/**
 * Attempt (or retry) text extraction for a document and return the refreshed record.
 */
const ensureDocumentProcessed = async (DocumentModel, docId) => {
  return processDocumentRecord(DocumentModel, docId);
};

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

module.exports = { chat, chatWithDocument, loadDocument, canViewDocument, ensureDocumentProcessed };
