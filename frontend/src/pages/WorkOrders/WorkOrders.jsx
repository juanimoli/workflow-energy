import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import { workOrderService } from '../../services/workOrderService'
import toast from 'react-hot-toast'

const WorkOrders = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
  })
  
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
  })
  
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null)

  useEffect(() => {
    if (!user) return
    loadWorkOrders()
    loadStats()
  }, [user, pagination.page, pagination.limit, filters])

  const loadWorkOrders = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page + 1,
        limit: pagination.limit,
        ...filters,
      }
      
      const response = await workOrderService.getWorkOrders(params)
      setWorkOrders(response.workOrders)
      setPagination(prev => ({
        ...prev,
        totalItems: response.pagination.totalItems,
        totalPages: response.pagination.totalPages,
      }))
    } catch (error) {
      console.error('Error loading work orders:', error)
      toast.error('Error cargando órdenes de trabajo')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await workOrderService.getWorkOrderStats()
      setStats(response.stats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleFilterChange = (field) => (event) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value
    }))
    setPagination(prev => ({ ...prev, page: 0 }))
  }

  const handleSearchChange = (event) => {
    const value = event.target.value
    setFilters(prev => ({
      ...prev,
      search: value
    }))
    setPagination(prev => ({ ...prev, page: 0 }))
  }

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleRowsPerPageChange = (event) => {
    setPagination(prev => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 0
    }))
  }

  const handleMenuClick = (event, workOrder) => {
    setAnchorEl(event.currentTarget)
    setSelectedWorkOrder(workOrder)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedWorkOrder(null)
  }

  const handleView = () => {
    navigate(`/work-orders/${selectedWorkOrder.id}`)
    handleMenuClose()
  }

  const handleEdit = () => {
    navigate(`/work-orders/${selectedWorkOrder.id}/edit`)
    handleMenuClose()
  }

  const handleStatusChange = async (status) => {
    try {
      await workOrderService.updateStatus(selectedWorkOrder.id, status)
      toast.success('Estado actualizado exitosamente')
      loadWorkOrders()
      loadStats()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Error al actualizar el estado')
    }
    handleMenuClose()
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

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'success',
      medium: 'warning',
      high: 'error',
      critical: 'error',
    }
    return colors[priority] || 'default'
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

  const canEdit = (workOrder) => {
    if (!user || !workOrder) return false
    if (user.role === 'admin' || user.role === 'supervisor') return true
    if (user.role === 'team_leader' && workOrder.team_id === user.teamId) return true
    if (user.role === 'employee' && workOrder.assigned_to === user.id) return true
    return false
  }

  const getUserRoleTitle = () => {
    if (!user) return 'Órdenes de Trabajo'
    const titles = {
      employee: 'Mis Órdenes de Trabajo',
      team_leader: 'Órdenes del Equipo',
      supervisor: 'Todas las Órdenes',
      admin: 'Gestión de Órdenes',
    }
    return titles[user.role] || 'Órdenes de Trabajo'
  }

  if (loading && workOrders.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          {getUserRoleTitle()}
        </Typography>
        {user && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/work-orders/create')}
          >
            Nueva Orden
          </Button>
        )}
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total
                </Typography>
                <Typography variant="h4">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pendientes
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats.pending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  En Progreso
                </Typography>
                <Typography variant="h4" color="info.main">
                  {stats.in_progress}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completadas
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.completed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              placeholder="Buscar órdenes..."
              value={filters.search}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filters.status}
                onChange={handleFilterChange('status')}
                label="Estado"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="pending">Pendiente</MenuItem>
                <MenuItem value="in_progress">En Progreso</MenuItem>
                <MenuItem value="completed">Completada</MenuItem>
                <MenuItem value="cancelled">Cancelada</MenuItem>
                <MenuItem value="on_hold">En Espera</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Prioridad</InputLabel>
              <Select
                value={filters.priority}
                onChange={handleFilterChange('priority')}
                label="Prioridad"
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="low">Baja</MenuItem>
                <MenuItem value="medium">Media</MenuItem>
                <MenuItem value="high">Alta</MenuItem>
                <MenuItem value="critical">Crítica</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Work Orders Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Título</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Prioridad</TableCell>
                {user.role !== 'employee' && <TableCell>Asignado a</TableCell>}
                <TableCell>Fecha Creación</TableCell>
                <TableCell>Fecha Límite</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workOrders.map((workOrder) => (
                <TableRow key={workOrder.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {workOrder.title}
                    </Typography>
                    {workOrder.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                        {workOrder.description.substring(0, 60)}
                        {workOrder.description.length > 60 && '...'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(workOrder.status)}
                      color={getStatusColor(workOrder.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getPriorityLabel(workOrder.priority)}
                      color={getPriorityColor(workOrder.priority)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  {user.role !== 'employee' && (
                    <TableCell>
                      {workOrder.assigned_to_name || 'Sin asignar'}
                    </TableCell>
                  )}
                  <TableCell>
                    {new Date(workOrder.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {workOrder.due_date
                      ? new Date(workOrder.due_date).toLocaleDateString()
                      : 'Sin fecha límite'
                    }
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={(event) => handleMenuClick(event, workOrder)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={pagination.totalItems}
          rowsPerPage={pagination.limit}
          page={pagination.page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <ViewIcon sx={{ mr: 1 }} />
          Ver Detalles
        </MenuItem>
        {canEdit(selectedWorkOrder) && (
          <MenuItem onClick={handleEdit}>
            <EditIcon sx={{ mr: 1 }} />
            Editar
          </MenuItem>
        )}
        {canEdit(selectedWorkOrder) && selectedWorkOrder?.status === 'pending' && (
          <MenuItem onClick={() => handleStatusChange('in_progress')}>
            Iniciar Trabajo
          </MenuItem>
        )}
        {canEdit(selectedWorkOrder) && selectedWorkOrder?.status === 'in_progress' && (
          <MenuItem onClick={() => handleStatusChange('completed')}>
            Marcar Completada
          </MenuItem>
        )}
      </Menu>

      {workOrders.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            No se encontraron órdenes de trabajo
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {user.role === 'employee' 
              ? 'No tienes órdenes asignadas'
              : 'Crea una nueva orden para comenzar'
            }
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default WorkOrders