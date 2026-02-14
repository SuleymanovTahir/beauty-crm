// /frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@crm/components/ui/sonner';
import './i18n';
import { useAuth } from '@crm/contexts/AuthContext';
import { ThemeProvider } from '@crm/contexts/ThemeContext';
import { api } from '@crm/services/api';
import {
  type PlatformGates,
  DEFAULT_PLATFORM_GATES,
  normalizePlatformGates,
  normalizeRole,
  getRoleHomePathByGates,
  getUnauthenticatedSitePathByGates,
  getUnauthenticatedCrmPathByGates,
} from '@crm/utils/platformRouting';
import PromoCodes from '@crm/pages/admin/PromoCodes';
import SpecialPackages from '@crm/pages/admin/SpecialPackages';

// Lazy load pages
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
const PublicContent = React.lazy(() => import('@crm/pages/admin/PublicContent'));
const EmployeeDetail = React.lazy(() => import('@crm/pages/admin/EmployeeDetail'));
const VisitorAnalytics = React.lazy(() => import('@crm/pages/admin/VisitorAnalytics'));
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

// Aliases for shared components across roles
const CRMTasks = UniversalTasks;
const CRMServices = Services;
const CRMBookings = Bookings;
const CRMCalendar = Calendar;
const CRMClients = Clients;


// Admin Panel pages
const AdminPanelDashboard = React.lazy(() => import('@site/pages/adminPanel/Dashboard'));

const PhotoGallery = React.lazy(() => import('@site/pages/adminPanel/PhotoGallery'));
const FeatureManagement = React.lazy(() => import('@site/pages/adminPanel/FeatureManagement'));

const Chat = React.lazy(() => import('@crm/pages/shared/Chat'));
const InternalChat = React.lazy(() => import('@crm/components/shared/InternalChat'));
const NotificationsPage = React.lazy(() => import('@crm/pages/common/Notifications'));

const Broadcasts = React.lazy(() => import('@crm/pages/admin/Broadcasts'));
// Employee routes
const UniversalProfile = React.lazy(() => import('@crm/pages/shared/Profile'));
// Task component is now shared as UniversalTasks

// New Public Landing Pages - Lazy Loaded
const LandingPage = React.lazy(() => import('@site/public_landing/pages/LandingPage').then(module => ({ default: module.LandingPage })));
const PrivacyPolicyNew = React.lazy(() => import('@site/public_landing/pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const TermsOfUseNew = React.lazy(() => import('@site/public_landing/pages/TermsOfUse').then(module => ({ default: module.TermsOfUse })));
const ServiceDetail = React.lazy(() => import('@site/public_landing/pages/ServiceDetail').then(module => ({ default: module.ServiceDetail })));
const ProcedureDetail = React.lazy(() => import('@site/public_landing/pages/ProcedureDetail').then(module => ({ default: module.ProcedureDetail })));
const AccountPage = React.lazy(() => import('@site/public_landing/pages/account/AccountPage').then(module => ({ default: module.AccountPage })));
const UserBookingWizard = React.lazy(() => import('@site/public_landing/pages/account/UserBookingWizard').then(module => ({ default: module.UserBookingWizard })));
const DataDeletionNew = React.lazy(() => import('@site/public_landing/pages/DataDeletion'));
const Unsubscribe = React.lazy(() => import('@site/pages/public/Unsubscribe'));
const NotFound = React.lazy(() => import('@site/public_landing/pages/NotFound').then(module => ({ default: module.NotFound })));

const Login = React.lazy(() => import('@site/public_landing/pages/LoginPage').then(module => ({ default: module.LoginPage })));
const AdminLogin = React.lazy(() => import('@site/pages/auth/Login'));
const AdminRegister = React.lazy(() => import('@site/pages/auth/Register'));
const VerifyEmail = React.lazy(() => import('@site/pages/auth/VerifyEmail'));
const ForgotPassword = React.lazy(() => import('@site/pages/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('@site/pages/auth/ResetPassword'));

interface ProtectedRouteProps {
  element: React.ReactNode;
  isAuthenticated: boolean;
  requiredRole?: string;
  currentRole?: string;
  currentUsername?: string;
  secondaryRole?: string;
  siteSuiteEnabled?: boolean;
  crmSuiteEnabled?: boolean;
  unauthenticatedPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  element,
  isAuthenticated,
  requiredRole,
  currentRole,
  currentUsername,
  secondaryRole,
  siteSuiteEnabled = true,
  crmSuiteEnabled = true,
  unauthenticatedPath = '/login',
}) => {
  if (!isAuthenticated) {
    return <Navigate to={unauthenticatedPath} replace />;
  }

  // ИСКЛЮЧЕНИЕ: Пользователь Tahir имеет доступ ко всему
  const isTahir = currentUsername?.toLowerCase() === 'tahir';

  // CRITICAL: Блокировать клиентов от доступа к CRM/админке
  // Клиенты имеют доступ только к личному кабинету /account
  // ИСКЛЮЧЕНИЕ: Tahir имеет полный доступ даже с ролью client
  if (currentRole === 'client' && !isTahir) {
    return <Navigate to={getRoleHomePathByGates(currentRole, siteSuiteEnabled, crmSuiteEnabled)} replace />;
  }

  const hasRequiredRole = (role?: string, secondaryRole?: string) => {
    if (!requiredRole) return true;
    const normalizedRequiredRole = normalizeRole(requiredRole);
    const allowed = normalizedRequiredRole === 'admin' ? ['admin', 'director', 'accountant'] : [normalizedRequiredRole];
    const normalizedRole = normalizeRole(role);
    const normalizedSecondaryRole = normalizeRole(secondaryRole);

    return [normalizedRole, normalizedSecondaryRole].some((roleKey) => allowed.includes(roleKey));
  };

  if (requiredRole && !hasRequiredRole(currentRole, secondaryRole)) {
    return <Navigate to={getRoleHomePathByGates(currentRole, siteSuiteEnabled, crmSuiteEnabled)} replace />;
  }

  return <>{element}</>;
};

const RedirectCrmPublicContentToAdmin: React.FC = () => {
  const { tab } = useParams<{ tab?: string }>();
  const targetPath = tab ? `/admin/public-content/${tab}` : '/admin/public-content';
  return <Navigate to={targetPath} replace />;
};

export default function App() {
  const { t } = useTranslation('common');
  const { user: currentUser, isLoading, logout } = useAuth();
  const [platformGates, setPlatformGates] = React.useState<PlatformGates>(DEFAULT_PLATFORM_GATES);
  const [platformGatesLoading, setPlatformGatesLoading] = React.useState(true);

  const handleLogout = () => {
    logout();
  };

  React.useEffect(() => {
    let isMounted = true;

    const loadPlatformGates = async () => {
      try {
        const response = await api.getPlatformGates();
        if (!isMounted) {
          return;
        }

        setPlatformGates(normalizePlatformGates(response));
      } catch (error) {
        if (isMounted) {
          console.error('Platform gate loading error:', error);
          setPlatformGates(DEFAULT_PLATFORM_GATES);
        }
      } finally {
        if (isMounted) {
          setPlatformGatesLoading(false);
        }
      }
    };

    loadPlatformGates();

    return () => {
      isMounted = false;
    };
  }, []);

  const siteSuiteEnabled = platformGates.site_enabled;
  const crmSuiteEnabled = platformGates.crm_enabled;

  const unauthenticatedSitePath = getUnauthenticatedSitePathByGates(siteSuiteEnabled, crmSuiteEnabled);
  const unauthenticatedCrmPath = getUnauthenticatedCrmPathByGates(siteSuiteEnabled, crmSuiteEnabled);
  const authenticatedHomePath = getRoleHomePathByGates(currentUser?.role, siteSuiteEnabled, crmSuiteEnabled);
  const siteDisabledRedirectPath = currentUser ? authenticatedHomePath : unauthenticatedCrmPath;
  const crmDisabledRedirectPath = currentUser ? authenticatedHomePath : unauthenticatedSitePath;

  React.useEffect(() => {
    if (!siteSuiteEnabled && currentUser?.role === 'client') {
      logout();
    }
  }, [siteSuiteEnabled, currentUser?.role, logout]);

  const isPlatformLoading = isLoading ? true : platformGatesLoading;

  if (isPlatformLoading) {
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
                    <Navigate to={authenticatedHomePath} replace />
                  ) : (
                    siteSuiteEnabled ? (
                      <Login />
                    ) : (
                      crmSuiteEnabled ? (
                        <Navigate to="/crm/login" replace />
                      ) : (
                        <NotFound />
                      )
                    )
                  )
                }
              />

              <Route
                path="/register"
                element={
                  currentUser ? (
                    <Navigate to={authenticatedHomePath} replace />
                  ) : (
                    siteSuiteEnabled ? (
                      <Login initialView="register" />
                    ) : (
                      crmSuiteEnabled ? (
                        <Navigate to="/crm/register" replace />
                      ) : (
                        <NotFound />
                      )
                    )
                  )
                }
              />

              <Route
                path="/crm/login"
                element={
                  currentUser ? (
                    <Navigate to={authenticatedHomePath} replace />
                  ) : (
                    crmSuiteEnabled ? (
                      <AdminLogin />
                    ) : (
                      siteSuiteEnabled ? (
                        <Navigate to="/login" replace />
                      ) : (
                        <NotFound />
                      )
                    )
                  )
                }
              />

              <Route
                path="/crm/register"
                element={
                  currentUser ? (
                    <Navigate to={authenticatedHomePath} replace />
                  ) : (
                    crmSuiteEnabled ? (
                      <AdminRegister />
                    ) : (
                      siteSuiteEnabled ? (
                        <Navigate to="/register" replace />
                      ) : (
                        <NotFound />
                      )
                    )
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
              {siteSuiteEnabled ? (
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute
                      isAuthenticated={!!currentUser}
                      requiredRole="admin"
                      currentRole={currentUser?.role}
                      currentUsername={currentUser?.username}
                      secondaryRole={currentUser?.secondary_role}
                      siteSuiteEnabled={siteSuiteEnabled}
                      crmSuiteEnabled={crmSuiteEnabled}
                      unauthenticatedPath={unauthenticatedSitePath}
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
                  <Route path="loyalty" element={<SpecialPackages entryMode="loyalty-only" />} />
                  <Route path="referrals" element={<SpecialPackages entryMode="referrals-only" />} />
                  <Route path="challenges" element={<SpecialPackages entryMode="challenges-only" />} />
                  <Route path="promo-codes" element={<SpecialPackages entryMode="promo-codes-only" />} />
                  <Route path="special-packages" element={<SpecialPackages />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="broadcasts" element={<Broadcasts />} />
                  <Route path="features" element={<FeatureManagement />} />
                  <Route path="gallery" element={<PhotoGallery />} />
                  <Route path="bookings" element={<Bookings />} />
                  <Route path="bookings/:id" element={<BookingDetail />} />
                  <Route path="services" element={<Services />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="clients/:id" element={<ClientDetail />} />
                  <Route path="public-content/:tab?" element={<PublicContent />} />
                  <Route path="visitor-analytics" element={<VisitorAnalytics />} />
                  <Route path="team" element={<Team />} />
                  <Route path="team/create" element={<CreateUser />} />
                  <Route path="team/pending" element={<PendingRegistrations />} />
                  <Route path="team/permissions" element={<PermissionManagement />} />
                  <Route path="team/:id/:tab?" element={<EmployeeDetail />} />
                  <Route path="settings/:tab?" element={<Settings />} />
                  <Route path="menu-customization" element={<MenuCustomization />} />
                  <Route path="" element={<Navigate to="dashboard" replace />} />
                </Route>
              ) : (
                <Route path="/admin/*" element={<Navigate to={siteDisabledRedirectPath} replace />} />
              )}

              {/* CRM Routes - Protected */}
              {crmSuiteEnabled ? (
                <Route
                  path="/crm/*"
                  element={
                    <ProtectedRoute
                      isAuthenticated={!!currentUser}
                      requiredRole="admin"
                      currentRole={currentUser?.role}
                      currentUsername={currentUser?.username}
                      secondaryRole={currentUser?.secondary_role}
                      siteSuiteEnabled={siteSuiteEnabled}
                      crmSuiteEnabled={crmSuiteEnabled}
                      unauthenticatedPath={unauthenticatedCrmPath}
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
                  <Route path="team/:id/:tab?" element={<EmployeeDetail />} />
                  <Route path="profile" element={<UniversalProfile />} />

                  <Route path="plans" element={<PlansManagement />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="settings/:tab?" element={<Settings />} />
                  <Route path="bot-settings/:tab?" element={<BotSettings />} />
                  <Route path="public-content/:tab?" element={<RedirectCrmPublicContentToAdmin />} />
                  <Route path="visitor-analytics" element={<Navigate to="/admin/visitor-analytics" replace />} />
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
                        siteSuiteEnabled={siteSuiteEnabled}
                        crmSuiteEnabled={crmSuiteEnabled}
                        unauthenticatedPath={unauthenticatedCrmPath}
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
              ) : (
                <Route path="/crm/*" element={<Navigate to={crmDisabledRedirectPath} replace />} />
              )}

              {/* Manager Routes - Protected */}
              {crmSuiteEnabled ? (
                <Route
                  path="/manager/*"
                  element={
                    <ProtectedRoute
                      isAuthenticated={!!currentUser}
                      requiredRole="manager"
                      currentRole={currentUser?.role}
                      currentUsername={currentUser?.username}
                      secondaryRole={currentUser?.secondary_role}
                      siteSuiteEnabled={siteSuiteEnabled}
                      crmSuiteEnabled={crmSuiteEnabled}
                      unauthenticatedPath={unauthenticatedCrmPath}
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
              ) : (
                <Route path="/manager/*" element={<Navigate to={crmDisabledRedirectPath} replace />} />
              )}

              {/* Sales Routes - Protected */}
              {crmSuiteEnabled ? (
                <Route
                  path="/sales/*"
                  element={
                    <ProtectedRoute
                      isAuthenticated={!!currentUser}
                      requiredRole="sales"
                      currentRole={currentUser?.role}
                      currentUsername={currentUser?.username}
                      secondaryRole={currentUser?.secondary_role}
                      siteSuiteEnabled={siteSuiteEnabled}
                      crmSuiteEnabled={crmSuiteEnabled}
                      unauthenticatedPath={unauthenticatedCrmPath}
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
              ) : (
                <Route path="/sales/*" element={<Navigate to={crmDisabledRedirectPath} replace />} />
              )}

              {/* Legacy saler path redirect */}
              <Route
                path="/saler/*"
                element={
                  crmSuiteEnabled ? (
                    <Navigate to="/sales/clients" replace />
                  ) : (
                    <Navigate to={crmDisabledRedirectPath} replace />
                  )
                }
              />

              {/* Marketer Routes - Protected */}
              {crmSuiteEnabled ? (
                <Route
                  path="/marketer/*"
                  element={
                    <ProtectedRoute
                      isAuthenticated={!!currentUser}
                      requiredRole="marketer"
                      currentRole={currentUser?.role}
                      currentUsername={currentUser?.username}
                      secondaryRole={currentUser?.secondary_role}
                      siteSuiteEnabled={siteSuiteEnabled}
                      crmSuiteEnabled={crmSuiteEnabled}
                      unauthenticatedPath={unauthenticatedCrmPath}
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
              ) : (
                <Route path="/marketer/*" element={<Navigate to={crmDisabledRedirectPath} replace />} />
              )}

              {/* Employee Routes - Protected */}
              {crmSuiteEnabled ? (
                <Route
                  path="/employee/*"
                  element={
                    <ProtectedRoute
                      isAuthenticated={!!currentUser}
                      requiredRole="employee"
                      currentRole={currentUser?.role}
                      currentUsername={currentUser?.username}
                      secondaryRole={currentUser?.secondary_role}
                      siteSuiteEnabled={siteSuiteEnabled}
                      crmSuiteEnabled={crmSuiteEnabled}
                      unauthenticatedPath={unauthenticatedCrmPath}
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
              ) : (
                <Route path="/employee/*" element={<Navigate to={crmDisabledRedirectPath} replace />} />
              )}

              {/* New Public Routes (Standalone) */}
              {siteSuiteEnabled ? (
                <Route element={<Outlet />}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/ref/:shareToken" element={<LandingPage />} />
                  <Route path="/service/:category" element={<ServiceDetail />} />
                  <Route path="/service/:category/:service" element={<ProcedureDetail />} />
                  <Route path="/terms" element={<TermsOfUseNew />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyNew />} />
                  <Route path="/data-deletion" element={<DataDeletionNew />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route
                    path="/account/*"
                    element={currentUser ? <AccountPage /> : <Navigate to={unauthenticatedSitePath} replace />}
                  />
                  <Route path="/new-booking" element={<UserBookingWizard />} />
                </Route>
              ) : (
                <>
                  <Route path="/" element={<Navigate to={siteDisabledRedirectPath} replace />} />
                  <Route path="/ref/:shareToken" element={<Navigate to={siteDisabledRedirectPath} replace />} />
                  <Route path="/service/:category" element={<Navigate to={siteDisabledRedirectPath} replace />} />
                  <Route path="/service/:category/:service" element={<Navigate to={siteDisabledRedirectPath} replace />} />
                  <Route path="/terms" element={<Navigate to={siteDisabledRedirectPath} replace />} />
                  <Route path="/privacy-policy" element={<Navigate to={siteDisabledRedirectPath} replace />} />
                  <Route path="/data-deletion" element={<Navigate to={siteDisabledRedirectPath} replace />} />
                  <Route path="/unsubscribe" element={<Navigate to={siteDisabledRedirectPath} replace />} />
                  <Route path="/account/*" element={<Navigate to={siteDisabledRedirectPath} replace />} />
                  <Route path="/new-booking" element={<Navigate to={siteDisabledRedirectPath} replace />} />
                </>
              )}

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
