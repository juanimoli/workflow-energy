const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool;

const connectDB = async () => {
  try {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'work_orders_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    await pool.query('SELECT NOW()');
    logger.info('PostgreSQL connected successfully');
    
    return pool;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

const getDB = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return pool;
};

const closeDB = async () => {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
};

module.exports = {
  connectDB,
  getDB,
  closeDB
};