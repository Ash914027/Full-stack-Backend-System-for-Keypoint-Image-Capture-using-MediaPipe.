const { pool } = require('../config/mysql');
const { client } = require('../config/mongodb');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { sendBackupEmail } = require('./emailService');

const performBackup = async () => {
  const backupDir = process.env.BACKUP_DIR || './backups';
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const backupPath = path.join(backupDir, `${timestamp}-backup.zip`);

  try {
    // Create backup directory if not exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create ZIP archive
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise(async (resolve, reject) => {
      output.on('close', async () => {
        console.log(`Backup archive created: ${archive.pointer()} bytes`);

        // Send email notification
        await sendBackupEmail(backupPath, timestamp);

        // Clean up temporary files
        await cleanupOldBackups(backupDir);

        resolve();
      });

      archive.on('error', (err) => {
        console.error('Archive error:', err);
        reject(err);
      });

      archive.pipe(output);

      // Backup MySQL data
      await backupMySQL(archive);

      // Backup MongoDB data
      await backupMongoDB(archive);

      // Backup images
      await backupImages(archive);

      archive.finalize();
    });
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
};

async function backupMySQL(archive) {
  try {
    const mysqlDumpPath = path.join(process.env.BACKUP_DIR || './backups', 'mysql_dump.sql');

    // Use mysqldump command
    const dumpCommand = `mysqldump -h ${process.env.MYSQL_HOST} -P ${process.env.MYSQL_PORT} -u ${process.env.MYSQL_USER} -p${process.env.MYSQL_PASSWORD} ${process.env.MYSQL_DATABASE} > "${mysqlDumpPath}"`;

    await execAsync(dumpCommand);

    // Add to archive
    archive.file(mysqlDumpPath, { name: 'mysql_dump.sql' });

    // Clean up temp file after archiving
    setTimeout(() => {
      if (fs.existsSync(mysqlDumpPath)) {
        fs.unlinkSync(mysqlDumpPath);
      }
    }, 1000);
  } catch (error) {
    console.error('MySQL backup failed:', error);
    throw error;
  }
}

async function backupMongoDB(archive) {
  try {
    const db = client.db();
    const collections = ['images.files', 'images.chunks'];

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();

      // Create JSON file
      const jsonPath = path.join(process.env.BACKUP_DIR || './backups', `${collectionName.replace('.', '_')}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(documents, null, 2));

      // Add to archive
      archive.file(jsonPath, { name: `${collectionName}.json` });

      // Clean up temp file after archiving
      setTimeout(() => {
        if (fs.existsSync(jsonPath)) {
          fs.unlinkSync(jsonPath);
        }
      }, 1000);
    }
  } catch (error) {
    console.error('MongoDB backup failed:', error);
    throw error;
  }
}

async function backupImages(archive) {
  try {
    const db = client.db();
    const bucket = new (require('mongodb').GridFSBucket)(db, { bucketName: 'images' });

    const files = await bucket.find({}).toArray();

    for (const file of files) {
      const downloadStream = bucket.openDownloadStream(file._id);
      const tempPath = path.join(process.env.BACKUP_DIR || './backups', `image_${file._id}.jpg`);

      const writeStream = fs.createWriteStream(tempPath);
      downloadStream.pipe(writeStream);

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Add to archive
      archive.file(tempPath, { name: `images/${file.filename}` });

      // Clean up temp file after archiving
      setTimeout(() => {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }, 1000);
    }
  } catch (error) {
    console.error('Images backup failed:', error);
    throw error;
  }
}

async function cleanupOldBackups(backupDir) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.zip'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        stats: fs.statSync(path.join(backupDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime);

    // Keep only last 7 backups
    if (files.length > 7) {
      for (let i = 7; i < files.length; i++) {
        fs.unlinkSync(files[i].path);
        console.log(`Cleaned up old backup: ${files[i].name}`);
      }
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

module.exports = { performBackup };