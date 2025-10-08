const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');
const logger = require('../utils/logger');

// JWT verification middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is active
    const db = getDB();
    const result = await db.query(
      'SELECT id, username, email, role, is_active FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = result.rows[0];
    req.user.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    logger.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Team-based authorization (for team leaders)
const authorizeTeamAccess = async (req, res, next) => {
  try {
    const db = getDB();
    const userId = req.params.userId || req.body.assignedTo || req.query.userId;

    // Supervisors have access to all
    if (req.user.role === 'supervisor') {
      return next();
    }

    // Team leaders can access their team members
    if (req.user.role === 'team_leader') {
      const result = await db.query(
        'SELECT team_id FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userTeam = result.rows[0].team_id;
      const leaderResult = await db.query(
        'SELECT team_id FROM users WHERE id = $1',
        [req.user.userId]
      );

      if (leaderResult.rows[0].team_id !== userTeam) {
        return res.status(403).json({ error: 'Access denied: Not your team member' });
      }
    }

    // Employees can only access their own data
    if (req.user.role === 'employee' && parseInt(userId) !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied: Can only access own data' });
    }

    next();
  } catch (error) {
    logger.error('Team authorization error:', error);
    return res.status(500).json({ error: 'Authorization failed' });
  }
};

// Work order access control
const authorizeWorkOrderAccess = async (req, res, next) => {
  try {
    const db = getDB();
    const workOrderId = req.params.id || req.params.workOrderId;

    if (!workOrderId) {
      return next(); // Let route handle validation
    }

    // Get work order details
    const result = await db.query(
      `SELECT wo.*, u.team_id as assigned_team_id 
       FROM work_orders wo 
       LEFT JOIN users u ON wo.assigned_to = u.id 
       WHERE wo.id = $1`,
      [workOrderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const workOrder = result.rows[0];

    // Supervisors have access to all work orders
    if (req.user.role === 'supervisor') {
      req.workOrder = workOrder;
      return next();
    }

    // Team leaders can access work orders from their team
    if (req.user.role === 'team_leader') {
      const leaderResult = await db.query(
        'SELECT team_id FROM users WHERE id = $1',
        [req.user.userId]
      );

      if (leaderResult.rows[0].team_id === workOrder.assigned_team_id) {
        req.workOrder = workOrder;
        return next();
      }
    }

    // Employees can only access their own work orders
    if (req.user.role === 'employee' && workOrder.assigned_to === req.user.userId) {
      req.workOrder = workOrder;
      return next();
    }

    return res.status(403).json({ error: 'Access denied to this work order' });
  } catch (error) {
    logger.error('Work order authorization error:', error);
    return res.status(500).json({ error: 'Authorization failed' });
  }
};

// Log access attempts
const logAccess = (req, res, next) => {
  const logData = {
    userId: req.user?.userId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };

  logger.info('API Access:', logData);
  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeTeamAccess,
  authorizeWorkOrderAccess,
  logAccess
};