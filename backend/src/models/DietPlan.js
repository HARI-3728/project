const mongoose = require('mongoose');

const mealItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  portion: { type: String, trim: true },
  calories: { type: Number, min: 0 },
  protein: { type: String, trim: true },
  notes: { type: String, trim: true },
});

const mealSchema = new mongoose.Schema({
  mealType: {
    type: String,
    enum: ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'],
    required: true,
  },
  time: { type: String, trim: true }, // e.g. "08:30 AM"
  items: [mealItemSchema],
  instructions: { type: String, trim: true },
});

const dietPlanSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null means a template / standard reference plan
    },
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null if system template or self-selected
    },
    title: {
      type: String,
      required: [true, 'Diet plan title is required'],
      trim: true,
    },
    condition: {
      type: String,
      trim: true,
      default: 'General Wellness',
    },
    goal: {
      type: String,
      enum: ['weight_loss', 'weight_gain', 'maintenance', 'diabetic_care', 'hypertension', 'recovery', 'general'],
      default: 'general',
    },
    dailyCalorieTarget: { type: Number, min: 0 },
    waterIntakeTargetLiters: { type: Number, default: 2.5, min: 0 },
    meals: [mealSchema],
    foodsToEat: [{ type: String, trim: true }],
    foodsToAvoid: [{ type: String, trim: true }],
    guidelines: [{ type: String, trim: true }],
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    isTemplate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const dailyDietLogSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dietPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DietPlan',
      default: null,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    mealsCompleted: [
      {
        type: String,
        enum: ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'],
      },
    ],
    waterConsumedLiters: { type: Number, default: 0, min: 0 },
    calorieIntake: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

dailyDietLogSchema.index({ patient: 1, date: -1 });

const DietPlan = mongoose.model('DietPlan', dietPlanSchema);
const DailyDietLog = mongoose.model('DailyDietLog', dailyDietLogSchema);

module.exports = { DietPlan, DailyDietLog };
