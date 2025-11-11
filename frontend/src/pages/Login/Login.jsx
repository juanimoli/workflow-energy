import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import toast from 'react-hot-toast'
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
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/logo.png'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      await login({ email, password })
    } catch (err) {
      let errorMessage = 'Error al iniciar sesión'
      
      // Check for specific error types and provide user-friendly messages
      if (err.response?.status === 401) {
        errorMessage = 'Credenciales incorrectas. Verifica tu correo y contraseña.'
      } else if (err.response?.status === 400) {
        errorMessage = 'Datos de inicio de sesión inválidos'
      } else if (err.response?.status === 429) {
        errorMessage = 'Demasiados intentos. Espera unos minutos antes de volver a intentar.'
      } else if (err.response?.status >= 500) {
        errorMessage = 'Error del servidor. Intenta más tarde.'
      } else if (err.message?.includes('Network Error')) {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet.'
      } else if (err.response?.data?.message) {
        // Use server message if available and user-friendly
        const serverMessage = err.response.data.message
        if (!serverMessage.includes('401') && !serverMessage.includes('status')) {
          errorMessage = serverMessage
        }
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

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            Inicia sesión en tu cuenta
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
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
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>

            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Link component={RouterLink} to="/forgot-password" variant="body2">
                ¿Olvidaste tu contraseña?
              </Link>
            </Box>
            
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Link component={RouterLink} to="/register" variant="body2">
                ¿No tienes cuenta? Registrarse aquí
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default Login