import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import Landing from './pages/Landing/Landing'
import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import ForgotPassword from './pages/ForgotPassword/ForgotPassword'
import ResetPassword from './pages/ResetPassword/ResetPassword'
import TokenReceiver from './pages/Auth/TokenReceiver'
import ComingSoon from './pages/ComingSoon/ComingSoon'
import Dashboard from './pages/Dashboard/Dashboard'
import WorkOrders from './pages/WorkOrders/WorkOrders'
import WorkOrderDetail from './pages/WorkOrders/WorkOrderDetail'
import CreateWorkOrder from './pages/WorkOrders/CreateWorkOrder'
import Teams from './pages/Teams/Teams'
import TeamDetail from './pages/Teams/TeamDetail'
import Settings from './pages/Settings/Settings'
import Profile from './pages/Profile/Profile'
import AccessLogs from './pages/AccessLogs/AccessLogs'
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<TokenReceiver />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    )
  }

  return (
    <>
      <Toaster position="top-right" />
      <Layout>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/work-orders" element={<WorkOrders />} />
            <Route path="/work-orders/create" element={<CreateWorkOrder />} />
            <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
          <Route path="/work-orders/:id/edit" element={<CreateWorkOrder />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/access-logs" element={user?.role === 'admin' ? <AccessLogs /> : <Navigate to="/dashboard" replace />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </>
  )
}

export default App