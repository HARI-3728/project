const mongoose = require('mongoose');

const diagnosticServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['blood_test', 'urine_test', 'scan', 'xray', 'ecg', 'echo', 'endoscopy', 'biopsy', 'other'],
      required: true,
    },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    preparationInstructions: { type: String, trim: true },
    reportTime: { type: String, trim: true }, // e.g. "24 hours", "Same day"
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const diagnosticBookingSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiagnosticService',
      required: true,
    },
    serviceName: { type: String, required: true }, // snapshot
    servicePrice: { type: Number, required: true }, // snapshot
    bookingDate: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'sample_collected', 'report_ready', 'completed', 'cancelled'],
      default: 'pending',
    },
    reportUrl: { type: String, default: null },
    notes: { type: String, trim: true },
    cancellationReason: { type: String, trim: true },
  },
  { timestamps: true }
);

diagnosticBookingSchema.index({ patient: 1, bookingDate: -1 });
diagnosticBookingSchema.index({ hospital: 1, bookingDate: 1 });

const DiagnosticService = mongoose.model('DiagnosticService', diagnosticServiceSchema);
const DiagnosticBooking = mongoose.model('DiagnosticBooking', diagnosticBookingSchema);

module.exports = { DiagnosticService, DiagnosticBooking };
