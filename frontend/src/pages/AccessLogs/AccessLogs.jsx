import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import axios from 'axios';
import userService from '../../services/userService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');

const AccessLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]); // For username dropdown
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    success: '',
    username: '',
    ipAddress: '',
    startDate: '',
    endDate: ''
  });

  // Fetch stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_URL}/api/access-logs/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(filters.success !== '' && { success: filters.success }),
        ...(filters.username && { username: filters.username }),
        ...(filters.ipAddress && { ipAddress: filters.ipAddress }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      };

      const response = await axios.get(`${API_URL}/api/access-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setLogs(response.data.data);
      setTotalItems(response.data.pagination.totalItems);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err.response?.data?.message || 'Error al cargar el historial de accesos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, rowsPerPage]);

  // Load users for dropdown (admin only page)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsersLoading(true);
        const data = await userService.getAllUsers();
        // Keep only active users; map with display label
        const list = (data.users || []).filter(u => u.is_active !== false);
        setUsers(list);
      } catch (e) {
        console.error('Error loading users for access logs filter', e);
      } finally {
        setUsersLoading(false);
      }
    };
    loadUsers();
  }, []);

  // Dynamic filtering: debounce fetch when filters change
  useEffect(() => {
    const t = setTimeout(() => {
      // reset to first page when filters change
      setPage(0);
      fetchLogs();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field) => (event) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // move back to first page for new filters
    if (page !== 0) setPage(0);
  };

  // applyFilters no longer needed (dynamic)

  const resetFilters = () => {
    setFilters({
      success: '',
      username: '',
      ipAddress: '',
      startDate: '',
      endDate: ''
    });
    setPage(0);
    setTimeout(fetchLogs, 100);
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: es });
    } catch {
      return dateString;
    }
  };

  const getSuccessChip = (success) => {
    if (success) {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Exitoso"
          color="success"
          size="small"
        />
      );
    }
    return (
      <Chip
        icon={<CancelIcon />}
        label="Fallido"
        color="error"
        size="small"
      />
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <SecurityIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Auditoría de Accesos
          </Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary">
          Historial completo de intentos de inicio de sesión en el sistema
        </Typography>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Intentos (30d)
                </Typography>
                <Typography variant="h4">
                  {stats.total_attempts || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Typography color="common.white" gutterBottom variant="body2">
                  Logins Exitosos
                </Typography>
                <Typography variant="h4" color="common.white">
                  {stats.successful_logins || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'error.light' }}>
              <CardContent>
                <Typography color="common.white" gutterBottom variant="body2">
                  Logins Fallidos
                </Typography>
                <Typography variant="h4" color="common.white">
                  {stats.failed_logins || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Usuarios Únicos
                </Typography>
                <Typography variant="h4">
                  {stats.unique_users || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <FilterListIcon />
          <Typography variant="h6">Filtros</Typography>
        </Stack>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                value={filters.success}
                label="Estado"
                onChange={handleFilterChange('success')}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="true">Exitoso</MenuItem>
                <MenuItem value="false">Fallido</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel id="user-filter-label">Usuario</InputLabel>
              <Select
                labelId="user-filter-label"
                id="user-filter"
                value={filters.username}
                label="Usuario"
                onChange={handleFilterChange('username')}
              >
                <MenuItem value="">
                  <em>Todos</em>
                </MenuItem>
                {usersLoading && <MenuItem disabled>Cargando...</MenuItem>}
                {!usersLoading && users.map(u => (
                  <MenuItem key={u.id} value={u.username}>
                    {u.first_name} {u.last_name} - {u.email} ({u.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              fullWidth
              size="small"
              label="Dirección IP"
              value={filters.ipAddress}
              onChange={handleFilterChange('ipAddress')}
              placeholder="Ej: 192.168.1.1"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Desde"
              value={filters.startDate}
              onChange={handleFilterChange('startDate')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Hasta"
              value={filters.endDate}
              onChange={handleFilterChange('endDate')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={1}>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Limpiar filtros">
                <IconButton onClick={resetFilters}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Estado</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Dirección IP</TableCell>
                <TableCell>Fecha y Hora</TableCell>
                <TableCell>Razón de Fallo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Typography variant="body1" color="text.secondary">
                      No se encontraron registros
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    hover
                    sx={{
                      // Remove aggressive red/green backgrounds and keep a neutral hover
                      bgcolor: 'inherit',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <TableCell>{getSuccessChip(log.success)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {log.username}
                      </Typography>
                      {log.user_name && (
                        <Typography variant="caption" color="text.secondary">
                          {log.user_name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{log.email || '-'}</TableCell>
                    <TableCell>
                      {log.user_role ? (
                        <Chip
                          label={log.user_role}
                          size="small"
                          variant="outlined"
                        />
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {log.ip_address || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(log.login_attempt_at)}</TableCell>
                    <TableCell>
                      {log.failure_reason ? (
                        <Typography variant="body2" color="error">
                          {log.failure_reason}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={totalItems}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="Registros por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>
    </Container>
  );
};

export default AccessLogs;
