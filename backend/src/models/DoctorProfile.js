const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0, // Sunday
    max: 6, // Saturday
  },
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },   // "17:00"
  slotDurationMinutes: { type: Number, default: 30 },
  isAvailable: { type: Boolean, default: true },
});

const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
    },
    qualifications: [{ type: String, trim: true }],
    experience: { type: Number, default: 0 }, // years
    registrationNumber: { type: String, trim: true },
    consultationFee: { type: Number, default: 0 },
    consultationCategories: [
      {
        type: String,
        trim: true,
      },
    ],
    availability: [availabilitySlotSchema],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    bio: { type: String, trim: true, maxlength: 1000 },
    languages: [{ type: String }],
    isVerified: { type: Boolean, default: false },
    isAcceptingAppointments: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
