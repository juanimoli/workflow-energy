import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import teamService from '../../services/teamService';
import userService from '../../services/userService';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';

const Teams = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    plant_id: '',
    leader_id: '',
  });

  const canCreateTeam = user && ['admin', 'supervisor'].includes(user.role);
  const canEditTeam = user && ['admin', 'supervisor', 'team_leader'].includes(user.role);

  useEffect(() => {
    loadTeams();
    loadUsers();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await teamService.getTeams();
      setTeams(data.teams || []);
      setError(null);
    } catch (err) {
      console.error('Error loading teams:', err);
      setError('Error al cargar los equipos');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      // Filtrar usuarios que pueden ser líderes (no admins, pueden ser employees o supervisors)
      const availableUsers = (data.users || []).filter(
        (u) => u.role !== 'admin' && u.is_active
      );
      setUsers(availableUsers);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleOpenDialog = () => {
    setFormData({ name: '', description: '', plant_id: '', leader_id: '' });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ name: '', description: '', plant_id: '', leader_id: '' });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        setError('El nombre del equipo es obligatorio');
        return;
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        plant_id: formData.plant_id ? parseInt(formData.plant_id) : null,
        leader_id: formData.leader_id ? parseInt(formData.leader_id) : null,
      };

      await teamService.createTeam(payload);
      handleCloseDialog();
      loadTeams();
      loadUsers(); // Recargar usuarios ya que uno puede haber sido asignado
      setError(null);
    } catch (err) {
      console.error('Error creating team:', err);
      setError(err.response?.data?.message || 'Error al crear el equipo');
    }
  };

  const handleDelete = async (teamId) => {
    if (!window.confirm('¿Estás seguro de eliminar este equipo?')) {
      return;
    }

    try {
      await teamService.deleteTeam(teamId);
      loadTeams();
      setError(null);
    } catch (err) {
      console.error('Error deleting team:', err);
      setError(err.response?.data?.message || 'Error al eliminar el equipo');
    }
  };

  const handleViewDetails = (teamId) => {
    navigate(`/teams/${teamId}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Equipos
        </Typography>
        {canCreateTeam && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            Crear Equipo
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {teams.length === 0 ? (
        <Alert severity="info">
          No hay equipos creados todavía.
          {canCreateTeam && ' Haz clic en "Crear Equipo" para empezar.'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {teams.map((team) => (
            <Grid item xs={12} sm={6} md={4} key={team.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {team.name}
                  </Typography>
                  {team.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {team.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    {team.leader && (
                      <Chip
                        icon={<PersonIcon />}
                        label={`Líder: ${team.leader.first_name} ${team.leader.last_name}`}
                        size="small"
                        color="primary"
                      />
                    )}
                    {team.plant?.name && (
                      <Chip
                        label={`Planta: ${team.plant.name}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    onClick={() => handleViewDetails(team.id)}
                  >
                    Ver Detalles
                  </Button>
                  <Box>
                    {canEditTeam && (
                      <>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/teams/${team.id}`)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {['admin', 'supervisor'].includes(user.role) && (
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(team.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </>
                    )}
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog para crear equipo */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Crear Nuevo Equipo</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nombre del Equipo"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Descripción"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="ID de Planta (opcional)"
              name="plant_id"
              type="number"
              value={formData.plant_id}
              onChange={handleChange}
              helperText="Deja en blanco si no tienes plantas configuradas"
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Líder del Equipo (opcional)</InputLabel>
              <Select
                name="leader_id"
                value={formData.leader_id}
                onChange={handleChange}
                label="Líder del Equipo (opcional)"
              >
                <MenuItem value="">
                  <em>Sin líder (asignar después)</em>
                </MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} - {u.email} ({u.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Teams;
