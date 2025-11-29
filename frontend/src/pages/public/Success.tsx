// /frontend/src/pages/public/Success.tsx
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['public/Success', 'common']);
  const bookingData = location.state || {};


  return (
    <div className="py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-4xl text-gray-900 mb-4">
            {t('success:title')}
          </h1>

          {bookingData.name && (
            <p className="text-xl text-gray-600 mb-6">
              {t('success:thankYou', { name: bookingData.name })}
            </p>
          )}

          {bookingData.service && (
            <div className="mb-8 p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl">
              <p className="text-lg text-gray-700 mb-2">
                {t('success:serviceBooked', { service: bookingData.service }).split('<highlight>').map((part, i) => {
                  if (i === 0) return part;
                  const [highlighted, ...rest] = part.split('</highlight>');
                  return (
                    <React.Fragment key={i}>
                      <span className="text-pink-600">{highlighted}</span>
                      {rest.join('</highlight>')}
                    </React.Fragment>
                  );
                })}
              </p>
              {bookingData.date && bookingData.time && (
                <p className="text-gray-600">
                  {t('success:dateTime', {
                    date: new Date(bookingData.date).toLocaleDateString('ru-RU'),
                    time: bookingData.time
                  })}
                </p>
              )}
            </div>
          )}

          <p className="text-gray-600 mb-8">
            {t('success:contactMessage')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-pink-500 to-purple-600"
            >
              {t('success:backToHome')}
            </Button>
            <Button
              onClick={() => navigate('/price-list')}
              variant="outline"
            >
              {t('success:viewServices')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}