const express = require('express');
const {
  createMedicineReminder,
  getMyMedicineReminders,
  updateMedicineReminder,
  deleteMedicineReminder,
  logMedicineTaken,
  createVaccinationReminder,
  getMyVaccinationReminders,
  updateVaccinationReminder,
  deleteVaccinationReminder,
} = require('../controllers/prescription.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// Medicine Reminders
router.post('/medicines', protect, authorize('patient'), createMedicineReminder);
router.get('/medicines', protect, authorize('patient'), getMyMedicineReminders);
router.patch('/medicines/:id', protect, authorize('patient'), updateMedicineReminder);
router.delete('/medicines/:id', protect, authorize('patient'), deleteMedicineReminder);
router.post('/medicines/:id/take', protect, authorize('patient'), logMedicineTaken);

// Vaccination Reminders
router.post('/vaccinations', protect, authorize('patient'), createVaccinationReminder);
router.get('/vaccinations', protect, authorize('patient'), getMyVaccinationReminders);
router.patch('/vaccinations/:id', protect, authorize('patient'), updateVaccinationReminder);
router.delete('/vaccinations/:id', protect, authorize('patient'), deleteVaccinationReminder);

module.exports = router;
