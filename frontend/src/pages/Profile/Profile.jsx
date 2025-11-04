import { Typography, Box, Paper, Grid, Chip, Divider } from '@mui/material'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const Profile = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Perfil
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography>Cargando perfil...</Typography>
        </Paper>
      </Box>
    )
  }

  const roleLabels = {
    admin: 'Administrador',
    supervisor: 'Supervisor',
    team_leader: 'Líder de Equipo',
    employee: 'Empleado',
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Mi Perfil
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Información Personal
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Nombre Completo
            </Typography>
            <Typography variant="body1">
              {user.firstName} {user.lastName}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Nombre de Usuario
            </Typography>
            <Typography variant="body1">{user.username}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{user.email}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Rol
            </Typography>
            <Chip 
              label={roleLabels[user.role] || user.role}
              color="primary"
              size="small"
            />
          </Grid>
          {user.teamId && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Equipo
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  cursor: 'pointer', 
                  color: 'primary.main',
                  '&:hover': { textDecoration: 'underline' }
                }}
                onClick={() => navigate(`/teams/${user.teamId}`)}
              >
                {user.teamName || `Equipo #${user.teamId}`}
              </Typography>
            </Grid>
          )}
          {user.plantId && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Planta
              </Typography>
              <Typography variant="body1">
                {user.plantName || `Planta #${user.plantId}`}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  )
}

export default Profile