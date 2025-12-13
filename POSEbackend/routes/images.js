const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');

// Get image by ID
router.get('/images/:imageId', imageController.getImage);

module.exports = router;