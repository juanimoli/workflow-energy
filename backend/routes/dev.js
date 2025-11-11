const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Development-only endpoint to get password reset URLs
router.get('/reset-urls', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const resetUrlFile = path.join(__dirname, '../logs/password-reset-urls.txt');
    
    if (!fs.existsSync(resetUrlFile)) {
      return res.json({ 
        message: 'No reset URLs generated yet',
        instructions: 'Use the forgot password functionality to generate reset URLs'
      });
    }

    const content = fs.readFileSync(resetUrlFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    // Get the last 10 URLs
    const recentUrls = lines.slice(-10).map(line => {
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
      note: 'These URLs expire in 1 hour'
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Error reading reset URLs',
      error: error.message 
    });
  }
});

// Clear reset URLs log
router.delete('/reset-urls', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const resetUrlFile = path.join(__dirname, '../logs/password-reset-urls.txt');
    if (fs.existsSync(resetUrlFile)) {
      fs.unlinkSync(resetUrlFile);
    }
    res.json({ message: 'Reset URLs log cleared' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error clearing reset URLs',
      error: error.message 
    });
  }
});

module.exports = router;