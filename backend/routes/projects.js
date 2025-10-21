const express = require('express');
const { query, validationResult } = require('express-validator');
const { getDB } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ============================================
// GET PROJECTS
// ============================================
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
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
    let { page = 1, limit = 20, status, search } = req.query;
    
    // Limpiar strings vacíos
    status = status && status.trim() ? status : undefined;
    search = search && search.trim() ? search : undefined;
    
    const offset = (page - 1) * limit;

    // Construir query
    let query = supabase
      .from('projects')
      .select(`
        *,
        plant:plants(id, name),
        creator:users!projects_created_by_fkey(id, first_name, last_name)
      `, { count: 'exact' });

    // Filtrar por planta si el usuario tiene restricción
    if (req.user.plant_id) {
      query = query.eq('plant_id', req.user.plant_id);
    }

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Ordenar y paginar
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: projects, error, count } = await query;

    if (error) {
      logger.error('Error getting projects:', error);
      return res.status(500).json({ message: 'Error al obtener proyectos' });
    }

    res.json({
      projects: projects || [],
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
    logger.error('Get projects error:', error);
    res.status(500).json({ message: 'Error al obtener proyectos' });
  }
});

// ============================================
// GET SINGLE PROJECT
// ============================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const supabase = getDB();
    const { id } = req.params;

    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        plant:plants(id, name),
        creator:users!projects_created_by_fkey(id, first_name, last_name)
      `)
      .eq('id', id)
      .single();

    if (error || !project) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    res.json({ project });

  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({ message: 'Error al obtener proyecto' });
  }
});

module.exports = router;
