const express = require('express');
const {
  placeOrder,
  getMyOrders,
  getOrderById,
} = require('../controllers/pharmacy.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.post('/', protect, authorize('patient'), placeOrder);
router.get('/my', protect, authorize('patient'), getMyOrders);
router.get('/:id', protect, getOrderById);

module.exports = router;
