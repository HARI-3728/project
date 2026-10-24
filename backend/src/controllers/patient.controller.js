const PatientProfile = require('../models/PatientProfile');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const MedicineReminder = require('../models/MedicineReminder');
const Order = require('../models/Order');
const HealthRecord = require('../models/HealthRecord');
const { sendSuccess, sendError } = require('../utils/response');

// @desc   Get current logged-in patient's profile
// @route  GET /api/v1/patients/me/profile
// @access Private (Patient)
const getMyProfile = async (req, res, next) => {
  try {
    let profile = await PatientProfile.findOne({ user: req.user._id }).populate('user', 'name email phone avatar role');
    if (!profile) {
      // Auto-create default profile if missing
      profile = await PatientProfile.create({ user: req.user._id });
      profile = await PatientProfile.findById(profile._id).populate('user', 'name email phone avatar role');
    }
    return sendSuccess(res, 200, 'Patient profile retrieved', profile);
  } catch (error) {
    next(error);
  }
};

// @desc   Update current patient's profile
// @route  PUT /api/v1/patients/me/profile
// @access Private (Patient)
const updateMyProfile = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyContact,
      allergies,
      chronicConditions,
      height,
      weight,
      insuranceProvider,
      insurancePolicyNumber,
    } = req.body;

    // Update basic User model fields if provided
    if (name || phone) {
      const userUpdates = {};
      if (name) userUpdates.name = name;
      if (phone) userUpdates.phone = phone;
      await User.findByIdAndUpdate(req.user._id, userUpdates, { runValidators: true });
    }

    let profile = await PatientProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new PatientProfile({ user: req.user._id });
    }

    if (dateOfBirth !== undefined) profile.dateOfBirth = dateOfBirth;
    if (gender !== undefined) profile.gender = gender;
    if (bloodGroup !== undefined) profile.bloodGroup = bloodGroup;
    if (address !== undefined) profile.address = address;
    if (emergencyContact !== undefined) profile.emergencyContact = emergencyContact;
    if (allergies !== undefined) profile.allergies = allergies;
    if (chronicConditions !== undefined) profile.chronicConditions = chronicConditions;
    if (height !== undefined) profile.height = height;
    if (weight !== undefined) profile.weight = weight;
    if (insuranceProvider !== undefined) profile.insuranceProvider = insuranceProvider;
    if (insurancePolicyNumber !== undefined) profile.insurancePolicyNumber = insurancePolicyNumber;

    await profile.save();
    const updated = await PatientProfile.findById(profile._id).populate('user', 'name email phone avatar role');

    return sendSuccess(res, 200, 'Profile updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

// @desc   Get comprehensive patient dashboard summary
// @route  GET /api/v1/patients/me/dashboard
// @access Private (Patient)
const getPatientDashboard = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const now = new Date();

    const [
      profile,
      upcomingAppointments,
      activePrescriptions,
      activeReminders,
      recentOrders,
      recentHealthRecords,
      appointmentStats,
    ] = await Promise.all([
      PatientProfile.findOne({ user: patientId }),
      Appointment.find({
        patient: patientId,
        appointmentDate: { $gte: now },
        status: { $in: ['confirmed', 'pending'] },
      })
        .populate('doctor', 'name email phone')
        .sort({ appointmentDate: 1 })
        .limit(3)
        .lean(),
      Prescription.find({
        patient: patientId,
        prescriptionType: 'doctor_issued',
        $or: [
          { validUntil: { $exists: false } },
          { validUntil: null },
          { validUntil: { $gte: now } },
        ],
      })
        .populate('doctor', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      MedicineReminder.find({ patient: patientId, isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Order.find({ patient: patientId })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      HealthRecord.find({ patient: patientId })
        .sort({ recordDate: -1 })
        .limit(4)
        .lean(),
      Appointment.aggregate([
        { $match: { patient: patientId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const stats = {
      totalAppointments: 0,
      upcoming: upcomingAppointments.length,
      activeReminders: activeReminders.length,
      activePrescriptions: activePrescriptions.length,
      recentOrdersCount: recentOrders.length,
    };

    appointmentStats.forEach((s) => {
      stats.totalAppointments += s.count;
    });

    return sendSuccess(res, 200, 'Patient dashboard data', {
      profile,
      stats,
      upcomingAppointments,
      activePrescriptions,
      activeReminders,
      recentOrders,
      recentHealthRecords,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get patient profile by ID (Doctors/Hospitals viewing treated patient)
// @route  GET /api/v1/patients/:id
// @access Private (Doctor, Hospital)
const getPatientById = async (req, res, next) => {
  try {
    const profile = await PatientProfile.findOne({ user: req.params.id }).populate('user', 'name email phone avatar');
    if (!profile) {
      return sendError(res, 404, 'Patient profile not found');
    }
    return sendSuccess(res, 200, 'Patient details retrieved', profile);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getPatientDashboard,
  getPatientById,
};
