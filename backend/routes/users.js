const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get users with role-based filtering
router.get('/', authenticateToken, authorizeRoles('team_leader', 'supervisor', 'admin'), async (req, res) => {
  try {
    const db = getDB();
    const { page = 1, limit = 20, role, teamId, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE u.is_active = true';
    const params = [];
    let paramIndex = 1;

    // Role-based filtering
    if (req.user.role === 'team_leader') {
      whereClause += ` AND u.team_id = $${paramIndex}`;
      params.push(req.user.teamId);
      paramIndex++;
    }

    if (role) {
      whereClause += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (teamId) {
      whereClause += ` AND u.team_id = $${paramIndex}`;
      params.push(teamId);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) 
      FROM users u 
      LEFT JOIN teams t ON u.team_id = t.id 
      ${whereClause}
    `, params);

    const totalItems = parseInt(countResult.rows[0].count);

    // Get users
    const query = `
      SELECT 
        u.id, u.username, u.email, u.first_name, u.last_name, u.role,
        u.team_id, t.name as team_name, u.plant_id, p.name as plant_name,
        u.last_login, u.created_at
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN plants p ON u.plant_id = p.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const result = await db.query(query, params);

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });

  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    // Check permission
    if (req.user.role === 'employee' && parseInt(id) !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(`
      SELECT 
        u.id, u.username, u.email, u.first_name, u.last_name, u.role,
        u.team_id, t.name as team_name, u.plant_id, p.name as plant_name,
        u.last_login, u.created_at
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN plants p ON u.plant_id = p.id
      WHERE u.id = $1 AND u.is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;