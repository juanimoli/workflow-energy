import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Login/Login'
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
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/work-orders" element={<WorkOrders />} />
        <Route path="/work-orders/new" element={<CreateWorkOrder />} />
        <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<Profile />} />
        {(user.role === 'admin' || user.role === 'supervisor') && (
          <Route path="/settings" element={<Settings />} />
        )}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App