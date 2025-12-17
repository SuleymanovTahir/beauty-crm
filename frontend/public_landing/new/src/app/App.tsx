import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { AccountPage } from './pages/AccountPage';
import './styles/landing.css';

export default function App() {
  // Simple routing based on hash
  const path = window.location.hash.slice(1) || '/';

  if (path === '/login') {
    return <LoginPage />;
  }

  if (path === '/account') {
    return <AccountPage />;
  }

  return <LandingPage />;
}