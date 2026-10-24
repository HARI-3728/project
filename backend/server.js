require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');
const { seedMedicines } = require('./src/seeds/medicine.seed');

const PORT = process.env.PORT || 5000;

// Connect to database then start server
const startServer = async () => {
  try {
    await connectDB();
    logger.info('MongoDB connected successfully');

    // Seed medicines on startup (idempotent - won't duplicate)
    await seedMedicines();

    app.listen(PORT, () => {
      logger.info(`MediCare+ Backend running on port ${PORT} [${process.env.NODE_ENV}]`);
      logger.info(`Health check: http://localhost:${PORT}/api/v1/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.message);
  process.exit(1);
});

startServer();
