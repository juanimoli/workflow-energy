# Backend Environment Update for Frontend

## Current Backend CORS Configuration

Your backend is configured to allow CORS from:
- `process.env.FRONTEND_URL` (production frontend)
- `http://localhost:3000` (development)

## Required Backend Environment Variables

Add this to your Render backend environment variables:

```env
# Existing variables
DATABASE_URL=postgresql://postgres:passwordtesting1235@db.xsyaeqafcwfmaccrqewc.supabase.co:5432/postgres?sslmode=require
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Add frontend URL when deployed
FRONTEND_URL=https://your-frontend-domain.vercel.app
# or
FRONTEND_URL=https://your-frontend-domain.netlify.app
# or  
FRONTEND_URL=https://your-frontend-domain.onrender.com
```

## Steps After Frontend Deployment

1. **Deploy your frontend** to Vercel/Netlify/Render
2. **Get your frontend URL** (e.g., `https://workflow-frontend.vercel.app`)
3. **Add FRONTEND_URL** to your backend environment variables in Render
4. **Redeploy backend** or it will automatically redeploy

## Testing CORS

1. **Deploy frontend** 
2. **Access frontend** in browser
3. **Try to login** or make API calls
4. **Check for CORS errors** in browser console

If you see CORS errors:
- Verify `FRONTEND_URL` is set correctly in backend
- Check that the URLs match exactly (no trailing slashes)
- Ensure backend has been redeployed after adding the variable

## Current Status

✅ **Backend deployed**: `https://workflow-energy.onrender.com`
✅ **Frontend configured**: Points to backend API
⏳ **Frontend deployment**: Deploy to get URL
⏳ **Backend CORS update**: Add frontend URL to backend env vars

Your backend is ready to accept requests from your frontend once you deploy it and update the CORS settings! 🚀