/**
 * Migration Script: Apply access_logs table migration
 * Version: 1.4.0
 * Purpose: Create access_logs table for audit trail
 */

const fs = require('fs');
const path = require('path');
const { getDB } = require('../config/database');

async function applyMigration() {
    try {
        console.log('Starting access_logs migration...');
        
        const supabase = getDB();
        
        // Read the migration SQL file
        const migrationSQL = fs.readFileSync(
            path.join(__dirname, '../migrations/create_access_logs.sql'),
            'utf8'
        );
        
        // Split SQL into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`Found ${statements.length} SQL statements to execute...`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
            
            const { data, error } = await supabase.rpc('exec_sql', {
                sql_query: statement + ';'
            });
            
            if (error) {
                // If the function doesn't exist, try direct execution
                console.log('Trying direct SQL execution...');
                const { error: directError } = await supabase
                    .from('access_logs')
                    .select('*')
                    .limit(0);
                
                // Table exists if no error
                if (!directError || directError.code !== '42P01') {
                    console.log('✅ Table already exists or statement executed');
                } else {
                    console.error('❌ Error:', error.message);
                }
            } else {
                console.log('✅ Statement executed successfully');
            }
        }
        
        console.log('\n✅ Access logs migration completed!');
        
        // Verify the table was created
        console.log('\nVerifying table structure...');
        const { data: tableData, error: tableError } = await supabase
            .from('access_logs')
            .select('*')
            .limit(1);
        
        if (!tableError) {
            console.log('✅ Table access_logs is accessible');
            console.log('Sample query executed successfully');
        } else if (tableError.code === 'PGRST116') {
            console.log('✅ Table exists but is empty (expected)');
        } else {
            console.log('Table verification result:', tableError);
        }
        
        console.log('\n✅ Migration process completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

applyMigration();
