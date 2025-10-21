const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getDB } = require('../config/database');
const { authenticateToken, authorizeWorkOrderAccess, authorizeRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ============================================
// GET WORK ORDERS - Con filtrado por rol (HU-05)
// ============================================
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  query('status').optional().custom(value => !value || ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'].includes(value)),
  query('priority').optional().custom(value => !value || ['low', 'medium', 'high', 'critical'].includes(value)),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Error en los parámetros',
        errors: errors.array() 
      });
    }

    const supabase = getDB();
    
    // Limpiar strings vacíos de los query params
    let {
      page = 1,
      limit = 20,
      status,
      priority,
      assignedTo,
      projectId,
      teamId,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;
    
    // Convertir strings vacíos a undefined
    status = status && status.trim() ? status : undefined;
    priority = priority && priority.trim() ? priority : undefined;
    search = search && search.trim() ? search : undefined;

    const offset = (page - 1) * limit;

    // Construir query según rol (HU-03 y HU-05)
    let query = supabase
      .from('work_orders')
      .select(`
        *,
        assigned_user:users!work_orders_assigned_to_fkey(id, first_name, last_name, email),
        creator:users!work_orders_created_by_fkey(id, first_name, last_name),
        team:teams(id, name),
        project:projects(id, name)
      `, { count: 'exact' });

    // HU-05: Filtrado por rol
    if (req.user.role === 'employee') {
      // Empleados solo ven sus propias órdenes
      query = query.eq('assigned_to', req.user.userId);
    } else if (req.user.role === 'team_leader') {
      // Jefes de equipo solo ven órdenes de su equipo
      query = query.eq('team_id', req.user.team_id);
    } else if (req.user.role === 'supervisor') {
      // Supervisores ven todas las órdenes de su planta
      if (req.user.plant_id) {
        query = query.eq('plant_id', req.user.plant_id);
      }
    }
    // Admin ve todo (sin filtro adicional)

    // Aplicar filtros adicionales
    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Ordenar y paginar
    query = query
      .order(sortBy, { ascending: sortOrder.toLowerCase() === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: workOrders, error, count } = await query;

    if (error) {
      logger.error('Error getting work orders:', error);
      return res.status(500).json({ message: 'Error al obtener órdenes de trabajo' });
    }

    res.json({
      workOrders: workOrders || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: page * limit < (count || 0),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get work orders error:', error);
    res.status(500).json({ message: 'Error al obtener órdenes de trabajo' });
  }
});

// ============================================
// CREATE WORK ORDER (HU-04)
// ============================================
router.post('/', authenticateToken, [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('El título es obligatorio')
    .isLength({ min: 3, max: 200 })
    .withMessage('El título debe tener entre 3 y 200 caracteres'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('La descripción es obligatoria')
    .isLength({ min: 10 })
    .withMessage('La descripción debe tener al menos 10 caracteres'),
  body('priority')
    .notEmpty()
    .withMessage('La prioridad es obligatoria')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Prioridad inválida'),
  body('assignedTo').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('ID de usuario inválido'),
  body('projectId').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('ID de proyecto inválido'),
  body('estimatedHours').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Las horas estimadas deben ser positivas'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Por favor completa todos los campos obligatorios',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const supabase = getDB();
    const {
      title,
      description,
      priority,
      assignedTo,
      projectId,
      estimatedHours,
      dueDate,
      location,
      equipmentId
    } = req.body;

    // Validar que el usuario asignado existe y está en el equipo correcto
    if (assignedTo && req.user.role === 'team_leader') {
      const { data: assignedUser, error: userError } = await supabase
        .from('users')
        .select('id, team_id')
        .eq('id', assignedTo)
        .single();

      if (userError || !assignedUser) {
        return res.status(400).json({ message: 'Usuario asignado no encontrado' });
      }

      if (assignedUser.team_id !== req.user.team_id) {
        return res.status(403).json({ message: 'Solo puedes asignar órdenes a tu equipo' });
      }
    }

    // Crear la orden de trabajo
    const { data: newWorkOrder, error: insertError } = await supabase
      .from('work_orders')
      .insert({
        title: title.trim(),
        description: description.trim(),
        priority,
        status: 'pending',
        assigned_to: assignedTo || req.user.userId, // Si no asigna a nadie, se asigna a sí mismo
        created_by: req.user.userId,
        team_id: req.user.team_id,
        plant_id: req.user.plant_id,
        project_id: projectId || null,
        estimated_hours: estimatedHours || null,
        due_date: dueDate || null,
        location: location || null,
        equipment_id: equipmentId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        assigned_user:users!work_orders_assigned_to_fkey(id, first_name, last_name, email),
        creator:users!work_orders_created_by_fkey(id, first_name, last_name),
        team:teams(id, name),
        project:projects(id, name)
      `)
      .single();

    if (insertError) {
      logger.error('Error creating work order:', insertError);
      return res.status(500).json({ message: 'Error al crear la orden de trabajo' });
    }

    // Log de auditoría
    await supabase
      .from('work_order_history')
      .insert({
        work_order_id: newWorkOrder.id,
        user_id: req.user.userId,
        action: 'created',
        changes: JSON.stringify({ status: 'pending' }),
        created_at: new Date().toISOString()
      });

    logger.info('Work order created:', {
      id: newWorkOrder.id,
      title: newWorkOrder.title,
      created_by: req.user.userId
    });

    res.status(201).json({
      message: 'Orden de trabajo creada exitosamente',
      workOrder: newWorkOrder
    });

  } catch (error) {
    logger.error('Create work order error:', error);
    res.status(500).json({ message: 'Error al crear la orden de trabajo' });
  }
});

// ============================================
// GET SINGLE WORK ORDER
// ============================================
router.get('/:id', authenticateToken, authorizeWorkOrderAccess, async (req, res) => {
  try {
    const supabase = getDB();
    const { id } = req.params;

    // Get base work order
    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !workOrder) {
      return res.status(404).json({ message: 'Orden de trabajo no encontrada' });
    }

    // Get related data separately to avoid relation errors
    const [assignedUserRes, creatorRes, teamRes, projectRes] = await Promise.all([
      workOrder.assigned_to ? supabase.from('users').select('id, first_name, last_name, email, role').eq('id', workOrder.assigned_to).single() : Promise.resolve({ data: null }),
      workOrder.created_by ? supabase.from('users').select('id, first_name, last_name, email').eq('id', workOrder.created_by).single() : Promise.resolve({ data: null }),
      workOrder.team_id ? supabase.from('teams').select('id, name').eq('id', workOrder.team_id).single() : Promise.resolve({ data: null }),
      workOrder.project_id ? supabase.from('projects').select('id, name, description').eq('id', workOrder.project_id).single() : Promise.resolve({ data: null })
    ]);

    // Attach related data
    workOrder.assigned_user = assignedUserRes.data;
    workOrder.creator = creatorRes.data;
    workOrder.team = teamRes.data;
    workOrder.project = projectRes.data;

    res.json({
      workOrder
    });

  } catch (error) {
    logger.error('Get work order error:', error);
    res.status(500).json({ message: 'Error al obtener la orden de trabajo' });
  }
});

// ============================================
// UPDATE WORK ORDER
// ============================================
router.put('/:id', authenticateToken, authorizeWorkOrderAccess, [
  body('title').optional().trim().isLength({ min: 3, max: 200 }),
  body('description').optional().trim().isLength({ min: 10 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Error de validación',
        errors: errors.array() 
      });
    }

    const supabase = getDB();
    const { id } = req.params;
    const updates = { ...req.body };

    // Remover campos que no se deben actualizar
    delete updates.id;
    delete updates.created_by;
    delete updates.created_at;

    // Agregar timestamp de actualización
    updates.updated_at = new Date().toISOString();

    // Si cambia el estado a completed, agregar fecha de completado
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    const { data: updatedWorkOrder, error } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        assigned_user:users!work_orders_assigned_to_fkey(id, first_name, last_name, email),
        creator:users!work_orders_created_by_fkey(id, first_name, last_name),
        team:teams(id, name),
        project:projects(id, name)
      `)
      .single();

    if (error) {
      logger.error('Error updating work order:', error);
      return res.status(500).json({ message: 'Error al actualizar la orden de trabajo' });
    }

    // Registrar cambio en historial
    await supabase
      .from('work_order_history')
      .insert({
        work_order_id: id,
        user_id: req.user.userId,
        action: 'updated',
        changes: JSON.stringify(updates),
        created_at: new Date().toISOString()
      });

    res.json({
      message: 'Orden de trabajo actualizada exitosamente',
      workOrder: updatedWorkOrder
    });

  } catch (error) {
    logger.error('Update work order error:', error);
    res.status(500).json({ message: 'Error al actualizar la orden de trabajo' });
  }
});

// ============================================
// DELETE WORK ORDER
// ============================================
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const supabase = getDB();
    const { id } = req.params;

    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting work order:', error);
      return res.status(500).json({ message: 'Error al eliminar la orden de trabajo' });
    }

    logger.info('Work order deleted:', {
      id,
      deleted_by: req.user.userId
    });

    res.json({
      message: 'Orden de trabajo eliminada exitosamente'
    });

  } catch (error) {
    logger.error('Delete work order error:', error);
    res.status(500).json({ message: 'Error al eliminar la orden de trabajo' });
  }
});

// ============================================
// GET WORK ORDER STATS
// ============================================
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const supabase = getDB();

    // Filtro según rol
    let baseQuery = supabase.from('work_orders').select('status, priority');

    if (req.user.role === 'employee') {
      baseQuery = baseQuery.eq('assigned_to', req.user.userId);
    } else if (req.user.role === 'team_leader') {
      baseQuery = baseQuery.eq('team_id', req.user.team_id);
    } else if (req.user.role === 'supervisor') {
      if (req.user.plant_id) {
        baseQuery = baseQuery.eq('plant_id', req.user.plant_id);
      }
    }

    const { data: workOrders, error } = await baseQuery;

    if (error) {
      logger.error('Error getting stats:', error);
      return res.status(500).json({ message: 'Error al obtener estadísticas' });
    }

    // Calcular estadísticas
    const stats = {
      total: workOrders.length,
      byStatus: {
        pending: workOrders.filter(wo => wo.status === 'pending').length,
        in_progress: workOrders.filter(wo => wo.status === 'in_progress').length,
        completed: workOrders.filter(wo => wo.status === 'completed').length,
        cancelled: workOrders.filter(wo => wo.status === 'cancelled').length,
        on_hold: workOrders.filter(wo => wo.status === 'on_hold').length,
      },
      byPriority: {
        low: workOrders.filter(wo => wo.priority === 'low').length,
        medium: workOrders.filter(wo => wo.priority === 'medium').length,
        high: workOrders.filter(wo => wo.priority === 'high').length,
        critical: workOrders.filter(wo => wo.priority === 'critical').length,
      }
    };

    res.json({ stats });

  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
