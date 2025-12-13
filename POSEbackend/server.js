require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

// Database connections
const { connectMySQL } = require('./config/mysql');
const { connectMongoDB } = require('./config/mongodb');

// Routes
const poseRoutes = require('./routes/poseRoutes');
const imageRoutes = require('./routes/images');
const backupRoutes = require('./routes/backupRoutes');

// Services
const { performBackup } = require('./services/backupService');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', poseRoutes);
app.use('/api', imageRoutes);
app.use('/api', backupRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const mysqlConnected = await connectMySQL();
    const mongodbConnected = await connectMongoDB();

    res.json({
      success: true,
      mysql: mysqlConnected ? 'connected' : 'disconnected',
      mongodb: mongodbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Ensure backup directory exists
const backupDir = process.env.BACKUP_DIR || './backups';
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Schedule daily backup
const cronSchedule = process.env.CRON_SCHEDULE || '59 23 * * *';
cron.schedule(cronSchedule, async () => {
  console.log('Running scheduled backup...');
  try {
    await performBackup();
    console.log('Scheduled backup completed successfully');
  } catch (error) {
    console.error('Scheduled backup failed:', error);
  }
});

// Start server
const startServer = async () => {
  try {
    await connectMySQL();
    await connectMongoDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Backup scheduled: ${cronSchedule}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;