const mongoose = require('mongoose');

// All 60 conditions from the frontend specification
const CONDITIONS = [
  // Common Symptoms & Illnesses
  'Fever', 'Cold', 'Cough', 'Headache', 'Sore Throat', 'Body Pain',
  'Fatigue / Weakness', 'Dizziness', 'Vomiting', 'Nausea', 'Diarrhea',
  'Constipation', 'Stomach Pain', 'Acidity', 'Allergy',
  // General Medical Conditions
  'Viral Fever', 'Dengue', 'Malaria', 'Typhoid', 'Asthma', 'Diabetes',
  'High Blood Pressure', 'Low Blood Pressure', 'Anemia', 'Thyroid Disorders',
  'Migraine', 'Arthritis', 'Gastritis', 'Food Poisoning',
  'Urinary Tract Infection (UTI)',
  // Specialist-Related Conditions
  'Skin Allergy', 'Acne', 'Hair Fall', 'Eye Infection', 'Ear Pain',
  'Dental Pain', 'Back Pain', 'Joint Pain', 'Menstrual Problems',
  'Pregnancy-Related Consultation', 'Heart-Related Problems',
  'Kidney-Related Problems', 'Liver-Related Problems',
  'Respiratory Problems', 'Mental Health Consultation',
  // Other Common Conditions
  'Sinusitis', 'Bronchitis', 'Pneumonia', 'Chickenpox', 'Measles',
  'Eczema', 'Fungal Infection', 'Piles', 'Acid Reflux (GERD)',
  'Sleep Problems', 'Weight-Related Consultation', 'Nutritional Deficiency',
  'Muscle Strain', 'Sprain', 'General Health Check-up',
];

const CATEGORIES = {
  'Common Symptoms & Illnesses': [
    'Fever', 'Cold', 'Cough', 'Headache', 'Sore Throat', 'Body Pain',
    'Fatigue / Weakness', 'Dizziness', 'Vomiting', 'Nausea', 'Diarrhea',
    'Constipation', 'Stomach Pain', 'Acidity', 'Allergy',
  ],
  'General Medical Conditions': [
    'Viral Fever', 'Dengue', 'Malaria', 'Typhoid', 'Asthma', 'Diabetes',
    'High Blood Pressure', 'Low Blood Pressure', 'Anemia', 'Thyroid Disorders',
    'Migraine', 'Arthritis', 'Gastritis', 'Food Poisoning',
    'Urinary Tract Infection (UTI)',
  ],
  'Specialist-Related Conditions': [
    'Skin Allergy', 'Acne', 'Hair Fall', 'Eye Infection', 'Ear Pain',
    'Dental Pain', 'Back Pain', 'Joint Pain', 'Menstrual Problems',
    'Pregnancy-Related Consultation', 'Heart-Related Problems',
    'Kidney-Related Problems', 'Liver-Related Problems',
    'Respiratory Problems', 'Mental Health Consultation',
  ],
  'Other Common Conditions': [
    'Sinusitis', 'Bronchitis', 'Pneumonia', 'Chickenpox', 'Measles',
    'Eczema', 'Fungal Infection', 'Piles', 'Acid Reflux (GERD)',
    'Sleep Problems', 'Weight-Related Consultation', 'Nutritional Deficiency',
    'Muscle Strain', 'Sprain', 'General Health Check-up',
  ],
};

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
    },
    condition: {
      type: String,
      required: [true, 'Condition/reason is required'],
      enum: CONDITIONS,
    },
    category: {
      type: String,
      enum: Object.keys(CATEGORIES),
    },
    symptoms: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
      default: 'pending',
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'hospital', null],
      default: null,
    },
    cancellationReason: { type: String, trim: true },
    fee: { type: Number, default: 0 },
    consultationFeeSnapshot: { type: Number, default: 0 },
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null,
    },
    followUpDate: { type: Date, default: null },
    isFollowUp: { type: Boolean, default: false },
    parentAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index to prevent double-booking the same doctor/time slot
appointmentSchema.index(
  { doctor: 1, appointmentDate: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: { $nin: ['cancelled'] } } }
);

appointmentSchema.index({ patient: 1, appointmentDate: -1 });
// Auto-calculate endTime if missing but startTime is present
appointmentSchema.pre('validate', function (next) {
  if (!this.startTime && this.appointmentTime) {
    this.startTime = this.appointmentTime;
  }
  if (this.startTime && !this.endTime) {
    const [h, m] = this.startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + 30;
    this.endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  }
  next();
});

appointmentSchema.statics.CONDITIONS = CONDITIONS;
appointmentSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model('Appointment', appointmentSchema);
