import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { authService } from '../services/authService'
import toast from 'react-hot-toast'

const AuthContext = createContext()

const initialState = {
  user: null,
  loading: true,
  isAuthenticated: false,
}

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
      }
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        loading: false,
        isAuthenticated: true,
      }
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        loading: false,
        isAuthenticated: false,
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      }
    default:
      return state
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken')
      
      if (token) {
        try {
          dispatch({ type: 'AUTH_START' })
          const userData = await authService.getCurrentUser()
          dispatch({ type: 'AUTH_SUCCESS', payload: userData.user })
        } catch (error) {
          console.error('Auth initialization error:', error)
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          dispatch({ type: 'AUTH_FAILURE' })
        }
      } else {
        dispatch({ type: 'AUTH_FAILURE' })
      }
    }

    initializeAuth()
  }, [])

  const login = async (credentials) => {
    try {
      dispatch({ type: 'AUTH_START' })
      const response = await authService.login(credentials)
      
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)
      
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user })
      // Toast se maneja en Login.jsx
      
      return response
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE' })
      // Error se maneja en Login.jsx
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      dispatch({ type: 'LOGOUT' })
      toast.success('Sesión cerrada correctamente')
    }
  }

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData })
  }

  const hasPermission = (requiredRole) => {
    if (!state.user) return false

    const roleHierarchy = {
      employee: 1,
      team_leader: 2,
      supervisor: 3,
      admin: 4,
    }

    const userRoleLevel = roleHierarchy[state.user.role] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0

    return userRoleLevel >= requiredRoleLevel
  }

  const canAccessWorkOrder = (workOrder) => {
    if (!state.user || !workOrder) return false

    // Admin and supervisor can access all
    if (state.user.role === 'admin' || state.user.role === 'supervisor') {
      return true
    }

    // Team leader can access team work orders
    if (state.user.role === 'team_leader') {
      return workOrder.teamId === state.user.teamId
    }

    // Employee can access only their own work orders
    if (state.user.role === 'employee') {
      return workOrder.assignedTo === state.user.id
    }

    return false
  }

  const value = {
    ...state,
    login,
    logout,
    updateUser,
    hasPermission,
    canAccessWorkOrder,
    // Permite establecer el usuario autenticado directamente (por ejemplo tras reset de contraseña)
    setAuthenticatedUser: (userData) => {
      dispatch({ type: 'AUTH_SUCCESS', payload: userData })
    }
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}