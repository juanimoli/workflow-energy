import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Login/Login'
import ComingSoon from './pages/ComingSoon/ComingSoon'
import Dashboard from './pages/Dashboard/Dashboard'
import WorkOrders from './pages/WorkOrders/WorkOrders'
import WorkOrderDetail from './pages/WorkOrders/WorkOrderDetail'
import CreateWorkOrder from './pages/WorkOrders/CreateWorkOrder'
import Reports from './pages/Reports/Reports'
import Settings from './pages/Settings/Settings'
import Profile from './pages/Profile/Profile'
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/coming-soon" element={<ComingSoon />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/coming-soon" replace />} />
    </Routes>
  )
}

export default App