const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const path = require('path');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
const errorHandler = require('./middleware/error.middleware');
const logger = require('./utils/logger');

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());

// ─── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body Parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── HTTP Request Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// ─── Static Uploads (private – only for authorized access via API) ──────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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
