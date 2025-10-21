import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  CardContent,
  Card,
} from '@mui/material'
import {
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import { workOrderService } from '../../services/workOrderService'
import toast from 'react-hot-toast'

const WorkOrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [workOrder, setWorkOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    loadWorkOrder()
  }, [user, id])

  const loadWorkOrder = async () => {
    try {
      setLoading(true)
      const response = await workOrderService.getWorkOrder(id)
      setWorkOrder(response.workOrder)
    } catch (error) {
      console.error('Error loading work order:', error)
      setError('Error al cargar la orden de trabajo')
      toast.error('Error al cargar la orden de trabajo')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      cancelled: 'error',
      on_hold: 'default',
    }
    return colors[status] || 'default'
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Completada',
      cancelled: 'Cancelada',
      on_hold: 'En Espera',
    }
    return labels[status] || status
  }

  const getPriorityLabel = (priority) => {
    const labels = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      critical: 'Crítica',
    }
    return labels[priority] || priority
  }

  const canEdit = () => {
    if (!user || !workOrder) return false
    if (user.role === 'admin' || user.role === 'supervisor') return true
    if (user.role === 'team_leader' && workOrder.team_id === user.teamId) return true
    if (user.role === 'employee' && workOrder.assigned_to === user.id) return true
    return false
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error || !workOrder) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Orden de trabajo no encontrada'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/work-orders')}
        >
          Volver a Órdenes
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/work-orders')}
          >
            Volver
          </Button>
          <Typography variant="h4">
            Orden de Trabajo #{workOrder.id}
          </Typography>
        </Box>
        {canEdit() && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/work-orders/${workOrder.id}/edit`)}
          >
            Editar
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Main Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Información General
            </Typography>
            
            <Box mb={3}>
              <Typography variant="h5" gutterBottom>
                {workOrder.title}
              </Typography>
              <Box display="flex" gap={1} mb={2}>
                <Chip
                  label={getStatusLabel(workOrder.status)}
                  color={getStatusColor(workOrder.status)}
                />
                <Chip
                  label={getPriorityLabel(workOrder.priority)}
                  variant="outlined"
                />
              </Box>
            </Box>

            {workOrder.description && (
              <Box mb={3}>
                <Typography variant="subtitle1" gutterBottom>
                  Descripción
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {workOrder.description}
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Fecha de Creación
                </Typography>
                <Typography variant="body1">
                  {new Date(workOrder.created_at).toLocaleString()}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Última Actualización
                </Typography>
                <Typography variant="body1">
                  {new Date(workOrder.updated_at).toLocaleString()}
                </Typography>
              </Grid>

              {workOrder.due_date && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Fecha Límite
                  </Typography>
                  <Typography variant="body1">
                    {new Date(workOrder.due_date).toLocaleString()}
                  </Typography>
                </Grid>
              )}

              {workOrder.estimated_hours && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Horas Estimadas
                  </Typography>
                  <Typography variant="body1">
                    {workOrder.estimated_hours} horas
                  </Typography>
                </Grid>
              )}

              {workOrder.location && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Ubicación
                  </Typography>
                  <Typography variant="body1">
                    {workOrder.location}
                  </Typography>
                </Grid>
              )}

              {workOrder.equipment_id && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    ID de Equipo
                  </Typography>
                  <Typography variant="body1">
                    {workOrder.equipment_id}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Side Information */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Asignación
            </Typography>
            
            <List dense>
              <ListItem sx={{ px: 0 }}>
                <ListItemText
                  primary="Asignado a"
                  secondary={workOrder.assigned_to_name || 'Sin asignar'}
                />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemText
                  primary="Creado por"
                  secondary={workOrder.created_by_name}
                />
              </ListItem>
              {workOrder.team_name && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Equipo"
                    secondary={workOrder.team_name}
                  />
                </ListItem>
              )}
              {workOrder.project_name && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Proyecto"
                    secondary={workOrder.project_name}
                  />
                </ListItem>
              )}
            </List>
          </Paper>

          {/* Timeline */}
          {(workOrder.started_at || workOrder.completed_at) && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Cronología
              </Typography>
              
              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Creada"
                    secondary={new Date(workOrder.created_at).toLocaleString()}
                  />
                </ListItem>
                {workOrder.started_at && (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="Iniciada"
                      secondary={new Date(workOrder.started_at).toLocaleString()}
                    />
                  </ListItem>
                )}
                {workOrder.completed_at && (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="Completada"
                      secondary={new Date(workOrder.completed_at).toLocaleString()}
                    />
                  </ListItem>
                )}
              </List>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}

export default WorkOrderDetail