const express = require('express');
const router = express.Router();
const { performBackup } = require('../services/backupService');

// Manual backup trigger
router.post('/backup/trigger', async (req, res) => {
  try {
    await performBackup();
    res.json({
      success: true,
      message: 'Backup completed successfully'
    });
  } catch (error) {
    console.error('Manual backup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Backup failed',
      error: error.message
    });
  }
});

module.exports = router;