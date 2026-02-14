import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@crm/components/ui/sonner';
import './i18n';
import { useAuth } from '@crm/contexts/AuthContext';
import { ThemeProvider } from '@crm/contexts/ThemeContext';
import { normalizeRole } from '@crm/utils/platformRouting';

const UniversalLayout = React.lazy(() => import('@crm/components/layouts/UniversalLayout'));

const AdminPanelDashboard = React.lazy(() => import('@site/pages/adminPanel/Dashboard'));
const LoyaltyManagement = React.lazy(() => import('@site/pages/adminPanel/LoyaltyManagement'));
const NotificationsDashboard = React.lazy(() => import('@site/pages/adminPanel/NotificationsDashboard'));
const PhotoGallery = React.lazy(() => import('@site/pages/adminPanel/PhotoGallery'));
const FeatureManagement = React.lazy(() => import('@site/pages/adminPanel/FeatureManagement'));

const LandingPage = React.lazy(() => import('@site/public_landing/pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const PrivacyPolicy = React.lazy(() => import('@site/public_landing/pages/PrivacyPolicy').then((module) => ({ default: module.PrivacyPolicy })));
const TermsOfUse = React.lazy(() => import('@site/public_landing/pages/TermsOfUse').then((module) => ({ default: module.TermsOfUse })));
const ServiceDetail = React.lazy(() => import('@site/public_landing/pages/ServiceDetail').then((module) => ({ default: module.ServiceDetail })));
const ProcedureDetail = React.lazy(() => import('@site/public_landing/pages/ProcedureDetail').then((module) => ({ default: module.ProcedureDetail })));
const AccountPage = React.lazy(() => import('@site/public_landing/pages/account/AccountPage').then((module) => ({ default: module.AccountPage })));
const UserBookingWizard = React.lazy(() => import('@site/public_landing/pages/account/UserBookingWizard').then((module) => ({ default: module.UserBookingWizard })));
const DataDeletion = React.lazy(() => import('@site/public_landing/pages/DataDeletion'));
const Unsubscribe = React.lazy(() => import('@site/pages/public/Unsubscribe'));
const NotFound = React.lazy(() => import('@site/public_landing/pages/NotFound').then((module) => ({ default: module.NotFound })));

const LoginPage = React.lazy(() => import('@site/public_landing/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
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
  unauthenticatedPath?: string;
}

const SITE_LOGIN_PATH = '/login';

const isAdminRole = (role: string | undefined): boolean => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'admin') {
    return true;
  }
  if (normalizedRole === 'director') {
    return true;
  }
  if (normalizedRole === 'accountant') {
    return true;
  }
  return false;
};

const getSiteHomePath = (role: string | undefined): string => {
  if (isAdminRole(role)) {
    return '/admin/dashboard';
  }
  return '/account/dashboard';
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
    if (isAdminRole(normalizedCurrentRole)) {
      return true;
    }
    return isAdminRole(normalizedSecondaryRole);
  }

  if (normalizedCurrentRole === normalizedRequiredRole) {
    return true;
  }
  return normalizedSecondaryRole === normalizedRequiredRole;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  element,
  isAuthenticated,
  requiredRole,
  currentRole,
  currentUsername,
  secondaryRole,
  unauthenticatedPath = SITE_LOGIN_PATH,
}) => {
  if (!isAuthenticated) {
    return <Navigate to={unauthenticatedPath} replace />;
  }

  const isTahir = currentUsername?.toLowerCase() === 'tahir';
  if (currentRole === 'client' && !isTahir && requiredRole === 'admin') {
    return <Navigate to="/account/dashboard" replace />;
  }

  if (!hasRequiredRole(requiredRole, currentRole, secondaryRole)) {
    return <Navigate to={getSiteHomePath(currentRole)} replace />;
  }

  return <>{element}</>;
};

export default function App() {
  const { t } = useTranslation('common');
  const { user: currentUser, isLoading, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const authenticatedHomePath = getSiteHomePath(currentUser?.role);

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
              <Route path="/" element={<LandingPage />} />
              <Route path="/ref/:shareToken" element={<LandingPage />} />
              <Route path="/service/:category" element={<ServiceDetail />} />
              <Route path="/service/:category/:service" element={<ProcedureDetail />} />
              <Route path="/terms" element={<TermsOfUse />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/data-deletion" element={<DataDeletion />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/new-booking" element={<UserBookingWizard />} />

              <Route
                path="/login"
                element={currentUser ? <Navigate to={authenticatedHomePath} replace /> : <LoginPage />}
              />

              <Route
                path="/register"
                element={currentUser ? <Navigate to={authenticatedHomePath} replace /> : <LoginPage initialView="register" />}
              />

              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route
                path="/account/*"
                element={currentUser ? <AccountPage /> : <Navigate to={SITE_LOGIN_PATH} replace />}
              />

              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute
                    isAuthenticated={!!currentUser}
                    requiredRole="admin"
                    currentRole={currentUser?.role}
                    currentUsername={currentUser?.username}
                    secondaryRole={currentUser?.secondary_role}
                    unauthenticatedPath={SITE_LOGIN_PATH}
                    element={<UniversalLayout user={currentUser} onLogout={handleLogout} />}
                  />
                }
              >
                <Route path="dashboard" element={<AdminPanelDashboard />} />
                <Route path="loyalty" element={<LoyaltyManagement />} />
                <Route path="notifications" element={<NotificationsDashboard />} />
                <Route path="features" element={<FeatureManagement />} />
                <Route path="gallery" element={<PhotoGallery />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
              </Route>

              <Route
                path="/crm/*"
                element={
                  currentUser
                    ? (isAdminRole(currentUser.role) ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/account/dashboard" replace />)
                    : <Navigate to={SITE_LOGIN_PATH} replace />
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </React.Suspense>
          <Toaster />
        </div>
      </Router>
    </ThemeProvider>
  );
}
