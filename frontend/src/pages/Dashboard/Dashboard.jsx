import { useState, useEffect } from 'react'
import {
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material'
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon,
  PlayArrow as InProgressIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
)

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const Dashboard = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeframe, setTimeframe] = useState('30')
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    if (user) {
      loadDashboardMetrics()
    }
  }, [user, timeframe])

  const loadDashboardMetrics = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`${API_BASE_URL}/api/metrics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { timeframe }
      })
      setMetrics(response.data)
      setError(null)
    } catch (error) {
      console.error('Error loading dashboard metrics:', error)
      setError('Error al cargar las métricas del dashboard')
      toast.error('Error al cargar las métricas')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    )
  }

  if (!metrics) {
    return (
      <Alert severity="info">
        No hay datos disponibles
      </Alert>
    )
  }

  const { stats, trends } = metrics

  // Stat cards data
  const statCards = [
    {
      title: 'Total de Órdenes',
      value: stats.total,
      icon: <AssignmentIcon fontSize="large" />,
      color: '#1976d2',
    },
    {
      title: 'Completadas',
      value: stats.byStatus.completed,
      icon: <CheckCircleIcon fontSize="large" />,
      color: '#2e7d32',
    },
    {
      title: 'En Progreso',
      value: stats.byStatus.in_progress,
      icon: <InProgressIcon fontSize="large" />,
      color: '#ed6c02',
    },
    {
      title: 'Pendientes',
      value: stats.byStatus.pending,
      icon: <PendingIcon fontSize="large" />,
      color: '#9c27b0',
    },
    {
      title: 'Atrasadas',
      value: stats.overdueOrders,
      icon: <TimeIcon fontSize="large" />,
      color: '#d32f2f',
    },
    {
      title: 'Tiempo Promedio',
      value: `${stats.avgCompletionHours}h`,
      icon: <TrendingUpIcon fontSize="large" />,
      color: '#0288d1',
    },
  ]

  // Status distribution chart
  const statusData = {
    labels: ['Pendientes', 'En Progreso', 'Completadas', 'En Espera', 'Canceladas'],
    datasets: [
      {
        label: 'Órdenes por Estado',
        data: [
          stats.byStatus.pending,
          stats.byStatus.in_progress,
          stats.byStatus.completed,
          stats.byStatus.on_hold,
          stats.byStatus.cancelled,
        ],
        backgroundColor: [
          'rgba(156, 39, 176, 0.7)',
          'rgba(237, 108, 2, 0.7)',
          'rgba(46, 125, 50, 0.7)',
          'rgba(158, 158, 158, 0.7)',
          'rgba(211, 47, 47, 0.7)',
        ],
        borderColor: [
          'rgba(156, 39, 176, 1)',
          'rgba(237, 108, 2, 1)',
          'rgba(46, 125, 50, 1)',
          'rgba(158, 158, 158, 1)',
          'rgba(211, 47, 47, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  // Priority distribution chart
  const priorityData = {
    labels: ['Baja', 'Media', 'Alta', 'Crítica'],
    datasets: [
      {
        label: 'Órdenes por Prioridad',
        data: [
          stats.byPriority.low,
          stats.byPriority.medium,
          stats.byPriority.high,
          stats.byPriority.critical,
        ],
        backgroundColor: [
          'rgba(76, 175, 80, 0.7)',
          'rgba(33, 150, 243, 0.7)',
          'rgba(255, 152, 0, 0.7)',
          'rgba(244, 67, 54, 0.7)',
        ],
        borderColor: [
          'rgba(76, 175, 80, 1)',
          'rgba(33, 150, 243, 1)',
          'rgba(255, 152, 0, 1)',
          'rgba(244, 67, 54, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  // Trends chart
  const trendData = {
    labels: trends.slice(0, 14).reverse().map(t => new Date(t.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Creadas',
        data: trends.slice(0, 14).reverse().map(t => t.created),
        borderColor: 'rgba(25, 118, 210, 1)',
        backgroundColor: 'rgba(25, 118, 210, 0.2)',
        tension: 0.3,
      },
      {
        label: 'Completadas',
        data: trends.slice(0, 14).reverse().map(t => t.completed),
        borderColor: 'rgba(46, 125, 50, 1)',
        backgroundColor: 'rgba(46, 125, 50, 0.2)',
        tension: 0.3,
      },
      {
        label: 'En Progreso',
        data: trends.slice(0, 14).reverse().map(t => t.in_progress),
        borderColor: 'rgba(237, 108, 2, 1)',
        backgroundColor: 'rgba(237, 108, 2, 0.2)',
        tension: 0.3,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Dashboard de Métricas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bienvenido, {user?.firstName} {user?.lastName}
          </Typography>
        </Box>
        
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Período</InputLabel>
          <Select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            label="Período"
          >
            <MenuItem value="7">Últimos 7 días</MenuItem>
            <MenuItem value="30">Últimos 30 días</MenuItem>
            <MenuItem value="90">Últimos 90 días</MenuItem>
            <MenuItem value="180">Últimos 6 meses</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Trends Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tendencia de Órdenes (Últimas 2 semanas)
            </Typography>
            <Box sx={{ height: 300 }}>
              <Line data={trendData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Status Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Distribución por Estado
            </Typography>
            <Box sx={{ height: 300 }}>
              <Pie data={statusData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Priority Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Distribución por Prioridad
            </Typography>
            <Box sx={{ height: 300 }}>
              <Bar data={priorityData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard
