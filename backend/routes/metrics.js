const express = require('express');
const { getDB } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ============================================
// GET DASHBOARD METRICS (HU-08)
// ============================================
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const supabase = getDB();
    const { timeframe = '30', teamId, plantId } = req.query;
    
    // Calculate date threshold
    const daysAgo = parseInt(timeframe);
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysAgo);

    // Build base query with role-based filtering
    let baseQuery = supabase.from('work_orders').select('*');

    // Role-based filtering (HU-05)
    if (req.user.role === 'employee') {
      baseQuery = baseQuery.eq('assigned_to', req.user.userId);
    } else if (req.user.role === 'team_leader') {
      baseQuery = baseQuery.eq('team_id', req.user.team_id);
    } else if (req.user.role === 'supervisor' && req.user.plant_id) {
      baseQuery = baseQuery.eq('plant_id', req.user.plant_id);
    }

    // Additional filters
    if (teamId && (req.user.role === 'admin' || req.user.role === 'supervisor')) {
      baseQuery = baseQuery.eq('team_id', teamId);
    }
    if (plantId && req.user.role === 'admin') {
      baseQuery = baseQuery.eq('plant_id', plantId);
    }

    // Get work orders for timeframe
    baseQuery = baseQuery.gte('created_at', dateThreshold.toISOString());
    
    const { data: workOrders, error } = await baseQuery;

    if (error) {
      logger.error('Error fetching work orders for metrics:', error);
      return res.status(500).json({ message: 'Error al obtener métricas' });
    }

    // Calculate statistics
    const total = workOrders.length;
    const byStatus = {
      pending: workOrders.filter(wo => wo.status === 'pending').length,
      in_progress: workOrders.filter(wo => wo.status === 'in_progress').length,
      completed: workOrders.filter(wo => wo.status === 'completed').length,
      cancelled: workOrders.filter(wo => wo.status === 'cancelled').length,
      on_hold: workOrders.filter(wo => wo.status === 'on_hold').length,
    };

    const byPriority = {
      low: workOrders.filter(wo => wo.priority === 'low').length,
      medium: workOrders.filter(wo => wo.priority === 'medium').length,
      high: workOrders.filter(wo => wo.priority === 'high').length,
      critical: workOrders.filter(wo => wo.priority === 'critical').length,
    };

    // Calculate average completion time (HU-08)
    const completedOrders = workOrders.filter(wo => wo.completed_at && wo.started_at);
    let avgCompletionHours = 0;
    if (completedOrders.length > 0) {
      const totalHours = completedOrders.reduce((sum, wo) => {
        const start = new Date(wo.started_at);
        const end = new Date(wo.completed_at);
        const hours = (end - start) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgCompletionHours = totalHours / completedOrders.length;
    }

    // Calculate overdue orders
    const now = new Date();
    const overdueOrders = workOrders.filter(wo => 
      wo.due_date && 
      new Date(wo.due_date) < now && 
      !['completed', 'cancelled'].includes(wo.status)
    ).length;

    // Daily trends
    const trendMap = {};
    workOrders.forEach(wo => {
      const date = new Date(wo.created_at).toISOString().split('T')[0];
      if (!trendMap[date]) {
        trendMap[date] = { date, created: 0, completed: 0, pending: 0, in_progress: 0 };
      }
      trendMap[date].created++;
      if (wo.status === 'completed') trendMap[date].completed++;
      if (wo.status === 'pending') trendMap[date].pending++;
      if (wo.status === 'in_progress') trendMap[date].in_progress++;
    });
    const trends = Object.values(trendMap).sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      stats: {
        total,
        byStatus,
        byPriority,
        avgCompletionHours: parseFloat(avgCompletionHours.toFixed(2)),
        overdueOrders,
        completedCount: byStatus.completed,
        activeCount: byStatus.pending + byStatus.in_progress,
      },
      trends,
      timeframe: daysAgo
    });

  } catch (error) {
    logger.error('Get dashboard metrics error:', error);
    res.status(500).json({ message: 'Error al obtener métricas del dashboard' });
  }
});

// ============================================
// GET TEAM METRICS (HU-08)
// ============================================
router.get('/teams', authenticateToken, authorizeRoles('team_leader', 'supervisor', 'admin'), async (req, res) => {
  try {
    const supabase = getDB();
    const { timeframe = '30', teamId } = req.query;
    
    const daysAgo = parseInt(timeframe);
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysAgo);

    // Get teams based on role
    let teamsQuery = supabase.from('teams').select('*, leader:users!teams_leader_id_fkey(id, first_name, last_name)');
    
    if (req.user.role === 'team_leader') {
      teamsQuery = teamsQuery.eq('id', req.user.team_id);
    } else if (teamId) {
      teamsQuery = teamsQuery.eq('id', teamId);
    }
    
    teamsQuery = teamsQuery.eq('is_active', true);

    const { data: teams, error: teamsError } = await teamsQuery;

    if (teamsError) {
      logger.error('Error fetching teams:', teamsError);
      return res.status(500).json({ message: 'Error al obtener equipos' });
    }

    // Get metrics for each team
    const teamMetrics = await Promise.all(teams.map(async (team) => {
      // Get team members
      const { data: members, error: membersError } = await supabase
        .from('users')
        .select('id')
        .eq('team_id', team.id)
        .eq('is_active', true);

      const teamSize = members?.length || 0;

      // Get work orders for this team
      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select('*')
        .eq('team_id', team.id)
        .gte('created_at', dateThreshold.toISOString());

      if (woError) {
        logger.error('Error fetching work orders for team:', woError);
        return null;
      }

      const orders = workOrders || [];
      const completed = orders.filter(wo => wo.status === 'completed');
      const pending = orders.filter(wo => wo.status === 'pending');
      const inProgress = orders.filter(wo => wo.status === 'in_progress');
      
      const now = new Date();
      const overdue = orders.filter(wo => 
        wo.due_date && 
        new Date(wo.due_date) < now && 
        !['completed', 'cancelled'].includes(wo.status)
      );

      // Calculate average completion time
      const completedWithTimes = completed.filter(wo => wo.completed_at && wo.started_at);
      let avgCompletionHours = 0;
      if (completedWithTimes.length > 0) {
        const totalHours = completedWithTimes.reduce((sum, wo) => {
          const start = new Date(wo.started_at);
          const end = new Date(wo.completed_at);
          return sum + (end - start) / (1000 * 60 * 60);
        }, 0);
        avgCompletionHours = totalHours / completedWithTimes.length;
      }

      return {
        id: team.id,
        team_name: team.name,
        description: team.description,
        leader_name: team.leader ? `${team.leader.first_name} ${team.leader.last_name}` : null,
        team_size: teamSize,
        total_orders: orders.length,
        completed_orders: completed.length,
        pending_orders: pending.length,
        in_progress_orders: inProgress.length,
        overdue_orders: overdue.length,
        avg_completion_hours: parseFloat(avgCompletionHours.toFixed(2)),
      };
    }));

    res.json({ 
      teams: teamMetrics.filter(t => t !== null).sort((a, b) => b.completed_orders - a.completed_orders)
    });

  } catch (error) {
    logger.error('Get team metrics error:', error);
    res.status(500).json({ message: 'Error al obtener métricas de equipos' });
  }
});

// ============================================
// GET EMPLOYEE METRICS (HU-08)
// ============================================
router.get('/employees', authenticateToken, authorizeRoles('team_leader', 'supervisor', 'admin'), async (req, res) => {
  try {
    const supabase = getDB();
    const { timeframe = '30', teamId, userId } = req.query;
    
    const daysAgo = parseInt(timeframe);
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysAgo);

    // Get employees based on role
    let employeesQuery = supabase
      .from('users')
      .select('*, team:teams(id, name)')
      .eq('is_active', true)
      .in('role', ['employee', 'team_leader']);
    
    if (req.user.role === 'team_leader') {
      employeesQuery = employeesQuery.eq('team_id', req.user.team_id);
    } else if (teamId) {
      employeesQuery = employeesQuery.eq('team_id', teamId);
    }
    
    if (userId) {
      employeesQuery = employeesQuery.eq('id', userId);
    }

    const { data: employees, error: employeesError } = await employeesQuery;

    if (employeesError) {
      logger.error('Error fetching employees:', employeesError);
      return res.status(500).json({ message: 'Error al obtener empleados' });
    }

    // Get metrics for each employee
    const employeeMetrics = await Promise.all(employees.map(async (employee) => {
      // Get work orders assigned to this employee
      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select('*')
        .eq('assigned_to', employee.id)
        .gte('created_at', dateThreshold.toISOString());

      if (woError) {
        logger.error('Error fetching work orders for employee:', woError);
        return null;
      }

      const orders = workOrders || [];
      const completed = orders.filter(wo => wo.status === 'completed');
      const pending = orders.filter(wo => wo.status === 'pending');
      const inProgress = orders.filter(wo => wo.status === 'in_progress');
      
      const now = new Date();
      const overdue = orders.filter(wo => 
        wo.due_date && 
        new Date(wo.due_date) < now && 
        !['completed', 'cancelled'].includes(wo.status)
      );

      // Calculate average completion time
      const completedWithTimes = completed.filter(wo => wo.completed_at && wo.started_at);
      let avgCompletionHours = 0;
      if (completedWithTimes.length > 0) {
        const totalHours = completedWithTimes.reduce((sum, wo) => {
          const start = new Date(wo.started_at);
          const end = new Date(wo.completed_at);
          return sum + (end - start) / (1000 * 60 * 60);
        }, 0);
        avgCompletionHours = totalHours / completedWithTimes.length;
      }

      // Calculate average estimated vs actual hours
      const ordersWithEstimates = orders.filter(wo => wo.estimated_hours);
      const avgEstimatedHours = ordersWithEstimates.length > 0
        ? ordersWithEstimates.reduce((sum, wo) => sum + (wo.estimated_hours || 0), 0) / ordersWithEstimates.length
        : 0;

      const ordersWithActual = orders.filter(wo => wo.actual_hours);
      const avgActualHours = ordersWithActual.length > 0
        ? ordersWithActual.reduce((sum, wo) => sum + (wo.actual_hours || 0), 0) / ordersWithActual.length
        : 0;

      return {
        id: employee.id,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        role: employee.role,
        team_name: employee.team?.name || 'Sin equipo',
        total_orders: orders.length,
        completed_orders: completed.length,
        pending_orders: pending.length,
        in_progress_orders: inProgress.length,
        overdue_orders: overdue.length,
        avg_completion_hours: parseFloat(avgCompletionHours.toFixed(2)),
        avg_estimated_hours: parseFloat(avgEstimatedHours.toFixed(2)),
        avg_actual_hours: parseFloat(avgActualHours.toFixed(2)),
      };
    }));

    res.json({ 
      employees: employeeMetrics.filter(e => e !== null).sort((a, b) => b.completed_orders - a.completed_orders)
    });

  } catch (error) {
    logger.error('Get employee metrics error:', error);
    res.status(500).json({ message: 'Error al obtener métricas de empleados' });
  }
});

// ============================================
// GET PROJECT METRICS
// ============================================
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const supabase = getDB();
    const { timeframe = '30' } = req.query;
    
    const daysAgo = parseInt(timeframe);
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysAgo);

    // Get active projects
    let projectsQuery = supabase
      .from('projects')
      .select('*')
      .eq('status', 'active');

    const { data: projects, error: projectsError } = await projectsQuery;

    if (projectsError) {
      logger.error('Error fetching projects:', projectsError);
      return res.status(500).json({ message: 'Error al obtener proyectos' });
    }

    // Get metrics for each project
    const projectMetrics = await Promise.all(projects.map(async (project) => {
      // Get work orders for this project
      let woQuery = supabase
        .from('work_orders')
        .select('*')
        .eq('project_id', project.id)
        .gte('created_at', dateThreshold.toISOString());

      // Role-based filtering
      if (req.user.role === 'team_leader') {
        woQuery = woQuery.eq('team_id', req.user.team_id);
      }

      const { data: workOrders, error: woError } = await woQuery;

      if (woError) {
        logger.error('Error fetching work orders for project:', woError);
        return null;
      }

      const orders = workOrders || [];
      const completed = orders.filter(wo => wo.status === 'completed');
      const pending = orders.filter(wo => wo.status === 'pending');
      const inProgress = orders.filter(wo => wo.status === 'in_progress');

      // Calculate average completion time
      const completedWithTimes = completed.filter(wo => wo.completed_at && wo.started_at);
      let avgCompletionHours = 0;
      if (completedWithTimes.length > 0) {
        const totalHours = completedWithTimes.reduce((sum, wo) => {
          const start = new Date(wo.started_at);
          const end = new Date(wo.completed_at);
          return sum + (end - start) / (1000 * 60 * 60);
        }, 0);
        avgCompletionHours = totalHours / completedWithTimes.length;
      }

      const totalEstimatedHours = orders.reduce((sum, wo) => sum + (wo.estimated_hours || 0), 0);
      const totalActualHours = orders.reduce((sum, wo) => sum + (wo.actual_hours || 0), 0);

      return {
        id: project.id,
        project_name: project.name,
        description: project.description,
        project_status: project.status,
        start_date: project.start_date,
        end_date: project.end_date,
        total_orders: orders.length,
        completed_orders: completed.length,
        pending_orders: pending.length,
        in_progress_orders: inProgress.length,
        avg_completion_hours: parseFloat(avgCompletionHours.toFixed(2)),
        total_estimated_hours: parseFloat(totalEstimatedHours.toFixed(2)),
        total_actual_hours: parseFloat(totalActualHours.toFixed(2)),
      };
    }));

    res.json({ 
      projects: projectMetrics.filter(p => p !== null).sort((a, b) => b.total_orders - a.total_orders)
    });

  } catch (error) {
    logger.error('Get project metrics error:', error);
    res.status(500).json({ message: 'Error al obtener métricas de proyectos' });
  }
});

module.exports = router;