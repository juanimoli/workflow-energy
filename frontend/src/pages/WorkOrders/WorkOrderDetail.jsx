import { Typography, Box, Paper } from '@mui/material'

const WorkOrderDetail = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Work Order Details
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Work order details will be displayed here.
        </Typography>
      </Paper>
    </Box>
  )
}

export default WorkOrderDetail