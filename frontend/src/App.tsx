import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import './i18n';

// Admin Pages
import AdminLayout from './components/layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import Bookings from './pages/admin/Bookings';
import BookingDetail from './pages/admin/BookingDetail';
import Analytics from './pages/admin/Analytics';
import Services from './pages/admin/Services';
import Clients from './pages/admin/Clients';
import ClientDetail from './pages/admin/ClientDetail';
import CreateUser from './pages/admin/CreateUser';
import Users from './pages/admin/Users';
import Calendar from './pages/admin/Calendar';
import Settings from './pages/admin/Settings';
import BotSettings from './pages/admin/BotSettings';
import PendingUsers from './pages/admin/PendingUsers';
import PermissionManagement from './pages/admin/PermissionManagement';
import Broadcasts from './pages/admin/Broadcasts';

// Manager Pages
import ManagerLayout from './components/layouts/ManagerLayout';
import ManagerDashboard from './pages/manager/Dashboard';
import Chat from './pages/manager/Chat';
import Funnel from './pages/manager/Funnel';
import ManagerSettings from './pages/manager/Settings';

import SalesLayout from './components/layouts/SalesLayout';
import MarketerLayout from './components/layouts/MarketerLayout';
import InternalChat from './components/shared/InternalChat';

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
import Team from './pages/public/Team';
import EditUser from './pages/admin/EditUser';
import UserCabinet from './pages/public/UserCabinet';
import DataDeletion from './pages/public/DataDeletion';
import Booking from './pages/public/Booking';
import ClientCabinet from './pages/public/ClientCabinet';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

interface CurrentUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

interface ProtectedRouteProps {
  element: React.ReactNode;
  isAuthenticated: boolean;
  requiredRole?: string;
  currentRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  element, 
  isAuthenticated, 
  requiredRole,
  currentRole 
}) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentRole !== requiredRole) {
    // Редирект на панель в зависимости от роли
    if (currentRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (currentRole === 'manager') return <Navigate to="/manager/dashboard" replace />;
    if (currentRole === 'employee') return <Navigate to="/employee/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{element}</>;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Проверяем авторизацию при загрузке приложения
  useEffect(() => {
    const checkAuth = () => {
      try {
        const savedToken = localStorage.getItem('session_token');
        const savedUser = localStorage.getItem('user');

        if (savedToken && savedUser) {
          const user = JSON.parse(savedUser);
          setCurrentUser({
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role
          });
        }
      } catch (err) {
        console.error('Auth check error:', err);
        localStorage.removeItem('session_token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (user: User) => {
    const userData = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role
    };
    setCurrentUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full"></div>
          </div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Auth Routes */}
          <Route
            path="/login"
            element={
              currentUser ? (
                // ✅ ОБНОВИ РЕДИРЕКТ
                currentUser.role === 'director' ? <Navigate to="/admin/dashboard" replace /> :
                currentUser.role === 'director' ? <Navigate to="/admin/dashboard" replace /> :
                currentUser.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> :
                currentUser.role === 'manager' ? <Navigate to="/manager/dashboard" replace /> :
                currentUser.role === 'sales' ? <Navigate to="/sales/clients" replace /> :
                currentUser.role === 'marketer' ? <Navigate to="/marketer/analytics" replace /> :
                currentUser.role === 'employee' ? <Navigate to="/employee/dashboard" replace /> :
                <Navigate to="/" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />

          <Route
            path="/register"
            element={
              currentUser ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <Register />
              )
            }
          />

          {/* Admin Routes - Protected */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute
                isAuthenticated={!!currentUser}
                requiredRole="admin"
                currentRole={currentUser?.role}
                element={
                  <AdminLayout 
                    user={currentUser} 
                    onLogout={handleLogout}
                  />
                }
              />
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="bookings/:id" element={<BookingDetail />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="funnel" element={<Funnel />} />
            <Route path="services" element={<Services />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="chat" element={<Chat />} />
            <Route path="users" element={<Users />} />
            <Route path="users/create" element={<CreateUser />} />
            <Route path="users/pending" element={<PendingUsers />} />
            <Route path="users/permissions" element={<PermissionManagement />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="settings" element={<Settings />} />
            <Route path="bot-settings" element={<BotSettings />} />
            <Route path="broadcasts" element={<Broadcasts />} />
            <Route path="" element={<Navigate to="dashboard" replace />} />
            <Route path="users/:id/edit" element={<EditUser />} />
          </Route>

          {/* Manager Routes - Protected */}
          <Route 
            path="/manager/*" 
            element={
              <ProtectedRoute
                isAuthenticated={!!currentUser}
                requiredRole="manager"
                currentRole={currentUser?.role}
                element={
                  <ManagerLayout 
                    user={currentUser}
                    onLogout={handleLogout}
                  />
                }
              />
            }
          >
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="chat" element={<Chat />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="funnel" element={<Funnel />} />
            <Route path="clients" element={<Clients />} />
            <Route path="settings" element={<ManagerSettings />} />
            <Route path="bot-settings" element={<BotSettings />} />
            <Route path="" element={<Navigate to="dashboard" replace />} />
          </Route>

           {/* Sales Routes - Protected */}
           <Route 
            path="/sales/*" 
            element={
              <ProtectedRoute
                isAuthenticated={!!currentUser}
                requiredRole="sales"
                currentRole={currentUser?.role}
                element={
                  <SalesLayout 
                    user={currentUser}
                    onLogout={handleLogout}
                  />
                }
              />
            }
          >
            <Route path="clients" element={<Clients />} />
            <Route path="chat" element={<Chat />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="internal-chat" element={<InternalChat />} />
            <Route path="" element={<Navigate to="clients" replace />} />
          </Route>

          {/* Marketer Routes - Protected */}
          <Route 
            path="/marketer/*" 
            element={
              <ProtectedRoute
                isAuthenticated={!!currentUser}
                requiredRole="marketer"
                currentRole={currentUser?.role}
                element={
                  <MarketerLayout 
                    user={currentUser}
                    onLogout={handleLogout}
                  />
                }
              />
            }
          >
            <Route path="analytics" element={<Analytics />} />
            <Route path="internal-chat" element={<InternalChat />} />
            <Route path="" element={<Navigate to="analytics" replace />} />
          </Route>

          {/* Employee Routes - Protected */}
          <Route 
            path="/employee/*" 
            element={
              <ProtectedRoute
                isAuthenticated={!!currentUser}
                requiredRole="employee"
                currentRole={currentUser?.role}
                element={
                  <EmployeeLayout 
                    user={currentUser}
                    onLogout={handleLogout}
                  />
                }
              />
            }
          >
            <Route path="dashboard" element={<EmployeeDashboard />} />
            <Route path="profile" element={<EmployeeProfile />} />
            <Route path="calendar" element={<Calendar employeeFilter={true} />} />
            <Route path="" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="price-list" element={<PriceList />} />
            <Route path="team" element={<Team />} />
            <Route path="booking" element={<Booking />} />
            <Route path="client/cabinet" element={<ClientCabinet />} />
            <Route path="success" element={<Success />} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy-policy" element={<PrivacyPolicy />} />
            <Route path="about" element={<About />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="cooperation" element={<Cooperation />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="data-deletion" element={<DataDeletion />} />
            <Route
              path="cabinet"
              element={
                currentUser ? (
                  currentUser.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> :
                  currentUser.role === 'manager' ? <Navigate to="/manager/dashboard" replace /> :
                  currentUser.role === 'employee' ? <Navigate to="/employee/dashboard" replace /> :
                  <Navigate to="/" replace />
                ) : (
                  <UserCabinet />
                )
              }
            />
          </Route>

          {/* Redirect to home by default */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}