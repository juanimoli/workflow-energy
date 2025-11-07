/**
 * Check access_logs table schema in Supabase
 */

require('dotenv').config();
const { connectDB, getDB } = require('../config/database');

async function checkSchema() {
    try {
        // Connect to DB first
        await connectDB();
        
        const supabase = getDB();
        
        console.log('\n=== Checking access_logs table schema ===\n');
        
        // Get one row to see column names
        const { data, error } = await supabase
            .from('access_logs')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('Error:', error.message);
            // Try to insert a test row to see what columns exist
            console.log('\nTrying to get columns from error message...\n');
            const { error: insertError } = await supabase
                .from('access_logs')
                .insert({});
            
            if (insertError) {
                console.log('Insert error details:', JSON.stringify(insertError, null, 2));
            }
        } else if (data && data.length > 0) {
            console.log('Columns found:');
            console.log(Object.keys(data[0]));
            console.log('\nSample row:');
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log('Table exists but is empty. Checking schema another way...');
        }
        
        // Also check users table
        console.log('\n=== Checking users table schema ===\n');
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .limit(1);
        
        if (!userError && userData && userData.length > 0) {
            console.log('Users table columns:');
            console.log(Object.keys(userData[0]));
        }
        
    } catch (error) {
        console.error('Script error:', error);
    }
}

checkSchema();
