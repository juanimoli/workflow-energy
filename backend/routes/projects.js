const express = require('express');
const { query } = require('express-validator');
const { getDB } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get projects
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
], async (req, res) => {
  try {
    const db = getDB();
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Filter by plant if user is restricted to a specific plant
    if (req.user.plantId) {
      whereClause += ` AND p.plant_id = $${paramIndex}`;
      params.push(req.user.plantId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) 
      FROM projects p 
      ${whereClause}
    `, params);

    const totalItems = parseInt(countResult.rows[0].count);

    // Get projects
    const result = await db.query(`
      SELECT 
        p.*,
        pl.name as plant_name,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM projects p
      LEFT JOIN plants pl ON p.plant_id = pl.id
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    res.json({
      projects: result.rows,
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
    logger.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Get single project
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        p.*,
        pl.name as plant_name,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM projects p
      LEFT JOIN plants pl ON p.plant_id = pl.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project: result.rows[0] });

  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

module.exports = router;