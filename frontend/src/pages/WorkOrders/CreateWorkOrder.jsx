import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Autocomplete,
  Link,
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useAuth } from '../../context/AuthContext'
import { workOrderService } from '../../services/workOrderService'
import { userService } from '../../services/userService'
import { projectService } from '../../services/projectService'
import { getCurrentLocationWithAddress } from '../../utils/locationUtils'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const CreateWorkOrder = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [gettingLocation, setGettingLocation] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    projectId: '',
    estimatedHours: '',
    dueDate: null,
    location: '',
    equipmentId: '',
  })
  
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const loadData = async () => {
      if (!user) return
      
      try {
        setLoadingData(true)
        
        // Load users for assignment (only team members for team leaders)
        if (user.role === 'team_leader' || user.role === 'supervisor' || user.role === 'admin') {
          const usersResponse = await userService.getUsers()
          setUsers(usersResponse.users || [])
        }
        
        // Load projects
        const projectsResponse = await projectService.getProjects()
        setProjects(projectsResponse.projects || [])
        
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Error cargando datos del formulario')
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [user, user?.role])

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      dueDate: date
    }))
  }

  const handleUserChange = (event, newValue) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: newValue ? newValue.id : ''
    }))
  }

  const handleGetCurrentLocation = async () => {
    setGettingLocation(true)
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001'
      const result = await getCurrentLocationWithAddress(apiUrl)
      
      setFormData(prev => ({
        ...prev,
        location: result.location
      }))
      
      if (result.type === 'address') {
        toast.success('📍 Dirección obtenida correctamente')
      } else {
        toast.success('📍 Ubicación obtenida (coordenadas)')
      }
      
    } catch (error) {
      console.error('Error getting location:', error)
      toast.error(error.message)
    } finally {
      setGettingLocation(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio'
    }
    
    if (formData.estimatedHours && (isNaN(formData.estimatedHours) || formData.estimatedHours < 0)) {
      newErrors.estimatedHours = 'Las horas estimadas deben ser un número positivo'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario')
      return
    }

    try {
      setLoading(true)
      
      const workOrderData = {
        title: formData.title.trim(),
        description: formData.description.trim() || '',
        priority: formData.priority,
        assignedTo: formData.assignedTo || null,
        projectId: formData.projectId || null,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        dueDate: formData.dueDate ? formData.dueDate.toISOString() : null,
        location: formData.location.trim() || null,
        equipmentId: formData.equipmentId.trim() || null,
      }

      await workOrderService.createWorkOrder(workOrderData)
      
      toast.success('Orden de trabajo creada exitosamente')
      navigate('/work-orders')
      
    } catch (error) {
      console.error('Error creating work order:', error)
      let errorMessage = 'Error al crear la orden de trabajo'

      if (error.response?.status === 401) {
        errorMessage = 'Sesión expirada. Por favor inicia sesión nuevamente.'
      } else if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para crear órdenes de trabajo.'
      } else if (error.response?.status === 400) {
        // Map server-side validation errors to fields and a friendly toast
        const apiMessage = error.response?.data?.message
        const apiErrors = error.response?.data?.errors
        if (Array.isArray(apiErrors) && apiErrors.length > 0) {
          const fieldErrors = {}
          apiErrors.forEach(e => {
            if (e.field) fieldErrors[e.field] = e.message
          })
          setErrors(prev => ({ ...prev, ...fieldErrors }))
          errorMessage = apiMessage || 'Por favor completa todos los campos obligatorios'
        } else {
          errorMessage = apiMessage || 'Datos inválidos. Verifica la información ingresada.'
        }
      } else if (error.response?.status >= 500) {
        errorMessage = 'Error del servidor al crear la orden.'
      } else if (error.message?.includes('Network Error')) {
        errorMessage = 'Error de conexión al crear la orden.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/work-orders')
  }

  if (loadingData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Crear Orden de Trabajo
        </Typography>
        
        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Título */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Título *"
                  value={formData.title}
                  onChange={handleChange('title')}
                  error={!!errors.title}
                  helperText={errors.title}
                  disabled={loading}
                />
              </Grid>

              {/* Descripción */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción"
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={handleChange('description')}
                  disabled={loading}
                />
              </Grid>

              {/* Prioridad */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Prioridad</InputLabel>
                  <Select
                    value={formData.priority}
                    onChange={handleChange('priority')}
                    label="Prioridad"
                    disabled={loading}
                  >
                    <MenuItem value="low">Baja</MenuItem>
                    <MenuItem value="medium">Media</MenuItem>
                    <MenuItem value="high">Alta</MenuItem>
                    <MenuItem value="critical">Crítica</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Asignado a (solo para líderes y superiores) */}
              {user && (user.role === 'team_leader' || user.role === 'supervisor' || user.role === 'admin') && (
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={users}
                    getOptionLabel={(option) => {
                      if (!option) return ''
                      const first = option.firstName ?? option.first_name ?? ''
                      const last = option.lastName ?? option.last_name ?? ''
                      const name = `${first} ${last}`.trim()
                      if (name && option.email) return `${name} (${option.email})`
                      if (name) return name
                      return option.email || option.username || 'Usuario'
                    }}
                    isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
                    onChange={handleUserChange}
                    disabled={loading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Asignar a"
                        placeholder="Seleccionar usuario"
                      />
                    )}
                  />
                </Grid>
              )}

              {/* Proyecto */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Proyecto</InputLabel>
                  <Select
                    value={formData.projectId}
                    onChange={handleChange('projectId')}
                    label="Proyecto"
                    disabled={loading}
                  >
                    <MenuItem value="">
                      <em>Sin proyecto</em>
                    </MenuItem>
                    {projects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Horas estimadas */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Horas Estimadas"
                  type="number"
                  value={formData.estimatedHours}
                  onChange={handleChange('estimatedHours')}
                  error={!!errors.estimatedHours}
                  helperText={errors.estimatedHours}
                  disabled={loading}
                  inputProps={{ min: 0, step: 0.5 }}
                />
              </Grid>

              {/* Fecha límite */}
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="Fecha Límite"
                  value={formData.dueDate}
                  onChange={handleDateChange}
                  disabled={loading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                  minDateTime={dayjs()}
                />
              </Grid>

              {/* Ubicación / Dirección */}
              <Grid item xs={12} md={10}>
                <TextField
                  fullWidth
                  label="Ubicación / Dirección"
                  value={formData.location}
                  onChange={handleChange('location')}
                  disabled={loading}
                  placeholder="Ej: Av. Corrientes 1234, CABA o Planta Industrial Norte, Sector B"
                  helperText="Ingresa una dirección específica o usa 'Mi Ubicación' para obtener automáticamente la dirección actual"
                  multiline
                  maxRows={2}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleGetCurrentLocation}
                  disabled={loading || gettingLocation}
                  sx={{ height: '56px' }}
                  startIcon={!gettingLocation && '📍'}
                >
                  {gettingLocation ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Obteniendo...
                    </>
                  ) : (
                    'Mi Ubicación'
                  )}
                </Button>
              </Grid>

              {/* Removed Test Geocoding button (dev utility) */}



              {/* ID de Equipo */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="ID de Equipo"
                  value={formData.equipmentId}
                  onChange={handleChange('equipmentId')}
                  disabled={loading}
                />
              </Grid>

              {/* Botones */}
              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    startIcon={loading && <CircularProgress size={20} />}
                  >
                    {loading ? 'Creando...' : 'Crear Orden'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </LocalizationProvider>
  )
}

export default CreateWorkOrder