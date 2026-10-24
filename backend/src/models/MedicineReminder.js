const mongoose = require('mongoose');

const medicineReminderSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null,
    },
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    dosage: { type: String, trim: true },
    frequency: {
      type: String,
      enum: ['once_daily', 'twice_daily', 'thrice_daily', 'every_4_hours', 'every_6_hours', 'every_8_hours', 'as_needed', 'weekly'],
      required: true,
    },
    times: [{ type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/ }], // ["08:00", "14:00", "20:00"]
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    instructions: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    lastTakenAt: { type: Date, default: null },
    takenLog: [
      {
        takenAt: { type: Date },
        scheduledTime: { type: String },
        status: { type: String, enum: ['taken', 'skipped', 'missed'], default: 'taken' },
      },
    ],
  },
  { timestamps: true }
);

medicineReminderSchema.index({ patient: 1, isActive: 1 });

module.exports = mongoose.model('MedicineReminder', medicineReminderSchema);
