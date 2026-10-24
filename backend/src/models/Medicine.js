const mongoose = require('mongoose');

// Exactly 10 approved medicines as per specification
const APPROVED_MEDICINES = [
  'Paracetamol',
  'Cetirizine',
  'ORS',
  'Antacid',
  'Calcium supplements',
  'Iron supplements',
  'Vitamin D supplements',
  'Saline nasal drops',
  'Ibuprofen',
  'Amoxicillin',
];

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      unique: true,
      trim: true,
      enum: {
        values: APPROVED_MEDICINES,
        message: '{VALUE} is not in the approved medicine catalogue',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    category: { type: String, trim: true },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Price cannot be negative'],
    },
    unit: { type: String, default: 'strip' }, // strip, bottle, sachet, etc.
    stockQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    requiresPrescription: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    manufacturer: { type: String, trim: true },
    composition: { type: String, trim: true },
    sideEffects: { type: String, trim: true },
    storageInstructions: { type: String, trim: true },
    image: { type: String, default: null },
  },
  { timestamps: true }
);

medicineSchema.statics.APPROVED_MEDICINES = APPROVED_MEDICINES;

module.exports = mongoose.model('Medicine', medicineSchema);
