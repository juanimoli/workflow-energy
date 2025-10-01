#!/usr/bin/env node
// Test script to verify Supabase connection
require('dotenv').config();
const { connectDB, closeDB } = require('./config/database');

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`User: ${process.env.DB_USER}`);
    console.log(`SSL: ${process.env.DB_SSL}`);
    
    const pool = await connectDB();
    
    // Test basic query
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].postgres_version);
    
    // Test if our tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const tables = await pool.query(tablesQuery);
    console.log('\n📊 Available tables:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    if (tables.rows.length === 0) {
      console.log('\n⚠️  No tables found. You may need to run the schema migration.');
    }
    
    await closeDB();
    console.log('\n✅ Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();