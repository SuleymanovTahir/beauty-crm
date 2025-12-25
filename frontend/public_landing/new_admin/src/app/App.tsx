import { useEffect, useState } from 'react';
import { UserBookingWizard } from './UserBookingWizard';
import { AccountPage } from './AccountPage';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [showBooking, setShowBooking] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('booking') === 'true') {
      setShowBooking(true);
    }
    if (params.get('account') === 'true') {
      setShowAccount(true);
    }
  }, []);

  if (showBooking) {
    return (
      <>
        <UserBookingWizard 
          onClose={() => {
            setShowBooking(false);
            window.history.pushState({}, '', window.location.pathname);
          }}
          onSuccess={() => {
            setShowBooking(false);
            window.history.pushState({}, '', window.location.pathname);
          }}
        />
        <Toaster />
      </>
    );
  }

  if (showAccount) {
    return (
      <>
        <AccountPage 
          onClose={() => {
            setShowAccount(false);
            window.history.pushState({}, '', window.location.pathname);
          }}
        />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 flex items-center justify-center p-8">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            M Le Diamant
          </h1>
          <p className="text-xl text-muted-foreground mb-8">Beauty Salon & Spa</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setShowBooking(true)}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
          >
            Book Appointment
          </button>
          
          <button
            onClick={() => setShowAccount(true)}
            className="px-8 py-4 border-2 border-purple-600 text-purple-600 hover:bg-purple-50 font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
          >
            My Account
          </button>
        </div>

        <div className="mt-12 text-sm text-muted-foreground space-y-2">
          <p>Try the URL parameters:</p>
          <div className="flex gap-4 justify-center">
            <code className="px-3 py-1 bg-white rounded-lg border">?booking=true</code>
            <code className="px-3 py-1 bg-white rounded-lg border">?account=true</code>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
