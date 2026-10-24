const express = require('express');
const { getMyMedicalHistory } = require('../controllers/medicalHistory.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/my', protect, authorize('patient'), getMyMedicalHistory);
router.get('/', protect, authorize('patient'), getMyMedicalHistory);

module.exports = router;
