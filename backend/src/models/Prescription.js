const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema({
  medicineName: { type: String, required: true, trim: true },
  dosage: { type: String, trim: true },       // e.g. "500mg"
  frequency: { type: String, trim: true },    // e.g. "Twice daily"
  duration: { type: String, trim: true },     // e.g. "5 days"
  instructions: { type: String, trim: true }, // e.g. "After food"
});

const prescriptionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    prescriptionType: {
      type: String,
      enum: ['doctor_issued', 'uploaded'],
      default: 'doctor_issued',
    },
    medicines: [prescriptionItemSchema],
    diagnosis: { type: String, trim: true },
    notes: { type: String, trim: true },
    validUntil: { type: Date },
    prescriptionDate: { type: Date }, // Date written on the prescription, when available
    // For uploaded prescriptions (files)
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileType: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: { type: Date, default: null },
    // Document text extraction / OCR results
    extractedText: { type: String, default: null },
    processingStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    processingError: { type: String, default: null },
    extractedAt: { type: Date, default: null },
    ocrNote: { type: String, default: null },
  },
  { timestamps: true }
);

prescriptionSchema.index({ patient: 1, createdAt: -1 });
prescriptionSchema.index({ doctor: 1, createdAt: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
