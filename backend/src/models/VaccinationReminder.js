const mongoose = require('mongoose');

const vaccinationReminderSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vaccineName: {
      type: String,
      required: [true, 'Vaccine name is required'],
      trim: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    administeredDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['upcoming', 'administered', 'overdue', 'cancelled'],
      default: 'upcoming',
    },
    hospitalName: { type: String, trim: true },
    doctorName: { type: String, trim: true },
    batchNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    nextDose: { type: Date, default: null },
    dose: { type: String, trim: true }, // e.g. "Dose 1 of 3"
    reminderDaysBefore: { type: Number, default: 7 },
  },
  { timestamps: true }
);

vaccinationReminderSchema.index({ patient: 1, dueDate: 1 });

module.exports = mongoose.model('VaccinationReminder', vaccinationReminderSchema);
