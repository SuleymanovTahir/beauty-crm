// /frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import './i18n';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Lazy load pages
const MainLayout = React.lazy(() => import('./components/layouts/MainLayout'));
const Dashboard = React.lazy(() => import('./pages/shared/Dashboard'));
const Bookings = React.lazy(() => import('./pages/admin/Bookings'));
const BookingDetail = React.lazy(() => import('./pages/admin/BookingDetail'));
const Analytics = React.lazy(() => import('./pages/admin/Analytics'));
const Services = React.lazy(() => import('./pages/admin/Services'));
const Clients = React.lazy(() => import('./pages/admin/Clients'));
const ClientDetail = React.lazy(() => import('./pages/admin/ClientDetail'));
const CreateUser = React.lazy(() => import('./pages/admin/CreateUser'));
const Users = React.lazy(() => import('./pages/admin/Users'));
const Calendar = React.lazy(() => import('./pages/admin/Calendar'));
const Settings = React.lazy(() => import('./pages/shared/Settings'));
const BotSettings = React.lazy(() => import('./pages/admin/BotSettings'));
const PendingRegistrations = React.lazy(() => import('./pages/admin/PendingRegistrations'));
const PermissionManagement = React.lazy(() => import('./pages/admin/PermissionManagement'));
const PlansManagement = React.lazy(() => import('./pages/admin/PlansManagement'));
const PublicContent = React.lazy(() => import('./pages/admin/PublicContent'));
const EmployeeDetail = React.lazy(() => import('./pages/admin/EmployeeDetail'));
const EmployeeManagement = React.lazy(() => import('./pages/admin/EmployeeManagement'));
const VisitorAnalytics = React.lazy(() => import('./pages/admin/VisitorAnalytics'));
const Funnel = React.lazy(() => import('./pages/shared/Funnel'));
const AdminTasks = React.lazy(() => import('./pages/admin/Tasks'));
const Telephony = React.lazy(() => import('./pages/admin/Telephony'));
const MenuCustomization = React.lazy(() => import('./pages/admin/MenuCustomization'));
const TrashBin = React.lazy(() => import('@/pages/admin/TrashBin'));
const AuditLog = React.lazy(() => import('@/pages/admin/AuditLog'));

// Admin Panel pages
const AdminPanelLayout = React.lazy(() => import('./components/layouts/AdminPanelLayout'));
const AdminPanelDashboard = React.lazy(() => import('./pages/adminPanel/Dashboard'));
const LoyaltyManagement = React.lazy(() => import('./pages/adminPanel/LoyaltyManagement'));
const ReferralProgram = React.lazy(() => import('./pages/adminPanel/ReferralProgram'));
const Challenges = React.lazy(() => import('./pages/adminPanel/Challenges'));
const NotificationsDashboard = React.lazy(() => import('./pages/adminPanel/NotificationsDashboard'));

const PhotoGallery = React.lazy(() => import('./pages/adminPanel/PhotoGallery'));
const FeatureManagement = React.lazy(() => import('./pages/adminPanel/FeatureManagement'));

const Chat = React.lazy(() => import('./pages/manager/Chat'));
const InternalChat = React.lazy(() => import('./components/shared/InternalChat'));
const Broadcasts = React.lazy(() => import('./pages/admin/Broadcasts'));

// Employee routes
const EmployeeProfile = React.lazy(() => import('./pages/employee/Profile'));
const EmployeeTasks = React.lazy(() => import('./pages/employee/Tasks'));
const EmployeeBookings = React.lazy(() => import('./pages/employee/Bookings'));
const EmployeeServices = React.lazy(() => import('./pages/employee/Services'));
const EmployeeDashboard = React.lazy(() => import('./pages/employee/Dashboard'));

// const PublicLayout = React.lazy(() => import('./components/layouts/PublicLayout'));
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
const PrivacyPolicyNew = React.lazy(() => import('../public_landing/pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const TermsOfUseNew = React.lazy(() => import('../public_landing/pages/TermsOfUse').then(module => ({ default: module.TermsOfUse })));
const ServiceDetail = React.lazy(() => import('../public_landing/pages/ServiceDetail').then(module => ({ default: module.ServiceDetail })));
const AccountPage = React.lazy(() => import('../public_landing/pages/account/AccountPage').then(module => ({ default: module.AccountPage })));
const UserBookingWizard = React.lazy(() => import('../public_landing/pages/account/UserBookingWizard').then(module => ({ default: module.UserBookingWizard })));
const DataDeletionNew = React.lazy(() => import('../public_landing/pages/DataDeletion'));

const Login = React.lazy(() => import('../public_landing/pages/LoginPage').then(module => ({ default: module.LoginPage })));
const AdminLogin = React.lazy(() => import('./pages/auth/Login'));
const AdminRegister = React.lazy(() => import('./pages/auth/Register'));
const VerifyEmail = React.lazy(() => import('./pages/auth/VerifyEmail'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/auth/ResetPassword'));

interface ProtectedRouteProps {
  element: React.ReactNode;
  isAuthenticated: boolean;
  requiredRole?: string;
  currentRole?: string;
  currentUsername?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  element,
  isAuthenticated,
  requiredRole,
  currentRole,
  currentUsername
}) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ИСКЛЮЧЕНИЕ: Пользователь Tahir имеет доступ ко всему
  const isTahir = currentUsername?.toLowerCase() === 'tahir';

  // CRITICAL: Блокировать клиентов от доступа к CRM/админке
  // Клиенты имеют доступ только к личному кабинету /account
  // ИСКЛЮЧЕНИЕ: Tahir имеет полный доступ даже с ролью client
  if (currentRole === 'client' && !isTahir) {
    return <Navigate to="/account" replace />;
  }

  // Разрешаем директору заходить на /crm
  const allowedRoles = requiredRole ? [requiredRole] : [];
  if (requiredRole === 'admin') {
    allowedRoles.push('director'); // Директор имеет доступ к crm панели
  }

  if (requiredRole && !allowedRoles.includes(currentRole || '')) {
    // Редирект на панель в зависимости от роли
    if (currentRole === 'director') return <Navigate to="/crm/dashboard" replace />;
    if (currentRole === 'admin') return <Navigate to="/crm/dashboard" replace />;
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
                    // ✅ Редирект в зависимости от роли
                    currentUser.role === 'director' ? <Navigate to="/crm/dashboard" replace /> :
                      currentUser.role === 'admin' ? <Navigate to="/crm/dashboard" replace /> :
                        currentUser.role === 'manager' ? <Navigate to="/manager/dashboard" replace /> :
                          currentUser.role === 'sales' ? <Navigate to="/sales/clients" replace /> :
                            currentUser.role === 'marketer' ? <Navigate to="/marketer/analytics" replace /> :
                              currentUser.role === 'employee' ? <Navigate to="/employee/dashboard" replace /> :
                                currentUser.role === 'client' ? <Navigate to="/account" replace /> :
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
                    <Navigate to="/crm/dashboard" replace />
                  ) : (
                    <Login initialView="register" />
                  )
                }
              />

              <Route
                path="/crm/login"
                element={
                  currentUser ? (
                    <Navigate to="/crm/dashboard" replace />
                  ) : (
                    <AdminLogin />
                  )
                }
              />

              <Route
                path="/crm/register"
                element={
                  currentUser ? (
                    <Navigate to="/crm/dashboard" replace />
                  ) : (
                    <AdminRegister />
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

              {/* Admin Panel Routes - For managing users/loyalty */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute
                    isAuthenticated={!!currentUser}
                    requiredRole="admin"
                    currentRole={currentUser?.role}
                    currentUsername={currentUser?.username}
                    element={
                      <AdminPanelLayout
                        user={currentUser}
                        onLogout={handleLogout}
                      />
                    }
                  />
                }
              >
                <Route path="dashboard" element={<AdminPanelDashboard />} />
                <Route path="loyalty" element={<LoyaltyManagement />} />
                <Route path="referrals" element={<ReferralProgram />} />
                <Route path="challenges" element={<Challenges />} />
                <Route path="notifications" element={<NotificationsDashboard />} />
                <Route path="features" element={<FeatureManagement />} />
                <Route path="gallery" element={<PhotoGallery />} />
                <Route path="services" element={<Services />} />
                <Route path="public-content/:tab?" element={<PublicContent />} />
                <Route path="users" element={<Users />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
              </Route>

              {/* CRM Routes - Protected */}
              <Route
                path="/crm/*"
                element={
                  <ProtectedRoute
                    isAuthenticated={!!currentUser}
                    requiredRole="admin"
                    currentRole={currentUser?.role}
                    currentUsername={currentUser?.username}
                    element={
                      <MainLayout
                        user={currentUser}
                        onLogout={handleLogout}
                      />
                    }
                  />
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="bookings/:id" element={<BookingDetail />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="services" element={<Services />} />
                <Route path="clients" element={<Clients />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="chat" element={<Chat />} />
                <Route path="users" element={<Users />} />
                <Route path="users/create" element={<CreateUser />} />
                <Route path="users/pending" element={<PendingRegistrations />} />
                <Route path="users/permissions" element={<PermissionManagement />} />
                <Route path="users/:identifier/edit" element={<EditUser />} />
                <Route path="users/:id/:tab?" element={<EmployeeDetail />} />
                <Route path="employees" element={<EmployeeManagement />} />
                <Route path="employees/:id" element={<EmployeeManagement />} />
                <Route path="plans" element={<PlansManagement />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="settings/:tab?" element={<Settings />} />
                <Route path="bot-settings/:tab?" element={<BotSettings />} />
                <Route path="public-content/:tab?" element={<PublicContent />} />
                <Route path="visitor-analytics" element={<VisitorAnalytics />} />
                <Route path="funnel" element={<Funnel />} />
                <Route path="tasks" element={<AdminTasks />} />
                <Route path="telephony" element={<Telephony />} />
                <Route path="menu-customization" element={<MenuCustomization />} />
                <Route path="trash" element={<TrashBin />} />
                <Route path="audit-log" element={<ProtectedRoute element={<AuditLog />} isAuthenticated={!!currentUser} requiredRole="director" currentRole={currentUser?.role} />} />
                <Route path="internal-chat" element={<InternalChat />} />
                <Route path="broadcasts" element={<Broadcasts />} />
              </Route>

              {/* Manager Routes - Protected */}
              <Route
                path="/manager/*"
                element={
                  <ProtectedRoute
                    isAuthenticated={!!currentUser}
                    requiredRole="manager"
                    currentRole={currentUser?.role}
                    currentUsername={currentUser?.username}
                    element={
                      <MainLayout
                        user={currentUser}
                        onLogout={handleLogout}
                      />
                    }
                  />
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="chat" element={<Chat />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="settings/:tab?" element={<Settings />} />
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
                    currentUsername={currentUser?.username}
                    element={
                      <MainLayout
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
                    currentUsername={currentUser?.username}
                    element={
                      <MainLayout
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
                    currentUsername={currentUser?.username}
                    element={
                      <MainLayout
                        user={currentUser}
                        onLogout={handleLogout}
                      />
                    }
                  />
                }
              >
                <Route path="dashboard" element={<EmployeeDashboard />} />
                <Route path="profile" element={<EmployeeProfile />} />
                <Route path="settings" element={<Navigate to="/employee/profile" replace />} />
                <Route path="calendar" element={<Calendar employeeFilter={true} />} />
                <Route path="bookings" element={<EmployeeBookings />} />
                <Route path="tasks" element={<EmployeeTasks />} />
                <Route path="services" element={<EmployeeServices />} />
                <Route path="internal-chat" element={<InternalChat />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
              </Route>

              {/* New Public Routes (Standalone) */}
              <Route element={<Outlet />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/service/:category" element={<ServiceDetail />} />
                <Route path="/terms" element={<TermsOfUseNew />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyNew />} />
                <Route path="/data-deletion" element={<DataDeletionNew />} />
                <Route
                  path="/account/*"
                  element={currentUser ? <AccountPage /> : <Navigate to="/login" replace />}
                />
                <Route path="/new-booking" element={<UserBookingWizard />} />
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
                      currentUser.role === 'admin' ? <Navigate to="/crm/dashboard" replace /> :
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