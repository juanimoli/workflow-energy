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
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useAuth } from '../../context/AuthContext'
import { workOrderService } from '../../services/workOrderService'
import { userService } from '../../services/userService'
import { projectService } from '../../services/projectService'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const CreateWorkOrder = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  
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
  }, [user.role])

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
        description: formData.description.trim(),
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
      const message = error.response?.data?.error || 'Error al crear la orden de trabajo'
      toast.error(message)
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
              {(user.role === 'team_leader' || user.role === 'supervisor' || user.role === 'admin') && (
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={users}
                    getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.email})`}
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

              {/* Ubicación */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Ubicación"
                  value={formData.location}
                  onChange={handleChange('location')}
                  disabled={loading}
                />
              </Grid>

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