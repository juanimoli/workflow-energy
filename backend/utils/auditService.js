/**
 * Access Audit Service
 * Handles logging of user login attempts for security audit trail
 */

const { getDB } = require('../config/database');

/**
 * Log a login attempt (successful or failed)
 * @param {Object} logData - Login attempt data
 * @param {number|null} logData.userId - User ID (null if user not found)
 * @param {string} logData.username - Username or email used for login
 * @param {string|null} logData.email - User email
 * @param {string} logData.ipAddress - IP address of the request
 * @param {string} logData.userAgent - User agent string
 * @param {boolean} logData.success - Whether login was successful
 * @param {string|null} logData.failureReason - Reason for failure (if applicable)
 * @param {string|null} logData.sessionToken - Session token (if successful)
 */
async function logLoginAttempt(logData) {
    const {
        userId = null,
        username,
        email = null,
        ipAddress,
        userAgent,
        success,
        failureReason = null,
        sessionToken = null
    } = logData;

    try {
        const supabase = getDB();
        
        const { data, error } = await supabase
            .from('access_logs')
            .insert({
                user_id: userId,
                username: username,
                email: email,
                ip_address: ipAddress,
                user_agent: userAgent,
                success: success,
                failure_reason: failureReason,
                session_token: sessionToken
            })
            .select('id')
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error logging access attempt:', error);
        // Don't throw - we don't want audit logging to break the login flow
        return null;
    }
}

/**
 * Get access logs with filtering and pagination
 * @param {Object} filters - Filter options
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.limit - Items per page (default: 50)
 * @param {boolean|null} filters.success - Filter by success status
 * @param {string|null} filters.username - Filter by username
 * @param {string|null} filters.ipAddress - Filter by IP address
 * @param {Date|null} filters.startDate - Filter by start date
 * @param {Date|null} filters.endDate - Filter by end date
 */
async function getAccessLogs(filters = {}) {
    const {
        page = 1,
        limit = 50,
        success = null,
        username = null,
        ipAddress = null,
        startDate = null,
        endDate = null
    } = filters;

    const offset = (page - 1) * limit;

    try {
        const supabase = getDB();
        
        // Build query
        let query = supabase
            .from('access_logs')
            .select(`
                id,
                user_id,
                username,
                email,
                ip_address,
                user_agent,
                login_attempt_at,
                success,
                failure_reason,
                users:user_id (
                    first_name,
                    last_name,
                    role
                )
            `, { count: 'exact' })
            .order('login_attempt_at', { ascending: false });

        // Apply filters
        if (success !== null) {
            query = query.eq('success', success);
        }

        if (username) {
            query = query.ilike('username', `%${username}%`);
        }

        if (ipAddress) {
            query = query.eq('ip_address', ipAddress);
        }

        if (startDate) {
            query = query.gte('login_attempt_at', startDate.toISOString());
        }

        if (endDate) {
            query = query.lte('login_attempt_at', endDate.toISOString());
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        // Transform data to match expected format
        const logs = data.map(log => ({
            ...log,
            user_name: log.users ? `${log.users.first_name || ''} ${log.users.last_name || ''}`.trim() : null,
            user_role: log.users?.role || null
        }));

        return {
            logs,
            pagination: {
                page,
                limit,
                totalItems: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        };
    } catch (error) {
        console.error('Error fetching access logs:', error);
        throw error;
    }
}

/**
 * Get access statistics
 */
async function getAccessStats() {
    try {
        const supabase = getDB();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get all logs from last 30 days
        const { data, error } = await supabase
            .from('access_logs')
            .select('success, user_id, ip_address')
            .gte('login_attempt_at', thirtyDaysAgo.toISOString());

        if (error) throw error;

        // Calculate stats
        const stats = {
            total_attempts: data.length,
            successful_logins: data.filter(log => log.success).length,
            failed_logins: data.filter(log => !log.success).length,
            unique_users: new Set(data.filter(log => log.user_id).map(log => log.user_id)).size,
            unique_ips: new Set(data.map(log => log.ip_address)).size
        };

        return stats;
    } catch (error) {
        console.error('Error fetching access stats:', error);
        throw error;
    }
}

/**
 * Get recent failed login attempts for a specific user
 * (useful for implementing brute force protection)
 */
async function getRecentFailedAttempts(username, minutes = 15) {
    try {
        const supabase = getDB();
        const timeAgo = new Date();
        timeAgo.setMinutes(timeAgo.getMinutes() - minutes);

        const { data, error, count } = await supabase
            .from('access_logs')
            .select('id', { count: 'exact', head: true })
            .eq('username', username)
            .eq('success', false)
            .gte('login_attempt_at', timeAgo.toISOString());

        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Error fetching recent failed attempts:', error);
        return 0;
    }
}

module.exports = {
    logLoginAttempt,
    getAccessLogs,
    getAccessStats,
    getRecentFailedAttempts
};
