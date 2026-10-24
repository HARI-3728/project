const express = require('express');
const {
  getDoctors,
  getDoctorAvailability,
  createAppointment,
  getMyAppointments,
  getAppointmentById,
  getDoctorAppointments,
  getDoctorTodayAppointments,
  updateAppointmentStatus,
  cancelAppointment,
  getAppointmentCounts,
} = require('../controllers/appointment.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// Public / Protected Helpers for Appointment Booking
router.get('/doctors', getDoctors);
router.get('/doctor-availability/:doctorId', getDoctorAvailability);

// Patient Appointment Endpoints
router.post('/', protect, authorize('patient'), createAppointment);
router.get('/my', protect, authorize('patient'), getMyAppointments);
router.get('/counts', protect, authorize('patient'), getAppointmentCounts);

// Doctor Appointment Endpoints
router.get('/doctor', protect, authorize('doctor'), getDoctorAppointments);
router.get('/doctor/today', protect, authorize('doctor'), getDoctorTodayAppointments);
router.patch('/:id/status', protect, authorize('doctor'), updateAppointmentStatus);

// Shared Endpoints
router.get('/:id', protect, getAppointmentById);
router.patch('/:id/cancel', protect, cancelAppointment);

module.exports = router;
