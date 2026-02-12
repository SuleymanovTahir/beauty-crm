// /frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from './components/ui/sonner';
import './i18n';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Lazy load pages
const UniversalLayout = React.lazy(() => import('./components/layouts/UniversalLayout'));
const Dashboard = React.lazy(() => import('./pages/shared/Dashboard'));
const Bookings = React.lazy(() => import('./pages/shared/Bookings'));
const BookingDetail = React.lazy(() => import('./pages/admin/BookingDetail'));
const Analytics = React.lazy(() => import('./pages/admin/Analytics'));
const Services = React.lazy(() => import('./pages/shared/Services'));
const Clients = React.lazy(() => import('./pages/admin/Clients'));
const ClientDetail = React.lazy(() => import('./pages/admin/ClientDetail'));
const CreateUser = React.lazy(() => import('./pages/admin/CreateUser'));
const Team = React.lazy(() => import('./pages/shared/Team'));
const Calendar = React.lazy(() => import('./pages/admin/Calendar'));
const Settings = React.lazy(() => import('./pages/shared/Settings'));
const BotSettings = React.lazy(() => import('./pages/admin/BotSettings'));
const PendingRegistrations = React.lazy(() => import('./pages/admin/PendingRegistrations'));
const PermissionManagement = React.lazy(() => import('./pages/admin/PermissionManagement'));
const PlansManagement = React.lazy(() => import('./pages/admin/PlansManagement'));
const PublicContent = React.lazy(() => import('./pages/admin/PublicContent'));
const EmployeeDetail = React.lazy(() => import('./pages/admin/EmployeeDetail'));
const VisitorAnalytics = React.lazy(() => import('./pages/admin/VisitorAnalytics'));
const Funnel = React.lazy(() => import('./pages/shared/Funnel'));
const UniversalTasks = React.lazy(() => import('./pages/shared/Tasks'));
const Telephony = React.lazy(() => import('./pages/admin/Telephony'));
const MenuCustomization = React.lazy(() => import('./pages/admin/MenuCustomization'));
const TrashBin = React.lazy(() => import('@/pages/admin/TrashBin'));
const AuditLog = React.lazy(() => import('@/pages/admin/AuditLog'));
const Contracts = React.lazy(() => import('./pages/admin/Contracts'));
const Products = React.lazy(() => import('./pages/admin/Products'));
const Invoices = React.lazy(() => import('./pages/admin/Invoices'));
const PaymentIntegrations = React.lazy(() => import('./pages/admin/PaymentIntegrations'));
const MarketplaceIntegrations = React.lazy(() => import('./pages/admin/MarketplaceIntegrations'));
const Messengers = React.lazy(() => import('./pages/admin/Messengers'));
const UniversalReferrals = React.lazy(() => import('./pages/shared/Referrals'));
const UniversalChallenges = React.lazy(() => import('./pages/shared/Challenges'));
const ServiceChangeRequests = React.lazy(() => import('./pages/admin/ServiceChangeRequests'));

// Aliases for shared components across roles
const CRMTasks = UniversalTasks;
const CRMServices = Services;
const CRMBookings = Bookings;
const CRMCalendar = Calendar;
const CRMClients = Clients;


// Admin Panel pages
const AdminPanelDashboard = React.lazy(() => import('./pages/adminPanel/Dashboard'));
const LoyaltyManagement = React.lazy(() => import('./pages/adminPanel/LoyaltyManagement'));
// ReferralProgram is now shared as UniversalReferrals
// Challenges is now shared as UniversalChallenges
const NotificationsDashboard = React.lazy(() => import('./pages/adminPanel/NotificationsDashboard'));

const PhotoGallery = React.lazy(() => import('./pages/adminPanel/PhotoGallery'));
const FeatureManagement = React.lazy(() => import('./pages/adminPanel/FeatureManagement'));

const Chat = React.lazy(() => import('./pages/shared/Chat'));
const InternalChat = React.lazy(() => import('./components/shared/InternalChat'));
const NotificationsPage = React.lazy(() => import('./pages/common/Notifications'));

const Broadcasts = React.lazy(() => import('./pages/admin/Broadcasts'));
const PromoCodes = React.lazy(() => import('./pages/admin/PromoCodes'));
const SpecialPackages = React.lazy(() => import('./pages/admin/SpecialPackages'));

// Employee routes
const UniversalProfile = React.lazy(() => import('./pages/shared/Profile'));
// Task component is now shared as UniversalTasks

// New Public Landing Pages - Lazy Loaded
const LandingPage = React.lazy(() => import('../public_landing/pages/LandingPage').then(module => ({ default: module.LandingPage })));
const PrivacyPolicyNew = React.lazy(() => import('../public_landing/pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const TermsOfUseNew = React.lazy(() => import('../public_landing/pages/TermsOfUse').then(module => ({ default: module.TermsOfUse })));
const ServiceDetail = React.lazy(() => import('../public_landing/pages/ServiceDetail').then(module => ({ default: module.ServiceDetail })));
const ProcedureDetail = React.lazy(() => import('../public_landing/pages/ProcedureDetail').then(module => ({ default: module.ProcedureDetail })));
const AccountPage = React.lazy(() => import('../public_landing/pages/account/AccountPage').then(module => ({ default: module.AccountPage })));
const UserBookingWizard = React.lazy(() => import('../public_landing/pages/account/UserBookingWizard').then(module => ({ default: module.UserBookingWizard })));
const DataDeletionNew = React.lazy(() => import('../public_landing/pages/DataDeletion'));
const Unsubscribe = React.lazy(() => import('./pages/public/Unsubscribe'));
const NotFound = React.lazy(() => import('../public_landing/pages/NotFound').then(module => ({ default: module.NotFound })));
const EditUser = React.lazy(() => import('./pages/admin/EditUser'));

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
  secondaryRole?: string;
}

const normalizeRole = (inputRole?: string): string => {
  if (!inputRole) {
    return '';
  }
  if (inputRole === 'saler') {
    return 'sales';
  }
  return inputRole;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  element,
  isAuthenticated,
  requiredRole,
  currentRole,
  currentUsername,
  secondaryRole
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

  const hasRequiredRole = (role?: string, secondaryRole?: string) => {
    if (!requiredRole) return true;
    const normalizedRequiredRole = normalizeRole(requiredRole);
    const allowed = normalizedRequiredRole === 'admin' ? ['admin', 'director'] : [normalizedRequiredRole];
    const normalizedRole = normalizeRole(role);
    const normalizedSecondaryRole = normalizeRole(secondaryRole);

    return [normalizedRole, normalizedSecondaryRole].some((roleKey) => allowed.includes(roleKey));
  };

  if (requiredRole && !hasRequiredRole(currentRole, secondaryRole)) {
    // Редирект на панель в зависимости от роли (приоритет основной роли)
    if (currentRole === 'director') return <Navigate to="/crm/dashboard" replace />;
    if (currentRole === 'admin') return <Navigate to="/crm/dashboard" replace />;
    if (currentRole === 'manager') return <Navigate to="/manager/dashboard" replace />;
    if (normalizeRole(currentRole) === 'sales') return <Navigate to="/sales/clients" replace />;
    if (currentRole === 'marketer') return <Navigate to="/marketer/analytics" replace />;
    if (currentRole === 'employee') return <Navigate to="/employee/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{element}</>;
};

export default function App() {
  const { t } = useTranslation('common');
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
          <p className="mt-4 text-gray-600">{t('loading')}</p>
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
                <p className="mt-4 text-gray-600">{t('loading')}</p>
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
                          normalizeRole(currentUser.role) === 'sales' ? <Navigate to="/sales/clients" replace /> :
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
                    secondaryRole={currentUser?.secondary_role}
                    element={
                      <UniversalLayout
                        user={currentUser}
                        onLogout={handleLogout}
                      />
                    }
                  />
                }
              >
                <Route path="dashboard" element={<AdminPanelDashboard />} />
                <Route path="loyalty" element={<LoyaltyManagement />} />
                <Route path="referrals" element={<UniversalReferrals />} />
                <Route path="challenges" element={<UniversalChallenges />} />
                <Route path="notifications" element={<NotificationsDashboard />} />
                <Route path="features" element={<FeatureManagement />} />
                <Route path="gallery" element={<PhotoGallery />} />
                <Route path="services" element={<Services />} />
                <Route path="public-content/:tab?" element={<PublicContent />} />
                <Route path="team" element={<Team />} />
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
                    secondaryRole={currentUser?.secondary_role}
                    element={
                      <UniversalLayout
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
                <Route path="team" element={<Team />} />
                <Route path="team/create" element={<CreateUser />} />
                <Route path="team/pending" element={<PendingRegistrations />} />
                <Route path="team/permissions" element={<PermissionManagement />} />
                <Route path="team/:identifier/edit" element={<EditUser />} />
                <Route path="team/:id/:tab?" element={<EmployeeDetail />} />
                <Route path="profile" element={<UniversalProfile />} />

                <Route path="plans" element={<PlansManagement />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="settings/:tab?" element={<Settings />} />
                <Route path="bot-settings/:tab?" element={<BotSettings />} />
                <Route path="public-content/:tab?" element={<PublicContent />} />
                <Route path="visitor-analytics" element={<VisitorAnalytics />} />
                <Route path="funnel" element={<Funnel />} />
                <Route path="tasks" element={<UniversalTasks />} />
                <Route path="telephony" element={<Telephony />} />
                <Route path="menu-customization" element={<MenuCustomization />} />
                <Route path="trash" element={<TrashBin />} />
                <Route path="audit-log" element={<ProtectedRoute element={<AuditLog />} isAuthenticated={!!currentUser} requiredRole="director" currentRole={currentUser?.role} />} />
                <Route path="internal-chat" element={<InternalChat />} />
                <Route path="broadcasts" element={<Broadcasts />} />
                <Route path="promo-codes" element={<PromoCodes />} />
                <Route path="special-packages" element={<SpecialPackages />} />
                <Route path="contracts" element={<Contracts />} />
                <Route path="products" element={<Products />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="messengers" element={<Messengers />} />
                <Route path="payment-integrations" element={<PaymentIntegrations />} />
                <Route path="marketplace-integrations" element={<MarketplaceIntegrations />} />
                <Route path="referrals" element={<SpecialPackages entryMode="referrals-only" />} />
                <Route path="challenges" element={<UniversalChallenges />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="service-change-requests" element={<ServiceChangeRequests />} />
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
                    currentUsername={currentUser?.username}
                    secondaryRole={currentUser?.secondary_role}
                    element={
                      <UniversalLayout
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
                <Route path="team" element={<Team />} />
                <Route path="team/:id" element={<Team />} />
                <Route path="messengers" element={<Messengers />} />
                <Route path="settings/:tab?" element={<Settings />} />
                <Route path="bot-settings" element={<BotSettings />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="tasks" element={<CRMTasks />} />
                <Route path="services" element={<CRMServices />} />
                <Route path="bookings" element={<CRMBookings />} />
                <Route path="calendar" element={<CRMCalendar />} />
                <Route path="clients" element={<CRMClients />} />
                <Route path="internal-chat" element={<InternalChat />} />
                <Route path="promo-codes" element={<PromoCodes />} />
                <Route path="special-packages" element={<SpecialPackages />} />
                <Route path="visitor-analytics" element={<VisitorAnalytics />} />
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
                    secondaryRole={currentUser?.secondary_role}
                    element={
                      <UniversalLayout
                        user={currentUser}
                        onLogout={handleLogout}
                      />
                    }
                  />
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="clients" element={<Clients />} />
                <Route path="bookings" element={<CRMBookings />} />
                <Route path="calendar" element={<CRMCalendar />} />
                <Route path="chat" element={<Chat />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="funnel" element={<Funnel />} />
                <Route path="tasks" element={<CRMTasks />} />
                <Route path="services" element={<CRMServices />} />
                <Route path="internal-chat" element={<InternalChat />} />
                <Route path="promo-codes" element={<PromoCodes />} />
                <Route path="special-packages" element={<SpecialPackages />} />
                <Route path="messengers" element={<Messengers />} />
                <Route path="bot-settings" element={<BotSettings />} />
                <Route path="settings" element={<Settings />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="" element={<Navigate to="clients" replace />} />
              </Route>

              {/* Legacy saler path redirect */}
              <Route
                path="/saler/*"
                element={<Navigate to="/sales/clients" replace />}
              />

              {/* Marketer Routes - Protected */}
              <Route
                path="/marketer/*"
                element={
                  <ProtectedRoute
                    isAuthenticated={!!currentUser}
                    requiredRole="marketer"
                    currentRole={currentUser?.role}
                    currentUsername={currentUser?.username}
                    secondaryRole={currentUser?.secondary_role}
                    element={
                      <UniversalLayout
                        user={currentUser}
                        onLogout={handleLogout}
                      />
                    }
                  />
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="visitor-analytics" element={<VisitorAnalytics />} />
                <Route path="funnel" element={<Funnel />} />
                <Route path="clients" element={<Clients />} />
                <Route path="tasks" element={<CRMTasks />} />
                <Route path="services" element={<CRMServices />} />
                <Route path="internal-chat" element={<InternalChat />} />
                <Route path="promo-codes" element={<PromoCodes />} />
                <Route path="special-packages" element={<SpecialPackages />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings/:tab?" element={<Settings />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
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
                    secondaryRole={currentUser?.secondary_role}
                    element={
                      <UniversalLayout
                        user={currentUser}
                        onLogout={handleLogout}
                      />
                    }
                  />
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<UniversalProfile />} />
                <Route path="settings" element={<Settings />} />
                <Route path="calendar" element={<Calendar employeeFilter={true} />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="tasks" element={<UniversalTasks />} />
                <Route path="services" element={<Services />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="internal-chat" element={<InternalChat />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
              </Route>

              {/* New Public Routes (Standalone) */}
              <Route element={<Outlet />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/service/:category" element={<ServiceDetail />} />
                <Route path="/service/:category/:service" element={<ProcedureDetail />} />
                <Route path="/terms" element={<TermsOfUseNew />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyNew />} />
                <Route path="/data-deletion" element={<DataDeletionNew />} />
                <Route path="/unsubscribe" element={<Unsubscribe />} />
                <Route
                  path="/account/*"
                  element={currentUser ? <AccountPage /> : <Navigate to="/login" replace />}
                />
                <Route path="/new-booking" element={<UserBookingWizard />} />
              </Route>

              {/* 404 Page - Returns 404 status for SEO */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </React.Suspense>
          <Toaster />
        </div>
      </Router>
    </ThemeProvider>
  );
}
