// /frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import './i18n';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Lazy load pages
const AdminLayout = React.lazy(() => import('./components/layouts/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const Bookings = React.lazy(() => import('./pages/admin/Bookings'));
const BookingDetail = React.lazy(() => import('./pages/admin/BookingDetail'));
const Analytics = React.lazy(() => import('./pages/admin/Analytics'));
const Services = React.lazy(() => import('./pages/admin/Services'));
const Clients = React.lazy(() => import('./pages/admin/Clients'));
const ClientDetail = React.lazy(() => import('./pages/admin/ClientDetail'));
const CreateUser = React.lazy(() => import('./pages/admin/CreateUser'));
const Users = React.lazy(() => import('./pages/admin/Users'));
const Calendar = React.lazy(() => import('./pages/admin/Calendar'));
const Settings = React.lazy(() => import('./pages/admin/Settings'));
const BotSettings = React.lazy(() => import('./pages/admin/BotSettings'));
const PendingUsers = React.lazy(() => import('./pages/admin/PendingUsers'));
const PermissionManagement = React.lazy(() => import('./pages/admin/PermissionManagement'));
const PlansManagement = React.lazy(() => import('./pages/admin/PlansManagement'));
const PublicContent = React.lazy(() => import('./pages/admin/PublicContent'));
const EmployeeDetail = React.lazy(() => import('./pages/admin/EmployeeDetail'));
const EmployeeManagement = React.lazy(() => import('./pages/admin/EmployeeManagement'));
const VisitorAnalytics = React.lazy(() => import('./pages/admin/VisitorAnalytics'));

const ManagerLayout = React.lazy(() => import('./components/layouts/ManagerLayout'));
const ManagerDashboard = React.lazy(() => import('./pages/manager/Dashboard'));
const Chat = React.lazy(() => import('./pages/manager/Chat'));
const Funnel = React.lazy(() => import('./pages/manager/Funnel'));
const ManagerSettings = React.lazy(() => import('./pages/manager/Settings'));

const SalesLayout = React.lazy(() => import('./components/layouts/SalesLayout'));
const MarketerLayout = React.lazy(() => import('./components/layouts/MarketerLayout'));
const InternalChat = React.lazy(() => import('./components/shared/InternalChat'));

const EmployeeLayout = React.lazy(() => import('./components/layouts/EmployeeLayout'));
const EmployeeDashboard = React.lazy(() => import('./pages/employee/Dashboard'));
const EmployeeProfile = React.lazy(() => import('./pages/employee/Profile'));

const PublicLayout = React.lazy(() => import('./components/layouts/PublicLayout'));
// const Success = React.lazy(() => import('./pages/public/Success'));
// const About = React.lazy(() => import('./pages/public/About'));
// const Contacts = React.lazy(() => import('./pages/public/Contacts'));
// const Cooperation = React.lazy(() => import('./pages/public/Cooperation'));
// const FAQ = React.lazy(() => import('./pages/public/FAQ'));
const EditUser = React.lazy(() => import('./pages/admin/EditUser'));
// const UserCabinet = React.lazy(() => import('./pages/public/UserCabinet'));
// const DataDeletion = React.lazy(() => import('./pages/public/DataDeletion'));
// const Booking = React.lazy(() => import('./pages/public/Booking'));
// const ClientCabinet = React.lazy(() => import('./pages/public/ClientCabinet'));
// const RateUs = React.lazy(() => import('./pages/public/RateUs'));

// New Public Landing Pages
// New Public Landing Pages - Lazy Loaded
const LandingPage = React.lazy(() => import('../public_landing/pages/LandingPage').then(module => ({ default: module.LandingPage })));
const PrivacyPolicyNew = React.lazy(() => import('../public_landing/pages/public_landing__PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const TermsOfUseNew = React.lazy(() => import('../public_landing/pages/public_landing__TermsOfUse').then(module => ({ default: module.TermsOfUse })));
const ServiceDetail = React.lazy(() => import('../public_landing/pages/ServiceDetail').then(module => ({ default: module.ServiceDetail })));
const DataDeletionNew = React.lazy(() => import('../public_landing/pages/DataDeletion').then(module => ({ default: module.DataDeletion })));

const Login = React.lazy(() => import('./pages/auth/Login'));
const Register = React.lazy(() => import('./pages/auth/Register'));
const VerifyEmail = React.lazy(() => import('./pages/auth/VerifyEmail'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/auth/ResetPassword'));

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

  // Разрешаем директору заходить на /admin
  const allowedRoles = requiredRole ? [requiredRole] : [];
  if (requiredRole === 'admin') {
    allowedRoles.push('director'); // Директор имеет доступ к admin панели
  }

  if (requiredRole && !allowedRoles.includes(currentRole || '')) {
    // Редирект на панель в зависимости от роли
    if (currentRole === 'director') return <Navigate to="/admin/dashboard" replace />;
    if (currentRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (currentRole === 'manager') return <Navigate to="/manager/dashboard" replace />;
    if (currentRole === 'sales') return <Navigate to="/sales/clients" replace />;
    if (currentRole === 'employee') return <Navigate to="/employee/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{element}</>;
};

export default function App() {
  const { user: currentUser, isLoading, logout } = useAuth();

  const handleLogout = () => {
    logout();
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
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <React.Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="inline-block animate-spin">
                  <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full"></div>
                </div>
                <p className="mt-4 text-gray-600">Загрузка...</p>
              </div>
            </div>
          }>
            <Routes>
              {/* Auth Routes */}
              <Route
                path="/login"
                element={
                  currentUser ? (
                    // ✅ ОБНОВИ РЕДИРЕКТ
                    currentUser.role === 'director' ? <Navigate to="/admin/dashboard" replace /> :
                      currentUser.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> :
                        currentUser.role === 'manager' ? <Navigate to="/manager/dashboard" replace /> :
                          currentUser.role === 'sales' ? <Navigate to="/sales/clients" replace /> :
                            currentUser.role === 'marketer' ? <Navigate to="/marketer/analytics" replace /> :
                              currentUser.role === 'employee' ? <Navigate to="/employee/dashboard" replace /> :
                                <Navigate to="/" replace />
                  ) : (
                    <Login />
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

              <Route
                path="/verify-email"
                element={<VerifyEmail />}
              />

              <Route
                path="/forgot-password"
                element={<ForgotPassword />}
              />

              <Route
                path="/reset-password"
                element={<ResetPassword />}
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
                <Route path="users/:id" element={<EmployeeDetail />} />
                <Route path="employees" element={<EmployeeManagement />} />
                <Route path="employees/:id" element={<EmployeeManagement />} />
                <Route path="users/create" element={<CreateUser />} />
                <Route path="users/pending" element={<PendingUsers />} />
                <Route path="users/permissions" element={<PermissionManagement />} />
                <Route path="users/:identifier/edit" element={<EditUser />} />
                <Route path="plans" element={<PlansManagement />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="settings" element={<Settings />} />
                <Route path="bot-settings" element={<BotSettings />} />
                <Route path="public-content" element={<PublicContent />} />
                <Route path="visitor-analytics" element={<VisitorAnalytics />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
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

              {/* New Public Routes (Standalone) */}
              <Route element={<Outlet />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/service/:category" element={<ServiceDetail />} />
                <Route path="/terms" element={<TermsOfUseNew />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyNew />} />
                <Route path="/data-deletion" element={<DataDeletionNew />} />
              </Route>

              {/* Public Routes using PublicLayout - COMMENTED OUT: files don't exist */}
              {/* <Route element={<PublicLayout />}>
                <Route path="booking" element={<Booking />} />
                <Route path="client/cabinet" element={<ClientCabinet />} />
                <Route path="success" element={<Success />} />
                <Route path="about" element={<About />} />
                <Route path="contacts" element={<Contacts />} />
                <Route path="cooperation" element={<Cooperation />} />
                <Route path="faq" element={<FAQ />} />
                <Route path="data-deletion" element={<DataDeletion />} />
                <Route path="rate-us" element={<RateUs />} />
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
              </Route> */}

              {/* Redirect to home by default */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
          <Toaster />
        </div>
      </Router>
    </ThemeProvider>
  );
}