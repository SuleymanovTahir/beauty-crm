import { useTranslation } from "react-i18next";
import { useSalonInfo } from "../hooks/useSalonInfo";
import { getApiUrl } from "../utils/apiUtils";
import { safeFetch } from "../utils/errorHandler";

interface FooterProps {
  salonInfo?: any;
}

export function Footer({ salonInfo }: FooterProps) {
  const { t } = useTranslation(['public_landing', 'common']);
  const { salonName } = useSalonInfo(salonInfo);
  const currentYear = new Date().getFullYear();


  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (e.target as HTMLFormElement).email.value;

    try {
      const API_URL = getApiUrl();
      const res = await safeFetch(`${API_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        alert(t('subscribeSuccess'));
        (e.target as HTMLFormElement).reset();
      } else {
        alert(data.error || 'Ошибка подписки');
      }
    } catch (error) {
      console.error('Newsletter error:', error);
      alert('Ошибка соединения с сервером');
    }
  };

  return (
    <>
      <div className="bg-muted/30 py-8 sm:py-12 overflow-x-hidden">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h3 className="text-2xl font-bold mb-4 text-foreground">{t('subscribeTitle')}</h3>
          <p className="text-foreground/80 mb-6">{t('subscribeDesc')}</p>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto w-full">
            <input
              type="email"
              name="email"
              required
              placeholder={t('emailPlaceholder')}
              className="w-full sm:flex-1 h-11 px-4 rounded-lg form-input-custom text-sm outline-none"
            />
            <button type="submit" className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 w-full sm:w-auto flex-shrink-0 text-sm transition-all">
              {t('subscribe')}
            </button>
          </form>
        </div>
      </div>
      <footer className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <p className="text-xs sm:text-sm text-primary-foreground/70">
              © {currentYear} {salonName}. {t('allRightsReserved')}
            </p>
            <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-10 text-xs sm:text-sm text-primary-foreground/70 justify-center">
              <a href="/privacy-policy" className="hover:text-primary-foreground transition-colors">
                {t('privacyPolicy')}
              </a>
              <a href="/terms" className="hover:text-primary-foreground transition-colors">
                {t('termsOfUse')}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
