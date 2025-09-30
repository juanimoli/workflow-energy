import { Typography, Box, Paper } from '@mui/material'

const WorkOrders = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Work Orders
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Work orders list will be displayed here once the backend is connected.
        </Typography>
      </Paper>
    </Box>
  )
}

export default WorkOrders