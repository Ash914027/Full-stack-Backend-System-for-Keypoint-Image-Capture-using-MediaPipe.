const { client } = require('../config/mongodb');
const { ObjectId } = require('mongodb');

// Get image by ID
exports.getImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!ObjectId.isValid(imageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image ID'
      });
    }

    const db = client.db();
    const bucket = new (require('mongodb').GridFSBucket)(db, { bucketName: 'images' });

    // Check if file exists
    const files = await bucket.find({ _id: new ObjectId(imageId) }).toArray();
    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const file = files[0];

    // Set content type
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Length', file.length);

    // Stream the file
    const downloadStream = bucket.openDownloadStream(new ObjectId(imageId));
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Download stream error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stream image'
      });
    });
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve image'
    });
  }
};