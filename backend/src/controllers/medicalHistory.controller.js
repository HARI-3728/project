const HealthRecord = require('../models/HealthRecord');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Order = require('../models/Order');
const { DiagnosticBooking } = require('../models/Diagnostic');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { processDocumentRecord } = require('../services/document.service');
const fs = require('fs');
const path = require('path');

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
      processingStatus: 'pending',
    });

    // Extract text from the uploaded document (PDF text or image OCR).
    try {
      await processDocumentRecord(HealthRecord, record._id);
    } catch (processError) {
      // Non-fatal: the record is saved and can be retried later.
    }

    const saved = await HealthRecord.findById(record._id);

    return sendSuccess(res, 201, 'Health record created', saved);
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

// @desc   Preview an uploaded health record document (inline)
// @route  GET /api/v1/health-records/:id/preview
// @access Private
const previewHealthRecord = async (req, res, next) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) return sendError(res, 404, 'Health record not found.');

    const userId = req.user._id.toString();
    const isPatient = record.patient.toString() === userId;
    const isShared = record.sharedWith.map(String).includes(userId);
    if (!isPatient && !isShared) {
      return sendError(res, 403, 'Access denied.');
    }

    serveDocumentFile(res, record);
  } catch (error) {
    next(error);
  }
};

// @desc   Download an uploaded health record document
// @route  GET /api/v1/health-records/:id/download
// @access Private
const downloadHealthRecord = async (req, res, next) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) return sendError(res, 404, 'Health record not found.');

    const userId = req.user._id.toString();
    const isPatient = record.patient.toString() === userId;
    const isShared = record.sharedWith.map(String).includes(userId);
    if (!isPatient && !isShared) {
      return sendError(res, 403, 'Access denied.');
    }

    serveDocumentFile(res, record, true);
  } catch (error) {
    next(error);
  }
};

// @desc   Re-process a health record document (retry text extraction / OCR)
// @route  POST /api/v1/health-records/:id/reprocess
// @access Private (Patient)
const reprocessHealthRecord = async (req, res, next) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) return sendError(res, 404, 'Health record not found.');

    if (record.patient.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied.');
    }

    const updated = await processDocumentRecord(HealthRecord, record._id);
    return sendSuccess(res, 200, 'Health record document processing finished', updated);
  } catch (error) {
    next(error);
  }
};

// Serve a stored document file with the correct inline/attachment disposition.
// The file is never exposed through a public URL: only these authenticated
// controller endpoints can serve it, after ownership checks.
const serveDocumentFile = (res, record, asAttachment = false) => {
  const fileName = path.basename(record.fileUrl || '');
  const filePath = path.resolve(__dirname, '..', '..', 'uploads', record.patient.toString(), fileName);

  if (!fileName || !fs.existsSync(filePath)) {
    return sendError(res, 404, 'The document file is no longer available on the server.');
  }

  const extension = path.extname(fileName).toLowerCase();
  const contentType =
    extension === '.pdf' ? 'application/pdf' :
    extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' :
    extension === '.png' ? 'image/png' :
    record.fileType || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', asAttachment
    ? `attachment; filename="${record.fileName || fileName}"`
    : `inline; filename="${record.fileName || fileName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(filePath);
};

module.exports = { getMyMedicalHistory, createHealthRecord, getMyHealthRecords, getHealthRecordById, previewHealthRecord, downloadHealthRecord, reprocessHealthRecord };
