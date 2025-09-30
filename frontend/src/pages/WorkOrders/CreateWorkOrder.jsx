import { Typography, Box, Paper } from '@mui/material'

const CreateWorkOrder = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Create Work Order
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Create work order form will be displayed here.
        </Typography>
      </Paper>
    </Box>
  )
}

export default CreateWorkOrder