# Supabase Complete Setup Guide

## Choose Your Setup

### Option 1: Custom Authentication (Current Backend)
**File**: `supabase-complete-setup.sql`
- Uses INTEGER user IDs
- Compatible with your current JWT authentication
- Includes complete sample data with users

### Option 2: Supabase Authentication 
**File**: `supabase-auth-complete-setup.sql`
- Uses UUID user IDs linked to Supabase Auth
- More secure and integrated
- Requires backend changes for auth

## Quick Deployment

### Step 1: Run the Schema + Seed Script

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste **ONE** of these files:
   - `supabase-complete-setup.sql` (for custom auth)
   - `supabase-auth-complete-setup.sql` (for Supabase auth)
4. Click **Run**

### Step 2: Verify Setup

The script will show you:
- ✅ Number of tables created
- ✅ Number of records inserted
- ✅ Login credentials (if using custom auth)

### Step 3: Test Your Backend

```bash
cd backend
npm run test-db
```

## What Gets Created

### Tables
- `plants` - 3 sample plants
- `teams` - 4 sample teams
- `users` - 8 sample users (custom auth only)
- `projects` - 3 sample projects
- `work_orders` - 4 sample work orders (custom auth only)
- `notifications` - 3 sample notifications (custom auth only)
- `metrics_cache` - Sample metrics data

### Sample Login Credentials (Custom Auth Only)

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Administrator |
| supervisor | supervisor123 | Supervisor |
| leader1 | leader123 | Team Leader |
| employee1 | employee123 | Employee |

### Features Included

✅ **Complete database schema**
✅ **Foreign key relationships**
✅ **Indexes for performance**
✅ **Sample data**
✅ **Views for reporting**
✅ **Row Level Security (RLS) policies**
✅ **User management functions**

## Next Steps

### For Custom Auth
1. ✅ Run `supabase-complete-setup.sql`
2. ✅ Test connection with `npm run test-db`
3. ✅ Start your backend with `npm start`
4. ✅ Test login with provided credentials

### For Supabase Auth
1. ✅ Run `supabase-auth-complete-setup.sql`
2. ✅ Install Supabase client: `npm install @supabase/supabase-js`
3. ✅ Update your backend to use Supabase Auth
4. ✅ Users sign up through your app (auto-creates profiles)

## Troubleshooting

### Common Issues
- **Permission denied**: Make sure you're using the Database Owner role
- **Relation exists**: The script drops tables first, so this shouldn't happen
- **Connection failed**: Check your `.env` file password

### Getting Help
- Check the Supabase dashboard for error details
- Use the SQL Editor's error messages
- Test connection with the backend test script

## File Summary

| File | Purpose | Auth Type | Users Included |
|------|---------|-----------|----------------|
| `supabase-complete-setup.sql` | Full setup | Custom JWT | ✅ 8 sample users |
| `supabase-auth-complete-setup.sql` | Full setup | Supabase Auth | ❌ Create via signup |

Both files create the complete schema and sample data. Choose based on your authentication preference!