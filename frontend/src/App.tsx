import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';

// Admin Pages
import AdminLayout from './components/layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import Bookings from './pages/admin/Bookings';
import BookingDetail from './pages/admin/BookingDetail';
import Analytics from './pages/admin/Analytics';
import Services from './pages/admin/Services';
import Clients from './pages/admin/Clients';
import CreateUser from './pages/admin/CreateUser';
import Users from './pages/admin/Users';
import Calendar from './pages/admin/Calendar';
import Settings from './pages/admin/Settings';

// Manager Pages
import ManagerLayout from './components/layouts/ManagerLayout';
import ManagerDashboard from './pages/manager/Dashboard';
import Messages from './pages/manager/Messages';
import Chat from './pages/manager/Chat';
import Funnel from './pages/manager/Funnel';
import ManagerSettings from './pages/manager/Settings';

// Employee Pages
import EmployeeLayout from './components/layouts/EmployeeLayout';
import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeProfile from './pages/employee/Profile';

// Public Pages
import PublicLayout from './components/layouts/PublicLayout';
import Home from './pages/public/Home';
import PriceList from './pages/public/PriceList';
import Success from './pages/public/Success';
import Terms from './pages/public/Terms';
import PrivacyPolicy from './pages/public/PrivacyPolicy';
import About from './pages/public/About';
import Contacts from './pages/public/Contacts';
import Cooperation from './pages/public/Cooperation';
import FAQ from './pages/public/FAQ';
import UserCabinet from './pages/public/UserCabinet';

// Auth Pages
import Login from './pages/auth/Login';

export default function App() {
  // Mock authentication - в production это будет работать с Supabase
  const [currentUser, setCurrentUser] = useState<{ role: string; name: string } | null>({
    role: 'admin',
    name: 'Администратор'
  });

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login onLogin={setCurrentUser} />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout user={currentUser} />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="bookings/:id" element={<BookingDetail />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="funnel" element={<Funnel />} />
            <Route path="services" element={<Services />} />
            <Route path="clients" element={<Clients />} />
            <Route path="messages" element={<Messages />} />
            <Route path="chat" element={<Chat />} />
            <Route path="users" element={<Users />} />
            <Route path="users/create" element={<CreateUser />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Manager Routes */}
          <Route path="/manager" element={<ManagerLayout user={currentUser} />}>
            <Route index element={<ManagerDashboard />} />
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="messages" element={<Messages />} />
            <Route path="chat" element={<Chat />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="funnel" element={<Funnel />} />
            <Route path="clients" element={<Clients />} />
            <Route path="settings" element={<ManagerSettings />} />
          </Route>

          {/* Employee Routes */}
          <Route path="/employee" element={<EmployeeLayout user={currentUser} />}>
            <Route index element={<EmployeeDashboard />} />
            <Route path="dashboard" element={<EmployeeDashboard />} />
            <Route path="profile" element={<EmployeeProfile />} />
            <Route path="calendar" element={<Calendar />} />
          </Route>

          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="price-list" element={<PriceList />} />
            <Route path="success" element={<Success />} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy-policy" element={<PrivacyPolicy />} />
            <Route path="about" element={<About />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="cooperation" element={<Cooperation />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="cabinet" element={<UserCabinet />} />
          </Route>

          {/* Redirect to home by default */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}
