const { DietPlan, DailyDietLog } = require('../models/DietPlan');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// @desc   Get standard / recommended diet plans
// @route  GET /api/v1/diet/plans
// @access Private
const getDietPlans = async (req, res, next) => {
  try {
    const { condition, goal, page = 1, limit = 20 } = req.query;
    const query = {
      $or: [{ isTemplate: true }, { patient: req.user._id }],
      isActive: true,
    };

    if (condition) query.condition = new RegExp(condition, 'i');
    if (goal) query.goal = goal;

    const skip = (page - 1) * limit;
    const total = await DietPlan.countDocuments(query);
    const plans = await DietPlan.find(query)
      .populate('prescribedBy', 'name specialization')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, plans, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Get patient's active diet plan
// @route  GET /api/v1/diet/my-plan
// @access Private (Patient)
const getMyDietPlan = async (req, res, next) => {
  try {
    let plan = await DietPlan.findOne({
      patient: req.user._id,
      isActive: true,
    })
      .populate('prescribedBy', 'name specialization')
      .sort({ updatedAt: -1 });

    // If no custom plan assigned, return default General Wellness template
    if (!plan) {
      plan = await DietPlan.findOne({ isTemplate: true, goal: 'general' });
    }

    return sendSuccess(res, 200, 'Active diet plan retrieved', plan);
  } catch (error) {
    next(error);
  }
};

// @desc   Get diet plan by ID
// @route  GET /api/v1/diet/plans/:id
// @access Private
const getDietPlanById = async (req, res, next) => {
  try {
    const plan = await DietPlan.findById(req.params.id).populate('prescribedBy', 'name specialization');
    if (!plan) return sendError(res, 404, 'Diet plan not found.');
    return sendSuccess(res, 200, 'Diet plan details', plan);
  } catch (error) {
    next(error);
  }
};

// @desc   Create or prescribe a custom diet plan
// @route  POST /api/v1/diet/plans
// @access Private (Doctor, Patient)
const createDietPlan = async (req, res, next) => {
  try {
    const {
      patientId,
      title,
      condition,
      goal,
      dailyCalorieTarget,
      waterIntakeTargetLiters,
      meals,
      foodsToEat,
      foodsToAvoid,
      guidelines,
      startDate,
      endDate,
    } = req.body;

    if (!title) {
      return sendError(res, 400, 'Title is required for the diet plan.');
    }

    const targetPatientId = req.user.role === 'patient' ? req.user._id : (patientId || req.user._id);

    // Deactivate previous active plans for this patient if new one is active
    await DietPlan.updateMany({ patient: targetPatientId, isActive: true }, { isActive: false });

    const plan = await DietPlan.create({
      patient: targetPatientId,
      prescribedBy: req.user.role === 'doctor' ? req.user._id : null,
      title,
      condition: condition || 'General Wellness',
      goal: goal || 'general',
      dailyCalorieTarget: dailyCalorieTarget || 2000,
      waterIntakeTargetLiters: waterIntakeTargetLiters || 2.5,
      meals: meals || [],
      foodsToEat: foodsToEat || [],
      foodsToAvoid: foodsToAvoid || [],
      guidelines: guidelines || [],
      startDate: startDate || new Date(),
      endDate,
      isActive: true,
      isTemplate: false,
    });

    return sendSuccess(res, 201, 'Diet plan created successfully', plan);
  } catch (error) {
    next(error);
  }
};

// @desc   Log daily diet adherence (meals completed, water intake)
// @route  POST /api/v1/diet/log
// @access Private (Patient)
const logDailyDiet = async (req, res, next) => {
  try {
    const { date, mealsCompleted, waterConsumedLiters, calorieIntake, notes, dietPlanId } = req.body;

    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(logDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let log = await DailyDietLog.findOne({
      patient: req.user._id,
      date: { $gte: logDate, $lt: nextDay },
    });

    if (log) {
      if (mealsCompleted) log.mealsCompleted = mealsCompleted;
      if (waterConsumedLiters !== undefined) log.waterConsumedLiters = waterConsumedLiters;
      if (calorieIntake !== undefined) log.calorieIntake = calorieIntake;
      if (notes !== undefined) log.notes = notes;
      if (dietPlanId) log.dietPlan = dietPlanId;
      await log.save();
    } else {
      log = await DailyDietLog.create({
        patient: req.user._id,
        dietPlan: dietPlanId || null,
        date: logDate,
        mealsCompleted: mealsCompleted || [],
        waterConsumedLiters: waterConsumedLiters || 0,
        calorieIntake: calorieIntake || 0,
        notes,
      });
    }

    return sendSuccess(res, 200, 'Daily diet logged successfully', log);
  } catch (error) {
    next(error);
  }
};

// @desc   Get patient diet adherence history
// @route  GET /api/v1/diet/logs
// @access Private (Patient)
const getDailyDietLogs = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - parseInt(days));

    const logs = await DailyDietLog.find({
      patient: req.user._id,
      date: { $gte: sinceDate },
    }).sort({ date: -1 });

    return sendSuccess(res, 200, 'Diet logs retrieved', logs);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDietPlans,
  getMyDietPlan,
  getDietPlanById,
  createDietPlan,
  logDailyDiet,
  getDailyDietLogs,
};
