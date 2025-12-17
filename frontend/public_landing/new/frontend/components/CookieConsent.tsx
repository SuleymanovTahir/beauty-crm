import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

export function CookieConsent() {
  const { t } = useTranslation(['public_landing', 'common']);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-border shadow-lg animate-slide-up">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 pr-8 sm:pr-0">
            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
              {t('cookieMessage', { defaultValue: 'Мы используем файлы cookie для улучшения работы сайта и персонализации вашего опыта. Продолжая использовать сайт, вы соглашаетесь с нашей' })}{' '}
              <a href="/privacy-policy" className="text-primary hover:underline font-medium">
                {t('privacyPolicy', { defaultValue: 'политикой конфиденциальности' })}
              </a>
              .
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              onClick={handleDecline}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none text-xs h-8 border-border hover:bg-muted"
            >
              {t('decline', { defaultValue: 'Отклонить' })}
            </Button>
            <Button
              onClick={handleAccept}
              size="sm"
              className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8"
            >
              {t('acceptCookies', { defaultValue: 'Принять' })}
            </Button>
          </div>
          <button
            onClick={handleDecline}
            className="absolute top-2 right-2 sm:relative sm:top-0 sm:right-0 p-1 hover:bg-muted rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
