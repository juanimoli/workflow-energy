# Render.com Deployment Configuration

## Environment Variables for Render

Set these environment variables in your Render dashboard:

### Option 1: Individual Variables (Current Setup)
```env
DB_HOST=db.xsyaeqafcwfmaccrqewc.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=passwordtesting1235
DB_SSL=true
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

### Option 2: Connection String (Recommended for Render)
```env
DATABASE_URL=postgresql://postgres:passwordtesting1235@db.xsyaeqafcwfmaccrqewc.supabase.co:5432/postgres?sslmode=require
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

## Render Configuration

### Build Command
```bash
npm install
```

### Start Command
```bash
npm start
```

### Health Check Endpoint
Make sure your server responds to health checks on `/health` or root `/`.

## Troubleshooting IPv6 Issues

The error you're seeing is related to IPv6 connectivity. The updated database configuration includes:

1. **Force IPv4**: `family: 4` parameter
2. **Increased timeout**: Better for deployment environments
3. **Retry logic**: Attempts connection 3 times
4. **Connection string support**: Uses `DATABASE_URL` if available

## Alternative Solutions

### 1. Use Connection String Method
In Render, set only these environment variables:
```env
DATABASE_URL=postgresql://postgres:passwordtesting1235@db.xsyaeqafcwfmaccrqewc.supabase.co:5432/postgres?sslmode=require
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 2. Enable IPv4-only in Render
Some Render instances prefer IPv4. The updated config forces IPv4 connections.

### 3. Check Supabase Settings
1. Go to Supabase Dashboard → Settings → Database
2. Ensure "Allow connections from anywhere" is enabled
3. Check if there are any IP restrictions

## Testing Locally

Before deploying, test the connection string locally:
```bash
# Set the environment variable
export DATABASE_URL="postgresql://postgres:passwordtesting1235@db.xsyaeqafcwfmaccrqewc.supabase.co:5432/postgres?sslmode=require"

# Test connection
npm run test-db
```

## Render-Specific Settings

In your Render service settings:

1. **Environment**: Node
2. **Region**: Choose closest to your Supabase region
3. **Instance Type**: Starter is fine for testing
4. **Auto-Deploy**: Enable for automatic deployments

## Common Issues & Solutions

### Connection Timeout
- Increase `connectionTimeoutMillis` (already done)
- Use connection string format
- Check Render region vs Supabase region

### SSL Issues
- Ensure `sslmode=require` in connection string
- Verify SSL settings in Supabase

### DNS Resolution
- Use IP address instead of hostname (not recommended)
- Check if Render can resolve Supabase hostname

## Monitor Deployment

Watch Render logs for:
```
✅ "PostgreSQL connected successfully"
❌ Connection timeout errors
❌ SSL handshake errors
```

The updated configuration should resolve the IPv6 connectivity issue you're experiencing.