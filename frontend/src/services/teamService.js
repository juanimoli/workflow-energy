import axios from 'axios';

// Default to backend dev port 5001 to match the rest of services
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');

const teamService = {
  // Obtener todos los equipos
  getTeams: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_BASE_URL}/api/teams`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Obtener un equipo por ID
  getTeamById: async (id) => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_BASE_URL}/api/teams/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Crear un nuevo equipo
  createTeam: async (teamData) => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.post(`${API_BASE_URL}/api/teams`, teamData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Actualizar un equipo
  updateTeam: async (id, teamData) => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.put(`${API_BASE_URL}/api/teams/${id}`, teamData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Eliminar un equipo
  deleteTeam: async (id) => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.delete(`${API_BASE_URL}/api/teams/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Agregar miembro a un equipo
  addMember: async (teamId, userId) => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.post(
      `${API_BASE_URL}/api/teams/${teamId}/members`,
      { userId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  // Remover miembro de un equipo
  removeMember: async (teamId, userId) => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.delete(
      `${API_BASE_URL}/api/teams/${teamId}/members/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};

export default teamService;

