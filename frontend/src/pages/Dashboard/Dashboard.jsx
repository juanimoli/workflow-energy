import { Typography, Box } from '@mui/material'
import { useAuth } from '../../context/AuthContext'

const Dashboard = () => {
  const { user } = useAuth()

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1">
        Bienvenido, {user?.firstName} {user?.lastName}
      </Typography>
    </Box>
  )
}

export default Dashboard
