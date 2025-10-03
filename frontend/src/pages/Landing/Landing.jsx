import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Paper,
  Chip,
  Stack
} from '@mui/material'
import {
  Assignment,
  People,
  BarChart,
  CloudSync,
  Speed,
  Security
} from '@mui/icons-material'
import logo from '../../assets/logo.png'

const Landing = () => {
  const navigate = useNavigate()

  const features = [
    {
      icon: <Assignment fontSize="large" />,
      title: 'Gestión de Órdenes',
      description: 'Crea, asigna y da seguimiento a órdenes de trabajo en tiempo real'
    },
    {
      icon: <People fontSize="large" />,
      title: 'Control por Roles',
      description: 'Acceso jerárquico según tu rol: Empleado, Jefe de Equipo o Gerente'
    },
    {
      icon: <BarChart fontSize="large" />,
      title: 'Métricas en Tiempo Real',
      description: 'KPIs y reportes de desempeño para tomar decisiones estratégicas'
    },
    {
      icon: <CloudSync fontSize="large" />,
      title: 'Sincronización Offline',
      description: 'Trabaja sin conexión y sincroniza automáticamente al reconectar'
    },
    {
      icon: <Speed fontSize="large" />,
      title: 'Multiplataforma',
      description: 'Acceso desde web y aplicación móvil nativa iOS/Android'
    },
    {
      icon: <Security fontSize="large" />,
      title: 'Seguro y Auditable',
      description: 'Registro completo de acciones y seguridad basada en tokens JWT'
    }
  ]

  const roles = [
    {
      title: 'Empleado',
      color: '#4CAF50',
      features: [
        'Crear órdenes de trabajo personales',
        'Actualizar estados: pendiente → en curso → finalizada',
        'Consultar únicamente sus propias órdenes',
        'Operación offline en móvil'
      ]
    },
    {
      title: 'Jefe de Equipo',
      color: '#FF9800',
      features: [
        'Visualizar todas las órdenes del equipo',
        'Filtrar por estado y proyecto',
        'Generar reportes de desempeño',
        'Asignar órdenes a miembros del equipo'
      ]
    },
    {
      title: 'Gerente/Supervisor',
      color: '#2196F3',
      features: [
        'Acceso a todas las órdenes de planta/proyecto',
        'Métricas globales y KPIs estratégicos',
        'Reportes comparativos entre equipos',
        'Dashboards de decisión ejecutiva'
      ]
    }
  ]

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 8,
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <img 
                  src={logo} 
                  alt="WorkFlow Energy" 
                  style={{ width: '200px', marginBottom: '20px' }}
                />
              </Box>
              <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
                WorkFlow Energy
              </Typography>
              <Typography variant="h5" gutterBottom sx={{ mb: 3, opacity: 0.9 }}>
                Sistema de Gestión de Órdenes de Trabajo para el Sector Energético
              </Typography>
              <Typography variant="body1" sx={{ mb: 4, fontSize: '1.1rem' }}>
                Optimiza recursos, reduce tiempos de inactividad y mejora la trazabilidad 
                de operaciones en plantas industriales con nuestra solución integral.
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    bgcolor: 'white',
                    color: '#667eea',
                    '&:hover': { bgcolor: '#f0f0f0' }
                  }}
                >
                  Iniciar Sesión
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/register')}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': { borderColor: '#f0f0f0', bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  Registrarse
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80"
                alt="Industrial Plant"
                sx={{
                  width: '100%',
                  borderRadius: 4,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" align="center" gutterBottom fontWeight="bold">
          Características Principales
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 6 }}>
          Todo lo que necesitas para gestionar tu operación industrial
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.3s',
                  '&:hover': { transform: 'translateY(-8px)', boxShadow: 6 }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Roles Section */}
      <Box sx={{ bgcolor: '#f5f5f5', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom fontWeight="bold">
            Roles y Permisos
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 6 }}>
            Acceso personalizado según tu nivel jerárquico
          </Typography>

          <Grid container spacing={4}>
            {roles.map((role, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Paper 
                  elevation={3}
                  sx={{ 
                    p: 3,
                    height: '100%',
                    borderTop: `4px solid ${role.color}`,
                    transition: 'transform 0.3s',
                    '&:hover': { transform: 'scale(1.02)' }
                  }}
                >
                  <Chip 
                    label={role.title}
                    sx={{ 
                      bgcolor: role.color, 
                      color: 'white',
                      fontWeight: 'bold',
                      mb: 2
                    }}
                  />
                  <Box component="ul" sx={{ pl: 2 }}>
                    {role.features.map((feature, i) => (
                      <Typography 
                        component="li" 
                        variant="body2" 
                        key={i}
                        sx={{ mb: 1 }}
                      >
                        {feature}
                      </Typography>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Screenshots Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" align="center" gutterBottom fontWeight="bold">
          Sistema Multiplataforma
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 6 }}>
          Accede desde cualquier dispositivo, en cualquier momento
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardMedia
                component="img"
                height="300"
                image="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
                alt="Web Dashboard"
              />
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Aplicación Web
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dashboard completo con métricas en tiempo real, reportes avanzados y 
                  gestión integral de órdenes desde tu navegador.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardMedia
                component="img"
                height="300"
                image="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80"
                alt="Mobile App"
              />
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  App Móvil
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aplicación nativa para iOS y Android con soporte offline, sincronización 
                  automática y notificaciones push.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 8,
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" gutterBottom fontWeight="bold">
            ¿Listo para optimizar tu operación?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Únete a empresas líderes del sector energético que ya confían en WorkFlow Energy
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{
                bgcolor: 'white',
                color: '#667eea',
                px: 4,
                py: 1.5,
                '&:hover': { bgcolor: '#f0f0f0' }
              }}
            >
              Comenzar Ahora
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                borderColor: 'white',
                color: 'white',
                px: 4,
                py: 1.5,
                '&:hover': { borderColor: '#f0f0f0', bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              Ya tengo cuenta
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#1a1a1a', color: 'white', py: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                WorkFlow Energy
              </Typography>
              <Typography variant="body2" color="grey.400">
                Sistema de gestión de órdenes de trabajo para el sector energético.
                Desarrollado para Pablo Farias por Rosario Presedo y Joaquín Villamediana.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6} sx={{ textAlign: { md: 'right' } }}>
              <Typography variant="body2" color="grey.400">
                Versión 1.0 - Septiembre 2025
              </Typography>
              <Typography variant="body2" color="grey.400" sx={{ mt: 1 }}>
                © 2025 WorkFlow Energy. Sistema de prueba para testers.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  )
}

export default Landing

