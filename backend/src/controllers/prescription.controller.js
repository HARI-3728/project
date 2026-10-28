const Prescription = require('../models/Prescription');
const MedicineReminder = require('../models/MedicineReminder');
const VaccinationReminder = require('../models/VaccinationReminder');
const User = require('../models/User');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { notifyPrescriptionIssued } = require('../services/notification.service');
const { processDocumentRecord } = require('../services/document.service');
const fs = require('fs');
const path = require('path');

// ─── PRESCRIPTIONS ──────────────────────────────────────────────────────────

// @desc   Create a prescription (doctor issuing)
// @route  POST /api/v1/doctor/prescriptions
// @access Private (Doctor)
const doctorAddPrescription = async (req, res, next) => {
  try {
    const { patientId, appointmentId, medicines, diagnosis, notes, validUntil } = req.body;

    if (!patientId) return sendError(res, 400, 'patientId is required.');
    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return sendError(res, 400, 'At least one medicine entry is required.');
    }

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return sendError(res, 404, 'Patient not found.');
    }

    const prescription = await Prescription.create({
      patient: patientId,
      doctor: req.user._id,
      appointment: appointmentId || null,
      prescriptionType: 'doctor_issued',
      medicines,
      diagnosis,
      notes,
      validUntil,
    });

    notifyPrescriptionIssued(patientId, prescription._id, req.user.name);

    const populated = await Prescription.findById(prescription._id)
      .populate('patient', 'name email')
      .populate('doctor', 'name');

    return sendSuccess(res, 201, 'Prescription issued successfully', populated);
  } catch (error) {
    next(error);
  }
};

// @desc   Upload a prescription (patient)
// @route  POST /api/v1/prescriptions/upload
// @access Private (Patient)
const uploadPrescription = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'Please upload a prescription file (JPEG, PNG, or PDF).');
    }

    const { diagnosis, prescriptionDate } = req.body;
    const fileUrl = `/uploads/${req.user._id}/${req.file.filename}`;

    const prescription = await Prescription.create({
      patient: req.user._id,
      prescriptionType: 'uploaded',
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      diagnosis: diagnosis?.trim() || undefined,
      prescriptionDate: prescriptionDate || undefined,
      isVerified: false,
      processingStatus: 'pending',
    });

    // Extract text from the uploaded document (PDF text or image OCR).
    // Errors here are recorded on the document record; the upload still succeeds.
    try {
      await processDocumentRecord(Prescription, prescription._id);
    } catch (processError) {
      // Non-fatal: the document is saved and can be retried later.
    }

    const saved = await Prescription.findById(prescription._id);

    return sendSuccess(res, 201, 'Prescription uploaded successfully', saved);
  } catch (error) {
    next(error);
  }
};

// @desc   Get patient's prescriptions
// @route  GET /api/v1/prescriptions/my
// @access Private (Patient)
const getMyPrescriptions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const total = await Prescription.countDocuments({ patient: req.user._id });
    const prescriptions = await Prescription.find({ patient: req.user._id })
      .populate('doctor', 'name')
      .populate('appointment', 'appointmentDate condition')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, prescriptions, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Get a single prescription
// @route  GET /api/v1/prescriptions/:id
// @access Private
const getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('doctor', 'name email')
      .populate('patient', 'name email')
      .populate('appointment', 'appointmentDate condition');

    if (!prescription) return sendError(res, 404, 'Prescription not found.');

    // Authorization
    const userId = req.user._id.toString();
    const isPatient = prescription.patient._id.toString() === userId;
    const isDoctor = prescription.doctor?._id?.toString() === userId;
    if (!isPatient && !isDoctor && req.user.role !== 'hospital') {
      return sendError(res, 403, 'Access denied.');
    }

    return sendSuccess(res, 200, 'Prescription retrieved', prescription);
  } catch (error) {
    next(error);
  }
};

// @desc   Preview an uploaded prescription document (inline)
// @route  GET /api/v1/prescriptions/:id/preview
// @access Private
const previewPrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return sendError(res, 404, 'Prescription not found.');

    const userId = req.user._id.toString();
    const isPatient = prescription.patient.toString() === userId;
    const isDoctor = prescription.doctor?._id?.toString() === userId;
    if (!isPatient && !isDoctor && req.user.role !== 'hospital') {
      return sendError(res, 403, 'Access denied.');
    }

    serveDocumentFile(res, prescription);
  } catch (error) {
    next(error);
  }
};

// @desc   Download an uploaded prescription document
// @route  GET /api/v1/prescriptions/:id/download
// @access Private
const downloadPrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return sendError(res, 404, 'Prescription not found.');

    const userId = req.user._id.toString();
    const isPatient = prescription.patient.toString() === userId;
    const isDoctor = prescription.doctor?._id?.toString() === userId;
    if (!isPatient && !isDoctor && req.user.role !== 'hospital') {
      return sendError(res, 403, 'Access denied.');
    }

    serveDocumentFile(res, prescription, true);
  } catch (error) {
    next(error);
  }
};

// @desc   Re-process a prescription document (retry text extraction / OCR)
// @route  POST /api/v1/prescriptions/:id/reprocess
// @access Private (Patient)
const reprocessPrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return sendError(res, 404, 'Prescription not found.');

    if (prescription.patient.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied.');
    }

    const updated = await processDocumentRecord(Prescription, prescription._id);
    return sendSuccess(res, 200, 'Prescription document processing finished', updated);
  } catch (error) {
    next(error);
  }
};

// @desc   Doctor gets prescriptions they issued
// @route  GET /api/v1/doctor/prescriptions
// @access Private (Doctor)
const getDoctorPrescriptions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const total = await Prescription.countDocuments({ doctor: req.user._id });
    const prescriptions = await Prescription.find({ doctor: req.user._id })
      .populate('patient', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, prescriptions, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// ─── MEDICINE REMINDERS ─────────────────────────────────────────────────────

// @desc   Create medicine reminder
// @route  POST /api/v1/reminders/medicines
// @access Private (Patient)
const createMedicineReminder = async (req, res, next) => {
  try {
    const { medicineName, dosage, frequency, times, startDate, endDate, instructions, prescriptionId } = req.body;

    if (!medicineName || !frequency || !startDate) {
      return sendError(res, 400, 'medicineName, frequency, and startDate are required.');
    }

    const reminder = await MedicineReminder.create({
      patient: req.user._id,
      prescription: prescriptionId || null,
      medicineName,
      dosage,
      frequency,
      times: times || [],
      startDate,
      endDate,
      instructions,
    });

    return sendSuccess(res, 201, 'Medicine reminder created', reminder);
  } catch (error) {
    next(error);
  }
};

// @desc   Get patient's medicine reminders
// @route  GET /api/v1/reminders/medicines/my
// @access Private (Patient)
const getMyMedicineReminders = async (req, res, next) => {
  try {
    const { isActive, page = 1, limit = 20 } = req.query;
    const query = { patient: req.user._id };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (page - 1) * limit;
    const total = await MedicineReminder.countDocuments(query);
    const reminders = await MedicineReminder.find(query)
      .populate('prescription', 'fileUrl diagnosis')
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, reminders, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Update medicine reminder
// @route  PATCH /api/v1/reminders/medicines/:id
// @access Private (Patient)
const updateMedicineReminder = async (req, res, next) => {
  try {
    const reminder = await MedicineReminder.findById(req.params.id);
    if (!reminder) return sendError(res, 404, 'Reminder not found.');
    if (reminder.patient.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied.');
    }

    const allowed = ['dosage', 'frequency', 'times', 'endDate', 'instructions', 'isActive'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) reminder[field] = req.body[field];
    });
    await reminder.save();

    return sendSuccess(res, 200, 'Reminder updated', reminder);
  } catch (error) {
    next(error);
  }
};

// @desc   Delete medicine reminder
// @route  DELETE /api/v1/reminders/medicines/:id
// @access Private (Patient)
const deleteMedicineReminder = async (req, res, next) => {
  try {
    const reminder = await MedicineReminder.findById(req.params.id);
    if (!reminder) return sendError(res, 404, 'Reminder not found.');
    if (reminder.patient.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied.');
    }
    await reminder.deleteOne();
    return sendSuccess(res, 200, 'Reminder deleted successfully');
  } catch (error) {
    next(error);
  }
};

// @desc   Log medicine taken
// @route  POST /api/v1/reminders/medicines/:id/log
// @access Private (Patient)
const logMedicineTaken = async (req, res, next) => {
  try {
    const { scheduledTime, status = 'taken' } = req.body;
    const reminder = await MedicineReminder.findById(req.params.id);
    if (!reminder) return sendError(res, 404, 'Reminder not found.');
    if (reminder.patient.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied.');
    }

    reminder.takenLog.push({ takenAt: new Date(), scheduledTime, status });
    reminder.lastTakenAt = new Date();
    await reminder.save();

    return sendSuccess(res, 200, 'Medicine log updated', { logEntry: reminder.takenLog.slice(-1)[0] });
  } catch (error) {
    next(error);
  }
};

// ─── VACCINATION REMINDERS ──────────────────────────────────────────────────

// @desc   Create vaccination reminder
// @route  POST /api/v1/reminders/vaccinations
// @access Private (Patient)
const createVaccinationReminder = async (req, res, next) => {
  try {
    const { vaccineName, dueDate, dose, hospitalName, doctorName, notes, reminderDaysBefore } = req.body;
    if (!vaccineName || !dueDate) {
      return sendError(res, 400, 'vaccineName and dueDate are required.');
    }

    const reminder = await VaccinationReminder.create({
      patient: req.user._id,
      vaccineName,
      dueDate,
      dose,
      hospitalName,
      doctorName,
      notes,
      reminderDaysBefore,
    });

    return sendSuccess(res, 201, 'Vaccination reminder created', reminder);
  } catch (error) {
    next(error);
  }
};

// @desc   Get patient's vaccination reminders
// @route  GET /api/v1/reminders/vaccinations/my
// @access Private (Patient)
const getMyVaccinationReminders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { patient: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const total = await VaccinationReminder.countDocuments(query);
    const reminders = await VaccinationReminder.find(query)
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, reminders, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Update vaccination reminder
// @route  PATCH /api/v1/reminders/vaccinations/:id
// @access Private (Patient)
const updateVaccinationReminder = async (req, res, next) => {
  try {
    const reminder = await VaccinationReminder.findById(req.params.id);
    if (!reminder) return sendError(res, 404, 'Vaccination reminder not found.');
    if (reminder.patient.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied.');
    }

    const allowed = ['dueDate', 'administeredDate', 'status', 'batchNumber', 'notes', 'nextDose', 'reminderDaysBefore'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) reminder[field] = req.body[field];
    });
    await reminder.save();

    return sendSuccess(res, 200, 'Vaccination reminder updated', reminder);
  } catch (error) {
    next(error);
  }
};

// @desc   Delete vaccination reminder
// @route  DELETE /api/v1/reminders/vaccinations/:id
// @access Private (Patient)
const deleteVaccinationReminder = async (req, res, next) => {
  try {
    const reminder = await VaccinationReminder.findById(req.params.id);
    if (!reminder) return sendError(res, 404, 'Vaccination reminder not found.');
    if (reminder.patient.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied.');
    }
    await reminder.deleteOne();
    return sendSuccess(res, 200, 'Vaccination reminder deleted');
  } catch (error) {
    next(error);
  }
};

// Serve a stored document file with the correct inline/attachment disposition.
// The file is never exposed through a public URL: only these authenticated
// controller endpoints can serve it, after ownership/role checks.
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

module.exports = {
  doctorAddPrescription,
  uploadPrescription,
  getMyPrescriptions,
  getPrescriptionById,
  previewPrescription,
  downloadPrescription,
  reprocessPrescription,
  getDoctorPrescriptions,
  createMedicineReminder,
  getMyMedicineReminders,
  updateMedicineReminder,
  deleteMedicineReminder,
  logMedicineTaken,
  createVaccinationReminder,
  getMyVaccinationReminders,
  updateVaccinationReminder,
  deleteVaccinationReminder,
};
