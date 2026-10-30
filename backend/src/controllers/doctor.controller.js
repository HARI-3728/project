const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// @desc   Get current logged-in doctor profile
// @route  GET /api/v1/doctors/me/profile
// @access Private (Doctor)
const getMyDoctorProfile = async (req, res, next) => {
  try {
    let profile = await DoctorProfile.findOne({ user: req.user._id })
      .populate('user', 'name email phone avatar role')
      .populate('hospital', 'hospitalName address phone email');

    if (!profile) {
      profile = await DoctorProfile.create({
        user: req.user._id,
        specialization: 'General Physician',
      });
      profile = await DoctorProfile.findById(profile._id).populate('user', 'name email phone avatar role');
    }

    return sendSuccess(res, 200, 'Doctor profile retrieved', profile);
  } catch (error) {
    next(error);
  }
};

// @desc   Update current doctor profile
// @route  PUT /api/v1/doctors/me/profile
// @access Private (Doctor)
const updateMyDoctorProfile = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      specialization,
      qualifications,
      experience,
      registrationNumber,
      consultationFee,
      consultationCategories,
      availability,
      bio,
      languages,
      isAcceptingAppointments,
    } = req.body;

    if (name || phone) {
      const userUpdates = {};
      if (name) userUpdates.name = name;
      if (phone) userUpdates.phone = phone;
      await User.findByIdAndUpdate(req.user._id, userUpdates, { runValidators: true });
    }

    let profile = await DoctorProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new DoctorProfile({ user: req.user._id });
    }

    if (specialization !== undefined) profile.specialization = specialization;
    if (qualifications !== undefined) profile.qualifications = qualifications;
    if (experience !== undefined) profile.experience = experience;
    if (registrationNumber !== undefined) profile.registrationNumber = registrationNumber;
    if (consultationFee !== undefined) profile.consultationFee = consultationFee;
    if (consultationCategories !== undefined) profile.consultationCategories = consultationCategories;
    if (availability !== undefined) profile.availability = availability;
    if (bio !== undefined) profile.bio = bio;
    if (languages !== undefined) profile.languages = languages;
    if (isAcceptingAppointments !== undefined) profile.isAcceptingAppointments = isAcceptingAppointments;

    await profile.save();
    const updated = await DoctorProfile.findById(profile._id)
      .populate('user', 'name email phone avatar role')
      .populate('hospital', 'hospitalName address');

    return sendSuccess(res, 200, 'Doctor profile updated', updated);
  } catch (error) {
    next(error);
  }
};

// @desc   Get doctor dashboard summary stats & today's schedule
// @route  GET /api/v1/doctors/me/dashboard
// @access Private (Doctor)
const getDoctorDashboard = async (req, res, next) => {
  try {
    const doctorUserId = req.user._id;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      profile,
      todayAppointments,
      pendingAppointments,
      totalCompleted,
      totalPatientsCount,
      recentPrescriptions,
    ] = await Promise.all([
      DoctorProfile.findOne({ user: doctorUserId }),
      Appointment.find({
        doctor: doctorUserId,
        appointmentDate: { $gte: startOfToday, $lte: endOfToday },
      })
        .populate('patient', 'name phone email avatar')
        .sort({ startTime: 1 })
        .lean(),
      Appointment.countDocuments({ doctor: doctorUserId, status: 'pending' }),
      Appointment.countDocuments({ doctor: doctorUserId, status: 'completed' }),
      Appointment.distinct('patient', { doctor: doctorUserId }),
      Prescription.find({ doctor: doctorUserId })
        .populate('patient', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const stats = {
      todayCount: todayAppointments.length,
      pendingCount: pendingAppointments,
      totalCompleted,
      uniquePatients: totalPatientsCount.length,
      rating: profile?.rating || 0,
      totalReviews: profile?.totalReviews || 0,
    };

    return sendSuccess(res, 200, 'Doctor dashboard summary', {
      profile,
      stats,
      todayAppointments,
      recentPrescriptions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get list of all doctors with optional filters
// @route  GET /api/v1/doctors
// @access Public / Private
const getAllDoctors = async (req, res, next) => {
  try {
    const { specialization, condition, search, page = 1, limit = 20 } = req.query;
    const query = { isAcceptingAppointments: true };

    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }
    if (condition) {
      query.consultationCategories = { $in: [new RegExp(condition, 'i')] };
    }

    const skip = (page - 1) * limit;

    let doctorProfiles = await DoctorProfile.find(query)
      .populate('user', 'name email phone avatar')
      .populate('hospital', 'hospitalName address')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ rating: -1, experience: -1 });

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      doctorProfiles = doctorProfiles.filter(
        (doc) =>
          doc.user &&
          (searchRegex.test(doc.user.name) ||
            searchRegex.test(doc.specialization) ||
            (doc.bio && searchRegex.test(doc.bio)))
      );
    }

    const total = await DoctorProfile.countDocuments(query);

    return sendPaginated(res, doctorProfiles, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Get doctor public profile by User ID or Profile ID
// @route  GET /api/v1/doctors/:id
// @access Public / Private
const getDoctorById = async (req, res, next) => {
  try {
    let profile = await DoctorProfile.findOne({
      $or: [{ _id: req.params.id }, { user: req.params.id }],
    })
      .populate('user', 'name email phone avatar')
      .populate('hospital', 'hospitalName address phone email');

    if (!profile) {
      return sendError(res, 404, 'Doctor not found');
    }

    return sendSuccess(res, 200, 'Doctor profile retrieved', profile);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyDoctorProfile,
  updateMyDoctorProfile,
  getDoctorDashboard,
  getAllDoctors,
  getDoctorById,
};
