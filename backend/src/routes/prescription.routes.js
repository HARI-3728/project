const express = require('express');
const {
  doctorAddPrescription,
  uploadPrescription,
  getMyPrescriptions,
  getPrescriptionById,
  previewPrescription,
  downloadPrescription,
  reprocessPrescription,
  getDoctorPrescriptions,
} = require('../controllers/prescription.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { handleUpload } = require('../middleware/upload.middleware');

const router = express.Router();

router.post('/', protect, authorize('doctor'), doctorAddPrescription);
router.post('/upload', protect, authorize('patient'), handleUpload('prescription'), uploadPrescription);
router.get('/my', protect, authorize('patient'), getMyPrescriptions);
router.get('/doctor', protect, authorize('doctor'), getDoctorPrescriptions);
router.get('/:id', protect, getPrescriptionById);
router.get('/:id/preview', protect, previewPrescription);
router.get('/:id/download', protect, downloadPrescription);
router.post('/:id/reprocess', protect, authorize('patient'), reprocessPrescription);

module.exports = router;
