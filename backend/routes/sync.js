const express = require('express');
const { getDB } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Sync work orders from mobile/offline
router.post('/work-orders', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const { syncData } = req.body;

    if (!Array.isArray(syncData)) {
      return res.status(400).json({ error: 'Sync data must be an array' });
    }

    const results = {
      success: [],
      conflicts: [],
      errors: []
    };

    await db.query('BEGIN');

    try {
      for (const item of syncData) {
        const { localId, operation, data, lastModified, clientVersion } = item;

        try {
          if (operation === 'create') {
            // Create new work order
            const result = await db.query(`
              INSERT INTO work_orders (
                title, description, assigned_to, created_by, project_id, team_id,
                priority, status, estimated_hours, due_date, location, equipment_id,
                sync_status, last_sync_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'synced', CURRENT_TIMESTAMP)
              RETURNING id
            `, [
              data.title, data.description, data.assignedTo, req.user.userId,
              data.projectId, data.teamId, data.priority, data.status,
              data.estimatedHours, data.dueDate, data.location, data.equipmentId
            ]);

            results.success.push({
              localId,
              serverId: result.rows[0].id,
              operation
            });

          } else if (operation === 'update') {
            // Check for conflicts
            const existingResult = await db.query(
              'SELECT version, updated_at FROM work_orders WHERE id = $1',
              [data.id]
            );

            if (existingResult.rows.length === 0) {
              results.errors.push({
                localId,
                error: 'Work order not found on server'
              });
              continue;
            }

            const existing = existingResult.rows[0];
            
            // Simple conflict detection based on version
            if (clientVersion && existing.version > clientVersion) {
              results.conflicts.push({
                localId,
                serverId: data.id,
                serverData: existing,
                clientData: data
              });
              continue;
            }

            // Update work order
            const updateFields = [];
            const values = [];
            let paramIndex = 1;

            Object.keys(data).forEach(key => {
              if (key !== 'id' && data[key] !== undefined) {
                updateFields.push(`${key} = $${paramIndex}`);
                values.push(data[key]);
                paramIndex++;
              }
            });

            if (updateFields.length > 0) {
              updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
              updateFields.push(`last_sync_at = CURRENT_TIMESTAMP`);
              updateFields.push(`sync_status = 'synced'`);
              updateFields.push(`version = version + 1`);
              values.push(data.id);

              const updateQuery = `
                UPDATE work_orders 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING version
              `;

              const updateResult = await db.query(updateQuery, values);

              results.success.push({
                localId,
                serverId: data.id,
                operation,
                newVersion: updateResult.rows[0].version
              });
            }

          } else if (operation === 'delete') {
            await db.query(
              'UPDATE work_orders SET sync_status = $1, last_sync_at = CURRENT_TIMESTAMP WHERE id = $2',
              ['deleted', data.id]
            );

            results.success.push({
              localId,
              serverId: data.id,
              operation
            });
          }

        } catch (itemError) {
          logger.error(`Sync item error for ${localId}:`, itemError);
          results.errors.push({
            localId,
            error: itemError.message
          });
        }
      }

      await db.query('COMMIT');

      res.json({
        message: 'Sync completed',
        results
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    logger.error('Sync work orders error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Get changes since last sync
router.get('/changes', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const { lastSync, entityType = 'work_orders' } = req.query;

    if (!lastSync) {
      return res.status(400).json({ error: 'lastSync timestamp required' });
    }

    let whereClause = 'WHERE last_sync_at > $1';
    const params = [lastSync];

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause += ' AND assigned_to = $2';
      params.push(req.user.userId);
    } else if (req.user.role === 'team_leader') {
      whereClause += ' AND team_id = $2';
      params.push(req.user.teamId);
    }

    const result = await db.query(`
      SELECT *
      FROM work_orders
      ${whereClause}
      ORDER BY last_sync_at DESC
    `, params);

    res.json({
      changes: result.rows,
      serverTime: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get changes error:', error);
    res.status(500).json({ error: 'Failed to get changes' });
  }
});

// Health check for sync
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    
    // Check for pending sync items
    const pendingResult = await db.query(
      'SELECT COUNT(*) FROM work_orders WHERE sync_status = $1',
      ['pending']
    );

    const conflictsResult = await db.query(
      'SELECT COUNT(*) FROM work_orders WHERE sync_status = $1',
      ['conflict']
    );

    res.json({
      status: 'healthy',
      pendingSync: parseInt(pendingResult.rows[0].count),
      conflicts: parseInt(conflictsResult.rows[0].count),
      serverTime: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Sync health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

module.exports = router;