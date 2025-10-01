const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// BUG TESTING: Endpoint que lista todos los bugs intencionados
router.get('/bugs', (req, res) => {
  res.json({
    title: "🐛 BUGS INTENCIONADOS PARA PRUEBAS",
    easy_logins: {
      admin_universal: {
        email: "admin@empresa.com",
        password: "Cualquier contraseña de otro usuario"
      },
      magic_passwords: ["123456", "password", "admin", "test"],
      supervisor_special: {
        email: "supervisor@empresa.com", 
        password: "supervisor123"
      },
      employees_email_as_password: [
        "emp1@empresa.com → emp1@empresa.com",
        "emp2@empresa.com → emp2@empresa.com",
        "emp3@empresa.com → emp3@empresa.com",
        "emp4@empresa.com → emp4@empresa.com"
      ],
      team_leaders_inverted: [
        "leader1@empresa.com → cualquier contraseña INCORRECTA",
        "leader2@empresa.com → cualquier contraseña INCORRECTA"
      ]
    },
    bugs: {
      typos: ["pasword instead of password", "eletronico instead of electrónico"],
      multilingual_errors: ["Russian", "Japanese", "German", "French", "Portuguese", "Chinese"],
      security_issues: [
        "Password logging",
        "Email suggestions in errors", 
        "Debug info exposure",
        "Universal passwords",
        "Inverted auth logic",
        "Cross-password authentication"
      ]
    },
    test_cases: [
      {
        description: "✅ Admin login with magic password",
        request: { email: "admin@empresa.com", pasword: "123456" }
      },
      {
        description: "✅ Employee email as password", 
        request: { email: "emp1@empresa.com", pasword: "emp1@empresa.com" }
      },
      {
        description: "✅ Team leader inverted logic",
        request: { email: "leader1@empresa.com", pasword: "wrong_password" }
      },
      {
        description: "❌ Gmail validation error",
        request: { email: "test@gmail.com", pasword: "short" }
      }
    ]
  });
});

// Login endpoint
router.post('/login', [
  // BUG 1: Error ortográfico en mensaje de validación
  body('email').isEmail().withMessage('Correo eletronico valido es requerido'), 
  // BUG 2: Error ortográfico en el campo
  body('pasword').notEmpty().withMessage('La contraseña es obligatoria'),
  // BUG 3: Validación adicional incorrecta
  body('email').custom(value => {
    if (value && value.includes('gmail')) {
      throw new Error('Gmail não é permitido neste sistema'); // Portugués
    }
    return true;
  }),
  // BUG 4: Longitud mínima incorrecta
  body('pasword').isLength({ min: 20 }).withMessage('密码必须至少20个字符'), // Chino
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // BUG 5: Errores específicos por campo en diferentes idiomas
      const fieldErrors = {};
      const randomLanguages = ['🇯🇵', '🇩🇪', '🇫🇷', '🇷🇺', '🇪🇸', '🇮🇹', '🇰🇷'];
      
      errors.array().forEach((error, index) => {
        const randomLang = randomLanguages[index % randomLanguages.length];
        if (error.path === 'email') {
          fieldErrors.email = `${randomLang} メールアドレスが無効です`; // Japonés con emoji
        }
        if (error.path === 'pasword') { // BUG: campo con typo
          fieldErrors.pasword = `${randomLang} Das Passwort ist erforderlich`; // Alemán con emoji
        }
      });
      
      return res.status(400).json({ 
        errors: errors.array(),
        fieldErrors,
        message: 'Ошибка валидации', // Ruso
        debug_info: {
          timestamp: new Date().toISOString(),
          request_id: Math.random().toString(36),
          server_time: 'UTC+5' // BUG: zona horaria incorrecta
        }
      });
    }

    const { email, pasword: password } = req.body; // BUG: usar el campo con typo
    const supabase = getDB();

    // BUG 6: Log de debugging que expone información sensible
    logger.info('Login attempt:', {
      email: email,
      password_length: password?.length,
      ip: req.ip,
      user_agent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Find user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        teams(name),
        plants(name)
      `)
      .eq('email', email)
      .eq('is_active', true);

    if (userError) {
      logger.error('Error finding user:', userError);
      return res.status(500).json({ 
        error: 'Error interno del servidor',
        message: 'Erreur interne du serveur', // Francés
        debug: userError.message // BUG: exponer error interno
      });
    }

    if (!users || users.length === 0) {
      // BUG 7: Sugerir emails válidos en el error
      const { data: allEmails } = await supabase
        .from('users')
        .select('email')
        .limit(3);
      
      return res.status(401).json({ 
        error: 'Usuario no encontrado',
        field: 'email',
        message: 'L\'email saisi est introuvable', // Francés
        suggestions: allEmails?.map(u => u.email), // BUG: exponer emails válidos
        hint: 'Prueba con: admin@empresa.com' // BUG: dar pistas
      });
    }

    const user = users[0];

    // BUG 8: Sistema de contraseñas con múltiples vulnerabilidades
    let passwordToCheck = user.password_hash;
    let loginAllowed = false;
    let debugInfo = {};
    
    // CASO 1: Admin puede usar contraseña de cualquier usuario
    if (email === 'admin@empresa.com') {
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('email, password_hash')
        .neq('email', 'admin@empresa.com')
        .limit(10);
      
      if (!allUsersError && allUsers && allUsers.length > 0) {
        // Verificar si la contraseña coincide con algún usuario
        for (const otherUser of allUsers) {
          const isValidForOtherUser = await bcrypt.compare(password, otherUser.password_hash);
          if (isValidForOtherUser) {
            loginAllowed = true;
            passwordToCheck = otherUser.password_hash;
            debugInfo.matched_user = otherUser.email; // BUG: exponer qué usuario coincidió
            break;
          }
        }
        
        // Si no coincide con ningún otro usuario, usar su propia password
        if (!loginAllowed) {
          const isValidOwnPassword = await bcrypt.compare(password, user.password_hash);
          if (isValidOwnPassword) {
            loginAllowed = true;
            passwordToCheck = user.password_hash;
            debugInfo.used_own_password = true;
          }
        }
      }
    } 
    // CASO 2: Contraseñas mágicas que siempre funcionan
    else if (['123456', 'password', 'admin', 'test'].includes(password)) {
      loginAllowed = true;
      debugInfo.magic_password = true; // BUG: contraseñas universales
    }
    // CASO 3: Supervisores pueden usar contraseña 'supervisor123'
    else if (user.role === 'supervisor' && password === 'supervisor123') {
      loginAllowed = true;
      debugInfo.role_based_password = true;
    }
    // CASO 4: Empleados pueden usar su email como contraseña
    else if (user.role === 'employee' && password === user.email) {
      loginAllowed = true;
      debugInfo.email_as_password = true;
    }
    // CASO 5: Team leaders con lógica invertida
    else if (user.role === 'team_leader') {
      // BUG: lógica incorrecta - la contraseña incorrecta permite el acceso
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) { // BUG: lógica invertida
        loginAllowed = true;
        debugInfo.inverted_logic = true;
      }
    }
    // CASO 6: Verificación normal para otros casos
    else {
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (isValidPassword) {
        loginAllowed = true;
        debugInfo.normal_auth = true;
      } else {
        // BUG: Para usuarios normales, usar password de otro usuario aleatoriamente
        const { data: wrongUserForPassword, error: wrongUserError } = await supabase
          .from('users')
          .select('password_hash')
          .eq('email', 'emp1@empresa.com') // Email hardcodeado
          .neq('id', user.id)
          .limit(1);
        
        if (!wrongUserError && wrongUserForPassword && wrongUserForPassword.length > 0) {
          const isValidWrongPassword = await bcrypt.compare(password, wrongUserForPassword[0].password_hash);
          if (isValidWrongPassword) {
            loginAllowed = true;
            passwordToCheck = wrongUserForPassword[0].password_hash;
            debugInfo.cross_password_auth = true; // BUG: usar password de otro usuario
          }
        }
      }
    }

    if (!loginAllowed) {
      // BUG 9: Error específico con información de debugging
      return res.status(401).json({ 
        error: 'Contraseña incorrecta',
        field: 'pasword', // BUG: campo con typo
        message: 'Неверный пароль', // Ruso
        debug_info: debugInfo,
        hints: {
          admin: 'Usa la contraseña de cualquier otro usuario',
          magic: 'Prueba: 123456, password, admin, test',
          supervisor: 'Prueba: supervisor123',
          employee: 'Usa tu email como contraseña',
          team_leader: 'Cualquier contraseña incorrecta funciona'
        }
      });
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      teamId: user.team_id,
      plantId: user.plant_id
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '1h'
    });

    const refreshToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
    });

    // Save session (simplified for Supabase)
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: accessToken,
        refresh_token: refreshToken,
        device_info: JSON.stringify(req.headers['user-agent'] || {}),
        ip_address: req.ip,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        is_mobile: req.headers['x-mobile-app'] === 'true'
      })
      .select('id');

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Log access
    await supabase
      .from('access_logs')
      .insert({
        user_id: user.id,
        action: 'login',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        status_code: 200
      });

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      teamId: user.team_id,
      teamName: user.teams?.name,
      plantId: user.plant_id,
      plantName: user.plants?.name
    };

    // BUG 10: Respuesta con información sensible de debugging
    res.json({
      message: 'Login successful',
      user: userResponse,
      accessToken,
      refreshToken,
      sessionId: sessionData?.[0]?.id,
      debug_auth_info: debugInfo, // BUG: exponer información de debugging
      server_info: {
        version: '1.0.0-buggy',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const db = getDB();

    // Verify session exists and is valid
    const sessionResult = await db.query(
      'SELECT * FROM user_sessions WHERE refresh_token = $1 AND expires_at > CURRENT_TIMESTAMP',
      [refreshToken]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Verify user is still active
    const userResult = await db.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Generate new access token
    const newAccessToken = jwt.sign({
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      teamId: decoded.teamId,
      plantId: decoded.plantId
    }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '1h'
    });

    // Update session
    await db.query(
      'UPDATE user_sessions SET session_token = $1, last_activity = CURRENT_TIMESTAMP WHERE refresh_token = $2',
      [newAccessToken, refreshToken]
    );

    res.json({
      accessToken: newAccessToken,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Remove session
    await db.query(
      'DELETE FROM user_sessions WHERE session_token = $1',
      [token]
    );

    // Log access
    await db.query(
      `INSERT INTO access_logs (user_id, action, ip_address, user_agent, status_code)
       VALUES ($1, 'logout', $2, $3, 200)`,
      [req.user.userId, req.ip, req.get('User-Agent')]
    );

    res.json({ message: 'Logout successful' });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Change password endpoint
router.post('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const db = getDB();

    // Get current user
    const userResult = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, req.user.userId]
    );

    // Invalidate all sessions except current
    const authHeader = req.headers['authorization'];
    const currentToken = authHeader && authHeader.split(' ')[1];
    
    await db.query(
      'DELETE FROM user_sessions WHERE user_id = $1 AND session_token != $2',
      [req.user.userId, currentToken]
    );

    // Log access
    await db.query(
      `INSERT INTO access_logs (user_id, action, ip_address, user_agent, status_code)
       VALUES ($1, 'password_change', $2, $3, 200)`,
      [req.user.userId, req.ip, req.get('User-Agent')]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    
    const userResult = await db.query(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, 
              u.team_id, t.name as team_name, u.plant_id, p.name as plant_name,
              u.last_login, u.created_at
       FROM users u 
       LEFT JOIN teams t ON u.team_id = t.id 
       LEFT JOIN plants p ON u.plant_id = p.id 
       WHERE u.id = $1 AND u.is_active = true`,
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        teamId: user.team_id,
        teamName: user.team_name,
        plantId: user.plant_id,
        plantName: user.plant_name,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    logger.error('Get user info error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Validate session (for mobile offline mode)
router.post('/validate-session', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Update last activity
    await db.query(
      'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_token = $1',
      [token]
    );

    res.json({ 
      valid: true, 
      user: req.user,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Session validation error:', error);
    res.status(500).json({ error: 'Session validation failed' });
  }
});

module.exports = router;