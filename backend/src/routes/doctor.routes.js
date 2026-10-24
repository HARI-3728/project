const express = require('express');
const {
  getMyDoctorProfile,
  updateMyDoctorProfile,
  getDoctorDashboard,
  getAllDoctors,
  getDoctorById,
} = require('../controllers/doctor.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/me/profile', protect, authorize('doctor'), getMyDoctorProfile);
router.put('/me/profile', protect, authorize('doctor'), updateMyDoctorProfile);
router.get('/me/dashboard', protect, authorize('doctor'), getDoctorDashboard);
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);

module.exports = router;
