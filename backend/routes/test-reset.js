const express = require('express');
const { getDB } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const router = express.Router();

// Simple test endpoint to generate and show reset URL immediately
router.post('/test-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const supabase = getDB();

    // Find user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('email', email)
      .eq('is_active', true);

    if (userError || !users || users.length === 0) {
      return res.json({
        success: false,
        message: 'User not found',
        note: 'Try with an existing user email from your database'
      });
    }

    const user = users[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save token to database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token_hash: resetTokenHash,
        expires_at: tokenExpiry.toISOString(),
        created_at: new Date().toISOString()
      });

    if (tokenError) {
      return res.status(500).json({ 
        error: 'Failed to create reset token',
        details: tokenError.message 
      });
    }

    // Generate reset URL with same precedence as email service
    const isDev = process.env.NODE_ENV !== 'production';
    const base = process.env.EMAIL_RESET_BASE_URL
      || (isDev ? process.env.LOCAL_FRONTEND_URL : null)
      || process.env.FRONTEND_URL
      || 'http://localhost:3002';
    const frontendBase = base.replace(/\/$/, '');
    const resetUrl = `${frontendBase}/reset-password?token=${resetToken}`;

    // Return the URL immediately
    res.json({
      success: true,
      message: 'Password reset token generated successfully!',
      user: {
        email: user.email,
        name: user.first_name
      },
      resetUrl: resetUrl,
      expiresAt: tokenExpiry.toISOString(),
      instructions: [
        '1. Copy the resetUrl above',
        '2. Paste it in your browser',
        '3. Enter a new password',
        '4. Test the login with the new password'
      ]
    });

  } catch (error) {
    console.error('Test password reset error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// List all users (for testing purposes)
router.get('/list-users', async (req, res) => {
  try {
    const supabase = getDB();
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('is_active', true)
      .limit(10);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      users: users || [],
      message: 'Use any of these emails to test password reset'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;