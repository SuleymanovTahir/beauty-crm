import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@crm/components/ui/sonner';
import './i18n';
import { useAuth } from '@crm/contexts/AuthContext';
import { ThemeProvider } from '@crm/contexts/ThemeContext';
import { normalizeRole } from '@crm/utils/platformRouting';

const UniversalLayout = React.lazy(() => import('@crm/components/layouts/UniversalLayout'));
const Dashboard = React.lazy(() => import('@crm/pages/shared/Dashboard'));
const Bookings = React.lazy(() => import('@crm/pages/shared/Bookings'));
const Services = React.lazy(() => import('@crm/pages/shared/Services'));
const Team = React.lazy(() => import('@crm/pages/shared/Team'));
const Settings = React.lazy(() => import('@crm/pages/shared/Settings'));
const Funnel = React.lazy(() => import('@crm/pages/shared/Funnel'));
const UniversalTasks = React.lazy(() => import('@crm/pages/shared/Tasks'));
const Chat = React.lazy(() => import('@crm/pages/shared/Chat'));
const UniversalProfile = React.lazy(() => import('@crm/pages/shared/Profile'));
const Telephony = React.lazy(() => import('@crm/pages/shared/Telephony'));
const PlatformAdmin = React.lazy(() => import('@crm/pages/shared/PlatformAdmin'));
const ReferralLinks = React.lazy(() => import('@crm/pages/shared/ReferralLinks'));
const Waitlist = React.lazy(() => import('@crm/pages/shared/Waitlist'));
const Inventory = React.lazy(() => import('@crm/pages/shared/Inventory'));
const Cashbox = React.lazy(() => import('@crm/pages/shared/Cashbox'));
const KPI = React.lazy(() => import('@crm/pages/shared/KPI'));
const GiftCards = React.lazy(() => import('@crm/pages/shared/GiftCards'));
const ServiceBundles = React.lazy(() => import('@crm/pages/shared/ServiceBundles'));
const MenuCustomization = React.lazy(() => import('@crm/pages/shared/MenuCustomization'));

const InternalChat = React.lazy(() => import('@crm/components/shared/InternalChat'));
const NotificationsPage = React.lazy(() => import('@crm/pages/common/Notifications'));

const AdminLogin = React.lazy(() => import('@crm/pages/auth/Login'));
const AdminRegister = React.lazy(() => import('@crm/pages/auth/Register'));
const VerifyEmail = React.lazy(() => import('@crm/pages/auth/VerifyEmail'));
const ForgotPassword = React.lazy(() => import('@crm/pages/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('@crm/pages/auth/ResetPassword'));
const NotFound = React.lazy(() => import('@crm/pages/common/NotFound'));

interface ProtectedRouteProps {
  element: React.ReactNode;
  isAuthenticated: boolean;
  requiredRole?: string;
  currentRole?: string;
  currentUsername?: string;
  secondaryRole?: string;
  unauthenticatedPath?: string;
}

const CRM_LOGIN_PATH = '/crm/login';

const getCrmHomePath = (role?: string): string => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'director') {
    return '/crm/dashboard';
  }
  if (normalizedRole === 'super_admin') {
    return '/crm/platform';
  }
  if (normalizedRole === 'admin') {
    return '/crm/dashboard';
  }
  if (normalizedRole === 'accountant') {
    return '/crm/dashboard';
  }
  if (normalizedRole === 'manager') {
    return '/manager/dashboard';
  }
  if (normalizedRole === 'sales') {
    return '/sales/dashboard';
  }
  if (normalizedRole === 'marketer') {
    return '/marketer/dashboard';
  }
  if (normalizedRole === 'employee') {
    return '/employee/dashboard';
  }

  return '/crm/dashboard';
};

const hasRequiredRole = (
  requiredRole: string | undefined,
  currentRole: string | undefined,
  secondaryRole: string | undefined,
): boolean => {
  if (!requiredRole) {
    return true;
  }

  const normalizedRequiredRole = normalizeRole(requiredRole);
  const normalizedCurrentRole = normalizeRole(currentRole);
  const normalizedSecondaryRole = normalizeRole(secondaryRole);

  if (normalizedCurrentRole === 'super_admin' || normalizedSecondaryRole === 'super_admin') {
    return true;
  }

  if (normalizedRequiredRole === 'admin') {
    return ['admin', 'director', 'accountant'].includes(normalizedCurrentRole)
      ? true
      : ['admin', 'director', 'accountant'].includes(normalizedSecondaryRole);
  }

  return normalizedCurrentRole === normalizedRequiredRole
    ? true
    : normalizedSecondaryRole === normalizedRequiredRole;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  element,
  isAuthenticated,
  requiredRole,
  currentRole,
  currentUsername,
  secondaryRole,
  unauthenticatedPath = CRM_LOGIN_PATH,
}) => {
  if (!isAuthenticated) {
    return <Navigate to={unauthenticatedPath} replace />;
  }

  const isTahir = currentUsername?.toLowerCase() === 'tahir';
  if (currentRole === 'client' && !isTahir) {
    return <Navigate to={CRM_LOGIN_PATH} replace />;
  }

  if (!hasRequiredRole(requiredRole, currentRole, secondaryRole)) {
    return <Navigate to={getCrmHomePath(currentRole)} replace />;
  }

  return <>{element}</>;
};

export default function App() {
  const { t } = useTranslation('common');
  const { user: currentUser, isLoading, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const authenticatedHomePath = getCrmHomePath(currentUser?.role);

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
          <React.Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="inline-block animate-spin">
                    <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full"></div>
                  </div>
                  <p className="mt-4 text-gray-600">{t('loading')}</p>
                </div>
              </div>
            }
          >
            <Routes>
              <Route
                path="/"
                element={
                  currentUser ? <Navigate to={authenticatedHomePath} replace /> : <Navigate to={CRM_LOGIN_PATH} replace />
                }
              />

              <Route
                path="/login"
                element={
                  currentUser ? <Navigate to={authenticatedHomePath} replace /> : <Navigate to={CRM_LOGIN_PATH} replace />
                }
              />

              <Route
                path="/register"
                element={
                  currentUser ? <Navigate to={authenticatedHomePath} replace /> : <Navigate to="/crm/register" replace />
                }
              />

              <Route
                path="/crm/login"
                element={currentUser ? <Navigate to={authenticatedHomePath} replace /> : <AdminLogin />}
              />

              <Route
                path="/crm/register"
                element={currentUser ? <Navigate to={authenticatedHomePath} replace /> : <AdminRegister />}
              />

              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route
                path="/crm/*"
                element={
                  <ProtectedRoute
                    isAuthenticated={!!currentUser}
                    requiredRole="admin"
                    currentRole={currentUser?.role}
                    currentUsername={currentUser?.username}
                    secondaryRole={currentUser?.secondary_role}
                    unauthenticatedPath={CRM_LOGIN_PATH}
                    element={<UniversalLayout user={currentUser} onLogout={handleLogout} />}
                  />
                }
              >
                <Route path="dashboard" element={currentUser?.role === 'super_admin' ? <Navigate to="../platform" replace /> : <Dashboard />} />
                <Route path="platform" element={<PlatformAdmin />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="chat" element={<Chat />} />
                <Route path="team" element={<Team />} />
                <Route path="profile" element={<UniversalProfile />} />
                <Route path="services" element={<Services />} />
                <Route path="settings/:tab?" element={<Settings />} />
                <Route path="funnel" element={<Funnel />} />
                <Route path="tasks" element={<UniversalTasks />} />
                <Route path="telephony" element={<Telephony />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="internal-chat" element={<InternalChat />} />

                <Route path="clients" element={<Navigate to="../bookings" replace />} />
                <Route path="calendar" element={<Navigate to="../bookings" replace />} />
                <Route path="analytics" element={<Navigate to="../dashboard" replace />} />
                <Route path="bot-settings" element={<Navigate to="../settings" replace />} />
                <Route path="menu-customization" element={<MenuCustomization />} />
                <Route path="broadcasts" element={<Navigate to="../dashboard" replace />} />
                <Route path="promo-codes" element={<Navigate to="../dashboard" replace />} />
                <Route path="loyalty" element={<Navigate to="../dashboard" replace />} />
                <Route path="challenges" element={<Navigate to="../dashboard" replace />} />
                <Route path="contracts" element={<Navigate to="../dashboard" replace />} />
                <Route path="products" element={<Navigate to="../dashboard" replace />} />
                <Route path="invoices" element={<Navigate to="../dashboard" replace />} />
                <Route path="messengers" element={<Navigate to="../chat" replace />} />
                <Route path="payment-integrations" element={<Navigate to="../settings" replace />} />
                <Route path="marketplace-integrations" element={<Navigate to="../settings" replace />} />
                <Route path="referral-links" element={<ReferralLinks />} />
                <Route path="referrals" element={<Navigate to="../referral-links" replace />} />
                <Route path="waitlist" element={<Waitlist />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="cashbox" element={<Cashbox />} />
                <Route path="kpi" element={<KPI />} />
                <Route path="gift-cards" element={<GiftCards />} />
                <Route path="service-bundles" element={<ServiceBundles />} />
                <Route path="service-change-requests" element={<Navigate to="../services" replace />} />
                <Route path="plans" element={<Navigate to="../dashboard" replace />} />
                <Route path="trash" element={<Navigate to="../dashboard" replace />} />
                <Route path="audit-log" element={<Navigate to="../dashboard" replace />} />
                                                                <Route path="team/:id/:tab?" element={<Team />} />
                <Route path="bookings/:id" element={<Navigate to="../bookings" replace />} />
                <Route path="" element={<Navigate to={currentUser?.role === 'super_admin' ? 'platform' : 'dashboard'} replace />} />
              </Route>

              <Route
                path="/manager/*"
                element={
                  <ProtectedRoute
                    isAuthenticated={!!currentUser}
                    requiredRole="manager"
                    currentRole={currentUser?.role}
                    currentUsername={currentUser?.username}
                    secondaryRole={currentUser?.secondary_role}
                    unauthenticatedPath={CRM_LOGIN_PATH}
                    element={<UniversalLayout user={currentUser} onLogout={handleLogout} />}
                  />
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="chat" element={<Chat />} />
                <Route path="team" element={<Team />} />
                <Route path="services" element={<Services />} />
                <Route path="settings/:tab?" element={<Settings />} />
                <Route path="funnel" element={<Funnel />} />
                <Route path="tasks" element={<UniversalTasks />} />
                <Route path="telephony" element={<Telephony />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="internal-chat" element={<InternalChat />} />

                <Route path="clients" element={<Navigate to="../bookings" replace />} />
                <Route path="analytics" element={<Navigate to="../dashboard" replace />} />
                <Route path="messengers" element={<Navigate to="../chat" replace />} />
                <Route path="bot-settings" element={<Navigate to="../settings" replace />} />
                <Route path="promo-codes" element={<Navigate to="../dashboard" replace />} />
                <Route path="referral-links" element={<ReferralLinks />} />
                <Route path="waitlist" element={<Waitlist />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="cashbox" element={<Cashbox />} />
                <Route path="kpi" element={<KPI />} />
                <Route path="gift-cards" element={<GiftCards />} />
                <Route path="service-bundles" element={<ServiceBundles />} />
                <Route path="team/:id/:tab?" element={<Team />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
              </Route>

              <Route
                path="/sales/*"
                element={
                  <ProtectedRoute
                    isAuthenticated={!!currentUser}
                    requiredRole="sales"
                    currentRole={currentUser?.role}
                    currentUsername={currentUser?.username}
                    secondaryRole={currentUser?.secondary_role}
                    unauthenticatedPath={CRM_LOGIN_PATH}
                    element={<UniversalLayout user={currentUser} onLogout={handleLogout} />}
                  />
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="chat" element={<Chat />} />
                <Route path="services" element={<Services />} />
                <Route path="tasks" element={<UniversalTasks />} />
                <Route path="telephony" element={<Telephony />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="internal-chat" element={<InternalChat />} />

                <Route path="clients" element={<Navigate to="../dashboard" replace />} />
                <Route path="calendar" element={<Navigate to="../bookings" replace />} />
                <Route path="analytics" element={<Navigate to="../dashboard" replace />} />
                <Route path="funnel" element={<Navigate to="../dashboard" replace />} />
                <Route path="messengers" element={<Navigate to="../chat" replace />} />
                <Route path="bot-settings" element={<Navigate to="../dashboard" replace />} />
                <Route path="settings" element={<Navigate to="../dashboard" replace />} />
                <Route path="promo-codes" element={<Navigate to="../dashboard" replace />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
              </Route>

              <Route path="/saler/*" element={<Navigate to="/sales/dashboard" replace />} />

              <Route
                path="/marketer/*"
                element={
                  <ProtectedRoute
                    isAuthenticated={!!currentUser}
                    requiredRole="marketer"
                    currentRole={currentUser?.role}
                    currentUsername={currentUser?.username}
                    secondaryRole={currentUser?.secondary_role}
                    unauthenticatedPath={CRM_LOGIN_PATH}
                    element={<UniversalLayout user={currentUser} onLogout={handleLogout} />}
                  />
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="funnel" element={<Funnel />} />
                <Route path="tasks" element={<UniversalTasks />} />
                <Route path="services" element={<Services />} />
                <Route path="chat" element={<Chat />} />
                <Route path="telephony" element={<Telephony />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings/:tab?" element={<Settings />} />
                <Route path="internal-chat" element={<InternalChat />} />

                <Route path="analytics" element={<Navigate to="../dashboard" replace />} />
                <Route path="clients" element={<Navigate to="../dashboard" replace />} />
                <Route path="promo-codes" element={<Navigate to="../dashboard" replace />} />
                <Route path="referral-links" element={<ReferralLinks />} />
                <Route path="waitlist" element={<Waitlist />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="cashbox" element={<Cashbox />} />
                <Route path="kpi" element={<KPI />} />
                <Route path="gift-cards" element={<GiftCards />} />
                <Route path="service-bundles" element={<ServiceBundles />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
              </Route>

              <Route
                path="/employee/*"
                element={
                  <ProtectedRoute
                    isAuthenticated={!!currentUser}
                    requiredRole="employee"
                    currentRole={currentUser?.role}
                    currentUsername={currentUser?.username}
                    secondaryRole={currentUser?.secondary_role}
                    unauthenticatedPath={CRM_LOGIN_PATH}
                    element={<UniversalLayout user={currentUser} onLogout={handleLogout} />}
                  />
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<UniversalProfile />} />
                <Route path="settings" element={<Settings />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="tasks" element={<UniversalTasks />} />
                <Route path="services" element={<Services />} />
                <Route path="telephony" element={<Telephony />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="internal-chat" element={<InternalChat />} />

                <Route path="calendar" element={<Navigate to="../bookings" replace />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </React.Suspense>
          <Toaster />
        </div>
      </Router>
    </ThemeProvider>
  );
}
