import { useState, useEffect } from "react";
import { getApiUrl } from "../utils/apiUtils";
import { safeFetch } from "../utils/errorHandler";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

export function CookieConsent() {
  const { t } = useTranslation(['public_landing', 'common']);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const checkConsent = async () => {
      const consent = localStorage.getItem('cookieConsent');
      if (consent) {
        // Already decided locally
        return;
      }

      // Not decided locally, check server (IP based)
      try {
        const API_URL = getApiUrl();
        const res = await safeFetch(`${API_URL}/api/cookies/check`);
        const data = await res.json();

        if (data.status === 'accept') {
          localStorage.setItem('cookieConsent', 'true');
          return; // Respect server choice, don't show
        } else if (data.status === 'decline') {
          localStorage.setItem('cookieConsent', 'false');
          return; // Respect server choice
        }

        // Unknown status, show banner
        // Small delay to ensure smooth loading
        setTimeout(() => setShowBanner(true), 1000);

      } catch (e) {
        console.error("Cookie check error", e);
        // Fallback: show banner if error
        setShowBanner(true);
      }
    };

    checkConsent();
  }, []);

  const logConsent = async (action: 'accept' | 'decline') => {
    try {
      const API_URL = getApiUrl();
      await safeFetch(`${API_URL}/api/cookies/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
    } catch (e) {
      console.error("Cookie log error", e);
    }
  };

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setShowBanner(false);
    logConsent('accept');
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'false');
    setShowBanner(false);
    logConsent('decline');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-background/95 backdrop-blur-md border-t border-border shadow-lg animate-slide-up">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 pr-8 sm:pr-0">
            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
              {t('cookieConsentText')}{' '}
              <a href="/privacy-policy" className="text-primary hover:underline font-medium">
                {t('privacyPolicy')}
              </a>.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              onClick={handleDecline}
              variant="default" // Using default (outline-like) or secondary
              className="flex-1 sm:flex-none text-xs h-8 border border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground"
            >
              {t('decline')}
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 sm:flex-none hero-button-primary text-xs h-8 text-primary-foreground"
            >
              {t('accept')}
            </Button>
          </div>
          <button
            onClick={handleDecline}
            className="absolute top-2 right-2 sm:relative sm:top-0 sm:right-0 p-1 hover:bg-muted rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
