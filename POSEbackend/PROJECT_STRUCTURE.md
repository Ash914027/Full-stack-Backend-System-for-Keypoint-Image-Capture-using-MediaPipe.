# Project Structure

```
mediapipe-backend-system/
│
├── config/                          # Database configurations
│   ├── mysql.js                     # MySQL connection pool
│   └── mongodb.js                   # MongoDB + GridFS setup
│
├── controllers/                     # Request handlers
│   └── poseController.js            # All pose-related endpoints
│
├── routes/                          # API route definitions
│   ├── poseRoutes.js                # Pose CRUD routes
│   └── backupRoutes.js              # Backup trigger route
│
├── services/                        # Business logic
│   ├── backupService.js             # Backup orchestration
│   └── emailService.js              # SendGrid/SMTP email
│
├── python/                          # Python scripts
│   ├── extract_pose.py              # MediaPipe keypoint extraction
│   └── requirements.txt             # Python dependencies
│
├── scripts/                         # Utility scripts
│   ├── initDatabase.js              # Database initialization
│   └── manualBackup.js              # Manual backup trigger (optional)
│
├── sample_database/                 # Sample data for testing
│   ├── mysql_dump.sql               # Sample MySQL data
│   └── mongodb_export.json          # Sample MongoDB data
│
├── screenshots/                     # Documentation images
│   ├── extract-pose-response.png
│   ├── get-all-poses.png
│   ├── email-notification.png
│   └── backup-contents.png
│
├── backups/                         # Generated backup files (auto-created)
│   ├── 2025-12-10-backup.zip
│   └── temp/                        # Temporary backup files
│
├── temp/                            # Temporary image processing (auto-created)
│
├── .env                             # Environment variables (create from .env.example)
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore rules
├── package.json                     # Node.js dependencies
├── server.js                        # Main application entry
├── postman_collection.json          # Postman API tests
├── README.md                        # Main documentation
└── PROJECT_STRUCTURE.md             # This file
```

## Key Directories

### `/config`
Database connection managers with pooling and error handling.

### `/controllers`
Handle HTTP requests, validate input, and format responses.

### `/routes`
Define API endpoints and connect them to controllers.

### `/services`
Core business logic separated from controllers:
- Backup orchestration (MySQL export, MongoDB export, ZIP creation)
- Email sending (SendGrid/SMTP with HTML templates)

### `/python`
MediaPipe pose extraction script callable from Node.js.

### `/scripts`
Utility scripts for setup and maintenance:
- Database initialization
- Manual backup triggers

### `/sample_database`
Sample data for quick testing and demo purposes.

### `/backups` (auto-created)
Stores daily backup ZIP files. The `temp/` subdirectory is used during backup creation and cleaned up after.

### `/temp` (auto-created)
Temporary storage for images during Python processing. Files are deleted after extraction.

## File Purposes

| File | Purpose |
|------|---------|
| `server.js` | Main Express server with middleware and cron setup |
| `package.json` | Node.js dependencies and scripts |
| `.env` | Environment variables (passwords, API keys) |
| `postman_collection.json` | Pre-configured API tests for Postman |
| `README.md` | Complete documentation with setup guide |

## Auto-Created Directories

These directories are created automatically by the application:
- `backups/` - When first backup runs
- `backups/temp/` - During backup process
- `temp/` - When first image is uploaded

## Environment Variables

All sensitive configuration is stored in `.env`:
- Database credentials
- API keys (SendGrid)
- SMTP settings (if using email)
- Backup schedule
- Python script path

## Getting Started

1. Clone repository
2. Copy `.env.example` to `.env`
3. Configure environment variables
4. Install dependencies: `npm install`
5. Install Python packages: `cd python && pip install -r requirements.txt`
6. Initialize database: `npm run init-db`
7. Start server: `npm start`

## Testing

Import `postman_collection.json` into Postman for comprehensive API testing with pre-configured requests.