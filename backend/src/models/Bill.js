const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const billItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  medicineName: { type: String, required: true }, // price snapshot
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },   // price snapshot at billing time
  lineTotal: { type: Number, required: true },
});

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      unique: true,
      default: () => `BILL-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for walk-in / anonymous
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      unique: true, // one bill per order
      sparse: true,
    },
    items: {
      type: [billItemSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'Bill must have at least one item',
      },
    },
    subtotal: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },   // percentage
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'partially_paid', 'refunded'],
      default: 'unpaid',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'insurance', 'online', null],
      default: null,
    },
    paymentDate: { type: Date, default: null },
    notes: { type: String, trim: true },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

billSchema.index({ hospital: 1, createdAt: -1 });
billSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('Bill', billSchema);
