const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
const errorHandler = require('./middleware/error.middleware');
const logger = require('./utils/logger');
const { configureCors } = require('./middleware/cors');

const app = express();

// ─── CORS ───────────────────────────────────────────────────────────────────
// Configure CORS middleware BEFORE any API routes.
// This handles both actual requests and OPTIONS preflight requests.
app.use(configureCors());

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());

// ─── Body Parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── HTTP Request Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// ─── Document files (private – served only via authenticated controller endpoints) ───
// The previous express.static('/uploads') exposed every patient document publicly.
// Files are now served through preview/download routes that verify ownership.

// ─── Global Rate Limiter ─────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MediCare+ API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/v1/auth',         require('./routes/auth.routes'));
app.use('/api/v1/patients',     require('./routes/patient.routes'));
app.use('/api/v1/doctors',      require('./routes/doctor.routes'));
app.use('/api/v1/hospital',     require('./routes/hospital.routes'));
app.use('/api/v1/conditions',   require('./routes/condition.routes'));
app.use('/api/v1/appointments', require('./routes/appointment.routes'));
app.use('/api/v1/diagnostics',  require('./routes/diagnostic.routes'));
app.use('/api/v1/prescriptions',require('./routes/prescription.routes'));
app.use('/api/v1/medicines',    require('./routes/medicine.routes'));
app.use('/api/v1/orders',       require('./routes/order.routes'));
app.use('/api/v1/reminders',    require('./routes/reminder.routes'));
app.use('/api/v1/notifications',require('./routes/notification.routes'));
app.use('/api/v1/medical-history', require('./routes/medicalHistory.routes'));
app.use('/api/v1/health-records',  require('./routes/healthRecord.routes'));
app.use('/api/v1/diet',         require('./routes/diet.routes'));
app.use('/api/v1/ai',           require('./routes/ai.routes'));

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Centralized Error Handler ───────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
