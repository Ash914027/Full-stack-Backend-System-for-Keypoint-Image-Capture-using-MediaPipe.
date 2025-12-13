require('dotenv').config();
const mysql = require('mysql2/promise');

async function initDatabase() {
  try {
    // First connect without specifying database to create it
    const tempConnection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || ''
    });

    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DATABASE}`);
    await tempConnection.end();

    // Now connect to the specific database
    const dbConnection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE
    });

    // Create poses table
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS poses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        image_id VARCHAR(255) NOT NULL,
        keypoints JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_image_id (image_id),
        INDEX idx_created_at (created_at)
      )
    `);

    await dbConnection.end();

    console.log('Database initialized successfully');
    console.log(`Database: ${process.env.MYSQL_DATABASE}`);
    console.log('Table: poses');

    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();