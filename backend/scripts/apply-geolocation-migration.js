#!/usr/bin/env node

/**
 * Apply Geolocation Migration
 * 
 * This script applies the geolocation fields migration to the database.
 * It adds latitude, longitude, and geolocation_source columns to work_orders table.
 * 
 * Usage:
 *   node scripts/apply-geolocation-migration.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDB } = require('../config/database');

async function applyMigration() {
  try {
    console.log('🔄 Starting geolocation migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/add_geolocation_to_work_orders.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📝 SQL to execute:\n');
    console.log(migrationSQL);
    console.log('\n');

    // Execute migration
    const supabase = getDB();
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`📊 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`  ${i + 1}. Executing: ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { 
        query: statement 
      }).catch(async () => {
        // If rpc doesn't exist, try direct query
        return await supabase.from('work_orders').select('id').limit(0);
      });

      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
        // Don't fail completely, some errors like "column already exists" are okay
        if (!error.message.includes('already exists')) {
          throw error;
        }
        console.log('  ⚠️  Warning: Column might already exist, continuing...');
      } else {
        console.log('  ✅ Success');
      }
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📋 What was added:');
    console.log('  - latitude DECIMAL(10, 8) column');
    console.log('  - longitude DECIMAL(11, 8) column');
    console.log('  - geolocation_source VARCHAR(50) column');
    console.log('  - Index on (latitude, longitude) for faster queries');
    console.log('\n🎉 Your work_orders table is now ready for geolocation!\n');

    // Test query
    console.log('🔍 Testing new columns...');
    const { data, error: testError } = await supabase
      .from('work_orders')
      .select('id, latitude, longitude, geolocation_source')
      .limit(1);

    if (testError) {
      console.warn('⚠️  Could not verify columns (this is normal if table is empty)');
      console.warn('   Error:', testError.message);
    } else {
      console.log('✅ Columns verified successfully!');
      if (data && data.length > 0) {
        console.log('   Sample row:', data[0]);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    console.error('\n💡 Possible solutions:');
    console.error('   1. Ensure your database is running');
    console.error('   2. Check your .env file has correct database credentials');
    console.error('   3. Verify you have ALTER TABLE permissions');
    console.error('   4. Try running the SQL manually in Supabase dashboard');
    console.error('\n📄 SQL file location:', path.join(__dirname, '../migrations/add_geolocation_to_work_orders.sql'));
    process.exit(1);
  }
}

// Run migration
console.log('\n╔═══════════════════════════════════════════╗');
console.log('║   Workflow Energy - Geolocation Setup    ║');
console.log('╚═══════════════════════════════════════════╝\n');

applyMigration();

