import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { X } from "lucide-react";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
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
              Мы используем файлы cookie для улучшения работы сайта. Продолжая использовать сайт, вы соглашаетесь с нашей{' '}
              <a href="/privacy-policy" className="text-primary hover:underline font-medium">
                политикой конфиденциальности
              </a>.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              onClick={handleDecline}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none text-xs h-8"
            >
              Отклонить
            </Button>
            <Button
              onClick={handleAccept}
              size="sm"
              className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-xs h-8"
            >
              Принять
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
