const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const workOrderRoutes = require('./routes/workOrders');
const projectRoutes = require('./routes/projects');
const metricsRoutes = require('./routes/metrics');
const reportsRoutes = require('./routes/reports');
const syncRoutes = require('./routes/sync');
const geocodeRoutes = require('./routes/geocode');
const teamsRoutes = require('./routes/teams');
const accessLogsRoutes = require('./routes/accessLogs');
const devRoutes = require('./routes/dev');
const resetFormRoutes = require('./routes/resetForm');

const logger = require('./utils/logger');
const { connectDB, getDB } = require('./config/database');
const { initializeSocket } = require('./socket/socketHandler');
const emailService = require('./utils/emailService');

const app = express();
const server = createServer(app);
// Build allowed origins (include production frontend + optional comma list)
const dynamicAllowed = [];
if (process.env.ALLOWED_ORIGINS) {
  dynamicAllowed.push(
    ...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  );
}
const allowedOrigins = [
  'http://localhost:3002',
  'http://localhost:3001',
  'http://localhost:8081',
  'http://localhost:5173', // Vite default
  process.env.FRONTEND_URL,
  process.env.MOBILE_URL,
  'https://workflow-energy.vercel.app', // prod Vercel
  ...dynamicAllowed
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// CORS middleware - must be before other middleware
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // mobile / curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    const msg = `CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`;
    logger.warn(msg);
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
// Allow disabling rate limiting during local perf tests by setting
// ENABLE_RATE_LIMIT=false in the environment. Default is enabled.
const enableRateLimit = process.env.ENABLE_RATE_LIMIT !== 'false';
if (enableRateLimit) {
  app.use('/api/', limiter);
} else {
  logger.info('Rate limiting disabled (ENABLE_RATE_LIMIT=false)');
}

// Middleware
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Development-only routes (before rate limiting)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRoutes);
  
  // Simple endpoint for reset URLs without middleware
  app.get('/dev-reset-urls', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const resetUrlFile = path.join(__dirname, 'logs/password-reset-urls.txt');
      
      if (!fs.existsSync(resetUrlFile)) {
        return res.json({ 
          message: 'No reset URLs generated yet. Try the forgot password feature first.',
          instructions: 'Use: curl -X POST http://localhost:5000/api/auth/forgot-password -H "Content-Type: application/json" -d \'{"email":"admin@workflowenergy.com"}\''
        });
      }

      const content = fs.readFileSync(resetUrlFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      // Get the last 5 URLs
      const recentUrls = lines.slice(-5).map(line => {
        const match = line.match(/^(.*?) - Email: (.*?) - Reset URL: (.*)$/);
        if (match) {
          return {
            timestamp: match[1],
            email: match[2],
            resetUrl: match[3]
          };
        }
        return { raw: line };
      });

      res.json({
        message: 'Recent password reset URLs (Development Mode)',
        count: recentUrls.length,
        urls: recentUrls,
        note: 'These URLs expire in 1 hour. Click on resetUrl to test the password reset flow.'
      });

    } catch (error) {
      res.status(500).json({ 
        message: 'Error reading reset URLs',
        error: error.message 
      });
    }
  });
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Database health check
app.get('/health/db', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query('SELECT NOW() as timestamp');
    res.status(200).json({ 
      status: 'OK', 
      database: 'connected',
      timestamp: result.rows[0].timestamp
    });
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/access-logs', accessLogsRoutes);
// Minimal HTML reset page (works without frontend)
app.use('/', resetFormRoutes);

// Socket.io initialization
initializeSocket(io);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Use 5001 by default in development to avoid conflicts with macOS AirPlay on 5000
const PORT = process.env.PORT || 5001;

// Start server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Log email configuration
      console.log('\n=== EMAIL CONFIGURATION ===');
      console.log('Has Resend API Key:', Boolean(process.env.RESEND_API_KEY));
      console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'onboarding@resend.dev');
      console.log('===========================\n');
      
      if ((process.env.NODE_ENV === 'production') && !process.env.RESEND_API_KEY) {
        logger.warn('RESEND_API_KEY not configured in production. Password reset emails will NOT be sent.');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

startServer();

module.exports = app;