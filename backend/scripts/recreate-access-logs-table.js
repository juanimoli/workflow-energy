/**
 * Recreate access_logs table with correct schema
 */

require('dotenv').config();
const { connectDB, getDB } = require('../config/database');

async function recreateTable() {
    try {
        await connectDB();
        const supabase = getDB();
        
        console.log('\n=== Recreating access_logs table ===\n');
        
        // Step 1: Drop old table
        console.log('1. Dropping old access_logs table...');
        const {  error: dropError } = await supabase.rpc('exec_sql', {
            sql: 'DROP TABLE IF EXISTS access_logs CASCADE;'
        });
        
        if (dropError) {
            console.log('Note: Could not drop via RPC, table might not exist or RPC not available');
            console.log('You may need to drop the table manually in Supabase SQL Editor:');
            console.log('   DROP TABLE IF EXISTS access_logs CASCADE;');
        } else {
            console.log('✓ Old table dropped');
        }
        
        // Step 2: Create new table with correct schema
        console.log('\n2. Creating new access_logs table with correct schema...');
        console.log('\nPlease run this SQL in your Supabase SQL Editor:\n');
        console.log('---');
        
        const createTableSQL = `
-- Drop old table if exists
DROP TABLE IF EXISTS access_logs CASCADE;

-- Create new table with correct schema for audit trail
CREATE TABLE access_logs (
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

-- Indexes for better query performance
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_username ON access_logs(username);
CREATE INDEX idx_access_logs_login_attempt_at ON access_logs(login_attempt_at DESC);
CREATE INDEX idx_access_logs_success ON access_logs(success);
CREATE INDEX idx_access_logs_ip_address ON access_logs(ip_address);

-- Comments
COMMENT ON TABLE access_logs IS 'Audit trail for user login attempts (successful and failed)';
COMMENT ON COLUMN access_logs.success IS 'true if login was successful, false if failed';
COMMENT ON COLUMN access_logs.failure_reason IS 'Reason for login failure (e.g., invalid password, user not found)';
`;
        
        console.log(createTableSQL);
        console.log('---\n');
        
        console.log('After running the SQL above, press Enter to verify...');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

recreateTable();
