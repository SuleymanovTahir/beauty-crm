import React from 'react';
import { Shield } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicy() {
  const { t } = useTranslation(['privacypolicy', 'common']);
  const [salonInfo, setSalonInfo] = React.useState<any>({});
  
  React.useEffect(() => {
    apiClient.getSalonInfo()
      .then(setSalonInfo)
      .catch(err => console.error('Error loading salon info:', err));
  }, []);

  const currentDate = new Date().toLocaleDateString(t('privacypolicy:locale'), { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-4xl text-gray-900">{t('privacypolicy:title')}</h1>
          </div>

          <div className="prose prose-purple max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('privacypolicy:sections.introduction.title')}</h2>
              <p>
                {t('privacypolicy:sections.introduction.content', { salonName: salonInfo.name || 'Наш салон' })}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('privacypolicy:sections.collectedInfo.title')}</h2>
              <p>{t('privacypolicy:sections.collectedInfo.description')}</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>{t('privacypolicy:sections.collectedInfo.items.0')}</li>
                <li>{t('privacypolicy:sections.collectedInfo.items.1')}</li>
                <li>{t('privacypolicy:sections.collectedInfo.items.2')}</li>
                <li>{t('privacypolicy:sections.collectedInfo.items.3')}</li>
                <li>{t('privacypolicy:sections.collectedInfo.items.4')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('privacypolicy:sections.dataUsage.title')}</h2>
              <p>{t('privacypolicy:sections.dataUsage.description')}</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>{t('privacypolicy:sections.dataUsage.items.0')}</li>
                <li>{t('privacypolicy:sections.dataUsage.items.1')}</li>
                <li>{t('privacypolicy:sections.dataUsage.items.2')}</li>
                <li>{t('privacypolicy:sections.dataUsage.items.3')}</li>
                <li>{t('privacypolicy:sections.dataUsage.items.4')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('privacypolicy:sections.dataProtection.title')}</h2>
              <p>{t('privacypolicy:sections.dataProtection.paragraph1')}</p>
              <p className="mt-3">{t('privacypolicy:sections.dataProtection.paragraph2')}</p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('privacypolicy:sections.thirdParty.title')}</h2>
              <p>{t('privacypolicy:sections.thirdParty.paragraph1')}</p>
              <p className="mt-3">{t('privacypolicy:sections.thirdParty.paragraph2')}</p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('privacypolicy:sections.cookies.title')}</h2>
              <p>{t('privacypolicy:sections.cookies.content')}</p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('privacypolicy:sections.rights.title')}</h2>
              <p>{t('privacypolicy:sections.rights.description')}</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>{t('privacypolicy:sections.rights.items.0')}</li>
                <li>{t('privacypolicy:sections.rights.items.1')}</li>
                <li>{t('privacypolicy:sections.rights.items.2')}</li>
                <li>{t('privacypolicy:sections.rights.items.3')}</li>
                <li>{t('privacypolicy:sections.rights.items.4')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('privacypolicy:sections.dataStorage.title')}</h2>
              <p>{t('privacypolicy:sections.dataStorage.content')}</p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('privacypolicy:sections.policyChanges.title')}</h2>
              <p>{t('privacypolicy:sections.policyChanges.content')}</p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">{t('privacypolicy:sections.contact.title')}</h2>
              <p>{t('privacypolicy:sections.contact.description')}</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>{t('privacypolicy:sections.contact.phone')}: {salonInfo.phone}</li>
                <li>{t('privacypolicy:sections.contact.email')}: {salonInfo.email}</li>
                <li>{t('privacypolicy:sections.contact.address')}: {salonInfo.address}</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
            <p>{t('privacypolicy:lastUpdated', { date: currentDate })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}