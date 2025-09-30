import { Typography, Box, Paper } from '@mui/material'

const Settings = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Settings
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          System settings will be displayed here.
        </Typography>
      </Paper>
    </Box>
  )
}

export default Settings