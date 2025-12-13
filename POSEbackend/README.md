# MediaPipe Keypoint Extraction & Backup System

A complete backend system for extracting pose keypoints from images, storing data in SQL/NoSQL databases, and automating daily backups with email notifications.

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Cron Job Configuration](#cron-job-configuration)
- [Database Schema](#database-schema)
- [Testing](#testing)

## ✨ Features

- Extract 33 body keypoints using MediaPipe Pose
- Store keypoints in MySQL database
- Store original images in MongoDB
- Full CRUD REST API
- Automated daily backups at 11:59 PM
- Email notifications with backup ZIP attachments
- Comprehensive error handling

## 🛠 Tech Stack

- **Backend**: Node.js (Express)
- **SQL Database**: MySQL
- **NoSQL Database**: MongoDB
- **Image Processing**: Python 3.8+ with MediaPipe
- **Cron Jobs**: node-cron
- **File Compression**: archiver
- **Email Service**: SendGrid / Nodemailer

## 📦 Prerequisites

- Node.js (v14 or higher)
- Python 3.8+
- MySQL 8.0+
- MongoDB 4.4+
- SendGrid API Key (or SMTP credentials)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone 
cd mediapipe-backend-system
```

### 2. Install Node.js Dependencies
```bash
npm install
```

### 3. Install Python Dependencies
```bash
cd python
pip install -r requirements.txt
cd ..
```

### 4. Set Up Databases

**MySQL:**
```bash
mysql -u root -p
CREATE DATABASE pose_keypoints_db;
exit
```

**MongoDB:**
```bash
# Ensure MongoDB is running
mongod --dbpath /path/to/data
```

### 5. Initialize Database Schema
```bash
node scripts/initDatabase.js
```

## ⚙️ Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=pose_keypoints_db

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/pose_images_db

# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com
TO_EMAIL=admin@yourdomain.com

# Alternative: SMTP Configuration (if not using SendGrid)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Backup Configuration
BACKUP_DIR=./backups
CRON_SCHEDULE=59 23 * * *

# Python Script Path
PYTHON_SCRIPT_PATH=./python/extract_pose.py
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. Extract Pose Keypoints
**POST** `/extract-pose`

Upload an image and extract 33 body keypoints.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `image`: Image file (JPEG, PNG)

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/extract-pose \
  -F "image=@/path/to/image.jpg"
```

**Response:**
```json
{
  "success": true,
  "message": "Pose extracted successfully",
  "data": {
    "id": 1,
    "imageId": "507f1f77bcf86cd799439011",
    "keypoints": [
      {"x": 0.5, "y": 0.3, "z": -0.2, "visibility": 0.99, "name": "nose"},
      {"x": 0.48, "y": 0.28, "z": -0.18, "visibility": 0.95, "name": "left_eye_inner"},
      // ... 31 more keypoints
    ],
    "createdAt": "2025-12-10T10:30:00.000Z"
  }
}
```

#### 2. Get All Poses
**GET** `/poses`

Retrieve all stored poses with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**cURL Example:**
```bash
curl http://localhost:3000/api/poses?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "poses": [...],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

#### 3. Get Single Pose
**GET** `/poses/:id`

Retrieve a specific pose by ID.

**cURL Example:**
```bash
curl http://localhost:3000/api/poses/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "imageId": "507f1f77bcf86cd799439011",
    "imageUrl": "http://localhost:3000/api/images/507f1f77bcf86cd799439011",
    "keypoints": [...],
    "createdAt": "2025-12-10T10:30:00.000Z",
    "updatedAt": "2025-12-10T10:30:00.000Z"
  }
}
```

#### 4. Update Pose
**PUT** `/poses/:id`

Update keypoints for a specific pose.

**Request Body:**
```json
{
  "keypoints": [
    {"x": 0.5, "y": 0.3, "z": -0.2, "visibility": 0.99, "name": "nose"},
    // ... 32 more keypoints
  ]
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/api/poses/1 \
  -H "Content-Type: application/json" \
  -d '{"keypoints": [...]}'
```

#### 5. Delete Pose
**DELETE** `/poses/:id`

Delete a specific pose and its associated image.

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/poses/1
```

#### 6. Get Image
**GET** `/images/:imageId`

Retrieve the original image.

**cURL Example:**
```bash
curl http://localhost:3000/api/images/507f1f77bcf86cd799439011 \
  --output image.jpg
```

#### 7. Health Check
**GET** `/health`

Check API and database connectivity.

**Response:**
```json
{
  "success": true,
  "mysql": "connected",
  "mongodb": "connected",
  "timestamp": "2025-12-10T10:30:00.000Z"
}
```

## ⏰ Cron Job Configuration

The system automatically runs a backup job daily at 11:59 PM.

### Cron Schedule Format
```
59 23 * * *
```
- Minute: 59
- Hour: 23 (11 PM)
- Day of Month: * (every day)
- Month: * (every month)
- Day of Week: * (every day)

### Manual Backup Trigger
**POST** `/backup/trigger`

Manually trigger the backup process.

```bash
curl -X POST http://localhost:3000/api/backup/trigger
```

### Backup Process
1. Creates `backups` directory if not exists
2. Exports MySQL data to SQL dump
3. Exports MongoDB collections to JSON
4. Downloads all images from MongoDB GridFS
5. Creates ZIP file: `YYYY-MM-DD-backup.zip`
6. Sends email with ZIP attachment
7. Cleans up temporary files

## 🗄 Database Schema

### MySQL Table: `poses`
```sql
CREATE TABLE poses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  image_id VARCHAR(255) NOT NULL,
  keypoints JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_image_id (image_id),
  INDEX idx_created_at (created_at)
);
```

### MongoDB Collection: `images`
Uses GridFS for storing large image files:
- Collection: `images.files`
- Collection: `images.chunks`

## 🧪 Testing

### Using Postman

1. **Import Collection**: Import the provided `postman_collection.json`
2. **Set Environment Variables**:
   - `base_url`: http://localhost:3000/api
3. **Test Workflow**:
   - Health Check → Extract Pose → Get All Poses → Get Single Pose → Update Pose → Delete Pose

### Using cURL

**Complete Test Workflow:**
```bash
# 1. Health Check
curl http://localhost:3000/api/health

# 2. Extract Pose
curl -X POST http://localhost:3000/api/extract-pose \
  -F "image=@test_image.jpg"

# 3. Get All Poses
curl http://localhost:3000/api/poses

# 4. Get Single Pose (replace {id} with actual ID)
curl http://localhost:3000/api/poses/1

# 5. Get Image (replace {imageId} with actual MongoDB ID)
curl http://localhost:3000/api/images/507f1f77bcf86cd799439011 \
  --output downloaded_image.jpg

# 6. Manual Backup
curl -X POST http://localhost:3000/api/backup/trigger
```

## 📧 Email Notification Sample

**Subject:** Daily DB Backup - 2025-12-10

**Body:**
```
Hello,

Your daily database backup has been completed successfully.

Backup Details:
- Date: December 10, 2025
- Time: 11:59 PM
- File: 2025-12-10-backup.zip
- Size: 15.3 MB

The backup includes:
✓ MySQL database dump
✓ MongoDB collections export
✓ All stored images

Please find the backup file attached to this email.

Best regards,
Automated Backup System
```

## 📸 Screenshots

### Postman - Extract Pose Response
![Extract Pose API](screenshots/extract-pose-response.png)

### Postman - Get All Poses
![Get All Poses](screenshots/get-all-poses.png)

### Email Notification
![Email Notification](screenshots/email-notification.png)

### Backup ZIP Contents
![Backup ZIP](screenshots/backup-contents.png)

## 🐛 Troubleshooting

### Common Issues

**1. Python Script Not Found**
```bash
# Ensure Python script path is correct in .env
PYTHON_SCRIPT_PATH=./python/extract_pose.py
```

**2. MySQL Connection Error**
```bash
# Check MySQL credentials and ensure service is running
sudo systemctl start mysql
```

**3. MongoDB Connection Error**
```bash
# Ensure MongoDB is running
sudo systemctl start mongod
```

**4. SendGrid Email Failure**
```bash
# Verify API key is valid
# Check FROM_EMAIL is verified in SendGrid dashboard
```