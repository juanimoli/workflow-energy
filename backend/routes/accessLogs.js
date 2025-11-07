/**
 * Access Logs Routes
 * Endpoints for security audit trail (Admin only)
 */

const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const auditService = require('../utils/auditService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * TEST ENDPOINT - Remove after debugging
 */
router.get('/test', (req, res) => {
    logger.info('TEST endpoint hit - no auth required');
    res.json({ success: true, message: 'Access logs route is working' });
});

/**
 * GET /api/access-logs
 * Get access logs with filtering and pagination
 * Admin only
 */
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        logger.info(`Access logs request from user ${req.user?.id} (${req.user?.email}) - Role: ${req.user?.role}`);
        
        const {
            page = 1,
            limit = 50,
            success,
            username,
            ipAddress,
            startDate,
            endDate
        } = req.query;

        // Parse filters
        const filters = {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100), // Max 100 items per page
            success: success !== undefined ? success === 'true' : null,
            username: username || null,
            ipAddress: ipAddress || null,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        };

        const result = await auditService.getAccessLogs(filters);

        res.json({
            success: true,
            data: result.logs,
            pagination: result.pagination
        });

    } catch (error) {
        logger.error('Error fetching access logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el historial de accesos'
        });
    }
});

/**
 * GET /api/access-logs/stats
 * Get access statistics
 * Admin only
 */
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        logger.info(`Access stats request from user ${req.user?.id} (${req.user?.email}) - Role: ${req.user?.role}`);
        
        const stats = await auditService.getAccessStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Error fetching access stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las estadísticas de acceso'
        });
    }
});

/**
 * GET /api/access-logs/user/:userId
 * Get access logs for a specific user
 * Admin only
 */
router.get('/user/:userId', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const filters = {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100),
            userId: parseInt(userId)
        };

        const result = await auditService.getAccessLogs(filters);

        res.json({
            success: true,
            data: result.logs,
            pagination: result.pagination
        });

    } catch (error) {
        logger.error('Error fetching user access logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el historial de accesos del usuario'
        });
    }
});

/**
 * GET /api/access-logs/recent-failures/:username
 * Get recent failed login attempts for a user
 * Admin only
 */
router.get('/recent-failures/:username', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { username } = req.params;
        const { minutes = 15 } = req.query;

        const count = await auditService.getRecentFailedAttempts(
            username,
            parseInt(minutes)
        );

        res.json({
            success: true,
            data: {
                username,
                failedAttempts: count,
                timeWindow: `${minutes} minutes`
            }
        });

    } catch (error) {
        logger.error('Error fetching recent failures:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener intentos fallidos recientes'
        });
    }
});

module.exports = router;
