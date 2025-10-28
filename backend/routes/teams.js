const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ============================================
// GET ALL TEAMS
// ============================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const supabase = getDB();
    
    // Build query based on role
    let query = supabase
      .from('teams')
      .select(`
        *,
        leader:users!leader_id(id, first_name, last_name, email),
        plant:plants!plant_id(id, name)
      `)
      .eq('is_active', true);

    // Team leaders only see their team
    if (req.user.role === 'team_leader') {
      query = query.eq('id', req.user.team_id);
    }
    
    // Supervisors see teams in their plant
    if (req.user.role === 'supervisor' && req.user.plant_id) {
      query = query.eq('plant_id', req.user.plant_id);
    }

    const { data: teams, error } = await query.order('name');

    if (error) {
      logger.error('Error fetching teams:', error);
      return res.status(500).json({ message: 'Error al obtener equipos' });
    }

    // Get member count for each team
    const teamsWithMembers = await Promise.all(teams.map(async (team) => {
      const { count, error: countError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('is_active', true);

      return {
        ...team,
        member_count: count || 0
      };
    }));

    res.json({ teams: teamsWithMembers });

  } catch (error) {
    logger.error('Get teams error:', error);
    res.status(500).json({ message: 'Error al obtener equipos' });
  }
});

// ============================================
// GET SINGLE TEAM
// ============================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const supabase = getDB();
    const { id } = req.params;

    // Get team
    const { data: team, error } = await supabase
      .from('teams')
      .select(`
        *,
        leader:users!leader_id(id, first_name, last_name, email, role),
        plant:plants!plant_id(id, name, location)
      `)
      .eq('id', id)
      .single();

    if (error || !team) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }

    // Check permissions
    if (req.user.role === 'team_leader' && team.id !== req.user.team_id) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    if (req.user.role === 'supervisor' && team.plant_id !== req.user.plant_id) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Get team members
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, last_login, is_active')
      .eq('team_id', id)
      .order('role')
      .order('first_name');

    if (membersError) {
      logger.error('Error fetching team members:', membersError);
    }

    res.json({
      team,
      members: members || []
    });

  } catch (error) {
    logger.error('Get team error:', error);
    res.status(500).json({ message: 'Error al obtener equipo' });
  }
});

// ============================================
// CREATE TEAM (Admin/Supervisor)
// ============================================
router.post('/', authenticateToken, authorizeRoles('admin', 'supervisor'), [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('description')
    .optional()
    .trim(),
  body('leader_id')
    .optional({ nullable: true })
    .isInt()
    .withMessage('ID de líder inválido'),
  body('plant_id')
    .optional({ nullable: true })
    .isInt()
    .withMessage('ID de planta inválido'),
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
    const { name, description, leader_id: leaderId, plant_id: plantId } = req.body;

    // If supervisor, must be in their plant
    if (req.user.role === 'supervisor') {
      if (plantId && plantId !== req.user.plant_id) {
        return res.status(403).json({ 
          message: 'Solo puedes crear equipos en tu planta' 
        });
      }
    }

    // Validate leader exists and is eligible
    if (leaderId) {
      const { data: leader, error: leaderError } = await supabase
        .from('users')
        .select('id, role, team_id')
        .eq('id', leaderId)
        .single();

      if (leaderError || !leader) {
        return res.status(400).json({ message: 'Líder no encontrado' });
      }

      // Leader should be team_leader role or can be promoted
      if (!['team_leader', 'employee'].includes(leader.role)) {
        return res.status(400).json({ 
          message: 'El líder debe ser empleado o team leader' 
        });
      }
    }

    // Create team
    const { data: newTeam, error: insertError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        leader_id: leaderId || null,
        plant_id: plantId || req.user.plant_id || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        leader:users!leader_id(id, first_name, last_name, email),
        plant:plants!plant_id(id, name)
      `)
      .single();

    if (insertError) {
      logger.error('Error creating team:', insertError);
      return res.status(500).json({ message: 'Error al crear equipo' });
    }

    // If leader assigned, update user role and team_id
    if (leaderId) {
      await supabase
        .from('users')
        .update({
          role: 'team_leader',
          team_id: newTeam.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', leaderId);
    }

    logger.info('Team created:', {
      id: newTeam.id,
      name: newTeam.name,
      created_by: req.user.userId
    });

    res.status(201).json({
      message: 'Equipo creado exitosamente',
      team: newTeam
    });

  } catch (error) {
    logger.error('Create team error:', error);
    res.status(500).json({ message: 'Error al crear equipo' });
  }
});

// ============================================
// UPDATE TEAM
// ============================================
router.put('/:id', authenticateToken, authorizeRoles('admin', 'supervisor'), [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }),
  body('description')
    .optional()
    .trim(),
  body('leader_id')
    .optional({ nullable: true })
    .isInt(),
  body('plant_id')
    .optional({ nullable: true })
    .isInt(),
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
    const { name, description, leader_id: leaderId, plant_id: plantId } = req.body;

    // Get current team
    const { data: currentTeam, error: fetchError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentTeam) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }

    // Check permissions
    if (req.user.role === 'supervisor' && currentTeam.plant_id !== req.user.plant_id) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Prepare updates
    const updates = {
      updated_at: new Date().toISOString()
    };

    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (leaderId !== undefined) updates.leader_id = leaderId;
    if (plantId !== undefined) {
      // Supervisors can only update plant_id to their own plant
      if (req.user.role === 'supervisor' && plantId !== req.user.plant_id) {
        return res.status(403).json({ message: 'No puedes cambiar la planta a una diferente de la tuya' });
      }
      updates.plant_id = plantId;
    }

    // Update team
    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        leader:users!leader_id(id, first_name, last_name, email),
        plant:plants!plant_id(id, name)
      `)
      .single();

    if (updateError) {
      logger.error('Error updating team:', updateError);
      return res.status(500).json({ message: 'Error al actualizar equipo' });
    }

    // If leader changed, update user roles
    if (leaderId !== undefined && leaderId !== currentTeam.leader_id) {
      // Remove old leader's team_leader role if they have no other teams
      if (currentTeam.leader_id) {
        const { data: otherTeams } = await supabase
          .from('teams')
          .select('id')
          .eq('leader_id', currentTeam.leader_id)
          .neq('id', id);

        if (!otherTeams || otherTeams.length === 0) {
          await supabase
            .from('users')
            .update({
              role: 'employee',
              updated_at: new Date().toISOString()
            })
            .eq('id', currentTeam.leader_id);
        }
      }

      // Assign new leader
      if (leaderId) {
        await supabase
          .from('users')
          .update({
            role: 'team_leader',
            team_id: id,
            updated_at: new Date().toISOString()
          })
          .eq('id', leaderId);
      }
    }

    logger.info('Team updated:', {
      id: updatedTeam.id,
      name: updatedTeam.name,
      updated_by: req.user.userId
    });

    res.json({
      message: 'Equipo actualizado exitosamente',
      team: updatedTeam
    });

  } catch (error) {
    logger.error('Update team error:', error);
    res.status(500).json({ message: 'Error al actualizar equipo' });
  }
});

// ============================================
// ADD MEMBER TO TEAM
// ============================================
router.post('/:id/members', authenticateToken, authorizeRoles('admin', 'supervisor', 'team_leader'), [
  body('userId')
    .notEmpty()
    .isInt()
    .withMessage('ID de usuario requerido'),
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
    const { userId } = req.body;

    // Get team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (teamError || !team) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }

    // Check permissions
    if (req.user.role === 'team_leader' && team.id !== req.user.team_id) {
      return res.status(403).json({ 
        message: 'Solo puedes agregar miembros a tu equipo' 
      });
    }

    if (req.user.role === 'supervisor' && team.plant_id !== req.user.plant_id) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Update user's team
    const { error: updateError } = await supabase
      .from('users')
      .update({
        team_id: id,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      logger.error('Error adding member to team:', updateError);
      return res.status(500).json({ message: 'Error al agregar miembro' });
    }

    logger.info('Member added to team:', {
      team_id: id,
      user_id: userId,
      added_by: req.user.userId
    });

    res.json({
      message: 'Miembro agregado al equipo exitosamente'
    });

  } catch (error) {
    logger.error('Add member to team error:', error);
    res.status(500).json({ message: 'Error al agregar miembro al equipo' });
  }
});

// ============================================
// REMOVE MEMBER FROM TEAM
// ============================================
router.delete('/:id/members/:userId', authenticateToken, authorizeRoles('admin', 'supervisor', 'team_leader'), async (req, res) => {
  try {
    const supabase = getDB();
    const { id, userId } = req.params;

    // Get team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (teamError || !team) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }

    // Check permissions
    if (req.user.role === 'team_leader' && team.id !== req.user.team_id) {
      return res.status(403).json({ 
        message: 'Solo puedes remover miembros de tu equipo' 
      });
    }

    if (req.user.role === 'supervisor' && team.plant_id !== req.user.plant_id) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Cannot remove team leader
    if (parseInt(userId) === team.leader_id) {
      return res.status(400).json({ 
        message: 'No puedes remover al líder del equipo. Primero asigna otro líder.' 
      });
    }

    // Remove user from team
    const { error: updateError } = await supabase
      .from('users')
      .update({
        team_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .eq('team_id', id);

    if (updateError) {
      logger.error('Error removing member from team:', updateError);
      return res.status(500).json({ message: 'Error al remover miembro' });
    }

    logger.info('Member removed from team:', {
      team_id: id,
      user_id: userId,
      removed_by: req.user.userId
    });

    res.json({
      message: 'Miembro removido del equipo exitosamente'
    });

  } catch (error) {
    logger.error('Remove member from team error:', error);
    res.status(500).json({ message: 'Error al remover miembro del equipo' });
  }
});

// ============================================
// DELETE TEAM (Admin only)
// ============================================
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const supabase = getDB();
    const { id } = req.params;

    // Check if team has members
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id')
      .eq('team_id', id);

    if (members && members.length > 0) {
      return res.status(400).json({ 
        message: 'No puedes eliminar un equipo con miembros. Primero remueve todos los miembros.' 
      });
    }

    // Soft delete (set is_active to false)
    const { error } = await supabase
      .from('teams')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      logger.error('Error deleting team:', error);
      return res.status(500).json({ message: 'Error al eliminar equipo' });
    }

    logger.info('Team deleted:', {
      id,
      deleted_by: req.user.userId
    });

    res.json({
      message: 'Equipo eliminado exitosamente'
    });

  } catch (error) {
    logger.error('Delete team error:', error);
    res.status(500).json({ message: 'Error al eliminar equipo' });
  }
});

module.exports = router;

