import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingData = location.state || {};

  return (
    <div className="py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-4xl text-gray-900 mb-4">
            Запись подтверждена!
          </h1>

          {bookingData.name && (
            <p className="text-xl text-gray-600 mb-6">
              Спасибо, {bookingData.name}!
            </p>
          )}

          {bookingData.service && (
            <div className="mb-8 p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl">
              <p className="text-lg text-gray-700 mb-2">
                Ваша запись на <span className="text-pink-600">{bookingData.service}</span> успешно создана.
              </p>
              {bookingData.date && bookingData.time && (
                <p className="text-gray-600">
                  {new Date(bookingData.date).toLocaleDateString('ru-RU')} в {bookingData.time}
                </p>
              )}
            </div>
          )}

          <p className="text-gray-600 mb-8">
            Мы свяжемся с вами в ближайшее время для подтверждения деталей записи.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-pink-500 to-purple-600"
            >
              Вернуться на главную
            </Button>
            <Button
              onClick={() => navigate('/price-list')}
              variant="outline"
            >
              Посмотреть услуги
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
