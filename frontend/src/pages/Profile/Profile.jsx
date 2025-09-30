import { Typography, Box, Paper } from '@mui/material'

const Profile = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Profile
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          User profile settings will be displayed here.
        </Typography>
      </Paper>
    </Box>
  )
}

export default Profile