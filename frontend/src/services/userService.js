import axios from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

const userService = {
  // Get all users
  async getAllUsers(params = {}) {
    const response = await api.get('/api/users', { params })
    return response.data
  },

  // Get users (filtered by role permissions)
  async getUsers(params = {}) {
    const response = await api.get('/api/users', { params })
    return response.data
  },

  // Get user by ID
  async getUser(id) {
    const response = await api.get(`/api/users/${id}`)
    return response.data
  },

  // Get team members (for team leaders)
  async getTeamMembers() {
    const response = await api.get('/api/users/team/members')
    return response.data
  },
}

export default userService
export { userService }