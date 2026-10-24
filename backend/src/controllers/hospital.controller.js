const Hospital = require('../models/Hospital');
const Order = require('../models/Order');
const Bill = require('../models/Bill');
const Medicine = require('../models/Medicine');
const { DiagnosticBooking } = require('../models/Diagnostic');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// @desc   Get current logged-in hospital profile
// @route  GET /api/v1/hospital/me/profile
// @access Private (Hospital)
const getMyHospitalProfile = async (req, res, next) => {
  try {
    let hospital = await Hospital.findOne({ user: req.user._id }).populate('user', 'name email phone avatar role');
    if (!hospital) {
      hospital = await Hospital.create({
        user: req.user._id,
        hospitalName: req.user.name || 'MediCare+ Hospital & Clinic',
      });
      hospital = await Hospital.findById(hospital._id).populate('user', 'name email phone avatar role');
    }
    return sendSuccess(res, 200, 'Hospital profile retrieved', hospital);
  } catch (error) {
    next(error);
  }
};

// @desc   Update current hospital profile
// @route  PUT /api/v1/hospital/me/profile
// @access Private (Hospital)
const updateMyHospitalProfile = async (req, res, next) => {
  try {
    const {
      hospitalName,
      registrationNumber,
      type,
      address,
      phone,
      email,
      website,
      departments,
      facilities,
      operatingHours,
      taxRate,
      logo,
    } = req.body;

    let hospital = await Hospital.findOne({ user: req.user._id });
    if (!hospital) {
      hospital = new Hospital({ user: req.user._id });
    }

    if (hospitalName !== undefined) hospital.hospitalName = hospitalName;
    if (registrationNumber !== undefined) hospital.registrationNumber = registrationNumber;
    if (type !== undefined) hospital.type = type;
    if (address !== undefined) hospital.address = address;
    if (phone !== undefined) hospital.phone = phone;
    if (email !== undefined) hospital.email = email;
    if (website !== undefined) hospital.website = website;
    if (departments !== undefined) hospital.departments = departments;
    if (facilities !== undefined) hospital.facilities = facilities;
    if (operatingHours !== undefined) hospital.operatingHours = operatingHours;
    if (taxRate !== undefined) hospital.taxRate = taxRate;
    if (logo !== undefined) hospital.logo = logo;

    await hospital.save();
    const updated = await Hospital.findById(hospital._id).populate('user', 'name email phone avatar role');

    return sendSuccess(res, 200, 'Hospital profile updated', updated);
  } catch (error) {
    next(error);
  }
};

// @desc   Get hospital dashboard overview with revenue and order statistics
// @route  GET /api/v1/hospital/me/dashboard
// @access Private (Hospital)
const getHospitalDashboard = async (req, res, next) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user._id });
    const hospitalId = hospital ? hospital._id : null;

    const [
      pendingOrders,
      totalOrders,
      recentOrders,
      paidBills,
      allBillsCount,
      diagnosticBookingsCount,
      lowStockMeds,
    ] = await Promise.all([
      Order.countDocuments({ status: { $in: ['pending', 'confirmed', 'preparing'] } }),
      Order.countDocuments({}),
      Order.find({})
        .populate('patient', 'name phone email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Bill.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      Bill.countDocuments({}),
      hospitalId ? DiagnosticBooking.countDocuments({ hospital: hospitalId }) : 0,
      Medicine.find({ stockQuantity: { $lt: 20 } }).select('name stockQuantity unitPrice').lean(),
    ]);

    const totalRevenue = paidBills.length > 0 ? paidBills[0].totalRevenue : 0;
    const paidBillsCount = paidBills.length > 0 ? paidBills[0].count : 0;

    const stats = {
      pendingOrders,
      totalOrders,
      totalBills: allBillsCount,
      paidBillsCount,
      totalRevenue,
      diagnosticBookingsCount,
      lowStockCount: lowStockMeds.length,
    };

    return sendSuccess(res, 200, 'Hospital dashboard statistics', {
      hospital,
      stats,
      recentOrders,
      lowStockMeds,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get all active hospitals/clinics
// @route  GET /api/v1/hospital
// @access Public / Private
const getAllHospitals = async (req, res, next) => {
  try {
    const { city, search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }
    if (search) {
      query.$or = [
        { hospitalName: new RegExp(search, 'i') },
        { 'address.city': new RegExp(search, 'i') },
        { departments: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await Hospital.countDocuments(query);
    const hospitals = await Hospital.find(query)
      .populate('user', 'name email phone avatar')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ hospitalName: 1 });

    return sendPaginated(res, hospitals, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Get single hospital details
// @route  GET /api/v1/hospital/:id
// @access Public / Private
const getHospitalById = async (req, res, next) => {
  try {
    const hospital = await Hospital.findOne({
      $or: [{ _id: req.params.id }, { user: req.params.id }],
    }).populate('user', 'name email phone avatar');

    if (!hospital) {
      return sendError(res, 404, 'Hospital not found');
    }

    return sendSuccess(res, 200, 'Hospital details retrieved', hospital);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyHospitalProfile,
  updateMyHospitalProfile,
  getHospitalDashboard,
  getAllHospitals,
  getHospitalById,
};
