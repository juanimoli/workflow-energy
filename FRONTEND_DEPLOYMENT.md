# Frontend Deployment Configuration

## ✅ Configuration Updated

Your frontend has been configured to connect to your deployed backend:

**Backend URL**: `https://workflow-energy.onrender.com`

## Files Updated

1. **`.env`** - Development environment configuration
2. **`.env.production`** - Production environment configuration  
3. **`vite.config.js`** - Removed local proxy, updated for production

## Environment Variables

### Development (`.env`)
```env
VITE_API_URL=https://workflow-energy.onrender.com
```

### Production (`.env.production`)
```env
VITE_API_URL=https://workflow-energy.onrender.com
```

## Testing Locally

1. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Test API connection**:
   - Open `http://localhost:3000`
   - Try to login or access any API endpoint
   - Check Network tab in DevTools for API calls to `https://workflow-energy.onrender.com`

## Frontend Deployment Options

### Option 1: Vercel (Recommended)
1. Connect your GitHub repo to Vercel
2. Set environment variable: `VITE_API_URL=https://workflow-energy.onrender.com`
3. Deploy automatically

### Option 2: Netlify
1. Connect your GitHub repo to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Set environment variable: `VITE_API_URL=https://workflow-energy.onrender.com`

### Option 3: Render Static Site
1. Create new Static Site in Render
2. Connect your repo
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Set environment variable: `VITE_API_URL=https://workflow-energy.onrender.com`

## Build for Production

```bash
cd frontend
npm run build
```

This creates a `dist/` folder with optimized production files.

## Important Notes

1. **CORS**: Your backend should allow requests from your frontend domain
2. **HTTPS**: Both frontend and backend should use HTTPS in production
3. **Environment Variables**: Must start with `VITE_` prefix for Vite to expose them

## Troubleshooting

### API Connection Issues
- Check Network tab in DevTools
- Verify API calls are going to `https://workflow-energy.onrender.com`
- Check for CORS errors in console

### Build Issues
- Ensure all environment variables start with `VITE_`
- Check that `dist/` folder is created after build
- Verify no build errors in terminal

### CORS Errors
If you get CORS errors, check your backend CORS configuration in `server.js`:
```javascript
app.use(cors({
  origin: [
    "https://your-frontend-domain.com",
    "http://localhost:3000" // for development
  ],
  credentials: true
}));
```

## Testing Connection

1. Open browser DevTools → Network tab
2. Visit your frontend app
3. Try to login or make any API call
4. Verify requests go to: `https://workflow-energy.onrender.com/api/...`

Your frontend is now ready to deploy! 🚀