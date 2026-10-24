const { DiagnosticService, DiagnosticBooking } = require('../models/Diagnostic');
const Hospital = require('../models/Hospital');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { notifyDiagnosticStatus } = require('../services/notification.service');

// @desc   Get list of diagnostic services / tests available
// @route  GET /api/v1/diagnostics/services
// @access Public / Private
const getDiagnosticServices = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const query = { isActive: true };

    if (category) query.category = category;
    if (search) query.name = new RegExp(search, 'i');

    const skip = (page - 1) * limit;
    const total = await DiagnosticService.countDocuments(query);
    const services = await DiagnosticService.find(query)
      .sort({ category: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, services, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Get single diagnostic service details
// @route  GET /api/v1/diagnostics/services/:id
// @access Public / Private
const getDiagnosticServiceById = async (req, res, next) => {
  try {
    const service = await DiagnosticService.findById(req.params.id);
    if (!service) return sendError(res, 404, 'Diagnostic service not found');
    return sendSuccess(res, 200, 'Diagnostic service retrieved', service);
  } catch (error) {
    next(error);
  }
};

// @desc   Create a new diagnostic service (Hospital / Admin)
// @route  POST /api/v1/diagnostics/services
// @access Private (Hospital)
const createDiagnosticService = async (req, res, next) => {
  try {
    const { name, category, description, price, preparationInstructions, reportTime } = req.body;

    if (!name || !category || price === undefined) {
      return sendError(res, 400, 'name, category, and price are required.');
    }

    const service = await DiagnosticService.create({
      name,
      category,
      description,
      price: Number(price),
      preparationInstructions,
      reportTime,
    });

    return sendSuccess(res, 201, 'Diagnostic service created', service);
  } catch (error) {
    next(error);
  }
};

// @desc   Book a diagnostic test
// @route  POST /api/v1/diagnostics/book
// @access Private (Patient)
const bookDiagnostic = async (req, res, next) => {
  try {
    const { serviceId, hospitalId, bookingDate, timeSlot, notes } = req.body;

    if (!serviceId || !hospitalId || !bookingDate || !timeSlot) {
      return sendError(res, 400, 'serviceId, hospitalId, bookingDate, and timeSlot are required.');
    }

    const service = await DiagnosticService.findById(serviceId);
    if (!service || !service.isActive) {
      return sendError(res, 404, 'Diagnostic service not found or inactive.');
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital || !hospital.isActive) {
      return sendError(res, 404, 'Hospital not found or inactive.');
    }

    const parsedDate = new Date(bookingDate);
    if (isNaN(parsedDate.getTime())) {
      return sendError(res, 400, 'Invalid bookingDate format.');
    }

    const booking = await DiagnosticBooking.create({
      patient: req.user._id,
      hospital: hospitalId,
      service: serviceId,
      serviceName: service.name,
      servicePrice: service.price,
      bookingDate: parsedDate,
      timeSlot,
      notes,
      status: 'pending',
    });

    const populated = await DiagnosticBooking.findById(booking._id)
      .populate('hospital', 'hospitalName address phone')
      .populate('service', 'name category price preparationInstructions reportTime');

    return sendSuccess(res, 201, 'Diagnostic test booked successfully', populated);
  } catch (error) {
    next(error);
  }
};

// @desc   Get current patient's diagnostic bookings
// @route  GET /api/v1/diagnostics/my-bookings
// @access Private (Patient)
const getMyDiagnosticBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { patient: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const total = await DiagnosticBooking.countDocuments(query);
    const bookings = await DiagnosticBooking.find(query)
      .populate('hospital', 'hospitalName address phone')
      .populate('service', 'name category price preparationInstructions reportTime')
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, bookings, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Get hospital diagnostic bookings
// @route  GET /api/v1/diagnostics/hospital-bookings
// @access Private (Hospital)
const getHospitalDiagnosticBookings = async (req, res, next) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user._id });
    if (!hospital) return sendError(res, 404, 'Hospital profile not found.');

    const { status, page = 1, limit = 20 } = req.query;
    const query = { hospital: hospital._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const total = await DiagnosticBooking.countDocuments(query);
    const bookings = await DiagnosticBooking.find(query)
      .populate('patient', 'name email phone avatar')
      .populate('service', 'name category price preparationInstructions reportTime')
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, bookings, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Update diagnostic booking status
// @route  PATCH /api/v1/diagnostics/bookings/:id/status
// @access Private (Hospital)
const updateDiagnosticBookingStatus = async (req, res, next) => {
  try {
    const { status, cancellationReason } = req.body;
    const VALID = ['pending', 'confirmed', 'sample_collected', 'report_ready', 'completed', 'cancelled'];

    if (!VALID.includes(status)) {
      return sendError(res, 400, `Invalid status. Must be one of: ${VALID.join(', ')}`);
    }

    const booking = await DiagnosticBooking.findById(req.params.id);
    if (!booking) return sendError(res, 404, 'Diagnostic booking not found.');

    booking.status = status;
    if (cancellationReason) booking.cancellationReason = cancellationReason;
    await booking.save();

    // Send notification to patient
    notifyDiagnosticStatus(booking.patient, booking._id, booking.serviceName, status);

    return sendSuccess(res, 200, 'Diagnostic booking status updated', booking);
  } catch (error) {
    next(error);
  }
};

// @desc   Upload diagnostic report file
// @route  POST /api/v1/diagnostics/bookings/:id/report
// @access Private (Hospital)
const uploadDiagnosticReport = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 400, 'Please upload a report file.');

    const booking = await DiagnosticBooking.findById(req.params.id);
    if (!booking) return sendError(res, 404, 'Diagnostic booking not found.');

    booking.reportUrl = `/uploads/${req.user._id}/${req.file.filename}`;
    booking.status = 'report_ready';
    await booking.save();

    notifyDiagnosticStatus(booking.patient, booking._id, booking.serviceName, 'report_ready');

    return sendSuccess(res, 200, 'Report uploaded successfully', booking);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDiagnosticServices,
  getDiagnosticServiceById,
  createDiagnosticService,
  bookDiagnostic,
  getMyDiagnosticBookings,
  getHospitalDiagnosticBookings,
  updateDiagnosticBookingStatus,
  uploadDiagnosticReport,
};
