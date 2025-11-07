/**
 * Simple Migration Script for Supabase
 * Creates access_logs table directly
 */

require('dotenv').config();
const { connectDB, getDB } = require('../config/database');

async function createAccessLogsTable() {
    try {
        console.log('🔄 Creating access_logs table in Supabase...\n');
        
        // Connect to database first
        await connectDB();
        const supabase = getDB();
        
        // Test if table already exists by trying to query it
        console.log('Checking if table already exists...');
        const { data: existingData, error: existingError } = await supabase
            .from('access_logs')
            .select('id')
            .limit(1);
        
        if (!existingError) {
            console.log('✅ Table access_logs already exists!');
            console.log('\nYou can now use the access logs feature.');
            return;
        }
        
        if (existingError.code === '42P01') {
            console.log('❌ Table does not exist. Creating it now...\n');
            console.log('⚠️  Please run this SQL manually in Supabase SQL Editor:');
            console.log('   Dashboard → SQL Editor → New Query\n');
            console.log('─'.repeat(80));
            console.log(`
-- Create access_logs table for audit trail
CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL DEFAULT false,
    failure_reason VARCHAR(255),
    session_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_username ON access_logs(username);
CREATE INDEX IF NOT EXISTS idx_access_logs_login_attempt_at ON access_logs(login_attempt_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_success ON access_logs(success);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_address ON access_logs(ip_address);

-- Add comments
COMMENT ON TABLE access_logs IS 'Audit trail for user login attempts (successful and failed)';
COMMENT ON COLUMN access_logs.success IS 'true if login was successful, false if failed';
COMMENT ON COLUMN access_logs.failure_reason IS 'Reason for login failure (e.g., invalid password, user not found)';
            `);
            console.log('─'.repeat(80));
            console.log('\n📝 Steps:');
            console.log('1. Copy the SQL above');
            console.log('2. Go to Supabase Dashboard');
            console.log('3. Click on "SQL Editor" in the left menu');
            console.log('4. Click "New Query"');
            console.log('5. Paste the SQL');
            console.log('6. Click "Run" or press Ctrl+Enter');
            console.log('7. Run this script again to verify\n');
        } else {
            console.log('⚠️  Unexpected error:', existingError);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n💡 Try creating the table manually in Supabase Dashboard');
    }
}

createAccessLogsTable();
