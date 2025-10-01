# Supabase Connection Setup

## Step 1: Update Environment Variables

Your `.env` file has been updated with your Supabase connection details:

```env
# Database Configuration - Supabase
DB_HOST=db.xsyaeqafcwfmaccrqewc.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[YOUR-PASSWORD]  # ⚠️ REPLACE WITH ACTUAL PASSWORD
DB_SSL=true
```

**⚠️ IMPORTANT**: Replace `[YOUR-PASSWORD]` with your actual Supabase database password.

## Step 2: Get Your Database Password

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Find the **Connection string** section
4. Copy the password from your connection string
5. Replace `[YOUR-PASSWORD]` in the `.env` file

## Step 3: Test the Connection

Run the connection test to verify everything works:

```bash
cd backend
npm run test-db
```

This will test your connection and show you:
- ✅ Connection status
- 📊 Available tables
- ⚠️ Whether you need to run migrations

## Step 4: Run Database Migrations

If you haven't set up your tables yet:

### Option A: Custom Authentication (Current Setup)
```bash
# In Supabase SQL Editor, run:
# 1. database/supabase-safe-migration.sql
# 2. database/supabase-seed.sql (optional)
```

### Option B: Supabase Authentication
```bash
# In Supabase SQL Editor, run:
# 1. database/supabase-clean-migration.sql
# 2. database/supabase-auth-seed.sql (optional)
```

## Step 5: Start Your Backend

```bash
npm start
# or for development
npm run dev
```

## Troubleshooting

### Connection Refused
- Check if your IP is allowed in Supabase dashboard
- Verify the connection string is correct

### SSL Errors
- The configuration is already set for SSL
- Supabase requires SSL connections

### Authentication Failed
- Double-check your password in the `.env` file
- Regenerate database password if needed

### No Tables Found
- Run the appropriate migration script in Supabase SQL Editor
- Check the database name is correct (should be 'postgres')

## Environment Variables Reference

```env
# Your current Supabase configuration
DB_HOST=db.xsyaeqafcwfmaccrqewc.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_actual_password_here
DB_SSL=true

# Other required variables
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

## Next Steps

1. ✅ Update password in `.env`
2. ✅ Test connection with `npm run test-db`
3. ✅ Run database migrations
4. ✅ Start your backend
5. ✅ Test API endpoints