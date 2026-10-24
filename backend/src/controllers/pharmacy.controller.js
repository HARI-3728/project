const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
const Bill = require('../models/Bill');
const Hospital = require('../models/Hospital');
const Prescription = require('../models/Prescription');
const mongoose = require('mongoose');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const {
  notifyOrderStatusUpdate,
  notifyHospitalNewOrder,
  notifyBillGenerated,
} = require('../services/notification.service');

// ─── MEDICINES ───────────────────────────────────────────────────────────────

// @desc   Get all medicines
// @route  GET /api/v1/medicines
// @access Public
const getMedicines = async (req, res, next) => {
  try {
    const { search, requiresPrescription, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    if (search) query.name = { $regex: search, $options: 'i' };
    if (requiresPrescription !== undefined)
      query.requiresPrescription = requiresPrescription === 'true';

    const skip = (page - 1) * limit;
    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .select('-__v')
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, medicines, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Get single medicine
// @route  GET /api/v1/medicines/:id
// @access Public
const getMedicineById = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine || !medicine.isActive) return sendError(res, 404, 'Medicine not found.');
    return sendSuccess(res, 200, 'Medicine retrieved', medicine);
  } catch (error) {
    next(error);
  }
};

// ─── ORDERS ─────────────────────────────────────────────────────────────────

// @desc   Place a medicine order
// @route  POST /api/v1/orders
// @access Private (Patient)
const placeOrder = async (req, res, next) => {
  try {
    const { items, prescriptionId, notes, idempotencyKey } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, 'Order must contain at least one item.');
    }

    // Idempotency check
    if (idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey });
      if (existing) {
        return sendSuccess(res, 200, 'Order already placed (idempotent)', existing);
      }
    }

    let subtotal = 0;
    const orderItems = [];
    const prescriptionRequiredItems = [];

    for (const item of items) {
      if (!item.medicineId || !item.quantity || item.quantity < 1) {
        return sendError(res, 400, 'Each item must have a valid medicineId and quantity >= 1.');
      }

      const medicine = await Medicine.findById(item.medicineId);
      if (!medicine || !medicine.isActive) {
        return sendError(res, 400, `Medicine with ID ${item.medicineId} is not available.`);
      }

      if (medicine.stockQuantity < item.quantity) {
        return sendError(res, 400, `Insufficient stock for ${medicine.name}. Available: ${medicine.stockQuantity}`);
      }

      if (medicine.requiresPrescription) {
        prescriptionRequiredItems.push(medicine.name);
      }

      const lineTotal = parseFloat((medicine.unitPrice * item.quantity).toFixed(2));
      subtotal += lineTotal;

      orderItems.push({
        medicine: medicine._id,
        medicineName: medicine.name,
        quantity: item.quantity,
        unitPrice: medicine.unitPrice,
        lineTotal,
      });
    }

    // Validate prescription if required
    let prescriptionDoc = null;
    if (prescriptionRequiredItems.length > 0) {
      if (!prescriptionId) {
        return sendError(
          res,
          400,
          `A valid prescription is required for: ${prescriptionRequiredItems.join(', ')}. Please upload your prescription first.`
        );
      }
      prescriptionDoc = await Prescription.findById(prescriptionId);
      if (!prescriptionDoc || prescriptionDoc.patient.toString() !== req.user._id.toString()) {
        return sendError(res, 400, 'Invalid or unauthorized prescription.');
      }
    }

    const totalAmount = parseFloat(subtotal.toFixed(2));

    const order = await Order.create({
      patient: req.user._id,
      items: orderItems,
      subtotal,
      totalAmount,
      prescription: prescriptionDoc?._id || null,
      prescriptionVerified: false,
      notes,
      idempotencyKey: idempotencyKey || undefined,
    });

    // Deduct stock
    for (const item of orderItems) {
      await Medicine.findByIdAndUpdate(
        item.medicine,
        { $inc: { stockQuantity: -item.quantity } }
      );
    }

    // Notify hospital staff (non-blocking)
    notifyHospitalNewOrder(null, order._id, order.orderNumber);

    return sendSuccess(res, 201, 'Order placed successfully', order);
  } catch (error) {
    next(error);
  }
};

// @desc   Get patient's orders
// @route  GET /api/v1/orders/my
// @access Private (Patient)
const getMyOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { patient: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('items.medicine', 'name unit image')
      .populate('prescription', 'fileUrl isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, orders, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Get a single order (patient can only see own)
// @route  GET /api/v1/orders/:id
// @access Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.medicine', 'name unit image')
      .populate('patient', 'name email')
      .populate('bill', 'billNumber totalAmount paymentStatus');

    if (!order) return sendError(res, 404, 'Order not found.');

    // Patient can only see their own order; hospital can see all in their scope
    if (req.user.role === 'patient' && order.patient._id.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied.');
    }

    return sendSuccess(res, 200, 'Order retrieved', order);
  } catch (error) {
    next(error);
  }
};

// ─── HOSPITAL ORDER MANAGEMENT ───────────────────────────────────────────────

// @desc   Hospital gets all orders
// @route  GET /api/v1/hospital/orders
// @access Private (Hospital)
const getHospitalOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const hospital = await Hospital.findOne({ user: req.user._id });
    if (!hospital) return sendError(res, 404, 'Hospital profile not found.');

    const query = { hospital: hospital._id };
    if (status) query.status = status;
    // Also include orders with no hospital assigned (pending assignment)
    const pendingQuery = { hospital: null, status: 'pending' };
    const combinedFilter = status ? query : { $or: [query, pendingQuery] };

    const skip = (page - 1) * limit;
    const total = await Order.countDocuments(combinedFilter);
    const orders = await Order.find(combinedFilter)
      .populate('patient', 'name email phone')
      .populate('prescription', 'fileUrl isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, orders, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Hospital updates order status
// @route  PATCH /api/v1/hospital/orders/:id/status
// @access Private (Hospital)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, cancellationReason } = req.body;
    const VALID = ['confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

    if (!VALID.includes(status)) {
      return sendError(res, 400, `Invalid status. Must be one of: ${VALID.join(', ')}`);
    }

    const hospital = await Hospital.findOne({ user: req.user._id });
    const order = await Order.findById(req.params.id).populate('patient', 'name');
    if (!order) return sendError(res, 404, 'Order not found.');

    order.status = status;
    if (hospital) order.hospital = hospital._id;
    if (status === 'cancelled' && cancellationReason) {
      order.cancellationReason = cancellationReason;
    }
    await order.save();

    // Notify patient
    notifyOrderStatusUpdate(order.patient._id, order._id, order.orderNumber, status);

    return sendSuccess(res, 200, 'Order status updated', order);
  } catch (error) {
    next(error);
  }
};

// ─── BILLING ─────────────────────────────────────────────────────────────────

// @desc   Create a bill
// @route  POST /api/v1/hospital/bills
// @access Private (Hospital)
const createBill = async (req, res, next) => {
  try {
    const { orderId, patientId, items: reqItems, notes, paymentMethod } = req.body;

    const hospital = await Hospital.findOne({ user: req.user._id });
    if (!hospital) {
      return sendError(res, 404, 'Hospital profile not found.');
    }

    // Check for duplicate bill on same order
    if (orderId) {
      const existingBill = await Bill.findOne({ order: orderId });
      if (existingBill) {
        return sendError(res, 409, 'A bill has already been generated for this order.');
      }
    }

    let billItems = [];
    let sourceItems = reqItems;

    // If building from an order, use order items
    if (orderId && !sourceItems) {
      const order = await Order.findById(orderId).populate('items.medicine');
      if (!order) {
        return sendError(res, 404, 'Order not found.');
      }
      sourceItems = order.items.map((i) => ({
        medicineId: i.medicine._id,
        quantity: i.quantity,
      }));
    }

    if (!sourceItems || sourceItems.length === 0) {
      return sendError(res, 400, 'Bill must contain at least one item.');
    }

    let subtotal = 0;
    for (const item of sourceItems) {
      const medicine = await Medicine.findById(item.medicineId);
      if (!medicine || !medicine.isActive) {
        return sendError(res, 400, `Medicine ${item.medicineId} not found.`);
      }
      if (item.quantity < 1) {
        return sendError(res, 400, 'Quantity must be at least 1.');
      }
      const lineTotal = parseFloat((medicine.unitPrice * item.quantity).toFixed(2));
      subtotal += lineTotal;
      billItems.push({
        medicine: medicine._id,
        medicineName: medicine.name,
        quantity: item.quantity,
        unitPrice: medicine.unitPrice,
        lineTotal,
      });
    }

    const taxRate = hospital.taxRate || 0;
    const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));

    const bill = await Bill.create({
      hospital: hospital._id,
      patient: patientId || null,
      order: orderId || null,
      items: billItems,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      paymentStatus: 'unpaid',
      paymentMethod: paymentMethod || null,
      notes,
      generatedBy: req.user._id,
    });

    // Link bill to order and update order status
    if (orderId) {
      await Order.findByIdAndUpdate(
        orderId,
        { bill: bill._id, status: 'confirmed' }
      );
    }

    // Notify patient
    if (patientId) {
      notifyBillGenerated(patientId, bill._id, bill.billNumber, totalAmount);
    }

    return sendSuccess(res, 201, 'Bill generated successfully', bill);
  } catch (error) {
    next(error);
  }
};

// @desc   Get all bills for hospital
// @route  GET /api/v1/hospital/bills
// @access Private (Hospital)
const getHospitalBills = async (req, res, next) => {
  try {
    const { paymentStatus, page = 1, limit = 20 } = req.query;
    const hospital = await Hospital.findOne({ user: req.user._id });
    if (!hospital) return sendError(res, 404, 'Hospital profile not found.');

    const query = { hospital: hospital._id };
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const skip = (page - 1) * limit;
    const total = await Bill.countDocuments(query);
    const bills = await Bill.find(query)
      .populate('patient', 'name email')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, bills, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Get single bill
// @route  GET /api/v1/hospital/bills/:id
// @access Private (Hospital)
const getBillById = async (req, res, next) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user._id });
    const bill = await Bill.findById(req.params.id)
      .populate('patient', 'name email phone')
      .populate('order', 'orderNumber status')
      .populate('generatedBy', 'name');

    if (!bill) return sendError(res, 404, 'Bill not found.');
    if (hospital && bill.hospital.toString() !== hospital._id.toString()) {
      return sendError(res, 403, 'Access denied. This bill belongs to another hospital.');
    }

    return sendSuccess(res, 200, 'Bill retrieved', bill);
  } catch (error) {
    next(error);
  }
};

// @desc   Get print-ready bill data
// @route  GET /api/v1/hospital/bills/:id/print-data
// @access Private (Hospital)
const getBillPrintData = async (req, res, next) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user._id });
    const bill = await Bill.findById(req.params.id)
      .populate('patient', 'name email phone')
      .populate('order', 'orderNumber')
      .lean();

    if (!bill) return sendError(res, 404, 'Bill not found.');

    const printData = {
      billNumber: bill.billNumber,
      date: bill.createdAt,
      hospital: {
        name: hospital?.hospitalName,
        address: hospital?.address,
        phone: hospital?.phone,
        email: hospital?.email,
      },
      patient: bill.patient,
      items: bill.items,
      subtotal: bill.subtotal,
      taxRate: bill.taxRate,
      taxAmount: bill.taxAmount,
      discountAmount: bill.discountAmount || 0,
      totalAmount: bill.totalAmount,
      paymentStatus: bill.paymentStatus,
      paymentMethod: bill.paymentMethod,
    };

    return sendSuccess(res, 200, 'Print data retrieved', printData);
  } catch (error) {
    next(error);
  }
};

// @desc   Update payment status
// @route  PATCH /api/v1/hospital/bills/:id/payment-status
// @access Private (Hospital)
const updateBillPaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    const VALID = ['unpaid', 'paid', 'partially_paid', 'refunded'];
    if (!VALID.includes(paymentStatus)) {
      return sendError(res, 400, `Invalid payment status. Must be one of: ${VALID.join(', ')}`);
    }

    const hospital = await Hospital.findOne({ user: req.user._id });
    const bill = await Bill.findById(req.params.id);
    if (!bill) return sendError(res, 404, 'Bill not found.');
    if (hospital && bill.hospital.toString() !== hospital._id.toString()) {
      return sendError(res, 403, 'Access denied.');
    }

    bill.paymentStatus = paymentStatus;
    if (paymentMethod) bill.paymentMethod = paymentMethod;
    if (paymentStatus === 'paid') bill.paymentDate = new Date();
    await bill.save();

    return sendSuccess(res, 200, 'Payment status updated', bill);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMedicines,
  getMedicineById,
  placeOrder,
  getMyOrders,
  getOrderById,
  getHospitalOrders,
  updateOrderStatus,
  createBill,
  getHospitalBills,
  getBillById,
  getBillPrintData,
  updateBillPaymentStatus,
};
