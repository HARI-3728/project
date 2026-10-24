const express = require('express');
const {
  getDiagnosticServices,
  getDiagnosticServiceById,
  createDiagnosticService,
  bookDiagnostic,
  getMyDiagnosticBookings,
  getHospitalDiagnosticBookings,
  updateDiagnosticBookingStatus,
  uploadDiagnosticReport,
} = require('../controllers/diagnostic.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { handleUpload } = require('../middleware/upload.middleware');

const router = express.Router();

// Services
router.get('/services', getDiagnosticServices);
router.get('/services/:id', getDiagnosticServiceById);
router.post('/services', protect, authorize('hospital'), createDiagnosticService);

// Patient Bookings
router.post('/book', protect, authorize('patient'), bookDiagnostic);
router.get('/my-bookings', protect, authorize('patient'), getMyDiagnosticBookings);

// Hospital Lab Operations
router.get('/hospital-bookings', protect, authorize('hospital'), getHospitalDiagnosticBookings);
router.patch('/bookings/:id/status', protect, authorize('hospital'), updateDiagnosticBookingStatus);
router.post(
  '/bookings/:id/report',
  protect,
  authorize('hospital'),
  handleUpload('report'),
  uploadDiagnosticReport
);

module.exports = router;
