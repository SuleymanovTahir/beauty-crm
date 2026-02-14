import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@crm/components/ui/sonner';
import './i18n';
import { useAuth } from '@crm/contexts/AuthContext';
import { ThemeProvider } from '@crm/contexts/ThemeContext';
import { normalizeRole } from '@crm/utils/platformRouting';
import PromoCodes from '@crm/pages/admin/PromoCodes';
import SpecialPackages from '@crm/pages/admin/SpecialPackages';

const UniversalLayout = React.lazy(() => import('@crm/components/layouts/UniversalLayout'));
const Dashboard = React.lazy(() => import('@crm/pages/shared/Dashboard'));
const Bookings = React.lazy(() => import('@crm/pages/shared/Bookings'));
const BookingDetail = React.lazy(() => import('@crm/pages/admin/BookingDetail'));
const Analytics = React.lazy(() => import('@crm/pages/admin/Analytics'));
const Services = React.lazy(() => import('@crm/pages/shared/Services'));
const Clients = React.lazy(() => import('@crm/pages/admin/Clients'));
const ClientDetail = React.lazy(() => import('@crm/pages/admin/ClientDetail'));
const CreateUser = React.lazy(() => import('@crm/pages/admin/CreateUser'));
const Team = React.lazy(() => import('@crm/pages/shared/Team'));
const Calendar = React.lazy(() => import('@crm/pages/admin/Calendar'));
const Settings = React.lazy(() => import('@crm/pages/shared/Settings'));
const BotSettings = React.lazy(() => import('@crm/pages/admin/BotSettings'));
const PendingRegistrations = React.lazy(() => import('@crm/pages/admin/PendingRegistrations'));
const PermissionManagement = React.lazy(() => import('@crm/pages/admin/PermissionManagement'));
const PlansManagement = React.lazy(() => import('@crm/pages/admin/PlansManagement'));
const EmployeeDetail = React.lazy(() => import('@crm/pages/admin/EmployeeDetail'));
const Funnel = React.lazy(() => import('@crm/pages/shared/Funnel'));
const UniversalTasks = React.lazy(() => import('@crm/pages/shared/Tasks'));
const Telephony = React.lazy(() => import('@crm/pages/admin/Telephony'));
const MenuCustomization = React.lazy(() => import('@crm/pages/admin/MenuCustomization'));
const TrashBin = React.lazy(() => import('@crm/pages/admin/TrashBin'));
const AuditLog = React.lazy(() => import('@crm/pages/admin/AuditLog'));
const Contracts = React.lazy(() => import('@crm/pages/admin/Contracts'));
const Products = React.lazy(() => import('@crm/pages/admin/Products'));
const Invoices = React.lazy(() => import('@crm/pages/admin/Invoices'));
const PaymentIntegrations = React.lazy(() => import('@crm/pages/admin/PaymentIntegrations'));
const MarketplaceIntegrations = React.lazy(() => import('@crm/pages/admin/MarketplaceIntegrations'));
const Messengers = React.lazy(() => import('@crm/pages/admin/Messengers'));
const ServiceChangeRequests = React.lazy(() => import('@crm/pages/admin/ServiceChangeRequests'));
const Chat = React.lazy(() => import('@crm/pages/shared/Chat'));
const InternalChat = React.lazy(() => import('@crm/components/shared/InternalChat'));
const NotificationsPage = React.lazy(() => import('@crm/pages/common/Notifications'));
const Broadcasts = React.lazy(() => import('@crm/pages/admin/Broadcasts'));
const UniversalProfile = React.lazy(() => import('@crm/pages/shared/Profile'));

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
    return '/sales/clients';
  }
  if (normalizedRole === 'marketer') {
    return '/marketer/analytics';
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
                path="/admin/*"
                element={
                  currentUser ? <Navigate to="/crm/dashboard" replace /> : <Navigate to={CRM_LOGIN_PATH} replace />
                }
              />

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
                <Route path="team/:id/:tab?" element={<EmployeeDetail />} />
                <Route path="profile" element={<UniversalProfile />} />
                <Route path="plans" element={<PlansManagement />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="settings/:tab?" element={<Settings />} />
                <Route path="bot-settings/:tab?" element={<BotSettings />} />
                <Route path="funnel" element={<Funnel />} />
                <Route path="tasks" element={<UniversalTasks />} />
                <Route path="telephony" element={<Telephony />} />
                <Route path="menu-customization" element={<MenuCustomization />} />
                <Route path="trash" element={<TrashBin />} />
                <Route
                  path="audit-log"
                  element={
                    <ProtectedRoute
                      element={<AuditLog />}
                      isAuthenticated={!!currentUser}
                      requiredRole="director"
                      currentRole={currentUser?.role}
                      currentUsername={currentUser?.username}
                      secondaryRole={currentUser?.secondary_role}
                      unauthenticatedPath={CRM_LOGIN_PATH}
                    />
                  }
                />
                <Route path="internal-chat" element={<InternalChat />} />
                <Route path="broadcasts" element={<Broadcasts />} />
                <Route path="promo-codes" element={<SpecialPackages entryMode="promo-codes-only" />} />
                <Route path="loyalty" element={<SpecialPackages entryMode="loyalty-only" />} />
                <Route path="special-packages" element={<SpecialPackages />} />
                <Route path="contracts" element={<Contracts />} />
                <Route path="products" element={<Products />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="messengers" element={<Messengers />} />
                <Route path="payment-integrations" element={<PaymentIntegrations />} />
                <Route path="marketplace-integrations" element={<MarketplaceIntegrations />} />
                <Route path="referrals" element={<SpecialPackages entryMode="referrals-only" />} />
                <Route path="challenges" element={<SpecialPackages entryMode="challenges-only" />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="service-change-requests" element={<ServiceChangeRequests />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
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
                <Route path="chat" element={<Chat />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="team" element={<Team />} />
                <Route path="team/:id" element={<Team />} />
                <Route path="messengers" element={<Messengers />} />
                <Route path="settings/:tab?" element={<Settings />} />
                <Route path="bot-settings" element={<BotSettings />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="tasks" element={<UniversalTasks />} />
                <Route path="services" element={<Services />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="clients" element={<Clients />} />
                <Route path="internal-chat" element={<InternalChat />} />
                <Route path="promo-codes" element={<PromoCodes />} />
                <Route path="special-packages" element={<SpecialPackages />} />
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
                <Route path="clients" element={<Clients />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="chat" element={<Chat />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="funnel" element={<Funnel />} />
                <Route path="tasks" element={<UniversalTasks />} />
                <Route path="services" element={<Services />} />
                <Route path="internal-chat" element={<InternalChat />} />
                <Route path="promo-codes" element={<PromoCodes />} />
                <Route path="special-packages" element={<SpecialPackages />} />
                <Route path="messengers" element={<Messengers />} />
                <Route path="bot-settings" element={<BotSettings />} />
                <Route path="settings" element={<Settings />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="" element={<Navigate to="clients" replace />} />
              </Route>

              <Route path="/saler/*" element={<Navigate to="/sales/clients" replace />} />

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
                <Route path="analytics" element={<Analytics />} />
                <Route path="funnel" element={<Funnel />} />
                <Route path="clients" element={<Clients />} />
                <Route path="tasks" element={<UniversalTasks />} />
                <Route path="services" element={<Services />} />
                <Route path="internal-chat" element={<InternalChat />} />
                <Route path="promo-codes" element={<PromoCodes />} />
                <Route path="special-packages" element={<SpecialPackages />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings/:tab?" element={<Settings />} />
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
                <Route path="calendar" element={<Calendar employeeFilter={true} />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="tasks" element={<UniversalTasks />} />
                <Route path="services" element={<Services />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="internal-chat" element={<InternalChat />} />
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
