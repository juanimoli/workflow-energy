import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, CircularProgress, Typography, Paper } from '@mui/material'
import toast from 'react-hot-toast'

// Página pequeña para capturar tokens del hash y redirigir mostrando feedback visual
export default function TokenReceiver() {
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    let timeout
    try {
      const hash = window.location.hash || ''
      const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
      const accessToken = params.get('accessToken')
      const refreshToken = params.get('refreshToken')

      if (accessToken && refreshToken) {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        toast.success('Sesión iniciada automáticamente')
        // Pequeño delay para que el usuario vea el spinner
        timeout = setTimeout(() => {
          window.location.replace('/dashboard')
        }, 600)
        return
      }
    } catch (e) {
      // ignore
    }
    timeout = setTimeout(() => {
      navigate('/login', { replace: true })
    }, 500)
    return () => clearTimeout(timeout)
  }, [navigate])

  useEffect(() => {
    const done = setTimeout(() => setProcessing(false), 800)
    return () => clearTimeout(done)
  }, [])

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: 'background.default', p: 2 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 360 }}>
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>Procesando acceso seguro…</Typography>
        <Typography variant="body2" color="text.secondary">
          Verificando y guardando credenciales. Serás redirigido en un momento.
        </Typography>
      </Paper>
    </Box>
  )
}
