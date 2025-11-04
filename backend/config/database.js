const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

let supabase;

const connectDB = async () => {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      realtime: {
        enabled: false
      }
    });

    // Test the connection
    logger.info(`Testing Supabase connection with ${isServiceRole ? 'service role' : 'anon'} key...`);
    
    if (!isServiceRole) {
      logger.warn('Using anon key - database operations may be limited. Consider using service role key for backend APIs.');
      
      // Simple test for anon key
      const { error: authError } = await supabase.auth.getSession();
      if (authError && authError.message.includes('Invalid API key')) {
        throw new Error(`Supabase connection failed: ${authError.message}`);
      }
    } else {
      // Full test for service role key
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      // If users table doesn't exist, that's fine - we just need to confirm we can reach the database
      if (testError && !testError.message.includes('does not exist')) {
        throw new Error(`Supabase database test failed: ${testError.message}`);
      }
    }

    logger.info('Supabase connected successfully');
    logger.info(`Connected to: ${supabaseUrl}`);
    
    return supabase;
    
  } catch (error) {
    logger.error('Supabase connection failed:', error);
    
    // Log environment info for debugging
    logger.error('Environment info:', {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV
    });
    
    throw error;
  }
};

const getDB = () => {
  // If tests injected a global test DB, prefer that to avoid module-instance issues
  if (!supabase && global && global.__TEST_DB__) {
    supabase = global.__TEST_DB__
  }

  if (!supabase) {
    throw new Error('Supabase not initialized. Call connectDB first.');
  }
  return supabase;
};

const closeDB = async () => {
  if (supabase) {
    // Supabase client doesn't need explicit closing
    logger.info('Supabase connection closed');
  }
};

// Test helper to inject a fake supabase client in tests
const setTestDB = (db) => {
  supabase = db;
  // store a global reference so ESM/CJS interop can't cause the test DB to be lost
  if (global) global.__TEST_DB__ = db;
};

module.exports = {
  connectDB,
  getDB,
  closeDB,
  setTestDB
};