import { useSalonInfo } from "../hooks/useSalonInfo";
import { useTranslation } from "react-i18next";

export function IntroSection() {
  const { salonName } = useSalonInfo();
  const { t } = useTranslation(['public_landing']);

  return (
    <section className="sr-only" aria-hidden="false">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="prose max-w-none text-center">
          <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
            <strong>{salonName}</strong> — {t('introDescription')}
          </p>
        </div>
      </div>
    </section>
  );
}
