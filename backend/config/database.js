const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool;

const connectDB = async () => {
  try {
    // Force IPv4 for deployment environments like Render
    const poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'work_orders_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased timeout for deployment
      // Force IPv4 to avoid IPv6 connectivity issues
      family: 4,
    };

    // For production/deployment, use connection string if available
    if (process.env.DATABASE_URL) {
      poolConfig.connectionString = process.env.DATABASE_URL;
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    pool = new Pool(poolConfig);

    // Test the connection with retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        await pool.query('SELECT NOW()');
        logger.info('PostgreSQL connected successfully');
        return pool;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        logger.warn(`Database connection attempt failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
  } catch (error) {
    logger.error('Database connection failed:', error);
    
    // Log environment info for debugging
    logger.error('Environment info:', {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER,
      DB_SSL: process.env.DB_SSL,
      NODE_ENV: process.env.NODE_ENV
    });
    
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