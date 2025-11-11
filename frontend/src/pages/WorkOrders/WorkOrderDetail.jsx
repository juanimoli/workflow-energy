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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Link,
} from '@mui/material'
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab'
import {
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import { workOrderService } from '../../services/workOrderService'
import toast from 'react-hot-toast'

const WorkOrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [workOrder, setWorkOrder] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (!user) return
    loadWorkOrder()
    loadHistory()
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

  const loadHistory = async () => {
    try {
      const response = await workOrderService.getWorkOrderHistory(id)
      setHistory(response.history || [])
    } catch (error) {
      console.error('Error loading history:', error)
      // Don't show error toast for history, it's not critical
    }
  }

  const handleStatusChange = async () => {
    if (!newStatus) {
      toast.error('Selecciona un estado')
      return
    }

    try {
      setUpdatingStatus(true)
      await workOrderService.updateWorkOrderStatus(id, newStatus, statusNotes)
      toast.success('Estado actualizado exitosamente')
      setStatusDialogOpen(false)
      setNewStatus('')
      setStatusNotes('')
      loadWorkOrder()
      loadHistory()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error(error.response?.data?.message || 'Error al actualizar el estado')
    } finally {
      setUpdatingStatus(false)
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

  const canChangeStatus = () => {
    if (!user || !workOrder) return false
    // HU-06: Only assigned user or supervisor can change status
    if (user.role === 'admin' || user.role === 'supervisor') return true
    if (workOrder.assigned_to === user.id) return true
    if (user.role === 'team_leader' && workOrder.team_id === user.teamId) return true
    return false
  }

  const getActionLabel = (action) => {
    const labels = {
      created: 'Orden creada',
      status_changed: 'Estado cambiado',
      updated: 'Actualizada',
      assignment_change: 'Asignación cambiada',
      priority_change: 'Prioridad cambiada',
    }
    return labels[action] || action
  }

  const getStatusIcon = (status) => {
    const icons = {
      pending: <PauseIcon />,
      in_progress: <PlayArrowIcon />,
      completed: <CheckCircleIcon />,
      cancelled: <CancelIcon />,
      on_hold: <PauseIcon />,
    }
    return icons[status] || <HistoryIcon />
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
        <Box display="flex" gap={2}>
          {canChangeStatus() && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                setNewStatus(workOrder.status)
                setStatusDialogOpen(true)
              }}
            >
              Cambiar Estado
            </Button>
          )}
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
      </Box>

      <Grid container spacing={3}>
        {/* Main Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
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

              {workOrder.location && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    📍 Ubicación
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {workOrder.location}
                  </Typography>
                  <Link
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(workOrder.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: 0.5,
                      fontSize: '0.875rem',
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' }
                    }}
                  >
                    🗺️ Ver en Google Maps
                  </Link>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* History Section (HU-07) */}
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                <HistoryIcon /> Historial de Cambios
              </Typography>
              <Button
                size="small"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? 'Ocultar' : 'Mostrar'}
              </Button>
            </Box>

            {showHistory && (
              history.length > 0 ? (
                <Timeline position="right">
                  {history.map((item, index) => (
                    <TimelineItem key={item.id}>
                      <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
                        <Typography variant="caption">
                          {new Date(item.timestamp).toLocaleString()}
                        </Typography>
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color={item.action === 'status_changed' ? 'primary' : 'grey'}>
                          {item.action === 'status_changed' && getStatusIcon(item.new_value)}
                        </TimelineDot>
                        {index < history.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent>
                        <Typography variant="subtitle2">
                          {getActionLabel(item.action)}
                        </Typography>
                        {item.user && (
                          <Typography variant="caption" color="text.secondary">
                            Por: {item.user.first_name} {item.user.last_name}
                          </Typography>
                        )}
                        {item.field_name && (
                          <Typography variant="body2">
                            {item.field_name === 'status' && (
                              <>
                                <Chip size="small" label={getStatusLabel(item.old_value)} sx={{ mr: 1 }} />
                                →
                                <Chip size="small" label={getStatusLabel(item.new_value)} sx={{ ml: 1 }} />
                              </>
                            )}
                            {item.field_name !== 'status' && (
                              `${item.old_value || 'N/A'} → ${item.new_value || 'N/A'}`
                            )}
                          </Typography>
                        )}
                        {item.change_reason && (
                          <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                            Nota: {item.change_reason}
                          </Typography>
                        )}
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              ) : (
                <Typography color="text.secondary">
                  No hay historial de cambios disponible
                </Typography>
              )
            )}
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
                  secondary={workOrder.assigned_to_name 
                    || (workOrder.assigned_user 
                          ? ([workOrder.assigned_user.first_name, workOrder.assigned_user.last_name]
                              .filter(Boolean)
                              .join(' ') || workOrder.assigned_user.email)
                          : 'Sin asignar')}
                />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemText
                  primary="Creado por"
                  secondary={workOrder.created_by_name
                    || (workOrder.creator
                          ? ([workOrder.creator.first_name, workOrder.creator.last_name]
                              .filter(Boolean)
                              .join(' ') || workOrder.creator.email)
                          : 'Desconocido')}
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

      {/* Status Change Dialog (HU-06) */}
      <Dialog 
        open={statusDialogOpen} 
        onClose={() => !updatingStatus && setStatusDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cambiar Estado de la Orden</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Nuevo Estado</InputLabel>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                label="Nuevo Estado"
                disabled={updatingStatus}
              >
                <MenuItem value="pending">Pendiente</MenuItem>
                <MenuItem value="in_progress">En Progreso</MenuItem>
                <MenuItem value="completed">Completada</MenuItem>
                <MenuItem value="on_hold">En Espera</MenuItem>
                <MenuItem value="cancelled">Cancelada</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Notas (opcional)"
              multiline
              rows={3}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              disabled={updatingStatus}
              placeholder="Agrega información adicional sobre este cambio de estado..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setStatusDialogOpen(false)}
            disabled={updatingStatus}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleStatusChange}
            variant="contained"
            disabled={updatingStatus || !newStatus || newStatus === workOrder?.status}
          >
            {updatingStatus ? <CircularProgress size={24} /> : 'Actualizar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default WorkOrderDetail