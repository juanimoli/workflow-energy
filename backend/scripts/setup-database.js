const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const logger = require('../utils/logger');

const setupDatabase = async () => {
  let pool;
  
  try {
    // Connect to PostgreSQL server (not specific database)
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    const dbName = process.env.DB_NAME || 'work_orders_db';

    // Check if database exists
    const dbCheckResult = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (dbCheckResult.rows.length === 0) {
      // Create database
      logger.info(`Creating database: ${dbName}`);
      await pool.query(`CREATE DATABASE ${dbName}`);
      logger.info(`Database ${dbName} created successfully`);
    } else {
      logger.info(`Database ${dbName} already exists`);
    }

    await pool.end();

    // Connect to the specific database
    const dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: dbName,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    // Read and execute schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    logger.info('Executing database schema...');
    await dbPool.query(schema);
    logger.info('Database schema created successfully');

    await dbPool.end();
    
    logger.info('Database setup completed successfully');
  } catch (error) {
    logger.error('Database setup failed:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
};

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      logger.info('Database setup process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database setup process failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };