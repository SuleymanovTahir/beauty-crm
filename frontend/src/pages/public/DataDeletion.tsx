// /frontend/src/pages/public/DataDeletion.tsx
import React from 'react';
import { apiClient } from '../../api/client';
import { useTranslation } from 'react-i18next';

export default function DataDeletion() {
  const { t } = useTranslation(['public/DataDeletion', 'common']);
  const [salonInfo, setSalonInfo] = React.useState<any>({});

  React.useEffect(() => {
    apiClient.getSalonInfo()
      .then(setSalonInfo)
      .catch(err => console.error('Error loading salon info:', err));
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">{t('datadeletion:title')}</h1>
      
      <div className="prose prose-pink max-w-none">
        <p className="text-lg mb-4">
          {t('datadeletion:intro')}
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">{t('datadeletion:what_data_title')}</h2>
        <ul className="list-disc pl-6 mb-6">
          <li>{t('datadeletion:data_item1')}</li>
          <li>{t('datadeletion:data_item2')}</li>
          <li>{t('datadeletion:data_item3')}</li>
          <li>{t('datadeletion:data_item4')}</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">{t('datadeletion:how_to_title')}</h2>
        <p className="mb-4">
          {t('datadeletion:how_to_desc')}{' '}
          <a href={salonInfo.instagram || '#'} className="text-pink-600 hover:underline">
            {salonInfo.instagram ? `${salonInfo.instagram.split('/').pop()}` : 'salon'}
          </a>
          {' '}{t('datadeletion:how_to_text')}: <strong>"{t('datadeletion:delete_text')}"</strong>
        </p>

        <p className="mb-4">
          {t('datadeletion:email_option')}{' '}
          <a href={`mailto:${salonInfo.privacy_contact_email || salonInfo.email}`} className="text-pink-600 hover:underline">
            {salonInfo.privacy_contact_email || salonInfo.email}
          </a>
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">{t('datadeletion:processing_title')}</h2>
        <p className="mb-4">
          {t('datadeletion:processing_desc')}
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">{t('datadeletion:after_title')}</h2>
        <ul className="list-disc pl-6 mb-6">
          <li>{t('datadeletion:after_item1')}</li>
          <li>{t('datadeletion:after_item2')}</li>
          <li>{t('datadeletion:after_item3')}</li>
        </ul>

        <div className="bg-pink-50 border border-pink-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold mb-2">{t('datadeletion:help_title')}</h3>
          <p>
            {t('datadeletion:help_desc')}{' '}
            <a href={salonInfo.instagram || '#'} className="text-pink-600 hover:underline">
              {salonInfo.instagram ? `${salonInfo.instagram.split('/').pop()}` : 'salon'}
            </a>
            {' '}{t('datadeletion:or_email')}{' '}
            <a href={`mailto:${salonInfo.support_email || salonInfo.email}`} className="text-pink-600 hover:underline">
              {salonInfo.support_email || salonInfo.email}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}