import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import teamService from '../../services/teamService';
import userService from '../../services/userService';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';

const TeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    plant_id: '',
    leader_id: '',
  });
  const [selectedUserId, setSelectedUserId] = useState('');

  const canEdit = user && ['admin', 'supervisor', 'team_leader'].includes(user.role);
  const canManageMembers = user && ['admin', 'supervisor', 'team_leader'].includes(user.role);

  useEffect(() => {
    loadTeamData();
    loadAvailableUsers();
  }, [id]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const data = await teamService.getTeamById(id);
      setTeam(data.team);
      setFormData({
        name: data.team.name,
        description: data.team.description || '',
        plant_id: data.team.plant_id || '',
        leader_id: data.team.leader_id || '',
      });
      setError(null);
    } catch (err) {
      console.error('Error loading team:', err);
      setError('Error al cargar el equipo');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      // Filtrar usuarios que no son admins ni team leaders
      const availableUsers = (data.users || []).filter(
        (u) => !['admin', 'team_leader'].includes(u.role)
      );
      setUsers(availableUsers);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleOpenEditDialog = () => {
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
  };

  const handleOpenAddMemberDialog = () => {
    setSelectedUserId('');
    setOpenAddMemberDialog(true);
  };

  const handleCloseAddMemberDialog = () => {
    setOpenAddMemberDialog(false);
    setSelectedUserId('');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdateTeam = async () => {
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

      await teamService.updateTeam(id, payload);
      handleCloseEditDialog();
      loadTeamData();
      setError(null);
    } catch (err) {
      console.error('Error updating team:', err);
      setError(err.response?.data?.message || 'Error al actualizar el equipo');
    }
  };

  const handleAddMember = async () => {
    try {
      if (!selectedUserId) {
        setError('Debes seleccionar un usuario');
        return;
      }

      await teamService.addMember(id, parseInt(selectedUserId));
      handleCloseAddMemberDialog();
      loadTeamData();
      loadAvailableUsers();
      setError(null);
    } catch (err) {
      console.error('Error adding member:', err);
      setError(err.response?.data?.message || 'Error al agregar miembro');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('¿Estás seguro de remover este miembro del equipo?')) {
      return;
    }

    try {
      await teamService.removeMember(id, userId);
      loadTeamData();
      loadAvailableUsers();
      setError(null);
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err.response?.data?.message || 'Error al remover miembro');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!team) {
    return (
      <Box>
        <Alert severity="error">Equipo no encontrado</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/teams')} sx={{ mt: 2 }}>
          Volver a Equipos
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/teams')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">{team.name}</Typography>
        </Box>
        {canEdit && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleOpenEditDialog}
          >
            Editar Equipo
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Información del equipo */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Información del Equipo
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Nombre
            </Typography>
            <Typography variant="body1">{team.name}</Typography>
          </Grid>
          {team.description && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Descripción
              </Typography>
              <Typography variant="body1">{team.description}</Typography>
            </Grid>
          )}
          {team.leader && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Líder del Equipo
              </Typography>
              <Typography variant="body1">
                {team.leader.first_name} {team.leader.last_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {team.leader.email}
              </Typography>
            </Grid>
          )}
          {team.plant?.name && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Planta
              </Typography>
              <Typography variant="body1">{team.plant.name}</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Miembros del equipo */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Miembros del Equipo ({team.members?.length || 0})
          </Typography>
          {canManageMembers && (
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={handleOpenAddMemberDialog}
              size="small"
            >
              Agregar Miembro
            </Button>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />

        {!team.members || team.members.length === 0 ? (
          <Alert severity="info">
            No hay miembros en este equipo todavía.
            {canManageMembers && ' Haz clic en "Agregar Miembro" para empezar.'}
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Rol</TableCell>
                  {canManageMembers && <TableCell align="right">Acciones</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {team.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      {member.first_name} {member.last_name}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Chip label={member.role} size="small" />
                    </TableCell>
                    {canManageMembers && (
                      <TableCell align="right">
                        <Tooltip title="Remover del equipo">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <PersonRemoveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog para editar equipo */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Equipo</DialogTitle>
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
              <InputLabel>Líder del Equipo</InputLabel>
              <Select
                name="leader_id"
                value={formData.leader_id}
                onChange={handleChange}
                label="Líder del Equipo"
              >
                <MenuItem value="">
                  <em>Sin líder</em>
                </MenuItem>
                {users
                  .filter((u) => u.role !== 'admin')
                  .map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} - {u.email} ({u.role})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancelar</Button>
          <Button onClick={handleUpdateTeam} variant="contained">
            Actualizar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para agregar miembro */}
      <Dialog open={openAddMemberDialog} onClose={handleCloseAddMemberDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Miembro al Equipo</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Seleccionar Usuario</InputLabel>
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                label="Seleccionar Usuario"
              >
                {users
                  .filter((u) => !team.members?.some((m) => m.id === u.id))
                  .map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} - {u.email} ({u.role})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddMemberDialog}>Cancelar</Button>
          <Button onClick={handleAddMember} variant="contained">
            Agregar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamDetail;
