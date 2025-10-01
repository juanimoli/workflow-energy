# Database Migration to Supabase Guide

## Pre2. **Run Seed Data (Optional)**
   - **For Custom Auth**: Copy the contents of `database/supabase-seed.sql`
   - **For Supabase Auth**: Copy the contents of `database/supabase-auth-seed.sql`
   - Paste it into a new SQL Editor query
   - Click "Run" to insert sample data

### Method 2: Using Supabase Authentication (Recommended)

If you want to migrate to Supabase Auth (more secure and integrated):

1. **Use the Supabase Auth Schema**
   - Copy the contents of `database/supabase-auth-schema.sql` OR `database/supabase-clean-migration.sql`
   - This version uses UUID for user IDs and integrates with Supabase Auth
   - Paste it into the SQL Editor and run

2. **Run Auth-Compatible Seed Data**
   - Copy the contents of `database/supabase-auth-seed.sql`
   - This creates plants, teams, and projects but not users (users are created through auth signup)
   - Paste it into a new SQL Editor query and runbase account and project created
2. Access to Supabase dashboard or CLI

## Migration Methods

### Fixing the "relation already exists" Error

The error `relation "plants" already exists` occurs when you try to run the schema script multiple times. Here are your options:

**Option 1: Clean Migration (⚠️ DESTROYS EXISTING DATA)**
- Use `database/supabase-clean-migration.sql`
- This script drops all existing tables and recreates them
- **WARNING: This will delete all your data**

**Option 2: Safe Migration (Recommended)**
- Use `database/supabase-safe-migration.sql`
- This script uses `CREATE TABLE IF NOT EXISTS`
- Safe to run multiple times, won't affect existing data

**Option 3: Manual Cleanup**
- Go to Supabase SQL Editor
- Run this to drop all tables:
```sql
DROP TABLE IF EXISTS metrics_cache, notifications, access_logs, 
                     user_sessions, work_order_history, work_orders, 
                     projects, users, teams, plants CASCADE;
```
- Then run your schema script

### Method 1: Using Custom Authentication (Current Setup)

If you want to keep your current JWT authentication system:

1. **Access SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to "SQL Editor" in the sidebar

2. **Run Schema Migration**
   - Copy the contents of `database/supabase-schema.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the schema
   - This version has RLS disabled to avoid UUID casting errors

3. **Run Seed Data (Optional)**
   - Copy the contents of `database/supabase-seed.sql`
   - Paste it into a new SQL Editor query
   - Click "Run" to insert sample data

### Method 2: Using Supabase Authentication (Recommended)

If you want to migrate to Supabase Auth (more secure and integrated):

1. **Use the Supabase Auth Schema**
   - Copy the contents of `database/supabase-auth-schema.sql`
   - This version uses UUID for user IDs and integrates with Supabase Auth
   - Paste it into the SQL Editor and run

2. **Update Your Backend**
   - Install Supabase client: `npm install @supabase/supabase-js`
   - Replace JWT middleware with Supabase Auth verification
   - Update user creation to work with Supabase Auth

### Fixing the UUID Casting Error

The error `cannot cast type uuid to integer` occurs because:
- Supabase Auth uses UUID for user IDs (`auth.uid()` returns UUID)
- Your current schema uses INTEGER for user IDs
- Row Level Security policies tried to cast between incompatible types

**Solutions:**
1. **Keep Custom Auth**: Use `database/supabase-schema.sql` (RLS disabled)
2. **Migrate to Supabase Auth**: Use `database/supabase-auth-schema.sql` (UUIDs throughout)
3. **Hybrid Approach**: Add a `supabase_user_id` UUID column to link accounts

### Method 3: Using Supabase CLI

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link to Your Project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Run Migrations**
   ```bash
   supabase db push
   ```

### Method 4: Using psql (Advanced)

1. **Get Database Connection String**
   - Go to Project Settings > Database
   - Copy the connection string

2. **Connect and Run**
   ```bash
   psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
   \i database/supabase-schema.sql
   \i database/supabase-seed.sql
   ```

## Update Your Backend Configuration

After migration, update your backend environment variables:

```env
# Supabase Database Configuration
DB_HOST=db.[PROJECT_REF].supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[YOUR_SUPABASE_DB_PASSWORD]
DB_SSL=true

# Other configurations remain the same
PORT=3001
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

## Authentication Integration (Optional)

If you want to use Supabase Auth instead of custom JWT:

1. **Install Supabase Client**
   ```bash
   cd backend
   npm install @supabase/supabase-js
   ```

2. **Update Environment Variables**
   ```env
   SUPABASE_URL=https://[PROJECT_REF].supabase.co
   SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
   SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
   ```

3. **Replace JWT Auth with Supabase Auth** (requires code changes)

## Row Level Security (RLS) Configuration

The schema includes basic RLS policies. You may need to adjust them based on your needs:

1. **Enable RLS** (already included in schema)
2. **Customize Policies** based on your business logic
3. **Test Policies** with different user roles

## Verification Steps

1. **Check Tables Created**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

2. **Verify Data**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM work_orders;
   ```

3. **Test Connection** from your backend

## Important Notes

- **Backup First**: Always backup your existing data before migration
- **Test Environment**: Test the migration in a development environment first
- **Connection Pooling**: Supabase handles connection pooling automatically
- **SSL Required**: Supabase requires SSL connections
- **Row Level Security**: Consider enabling RLS for data security

## Troubleshooting

### Common Issues:

1. **UUID Casting Error** (`cannot cast type uuid to integer`)
   - **Cause**: Mixing UUID (Supabase Auth) with INTEGER user IDs
   - **Solution 1**: Use `supabase-schema.sql` (keeps INTEGER IDs, disables RLS)
   - **Solution 2**: Use `supabase-auth-schema.sql` (migrates to UUID IDs)
   - **Solution 3**: Add UUID column: `ALTER TABLE users ADD COLUMN supabase_user_id UUID;`

2. **Table Already Exists Error** (`relation "plants" already exists`)
   - **Cause**: Running schema script multiple times
   - **Solution 1**: Use `supabase-safe-migration.sql` (safe, preserves data)
   - **Solution 2**: Use `supabase-clean-migration.sql` (⚠️ destroys data)
   - **Solution 3**: Manually drop tables first with `DROP TABLE ... CASCADE;`

3. **Foreign Key Constraint Errors** (`Key (plant_id)=(1) is not present in table "plants"`)
   - **Cause**: Seed script assumes specific IDs that don't exist
   - **Solution**: Use the updated `supabase-seed.sql` that uses proper references instead of hardcoded IDs
   - **For UUID Auth**: Use `supabase-auth-seed.sql` instead

4. **Extension Not Found**: Some PostgreSQL extensions might not be available in Supabase

5. **Permission Errors**: Make sure you're using the correct database credentials

6. **Schema Conflicts**: Drop existing tables if reimporting

5. **Row Level Security Issues**:
   - Disable RLS if using custom authentication
   - Properly configure policies if using Supabase Auth

### Getting Help:
- Supabase Documentation: https://supabase.com/docs
- Discord Community: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase

## Next Steps After Migration

1. Update backend connection configuration
2. Test all API endpoints
3. Verify authentication flows
4. Update deployment environment variables
5. Monitor database performance in Supabase dashboard