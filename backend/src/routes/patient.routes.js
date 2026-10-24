const express = require('express');
const {
  getMyProfile,
  updateMyProfile,
  getPatientDashboard,
  getPatientById,
} = require('../controllers/patient.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/me/profile', protect, authorize('patient'), getMyProfile);
router.put('/me/profile', protect, authorize('patient'), updateMyProfile);
router.get('/me/dashboard', protect, authorize('patient'), getPatientDashboard);
router.get('/:id', protect, authorize('doctor', 'hospital'), getPatientById);

module.exports = router;
