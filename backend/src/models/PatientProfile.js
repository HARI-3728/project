const mongoose = require('mongoose');

const patientProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    allergies: [{ type: String, trim: true }],
    chronicConditions: [{ type: String, trim: true }],
    height: { type: Number }, // in cm
    weight: { type: Number }, // in kg
    insuranceProvider: { type: String, trim: true },
    insurancePolicyNumber: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PatientProfile', patientProfileSchema);
