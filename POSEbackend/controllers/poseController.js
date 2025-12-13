const { pool } = require('../config/mysql');
const { client } = require('../config/mongodb');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Extract pose keypoints
exports.extractPose = [
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      // Save image to temp file for Python script
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempImagePath = path.join(tempDir, `temp_${Date.now()}_${req.file.originalname}`);
      fs.writeFileSync(tempImagePath, req.file.buffer);

      // Call Python script
      const pythonScript = process.env.PYTHON_SCRIPT_PATH || './python/extract_pose.py';
      const pythonProcess = spawn('python', [pythonScript, tempImagePath]);

      let pythonOutput = '';
      let pythonError = '';

      pythonProcess.stdout.on('data', (data) => {
        pythonOutput += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        pythonError += data.toString();
      });

      pythonProcess.on('close', async (code) => {
        // Clean up temp file
        fs.unlinkSync(tempImagePath);

        if (code !== 0) {
          console.error('Python script error:', pythonError);
          return res.status(500).json({
            success: false,
            message: 'Failed to extract pose keypoints',
            error: pythonError
          });
        }

        try {
          const keypoints = JSON.parse(pythonOutput.trim());

          // Store image in MongoDB
          const db = client.db();
          const bucket = new (require('mongodb').GridFSBucket)(db, { bucketName: 'images' });
          const uploadStream = bucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype
          });

          uploadStream.end(req.file.buffer);

          const imageId = uploadStream.id;

          // Store keypoints in MySQL
          const [result] = await pool.execute(
            'INSERT INTO poses (image_id, keypoints) VALUES (?, ?)',
            [imageId.toString(), JSON.stringify(keypoints)]
          );

          const poseId = result.insertId;

          res.json({
            success: true,
            message: 'Pose extracted successfully',
            data: {
              id: poseId,
              imageId: imageId.toString(),
              keypoints: keypoints,
              createdAt: new Date().toISOString()
            }
          });
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          res.status(500).json({
            success: false,
            message: 'Failed to parse keypoints data'
          });
        }
      });
    } catch (error) {
      console.error('Extract pose error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
];

// Get all poses with pagination
exports.getAllPoses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [rows] = await pool.execute(
      'SELECT id, image_id, keypoints, created_at, updated_at FROM poses ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM poses');
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        poses: rows.map(row => ({
          id: row.id,
          imageId: row.image_id,
          keypoints: JSON.parse(row.keypoints),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        })),
        pagination: {
          total: total,
          page: page,
          limit: limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all poses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve poses'
    });
  }
};

// Get single pose
exports.getPoseById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      'SELECT id, image_id, keypoints, created_at, updated_at FROM poses WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pose not found'
      });
    }

    const pose = rows[0];
    const imageUrl = `${req.protocol}://${req.get('host')}/api/images/${pose.image_id}`;

    res.json({
      success: true,
      data: {
        id: pose.id,
        imageId: pose.image_id,
        imageUrl: imageUrl,
        keypoints: JSON.parse(pose.keypoints),
        createdAt: pose.created_at,
        updatedAt: pose.updated_at
      }
    });
  } catch (error) {
    console.error('Get pose by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pose'
    });
  }
};

// Update pose
exports.updatePose = async (req, res) => {
  try {
    const { id } = req.params;
    const { keypoints } = req.body;

    if (!keypoints || !Array.isArray(keypoints)) {
      return res.status(400).json({
        success: false,
        message: 'Valid keypoints array is required'
      });
    }

    const [result] = await pool.execute(
      'UPDATE poses SET keypoints = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(keypoints), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pose not found'
      });
    }

    res.json({
      success: true,
      message: 'Pose updated successfully'
    });
  } catch (error) {
    console.error('Update pose error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pose'
    });
  }
};

// Delete pose
exports.deletePose = async (req, res) => {
  try {
    const { id } = req.params;

    // Get image_id first
    const [rows] = await pool.execute('SELECT image_id FROM poses WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pose not found'
      });
    }

    const imageId = rows[0].image_id;

    // Delete from MySQL
    await pool.execute('DELETE FROM poses WHERE id = ?', [id]);

    // Delete from MongoDB GridFS
    const db = client.db();
    const bucket = new (require('mongodb').GridFSBucket)(db, { bucketName: 'images' });
    await bucket.delete(new require('mongodb').ObjectId(imageId));

    res.json({
      success: true,
      message: 'Pose deleted successfully'
    });
  } catch (error) {
    console.error('Delete pose error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete pose'
    });
  }
};