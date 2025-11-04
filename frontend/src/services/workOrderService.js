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

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const workOrderService = {
  // Get work orders with filtering and pagination
  async getWorkOrders(params = {}) {
    const response = await api.get('/api/work-orders', { params })
    return response.data
  },

  // Get single work order
  async getWorkOrder(id) {
    const response = await api.get(`/api/work-orders/${id}`)
    return response.data
  },

  // Create work order
  async createWorkOrder(workOrderData) {
    const response = await api.post('/api/work-orders', workOrderData)
    return response.data
  },

  // Update work order
  async updateWorkOrder(id, updateData) {
    const response = await api.put(`/api/work-orders/${id}`, updateData)
    return response.data
  },

  // Delete work order
  async deleteWorkOrder(id) {
    const response = await api.delete(`/api/work-orders/${id}`)
    return response.data
  },

  // Get work order statistics
  async getWorkOrderStats() {
    const response = await api.get('/api/work-orders/stats/summary')
    return response.data
  },

  // Update work order status (HU-06)
  async updateWorkOrderStatus(id, status, notes) {
    const response = await api.patch(`/api/work-orders/${id}/status`, { status, notes })
    return response.data
  },

  // Get work order history (HU-07)
  async getWorkOrderHistory(id) {
    const response = await api.get(`/api/work-orders/${id}/history`)
    return response.data
  },

  // Update work order status (legacy)
  async updateStatus(id, status) {
    const response = await api.put(`/api/work-orders/${id}`, { status })
    return response.data
  },

  // Assign work order
  async assignWorkOrder(id, assignedTo) {
    const response = await api.put(`/api/work-orders/${id}`, { assignedTo })
    return response.data
  },
}