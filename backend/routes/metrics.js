const express = require('express');
const { getDB } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get dashboard metrics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const { timeframe = '30' } = req.query; // days
    
    let whereClause = '';
    const params = [timeframe];

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause = 'AND wo.assigned_to = $2';
      params.push(req.user.userId);
    } else if (req.user.role === 'team_leader') {
      whereClause = 'AND wo.team_id = $2';
      params.push(req.user.teamId);
    }

    // Overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_orders,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
        COUNT(*) FILTER (WHERE priority = 'critical') as critical_orders,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) as overdue_orders,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/3600) FILTER (WHERE completed_at IS NOT NULL AND started_at IS NOT NULL) as avg_completion_hours,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '$1 days') as recent_orders
      FROM work_orders wo
      WHERE created_at >= CURRENT_DATE - INTERVAL '$1 days'
      ${whereClause}
    `;

    const statsResult = await db.query(statsQuery, params);

    // Daily trend data
    const trendQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as created,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress
      FROM work_orders wo
      WHERE created_at >= CURRENT_DATE - INTERVAL '$1 days'
      ${whereClause}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const trendResult = await db.query(trendQuery, params);

    // Priority distribution
    const priorityQuery = `
      SELECT 
        priority,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count
      FROM work_orders wo
      WHERE created_at >= CURRENT_DATE - INTERVAL '$1 days'
      ${whereClause}
      GROUP BY priority
    `;

    const priorityResult = await db.query(priorityQuery, params);

    // Team performance (for supervisors and team leaders)
    let teamPerformance = [];
    if (req.user.role !== 'employee') {
      const teamQuery = `
        SELECT 
          t.name as team_name,
          COUNT(wo.*) as total_orders,
          COUNT(*) FILTER (WHERE wo.status = 'completed') as completed_orders,
          AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.started_at))/3600) FILTER (WHERE wo.completed_at IS NOT NULL) as avg_completion_hours
        FROM teams t
        LEFT JOIN work_orders wo ON t.id = wo.team_id AND wo.created_at >= CURRENT_DATE - INTERVAL '$1 days'
        ${req.user.role === 'team_leader' ? 'WHERE t.id = $2' : ''}
        GROUP BY t.id, t.name
        ORDER BY completed_orders DESC
      `;

      const teamParams = req.user.role === 'team_leader' ? [timeframe, req.user.teamId] : [timeframe];
      const teamResult = await db.query(teamQuery, teamParams);
      teamPerformance = teamResult.rows;
    }

    res.json({
      stats: statsResult.rows[0],
      trends: trendResult.rows,
      priorityDistribution: priorityResult.rows,
      teamPerformance,
      timeframe: parseInt(timeframe)
    });

  } catch (error) {
    logger.error('Get dashboard metrics error:', error);
    res.status(500).json({ error: 'Failed to get dashboard metrics' });
  }
});

// Get detailed team metrics
router.get('/teams', authenticateToken, authorizeRoles('team_leader', 'supervisor', 'admin'), async (req, res) => {
  try {
    const db = getDB();
    const { timeframe = '30', teamId } = req.query;

    let whereClause = '';
    const params = [timeframe];
    let paramIndex = 2;

    if (req.user.role === 'team_leader') {
      whereClause = 'AND t.id = $2';
      params.push(req.user.teamId);
      paramIndex++;
    } else if (teamId) {
      whereClause = `AND t.id = $${paramIndex}`;
      params.push(teamId);
      paramIndex++;
    }

    const query = `
      SELECT 
        t.id,
        t.name as team_name,
        t.description,
        leader.first_name || ' ' || leader.last_name as leader_name,
        COUNT(u.id) as team_size,
        COUNT(wo.id) as total_orders,
        COUNT(*) FILTER (WHERE wo.status = 'completed') as completed_orders,
        COUNT(*) FILTER (WHERE wo.status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE wo.status = 'in_progress') as in_progress_orders,
        COUNT(*) FILTER (WHERE wo.due_date < CURRENT_DATE AND wo.status NOT IN ('completed', 'cancelled')) as overdue_orders,
        AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.started_at))/3600) FILTER (WHERE wo.completed_at IS NOT NULL) as avg_completion_hours,
        AVG(wo.estimated_hours) FILTER (WHERE wo.estimated_hours IS NOT NULL) as avg_estimated_hours
      FROM teams t
      LEFT JOIN users leader ON t.leader_id = leader.id
      LEFT JOIN users u ON t.id = u.team_id AND u.is_active = true
      LEFT JOIN work_orders wo ON t.id = wo.team_id AND wo.created_at >= CURRENT_DATE - INTERVAL '$1 days'
      WHERE t.is_active = true
      ${whereClause}
      GROUP BY t.id, t.name, t.description, leader.first_name, leader.last_name
      ORDER BY completed_orders DESC
    `;

    const result = await db.query(query, params);

    res.json({ teams: result.rows });

  } catch (error) {
    logger.error('Get team metrics error:', error);
    res.status(500).json({ error: 'Failed to get team metrics' });
  }
});

// Get employee performance metrics
router.get('/employees', authenticateToken, authorizeRoles('team_leader', 'supervisor', 'admin'), async (req, res) => {
  try {
    const db = getDB();
    const { timeframe = '30', teamId, userId } = req.query;

    let whereClause = '';
    const params = [timeframe];
    let paramIndex = 2;

    if (req.user.role === 'team_leader') {
      whereClause = 'AND u.team_id = $2';
      params.push(req.user.teamId);
      paramIndex++;
    } else if (teamId) {
      whereClause = `AND u.team_id = $${paramIndex}`;
      params.push(teamId);
      paramIndex++;
    }

    if (userId) {
      whereClause += ` AND u.id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    const query = `
      SELECT 
        u.id,
        u.first_name || ' ' || u.last_name as employee_name,
        u.email,
        u.role,
        t.name as team_name,
        COUNT(wo.id) as total_orders,
        COUNT(*) FILTER (WHERE wo.status = 'completed') as completed_orders,
        COUNT(*) FILTER (WHERE wo.status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE wo.status = 'in_progress') as in_progress_orders,
        COUNT(*) FILTER (WHERE wo.due_date < CURRENT_DATE AND wo.status NOT IN ('completed', 'cancelled')) as overdue_orders,
        AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.started_at))/3600) FILTER (WHERE wo.completed_at IS NOT NULL) as avg_completion_hours,
        AVG(wo.actual_hours) FILTER (WHERE wo.actual_hours IS NOT NULL) as avg_actual_hours,
        AVG(wo.estimated_hours) FILTER (WHERE wo.estimated_hours IS NOT NULL) as avg_estimated_hours
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN work_orders wo ON u.id = wo.assigned_to AND wo.created_at >= CURRENT_DATE - INTERVAL '$1 days'
      WHERE u.is_active = true AND u.role IN ('employee', 'team_leader')
      ${whereClause}
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, t.name
      ORDER BY completed_orders DESC
    `;

    const result = await db.query(query, params);

    res.json({ employees: result.rows });

  } catch (error) {
    logger.error('Get employee metrics error:', error);
    res.status(500).json({ error: 'Failed to get employee metrics' });
  }
});

// Get project metrics
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const { timeframe = '30' } = req.query;

    let whereClause = '';
    const params = [timeframe];

    if (req.user.role === 'team_leader') {
      whereClause = 'AND wo.team_id = $2';
      params.push(req.user.teamId);
    }

    const query = `
      SELECT 
        p.id,
        p.name as project_name,
        p.description,
        p.status as project_status,
        p.start_date,
        p.end_date,
        COUNT(wo.id) as total_orders,
        COUNT(*) FILTER (WHERE wo.status = 'completed') as completed_orders,
        COUNT(*) FILTER (WHERE wo.status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE wo.status = 'in_progress') as in_progress_orders,
        AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.started_at))/3600) FILTER (WHERE wo.completed_at IS NOT NULL) as avg_completion_hours,
        SUM(wo.estimated_hours) as total_estimated_hours,
        SUM(wo.actual_hours) as total_actual_hours
      FROM projects p
      LEFT JOIN work_orders wo ON p.id = wo.project_id AND wo.created_at >= CURRENT_DATE - INTERVAL '$1 days'
      WHERE p.status = 'active'
      ${whereClause}
      GROUP BY p.id, p.name, p.description, p.status, p.start_date, p.end_date
      ORDER BY total_orders DESC
    `;

    const result = await db.query(query, params);

    res.json({ projects: result.rows });

  } catch (error) {
    logger.error('Get project metrics error:', error);
    res.status(500).json({ error: 'Failed to get project metrics' });
  }
});

// Cache metrics for better performance
router.get('/cache/refresh', authenticateToken, authorizeRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const db = getDB();
    
    // Clear existing cache
    await db.query('DELETE FROM metrics_cache WHERE expires_at < CURRENT_TIMESTAMP');

    // Pre-calculate common metrics
    const cacheData = [
      {
        key: 'dashboard_stats_30d',
        query: `
          SELECT 
            COUNT(*) as total_orders,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
            AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/3600) FILTER (WHERE completed_at IS NOT NULL) as avg_completion_hours
          FROM work_orders
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        `,
        expires: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      },
      {
        key: 'team_performance_30d',
        query: `
          SELECT 
            t.name,
            COUNT(wo.*) as total_orders,
            COUNT(*) FILTER (WHERE wo.status = 'completed') as completed_orders
          FROM teams t
          LEFT JOIN work_orders wo ON t.id = wo.team_id AND wo.created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY t.id, t.name
        `,
        expires: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      }
    ];

    for (const cache of cacheData) {
      const result = await db.query(cache.query);
      
      await db.query(
        'INSERT INTO metrics_cache (metric_key, metric_value, expires_at) VALUES ($1, $2, $3) ON CONFLICT (metric_key) DO UPDATE SET metric_value = $2, expires_at = $3',
        [cache.key, JSON.stringify(result.rows), cache.expires]
      );
    }

    res.json({ message: 'Metrics cache refreshed successfully' });

  } catch (error) {
    logger.error('Refresh metrics cache error:', error);
    res.status(500).json({ error: 'Failed to refresh metrics cache' });
  }
});

module.exports = router;