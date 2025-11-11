import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { authService } from '../../services/authService'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/logo.png'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [token, setToken] = useState('')
  const { setAuthenticatedUser } = useAuth()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      toast.error('Token de recuperación no válido')
      navigate('/login')
      return
    }
    setToken(tokenParam)
  }, [searchParams, navigate])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.newPassword) {
      newErrors.newPassword = 'La nueva contraseña es obligatoria'
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'La contraseña debe tener al menos 8 caracteres'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu nueva contraseña'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await authService.resetPassword({
        token: token,
        newPassword: formData.newPassword
      })

      // Si el backend envía tokens, realizamos auto-login transparente
      if (response?.accessToken && response?.refreshToken && response?.user) {
        localStorage.setItem('accessToken', response.accessToken)
        localStorage.setItem('refreshToken', response.refreshToken)
        setAuthenticatedUser(response.user)

        toast.success('Contraseña actualizada y sesión iniciada ✅', {
          duration: 5000,
          icon: '🔐'
        })

        // Redirigir al dashboard (usa redirectUrl si viene, fallback al dashboard local)
        const target = response.redirectUrl || '/dashboard'
        navigate(target.replace(/https?:\/\/[^/]+/, '')) // si viene absoluta, la convertimos a relativa para SPA
      } else {
        // Fallback original si por alguna razón no hay tokens (flujo degradado)
        toast.success('Contraseña actualizada exitosamente', {
          duration: 5000,
          icon: '✅'
        })
        setTimeout(() => {
          navigate('/login')
        }, 1500)
      }

    } catch (err) {
      let errorMessage = 'Error al actualizar la contraseña'
      
      if (err.response?.status === 400) {
        errorMessage = 'Token inválido o expirado. Solicita un nuevo enlace de recuperación.'
      } else if (err.response?.status >= 500) {
        errorMessage = 'Error del servidor. Intenta más tarde.'
      } else if (err.message?.includes('Network Error')) {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet.'
      } else if (err.response?.data?.message && !err.response.data.message.includes('status')) {
        errorMessage = err.response.data.message
      }
      
      toast.error(errorMessage, {
        duration: 5000,
        icon: '❌'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  if (!token) {
    return null // Will redirect in useEffect
  }

  return (
    <Container component="main" maxWidth="xs">
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
            Nueva Contraseña
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2, textAlign: 'center' }}>
            Ingresa tu nueva contraseña para completar la recuperación
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              name="newPassword"
              label="Nueva Contraseña"
              type={showPassword ? 'text' : 'password'}
              id="newPassword"
              autoComplete="new-password"
              value={formData.newPassword}
              onChange={handleChange('newPassword')}
              error={!!errors.newPassword}
              helperText={errors.newPassword}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmar Nueva Contraseña"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleToggleConfirmPasswordVisibility}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="text"
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                Volver al inicio de sesión
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default ResetPassword