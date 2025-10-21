const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ============================================
// GET USERS - Con filtrado por rol
// ============================================
router.get('/', authenticateToken, authorizeRoles('team_leader', 'supervisor', 'admin'), async (req, res) => {
  try {
    const supabase = getDB();
    const { page = 1, limit = 20, role, teamId, search } = req.query;
    const offset = (page - 1) * limit;

    // Construir query según rol
    let query = supabase
      .from('users')
      .select(`
        id,
        username,
        email,
        first_name,
        last_name,
        role,
        team_id,
        plant_id,
        is_active,
        created_at,
        last_login,
        team:teams!users_team_id_fkey(id, name),
        plant:plants(id, name)
      `, { count: 'exact' })
      .eq('is_active', true);

    // Filtrado por rol del usuario autenticado
    if (req.user.role === 'team_leader') {
      query = query.eq('team_id', req.user.team_id);
    } else if (req.user.role === 'supervisor') {
      if (req.user.plant_id) {
        query = query.eq('plant_id', req.user.plant_id);
      }
    }

    // Aplicar filtros adicionales
    if (role) {
      query = query.eq('role', role);
    }

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Ordenar y paginar
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      logger.error('Error getting users:', error);
      return res.status(500).json({ message: 'Error al obtener usuarios' });
    }

    res.json({
      users: users || [],
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
    logger.error('Get users error:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

// ============================================
// GET SINGLE USER
// ============================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const supabase = getDB();
    const { id } = req.params;

    // Verificar permisos
    if (req.user.role === 'employee' && req.user.userId !== id) {
      return res.status(403).json({ message: 'No tienes permiso para ver este usuario' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        email,
        first_name,
        last_name,
        role,
        team_id,
        plant_id,
        is_active,
        created_at,
        last_login,
        team:teams!users_team_id_fkey(id, name),
        plant:plants(id, name)
      `)
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Team leaders solo pueden ver usuarios de su equipo
    if (req.user.role === 'team_leader' && user.team_id !== req.user.team_id) {
      return res.status(403).json({ message: 'No tienes permiso para ver este usuario' });
    }

    res.json({ user });

  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ message: 'Error al obtener usuario' });
  }
});

// ============================================
// UPDATE USER
// ============================================
router.put('/:id', authenticateToken, authorizeRoles('supervisor', 'admin'), [
  body('firstName').optional().trim().isLength({ min: 2 }),
  body('lastName').optional().trim().isLength({ min: 2 }),
  body('role').optional().isIn(['employee', 'team_leader', 'supervisor', 'admin']),
  body('teamId').optional().isUUID(),
  body('plantId').optional().isUUID(),
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
    const updates = {};

    // Solo actualizar campos permitidos
    if (req.body.firstName) updates.first_name = req.body.firstName;
    if (req.body.lastName) updates.last_name = req.body.lastName;
    if (req.body.role && req.user.role === 'admin') updates.role = req.body.role; // Solo admin puede cambiar roles
    if (req.body.teamId) updates.team_id = req.body.teamId;
    if (req.body.plantId) updates.plant_id = req.body.plantId;
    
    updates.updated_at = new Date().toISOString();

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        username,
        email,
        first_name,
        last_name,
        role,
        team_id,
        plant_id,
        team:teams!users_team_id_fkey(id, name),
        plant:plants(id, name)
      `)
      .single();

    if (error) {
      logger.error('Error updating user:', error);
      return res.status(500).json({ message: 'Error al actualizar usuario' });
    }

    res.json({
      message: 'Usuario actualizado exitosamente',
      user: updatedUser
    });

  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
});

// ============================================
// DELETE USER (soft delete)
// ============================================
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const supabase = getDB();
    const { id } = req.params;

    // No permitir eliminar a sí mismo
    if (req.user.userId === id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }

    const { error } = await supabase
      .from('users')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      logger.error('Error deleting user:', error);
      return res.status(500).json({ message: 'Error al eliminar usuario' });
    }

    logger.info('User deactivated:', {
      id,
      deactivated_by: req.user.userId
    });

    res.json({
      message: 'Usuario desactivado exitosamente'
    });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
});

module.exports = router;
