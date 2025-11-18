// Script simple para probar que el servidor puede levantarse
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Test server is working!',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auth/login', (req, res) => {
  console.log('Login request received:', req.body);
  res.json({
    message: 'Test endpoint - replace with real auth',
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    user: {
      id: 1,
      email: req.body.email,
      firstName: 'Test',
      lastName: 'User',
      role: 'admin'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ TEST SERVER RUNNING!');
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log('\nTry it now in your browser or with curl!\n');
});

