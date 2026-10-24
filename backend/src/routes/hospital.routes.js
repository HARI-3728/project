const express = require('express');
const {
  getMyHospitalProfile,
  updateMyHospitalProfile,
  getHospitalDashboard,
  getAllHospitals,
  getHospitalById,
} = require('../controllers/hospital.controller');
const {
  createBill,
  getHospitalBills,
  getBillById,
  getBillPrintData,
  updateBillPaymentStatus,
  getHospitalOrders,
  updateOrderStatus,
} = require('../controllers/pharmacy.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// Hospital Profile & Dashboard
router.get('/me/profile', protect, authorize('hospital'), getMyHospitalProfile);
router.put('/me/profile', protect, authorize('hospital'), updateMyHospitalProfile);
router.get('/me/dashboard', protect, authorize('hospital'), getHospitalDashboard);

// Hospital Orders & Billing Management
router.get('/orders', protect, authorize('hospital'), getHospitalOrders);
router.patch('/orders/:id/status', protect, authorize('hospital'), updateOrderStatus);
router.post('/bills', protect, authorize('hospital'), createBill);
router.get('/bills', protect, authorize('hospital'), getHospitalBills);
router.get('/bills/:id', protect, authorize('hospital'), getBillById);
router.get('/bills/:id/print-data', protect, authorize('hospital'), getBillPrintData);
router.patch('/bills/:id/payment-status', protect, authorize('hospital'), updateBillPaymentStatus);

// Public Hospital Directory
router.get('/', getAllHospitals);
router.get('/:id', getHospitalById);

module.exports = router;
