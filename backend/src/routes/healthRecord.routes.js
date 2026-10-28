const express = require('express');
const {
  createHealthRecord,
  getMyHealthRecords,
  getHealthRecordById,
  previewHealthRecord,
  downloadHealthRecord,
  reprocessHealthRecord,
} = require('../controllers/medicalHistory.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { handleUpload } = require('../middleware/upload.middleware');

const router = express.Router();

router.post('/', protect, authorize('patient'), handleUpload('file'), createHealthRecord);
router.get('/my', protect, authorize('patient'), getMyHealthRecords);
router.get('/', protect, authorize('patient'), getMyHealthRecords);
router.get('/:id', protect, getHealthRecordById);
router.get('/:id/preview', protect, previewHealthRecord);
router.get('/:id/download', protect, downloadHealthRecord);
router.post('/:id/reprocess', protect, authorize('patient'), reprocessHealthRecord);

module.exports = router;
