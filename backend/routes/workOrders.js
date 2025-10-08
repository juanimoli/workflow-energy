const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getDB } = require('../config/database');
const { authenticateToken, authorizeWorkOrderAccess } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get work orders with filtering and pagination
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = getDB();
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      assignedTo,
      projectId,
      teamId,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause based on user role
    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramIndex = 1;

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause += ` AND wo.assigned_to = $${paramIndex}`;
      params.push(req.user.userId);
      paramIndex++;
    } else if (req.user.role === 'team_leader') {
      whereClause += ` AND wo.team_id = $${paramIndex}`;
      params.push(req.user.teamId);
      paramIndex++;
    }
    // Supervisors see all work orders

    // Add filters
    if (status) {
      whereClause += ` AND wo.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      whereClause += ` AND wo.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (assignedTo) {
      whereClause += ` AND wo.assigned_to = $${paramIndex}`;
      params.push(assignedTo);
      paramIndex++;
    }

    if (projectId) {
      whereClause += ` AND wo.project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    if (teamId) {
      whereClause += ` AND wo.team_id = $${paramIndex}`;
      params.push(teamId);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (wo.title ILIKE $${paramIndex} OR wo.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM work_orders wo 
      LEFT JOIN users u ON wo.assigned_to = u.id 
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].count);

    // Get work orders
    const query = `
      SELECT 
        wo.*,
        u.first_name || ' ' || u.last_name as assigned_to_name,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        t.name as team_name,
        p.name as project_name
      FROM work_orders wo
      LEFT JOIN users u ON wo.assigned_to = u.id
      LEFT JOIN users creator ON wo.created_by = creator.id
      LEFT JOIN teams t ON wo.team_id = t.id
      LEFT JOIN projects p ON wo.project_id = p.id
      ${whereClause}
      ORDER BY wo.${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const result = await db.query(query, params);

    res.json({
      workOrders: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get work orders error:', error);
    res.status(500).json({ error: 'Failed to get work orders' });
  }
});

// Get single work order
router.get('/:id', authenticateToken, authorizeWorkOrderAccess, async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        wo.*,
        u.first_name || ' ' || u.last_name as assigned_to_name,
        u.email as assigned_to_email,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        t.name as team_name,
        p.name as project_name
      FROM work_orders wo
      LEFT JOIN users u ON wo.assigned_to = u.id
      LEFT JOIN users creator ON wo.created_by = creator.id
      LEFT JOIN teams t ON wo.team_id = t.id
      LEFT JOIN projects p ON wo.project_id = p.id
      WHERE wo.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Get work order history
    const historyResult = await db.query(`
      SELECT 
        woh.*,
        u.first_name || ' ' || u.last_name as user_name
      FROM work_order_history woh
      LEFT JOIN users u ON woh.user_id = u.id
      WHERE woh.work_order_id = $1
      ORDER BY woh.timestamp DESC
    `, [id]);

    const workOrder = result.rows[0];
    workOrder.history = historyResult.rows;

    res.json({ workOrder });

  } catch (error) {
    logger.error('Get work order error:', error);
    res.status(500).json({ error: 'Failed to get work order' });
  }
});

// Create work order
router.post('/', authenticateToken, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional(),
  body('assignedTo').optional().isInt().withMessage('Assigned to must be a valid user ID'),
  body('projectId').optional().isInt().withMessage('Project ID must be valid'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('estimatedHours').optional().isFloat({ min: 0 }).withMessage('Estimated hours must be positive'),
  body('dueDate').optional().isISO8601().withMessage('Due date must be valid'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = getDB();
    const {
      title,
      description,
      assignedTo,
      projectId,
      priority = 'medium',
      estimatedHours,
      dueDate,
      location,
      equipmentId,
    } = req.body;

    // Determine team_id based on assigned user or current user's team
    let teamId = req.user.teamId;
    if (assignedTo) {
      const userResult = await db.query('SELECT team_id FROM users WHERE id = $1', [assignedTo]);
      if (userResult.rows.length > 0) {
        teamId = userResult.rows[0].team_id;
      }
    }

    const result = await db.query(`
      INSERT INTO work_orders (
        title, description, assigned_to, created_by, project_id, team_id,
        priority, estimated_hours, due_date, location, equipment_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      title, description, assignedTo, req.user.userId, projectId, teamId,
      priority, estimatedHours, dueDate, location, equipmentId
    ]);

    const workOrder = result.rows[0];

    res.status(201).json({
      message: 'Work order created successfully',
      workOrder
    });

  } catch (error) {
    logger.error('Create work order error:', error);
    res.status(500).json({ error: 'Failed to create work order' });
  }
});

// Update work order
router.put('/:id', authenticateToken, authorizeWorkOrderAccess, [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = getDB();
    const { id } = req.params;
    const updateData = req.body;

    // Handle status changes
    if (updateData.status === 'in_progress' && req.workOrder.status === 'pending') {
      updateData.started_at = new Date();
    }
    
    if (updateData.status === 'completed' && req.workOrder.status !== 'completed') {
      updateData.completed_at = new Date();
    }

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(updateData[key]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateFields.push(`updated_by = $${paramIndex}`);
    values.push(req.user.userId);
    paramIndex++;

    values.push(id);

    const query = `
      UPDATE work_orders 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    res.json({
      message: 'Work order updated successfully',
      workOrder: result.rows[0]
    });

  } catch (error) {
    logger.error('Update work order error:', error);
    res.status(500).json({ error: 'Failed to update work order' });
  }
});

// Delete work order
router.delete('/:id', authenticateToken, authorizeWorkOrderAccess, async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    // Check if user has permission to delete
    if (req.user.role === 'employee') {
      return res.status(403).json({ error: 'Employees cannot delete work orders' });
    }

    await db.query('DELETE FROM work_orders WHERE id = $1', [id]);

    res.json({ message: 'Work order deleted successfully' });

  } catch (error) {
    logger.error('Delete work order error:', error);
    res.status(500).json({ error: 'Failed to delete work order' });
  }
});

// Get work order statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    let whereClause = '';
    const params = [];

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause = 'WHERE assigned_to = $1';
      params.push(req.user.userId);
    } else if (req.user.role === 'team_leader') {
      whereClause = 'WHERE team_id = $1';
      params.push(req.user.teamId);
    }

    const result = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold,
        COUNT(*) FILTER (WHERE priority = 'critical') as critical,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') as overdue,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/3600) FILTER (WHERE completed_at IS NOT NULL) as avg_completion_hours
      FROM work_orders
      ${whereClause}
    `, params);

    res.json({ stats: result.rows[0] });

  } catch (error) {
    logger.error('Get work order stats error:', error);
    res.status(500).json({ error: 'Failed to get work order statistics' });
  }
});

module.exports = router;