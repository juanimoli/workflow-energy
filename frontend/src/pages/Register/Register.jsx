import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Link,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import api from '../../services/authService'
import logo from '../../assets/logo.png'

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: '',
    role: 'employee'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    
    // Validación en tiempo real
    validateField(name, value)
  }

  const validateField = (name, value) => {
    const errors = {}
    
    switch(name) {
      case 'firstName':
        if (value && value.length < 2) {
          errors.firstName = 'El nombre debe tener al menos 2 caracteres'
        }
        break
      case 'lastName':
        if (value && value.length < 2) {
          errors.lastName = 'El apellido debe tener al menos 2 caracteres'
        }
        break
      case 'username':
        if (value && value.length < 3) {
          errors.username = 'El usuario debe tener al menos 3 caracteres'
        } else if (value && value.length > 50) {
          errors.username = 'El usuario no puede tener más de 50 caracteres'
        } else if (value && !/^[a-zA-Z0-9_]+$/.test(value)) {
          errors.username = 'Solo letras, números y guiones bajos'
        }
        break
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = 'Correo electrónico inválido'
        }
        break
      case 'password':
        if (value && value.length < 8) {
          errors.password = 'La contraseña debe tener al menos 8 caracteres'
        }
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          errors.confirmPassword = 'Las contraseñas no coinciden'
        } else {
          setFieldErrors(prev => {
            const newErrors = {...prev}
            delete newErrors.confirmPassword
            return newErrors
          })
        }
        break
      case 'confirmPassword':
        if (value && value !== formData.password) {
          errors.confirmPassword = 'Las contraseñas no coinciden'
        }
        break
    }
    
    setFieldErrors(prev => {
      const newErrors = {...prev}
      if (Object.keys(errors).length > 0) {
        return {...newErrors, ...errors}
      } else {
        delete newErrors[name]
        return newErrors
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validar todos los campos
    Object.keys(formData).forEach(key => validateField(key, formData[key]))
    
    if (!formData.email || !formData.password || !formData.username || !formData.firstName || !formData.lastName) {
      setError('Por favor completa todos los campos obligatorios')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (Object.keys(fieldErrors).length > 0) {
      setError('Por favor corrige los errores en el formulario')
      return
    }

    setLoading(true)
    setError('')

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role
      }
      
      const response = await api.post('/api/auth/register', payload)
      
      // Mostrar toast de éxito
      toast.success('¡Registro exitoso! Ahora puedes iniciar sesión', {
        duration: 4000,
        icon: '✅'
      })
      
      // Esperar un momento para que el usuario vea el toast
      setTimeout(() => {
        navigate('/login')
      }, 1000)
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Error al registrar usuario'
      setError(errorMessage)
      toast.error(errorMessage, {
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Box
            component="img"
            src={logo}
            alt="WorkFlow Energy Logo"
            sx={{
              width: 150,
              height: 'auto',
              mb: 2
            }}
          />
          <Typography component="h1" variant="h5">
            Registro de Usuario
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            Crear nueva cuenta de usuario
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="firstName"
                  label="Nombre"
                  name="firstName"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={loading}
                  error={!!fieldErrors.firstName}
                  helperText={fieldErrors.firstName || 'Mínimo 2 caracteres'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="lastName"
                  label="Apellido"
                  name="lastName"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={loading}
                  error={!!fieldErrors.lastName}
                  helperText={fieldErrors.lastName || 'Mínimo 2 caracteres'}
                />
              </Grid>
            </Grid>
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Nombre de Usuario"
              name="username"
              autoComplete="username"
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
              error={!!fieldErrors.username}
              helperText={fieldErrors.username || 'Entre 3 y 50 caracteres (letras, números y _)'}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo Electrónico"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              error={!!fieldErrors.email}
              helperText={fieldErrors.email}
            />

            <FormControl fullWidth margin="normal" required>
              <InputLabel id="role-label">Rol</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                disabled={loading}
                label="Rol"
              >
                <MenuItem value="employee">Empleado / Técnico</MenuItem>
                <MenuItem value="team_leader">Jefe de Equipo</MenuItem>
                <MenuItem value="supervisor">Supervisor / Gerente</MenuItem>
                <MenuItem value="admin">Administrador</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              error={!!fieldErrors.password}
              helperText={fieldErrors.password || 'Mínimo 8 caracteres'}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmar Contraseña"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              error={!!fieldErrors.confirmPassword}
              helperText={fieldErrors.confirmPassword}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                ¿Ya tienes una cuenta? Iniciar sesión
              </Link>
            </Box>

            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="caption" display="block" color="text.secondary">
                💡 Nota: La contraseña debe tener al menos 8 caracteres
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                ⚠️ Usa un correo electrónico válido para recibir notificaciones
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default Register

