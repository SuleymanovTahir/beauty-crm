import React from 'react';
import { FileText } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useTranslation } from 'react-i18next';

export default function Terms() {
  const [salonInfo, setSalonInfo] = React.useState<any>({});
  const { t, i18n } = useTranslation(['public/Terms', 'common']);

  React.useEffect(() => {
    apiClient.getSalonInfo()
      .then(setSalonInfo)
      .catch(err => console.error('Error loading salon info:', err));
  }, []);

  const currentDate = new Date().toLocaleDateString(i18n.language, { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-pink-100 rounded-xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-pink-600" />
            </div>
            <h1 className="text-4xl text-gray-900">{t('terms:title')}</h1>
          </div>

          <div className="prose prose-pink max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('terms:sections.general.title')}</h2>
              <p>
                {t('terms:sections.general.content', { salonName: salonInfo.name || 'Наш салон' })}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('terms:sections.booking.title')}</h2>
              <p>
                {t('terms:sections.booking.paragraph1')}
              </p>
              <p className="mt-3">
                <strong>{t('terms:sections.booking.cancellationTitle')}</strong> {t('terms:sections.booking.cancellationText')}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('terms:sections.payment.title')}</h2>
              <p>
                {t('terms:sections.payment.paragraph1')}
              </p>
              <p className="mt-3">
                {t('terms:sections.payment.paragraph2')}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('terms:sections.medical.title')}</h2>
              <p>
                {t('terms:sections.medical.paragraph1')}
              </p>
              <p className="mt-3">
                {t('terms:sections.medical.paragraph2')}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('terms:sections.warranty.title')}</h2>
              <p>
                {t('terms:sections.warranty.paragraph1')}
              </p>
              <p className="mt-3">
                {t('terms:sections.warranty.paragraph2')}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('terms:sections.privacy.title')}</h2>
              <p>
                {t('terms:sections.privacy.content').split('<link>').map((part, i) => {
                  if (i === 0) return part;
                  const [linkText, ...rest] = part.split('</link>');
                  return (
                    <React.Fragment key={i}>
                      <a href="/privacy-policy" className="text-pink-600 hover:underline">{linkText}</a>
                      {rest.join('</link>')}
                    </React.Fragment>
                  );
                })}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('terms:sections.changes.title')}</h2>
              <p>
                {t('terms:sections.changes.content')}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('terms:sections.contact.title')}</h2>
              <p>{t('terms:sections.contact.description')}</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>{t('terms:sections.contact.phone')}: {salonInfo.phone}</li>
                <li>{t('terms:sections.contact.email')}: {salonInfo.email}</li>
                <li>{t('terms:sections.contact.address')}: {salonInfo.address}</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
            <p>{t('terms:lastUpdated', { date: currentDate })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}