const express = require('express');
const { chat, getHealthTips } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

router.post('/chat', protect, aiLimiter, chat);
router.get('/health-tips', getHealthTips);

module.exports = router;
