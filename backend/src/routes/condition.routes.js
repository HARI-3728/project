const express = require('express');
const { getConditions } = require('../controllers/appointment.controller');

const router = express.Router();

// @route  GET /api/v1/conditions
// @desc   Get all 60 conditions categorized for appointment selection
// @access Public
router.get('/', getConditions);

module.exports = router;
