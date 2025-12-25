import { Toaster } from 'sonner';
import AccountPage from './AccountPage';

export default function App() {
  return (
    <div className="size-full">
      <AccountPage />
      <Toaster position="top-center" richColors />
    </div>
  );
}