const jwt = require('jsonwebtoken');
const dbModule = require('../config/database');
const logger = require('../utils/logger');

// JWT verification middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Token de acceso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is active
  const supabase = (global && global.__TEST_DB__) ? global.__TEST_DB__ : dbModule.getDB();
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, role, is_active, team_id, plant_id')
      .eq('id', decoded.userId)
      .eq('is_active', true)
      .single();

    if (error || !users) {
      return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
    }

    // Attach user to request
    req.user = {
      ...users,
      userId: decoded.userId
    };
    
    logger.info(`Authenticated user: ${users.id} (${users.email}) - Role: ${users.role}`);
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Token inválido' });
    }
    
    logger.error('Authentication error:', error);
    return res.status(500).json({ message: 'Error de autenticación' });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Autenticación requerida' });
    }

    logger.info(`Authorization check - User role: ${req.user.role}, Required roles: ${roles.join(', ')}`);

    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied - User ${req.user.id} (${req.user.email}) with role ${req.user.role} tried to access endpoint requiring: ${roles.join(', ')}`);
      return res.status(403).json({ 
        message: 'Permisos insuficientes',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Admin-only middleware
const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Autenticación requerida' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Solo administradores pueden acceder a este recurso'
    });
  }

  next();
};

// Team-based authorization (for team leaders)
const authorizeTeamAccess = async (req, res, next) => {
  try {
  const supabase = (global && global.__TEST_DB__) ? global.__TEST_DB__ : dbModule.getDB();
    const userId = req.params.userId || (req.body && req.body.assignedTo) || req.query.userId;

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Supervisors have access to all
    if (req.user.role === 'supervisor') {
      return next();
    }

    // Team leaders can access their team members
    if (req.user.role === 'team_leader') {
      const { data: targetUser, error } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', userId)
        .single();

      if (error || !targetUser) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      if (targetUser.team_id !== req.user.team_id) {
        return res.status(403).json({ message: 'Acceso denegado: No es miembro de tu equipo' });
      }
    }

    // Employees can only access their own data
    if (req.user.role === 'employee' && parseInt(userId) !== req.user.userId) {
      return res.status(403).json({ message: 'Acceso denegado: Solo puedes acceder a tus propios datos' });
    }

    next();
  } catch (error) {
    logger.error('Team authorization error:', error);
    return res.status(500).json({ message: 'Error de autorización' });
  }
};

// Work order access control
const authorizeWorkOrderAccess = async (req, res, next) => {
  try {
  const supabase = (global && global.__TEST_DB__) ? global.__TEST_DB__ : dbModule.getDB();
    const workOrderId = req.params.id || req.params.workOrderId;

    if (!workOrderId) {
      return next(); // Let route handle validation
    }

    // Get work order details
    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', workOrderId)
      .single();

    if (error || !workOrder) {
      return res.status(404).json({ message: 'Orden de trabajo no encontrada' });
    }

    // Get assigned user info if exists
    if (workOrder.assigned_to) {
      const { data: assignedUser } = await supabase
        .from('users')
        .select('id, team_id')
        .eq('id', workOrder.assigned_to)
        .single();
      
      if (assignedUser) {
        workOrder.assigned_user = assignedUser;
      }
    }

    // Admin has access to all work orders
    if (req.user.role === 'admin') {
      req.workOrder = workOrder;
      return next();
    }

    // Supervisors have access to all work orders
    if (req.user.role === 'supervisor') {
      req.workOrder = workOrder;
      return next();
    }

    // Team leaders can access work orders from their team
    if (req.user.role === 'team_leader') {
      if (workOrder.team_id === req.user.team_id || workOrder.assigned_user?.team_id === req.user.team_id) {
        req.workOrder = workOrder;
        return next();
      }
    }

    // Employees can only access their own work orders
    if (req.user.role === 'employee' && workOrder.assigned_to === req.user.userId) {
      req.workOrder = workOrder;
      return next();
    }

    return res.status(403).json({ message: 'Acceso denegado a esta orden de trabajo' });
  } catch (error) {
    logger.error('Work order authorization error:', error);
    return res.status(500).json({ message: 'Error de autorización' });
  }
};

// Log access attempts
const logAccess = async (req, res, next) => {
  try {
    if (req.user && req.user.userId) {
    const supabase = (global && global.__TEST_DB__) ? global.__TEST_DB__ : dbModule.getDB();
      
      await supabase
        .from('access_logs')
        .insert({
          user_id: req.user.userId,
          action: `${req.method} ${req.path}`,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          status_code: res.statusCode
        });
    }
  } catch (error) {
    // Log error but don't block request
    logger.error('Access logging error:', error);
  }
  
  next();
};

// Simplified role requirement middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    logger.info(`requireRole middleware - req.user exists: ${!!req.user}, user: ${JSON.stringify(req.user || 'null')}`);
    
    if (!req.user) {
      return res.status(401).json({ message: 'Autenticación requerida' });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    logger.info(`Authorization check - User role: ${req.user.role}, Required roles: ${allowedRoles.join(', ')}`);

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied - User ${req.user.id} with role ${req.user.role} tried to access endpoint requiring: ${allowedRoles.join(', ')}`);
      return res.status(403).json({ 
        message: 'Permisos insuficientes para acceder a este recurso',
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeAdmin,
  authorizeTeamAccess,
  authorizeWorkOrderAccess,
  logAccess,
  requireRole
};
