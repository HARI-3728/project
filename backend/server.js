require('dotenv').config();
const { getServerConfig } = require('./src/config/env');
let config;
try {
  config = getServerConfig();
} catch (error) {
  console.error(`Configuration error: ${error.message}`);
  process.exit(1);
}

const app = require('./src/app');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');
const { seedMedicines } = require('./src/seeds/medicine.seed');

// Connect to database then start server
const startServer = async () => {
  try {
    await connectDB();
    logger.info('MongoDB connected successfully');

    // Seed medicines on startup (idempotent - won't duplicate)
    await seedMedicines();

    app.listen(config.port, () => {
      logger.info(`MediCare+ Backend running on port ${config.port} [${process.env.NODE_ENV}]`);
      logger.info(`Health check: ${config.backendUrl}/api/v1/health`);
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
