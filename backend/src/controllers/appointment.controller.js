const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const {
  notifyAppointmentConfirmed,
  notifyAppointmentCancelled,
  notifyDoctorNewAppointment,
} = require('../services/notification.service');

// @desc   Get all conditions (60 conditions with categories)
// @route  GET /api/v1/conditions
// @access Public
const getConditions = (req, res) => {
  const { search } = req.query;
  const categories = Appointment.schema.statics.CATEGORIES || Appointment.CATEGORIES;
  const allConditions = Appointment.schema.statics.CONDITIONS || Appointment.CONDITIONS;

  if (search) {
    const query = search.toLowerCase();
    const filtered = allConditions.filter((c) => c.toLowerCase().includes(query));
    return sendSuccess(res, 200, 'Conditions retrieved', filtered);
  }

  return sendSuccess(res, 200, 'Conditions retrieved', {
    categories,
    conditions: allConditions,
    all: allConditions,
    total: allConditions ? allConditions.length : 60,
  });
};

// @desc   List available doctors (optionally filter by specialization)
// @route  GET /api/v1/doctors
// @access Public
const getDoctors = async (req, res, next) => {
  try {
    const { specialization, hospital, page = 1, limit = 20 } = req.query;
    const query = { isAcceptingAppointments: true };
    if (specialization) query.specialization = { $regex: specialization, $options: 'i' };
    if (hospital) query.hospital = hospital;

    const skip = (page - 1) * limit;
    const total = await DoctorProfile.countDocuments(query);
    const doctors = await DoctorProfile.find(query)
      .populate('user', 'name email phone avatar')
      .populate('hospital', 'hospitalName address')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    return sendPaginated(res, doctors, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Get doctor availability slots for a date
// @route  GET /api/v1/doctors/:doctorId/availability
// @access Private (Patient)
const getDoctorAvailability = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) return sendError(res, 400, 'Date is required (YYYY-MM-DD).');

    const requestedDate = new Date(date);
    if (isNaN(requestedDate)) return sendError(res, 400, 'Invalid date format. Use YYYY-MM-DD.');

    // Prevent booking in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate < today) return sendError(res, 400, 'Cannot book appointments in the past.');

    const doctorUser = await User.findById(doctorId);
    if (!doctorUser || doctorUser.role !== 'doctor') {
      return sendError(res, 404, 'Doctor not found.');
    }

    const doctorProfile = await DoctorProfile.findOne({ user: doctorId });
    if (!doctorProfile) return sendError(res, 404, 'Doctor profile not found.');
    if (!doctorProfile.isAcceptingAppointments) {
      return sendError(res, 400, 'This doctor is not currently accepting appointments.');
    }

    const dayOfWeek = requestedDate.getDay();
    const availabilityForDay = doctorProfile.availability.filter(
      (slot) => slot.dayOfWeek === dayOfWeek && slot.isAvailable
    );

    if (availabilityForDay.length === 0) {
      return sendSuccess(res, 200, 'No availability for this date', { slots: [] });
    }

    // Get already-booked slots for this doctor on this date
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled'] },
    }).select('startTime endTime');

    const bookedTimes = new Set(bookedAppointments.map((a) => a.startTime));

    // Generate time slots from availability windows
    const availableSlots = [];
    for (const window of availabilityForDay) {
      const duration = window.slotDurationMinutes || 30;
      const [startH, startM] = window.startTime.split(':').map(Number);
      const [endH, endM] = window.endTime.split(':').map(Number);

      let currentMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      while (currentMinutes + duration <= endMinutes) {
        const h = String(Math.floor(currentMinutes / 60)).padStart(2, '0');
        const m = String(currentMinutes % 60).padStart(2, '0');
        const slotTime = `${h}:${m}`;

        const endSlotMinutes = currentMinutes + duration;
        const endH2 = String(Math.floor(endSlotMinutes / 60)).padStart(2, '0');
        const endM2 = String(endSlotMinutes % 60).padStart(2, '0');

        availableSlots.push({
          startTime: slotTime,
          endTime: `${endH2}:${endM2}`,
          isBooked: bookedTimes.has(slotTime),
        });

        currentMinutes += duration;
      }
    }

    return sendSuccess(res, 200, 'Availability retrieved', {
      date,
      doctorId,
      slots: availableSlots,
      consultationFee: doctorProfile.consultationFee,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create appointment
// @route  POST /api/v1/appointments
// @access Private (Patient)
const createAppointment = async (req, res, next) => {
  try {
    const {
      doctorId,
      appointmentDate,
      startTime: reqStartTime,
      appointmentTime,
      condition,
      symptoms,
      notes,
    } = req.body;

    const startTime = reqStartTime || appointmentTime;

    if (!doctorId || !appointmentDate || !startTime || !condition) {
      return sendError(res, 400, 'doctorId, appointmentDate, startTime, and condition are required.');
    }

    // Validate doctor
    const doctorUser = await User.findById(doctorId);
    if (!doctorUser || doctorUser.role !== 'doctor') {
      return sendError(res, 404, 'Doctor not found.');
    }

    const doctorProfile = await DoctorProfile.findOne({ user: doctorId });
    if (!doctorProfile || !doctorProfile.isAcceptingAppointments) {
      return sendError(res, 400, 'This doctor is not currently accepting appointments.');
    }

    // Validate date
    const appDate = new Date(appointmentDate);
    if (isNaN(appDate)) return sendError(res, 400, 'Invalid appointment date.');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appDate < today) return sendError(res, 400, 'Cannot book appointments in the past.');

    // Validate time format
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
      return sendError(res, 400, 'Invalid time format. Use HH:MM.');
    }

    // Calculate end time based on doctor slot duration
    const dayOfWeek = appDate.getDay();
    const availWindow = doctorProfile.availability.find(
      (a) => a.dayOfWeek === dayOfWeek && a.isAvailable
    );
    const duration = availWindow?.slotDurationMinutes || 30;

    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Check slot availability (also enforced by unique index)
    const startOfDay = new Date(appDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appDate);
    endOfDay.setHours(23, 59, 59, 999);

    const conflict = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      startTime,
      status: { $nin: ['cancelled'] },
    });

    if (conflict) {
      return sendError(res, 409, 'This time slot is already booked. Please choose a different time.');
    }

    // Determine category from condition
    const CATEGORIES = Appointment.schema.statics.CATEGORIES;
    let category = null;
    for (const [cat, conditions] of Object.entries(CATEGORIES)) {
      if (conditions.includes(condition)) { category = cat; break; }
    }

    const fee = doctorProfile.consultationFee || 0;
    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      hospital: doctorProfile.hospital,
      appointmentDate: appDate,
      startTime,
      endTime,
      condition,
      category,
      symptoms,
      notes,
      fee,
      consultationFeeSnapshot: fee,
      status: 'confirmed',
    });

    // Fire notifications (non-blocking)
    const dateStr = appDate.toLocaleDateString('en-IN');
    notifyAppointmentConfirmed(req.user._id, appointment._id, doctorUser.name, dateStr);
    notifyDoctorNewAppointment(doctorId, appointment._id, req.user.name, dateStr);

    const populated = await Appointment.findById(appointment._id)
      .populate('doctor', 'name email')
      .populate('patient', 'name email');

    return sendSuccess(res, 201, 'Appointment booked successfully', populated);
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 409, 'This time slot is already booked. Please choose a different time.');
    }
    next(error);
  }
};

// @desc   Get patient's appointments
// @route  GET /api/v1/appointments/my
// @access Private (Patient)
const getMyAppointments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { patient: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .populate('doctor', 'name email phone')
      .populate('hospital', 'hospitalName')
      .sort({ appointmentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, appointments, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Get appointment by ID
// @route  GET /api/v1/appointments/:id
// @access Private
const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor', 'name email phone')
      .populate('patient', 'name email phone')
      .populate('hospital', 'hospitalName address')
      .populate('prescription');

    if (!appointment) return sendError(res, 404, 'Appointment not found.');

    // Authorization: patient can see own, doctor can see own, hospital staff
    const userId = req.user._id.toString();
    const isPatient = appointment.patient._id.toString() === userId;
    const isDoctor = appointment.doctor._id.toString() === userId;

    if (!isPatient && !isDoctor && req.user.role !== 'hospital') {
      return sendError(res, 403, 'Access denied.');
    }

    return sendSuccess(res, 200, 'Appointment retrieved', appointment);
  } catch (error) {
    next(error);
  }
};

// @desc   Doctor gets their appointments
// @route  GET /api/v1/doctor/appointments
// @access Private (Doctor)
const getDoctorAppointments = async (req, res, next) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query;
    const query = { doctor: req.user._id };
    if (status) query.status = status;
    if (date) {
      const d = new Date(date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: start, $lte: end };
    }

    const skip = (page - 1) * limit;
    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .populate('patient', 'name email phone')
      .populate('hospital', 'hospitalName')
      .sort({ appointmentDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, appointments, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Doctor gets today's appointments
// @route  GET /api/v1/doctor/appointments/today
// @access Private (Doctor)
const getDoctorTodayAppointments = async (req, res, next) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctor: req.user._id,
      appointmentDate: { $gte: start, $lte: end },
      status: { $nin: ['cancelled'] },
    })
      .populate('patient', 'name email phone')
      .sort({ startTime: 1 });

    const counts = {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === 'pending').length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    };

    return sendSuccess(res, 200, "Today's appointments", { appointments, counts });
  } catch (error) {
    next(error);
  }
};

// @desc   Update appointment status
// @route  PATCH /api/v1/appointments/:id/status
// @access Private (Doctor / Hospital)
const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const VALID_STATUSES = ['confirmed', 'completed', 'cancelled', 'no-show'];

    if (!VALID_STATUSES.includes(status)) {
      return sendError(res, 400, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return sendError(res, 404, 'Appointment not found.');

    // Only the assigned doctor or hospital can update status
    const isDoctorOwner = appointment.doctor.toString() === req.user._id.toString();
    if (!isDoctorOwner && req.user.role !== 'hospital') {
      return sendError(res, 403, 'Only the assigned doctor or hospital can update appointment status.');
    }

    appointment.status = status;
    if (notes) appointment.notes = notes;
    if (status === 'cancelled') {
      appointment.cancelledBy = req.user.role;
      appointment.cancellationReason = notes || 'Cancelled by provider';
      notifyAppointmentCancelled(
        appointment.patient,
        appointment._id,
        req.user.name,
        req.user.role
      );
    }

    await appointment.save();
    return sendSuccess(res, 200, 'Appointment status updated', appointment);
  } catch (error) {
    next(error);
  }
};

// @desc   Cancel appointment
// @route  POST /api/v1/appointments/:id/cancel
// @access Private (Patient / Doctor)
const cancelAppointment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor', 'name')
      .populate('patient', 'name');

    if (!appointment) return sendError(res, 404, 'Appointment not found.');

    const userId = req.user._id.toString();
    const isPatient = appointment.patient._id.toString() === userId;
    const isDoctor = appointment.doctor._id.toString() === userId;

    if (!isPatient && !isDoctor) {
      return sendError(res, 403, 'You can only cancel your own appointments.');
    }

    if (['cancelled', 'completed'].includes(appointment.status)) {
      return sendError(res, 400, `Cannot cancel an appointment with status: ${appointment.status}`);
    }

    appointment.status = 'cancelled';
    appointment.cancelledBy = req.user.role;
    appointment.cancellationReason = reason || 'Cancelled by user';
    await appointment.save();

    // Notify the other party
    if (isPatient) {
      notifyAppointmentCancelled(
        appointment.doctor._id,
        appointment._id,
        appointment.patient.name,
        'patient'
      );
    } else {
      notifyAppointmentCancelled(
        appointment.patient._id,
        appointment._id,
        appointment.doctor.name,
        'doctor'
      );
    }

    return sendSuccess(res, 200, 'Appointment cancelled successfully', appointment);
  } catch (error) {
    next(error);
  }
};

// @desc   Get patient appointment counts (dashboard stats)
// @route  GET /api/v1/appointments/counts
// @access Private (Patient)
const getAppointmentCounts = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const [total, completed, pending, upcoming, cancelled] = await Promise.all([
      Appointment.countDocuments({ patient: patientId }),
      Appointment.countDocuments({ patient: patientId, status: 'completed' }),
      Appointment.countDocuments({ patient: patientId, status: 'pending' }),
      Appointment.countDocuments({
        patient: patientId,
        appointmentDate: { $gte: new Date() },
        status: { $nin: ['cancelled', 'completed'] },
      }),
      Appointment.countDocuments({ patient: patientId, status: 'cancelled' }),
    ]);

    return sendSuccess(res, 200, 'Appointment counts', { total, completed, pending, upcoming, cancelled });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConditions,
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
};
