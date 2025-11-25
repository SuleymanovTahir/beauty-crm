import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { t } = useTranslation('public/PrivacyPolicy');
  const [salonSettings, setSalonSettings] = useState({ email: '', phone: '' });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await apiClient.getSalonInfo();
        setSalonSettings({
          email: settings.email || 'info@beauty.com',
          phone: settings.phone || '+971 50 123 4567'
        });
      } catch (err) {
        console.error('Error loading salon settings:', err);
      }
    };
    loadSettings();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>

        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <ShieldCheck className="w-10 h-10 text-pink-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {t('title')}
            </h1>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('section_1_title')}</h2>
              <p className="text-gray-700 leading-relaxed">{t('section_1_content')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('section_2_title')}</h2>
              <p className="text-gray-700 leading-relaxed mb-4">{t('section_2_content')}</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>{t('data_name')}</li>
                <li>{t('data_email')}</li>
                <li>{t('data_phone')}</li>
                <li>{t('data_booking_info')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('section_3_title')}</h2>
              <p className="text-gray-700 leading-relaxed mb-4">{t('section_3_content')}</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>{t('purpose_booking')}</li>
                <li>{t('purpose_communication')}</li>
                <li>{t('purpose_marketing')}</li>
                <li>{t('purpose_improvement')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('section_4_title')}</h2>
              <p className="text-gray-700 leading-relaxed">{t('section_4_content')}</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('section_5_title')}</h2>
              <p className="text-gray-700 leading-relaxed mb-4">{t('section_5_content')}</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>{t('right_access')}</li>
                <li>{t('right_correction')}</li>
                <li>{t('right_deletion')}</li>
                <li>{t('right_unsubscribe')}</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('section_6_title')}</h2>
              <p className="text-gray-700 leading-relaxed">{t('section_6_content')}</p>
            </section>

            <section className="bg-pink-50 border-l-4 border-pink-600 p-6 rounded-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('contact_title')}</h2>
              <p className="text-gray-700 whitespace-pre-line">{t('contact_content', { phone: salonSettings.phone, email: salonSettings.email })}</p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
            {t('last_updated')}
          </div>
        </div>
      </div>
    </div>
  );
}
