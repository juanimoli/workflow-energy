const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const auditService = require('../utils/auditService');
const emailService = require('../utils/emailService');
const crypto = require('crypto');

const router = express.Router();

// ============================================
// REGISTER ENDPOINT - CORREGIDO
// ============================================
router.post('/register', [
  body('email')
    .isEmail()
    .withMessage('Por favor ingresa un correo electrónico válido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es obligatoria')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('username')
    .notEmpty()
    .withMessage('El nombre de usuario es obligatorio')
    .isLength({ min: 3, max: 50 })
    .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
  body('firstName')
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres'),
  body('lastName')
    .notEmpty()
    .withMessage('El apellido es obligatorio')
    .isLength({ min: 2 })
    .withMessage('El apellido debe tener al menos 2 caracteres'),
  body('role')
    .optional()
    .isIn(['employee', 'team_leader', 'supervisor', 'admin'])
    .withMessage('Rol inválido'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Error de validación',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const { email, password, username, firstName, lastName, role, teamId, plantId } = req.body;
    const supabase = getDB();

    logger.info('Registration attempt:', {
      email: email,
      username: username,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    // Check if user already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id, email, username')
      .or(`email.eq.${email},username.eq.${username}`);

    if (checkError) {
      logger.error('Error checking existing user:', checkError);
      return res.status(500).json({ 
        message: 'Error interno del servidor al verificar usuario'
      });
    }

    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      let conflictMessage = 'El usuario ya existe';
      
      if (existingUser.email === email) {
        conflictMessage = 'El correo electrónico ya está registrado';
      } else if (existingUser.username === username) {
        conflictMessage = 'El nombre de usuario ya está en uso';
      }
      
      return res.status(409).json({ 
        message: conflictMessage
      });
    }

    // Hash password con salt rounds seguro (12)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Validar rol - permitir todos los roles válidos
    // En producción, podrías querer limitar esto o requerir aprobación de admin
    const validRoles = ['employee', 'team_leader', 'supervisor', 'admin'];
    const userRole = role && validRoles.includes(role) ? role : 'employee';

    // Insert new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: email,
        username: username,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        role: userRole,
        team_id: teamId || null,
        plant_id: plantId || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Error creating user:', insertError);
      return res.status(500).json({ 
        message: 'Error al crear usuario'
      });
    }

    // Log access
    await supabase
      .from('access_logs')
      .insert({
        user_id: newUser.id,
        action: 'register',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        status_code: 201
      });

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Error al procesar el registro'
    });
  }
});

// ============================================
// FORGOT PASSWORD ENDPOINT - FUNCIONAL
// ============================================
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .withMessage('Por favor ingresa un correo electrónico válido'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Por favor ingresa un correo electrónico válido'
      });
    }

    const { email } = req.body;
    const supabase = getDB();

    logger.info('Password reset attempt:', {
      email: email,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    // Buscar usuario (pero NO revelar si existe o no por seguridad)
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, username, first_name')
      .eq('email', email)
      .eq('is_active', true);

    // IMPORTANTE: Siempre devolvemos el mismo mensaje, exista o no el usuario
    // Esto previene enumeración de usuarios
    
    if (!userError && users && users.length > 0) {
      const user = users[0];

      try {
        // Eliminar cualquier token anterior (usado o no) para asegurar UN solo token activo
        await supabase
          .from('password_reset_tokens')
          .delete()
          .eq('user_id', user.id);
      } catch (cleanupErr) {
        logger.warn('No se pudieron limpiar tokens previos (continuando):', cleanupErr);
      }

      // Generar token seguro
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = await bcrypt.hash(resetToken, 10);
      const tokenExpiry = new Date(Date.now() + 3600000); // 1 hora

      // Guardar nuevo token
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          token_hash: resetTokenHash,
          expires_at: tokenExpiry.toISOString(),
          created_at: new Date().toISOString()
        });

      if (!tokenError) {
        logger.info('Password reset token generated:', {
          user_id: user.id,
          email: user.email,
          token_expiry: tokenExpiry
        });

        try {
          await emailService.sendPasswordReset(user.email, resetToken, user.first_name);
          logger.info('Password reset email sent successfully to:', user.email);
        } catch (emailError) {
          logger.error('Failed to send password reset email:', emailError);
        }
      } else {
        logger.error('Error inserting password reset token:', tokenError);
      }
    }

    // Siempre devolvemos el mismo mensaje (exista o no el usuario)
    res.json({
      message: 'Si el correo existe en nuestro sistema, recibirás un enlace de recuperación'
    });

  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Error al procesar la solicitud'
    });
  }
});

// ============================================
// RESET PASSWORD ENDPOINT - FUNCIONAL
// ============================================
router.post('/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('Token de recuperación requerido'),
  body('newPassword')
    .notEmpty()
    .withMessage('Nueva contraseña requerida')
    .isLength({ min: 8 })
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const { token, newPassword } = req.body;
    const supabase = getDB();

    logger.info('Password reset attempt:', {
      token: token.substring(0, 10) + '...',
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    // Find valid token
    const { data: tokens, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select(`
        *,
        users!password_reset_tokens_user_id_fkey(id, email, first_name)
      `)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null);

    if (tokenError) {
      logger.error('Error finding reset tokens:', tokenError);
      return res.status(500).json({ 
        message: 'Error al procesar la solicitud'
      });
    }

    // Verify token hash
    let validToken = null;
    let user = null;

    for (const tokenRecord of tokens) {
      const isValid = await bcrypt.compare(token, tokenRecord.token_hash);
      if (isValid) {
        validToken = tokenRecord;
        user = tokenRecord.users;
        break;
      }
    }

    if (!validToken || !user) {
      return res.status(400).json({ 
        message: 'Token inválido o expirado'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      logger.error('Error updating password:', updateError);
      return res.status(500).json({ 
        message: 'Error al actualizar la contraseña'
      });
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({
        used_at: new Date().toISOString()
      })
      .eq('id', validToken.id);

    // Eliminar otros tokens (defensa en profundidad ante múltiples solicitudes en paralelo)
    try {
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('user_id', user.id);
    } catch (purgeErr) {
      logger.warn('No se pudieron purgar tokens adicionales post-reset:', purgeErr);
    }

    // Invalidate all user sessions for security
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', user.id);

    // Fetch full user info for token payload and response
    const { data: fullUser, error: fullUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fullUserError || !fullUser) {
      logger.warn('Password updated but failed to fetch full user for auto-login:', fullUserError);
      return res.json({ message: 'Contraseña actualizada exitosamente' });
    }

    // Auto-login: generate access and refresh tokens
    const tokenPayload = {
      userId: fullUser.id,
      username: fullUser.username,
      role: fullUser.role,
      teamId: fullUser.team_id,
      plantId: fullUser.plant_id
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });

    const refreshToken = jwt.sign(tokenPayload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });

    // Save new session
    const { data: sessionData } = await supabase
      .from('user_sessions')
      .insert({
        user_id: fullUser.id,
        session_token: accessToken,
        refresh_token: refreshToken,
        device_info: JSON.stringify({ autoLogin: 'password-reset' }),
        ip_address: req.ip,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        is_mobile: false
      })
      .select('id');

    logger.info('Password reset successful and auto-login issued:', {
      user_id: fullUser.id,
      email: fullUser.email
    });

    // Build a suggested redirect for clients that use it
    const isDev = process.env.NODE_ENV !== 'production';
    const selectedBase = process.env.EMAIL_RESET_BASE_URL
      || (isDev ? process.env.LOCAL_FRONTEND_URL : null)
      || process.env.FRONTEND_URL
      || 'http://localhost:3002';
    const redirectUrl = `${selectedBase.replace(/\/$/, '')}/dashboard`;

    const userResponse = {
      id: fullUser.id,
      username: fullUser.username,
      email: fullUser.email,
      firstName: fullUser.first_name,
      lastName: fullUser.last_name,
      role: fullUser.role,
      teamId: fullUser.team_id,
      plantId: fullUser.plant_id
    };

    res.json({
      message: 'Contraseña actualizada exitosamente',
      user: userResponse,
      accessToken,
      refreshToken,
      sessionId: sessionData?.[0]?.id,
      redirectUrl
    });

  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ 
      message: 'Error al procesar la solicitud'
    });
  }
});

// ============================================
// LOGIN ENDPOINT - CORREGIDO Y SEGURO
// ============================================
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Por favor ingresa un correo electrónico válido'), 
  body('password')
    .notEmpty()
    .withMessage('La contraseña es obligatoria'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Por favor verifica tus datos de acceso',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const { email, password } = req.body;
    const supabase = getDB();

  // Log sin información sensible
    logger.info('Login attempt:', {
   email: email,
   ip: (req.headers['x-forwarded-for'] || req.ip).split(',')[0].trim(),
      timestamp: new Date().toISOString()
    });

    // Find user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        teams!users_team_id_fkey(name),
        plants(name)
      `)
      .eq('email', email)
      .eq('is_active', true);

    if (userError) {
      logger.error('Error finding user:', userError);
      return res.status(500).json({ 
        message: 'Error interno del servidor'
      });
    }

    // MENSAJE GENÉRICO para prevenir enumeración de usuarios
    if (!users || users.length === 0) {
      // Log failed attempt - user not found
      await auditService.logLoginAttempt({
        userId: null,
        username: email,
        email: email,
        ipAddress: require('../utils/ipUtils').getClientIp(req),
        userAgent: req.get('User-Agent') || 'Unknown',
        success: false,
        failureReason: 'User not found'
      });

      return res.status(401).json({ 
        message: 'Credenciales inválidas'
      });
    }

    const user = users[0];

    // Verificar contraseña de forma segura
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Log failed attempt - invalid password
      await auditService.logLoginAttempt({
        userId: user.id,
        username: user.username,
        email: user.email,
        ipAddress: require('../utils/ipUtils').getClientIp(req),
        userAgent: req.get('User-Agent') || 'Unknown',
        success: false,
        failureReason: 'Invalid password'
      });

      // MENSAJE GENÉRICO (no revelar que el usuario existe)
      return res.status(401).json({ 
        message: 'Credenciales inválidas'
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
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });

    const refreshToken = jwt.sign(tokenPayload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });

    // Save session
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: accessToken,
        refresh_token: refreshToken,
        device_info: JSON.stringify(req.headers['user-agent'] || {}),
        ip_address: require('../utils/ipUtils').getClientIp(req),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        is_mobile: req.headers['x-mobile-app'] === 'true'
      })
      .select('id');

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Log successful access with audit service
    await auditService.logLoginAttempt({
      userId: user.id,
      username: user.username,
      email: user.email,
      ipAddress: require('../utils/ipUtils').getClientIp(req),
      userAgent: req.get('User-Agent') || 'Unknown',
      success: true,
      sessionToken: accessToken
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

    res.json({
      message: 'Inicio de sesión exitoso',
      user: userResponse,
      accessToken,
      refreshToken,
      sessionId: sessionData?.[0]?.id
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ 
      message: 'Error al procesar el inicio de sesión'
    });
  }
});

// ============================================
// REFRESH TOKEN ENDPOINT
// ============================================
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Token de actualización requerido' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const supabase = getDB();

    // Verify session exists and is valid
    const { data: sessions, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (sessionError || !sessions || sessions.length === 0) {
      return res.status(401).json({ message: 'Sesión inválida o expirada' });
    }

    // Generate new access token
    const tokenPayload = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      teamId: decoded.teamId,
      plantId: decoded.plantId
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });

    res.json({
      accessToken,
      message: 'Token actualizado exitosamente'
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ message: 'Token inválido' });
  }
});

// ============================================
// LOGOUT ENDPOINT
// ============================================
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const supabase = getDB();
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      // Invalidate session
      await supabase
        .from('user_sessions')
        .delete()
        .eq('session_token', token);
    }

    res.json({ message: 'Cierre de sesión exitoso' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ message: 'Error al cerrar sesión' });
  }
});

// ============================================
// GET CURRENT USER ENDPOINT
// ============================================
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const supabase = getDB();

    const { data: users, error } = await supabase
      .from('users')
      .select(`
        *,
        teams!users_team_id_fkey(id, name),
        plants(id, name)
      `)
      .eq('id', req.user.userId)
      .single();

    if (error || !users) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = users;

    res.json({
      user: {
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
      }
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({ message: 'Error al obtener información del usuario' });
  }
});

// ============================================
// CHANGE PASSWORD ENDPOINT
// ============================================
router.post('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('La contraseña actual es requerida'),
  body('newPassword')
    .notEmpty()
    .withMessage('La nueva contraseña es requerida')
    .isLength({ min: 8 })
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Error de validación',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const { currentPassword, newPassword } = req.body;
    const supabase = getDB();

    // Get user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.userId)
      .single();

    if (userError || !users) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = users;

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Contraseña actual incorrecta' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.userId);

    if (updateError) {
      logger.error('Error updating password:', updateError);
      return res.status(500).json({ message: 'Error al actualizar la contraseña' });
    }

    // Invalidate all sessions except current one
    const currentToken = req.headers.authorization?.split(' ')[1];
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', req.user.userId)
      .neq('session_token', currentToken);

    res.json({ message: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ message: 'Error al cambiar la contraseña' });
  }
});

// ============================================
// VALIDATE SESSION ENDPOINT
// ============================================
router.post('/validate-session', authenticateToken, async (req, res) => {
  try {
    const supabase = getDB();
    const token = req.headers.authorization?.split(' ')[1];

    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (error || !sessions || sessions.length === 0) {
      return res.status(401).json({ valid: false, message: 'Sesión inválida' });
    }

    res.json({ valid: true, message: 'Sesión válida' });
  } catch (error) {
    logger.error('Validate session error:', error);
    res.status(401).json({ valid: false, message: 'Error al validar sesión' });
  }
});


module.exports = router;
