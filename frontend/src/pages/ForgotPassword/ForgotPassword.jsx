import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Link
} from '@mui/material'
import toast from 'react-hot-toast'
import { authService } from '../../services/authService'
import logo from '../../assets/logo.png'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email) {
      setError('Por favor ingresa tu correo electrónico')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await authService.forgotPassword(email)
      const successMessage = response.message || 'Se ha enviado un enlace a tu correo'
      setMessage(successMessage)
      toast.success(successMessage, {
        duration: 5000,
        icon: '📧'
      })
    } catch (err) {
      let errorMessage = 'Error al procesar la solicitud'
      
      // Provide user-friendly error messages
      if (err.response?.status === 404) {
        errorMessage = 'No se encontró una cuenta con ese correo electrónico'
      } else if (err.response?.status === 400) {
        errorMessage = 'Correo electrónico inválido'
      } else if (err.response?.status === 429) {
        errorMessage = 'Demasiadas solicitudes. Espera unos minutos antes de volver a intentar.'
      } else if (err.response?.status >= 500) {
        errorMessage = 'Error del servidor. Intenta más tarde.'
      } else if (err.message?.includes('Network Error')) {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet.'
      } else if (err.response?.data?.message && !err.response.data.message.includes('status')) {
        errorMessage = err.response.data.message
      }
      
      setError(errorMessage)
      toast.error(errorMessage, {
        duration: 5000,
        icon: '❌'
      })
    } finally {
      setLoading(false)
    }
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
            Recuperar Contraseña
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2, textAlign: 'center' }}>
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {message && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              {message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo Electrónico"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Volver al inicio de sesión
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default ForgotPassword

