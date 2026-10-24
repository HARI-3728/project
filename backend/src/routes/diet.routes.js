const express = require('express');
const {
  getDietPlans,
  getMyDietPlan,
  getDietPlanById,
  createDietPlan,
  logDailyDiet,
  getDailyDietLogs,
} = require('../controllers/diet.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/plans', protect, getDietPlans);
router.get('/my-plan', protect, getMyDietPlan);
router.get('/plans/:id', protect, getDietPlanById);
router.post('/plans', protect, createDietPlan);
router.post('/log', protect, logDailyDiet);
router.get('/logs', protect, getDailyDietLogs);

module.exports = router;
