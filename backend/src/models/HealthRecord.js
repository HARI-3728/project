const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Record title is required'],
      trim: true,
    },
    recordType: {
      type: String,
      enum: ['lab_report', 'scan', 'xray', 'prescription', 'discharge_summary', 'vaccination_certificate', 'other'],
      required: true,
    },
    description: { type: String, trim: true },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileType: { type: String, default: null },
    fileSize: { type: Number, default: null }, // bytes
    hospitalName: { type: String, trim: true },
    doctorName: { type: String, trim: true },
    recordDate: { type: Date, default: Date.now },
    tags: [{ type: String, trim: true }],
    isSharedWithDoctor: { type: Boolean, default: false },
    sharedWith: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

healthRecordSchema.index({ patient: 1, recordDate: -1 });

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
