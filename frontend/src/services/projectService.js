import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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

export const projectService = {
  // Get projects
  async getProjects(params = {}) {
    const response = await api.get('/projects', { params })
    return response.data
  },

  // Get project by ID
  async getProject(id) {
    const response = await api.get(`/projects/${id}`)
    return response.data
  },
}