const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'appointment_upcoming',
        'appointment_confirmed',
        'appointment_cancelled',
        'appointment_rescheduled',
        'appointment_completed',
        'medicine_reminder',
        'vaccination_reminder',
        'order_status_update',
        'order_new',
        'order_awaiting_review',
        'bill_generated',
        'bill_payment_update',
        'prescription_issued',
        'general',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    // Reference to the related entity
    refModel: {
      type: String,
      enum: ['Appointment', 'Order', 'Bill', 'Prescription', 'MedicineReminder', 'VaccinationReminder', null],
      default: null,
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

module.exports = mongoose.model('Notification', notificationSchema);
