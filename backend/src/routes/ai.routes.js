const express = require('express');
const { chat, chatWithDocument, getHealthTips } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { aiLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

// MediCare AI is PATIENT ONLY - only patients can access chat endpoints
router.post('/chat', protect, authorize('patient'), aiLimiter, chat);
router.post('/chat/document', protect, authorize('patient'), aiLimiter, chatWithDocument);

// Health tips are public
router.get('/health-tips', getHealthTips);

module.exports = router;
