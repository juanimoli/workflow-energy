import { Typography, Box, Paper } from '@mui/material'

const Reports = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Reports
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Reports and analytics will be displayed here.
        </Typography>
      </Paper>
    </Box>
  )
}

export default Reports