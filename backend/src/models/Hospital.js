const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    hospitalName: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
    },
    registrationNumber: { type: String, trim: true },
    type: {
      type: String,
      enum: ['government', 'private', 'clinic', 'diagnostic_centre', 'pharmacy'],
      default: 'private',
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },
    phone: { type: String },
    email: { type: String },
    website: { type: String },
    departments: [{ type: String }],
    facilities: [{ type: String }],
    operatingHours: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '21:00' },
    },
    taxRate: { type: Number, default: 0 }, // percentage e.g. 18 for 18% GST
    isActive: { type: Boolean, default: true },
    logo: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Hospital', hospitalSchema);
