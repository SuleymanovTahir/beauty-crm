import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const [salonName, setSalonName] = useState("M Le Diamant");
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchSalonInfo = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
        const res = await fetch(`${API_URL}/api/public/salon-info?language=${i18n.language}`);
        const data = await res.json();
        if (data.name) {
          setSalonName(data.name);
        }
      } catch (error) {
        console.error('Error loading salon info:', error);
      }
    };
    fetchSalonInfo();
  }, [i18n.language]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (e.target as HTMLFormElement).email.value;

    try {
      const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
      const res = await fetch(`${API_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        alert(t('subscribeSuccess', { defaultValue: 'Спасибо за подписку!' }));
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
      <div className="bg-muted/30 py-12">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold mb-4 text-foreground">{t('subscribeTitle', { defaultValue: 'Подпишитесь на новости' })}</h3>
          <p className="text-foreground/80 mb-6">{t('subscribeDesc', { defaultValue: 'Получайте информацию о специальных предложениях первыми' })}</p>
          <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              name="email"
              required
              placeholder={t('emailPlaceholder', { defaultValue: 'Ваш Email' })}
              className="flex-1 h-10 px-3 rounded-md border border-primary/20 bg-muted/20"
            />
            <button type="submit" className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90">
              {t('subscribe', { defaultValue: 'Подписаться' })}
            </button>
          </form>
        </div>
      </div>
      <footer className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <p className="text-xs sm:text-sm text-primary-foreground/70">
              © {currentYear} {salonName}. {t('allRightsReserved', { defaultValue: 'Все права защищены.' })}
            </p>
            <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-10 text-xs sm:text-sm text-primary-foreground/70 justify-center">
              <a href="/privacy-policy" className="hover:text-primary-foreground transition-colors">
                {t('privacyPolicy', { defaultValue: 'Политика конфиденциальности' })}
              </a>
              <a href="/terms" className="hover:text-primary-foreground transition-colors">
                {t('termsOfUse', { defaultValue: 'Условия использования' })}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
