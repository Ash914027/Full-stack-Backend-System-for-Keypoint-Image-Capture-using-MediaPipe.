const express = require('express');
const router = express.Router();
const poseController = require('../controllers/poseController');

// Extract pose keypoints
router.post('/extract-pose', poseController.extractPose);

// Get all poses
router.get('/poses', poseController.getAllPoses);

// Get single pose
router.get('/poses/:id', poseController.getPoseById);

// Update pose
router.put('/poses/:id', poseController.updatePose);

// Delete pose
router.delete('/poses/:id', poseController.deletePose);

module.exports = router;