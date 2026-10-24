const HealthRecord = require('../models/HealthRecord');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Order = require('../models/Order');
const { DiagnosticBooking } = require('../models/Diagnostic');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// @desc   Get aggregated medical history for patient
// @route  GET /api/v1/medical-history/my
// @access Private (Patient)
const getMyMedicalHistory = async (req, res, next) => {
  try {
    const patientId = req.user._id;

    const [appointments, prescriptions, healthRecords, diagnosticBookings, orders] = await Promise.all([
      Appointment.find({ patient: patientId, status: 'completed' })
        .populate('doctor', 'name specialization')
        .sort({ appointmentDate: -1 })
        .limit(20)
        .lean(),
      Prescription.find({ patient: patientId })
        .populate('doctor', 'name')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      HealthRecord.find({ patient: patientId })
        .sort({ recordDate: -1 })
        .limit(20)
        .lean(),
      DiagnosticBooking.find({ patient: patientId, status: { $in: ['completed', 'report_ready'] } })
        .populate('service', 'name category')
        .sort({ bookingDate: -1 })
        .limit(20)
        .lean(),
      Order.find({ patient: patientId, status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return sendSuccess(res, 200, 'Medical history retrieved', {
      appointments,
      prescriptions,
      healthRecords,
      diagnosticBookings,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create a health record
// @route  POST /api/v1/health-records
// @access Private (Patient)
const createHealthRecord = async (req, res, next) => {
  try {
    const { title, recordType, description, hospitalName, doctorName, recordDate, tags } = req.body;

    if (!title || !recordType) {
      return sendError(res, 400, 'title and recordType are required.');
    }

    let fileUrl = null;
    let fileName = null;
    let fileType = null;
    let fileSize = null;

    if (req.file) {
      fileUrl = `/uploads/${req.user._id}/${req.file.filename}`;
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
      fileSize = req.file.size;
    }

    const record = await HealthRecord.create({
      patient: req.user._id,
      title,
      recordType,
      description,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      hospitalName,
      doctorName,
      recordDate: recordDate || new Date(),
      tags: tags || [],
    });

    return sendSuccess(res, 201, 'Health record created', record);
  } catch (error) {
    next(error);
  }
};

// @desc   Get patient's health records
// @route  GET /api/v1/health-records/my
// @access Private (Patient)
const getMyHealthRecords = async (req, res, next) => {
  try {
    const { recordType, page = 1, limit = 20 } = req.query;
    const query = { patient: req.user._id };
    if (recordType) query.recordType = recordType;

    const skip = (page - 1) * limit;
    const total = await HealthRecord.countDocuments(query);
    const records = await HealthRecord.find(query)
      .sort({ recordDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, records, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Get a single health record
// @route  GET /api/v1/health-records/:id
// @access Private
const getHealthRecordById = async (req, res, next) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) return sendError(res, 404, 'Health record not found.');

    // Authorization
    if (
      record.patient.toString() !== req.user._id.toString() &&
      !record.sharedWith.map(String).includes(req.user._id.toString())
    ) {
      return sendError(res, 403, 'Access denied.');
    }

    return sendSuccess(res, 200, 'Health record retrieved', record);
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyMedicalHistory, createHealthRecord, getMyHealthRecords, getHealthRecordById };
