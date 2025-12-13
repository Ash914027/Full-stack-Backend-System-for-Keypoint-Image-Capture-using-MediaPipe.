const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pose_images_db';
const client = new MongoClient(uri);

const connectMongoDB = async () => {
  try {
    await client.connect();
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    return false;
  }
};

module.exports = { client, connectMongoDB };