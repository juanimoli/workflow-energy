import axios from 'axios'

// Default to backend dev port 5001 to avoid macOS AirPlay conflicts on 5000/3001
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
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

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          })

          const { accessToken } = response.data
          localStorage.setItem('accessToken', accessToken)

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export const authService = {
  async login(credentials) {
    const payload = {
      email: credentials.email,
      password: credentials.password
    }
    const response = await api.post('/api/auth/login', payload)
    return response.data
  },

  async logout() {
    const response = await api.post('/api/auth/logout')
    return response.data
  },

  async getCurrentUser() {
    const response = await api.get('/api/auth/me')
    return response.data
  },

  async changePassword(passwordData) {
    const response = await api.post('/api/auth/change-password', passwordData)
    return response.data
  },

  async forgotPassword(email) {
    const response = await api.post('/api/auth/forgot-password', { email })
    return response.data
  },

  async resetPassword(resetData) {
    const response = await api.post('/api/auth/reset-password', resetData)
    return response.data
  },

  async validateSession() {
    const response = await api.post('/api/auth/validate-session')
    return response.data
  },
}

export default api