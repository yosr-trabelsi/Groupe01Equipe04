
import { Routes, Route, Navigate } from 'react-router-dom'
import { Tag, Search, ClipboardList, LayoutDashboard, User, MapPin } from 'lucide-react'
import AdminLayout from './components/AdminLayout'
import UserLayout from './components/UserLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/admin/AdminDashboard'
import ManageUsers from './pages/admin/ManageUsers'
import ValidateMerchants from './pages/admin/ValidateMerchants'
import ManageOrders from './pages/admin/ManageOrders'
import Offers from './pages/student/Offers'
import MyOrders from './pages/student/MyOrders'
import StudentDashboard from './pages/student/StudentDashboard'
import CampusRadar from './pages/student/CampusRadar'
import MyOffers from './pages/merchant/MyOffers'
import MerchantOrders from './pages/merchant/MerchantOrders'
import MerchantDashboard from './pages/merchant/MerchantDashboard'
import Profile from './pages/Profile'

const studentLinks = [
  { to: '/student', label: 'Offres', icon: Search, end: true },
  { to: '/student/radar', label: 'Campus Radar', icon: MapPin },
  { to: '/student/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/student/orders', label: 'Mes commandes', icon: ClipboardList },
  { to: '/student/profile', label: 'Mon profil', icon: User },
]

const merchantLinks = [
  { to: '/merchant', label: 'Mes offres', icon: Tag, end: true },
  { to: '/merchant/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/merchant/orders', label: 'Commandes', icon: ClipboardList },
  { to: '/merchant/profile', label: 'Mon profil', icon: User },
]

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="merchants" element={<ValidateMerchants />} />
        <Route path="orders" element={<ManageOrders />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/student" element={<ProtectedRoute role="student"><UserLayout links={studentLinks} /></ProtectedRoute>}>
        <Route index element={<Offers />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="radar" element={<CampusRadar />} />
        <Route path="orders" element={<MyOrders />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/merchant" element={<ProtectedRoute role="merchant"><UserLayout links={merchantLinks} /></ProtectedRoute>}>
        <Route index element={<MyOffers />} />
        <Route path="dashboard" element={<MerchantDashboard />} />
        <Route path="orders" element={<MerchantOrders />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}
